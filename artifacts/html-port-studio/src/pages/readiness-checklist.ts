import type { PortFinding } from '@workspace/api-client-react';

export type ReadinessChecklistItem = {
  key: string;
  title: string;
  requiredChange: string;
  completed: boolean;
};

function readinessChecklistKey(finding: PortFinding): string {
  return [
    finding.severity,
    finding.title.trim().toLowerCase(),
    (finding.action ?? finding.detail).trim().toLowerCase(),
  ].join(':');
}

export function reconcileReadinessChecklist(
  previous: ReadinessChecklistItem[],
  findings: PortFinding[],
): ReadinessChecklistItem[] {
  const activeFindings = new Map(
    findings.map((finding) => [readinessChecklistKey(finding), finding]),
  );
  const previousKeys = new Set(previous.map((item) => item.key));
  const reconciled = previous.map((item) => {
    const finding = activeFindings.get(item.key);
    return finding
      ? {
          ...item,
          title: finding.title,
          requiredChange: finding.action ?? finding.detail,
          completed: false,
        }
      : { ...item, completed: true };
  });

  for (const finding of findings) {
    const key = readinessChecklistKey(finding);
    if (!previousKeys.has(key)) {
      reconciled.push({
        key,
        title: finding.title,
        requiredChange: finding.action ?? finding.detail,
        completed: false,
      });
    }
  }
  return reconciled;
}