#!/usr/bin/env npx ts-node
/**
 * update-program-set.ts
 *
 * Reads the PROGRAM config from scripts/common/config/index.ts and generates:
 *   1. scripts/common/helpers/index.ts  (created from scratch: getHelperSet + App)
 *   2. scripts/backend/app.ts           (initApp body patched in-place)
 *   3. scripts/tests/setup/app.ts       (initTestApp body patched in-place)
 *
 * Per program it expects (by convention, NAME = "badge_minter"):
 *   - IDL json:   common/schema/badge-minter/badge_minter.json, else common/schema/idl/badge_minter.json
 *   - IDL type:   common/schema/types/badge_minter.ts exporting `BadgeMinter` (else falls back to anchor `Idl`)
 *   - helper:     common/helpers/badge-minter.ts exporting `BadgeMinterHelpers`
 *
 * Usage:
 *   npx ts-node update-program-set.ts
 *   npx ts-node update-program-set.ts --dry-run   # print output, don't write
 *   npx ts-node update-program-set.ts --root <path>
 *   npx ts-node update-program-set.ts --ignore "drift pyth"
 *
 * Example:
 *   bun update-program-set --ignore "pyth drift"
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const rootFlagIdx = args.indexOf("--root");
const ROOT_OVERRIDE = rootFlagIdx !== -1 ? args[rootFlagIdx + 1] : undefined;
const ignoreFlagIdx = args.indexOf("--ignore");
const IGNORED_NAMES: Set<string> =
  ignoreFlagIdx !== -1
    ? new Set(
        args[ignoreFlagIdx + 1]
          .split(/\s+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    : new Set();

// ---------------------------------------------------------------------------
// Paths (relative to project root)
// ---------------------------------------------------------------------------

const CONFIG_PATH = ["scripts", "common", "config", "constants.ts"];
const SCHEMA_DIR = ["scripts", "common", "schema"];
const HELPERS_DIR = ["scripts", "common", "helpers"];
const BACKEND_APP_PATH = ["scripts", "backend", "app.ts"];
const TEST_APP_PATH = ["scripts", "tests", "setup", "app.ts"];

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

/** "badge_minter" → "BadgeMinter" */
function toPascalCase(snake: string): string {
  return snake
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

/** "badge_minter" → "badgeMinter" */
function toCamelCase(snake: string): string {
  const pascal = toPascalCase(snake);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** "BadgeMinter" → "badge-minter"  (for import paths) */
function toKebabCase(pascal: string): string {
  return pascal
    .replace(/([A-Z])/g, (c) => "-" + c.toLowerCase())
    .replace(/^-/, "");
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function findProjectRoot(start: string): string {
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir)
      throw new Error("Could not find project root (no package.json).");
    dir = parent;
  }
}

/** Keep each file's existing line endings (CRLF on Windows checkouts) */
function detectEol(src: string): "\r\n" | "\n" {
  return src.includes("\r\n") ? "\r\n" : "\n";
}

function withEol(text: string, eol: "\r\n" | "\n"): string {
  const lf = text.replace(/\r\n/g, "\n");
  return eol === "\n" ? lf : lf.replace(/\n/g, eol);
}

/** Generated-from-scratch file: reuse the line endings of the version on disk, if any */
function writeGenerated(filePath: string, content: string): void {
  const eol = fs.existsSync(filePath)
    ? detectEol(fs.readFileSync(filePath, "utf8"))
    : "\n";
  write(filePath, withEol(content, eol));
}

function write(filePath: string, content: string): void {
  if (DRY_RUN) {
    console.log(
      `\n${"=".repeat(72)}\nDRY-RUN → ${filePath}\n${"=".repeat(72)}`
    );
    console.log(content);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✔  wrote ${filePath}`);
}

// ---------------------------------------------------------------------------
// Parse PROGRAM config
// ---------------------------------------------------------------------------

interface ProgramEntry {
  key: string; // "BADGE_MINTER"
  name: string; // "badge_minter"
  pascal: string; // "BadgeMinter"
  camel: string; // "badgeMinter"
  kebab: string; // "badge-minter"
}

function parseProgramConfig(configPath: string): ProgramEntry[] {
  const src = fs.readFileSync(configPath, "utf8");

  const startMatch = src.match(/export\s+const\s+PROGRAM\s*=\s*\{/);
  if (!startMatch || startMatch.index === undefined) {
    throw new Error(
      `Could not find 'export const PROGRAM = {' in ${configPath}`
    );
  }

  // Brace-depth walk to extract the full PROGRAM block
  let depth = 0;
  const blockStart = startMatch.index + startMatch[0].length - 1;
  let blockEnd = -1;
  for (let i = blockStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
    }
  }
  if (blockEnd === -1) throw new Error("Unmatched braces in PROGRAM config.");

  const block = src.slice(blockStart, blockEnd + 1);
  const entryRe = /(\w+)\s*:\s*\{[^}]*NAME\s*:\s*["']([^"']+)["']/g;
  const entries: ProgramEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    const key = m[1];
    const name = m[2];
    const pascal = toPascalCase(name);
    const camel = toCamelCase(name);
    entries.push({ key, name, pascal, camel, kebab: toKebabCase(pascal) });
  }

  if (entries.length === 0)
    throw new Error("No entries found in PROGRAM config.");
  return entries;
}

// ---------------------------------------------------------------------------
// IDL resolution (import paths are relative to common/helpers/index.ts)
// ---------------------------------------------------------------------------

/** Per-program schema folder if it exists on disk, else the shared "idl" folder. */
function resolveIdlImportPath(root: string, p: ProgramEntry): string {
  const perProgramAbs = path.join(
    root,
    ...SCHEMA_DIR,
    p.kebab,
    `${p.name}.json`
  );
  if (fs.existsSync(perProgramAbs)) {
    return `../schema/${p.kebab}/${p.name}.json`;
  }
  return `../schema/idl/${p.name}.json`;
}

/** Anchor-generated IDL type (`export type BadgeMinter = {...}`), or null to fall back to `Idl`. */
function resolveIdlTypeImportPath(
  root: string,
  p: ProgramEntry
): string | null {
  const typeAbs = path.join(root, ...SCHEMA_DIR, "types", `${p.name}.ts`);
  return fs.existsSync(typeAbs) ? `../schema/types/${p.name}` : null;
}

// ---------------------------------------------------------------------------
// Constructor-dependency detection — reads each program's helper file and
// looks for extra `Program<...>`-typed constructor params that reference
// *another* program (matched by "<camel>Program" naming convention).
// ---------------------------------------------------------------------------

function helperPath(root: string, p: ProgramEntry): string {
  return path.join(root, ...HELPERS_DIR, `${p.kebab}.ts`);
}

function getExtraConstructorDeps(
  root: string,
  entry: ProgramEntry,
  allPrograms: ProgramEntry[]
): ProgramEntry[] {
  const file = helperPath(root, entry);
  if (!fs.existsSync(file)) return [];

  const src = fs.readFileSync(file, "utf8");
  const ctorRe = new RegExp(
    `class\\s+${entry.pascal}Helpers\\b[\\s\\S]*?constructor\\s*\\(([\\s\\S]*?)\\)\\s*\\{`
  );
  const ctorMatch = src.match(ctorRe);
  if (!ctorMatch) return [];

  const paramsSrc = ctorMatch[1];
  const paramRe = /(\w+)\s*:\s*(?:[\w.]+\.)?Program</g;
  const deps: ProgramEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = paramRe.exec(paramsSrc)) !== null) {
    const paramName = m[1];
    const match = allPrograms.find(
      (p) => `${p.camel}Program` === paramName && p.name !== entry.name
    );
    if (match && !deps.some((d) => d.name === match.name)) {
      deps.push(match);
    }
  }
  return deps;
}

// ---------------------------------------------------------------------------
// Prepare-function detection — scans tests/setup/app.ts for
// `export async function prepare*(...)` whose params can all be resolved
// against the provider / ChainHelpers / a known Helper class.
// ---------------------------------------------------------------------------

interface PrepareCall {
  functionName: string;
  args: string[];
}

function detectPrepareCalls(
  src: string,
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[]
): PrepareCall[] {
  const classToVar = new Map<string, string>();
  for (const p of [...programs, ...ignoredPrograms]) {
    classToVar.set(`${p.pascal}Helpers`, p.camel);
  }

  const fnRe = /export\s+async\s+function\s+(prepare\w+)\s*\(([^)]*)\)/g;
  const calls: PrepareCall[] = [];
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(src)) !== null) {
    const fnName = m[1];
    const rawParams = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const callArgs: string[] = [];
    let resolved = true;

    for (const param of rawParams) {
      const colonIdx = param.indexOf(":");
      if (colonIdx === -1) {
        resolved = false;
        break;
      }
      const ptype = param
        .slice(colonIdx + 1)
        .trim()
        .replace(/=.*$/, "")
        .trim();

      if (/^(LiteSvmProvider|IBlockchainProvider)\b/.test(ptype)) {
        callArgs.push("provider");
      } else if (/^ChainHelpers\b/.test(ptype)) {
        callArgs.push("chain");
      } else {
        const varName = classToVar.get(ptype);
        if (!varName) {
          resolved = false;
          break;
        }
        callArgs.push(varName);
      }
    }

    if (resolved && callArgs.length === rawParams.length) {
      calls.push({ functionName: fnName, args: callArgs });
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Generator: scripts/common/helpers/index.ts
// ---------------------------------------------------------------------------

function generateHelpersIndexTs(
  root: string,
  allPrograms: ProgramEntry[],
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[]
): string {
  // programs        = non-ignored (fully generated: IDL + Program + helper)
  // ignoredPrograms = ignored (partial — helper only, provider-only ctor)
  const allHelpers = [...ignoredPrograms, ...programs];

  for (const p of allHelpers) {
    if (!fs.existsSync(helperPath(root, p))) {
      console.warn(
        `⚠  ${helperPath(root, p)} not found – ${
          p.pascal
        }Helpers import will fail.`
      );
    }
  }

  const idlTypes = new Map(
    programs.map((p) => [p.name, resolveIdlTypeImportPath(root, p)])
  );
  const needsGenericIdl = programs.some((p) => !idlTypes.get(p.name));
  const typeOf = (p: ProgramEntry) => (idlTypes.get(p.name) ? p.pascal : "Idl");

  const anchorImport = needsGenericIdl
    ? `import type { AnchorProvider, Idl } from "@coral-xyz/anchor";`
    : `import type { AnchorProvider } from "@coral-xyz/anchor";`;

  const programImports = programs
    .flatMap((p) => {
      const typePath = idlTypes.get(p.name);
      return [
        `import ${p.pascal}Idl from "${resolveIdlImportPath(root, p)}";`,
        ...(typePath
          ? [`import type { ${p.pascal} } from "${typePath}";`]
          : []),
      ];
    })
    .join("\n");

  const helperImports = allHelpers
    .map((p) => `import { ${p.pascal}Helpers } from "./${p.kebab}";`)
    .join("\n");

  const helperExports = ["base", "chain", ...allHelpers.map((p) => p.kebab)]
    .map((x) => `export * from "./${x}";`)
    .join("\n");

  const appFields = allHelpers
    .map((p) => `  ${p.camel}: ${p.pascal}Helpers;`)
    .join("\n");

  const programGetters = programs
    .map((p) => {
      const t = typeOf(p);
      const cast = t === "Idl" ? `as unknown as Idl` : `as ${t}`;
      return `  const ${p.camel}Program = getProgram<${t}>(anchorProvider, ${p.pascal}Idl ${cast});`;
    })
    .join("\n");

  // Extra cross-program constructor deps, detected from each helper's source.
  const helperInits = [
    ...ignoredPrograms.map(
      (p) => `    ${p.camel}: new ${p.pascal}Helpers(provider),`
    ),
    ...programs.map((p) => {
      const deps = getExtraConstructorDeps(root, p, allPrograms).filter((d) =>
        programs.some((pp) => pp.name === d.name)
      );
      const extraArgs = deps.map((d) => `, ${d.camel}Program as any`).join("");
      return `    ${p.camel}: new ${p.pascal}Helpers(provider, ${p.camel}Program${extraArgs}),`;
    }),
  ].join("\n");

  return `// Wires helpers for a provider.
// @generated by scripts/backend/update-program-set.ts from PROGRAM in common/config — do not edit.
${anchorImport}
import type { PublicKey } from "@solana/web3.js";
import type { AppToken } from "../config";
import type { IBlockchainProvider } from "../provider/interface";
import { getProgram } from "../utils";
${programImports}
import { ChainHelpers } from "./chain";
${helperImports}

${helperExports}

export interface App {
  provider: IBlockchainProvider;
  chain: ChainHelpers;
${appFields}
  token: Record<AppToken, PublicKey>;
}

/**
 * \`anchorProvider\` only builds ixs and decodes accounts —
 * pass readonlyAnchorProvider(...) so it can't sign anything.
 */
export function getHelperSet(provider: IBlockchainProvider, anchorProvider: AnchorProvider) {
${programGetters}

  return {
    chain: new ChainHelpers(provider),
${helperInits}
  };
}
`;
}

// ---------------------------------------------------------------------------
// Patchers: rewrite a function body between its @generated markers
//   scripts/backend/app.ts       → initApp
//   scripts/tests/setup/app.ts   → initTestApp
// ---------------------------------------------------------------------------

const startTag = (fnName: string) => `// @generated:start:${fnName}-body`;
const endTag = (fnName: string) => `// @generated:end:${fnName}-body`;

/** Same order as the getHelperSet return */
function getHelperVars(
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[]
): string[] {
  return [
    "chain",
    ...ignoredPrograms.map((p) => p.camel),
    ...programs.map((p) => p.camel),
  ];
}

function buildInitAppBody(
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[]
): string {
  const helperVars = getHelperVars(programs, ignoredPrograms);

  // one line while it fits (matches the hand-written file), else one field per line
  const fields = [
    "provider",
    ...helperVars,
    "token: getTokenPubkeySet(cluster)",
  ];
  const oneLine = `  return { ${fields.join(", ")} };`;
  const returnLines =
    oneLine.length <= 100
      ? [oneLine]
      : [`  return {`, ...fields.map((x) => `    ${x},`), `  };`];

  return [
    `  ${startTag("initApp")}`,
    `  const signer = admin ? toTxSigner(admin) : await loadAdminSigner();`,
    `  const connection = new Connection(getRpc(cluster), COMMITMENT);`,
    `  const provider = new RpcProvider(connection, signer, cluster);`,
    ``,
    `  const { ${helperVars.join(", ")} } = getHelperSet(`,
    `    provider,`,
    `    readonlyAnchorProvider(connection, signer.publicKey)`,
    `  );`,
    ``,
    ...returnLines,
    `  ${endTag("initApp")}`,
  ].join("\n");
}

function buildInitTestAppBody(
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[],
  prepareCalls: PrepareCall[]
): string {
  const helperVars = getHelperVars(programs, ignoredPrograms);

  const returnFields = helperVars.map((x) => `    ${x},`);

  const prepareLines = prepareCalls.map(
    (c) => `  await ${c.functionName}(${c.args.join(", ")});`
  );

  return [
    `  ${startTag("initTestApp")}`,
    `  const CLUSTER = Cluster.Localnet;`,
    ``,
    `  const signer = toTxSigner(admin);`,
    `  const provider = new LiteSvmProvider(signer);`,
    `  const connection = new Connection(getRpc(CLUSTER));`,
    `  const { ${helperVars.join(", ")} } = getHelperSet(`,
    `    provider,`,
    `    readonlyAnchorProvider(connection, signer.publicKey)`,
    `  );`,
    ``,
    `  await initEnvWithBalances(provider, chain, programsToMigrate);`,
    ...prepareLines,
    ``,
    `  return {`,
    `    provider,`,
    ...returnFields,
    `    token: getTokenPubkeySet(CLUSTER),`,
    `  };`,
    `  ${endTag("initTestApp")}`,
  ].join("\n");
}

function findFunctionBodyRange(
  src: string,
  fnName: string
): [number, number] | null {
  const sigRe = new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\(`);
  const sigMatch = src.match(sigRe);
  if (!sigMatch || sigMatch.index === undefined) return null;

  let i = sigMatch.index + sigMatch[0].length - 1; // at the '('
  let depth = 0;

  // Skip parameter list
  while (i < src.length) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
    i++;
  }

  // Advance to the opening '{' of the function body (skips the return type)
  while (i < src.length && src[i] !== "{") i++;
  if (i >= src.length) return null;

  const bodyOpen = i;
  depth = 1;
  i++;

  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return [bodyOpen, i];
    }
    i++;
  }
  return null;
}

/** Replaces the code between fnName's markers; without markers, replaces the whole body. */
function patchFunctionBody(
  src: string,
  fnName: string,
  body: string,
  fileLabel: string
): string {
  const START_TAG = startTag(fnName);
  const END_TAG = endTag(fnName);
  const eol = detectEol(src);
  const newBody = withEol(body, eol);

  const startIdx = src.indexOf(START_TAG);
  const endIdx = src.indexOf(END_TAG);

  if (startIdx !== -1 && endIdx !== -1) {
    const lineStart = src.lastIndexOf("\n", startIdx) + 1;
    let lineEnd = src.indexOf("\n", endIdx + END_TAG.length);
    if (lineEnd > 0 && src[lineEnd - 1] === "\r") lineEnd--; // keep the CR of CRLF
    const tail = lineEnd === -1 ? "" : src.slice(lineEnd);
    return src.slice(0, lineStart) + newBody + tail;
  }

  const range = findFunctionBodyRange(src, fnName);
  if (!range) {
    console.warn(
      `⚠  Could not locate ${fnName} in ${fileLabel} – skipping patch.\n` +
        `   Place these markers inside the function body and re-run:\n\n` +
        `   ${START_TAG}\n   ${END_TAG}\n`
    );
    return src;
  }

  const [bodyOpen, bodyClose] = range;
  return (
    src.slice(0, bodyOpen + 1) + eol + newBody + eol + src.slice(bodyClose)
  );
}

function patchFile(filePath: string, patch: (src: string) => string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠  ${filePath} not found – skipping.`);
    return;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const patched = patch(original);
  if (patched !== original) {
    write(filePath, patched);
  } else {
    console.log(`ℹ  ${filePath} unchanged.`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const root = ROOT_OVERRIDE ?? findProjectRoot(__dirname);
  console.log(`Project root: ${root}`);

  const configPath = path.join(root, ...CONFIG_PATH);
  if (!fs.existsSync(configPath))
    throw new Error(`Config not found: ${configPath}`);

  const allPrograms = parseProgramConfig(configPath);

  // split once, reuse everywhere
  const ignoredPrograms = allPrograms.filter((p) =>
    IGNORED_NAMES.has(p.name.toLowerCase())
  );
  const programs = allPrograms.filter(
    (p) => !IGNORED_NAMES.has(p.name.toLowerCase())
  );

  if (ignoredPrograms.length) {
    console.log(`Ignoring: ${ignoredPrograms.map((p) => p.pascal).join(", ")}`);
  }
  console.log(`Programs: ${programs.map((p) => p.pascal).join(", ")}`);

  // 1. scripts/common/helpers/index.ts
  writeGenerated(
    path.join(root, ...HELPERS_DIR, "index.ts"),
    generateHelpersIndexTs(root, allPrograms, programs, ignoredPrograms)
  );

  // 2. scripts/backend/app.ts  (initApp body only)
  patchFile(path.join(root, ...BACKEND_APP_PATH), (src) =>
    patchFunctionBody(
      src,
      "initApp",
      buildInitAppBody(programs, ignoredPrograms),
      "backend/app.ts"
    )
  );

  // 3. scripts/tests/setup/app.ts  (initTestApp body only)
  patchFile(path.join(root, ...TEST_APP_PATH), (src) => {
    const prepareCalls = detectPrepareCalls(src, programs, ignoredPrograms);
    if (prepareCalls.length) {
      console.log(
        `Detected prepare-functions: ${prepareCalls
          .map((c) => c.functionName)
          .join(", ")}`
      );
    }
    return patchFunctionBody(
      src,
      "initTestApp",
      buildInitTestAppBody(programs, ignoredPrograms, prepareCalls),
      "tests/setup/app.ts"
    );
  });
}

main();
