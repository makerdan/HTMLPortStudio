import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const validationRoot = resolve(root, ".cache", "api-validation");

function cleanValidationOutput() {
  rmSync(validationRoot, { force: true, recursive: true });
}

function fail(message, exitCode = 1) {
  cleanValidationOutput();
  console.error(`[api-validation] ${message}`);
  process.exit(exitCode);
}

function runStep(label, command, args, env = {}) {
  console.log(`\n[api-validation] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.error) {
    fail(`${label} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${label} failed.`, result.status ?? 1);
  }
}

function compareGeneratedSource(label, committedPath, generatedPath) {
  const result = spawnSync("diff", ["-qr", committedPath, generatedPath], {
    cwd: root,
    encoding: "utf8",
  });

  if (result.error || result.status === null || result.status > 1) {
    fail(`Could not compare ${label} generated source.`);
  }

  if (result.status === 1) {
    if (result.stdout.trim()) {
      console.error(result.stdout.trim());
    }
    fail(
      `Generated ${label} source drift detected. Run \`pnpm --filter @workspace/api-spec run codegen\` and commit the generated files.`,
    );
  }
}

function readOpenApiPropertyMaxLength(spec, schemaName, propertyName) {
  const lines = spec.split("\n");
  const schemaLine = lines.findIndex((line) => line === `    ${schemaName}:`);
  if (schemaLine === -1) {
    fail(
      `Source limit validation could not find OpenAPI schema ${schemaName}.`,
    );
  }

  const schemaEnd = lines.findIndex(
    (line, index) =>
      index > schemaLine && /^    [A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line),
  );
  const end = schemaEnd === -1 ? lines.length : schemaEnd;
  const propertyLine = lines.findIndex(
    (line, index) => index > schemaLine && index < end && line === `        ${propertyName}:`,
  );
  if (propertyLine === -1) {
    fail(
      `Source limit validation could not find OpenAPI property ${schemaName}.${propertyName}.`,
    );
  }

  const propertyEnd = lines.findIndex(
    (line, index) =>
      index > propertyLine && index < end && /^        [A-Za-z][A-Za-z0-9_-]*:\s*$/.test(line),
  );
  const propertyLimitEnd = propertyEnd === -1 ? end : propertyEnd;
  const maxLengthLine = lines
    .slice(propertyLine + 1, propertyLimitEnd)
    .find((line) => /^\s+maxLength:\s*\d+\s*$/.test(line));
  const maxLength = maxLengthLine?.match(/maxLength:\s*(\d+)/)?.[1];
  if (!maxLength) {
    fail(
      `Source limit validation could not find maxLength for OpenAPI property ${schemaName}.${propertyName}.`,
    );
  }
  return Number(maxLength);
}

function readGeneratedLimit(source, exportName) {
  const escapedName = exportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = source.match(
    new RegExp(`export const ${escapedName} = (\\d+);`),
  )?.[1];
  if (!value) {
    fail(
      `Source limit validation could not find generated API export ${exportName}.`,
    );
  }
  return Number(value);
}

function readAdapterSourceLimit(source) {
  const value = source.match(
    /export const SOURCE_TEXT_MAX_BYTES\s*=\s*([\d_]+)\s*;/,
  )?.[1];
  if (!value) {
    fail(
      "Source limit validation could not find a numeric SOURCE_TEXT_MAX_BYTES in artifacts/api-server/src/routes/source-limits.ts.",
    );
  }
  return Number(value.replaceAll("_", ""));
}

