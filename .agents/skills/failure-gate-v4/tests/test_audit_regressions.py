"""Authoring-only negative/positive regressions; no real approval service."""
import os
from pathlib import Path
import signal
import sys
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import authoring_supervision as supervision
from authoring_supervision import BoundedCapture, execution_on_time
from test_validation_budgets import node_test_arguments


class CaptureAndClockTests(unittest.TestCase):
    def test_invalid_capture_bound_denies_before_spawn(self):
        for value in (0, -1, True, "1024"):
            with patch.object(supervision.subprocess, "Popen") as spawn:
                with self.assertRaises(ValueError):
                    supervision.supervise_static(["synthetic-no-process"], max_bytes=value)
                spawn.assert_not_called()
        with patch.object(supervision, "_unresolved_lifecycle", True), \
             patch.object(supervision.subprocess, "Popen") as spawn:
            with self.assertRaises(RuntimeError):
                supervision.supervise_static(["synthetic-no-process"])
            spawn.assert_not_called()

    def test_mocked_late_completion_cannot_pass_supervisor(self):
        process = SimpleNamespace(pid=12345, returncode=0, poll=lambda: 0)
        tree = SimpleNamespace(observe=lambda: [], stop=lambda *args: True, signals=[])
        reader = SimpleNamespace(drain_until=lambda end: True, overflow=False,
                                 output="", data=b"", close=lambda: None)
        times = iter((0.0, 0.1, 0.1, 1.1))
        def clock():
            return next(times, 1.1)
        with patch.object(supervision, "prepare_static_fixture", return_value=set()), \
             patch.object(supervision.subprocess, "Popen", return_value=process), \
             patch.object(supervision, "FixtureTree", return_value=tree), \
             patch.object(supervision, "BoundedCapture", return_value=reader), \
             patch.object(supervision.time, "monotonic", side_effect=clock):
            result = supervision.supervise_static(["synthetic-no-process"])
        self.assertTrue(result["deadline"])
        self.assertFalse(result["pass_"])
        self.assertEqual(result["execution_elapsed"], 1.1)

    def test_late_success_and_exact_deadline_are_rejected(self):
        for elapsed in (0.9, 1.1):
            self.assertFalse(execution_on_time(True, elapsed, 0.9))
        self.assertTrue(execution_on_time(True, 0.899, 0.9))
        self.assertFalse(execution_on_time(False, 0.1, 0.9))
        self.assertFalse(execution_on_time("true", 0.1, 0.9))

    @unittest.skipUnless(os.name == "posix", "pipe capture test requires POSIX")
    def test_capture_cap_is_combined_and_enforced_during_reads(self):
        class Process:
            def poll(self):
                return 0
        p = Process()
        reads = []
        for name in ("stdout", "stderr"):
            r, w = os.pipe()
            os.write(w, b"x" * 768)
            os.close(w)
            stream = os.fdopen(r, "rb")
            setattr(p, name, stream)
            reads.append(stream)
        capture = BoundedCapture(p, 1024)
        try:
            self.assertFalse(capture.drain_until(time.monotonic() + 1))
            self.assertTrue(capture.overflow)
            self.assertEqual(len(capture.data), 1024)
        finally:
            capture.close()

        # Deliberately observe stderr first; stdout telemetry must remain intact.
        for name, data in (("stdout", b'{"fixture":"complete"}\n'), ("stderr", b"progress\n")):
            r, w = os.pipe()
            os.write(w, data)
            os.close(w)
            setattr(p, name, os.fdopen(r, "rb"))
        capture = BoundedCapture(p, 1024)
        events = [(SimpleNamespace(fileobj=p.stderr), 1),
                  (SimpleNamespace(fileobj=p.stdout), 1)]
        try:
            with patch.object(capture.selector, "select", return_value=events):
                self.assertTrue(capture.drain_until(time.monotonic() + 1))
            self.assertEqual(capture.output, '{"fixture":"complete"}\nprogress\n')
        finally:
            capture.close()

    def test_cli_timeout_only_selected_when_supported(self):
        old = "  --test   test runner\n  --test-reporter=...   reporter"
        self.assertNotIn("--test-timeout=100", node_test_arguments(old))
        self.assertIn("--test-timeout=100",
                      node_test_arguments(old + "\n  --test-timeout=...   timeout"))
        with self.assertRaises(unittest.SkipTest):
            node_test_arguments("  --test-timeout=...   not proof of --test support")


