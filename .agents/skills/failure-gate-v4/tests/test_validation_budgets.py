"""AUTHORING ONLY: fake authority/clock plus isolated local watchdog fixtures.

Not an installed runner, registry, protected budget service or host acceptance.
Never import a Port Authority cleanup/lease consumer or signal application work.
Node probes are conditional on Linux + installed Node; every fixture has its own
new session, finite independent Python supervision and exact-incarnation cleanup.
"""
import copy
import json
import math
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from authoring_supervision import supervise_static


MAX_TIMER_MS = 2147483647


def valid_ms(value):
    return type(value) is int and 0 < value <= MAX_TIMER_MS


def fixture_limits():
    # Independently held synthetic record, not real approval or useful defaults.
    return dict(queue=100, step=200, startup=50, teardown=20, cancel=20,
                termination=20, evidence=20, parent=600, attempt=300,
                test=100, hook=100)


class FakeClock:
    def __init__(self):
        self.elapsed = 0
        self.wall = 1000

    def advance(self, elapsed, wall=None):
        self.elapsed += elapsed
        self.wall += elapsed if wall is None else wall


class Denied(Exception):
    pass


class BudgetSimulation:
    """Deliberately test-only model. Mutable memory is NEVER host authority."""
    def __init__(self, clock=None, limits=None):
        self.clock = clock or FakeClock()
        self.approved = copy.deepcopy(fixture_limits() if limits is None else limits)
        self.parent_origin = self.clock.elapsed
        self.parent_deadline = self.clock.elapsed + self.approved.get("parent", 0)
        self.effective_parent_deadline = self.parent_deadline
        self.reserved_attempt_ms = 0
        self.attempts = 0
        self.max_attempts = 3
        self.max_cumulative_attempt_ms = 450
        self.launches = []
        self.excluded = False
        self.unresolved = False
        self.supervision = False
        self.delivered = set()

    def dispatch(self, purpose="diagnostic", route="checked", capability=None,
                 caller=None, supervisor=True, node=False, test_limit=100,
                 hook_limit=100, source=True, mode="finite", remote=False,
                 provider_supervision=False, inputs=True, inherited_deadline=None):
        if self.unresolved:
            raise Denied("unresolved original work/evidence retains exclusion")
        if source is not True or inputs is not True:
            raise Denied("missing authoritative source or bounded inputs")
        if set(self.approved) != set(fixture_limits()) or not all(
                valid_ms(v) for v in self.approved.values()):
            raise Denied("missing/disabled/nonfinite/overflow approved limits")
        values = copy.deepcopy(self.approved)
        for name, value in (caller or {}).items():
            if name not in values or not valid_ms(value) or value > values[name]:
                raise Denied("invalid or enlarged caller budget")
            values[name] = value
        if mode != "finite" or supervisor is not True:
            raise Denied("watch misuse or independent supervision unavailable")
        if type(remote) is not bool or type(node) is not bool:
            raise Denied("malformed execution-mode observation")
        if remote and provider_supervision is not True:
            raise Denied("local abort is not remote supervision")
        if route == "direct" and (purpose == "required_tier" or
                                  capability != "fixture-bounded-diagnostic"):
            raise Denied("direct scripts inherit no registry deadline/evidence")
        if route not in ("checked", "direct"):
            raise Denied("unknown route")
        if node and (not valid_ms(test_limit) or not valid_ms(hook_limit) or
                     test_limit > values["test"] or hook_limit > values["hook"]):
            raise Denied("missing/disabled or unauthorized test/hook inheritance")
        if inherited_deadline is not None and (
                not valid_ms(inherited_deadline) or
                inherited_deadline > self.effective_parent_deadline):
            raise Denied("invalid inherited deadline or nested parent renewal")
        cleanup = sum(values[k] for k in ("teardown", "cancel", "termination", "evidence"))
        if cleanup > MAX_TIMER_MS:
            raise Denied("aggregate overflow")
        parent = min(self.effective_parent_deadline, self.parent_origin + values["parent"],
                     self.effective_parent_deadline
                     if inherited_deadline is None else inherited_deadline)
        remaining = parent - self.clock.elapsed
        if remaining <= cleanup:
            raise Denied("pre-dispatch parent exhausted/cleanup cannot fit")
        allocation = min(values["step"], values["attempt"], remaining - cleanup)
        if (self.attempts >= self.max_attempts or
                self.reserved_attempt_ms + allocation > self.max_cumulative_attempt_ms):
            raise Denied("cumulative authorized attempts exhausted")
        self.attempts += 1
        self.reserved_attempt_ms += allocation
        # This object is one synthetic approved operation, not every future task run.
        # Narrowing persists across its children/reentry; caller records cannot renew it.
        self.effective_parent_deadline = parent
        record = dict(purpose=purpose, route=route, source="synthetic-approved-record",
                      values=values, parent=parent, remaining=remaining,
                      deadline=self.clock.elapsed + allocation,
                      cumulative=self.reserved_attempt_ms)
        self.launches.append(record)
        self.supervision = True
        self.excluded = True
        return record

    def finish(self, raw=0, known_stopped=True, acknowledged=True, reports=True,
               journal=True, cancelled=False, masked_timeout=False, capture_ms=0,
               phase_ms=None):
        run = self.launches[-1]
        deadline = self.clock.elapsed >= run["deadline"]
        valid_capture = type(capture_ms) is int and 0 <= capture_ms <= MAX_TIMER_MS
        evidence_timeout = not valid_capture or capture_ms >= run["values"]["evidence"]
        phase_ms = {} if phase_ms is None else phase_ms
        valid_phases = isinstance(phase_ms, dict) and all(
            key in ("queue", "startup", "teardown", "cancel", "termination", "evidence")
            and type(value) is int and 0 <= value <= MAX_TIMER_MS
            for key, value in phase_ms.items())
        phase_timeout = valid_phases and any(
            value >= run["values"][key] for key, value in phase_ms.items())
        evidence_timeout = evidence_timeout or (
            valid_phases and phase_ms.get("evidence", 0) >= run["values"]["evidence"])
        incomplete = (not all(v is True for v in
                              (known_stopped, acknowledged, reports, journal))
                      or evidence_timeout or not valid_phases
                      or type(raw) is not int
                      or type(cancelled) is not bool or type(masked_timeout) is not bool)
        self.excluded = incomplete
        self.unresolved = incomplete
        if journal is not True:
            self.supervision = True  # cleanup independent of failed writes
        return dict(raw=raw, deadline=deadline,
                    assessment="INCOMPLETE" if incomplete else
                    "FAIL" if raw != 0 or deadline or phase_timeout or cancelled or masked_timeout else "PASS",
                    exclusion=self.excluded, acknowledged=acknowledged)

    def stop_observed(self, identities, signal_name):
        # Only synthetic IDs; no syscall or reclaim approval is performed.
        new = {(signal_name, pid, start) for pid, start in identities} - self.delivered
        self.delivered |= new
        return new


