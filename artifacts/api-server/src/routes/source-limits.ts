// Keep importer source acceptance aligned with the OpenAPI AnalyzeHtmlBody
// html maxLength and the generated API validation limit.
export const SOURCE_TEXT_MAX_BYTES = 2_097_152;
export const SOURCE_TEXT_LIMIT_LABEL = `${SOURCE_TEXT_MAX_BYTES / 1024 ** 2} MB`;