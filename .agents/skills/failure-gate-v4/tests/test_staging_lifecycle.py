"""TEST-ONLY policy simulations; no host adapter, approval service or OS signals.

Synthetic trusted records are independent of request copies only inside this
model. Never install these models as a protected registry or genuine provider.
Actual PA consumer/process coverage is separately bounded and reported.
"""
import copy
import unittest
from pathlib import Path

from test_runtime_reclaim_contract import Denied


def route(status, *, host_verified=False, checked_valid=False, explicit=False,
          purpose="required", diagnostic=False, reclaim=False):
    if purpose not in {"required", "diagnostic", "reclaim"}:
        raise Denied("unknown launch purpose")
    if explicit and checked_valid is not True:
        raise Denied("explicit checked request has no fallback")
    if purpose == "reclaim":
        if reclaim is not True:
            raise Denied("distinct checked reclaim required in every policy state")
        return "checked-reclaim"
    if status == "ACTIVE":
        if checked_valid is not True:
            raise Denied("missing active checked task/plan")
        if purpose == "diagnostic" and diagnostic is not True:
            raise Denied("separate diagnostic capability required")
        return "checked-diagnostic" if purpose == "diagnostic" else "checked-tier"
    if status == "INACTIVE" and host_verified is True:
        return "verified-bounded-host"
    raise Denied("unknown applicability or unverifiable host policy")


class StageSimulation:
    def __init__(self):
        self.state = None
        self.fixture = "NOT_RUN"
        self.host = "NOT_RUN"
        self.live_callers_changed = False
        self.legacy_risk = "unresolved"

    def stage(self, *, approved=True, integrity=True, inert=True,
              task_gate=False, authority=False, fixture="NOT_RUN"):
        if (approved is not True or integrity is not True or inert is not True
                or (task_gate and authority is not True)
                or fixture not in {"PASSED", "FAILED", "BLOCKED", "NOT_RUN"}):
            raise Denied("staging permission/integrity/current task gate")
        self.state, self.fixture = "STAGED", fixture

    def activate(self, status, *, real_runs=0, fixture_only=False, host_verified=True,
                 checked_valid=True, admission=True, budgets=True, conflicts=True,
                 implicit_reclaim=False, reclaim=False, development_exception=False,
                 attestation=False, live=False, outcome=False, task_gate=False,
                 authority=False):
        if self.state != "STAGED" or (task_gate and authority is not True):
            raise Denied("current approved task still gates activation")
        route(status, host_verified=host_verified, checked_valid=checked_valid)
        if (type(real_runs) is not int or real_runs < 2 or fixture_only
                or any(v is not True for v in (admission, budgets, conflicts))
                or (development_exception and attestation is not True)
                or ((live or implicit_reclaim) and reclaim is not True)
                or (live and (attestation is not True or outcome is not True))):
            self.host = "BLOCKED"
            raise Denied("genuine scoped caller evidence missing")
        self.state = "LIVE_RECLAIM_ENABLED" if live else "NON_RECLAIM_VERIFIED"
        self.host = "PASSED"
        # Model proof is synthetic; never a claim about actual runtime wiring.


