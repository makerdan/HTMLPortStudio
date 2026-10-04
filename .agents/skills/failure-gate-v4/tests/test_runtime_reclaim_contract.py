"""TEST-ONLY policy simulations. No real approval, host proof, ports or signals.

Never adapt/import these fixtures as host-capabilities.mjs or a protected route.
The separate synthetic authority represents trusted inputs for unit assertions;
ordinary Python objects/locks cannot authenticate a human/platform in a project.
"""
import asyncio
import copy
import hashlib
import json
import re
import threading
import unittest
from pathlib import Path


class Denied(Exception):
    pass


class Uncertain(Exception):
    pass


def scope(ports, processes, own=False):
    if not ports or any(type(p) is not int or not 1 <= p <= 65535 for p in ports):
        raise Denied("invalid port")
    if type(own) is not bool:
        raise Denied("invalid own-tree permission")
    seen = set()
    targets = []
    for p in processes:
        if (set(p) != {"pid", "startTime"} or type(p["pid"]) is not int
                or not 1 < p["pid"] <= 2**53 - 1 or p["pid"] in seen
                or not isinstance(p["startTime"], str)
                or not re.fullmatch(r"[0-9]+", p["startTime"])):
            raise Denied("invalid/duplicate incarnation")
        seen.add(p["pid"])
        targets.append({"pid": p["pid"], "startTime": p["startTime"]})
    return {"ports": sorted(set(ports)),
            "processes": sorted(targets, key=lambda p: p["pid"]),
            "allowOwnTree": own, "signals": ["SIGTERM", "SIGKILL"],
            "graceMs": 3000, "killVerificationMs": 5000}


