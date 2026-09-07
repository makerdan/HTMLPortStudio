type AnalyticsData = Record<string, string | number | boolean>;
type SourceImportType = 'github' | 'hosted' | 'playground';
type SourceImportOutcome = 'cancelled' | 'completed';

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void;
    };
  }
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === 'undefined') return;

  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never break the app.
  }
}

export function trackSourceImportOutcome(
  sourceType: SourceImportType,
  outcome: SourceImportOutcome,
): void {
  trackEvent('source_import_outcome', {
    source_type: sourceType,
    outcome,
  });
}