function validateSourceLimitBoundary(generatedZodPath) {
  const sourceLimitPath = resolve(
    root,
    "artifacts",
    "api-server",
    "src",
    "routes",
    "source-limits.ts",
  );
  const openApiPath = resolve(root, "lib", "api-spec", "openapi.yaml");
  const adapterLimit = readAdapterSourceLimit(
    readFileSync(sourceLimitPath, "utf8"),
  );
  const openApi = readFileSync(openApiPath, "utf8");
  const openApiLimits = [
    [
      "SourceBundleFile.content (hosted, GitHub, playground, and ZIP bundles)",
      readOpenApiPropertyMaxLength(openApi, "SourceBundleFile", "content"),
    ],
    [
      "HtmlInput.html (direct analysis)",
      readOpenApiPropertyMaxLength(openApi, "HtmlInput", "html"),
    ],
    [
      "ReplitProjectInput.html (project handoff)",
      readOpenApiPropertyMaxLength(openApi, "ReplitProjectInput", "html"),
    ],
  ];
  const contractLimit = openApiLimits[0][1];
  for (const [label, limit] of openApiLimits) {
    if (limit !== contractLimit) {
      fail(
        `Source limit drift in the OpenAPI contract: ${label} is ${limit} bytes, but the shared import compatibility boundary is ${contractLimit} bytes. Update SourceBundleFile.content, HtmlInput.html, and ReplitProjectInput.html together.`,
      );
    }
  }

  const generated = readFileSync(generatedZodPath, "utf8");
  const generatedLimits = [
    [
      "analyzeHtmlBodyThreeHtmlMax",
      readGeneratedLimit(generated, "analyzeHtmlBodyThreeHtmlMax"),
    ],
    [
      "analyzeHtmlBodyThreeBundleFilesItemContentMax",
      readGeneratedLimit(
        generated,
        "analyzeHtmlBodyThreeBundleFilesItemContentMax",
      ),
    ],
    [
      "importHostedUrlResponseBundleFilesItemContentMax",
      readGeneratedLimit(
        generated,
        "importHostedUrlResponseBundleFilesItemContentMax",
      ),
    ],
    [
      "importPlaygroundResponseBundleFilesItemContentMax",
      readGeneratedLimit(
        generated,
        "importPlaygroundResponseBundleFilesItemContentMax",
      ),
    ],
    [
      "importGithubRepositoryResponseBundleFilesItemContentMax",
      readGeneratedLimit(
        generated,
        "importGithubRepositoryResponseBundleFilesItemContentMax",
      ),
    ],
    [
      "createReplitProjectBodyThreeHtmlMax",
      readGeneratedLimit(generated, "createReplitProjectBodyThreeHtmlMax"),
    ],
    [
      "createReplitProjectBodyThreeBundleFilesItemContentMax",
      readGeneratedLimit(
        generated,
        "createReplitProjectBodyThreeBundleFilesItemContentMax",
      ),
    ],
  ];
  for (const [exportName, limit] of generatedLimits) {
    if (limit !== contractLimit) {
      fail(
        `Source limit drift between OpenAPI and generated API: ${exportName} is ${limit} bytes, but the contract boundary is ${contractLimit} bytes. Regenerate API sources and update the contract or adapter together.`,
      );
    }
  }
  if (adapterLimit !== contractLimit) {
    fail(
      `Source limit drift: artifacts/api-server/src/routes/source-limits.ts uses ${adapterLimit} bytes, but the OpenAPI/generated API compatibility boundary uses ${contractLimit} bytes. Update the adapter and contract together, then regenerate with pnpm --filter @workspace/api-spec run codegen.`,
    );
  }
  console.log(
    `[api-validation] Source import compatibility boundary is synchronized at ${contractLimit} bytes across the adapter, OpenAPI, and generated API.`,
  );
}

cleanValidationOutput();
mkdirSync(validationRoot, { recursive: true });
copyFileSync(
  resolve(root, "lib", "api-client-react", "src", "custom-fetch.ts"),
  resolve(validationRoot, "custom-fetch.ts"),
);

runStep(
  "Regenerating API sources from the OpenAPI contract",
  "pnpm",
  [
    "--filter",
    "@workspace/api-spec",
    "exec",
    "orval",
    "--config",
    "./orval.config.ts",
  ],
  {
    API_CODEGEN_OUTPUT_ROOT: validationRoot,
  },
);

mkdirSync(resolve(validationRoot, "api-client-react"), { recursive: true });
copyFileSync(
  resolve(validationRoot, "custom-fetch.ts"),
  resolve(validationRoot, "api-client-react", "custom-fetch.ts"),
);
const generatedClientPath = resolve(
  validationRoot,
  "api-client-react",
  "generated",
  "api.ts",
);
writeFileSync(
  generatedClientPath,
  readFileSync(generatedClientPath, "utf8").replaceAll(
    "../../custom-fetch",
    "../custom-fetch",
  ),
);
writeFileSync(
  resolve(validationRoot, "api-client-react", "index.ts"),
  'export * from "./generated/api";\nexport * from "./generated/api.schemas";\n',
);

writeFileSync(
  resolve(validationRoot, "api-zod", "index.ts"),
  'export * from "./generated/api";\nexport * from "./generated/types";\n',
);

validateSourceLimitBoundary(
  resolve(validationRoot, "api-zod", "generated", "api.ts"),
);

runStep("Force-refreshing API Zod declarations", "pnpm", [
  "exec",
  "tsc",
  "--build",
  "--force",
  "lib/api-zod/tsconfig.validation.json",
]);

runStep("Force-refreshing React API client declarations", "pnpm", [
  "exec",
  "tsc",
  "--build",
  "--force",
  "lib/api-client-react/tsconfig.validation.json",
]);

runStep("Typechecking the API server against refreshed declarations", "pnpm", [
  "--filter",
  "@workspace/api-server",
  "exec",
  "tsc",
  "-p",
  "tsconfig.declarations.json",
  "--noEmit",
]);

runStep(
  "Typechecking HTML Port Studio against refreshed React API declarations",
  "pnpm",
  [
    "--filter",
    "@workspace/html-port-studio",
    "exec",
    "tsc",
    "-p",
    "tsconfig.declarations.json",
    "--noEmit",
  ],
);

compareGeneratedSource(
  "React client",
  "lib/api-client-react/src/generated",
  ".cache/api-validation/api-client-react/generated",
);
compareGeneratedSource(
  "Zod",
  "lib/api-zod/src/generated",
  ".cache/api-validation/api-zod/generated",
);

cleanValidationOutput();

console.log(
  "\n[api-validation] Passed: generated sources are current and API consumers typecheck against refreshed declarations.",
);
