#!/usr/bin/env python3
"""Finite Linux AUTHORING launcher, never a checked host task/tier runner."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from authoring_supervision import supervise_static


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", choices=("all", "policy", "writer"), default="all")
    args = parser.parse_args()
    if args.suite == "writer":
        command = [sys.executable, "-B", "-m", "unittest", "discover", "-s",
                   str(ROOT / "reference/adapters/posix-writer-lock/tests"), "-v"]
    elif args.suite == "all":
        command = [sys.executable, "-B", "-m", "unittest", "discover", "-s",
                   str(ROOT / "tests"), "-v"]
    else:
        # Exact inspected classes: no process-level fixtures in policy mode.
        code = (
            "import sys,unittest;sys.path.insert(0,sys.argv[1]);"
            "import test_validation_budgets as b,test_runtime_reclaim_contract as r;"
            "import test_audit_regressions as a;"
            "import test_staging_lifecycle as l;"
            "s=unittest.TestSuite();"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(b.BudgetPolicyTests));"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(b.BudgetDocumentTests));"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromModule(r));"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(a.CaptureAndClockTests));"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(a.FailureAcceptanceTests));"
            "s.addTests(unittest.defaultTestLoader.loadTestsFromModule(l));"
            "o=unittest.TextTestRunner(verbosity=2).run(s);sys.exit(not o.wasSuccessful())"
        )
        command = [sys.executable, "-B", "-c", code, str(ROOT / "tests")]
    result = supervise_static(command, execution=30, max_bytes=1048576)
    print(result.pop("output"), end="")
    print("FG_AUTHORING_SUITE_RESULT " + json.dumps(result))
    return 0 if result["pass_"] else 1


if __name__ == "__main__":
    raise SystemExit(main())