import { analyzeHtmlBodyThreeHtmlMax } from '../../../../lib/api-zod/src/generated/api.ts';

export const SOURCE_TEXT_MAX_BYTES = analyzeHtmlBodyThreeHtmlMax;
export const SOURCE_TEXT_LIMIT_LABEL = `${SOURCE_TEXT_MAX_BYTES / 1024 ** 2} MB`;