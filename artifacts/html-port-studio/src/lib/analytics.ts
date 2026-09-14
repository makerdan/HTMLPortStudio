type AnalyticsData = Record<string, string | number | boolean>;

export const SOURCE_IMPORT_ANALYTICS_CONTRACT = {
  eventName: "source_import_outcome",
  sourceTypes: ["paste", "html", "zip", "github", "hosted", "playground"],
  outcomes: ["cancelled", "completed", "failed"],
  dimensions: {
    sourceType: "source_type",
    outcome: "outcome",
  },
} as const;

export const STUDIO_ANALYTICS_CONTRACT = {
  events: {
    [SOURCE_IMPORT_ANALYTICS_CONTRACT.eventName]: {
      fields: {
        [SOURCE_IMPORT_ANALYTICS_CONTRACT.dimensions.sourceType]:
          SOURCE_IMPORT_ANALYTICS_CONTRACT.sourceTypes,
        [SOURCE_IMPORT_ANALYTICS_CONTRACT.dimensions.outcome]:
          SOURCE_IMPORT_ANALYTICS_CONTRACT.outcomes,
      },
    },
    credential_recovery_rescan: {
      fields: {
        result: ["passed", "failed"],
      },
    },
    credential_recovery_action: {
      fields: {
        action: ["apply", "reject", "undo"],
      },
    },
    credential_recovery_opened: {
      fields: {},
    },
    credential_recovery_proposal_requested: {
      fields: {},
    },
    credential_recovery_consent: {
      fields: {},
    },
  },
} as const;

type StudioAnalyticsEventName = keyof typeof STUDIO_ANALYTICS_CONTRACT.events;

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

function isRecord(value: unknown): value is AnalyticsData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAllowedAnalyticsEvent(
  name: string,
  data?: AnalyticsData,
): name is StudioAnalyticsEventName {
  const event =
    STUDIO_ANALYTICS_CONTRACT.events[name as StudioAnalyticsEventName];
  if (!event || (data !== undefined && !isRecord(data))) return false;

  const allowedFields = Object.keys(event.fields);
  const suppliedFields = Object.keys(data ?? {});
  if (
    suppliedFields.length !== allowedFields.length ||
    suppliedFields.some((field) => !Object.hasOwn(event.fields, field))
  ) {
    return false;
  }

  return suppliedFields.every((field) => {
    const value = data?.[field];
    const allowedValues = event.fields[field as keyof typeof event.fields];
    return (
      typeof value === "string" &&
      (allowedValues as readonly string[]).includes(value)
    );
  });
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  if (!isAllowedAnalyticsEvent(name, data)) return;

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