class BudgetPolicyTests(unittest.TestCase):
    def test_narrowed_parent_rejects_larger_child_and_reentry(self):
        for purpose in ("nested", "recovery", "new-wrapper", "new-run"):
            with self.subTest(purpose=purpose):
                p = BudgetSimulation()
                p.dispatch(caller={"parent": 100, "step": 20})
                with self.assertRaises(Denied):
                    p.dispatch(purpose=purpose, inherited_deadline=200)
                p.clock.advance(101)
                with self.assertRaises(Denied):
                    p.dispatch(purpose=purpose)
                self.assertEqual(len(p.launches), 1)

    def test_multilevel_narrowing_is_sticky_and_valid_child_can_pass(self):
        p = BudgetSimulation()
        p.dispatch(caller={"parent": 200, "step": 20})
        p.dispatch(inherited_deadline=160, caller={"step": 20})
        child = p.dispatch(inherited_deadline=120, caller={"step": 20})
        self.assertEqual(child["parent"], 120)
        p.clock.advance(10)
        self.assertEqual(p.finish()["assessment"], "PASS")
        with self.assertRaises(Denied):
            p.dispatch(inherited_deadline=130)

    def test_malformed_evidence_never_passes_or_releases_exclusion(self):
        for name in ("known_stopped", "acknowledged", "reports", "journal"):
            for value in ("false", "unknown", 1, {}, [True], None):
                with self.subTest(name=name, value=value):
                    p = BudgetSimulation()
                    p.dispatch()
                    outcome = p.finish(**{name: value})
                    self.assertEqual(outcome["assessment"], "INCOMPLETE")
                    self.assertTrue(outcome["exclusion"])
                    with self.assertRaises(Denied):
                        p.dispatch()

    def test_malformed_source_or_supervision_denies_dispatch(self):
        for name in ("source", "inputs", "supervisor"):
            for value in ("false", 1, None):
                with self.subTest(name=name, value=value):
                    with self.assertRaises(Denied):
                        BudgetSimulation().dispatch(**{name: value})

    def test_phase_deadlines_and_invalid_observations_are_nonpass(self):
        for phase in ("queue", "startup", "teardown", "cancel", "termination", "evidence"):
            for extra in (0, 1):
                with self.subTest(phase=phase, extra=extra):
                    p = BudgetSimulation()
                    p.dispatch()
                    r = p.finish(phase_ms={phase: fixture_limits()[phase] + extra})
                    self.assertEqual(r["assessment"],
                                     "INCOMPLETE" if phase == "evidence" else "FAIL")
                    if phase == "evidence":
                        self.assertTrue(r["exclusion"])
        for phases in ({"unknown": 1}, {"startup": "false"}, {"queue": -1}, []):
            p = BudgetSimulation()
            p.dispatch()
            self.assertEqual(p.finish(phase_ms=phases)["assessment"], "INCOMPLETE")

    def test_all_finite_entry_point_kinds_need_outer_supervision(self):
        for purpose in ("fast", "static", "package", "alias", "pre-hook", "post-hook",
                        "required_tier", "dry-run", "smoke", "diagnostic", "isolation",
                        "baseline", "nested", "worker", "startup", "teardown", "recovery"):
            with self.subTest(purpose=purpose):
                p = BudgetSimulation()
                with self.assertRaises(Denied):
                    p.dispatch(purpose=purpose, supervisor=False)
                self.assertEqual(p.launches, [])

    def test_missing_nonfinite_disabled_and_overflow_limits(self):
        for key in fixture_limits():
            for value in (None, 0, -1, math.nan, math.inf, -math.inf,
                          MAX_TIMER_MS + 1, 2**53, True, "100", 1.5):
                with self.subTest(key=key, value=value):
                    limits = fixture_limits()
                    limits[key] = value
                    # Parent construction is independent of validation in this model.
                    if key == "parent" and not valid_ms(value):
                        p = BudgetSimulation()
                        p.approved[key] = value
                    else:
                        p = BudgetSimulation(limits=limits)
                    with self.assertRaises(Denied):
                        p.dispatch()
                    self.assertEqual(p.launches, [])

    def test_missing_budget_field(self):
        p = BudgetSimulation()
        del p.approved["hook"]
        with self.assertRaises(Denied):
            p.dispatch()

    def test_changed_caller_environment_cannot_enlarge_or_disable(self):
        for key, approved in fixture_limits().items():
            for value in (approved + 1, 0, math.inf, MAX_TIMER_MS + 1):
                with self.subTest(key=key, value=value):
                    p = BudgetSimulation()
                    with self.assertRaises(Denied):
                        p.dispatch(caller={key: value})

    def test_aggregate_cleanup_overflow(self):
        p = BudgetSimulation()
        for k in ("teardown", "cancel", "termination", "evidence"):
            p.approved[k] = MAX_TIMER_MS
        with self.assertRaises(Denied):
            p.dispatch()

    def test_authority_or_bounded_input_unavailable(self):
        for kw in (dict(source=False), dict(inputs=False)):
            p = BudgetSimulation()
            with self.assertRaises(Denied):
                p.dispatch(**kw)
            self.assertEqual(p.launches, [])

    def test_bypassed_direct_script_requires_capability_and_supervisor(self):
        for kw in ({}, dict(capability="fixture-bounded-diagnostic", supervisor=False),
                   dict(capability="approved: true")):
            p = BudgetSimulation()
            with self.assertRaises(Denied):
                p.dispatch(route="direct", **kw)
            self.assertEqual(p.launches, [])

    def test_valid_direct_diagnostic_is_not_required_tier_evidence(self):
        p = BudgetSimulation()
        result = p.dispatch(route="direct", capability="fixture-bounded-diagnostic")
        self.assertEqual(result["purpose"], "diagnostic")
        with self.assertRaises(Denied):
            BudgetSimulation().dispatch(route="direct", purpose="required_tier",
                                        capability="fixture-bounded-diagnostic")

    def test_fast_without_serialization_still_has_finite_limits(self):
        r = BudgetSimulation().dispatch(purpose="fast")
        self.assertTrue(all(valid_ms(v) for v in r["values"].values()))

    def test_node_missing_infinite_or_enlarged_test_and_hook_limits(self):
        for key in ("test_limit", "hook_limit"):
            for value in (None, 0, math.inf, 101):
                with self.subTest(key=key, value=value):
                    with self.assertRaises(Denied):
                        BudgetSimulation().dispatch(node=True, **{key: value})

    def test_verified_node_limits_are_reported_not_inferred_from_tap(self):
        r = BudgetSimulation().dispatch(node=True)
        self.assertEqual((r["values"]["test"], r["values"]["hook"]), (100, 100))

    def test_expired_pre_dispatch_budget_launches_nothing(self):
        p = BudgetSimulation()
        p.clock.advance(600)
        with self.assertRaises(Denied):
            p.dispatch()
        self.assertEqual(p.launches, [])

    def test_insufficient_cleanup_remainder_blocks_new_work(self):
        p = BudgetSimulation()
        p.clock.advance(521)
        with self.assertRaises(Denied):
            p.dispatch()

    def test_wall_clock_reversal_cannot_extend_elapsed_deadline(self):
        p = BudgetSimulation()
        run = p.dispatch()
        p.clock.advance(200, wall=-100000)
        outcome = p.finish()
        self.assertEqual(run["deadline"], 200)
        self.assertEqual(outcome["assessment"], "FAIL")
        self.assertEqual(outcome["raw"], 0)

    def test_wall_clock_forward_does_not_reset_parent(self):
        p = BudgetSimulation()
        p.clock.advance(100, wall=100000)
        self.assertEqual(p.dispatch()["remaining"], 500)

    def test_nested_resource_cannot_renew_parent(self):
        p = BudgetSimulation()
        with self.assertRaises(Denied):
            p.dispatch(inherited_deadline=601)
        p.clock.advance(100)
        self.assertEqual(p.dispatch(inherited_deadline=500)["parent"], 500)

    def test_invalid_inherited_deadline_cannot_fall_back_to_parent(self):
        for value in (0, -1, math.nan, math.inf, True, "100", MAX_TIMER_MS + 1):
            with self.subTest(value=value):
                p = BudgetSimulation()
                with self.assertRaises(Denied):
                    p.dispatch(inherited_deadline=value)
                self.assertEqual(p.launches, [])

    def test_narrower_parent_limit_is_actually_enforced(self):
        p = BudgetSimulation()
        p.clock.advance(101)
        with self.assertRaises(Denied):
            p.dispatch(caller={"parent": 100})
        self.assertEqual(p.launches, [])

    def test_retry_recovery_reentry_preserve_cumulative_attempts(self):
        p = BudgetSimulation()
        p.dispatch(purpose="isolation")
        p.finish(raw=1)
        p.dispatch(purpose="nested")
        p.finish(raw=1)
        self.assertEqual(p.reserved_attempt_ms, 400)
        for purpose in ("recovery", "isolation", "new-wrapper", "new-run"):
            with self.assertRaises(Denied):
                p.dispatch(purpose=purpose)
        self.assertEqual(len(p.launches), 2)

    def test_exactly_three_when_authorized_budget_fits(self):
        p = BudgetSimulation()
        for _ in range(3):
            p.dispatch(purpose="isolation", caller={"step": 50})
            p.finish(raw=1)
        with self.assertRaises(Denied):
            p.dispatch(purpose="isolation", caller={"step": 50})
        self.assertEqual(p.attempts, 3)

    def test_late_zero_and_exact_deadline_are_not_pass(self):
        for elapsed in (200, 201):
            p = BudgetSimulation()
            p.dispatch()
            p.clock.advance(elapsed)
            self.assertEqual(p.finish(raw=0)["assessment"], "FAIL")

    def test_masked_timeout_and_cancelled_test_do_not_pass(self):
        for kw in (dict(masked_timeout=True), dict(cancelled=True)):
            p = BudgetSimulation()
            p.dispatch()
            self.assertEqual(p.finish(raw=0, **kw)["assessment"], "FAIL")

    def test_missing_reports_storage_or_unknown_descendants_retain_exclusion(self):
        for kw in (dict(reports=False), dict(acknowledged=False), dict(known_stopped=False)):
            p = BudgetSimulation()
            p.dispatch()
            r = p.finish(**kw)
            self.assertEqual(r["assessment"], "INCOMPLETE")
            self.assertTrue(r["exclusion"])
            self.assertEqual(r["raw"], 0)
            with self.assertRaises(Denied):
                p.dispatch(purpose="replacement")

    def test_post_spawn_journal_failure_retains_owned_cleanup(self):
        p = BudgetSimulation()
        p.dispatch()
        r = p.finish(journal=False)
        self.assertTrue(p.supervision)
        self.assertTrue(r["exclusion"])
        self.assertEqual(r["assessment"], "INCOMPLETE")

    def test_new_termination_descendant_receives_signal_once_per_incarnation(self):
        p = BudgetSimulation()
        self.assertEqual(len(p.stop_observed([(11, "100")], "TERM")), 1)
        self.assertEqual(p.stop_observed([(11, "100")], "TERM"), set())
        self.assertEqual(len(p.stop_observed([(11, "100"), (12, "200")], "TERM")), 1)
        self.assertEqual(len(p.stop_observed([(11, "100"), (12, "200")], "KILL")), 2)

    def test_watch_and_remote_job_misuse_block_dispatch(self):
        for kw in (dict(mode="watch"), dict(mode="server"), dict(remote=True)):
            p = BudgetSimulation()
            with self.assertRaises(Denied):
                p.dispatch(**kw)
            self.assertEqual(p.launches, [])

    def test_evidence_capture_deadline_rejects_raw_success(self):
        p = BudgetSimulation()
        p.dispatch()
        r = p.finish(capture_ms=20)
        self.assertEqual(r["assessment"], "INCOMPLETE")
        self.assertTrue(r["exclusion"])

    def test_admission_expiry_never_abandons_started_supervision(self):
        p = BudgetSimulation()
        p.dispatch()
        p.clock.advance(1000)
        self.assertTrue(p.supervision)
        with self.assertRaises(Denied):
            p.dispatch(purpose="recovery")
        self.assertEqual(p.finish()["assessment"], "FAIL")


