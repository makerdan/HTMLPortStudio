type AnalyticsData = Record<string, string | number | boolean>;

export const SOURCE_IMPORT_ANALYTICS_CONTRACT = {
  eventName: 'source_import_outcome',
  sourceTypes: ['paste', 'html', 'zip', 'github', 'hosted', 'playground'],
  outcomes: ['cancelled', 'completed', 'failed'],
  dimensions: {
    sourceType: 'source_type',
    outcome: 'outcome',
  },
} as const;

export type SourceImportType =
  (typeof SOURCE_IMPORT_ANALYTICS_CONTRACT.sourceTypes)[number];
export type SourceImportOutcome =
  (typeof SOURCE_IMPORT_ANALYTICS_CONTRACT.outcomes)[number];

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
  trackEvent(SOURCE_IMPORT_ANALYTICS_CONTRACT.eventName, {
    [SOURCE_IMPORT_ANALYTICS_CONTRACT.dimensions.sourceType]: sourceType,
    [SOURCE_IMPORT_ANALYTICS_CONTRACT.dimensions.outcome]: outcome,
  });
}
