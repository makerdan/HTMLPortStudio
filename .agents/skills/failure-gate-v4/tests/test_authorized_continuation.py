"""Document-contract authoring checks only; no host grant, task mutation or signals."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = "reference/authorized-continuation.md"


def normalized(path):
    return " ".join((ROOT / path).read_text().split())


class AuthorizedContinuationDocumentTests(unittest.TestCase):
    def setUp(self):
        self.contract = normalized(REFERENCE)

    def contains(self, *clauses):
        for clause in clauses:
            with self.subTest(clause=clause):
                self.assertIn(clause, self.contract)

    def test_core_and_all_lifecycle_entry_points_require_contract(self):
        paths = ("SKILL.md", "README.md", "reference/implementation.md",
                 "reference/acceptance.md", "reference/staging-and-lifecycle.md",
                 "reference/validation-budgets.md", "reference/runtime-reclaim.md",
                 "reference/execution-monitoring.md", "reference/evidence-and-recovery.md",
                 "reference/owner-directed-closure.md",
                 "reference/adapters/posix-writer-lock/README.md")
        for path in paths:
            with self.subTest(path=path):
                self.assertIn("authorized-continuation.md", normalized(path))
        self.assertLess(len((ROOT / "SKILL.md").read_text().splitlines()), 500)

    def test_remaining_approved_work_is_not_returned_as_routine_user_steps(self):
        self.contains("Agent must continue all remaining feasible implementation, review and verification",
                      "Do not stop at a source checkpoint",
                      "Inspect the actual approved scope",
                      "Continue independent permitted work")

    def test_inert_scope_and_task_wide_gates_remain_binding(self):
        self.contains("forbid imports, syntax checks, tests, builds, store initialization",
                      "Do not perform those checks because they are short",
                      "Task-wide edit/test gates remain binding",
                      "explicit authorized amendment",
                      "Stage A may finish permitted supervisor/gate code while Stage B execution waits")

    def test_blockers_trigger_precise_permitted_proposals(self):
        self.contains("identify the exact missing requirement",
                      "proactively prepare the next concrete scoped proposal",
                      "using permitted planning and evidence access",
                      "Do not wait for the user to supply follow-up wording",
                      "Ask only for the specific approval or decision needed")

    def test_proposal_preparation_is_itself_scoped(self):
        self.contains("If preparing a proposal itself exceeds approved read/write scope",
                      "no unauthorized probing",
                      "An inaccessible external source is not permission",
                      "Preparation is not execution authorization",
                      "Reuse current applicable approval")

    def test_next_proposal_has_real_bindings_budgets_and_acceptance(self):
        self.contains("Exact task/operation/stage and requested approval",
                      "actual approval source, versions and plan/decision bindings",
                      "Current canonical source closure/manifest",
                      "transitive callers and permitted side effects",
                      "independent supervision/admission/termination",
                      "Complete finite phase/session/parent/attempt limits",
                      "expected injected failures versus failed acceptance",
                      "retained incidents/exclusion",
                      "Explicit exclusions, unresolved risks",
                      "Refresh source/plan bindings after approved changes")

    def test_first_fixture_proof_is_not_circular_or_uncontained(self):
        self.contains("do not require those same proposed tests to have passed",
                      "No safe independent boundary for first proof",
                      "neither waive it nor test an uncontained workload",
                      "code presence alone is not readiness")

    def test_failed_acceptance_does_not_grant_retries_or_reset_exclusion(self):
        self.contains("Only already authorized reruns/retries may execute",
                      "a maximum attempt count is not permission",
                      "Do not replenish counters, rename operations",
                      "delete retained leases/sidecars",
                      "shared parent accounting",
                      "exactly three authorized isolation retries")

    def test_new_tasks_statuses_and_operational_changes_are_not_automatic(self):
        self.contains("No automatic task creation, status/dependency change",
                      "approval, activation, retry, budget renewal, recovery",
                      "coverage waiver, policy change, cutover, publication, merge or deployment",
                      "no endless extra confidence checks",
                      "multiple explicit scopes and conditions",
                      "its preparation does not approve any of them")

    def test_investigation_and_closure_keep_their_distinct_boundaries(self):
        self.contains("Read-only investigations do not become repair authority",
                      "Do not run tests, install a monitor",
                      "no second approval, passing tests or new activation requirement",
                      "no automatic follow-up task or false validated completion",
                      "A missing native interface is a factual blocker")

    def test_reporting_distinguishes_stage_proof_proposal_and_completion(self):
        self.contains("complete authorized stage, proposed next work, awaiting approval",
                      "executed fixture results, real host acceptance",
                      "validated completion and owner-directed closure",
                      "specific next approval/decision or capability owner",
                      "proactively prepare the supported next proposal")

    def test_acceptance_and_bounded_policy_selection_cover_contract(self):
        acceptance = normalized("reference/acceptance.md")
        for row in ("Authorized continuation", "Next scoped proposal",
                    "First-proof sequence", "Failed execution continuation"):
            self.assertIn(row, acceptance)
        launcher = (ROOT / "scripts/run-authoring-tests.py").read_text()
        self.assertIn("import test_authorized_continuation as c;", launcher)
        self.assertIn("loadTestsFromModule(c)", launcher)


if __name__ == "__main__":
    unittest.main()