def node_test_arguments(help_text):
    """Installed support only; explicit fixture test/hook options are the fallback."""
    for flag in ("--test", "--test-reporter"):
        if not re.search(r"(?m)^\s*" + flag + r"(?:[ =]|$)", help_text):
            raise unittest.SkipTest("installed Node lacks required " + flag)
    args = ["--test", "--test-reporter=spec"]
    if re.search(r"(?m)^\s*--test-timeout(?:[ =]|$)", help_text):
        args.append("--test-timeout=100")
    return args


_node_help = None


def installed_node_help():
    global _node_help
    if _node_help is None:
        result = supervise_static([shutil.which("node"), "--help"],
                                  execution=2, max_bytes=131072)
        if not result["pass_"]:
            raise unittest.SkipTest("bounded installed Node support probe failed")
        _node_help = result["output"]
    return _node_help


def supervised_node_fixture(body, as_test=False, hook_ms=None, on_spawn=None):
    """Owned static fixtures only; never a runtime/authority adapter."""
    if not isinstance(body, str) or len(body.encode()) > 16384:
        raise ValueError("bounded code-owned fixture body required")
    argv = [shutil.which("node")]
    if as_test:
        argv += node_test_arguments(installed_node_help())
    directory = Path(tempfile.mkdtemp(prefix="failure-gate-budget-fixture-"))
    path = directory / ("probe.test.mjs" if as_test else "probe.mjs")
    path.write_text(body)
    argv.append(str(path))
    result = supervise_static(argv, on_spawn=on_spawn)
    result.update(node_test_ms=100 if as_test else None, node_hook_ms=hook_ms,
                  fixture_evidence_path=str(directory))
    summary = {**result, "output": result["output"][:8192]}
    print("FG_LOCAL_FIXTURE_RESULT " + json.dumps(summary))
    if result["known_stopped"] and not result["exclusion"]:
        shutil.rmtree(directory)
    # Retain the exact original fixture and evidence on uncertain cleanup/capture.
    return result