class LeaseSimulation:
    def __init__(self):
        self.lease = {"version": 2, "phase": "reserved", "recoveryRequired": True}
        self.exclusion = True
        self.sidecar = False
        self.incident = {"rawExit": None, "reason": None}
        self.expected = {
            "taskId": "fixture-task", "plan": "fixture-plan-v1", "run": "fixture-run",
            "operation": "fixture-op", "workspace": "fixture-workspace",
            "root": "/fixture/root", "boot": "fixture-boot",
            "leasePath": "/fixture/private/lease", "token": "fixture-token",
            "owner": (110, "1100"), "watchdog": (111, "1110"),
            "owned": ((112, "1120"),), "incident": "fixture-incident",
            "policy": "fixture-recovery-policy-v1",
        }
        self.recovery_approval = copy.deepcopy(self.expected)

    def error(self, kind, *, mutating=False, stopped=True):
        self.lease["phase"] = "running"
        self.lease["recoveryRequired"] = True
        self.sidecar = mutating
        self.incident = {"rawExit": 0 if stopped else None, "reason": kind,
                         "localStopped": stopped}

    def ordinary_recovery(self, *, dead=True, quiescent=True, claims_known=True):
        if (self.lease.get("version") != 2 or dead is not True
                or self.lease.get("phase") != "finished"
                or self.lease.get("recoveryRequired") is not False
                or quiescent is not True or claims_known is not True or self.sidecar):
            raise Denied("retained/unfinalized/incompatible or unknown state")
        self.exclusion = False

    def finish(self, *, journal=True, watchdog=True, quiescent=True):
        if any(v is not True for v in (journal, watchdog, quiescent)):
            self.error("failed-release", stopped=quiescent is True)
            raise Denied("healthy verified transaction required")
        self.lease.update(phase="finished", recoveryRequired=False)
        self.exclusion = False

    def recover(self, request, *, authentic=False, source=True, remaining=100,
                required=50, contenders=False, quiescent=False, claims=False,
                writes=False, acknowledged=False, revoked=False):
        if (authentic is not True or source is not True
                or request != self.recovery_approval or revoked
                or type(remaining) is not int or type(required) is not int
                or not 0 < required <= remaining <= 2147483647
                or any(v is not True for v in
                       (contenders, quiescent, claims, writes, acknowledged))):
            raise Denied("exact separate bounded recovery incomplete")
        self.exclusion = False
        self.sidecar = False
        # Original incident and prior validation outcome never change to PASS.


class GateSimulation:
    def __init__(self):
        self.events = ["reserve-recoveryRequired-true"]
        self.registered = self.dispatched = False
        self.watchdog = False
        self.healthy = True
        self.exclusion = True
        self.known = {(120, "1200")}
        self.signals = set()

    def register(self, *, ipc=True, journal=True, independent=True,
                 acknowledged=True, remaining=100, registration_cost=10):
        if (any(v is not True for v in (ipc, journal, independent, acknowledged))
                or type(remaining) is not int or remaining <= registration_cost):
            raise Denied("registration before dispatch required")
        self.events += ["gate-identity-journaled", "independent-registration-acked"]
        self.registered = self.watchdog = True

    def dispatch(self):
        if not self.registered or not self.watchdog:
            raise Denied("no user dispatch")
        self.events.append("user-dispatch")
        self.dispatched = True

    def stop(self, reason, *, discovery=True, quiescent=True, new_owned=()):
        self.known.update(new_owned)
        self.signals.update((pid, start, "TERM") for pid, start in self.known)
        self.signals.update((pid, start, "KILL") for pid, start in self.known)
        self.events.append(reason)
        self.healthy = False
        # Independent watchdog handling cannot grant release or acceptance.
        self.exclusion = True
        return {"knownStopped": discovery is True and quiescent is True,
                "recoveryRequired": True, "assessment": "BLOCKED"}

    def lose_watchdog(self):
        self.watchdog = False
        return self.stop("watchdog-lost")

    def release(self, *, healthy=True, quiescent=True, ack=True):
        if any(v is not True for v in
               (healthy, self.healthy, quiescent, ack, self.watchdog)):
            raise Denied("watchdog/healthy quiescence unavailable")
        self.exclusion = False


