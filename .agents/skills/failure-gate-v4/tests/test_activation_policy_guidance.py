"""Authoring document-contract regressions only; no host policy or authority."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(relative):
    return " ".join((ROOT / relative).read_text().split())


class ProactivePolicyGuidanceTests(unittest.TestCase):
    def setUp(self):
        self.core = text("SKILL.md")
        self.impl = text("reference/implementation.md")
        self.acceptance = text("reference/acceptance.md")

    def test_core_requires_agent_discovery_reuse_or_proposal(self):
        for clause in ("During authorized installation, Agent must discover",
                       "verify/reuse an applicable approved policy",
                       "proactively propose one for owner approval",
                       "never self-approve or invent routes"):
            self.assertIn(clause, self.core)

    def test_reuse_requires_actual_current_authority(self):
        for clause in ("actual authoritative policy/approval source",
                       "pinned scope/version, current approval, revocation",
                       "budget authority and available host integration",
                       "Unknown availability is not verified absence"):
            self.assertIn(clause, self.impl)

    def test_proposal_requires_complete_contract_and_real_routes(self):
        for clause in ("owner approval under the prior governing route",
                       "eligible plan source/approval criteria",
                       "exact task/plan/tier bindings",
                       "permitted operations/parameters/transitive allowlists",
                       "authoritative approval evidence and decision recording",
                       "complete finite budgets for every entry point",
                       "independent supervision/ termination, conflict coverage",
                       "change/revocation rules", "Inspect actual routes",
                       "do not ask the owner to invent technical interfaces"):
            self.assertIn(clause, self.impl)

    def test_missing_routes_never_become_agent_approval(self):
        for clause in ("Report missing capabilities and proposed implementation separately",
                       "never substitute Agent-written flags/references, fabricate services",
                       "self-approve", "Definition authoring alone"):
            self.assertIn(clause, self.impl)
        self.assertIn("activation is blocked", self.core)

    def test_bootstrap_does_not_authorize_ordinary_cutover(self):
        for clause in ("Policy approval alone does not activate a host route",
                       "distinct bounded bootstrap authorization",
                       "verified ordinary-route acceptance/cutover evidence",
                       "bootstrap checks cannot authorize ordinary tasks",
                       "Keep the prior governing route until separately approved scoped cutover",
                       "Bootstrap is limited to implementing the gate",
                       "cannot authorize ordinary tasks"):
            self.assertIn(clause, self.impl)

    def test_automatic_eligible_tasks_still_get_fresh_bound_decisions(self):
        for clause in ("After approval, verified integration and authorized cutover",
                       "apply the policy automatically to eligible tasks",
                       "recording a bound decision for each",
                       "Do not ask for fresh human policy approval",
                       "changed task bindings still need a fresh bound decision",
                       "Unmatched/uncertain tasks and changed policy terms"):
            self.assertIn(clause, self.impl)

    def test_policy_does_not_grant_exceptional_authority_or_actor_requirement(self):
        self.assertIn("grants no additional diagnostic, reclaim, recovery, coverage-waiver,"
                      " baseline-ignore or administrative-closure authority", self.impl)
        self.assertIn("No actor field is required", self.impl)
        self.assertIn("runtime-reclaim.md", self.impl)

    def test_readme_acceptance_and_policy_launcher_cover_obligation(self):
        self.assertIn("Proactive policy setup", self.acceptance)
        self.assertIn("Policy/bootstrap/cutover separation", self.acceptance)
        self.assertIn("proactively propose one for owner approval", text("README.md"))
        self.assertIn("loadTestsFromModule(p)", (ROOT / "scripts/run-authoring-tests.py").read_text())


if __name__ == "__main__":
    unittest.main()