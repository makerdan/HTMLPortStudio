// Compatibility boundary for pasted/direct analysis, ZIP, hosted URL, GitHub,
// playground, and project handoff imports. Keep this aligned with the OpenAPI
// request and SourceBundleFile content maxLength values.
export const SOURCE_TEXT_MAX_BYTES = 2_097_152;
export const SOURCE_TEXT_LIMIT_LABEL = `${SOURCE_TEXT_MAX_BYTES / 1024 ** 2} MB`;