@unittest.skipUnless(sys.platform == "linux" and shutil.which("node"),
                     "conditional local watchdog probes require Linux + Node")
class LocalOuterWatchdogTests(unittest.TestCase):
    def test_small_output_overflow_is_bounded_and_nonpass(self):
        r = supervised_node_fixture("process.stdout.write('x'.repeat(70000));setInterval(()=>{},1000);")
        self.assertFalse(r["pass_"])
        self.assertTrue(r["output_overflow"])
        self.assertLessEqual(r["output_bytes_kept"], 65536)
        self.assertTrue(r["known_stopped"])

    def test_post_spawn_journal_error_still_stops_owned_work(self):
        def fail_journal(process):
            raise OSError("synthetic journal unavailable")
        r = supervised_node_fixture("setInterval(()=>{},1000);", on_spawn=fail_journal)
        self.assertFalse(r["pass_"])
        self.assertTrue(r["known_stopped"])
        self.assertTrue(r["exclusion"])
        self.assertIn("synthetic journal unavailable", r["error"])

    def assert_bounded_nonpass(self, result, marker):
        self.assertIn(marker, result["output"])
        self.assertFalse(result["pass_"])
        self.assertTrue(result["known_stopped"])
        self.assertFalse(result["exclusion"])
        self.assertLess(result["elapsed"], 4.0)

    def test_local_finite_fixture_completes(self):
        r = supervised_node_fixture("console.log('finite-fixture');")
        self.assertTrue(r["pass_"])
        self.assertTrue(r["known_stopped"])

    def test_hanging_async_test_is_bounded(self):
        r = supervised_node_fixture("""
import test from 'node:test';
test('async-fixture', {timeout:100}, async () => {
  console.log('async-started'); setInterval(()=>{}, 1000);
  await new Promise(()=>{});
});
""", as_test=True)
        self.assert_bounded_nonpass(r, "async-started")

    def test_sync_block_requires_independent_watchdog(self):
        r = supervised_node_fixture("""
import test from 'node:test';
test('sync-fixture', {timeout:100}, () => {
  console.log('sync-started'); while(true) {}
});
""", as_test=True)
        self.assert_bounded_nonpass(r, "sync-started")
        self.assertTrue(r["deadline"])

    def test_hanging_hook_has_explicit_limit_and_outer_watchdog(self):
        r = supervised_node_fixture("""
import {test, before} from 'node:test';
before(async () => {
  console.log('hook-started'); setInterval(()=>{},1000);
  await new Promise(()=>{});
}, {timeout:100});
test('hook-fixture', {timeout:100}, () => {});
""", as_test=True, hook_ms=100)
        self.assert_bounded_nonpass(r, "hook-started")

    def test_subprocess_tree_is_confirmed_stopped(self):
        r = supervised_node_fixture("""
import {spawn} from 'node:child_process';
console.log('subprocess-started');
spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {stdio:'inherit'});
""")
        self.assert_bounded_nonpass(r, "subprocess-started")
        self.assertGreaterEqual(len({p for p, _ in r["signals"]}), 2)

    def test_late_raw_zero_cannot_override_outer_deadline(self):
        r = supervised_node_fixture("""
console.log('late-zero-started');
process.on('SIGTERM',()=>{console.log('late-zero'); process.exit(0);});
setInterval(()=>{},1000);
""")
        self.assert_bounded_nonpass(r, "late-zero-started")
        self.assertEqual(r["raw_exit"], 0)
        self.assertTrue(r["deadline"])

    def test_new_child_during_termination_is_observed_and_stopped(self):
        r = supervised_node_fixture("""
import {spawn} from 'node:child_process';
console.log('late-child-started');
let spawned=false;
process.on('SIGTERM',()=>{
  if(!spawned) {
    spawned=true;
    spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000)"],
      {stdio:'inherit'});
    console.log('new-child-observed');
  }
});
setInterval(()=>{},1000);
""")
        self.assert_bounded_nonpass(r, "new-child-observed")
        self.assertGreaterEqual(len({p for p, _ in r["signals"]}), 2)

    def test_explicit_test_and_hook_limits_on_installed_node(self):
        r = supervised_node_fixture("""
import {test, before} from 'node:test';
before(()=>console.log('finite-hook'), {timeout:100});
test('finite-test', {timeout:100}, ()=>console.log('finite-test'));
""", as_test=True, hook_ms=100)
        self.assertTrue(r["pass_"])
        self.assertIn("finite-hook", r["output"])
        self.assertIn("finite-test", r["output"])