def structured_manifest(envelope):
    """Shape boundary model: no approval claim/intent/delivery can occur here."""
    result = {"state": "UNKNOWN", "exitCode": 4, "claims": 0, "intents": 0,
              "deliveries": 0, "listenerPreserved": True}
    if type(envelope) is not dict:
        return result
    binding = envelope.get("runBinding")
    ports = envelope.get("ports")
    members = envelope.get("processes")
    if (envelope.get("version") != 2 or type(binding) is not dict
            or any(type(binding.get(k)) is not str or not binding[k].strip()
                   or len(binding[k]) > 512
                   for k in ("taskId", "approvedPlanBinding", "runId"))
            or type(ports) is not list or not ports
            or any(type(p) is not int or not 1 <= p <= 65535 for p in ports)
            or type(members) is not list):
        return result
    seen = set()
    for m in members:
        if (type(m) is not dict or type(m.get("pid")) is not int
                or not 1 < m["pid"] <= 2**53 - 1 or m["pid"] in seen
                or type(m.get("startTime")) is not str or not m["startTime"]
                or not m["startTime"].isascii() or not m["startTime"].isdigit()):
            result.update(state="INVALID", exitCode=2)
            return result
        seen.add(m["pid"])
    result.update(state="SHAPE_ONLY", exitCode=None)
    return result


class RoutingAndStageTests(unittest.TestCase):
    def test_active_required_and_separate_diagnostic_routes(self):
        self.assertEqual(route("ACTIVE", checked_valid=True), "checked-tier")
        self.assertEqual(route("ACTIVE", checked_valid=True, purpose="diagnostic",
                               diagnostic=True), "checked-diagnostic")
        with self.assertRaises(Denied):
            route("ACTIVE", checked_valid=True, purpose="diagnostic")

    def test_active_missing_route_cannot_fall_back_to_host_policy(self):
        with self.assertRaises(Denied):
            route("ACTIVE", host_verified=True)

    def test_verified_inactive_uses_real_bounded_host_policy(self):
        self.assertEqual(route("INACTIVE", host_verified=True), "verified-bounded-host")
        with self.assertRaises(Denied):
            route("INACTIVE")

    def test_unknown_missing_and_draft_do_not_prove_inactivity(self):
        for status in ("UNKNOWN", None, "draft", "missing", "inactive", False):
            with self.subTest(status=status), self.assertRaises(Denied):
                route(status, host_verified=True, checked_valid=True)

    def test_invalid_explicit_checked_requests_never_fall_back(self):
        for status in ("ACTIVE", "INACTIVE", "UNKNOWN"):
            with self.subTest(status=status), self.assertRaises(Denied):
                route(status, explicit=True, host_verified=True)

    def test_reclaim_is_distinct_in_all_general_policy_states(self):
        for status in ("ACTIVE", "INACTIVE", "UNKNOWN"):
            with self.subTest(status=status):
                with self.assertRaises(Denied):
                    route(status, purpose="reclaim", checked_valid=True, host_verified=True)
                self.assertEqual(route(status, purpose="reclaim", reclaim=True),
                                 "checked-reclaim")

    def test_staging_and_blocked_fixtures_are_not_host_verification(self):
        s = StageSimulation()
        s.stage(fixture="BLOCKED")
        self.assertEqual((s.state, s.fixture, s.host), ("STAGED", "BLOCKED", "NOT_RUN"))
        self.assertFalse(s.live_callers_changed)
        self.assertEqual(s.legacy_risk, "unresolved")

    def test_every_fixture_status_stays_separate(self):
        for value in ("PASSED", "FAILED", "BLOCKED", "NOT_RUN"):
            s = StageSimulation()
            s.stage(fixture=value)
            self.assertEqual((s.state, s.host), ("STAGED", "NOT_RUN"))

    def test_task_wide_gate_requires_actual_revision_not_stage_label(self):
        s = StageSimulation()
        with self.assertRaises(Denied):
            s.stage(task_gate=True)
        self.assertIsNone(s.state)
        s.stage(task_gate=True, authority=True)  # synthetic approved scope only
        with self.assertRaises(Denied):
            s.activate("INACTIVE", real_runs=2, task_gate=True)

    def test_integrity_and_inert_placement_required(self):
        for field in ("approved", "integrity", "inert"):
            with self.subTest(field=field), self.assertRaises(Denied):
                StageSimulation().stage(**{field: False})

    def test_fixture_pass_or_one_host_run_never_activates(self):
        for kw in (dict(real_runs=0), dict(real_runs=1),
                   dict(real_runs=2, fixture_only=True)):
            s = StageSimulation()
            s.stage(fixture="PASSED")
            with self.assertRaises(Denied):
                s.activate("INACTIVE", **kw)
            self.assertEqual((s.state, s.host), ("STAGED", "BLOCKED"))

    def test_non_reclaim_needs_admission_budgets_and_conflicts(self):
        for field in ("admission", "budgets", "conflicts"):
            s = StageSimulation()
            s.stage()
            with self.subTest(field=field), self.assertRaises(Denied):
                s.activate("ACTIVE", real_runs=2, **{field: False})

    def test_implicit_reclaim_or_development_exception_still_blocks(self):
        for kw in (dict(implicit_reclaim=True), dict(development_exception=True)):
            s = StageSimulation()
            s.stage()
            with self.assertRaises(Denied):
                s.activate("INACTIVE", real_runs=2, **kw)

    def test_non_reclaim_and_live_states_require_distinct_real_evidence(self):
        s = StageSimulation()
        s.stage()
        s.activate("INACTIVE", real_runs=2)
        self.assertEqual(s.state, "NON_RECLAIM_VERIFIED")
        for field in ("reclaim", "attestation", "outcome"):
            s = StageSimulation()
            s.stage()
            args = dict(real_runs=2, live=True, reclaim=True, attestation=True, outcome=True)
            args[field] = False
            with self.subTest(field=field), self.assertRaises(Denied):
                s.activate("ACTIVE", **args)
        s = StageSimulation()
        s.stage()
        s.activate("ACTIVE", real_runs=2, live=True, reclaim=True,
                   attestation=True, outcome=True)
        self.assertEqual(s.state, "LIVE_RECLAIM_ENABLED")