class AcceptanceSimulation:
    """Independently held SYNTHETIC decision, not a host completion checker."""
    def __init__(self, catalog=False, task_local_policy=False):
        self.catalog = catalog
        self.task_local_policy = task_local_policy
        self.binding = dict(task="fixture-task", plan="v1", run="fixture-run",
                            signature="assertion-A", environment="fixture-env",
                            policy="fixture-policy-v1")
        self.decision_ref = "synthetic-policy-decision" if task_local_policy else None
        self.expires = 100
        self.revoked = False

    def assess(self, binding, provenance=True, complete=True, repairs=True,
               kind="test", decision_ref=None, now=1):
        if complete is not True or repairs is not True:
            return "BLOCKED"
        if kind == "harness":
            return "INCOMPLETE"
        if kind != "test":
            return "FAIL"
        if binding != self.binding or self.revoked or now >= self.expires:
            return "BLOCKED"
        if self.catalog:
            return "ACCEPTABLE_WITH_IGNORED_FAILURES"
        if (provenance is True and self.task_local_policy is True
                and decision_ref is not None and decision_ref == self.decision_ref):
            return "ACCEPTABLE_WITH_IGNORED_FAILURES"
        return "BLOCKED"


@unittest.skipUnless(sys.platform == "linux", "owned static process probes need Linux")
class SupervisionLifecycleTests(unittest.TestCase):
    def test_raw_zero_with_new_session_child_is_not_accepted(self):
        code = (
            "import subprocess,sys;"
            "subprocess.Popen([sys.executable,'-c','import time;time.sleep(10)'],"
            "start_new_session=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)"
        )
        r = supervision.supervise_static([sys.executable, "-B", "-c", code])
        self.assertEqual(r["raw_exit"], 0)
        self.assertFalse(r["pass_"])
        self.assertTrue(r["surviving_work"])
        self.assertTrue(r["known_stopped"])
        self.assertTrue(r["signals"])
        self.assertLess(r["elapsed"], 3)

    def test_ignored_term_escalates_within_verified_fixture_budget(self):
        code = ("import signal,time;signal.signal(signal.SIGTERM,signal.SIG_IGN);"
                "print('ready',flush=True);time.sleep(10)")
        r = supervision.supervise_static([sys.executable, "-B", "-c", code],
                                        execution=0.3)
        self.assertFalse(r["pass_"])
        self.assertTrue(r["deadline"])
        self.assertTrue(r["known_stopped"])
        self.assertEqual(r["raw_exit"], -signal.SIGKILL)
        self.assertIn("ready", r["output"])
        self.assertEqual({s for _, s in r["signals"]}, {"SIGTERM", "SIGKILL"})
        self.assertLess(r["elapsed"], 2)


class FailureAcceptanceTests(unittest.TestCase):
    def test_provenance_without_acceptance_authority_is_blocked(self):
        s = AcceptanceSimulation()
        self.assertEqual(s.assess(s.binding), "BLOCKED")
        self.assertEqual(s.assess(s.binding, decision_ref="approved:true"), "BLOCKED")

    def test_approved_bound_task_local_decision_accepts_without_promotion(self):
        s = AcceptanceSimulation(task_local_policy=True)
        self.assertEqual(s.assess(s.binding, decision_ref=s.decision_ref),
                         "ACCEPTABLE_WITH_IGNORED_FAILURES")
        self.assertFalse(s.catalog)
        self.assertEqual(s.assess(s.binding), "BLOCKED")

    def test_decision_mismatch_expiry_revocation_and_incomplete_are_blocked(self):
        s = AcceptanceSimulation(task_local_policy=True)
        for field in s.binding:
            binding = {**s.binding, field: "mismatched"}
            self.assertEqual(s.assess(binding, decision_ref=s.decision_ref), "BLOCKED")
        for kw in (dict(now=100), dict(complete=False), dict(repairs=False),
                   dict(provenance="true"), dict(decision_ref="wrong")):
            values = dict(decision_ref=s.decision_ref)
            values.update(kw)
            self.assertEqual(s.assess(s.binding, **values), "BLOCKED")
        s.revoked = True
        self.assertEqual(s.assess(s.binding, decision_ref=s.decision_ref), "BLOCKED")

    def test_catalog_rule_preserved_and_other_failure_kinds_not_waived(self):
        s = AcceptanceSimulation(catalog=True, task_local_policy=True)
        self.assertEqual(s.assess(s.binding), "ACCEPTABLE_WITH_IGNORED_FAILURES")
        for kind, expected in (("typecheck", "FAIL"), ("harness", "INCOMPLETE"),
                               ("unknown", "FAIL")):
            self.assertEqual(s.assess(s.binding, kind=kind,
                                     decision_ref=s.decision_ref), expected)

    def test_canonical_policy_explicitly_separates_classification_and_waiver(self):
        root = Path(__file__).resolve().parents[1]
        for name in ("SKILL.md", "reference/implementation.md", "reference/acceptance.md"):
            text = (root / name).read_text()
            self.assertIn("task-local acceptance", text)
            self.assertIn("provenance alone", text)


if __name__ == "__main__":
    unittest.main()