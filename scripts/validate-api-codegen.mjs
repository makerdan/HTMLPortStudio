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
  "Typechecking Replit auth against refreshed React API declarations",
  "pnpm",
  [
    "--filter",
    "@workspace/replit-auth-web",
    "exec",
    "tsc",
    "-p",
    "tsconfig.validation.json",
    "--noEmit",
  ],
);

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