class RetainedRecoveryTests(unittest.TestCase):
    def test_reservation_is_recovery_required_before_any_dispatch(self):
        self.assertIs(LeaseSimulation().lease["recoveryRequired"], True)

    def test_one_shot_quiescent_errors_without_sidecar_block_next_caller(self):
        for kind in ("one-shot-journal", "one-shot-discovery"):
            s = LeaseSimulation()
            s.error(kind)
            self.assertFalse(s.sidecar)
            self.assertTrue(s.incident["localStopped"])
            with self.assertRaises(Denied):
                s.ordinary_recovery()
            self.assertTrue(s.exclusion)

    def test_mutating_failure_preserves_sidecar(self):
        s = LeaseSimulation()
        s.error("mutation", mutating=True)
        with self.assertRaises(Denied):
            s.ordinary_recovery()
        self.assertTrue(s.sidecar)

    def test_missing_and_nonboolean_disposition_never_migrate(self):
        for value in (None, "false", 0, [], {}):
            s = LeaseSimulation()
            s.lease["phase"] = "finished"
            if value is None:
                del s.lease["recoveryRequired"]
            else:
                s.lease["recoveryRequired"] = value
            before = copy.deepcopy(s.lease)
            with self.assertRaises(Denied):
                s.ordinary_recovery()
            self.assertEqual(s.lease, before)

    def test_finalized_false_requires_known_quiescence_dead_owner_and_claims(self):
        for kw in (dict(dead=False), dict(quiescent=False), dict(quiescent="unknown"),
                   dict(claims_known=False)):
            s = LeaseSimulation()
            s.lease.update(phase="finished", recoveryRequired=False)
            with self.assertRaises(Denied):
                s.ordinary_recovery(**kw)
            self.assertTrue(s.exclusion)
        s = LeaseSimulation()
        s.lease.update(phase="finished", recoveryRequired=False)
        s.ordinary_recovery()
        self.assertFalse(s.exclusion)

    def test_only_healthy_release_sets_false(self):
        for field in ("journal", "watchdog", "quiescent"):
            s = LeaseSimulation()
            with self.assertRaises(Denied):
                s.finish(**{field: False})
            self.assertIs(s.lease["recoveryRequired"], True)
        s = LeaseSimulation()
        s.incident = {"rawExit": 7, "reason": None}
        s.finish()
        self.assertIs(s.lease["recoveryRequired"], False)
        self.assertEqual(s.incident["rawExit"], 7)

    def test_recovery_rejects_each_changed_exact_binding(self):
        s = LeaseSimulation()
        for field in s.expected:
            request = {**s.expected, field: "changed"}
            with self.subTest(field=field), self.assertRaises(Denied):
                s.recover(request, **self.valid())
            self.assertTrue(s.exclusion)

    @staticmethod
    def valid():
        return dict(authentic=True, contenders=True, quiescent=True,
                    claims=True, writes=True, acknowledged=True)

    def test_recovery_no_forged_source_unknown_commits_or_unacknowledged_release(self):
        for field in ("authentic", "source", "contenders", "quiescent",
                      "claims", "writes", "acknowledged"):
            s = LeaseSimulation()
            args = self.valid()
            args[field] = False
            with self.subTest(field=field), self.assertRaises(Denied):
                s.recover(copy.deepcopy(s.expected), **args)
            self.assertTrue(s.exclusion)

    def test_recovery_is_bounded_and_revocation_blocks(self):
        for kw in (dict(remaining=0), dict(remaining=49), dict(remaining=float("inf")),
                   dict(remaining=2147483648), dict(revoked=True)):
            s = LeaseSimulation()
            with self.assertRaises(Denied):
                s.recover(copy.deepcopy(s.expected), **self.valid(), **kw)

    def test_acknowledged_exact_recovery_preserves_incident_not_pass(self):
        s = LeaseSimulation()
        s.error("lost-original-write", mutating=True)
        old = copy.deepcopy(s.incident)
        s.recover(copy.deepcopy(s.expected), **self.valid())
        self.assertFalse(s.exclusion)
        self.assertFalse(s.sidecar)
        self.assertEqual(s.incident, old)
        self.assertIs(s.lease["recoveryRequired"], True)