class BudgetDocumentTests(unittest.TestCase):
    def test_writer_timeout_and_supervised_recipes_are_explicit(self):
        root = Path(__file__).resolve().parents[1]
        for name in ("README.md", "reference/adapters/posix-writer-lock/README.md"):
            text = (root / name).read_text()
            self.assertIn("run-authoring-tests.py", text)
            self.assertNotIn("never opens\napplication ports or signals processes", text)
        adapter = (root / "reference/adapters/posix-writer-lock/README.md").read_text()
        self.assertIn("acquisition-only", adapter)
        self.assertIn("not an execution deadline", adapter)

    def test_core_and_all_required_references_link_budget_contract(self):
        root = Path(__file__).resolve().parents[1]
        for name in ("SKILL.md", "README.md", "reference/implementation.md",
                     "reference/acceptance.md", "reference/runtime-reclaim.md",
                     "reference/execution-monitoring.md", "reference/evidence-and-recovery.md"):
            with self.subTest(file=name):
                self.assertIn("validation-budgets.md", (root / name).read_text())

    def test_normative_boundaries_and_negative_matrix_are_present(self):
        text = (Path(__file__).resolve().parents[1] /
                "reference/validation-budgets.md").read_text()
        for phrase in ("EVERY finite", "independently approved", "outer watchdog",
                       "test/suite-inherited AND hook", "2147483647",
                       "not timeout exemptions", "Direct package commands inherit no",
                       "wall-clock reversal", "Post-spawn journal failure",
                       "Evidence/recovery deadlines", "No wire-format adaptation",
                       "never automatically retries claims, writes or signals",
                       "not a deployable host supervisor", "paired canonical"):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, text)


if __name__ == "__main__":
    unittest.main()