def digest(value):
    return hashlib.sha256(json.dumps(
        value, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")).hexdigest()


def fixture_request():
    s = scope([8081, 8080, 8080], [
        {"pid": 202, "startTime": "2200"}, {"pid": 101, "startTime": "1100"}
    ])
    run = {"taskId": "fixture-task", "approvedPlanBinding": "fixture-plan-v1",
           "runId": "fixture-run"}
    binding = {"projectRoot": "/fixture/root", "bootId": "fixture-boot",
               "indicators": {"nodeEnv": None, "deployment": None,
                              "environment": None, "devDomain": "fixture.example"}}
    return {"operationId": "fixture-operation", "operation": "runtime.process-reclaim",
            "manifest": {"version": 2, "bootId": binding["bootId"], "expiresAt": 9000,
                         "ports": s["ports"], "processes": s["processes"],
                         "allowOwnTree": False, "runBinding": run,
                         "authorizationReference": "fixture-approval"},
            "binding": binding, "requestedScope": s, "scopeDigest": digest(s),
            "attestation": {"protocolVersion": 1, "attestationId": "fixture-attestation",
                            "environment": "development", "projectRoot": binding["projectRoot"],
                            "bootId": binding["bootId"], "expiresAt": 9000}}


class SimulatedAuthority:
    """In-memory TEST MODEL only; not a protected store, provider or real registry."""

    def __init__(self):
        self.expected = copy.deepcopy(fixture_request())
        # Deliberately independent from caller-owned request/manifest objects.
        self.approval = {"reference": "fixture-approval", "approver": "fixture-human",
                         "active": True, "revoked": False, "expiresAt": 9000}
        self.host = {"workspace": "fixture-workspace", "launcher": (303, "3300"),
                     "issuedAt": 500, "revoked": False, "expiresAt": 9000,
                     "developmentAuthorized": True}
        self.now = 1000
        self.available = True
        self.active = True
        self.claim = None
        self.consumed = False
        self.uncertain = False
        self.exclusion = False
        self.events = []
        self.signal_intents = {}
        self.stored = None
        self.intent_ack = True
        self.outcome_ack = True
        self.outcome_attempted = False
        self.mutex = threading.Lock()
        self.registered_descendants = {(101, "1100"), (202, "2200")}

    def verify(self, r, live=True):
        e = self.expected
        if not self.available:
            raise Denied("authoritative source/transport unavailable")
        if (r["operation"] != "runtime.process-reclaim" or not r["operationId"]
                or r["binding"] != e["binding"]
                or r["manifest"]["version"] != 2
                or r["manifest"]["bootId"] != e["binding"]["bootId"]
                or r["manifest"]["runBinding"] != e["manifest"]["runBinding"]
                or r["manifest"]["authorizationReference"] != self.approval["reference"]
                or not self.approval["approver"] or not self.approval["active"]):
            raise Denied("independent binding/approval mismatch")
        s = r["requestedScope"]
        if (tuple(s) != ("ports", "processes", "allowOwnTree", "signals",
                         "graceMs", "killVerificationMs")
                or s != e["requestedScope"]
                or r["scopeDigest"] != digest(e["requestedScope"])
                or scope(r["manifest"]["ports"], r["manifest"]["processes"],
                         r["manifest"]["allowOwnTree"]) != e["requestedScope"]):
            raise Denied("independently approved scope mismatch")
        if r["attestation"] != e["attestation"] or not self.host["workspace"]:
            raise Denied("wrong independent host proof")
        indicators = r["binding"]["indicators"]
        if indicators["nodeEnv"] == "production" or indicators["deployment"] == "1":
            raise Denied("unconditional production blocker")
        if indicators["environment"] == "production":
            record = r.get("developmentRecord", {})
            if (not indicators["devDomain"]
                    or self.host["developmentAuthorized"] is not True
                    or record.get("root") != e["binding"]["projectRoot"]
                    or record.get("boot") != e["binding"]["bootId"]
                    or record.get("launcher") != self.host["launcher"]
                    or record.get("domain") != indicators["devDomain"]
                    or record.get("safeFile") is not True
                    or not self.host["issuedAt"] <= self.now < self.host["expiresAt"]):
                raise Denied("unverified development exception")
        if live and (not self.active or self.approval["revoked"] or self.host["revoked"]
                     or self.now >= min(self.approval["expiresAt"],
                                       self.host["expiresAt"], r["manifest"]["expiresAt"],
                                       r["attestation"]["expiresAt"])):
            raise Denied("terminal/revoked/expired authority")
        identities = {(p["pid"], p["startTime"]) for p in s["processes"]}
        if self.registered_descendants - identities:
            raise Denied("unapproved descendant")

    def begin(self, r):
        with self.mutex:
            self.verify(r)
            if self.consumed or self.exclusion:
                raise Denied("replay/conflicting claim")
            self.claim = copy.deepcopy(r)
            self.consumed = self.exclusion = True
            self.events.append(("claim-intent", r["operationId"]))
            return {"protocolVersion": 1, "authorizationId": self.approval["reference"],
                    "operationId": r["operationId"], "scopeDigest": r["scopeDigest"],
                    "attestationId": r["attestation"]["attestationId"],
                    "expiresAt": min(r["manifest"]["expiresAt"], self.approval["expiresAt"]),
                    "runBinding": copy.deepcopy(r["manifest"]["runBinding"]),
                    "checkBeforeSignal": self.before_signal, "recordOutcome": self.record}

    def same_claim(self, r):
        if not self.claim or r != self.claim:
            raise Denied("wrong claim binding")

    def before_signal(self, r, signal):
        with self.mutex:
            self.same_claim(r)
            self.verify(r)
            if self.uncertain or not self.exclusion:
                raise Denied("uncertain operation")
            if signal not in r["requestedScope"]["signals"]:
                raise Denied("unapproved signal")
            if signal in self.signal_intents:
                raise Denied("signal-batch replay")
            if signal == "SIGKILL" and (
                    "SIGTERM" not in self.signal_intents or
                    self.now - self.signal_intents["SIGTERM"] < r["requestedScope"]["graceMs"]):
                raise Denied("unapproved early escalation")
            if self.intent_ack is not True:
                raise Denied("intent not durably acknowledged")
            self.events.append(("signal-intent", signal))
            self.signal_intents[signal] = self.now
            return True

    def simulated_signal(self, r, signal, deliveries=None):
        if self.before_signal(r, signal) is not True:
            raise Denied("strict intent acknowledgement")
        self.events.append(("simulated-delivery", signal, deliveries or ["delivered"]))

    def record(self, r, raw, signal_outcomes):
        with self.mutex:
            self.same_claim(r)
            # Storage permits late truthful evidence, not expired signaling.
            if self.outcome_attempted:
                raise Denied("no blind repeat outcome write")
            self.outcome_attempted = True
            self.events.append(("outcome-intent", r["operationId"]))
            if self.outcome_ack is not True or not self.available:
                self.uncertain = True
                raise Uncertain("storage acknowledgement missing")
            self.stored = {"rawOutcome": copy.deepcopy(raw),
                           "signalOutcomes": copy.deepcopy(signal_outcomes)}
            return True

    def recover(self, authorized=False, verified=False, quiescent=False):
        # Model a separately scoped recovery policy, not a new public protocol API.
        if not authorized or not verified or not quiescent:
            raise Denied("recovery cannot bypass claim or uncertain workload")
        self.events.append(("recovery-readback", self.claim["operationId"] if self.claim else None))
        self.exclusion = False
        # Consumption/uncertainty/history survive recovery; no new signaling grant.


def simulated_cleanup_assessment(g, quiescent=False):
    """Never assesses a required tier; supplied liveness is synthetic test proof."""
    if g.uncertain or g.stored is None:
        return "BLOCKED"
    if not quiescent:
        return "INCOMPLETE"
    return "RECORDED_CLEANUP_ONLY"


class SimulatedSupervision:
    """Test-only admitted owned job, separate from new reclaim permission."""
    def __init__(self):
        self.admission_expires_at = 2000
        self.started = False
        self.stopped = False

    def dispatch(self, now):
        if now >= self.admission_expires_at or self.started:
            raise Denied("new dispatch needs live admission")
        self.started = True

    def cancel_owned(self):
        if not self.started:
            raise Denied("no previously admitted owned job")
        self.stopped = True


class ReclaimPolicySimulations(unittest.TestCase):
    def setUp(self):
        self.g = SimulatedAuthority()
        self.r = fixture_request()

    def deny_claim(self, r=None):
        with self.assertRaises(Denied):
            self.g.begin(r or self.r)
        self.assertIsNone(self.g.claim)
        self.assertFalse(self.g.events)

    def test_valid_exact_claim_and_journal_before_simulated_delivery(self):
        handle = self.g.begin(self.r)
        self.assertEqual(set(handle), {"protocolVersion", "authorizationId", "operationId",
                                     "scopeDigest", "attestationId", "expiresAt", "runBinding",
                                     "checkBeforeSignal", "recordOutcome"})
        self.assertLessEqual(handle["expiresAt"], self.r["manifest"]["expiresAt"])
        self.g.simulated_signal(self.r, "SIGTERM")
        self.g.now += 3000
        self.g.simulated_signal(self.r, "SIGKILL")
        self.assertIs(handle["recordOutcome"](self.r, {"state": "FREE", "exitCode": 0}, []), True)
        self.assertEqual([e[0] for e in self.g.events],
                         ["claim-intent", "signal-intent", "simulated-delivery",
                          "signal-intent", "simulated-delivery", "outcome-intent"])
        self.assertTrue(self.g.exclusion)  # Storage alone never proves safe release.

    def test_missing_unavailable_source(self):
        self.g.available = False
        self.deny_claim()

    def test_caller_reference_actor_boolean_cannot_create_authority(self):
        self.r["manifest"].update(approved=True, approver="claimed-human")
        self.g.approval["approver"] = None
        self.deny_claim()

    def test_forged_nonempty_reference(self):
        self.r["manifest"]["authorizationReference"] = "agent-written"
        self.deny_claim()

    def test_draft_terminal_or_suspended_task(self):
        self.g.active = False
        self.deny_claim()

    def test_altered_task_plan_run(self):
        for field in ("taskId", "approvedPlanBinding", "runId"):
            with self.subTest(field=field):
                r = fixture_request()
                r["manifest"]["runBinding"][field] += "-other"
                self.deny_claim(r)

    def test_altered_scope_even_with_matching_caller_hash(self):
        changes = {"ports": [9999], "processes": [{"pid": 101, "startTime": "9999"}],
                   "allowOwnTree": True, "signals": ["SIGKILL"],
                   "graceMs": 1, "killVerificationMs": 1}
        for field, value in changes.items():
            with self.subTest(field=field):
                r = fixture_request()
                r["requestedScope"][field] = value
                r["scopeDigest"] = digest(r["requestedScope"])
                self.deny_claim(r)

    def test_manifest_targets_boot_own_tree_and_expiry(self):
        for field, value in (("processes", [{"pid": 101, "startTime": "9999"}]),
                             ("bootId", "other-boot"), ("allowOwnTree", True), ("expiresAt", 999)):
            with self.subTest(field=field):
                r = fixture_request()
                r["manifest"][field] = value
                self.deny_claim(r)

    def test_wrong_root_boot_and_attestation(self):
        for part, field in (("binding", "projectRoot"), ("binding", "bootId"),
                            ("attestation", "attestationId"), ("attestation", "environment")):
            with self.subTest(field=field):
                r = fixture_request()
                r[part][field] = "wrong"
                self.deny_claim(r)

    def test_reclaim_unmarked_environment_still_needs_independent_proof(self):
        self.g.host["workspace"] = None
        self.deny_claim()

    def test_expired_revoked_attestation_or_approval(self):
        for source, field, value in (("host", "revoked", True), ("host", "expiresAt", 999),
                                     ("approval", "revoked", True), ("approval", "expiresAt", 999)):
            with self.subTest(source=source, field=field):
                g = SimulatedAuthority()
                getattr(g, source)[field] = value
                with self.assertRaises(Denied):
                    g.begin(self.r)
                self.assertFalse(g.events)

    def development(self):
        for r in (self.r, self.g.expected):
            r["binding"]["indicators"]["environment"] = "production"
        self.r["developmentRecord"] = {
            "safeFile": True, "root": "/fixture/root",
            "boot": "fixture-boot", "launcher": (303, "3300"), "domain": "fixture.example"}

    def test_narrow_development_exception(self):
        self.development()
        self.g.begin(self.r)
        self.g.simulated_signal(self.r, "SIGTERM")

    def test_domain_or_local_record_cannot_replace_host_verification(self):
        self.development()
        self.r["developmentRecord"]["hostVerified"] = True  # Caller forgery grants nothing.
        self.g.host["developmentAuthorized"] = False
        self.deny_claim()

    def test_invalid_development_binding(self):
        for field, value in (("safeFile", False), ("root", "/wrong"),
                             ("boot", "wrong"), ("launcher", (999, "999")),
                             ("domain", "other.example")):
            with self.subTest(field=field):
                self.setUp()
                self.development()
                self.r["developmentRecord"][field] = value
                self.deny_claim()

    def test_hard_production_defeats_valid_development_record(self):
        for field, value in (("nodeEnv", "production"), ("deployment", "1")):
            with self.subTest(field=field):
                self.setUp()
                self.development()
                for r in (self.r, self.g.expected):
                    r["binding"]["indicators"][field] = value
                self.deny_claim()

    def test_replay_same_and_fresh_operation_id(self):
        self.g.begin(self.r)
        for op in ("fixture-operation", "new-operation"):
            r = fixture_request()
            r["operationId"] = op
            with self.assertRaises(Denied):
                self.g.begin(r)
        self.assertEqual(len(self.g.events), 1)

    def test_simultaneous_claims_have_one_owner(self):
        barrier = threading.Barrier(3, timeout=2)
        results = []
        result_lock = threading.Lock()

        def contender(op):
            try:
                r = fixture_request()
                r["operationId"] = op
                barrier.wait()
                self.g.begin(r)
                result = "claimed"
            except Denied:
                result = "denied"
            except Exception as e:
                result = repr(e)
            with result_lock:
                results.append(result)

        workers = [threading.Thread(target=contender, args=(f"op-{i}",), daemon=True)
                   for i in range(2)]
        for w in workers:
            w.start()
        barrier.wait()
        for w in workers:
            w.join(timeout=2)
            self.assertFalse(w.is_alive())
        self.assertCountEqual(results, ["claimed", "denied"])
        self.assertTrue(self.g.exclusion)

    def test_cross_run_conflict_not_authorized_by_new_run_metadata(self):
        self.g.begin(self.r)
        other = fixture_request()
        other["manifest"]["runBinding"]["runId"] = "other-run"
        self.g.expected["manifest"]["runBinding"]["runId"] = "other-run"
        with self.assertRaises(Denied):
            self.g.begin(other)
        self.assertTrue(self.g.exclusion)

    def test_mid_operation_expiry_revocation_and_late_truthful_evidence(self):
        for change in ("approval-revoked", "host-revoked", "expired"):
            with self.subTest(change=change):
                self.setUp()
                self.g.begin(self.r)
                self.g.simulated_signal(self.r, "SIGTERM")
                if change == "expired":
                    self.g.now = 10000
                elif change == "host-revoked":
                    self.g.host["revoked"] = True
                else:
                    self.g.approval["revoked"] = True
                with self.assertRaises(Denied):
                    self.g.simulated_signal(self.r, "SIGKILL")
                self.assertIs(self.g.record(self.r, {"state": "UNKNOWN", "exitCode": 4},
                                            [{"signal": "SIGTERM", "result": "delivered"}]), True)
                self.assertTrue(self.g.exclusion)
                self.assertEqual(len([e for e in self.g.events if e[0] == "simulated-delivery"]), 1)

    def test_rejected_escalation_and_strict_intent_ack(self):
        for response in (False, None, 1, "true", {"ok": True}):
            with self.subTest(response=response):
                self.setUp()
                self.g.begin(self.r)
                self.g.simulated_signal(self.r, "SIGTERM")
                self.g.now += 3000
                self.g.intent_ack = response
                with self.assertRaises(Denied):
                    self.g.simulated_signal(self.r, "SIGKILL")
                self.assertEqual(len(self.g.events), 3)

    def test_changed_operation_plan_scope_or_attestation_after_claim(self):
        self.g.begin(self.r)
        for part, field, value in (("", "operationId", "new-op"),
                                   ("manifest", "runBinding", {"taskId": "wrong"}),
                                   ("requestedScope", "ports", [9999]),
                                   ("attestation", "attestationId", "renewed")):
            r = copy.deepcopy(self.r)
            (r[part] if part else r)[field] = value
            with self.assertRaises(Denied):
                self.g.simulated_signal(r, "SIGTERM")
        self.assertEqual(len(self.g.events), 1)

    def test_missing_outcome_ack_retains_raw_success_and_blocks_acceptance(self):
        self.g.begin(self.r)
        self.g.outcome_ack = None
        raw = {"state": "FREE", "exitCode": 0}
        with self.assertRaises(Uncertain):
            self.g.record(self.r, raw, [])
        self.assertEqual(raw["state"], "FREE")
        self.assertIsNone(self.g.stored)
        self.assertTrue(self.g.uncertain and self.g.exclusion)
        self.assertEqual(simulated_cleanup_assessment(self.g, quiescent=True), "BLOCKED")
        with self.assertRaises(Denied):
            self.g.record(self.r, raw, [])

    def test_partial_signal_results_and_surviving_descendants(self):
        self.g.begin(self.r)
        self.g.simulated_signal(self.r, "SIGTERM", ["delivered", "EPERM"])
        results = [{"pid": 101, "result": "delivered"}, {"pid": 202, "result": "EPERM"}]
        self.g.record(self.r, {"state": "CLEANUP_FAILED", "exitCode": 1}, results)
        self.assertEqual(self.g.stored["signalOutcomes"], results)
        with self.assertRaises(Denied):
            self.g.recover(authorized=True, verified=True, quiescent=False)
        self.assertTrue(self.g.exclusion)

    def test_unapproved_descendant_prevents_signals(self):
        self.g.registered_descendants.add((404, "4400"))
        self.deny_claim()

    def test_recovery_is_separate_and_cannot_reconsume_grant(self):
        self.g.begin(self.r)
        self.g.uncertain = True
        for args in ({}, {"authorized": True}, {"authorized": True, "verified": True}):
            with self.assertRaises(Denied):
                self.g.recover(**args)
            self.assertTrue(self.g.exclusion)
        self.g.recover(authorized=True, verified=True, quiescent=True)
        self.assertFalse(self.g.exclusion)
        with self.assertRaises(Denied):
            self.g.begin(self.r)
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGKILL")

    def test_invalid_scope_types_duplicates_and_key_order(self):
        for ports, processes, own in (([True], [], False), ([0], [], False),
                                     ([8080], [{"pid": 1, "startTime": "1"}], False),
                                     ([8080], [{"pid": 2, "startTime": 123}], False),
                                     ([8080], [{"pid": 2, "startTime": "1"}] * 2, False),
                                     ([8080], [], 1)):
            with self.subTest(ports=ports, processes=processes):
                with self.assertRaises(Denied):
                    scope(ports, processes, own)
        self.r["requestedScope"] = dict(reversed(list(self.r["requestedScope"].items())))
        self.deny_claim()

    def test_raw_cleanup_is_never_required_tier_evidence(self):
        self.g.begin(self.r)
        self.g.record(self.r, {"state": "FREE", "exitCode": 0}, [])
        record = self.g.stored
        self.assertNotIn("validationAssessment", record)
        self.assertNotIn("requiredTierEvidence", record)
        self.assertTrue(self.g.exclusion)
        self.assertEqual(simulated_cleanup_assessment(self.g), "INCOMPLETE")
        self.assertEqual(simulated_cleanup_assessment(self.g, quiescent=True),
                         "RECORDED_CLEANUP_ONLY")

    def test_strict_outcome_ack_and_unavailable_storage(self):
        for response in (False, 1, "true", {"ok": True}, None):
            with self.subTest(response=response):
                self.setUp()
                self.g.begin(self.r)
                self.g.outcome_ack = response
                with self.assertRaises(Uncertain):
                    self.g.record(self.r, {"state": "FREE", "exitCode": 0}, [])
                self.assertEqual(simulated_cleanup_assessment(self.g, True), "BLOCKED")
        self.setUp()
        self.g.begin(self.r)
        self.g.available = False
        with self.assertRaises(Uncertain):
            self.g.record(self.r, {"state": "FREE", "exitCode": 0}, [])

    def test_admission_expiry_blocks_queue_but_preserves_owned_supervision(self):
        queued = SimulatedSupervision()
        with self.assertRaises(Denied):
            queued.dispatch(3000)
        self.assertFalse(queued.started)
        admitted = SimulatedSupervision()
        admitted.dispatch(1000)
        self.g.now = 10000
        admitted.cancel_owned()
        self.assertTrue(admitted.stopped)
        self.deny_claim()  # Owned supervision is not fresh reclaim authority.

    def test_recovery_ends_signal_permission_without_renewing_claim(self):
        self.g.begin(self.r)
        self.g.recover(authorized=True, verified=True, quiescent=True)
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGKILL")

    def test_malformed_or_lost_handle_requires_readback_not_retry(self):
        self.g.begin(self.r)
        self.g.uncertain = True  # Claim committed; caller cannot verify returned handle.
        self.assertTrue(self.g.exclusion)
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGTERM")
        fresh = fixture_request()
        fresh["operationId"] = "replacement"
        with self.assertRaises(Denied):
            self.g.begin(fresh)

    def test_escalation_requires_grace_and_one_intent_per_signal(self):
        self.g.begin(self.r)
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGKILL")
        self.g.simulated_signal(self.r, "SIGTERM")
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGTERM")
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGKILL")
        self.g.now += 3000
        self.g.simulated_signal(self.r, "SIGKILL")
        with self.assertRaises(Denied):
            self.g.simulated_signal(self.r, "SIGKILL")
        self.assertEqual(len(self.g.events), 5)


class DeadlineSimulations(unittest.IsolatedAsyncioTestCase):
    async def bounded(self, provider, g):
        # Scaled 20 ms fixture deadline; real Port Authority uses two seconds.
        abort = asyncio.Event()
        try:
            return await asyncio.wait_for(provider(abort), timeout=0.02)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            abort.set()
            g.uncertain = g.exclusion = True
            raise Uncertain("unknown committed outcome; no retry")

    async def test_lost_claim_response_and_provider_cancellation(self):
        g, r = SimulatedAuthority(), fixture_request()
        observed = {}

        async def provider(abort):
            g.begin(r)
            observed["abort"] = abort
            try:
                await asyncio.sleep(1)
            except asyncio.CancelledError:
                observed["cancelled"] = True
                raise

        with self.assertRaises(Uncertain):
            await self.bounded(provider, g)
        self.assertTrue(observed["abort"].is_set() and observed["cancelled"])
        self.assertEqual(g.claim["operationId"], r["operationId"])
        self.assertTrue(g.exclusion)
        with self.assertRaises(Denied):
            g.begin(r)
        with self.assertRaises(Denied):
            g.simulated_signal(r, "SIGTERM")

    async def test_lost_write_response_preserves_committed_raw_outcome(self):
        g, r = SimulatedAuthority(), fixture_request()
        g.begin(r)

        async def provider(abort):
            g.record(r, {"state": "FREE", "exitCode": 0}, [{"result": "delivered"}])
            await asyncio.sleep(1)

        with self.assertRaises(Uncertain):
            await self.bounded(provider, g)
        self.assertEqual(g.stored["rawOutcome"]["state"], "FREE")
        self.assertTrue(g.uncertain and g.exclusion)
        with self.assertRaises(Denied):
            g.record(r, {"state": "FREE"}, [])

    async def test_timeout_before_known_commit_keeps_unknown_exclusion(self):
        g = SimulatedAuthority()

        async def provider(abort):
            await asyncio.sleep(1)

        with self.assertRaises(Uncertain):
            await self.bounded(provider, g)
        self.assertIsNone(g.claim)
        self.assertTrue(g.exclusion)
        with self.assertRaises(Denied):
            g.begin(fixture_request())


class DocumentBoundaryTests(unittest.TestCase):
    def test_normative_contract_is_linked_and_simulations_not_activation(self):
        root = Path(__file__).resolve().parents[1]
        text = (root / "reference/runtime-reclaim.md").read_text()
        for phrase in ("authentic approver", "atomically claim", "exactly `true`",
                       "two-second", "independent attestation", "surviving workloads",
                       "separately authorized", "not an existing endpoint",
                       "expired/revoked", "owner-directed closure",
                       "exactly three authorized bounded isolation retries"):
            self.assertIn(phrase, " ".join(text.split()))
        for path in ("SKILL.md", "README.md", "reference/implementation.md",
                     "reference/acceptance.md", "reference/execution-monitoring.md",
                     "reference/evidence-and-recovery.md"):
            self.assertIn("runtime-reclaim.md", (root / path).read_text())
        self.assertIn("never opens", (root / "README.md").read_text())


if __name__ == "__main__":
    unittest.main()