class StartupAndShapeTests(unittest.TestCase):
    def test_gate_is_journaled_registered_before_dispatch(self):
        s = GateSimulation()
        s.register()
        s.dispatch()
        self.assertEqual(s.events, ["reserve-recoveryRequired-true",
                                   "gate-identity-journaled",
                                   "independent-registration-acked", "user-dispatch"])

    def test_missing_failed_or_late_registration_never_dispatches(self):
        for kw in (dict(ipc=False), dict(journal=False), dict(independent=False),
                   dict(acknowledged=False), dict(remaining=10)):
            s = GateSimulation()
            with self.assertRaises(Denied):
                s.register(**kw)
            with self.assertRaises(Denied):
                s.dispatch()
            self.assertFalse(s.dispatched)
            self.assertTrue(s.exclusion)

    def test_owner_stall_death_original_group_timeout_are_distinct_incidents(self):
        for reason in ("owner-stall", "owner-death", "original-group-timeout"):
            s = GateSimulation()
            s.register()
            s.dispatch()
            raw = s.stop(reason)
            self.assertTrue(raw["knownStopped"])
            self.assertTrue(raw["recoveryRequired"])
            self.assertEqual(raw["assessment"], "BLOCKED")
            self.assertTrue(s.exclusion)

    def test_watchdog_loss_prevents_healthy_release_and_retains_exclusion(self):
        s = GateSimulation()
        s.register()
        s.dispatch()
        self.assertTrue(s.lose_watchdog()["knownStopped"])
        with self.assertRaises(Denied):
            s.release()
        self.assertTrue(s.exclusion)

    def test_quiescent_owner_error_cannot_release_as_healthy(self):
        s = GateSimulation()
        s.register()
        s.dispatch()
        s.stop("owner-stall")
        with self.assertRaises(Denied):
            s.release()
        self.assertTrue(s.exclusion)

    def test_new_descendants_signaled_by_exact_incarnation_not_name(self):
        s = GateSimulation()
        s.stop("deadline", new_owned=((121, "1210"), (121, "new-start")))
        self.assertEqual(len(s.signals), 6)
        self.assertIn((121, "new-start", "KILL"), s.signals)

    def test_unknown_discovery_or_termination_never_proves_stopped(self):
        for kw in (dict(discovery=False), dict(quiescent=False),
                   dict(quiescent="unknown")):
            s = GateSimulation()
            self.assertFalse(s.stop("uncertainty", **kw)["knownStopped"])
            self.assertTrue(s.exclusion)

    @staticmethod
    def envelope():
        return {"version": 2, "ports": [8080],
                "processes": [{"pid": 122, "startTime": "1220"}],
                "runBinding": {"taskId": "fixture-task",
                               "approvedPlanBinding": "fixture-plan", "runId": "fixture-run"}}

    def assert_no_effect(self, outcome):
        self.assertIn(outcome["state"], {"INVALID", "UNKNOWN"})
        self.assertIn(outcome["exitCode"], {2, 4})
        self.assertEqual((outcome["claims"], outcome["intents"], outcome["deliveries"]), (0, 0, 0))
        self.assertTrue(outcome["listenerPreserved"])

    def test_null_primitive_and_array_envelopes_are_structured_unknown(self):
        for value in (None, 0, False, "", [], [self.envelope()]):
            self.assert_no_effect(structured_manifest(value))

    def test_null_primitive_array_malformed_members_are_structured_invalid(self):
        for member in (None, 0, False, "", [], {}, {"pid": 122, "startTime": None},
                       {"pid": True, "startTime": "1"}, {"pid": 1, "startTime": "1"},
                       {"pid": 122, "startTime": "1x"}, {"pid": 122, "startTime": 1220}):
            envelope = self.envelope()
            envelope["processes"] = [member]
            outcome = structured_manifest(envelope)
            self.assertEqual(outcome["state"], "INVALID")
            self.assert_no_effect(outcome)

    def test_duplicate_identity_and_bad_run_scope_bindings_no_effect(self):
        cases = []
        e = self.envelope()
        e["processes"] *= 2
        cases.append(e)
        for field, value in (("runBinding", None), ("runBinding", []),
                             ("ports", [0]), ("ports", ["8080"]),
                             ("processes", {})):
            cases.append({**self.envelope(), field: value})
        for field in ("taskId", "approvedPlanBinding", "runId"):
            e = self.envelope()
            e["runBinding"][field] = ""
            cases.append(e)
        for e in cases:
            self.assert_no_effect(structured_manifest(e))

    def test_valid_shape_alone_is_not_approval_or_claim(self):
        r = structured_manifest(self.envelope())
        self.assertEqual(r["state"], "SHAPE_ONLY")
        self.assertEqual((r["claims"], r["intents"], r["deliveries"]), (0, 0, 0))

    def test_canonical_parallel_references_have_local_policy_qualification(self):
        root = Path(__file__).resolve().parents[1]
        for name in ("SKILL.md", "README.md", "reference/implementation.md",
                     "reference/acceptance.md", "reference/validation-budgets.md",
                     "reference/staging-and-lifecycle.md", "reference/runtime-reclaim.md",
                     "reference/execution-monitoring.md", "reference/evidence-and-recovery.md",
                     "reference/owner-directed-closure.md",
                     "reference/adapters/posix-writer-lock/README.md"):
            with self.subTest(name=name):
                text = (root / name).read_text()
                for marker in ("ACTIVE", "INACTIVE", "UNKNOWN"):
                    self.assertIn(marker, text)
                self.assertIn("staging", text.lower())


if __name__ == "__main__":
    unittest.main()