#!/usr/bin/env npx ts-node
/**
 * update-program-set.ts
 *
 * Reads the PROGRAM config from scripts/common/index.ts and generates:
 *   1. scripts/backend/idl.ts           (created from scratch)
 *   2. scripts/common/account/index.ts  (created from scratch)
 *   3. tests/litesvm-suite.ts           (initApp body patched in-place)
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
  let blockStart = startMatch.index + startMatch[0].length - 1;
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
// IDL path resolution — checks disk for a per-program schema folder,
// falls back to the shared "idl" folder otherwise.
// ---------------------------------------------------------------------------

function resolveIdlImportPath(root: string, p: ProgramEntry): string {
  const perProgramAbs = path.join(
    root,
    "scripts",
    "common",
    "schema",
    p.kebab,
    `${p.name}.json`
  );
  if (fs.existsSync(perProgramAbs)) {
    return `../common/schema/${p.kebab}/${p.name}.json`;
  }
  return `../common/schema/idl/${p.name}.json`;
}

// ---------------------------------------------------------------------------
// Constructor-dependency detection — reads each program's helper file and
// looks for extra `Program<...>`-typed constructor params that reference
// *another* program (matched by "<camel>Program" naming convention).
// ---------------------------------------------------------------------------

function getExtraConstructorDeps(
  root: string,
  entry: ProgramEntry,
  allPrograms: ProgramEntry[]
): ProgramEntry[] {
  const helperPath = path.join(
    root,
    "scripts",
    "common",
    "account",
    `${entry.kebab}.ts`
  );
  if (!fs.existsSync(helperPath)) return [];

  const src = fs.readFileSync(helperPath, "utf8");
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
// Prepare-function detection — scans tests/litesvm-suite.ts for
// `export async function prepare*(...)` whose params can all be resolved
// against the provider / ChainHelpers / a known Helper class.
// ---------------------------------------------------------------------------

interface PrepareCall {
  functionName: string;
  args: string[];
}

function detectPrepareCalls(
  litesvmSrc: string,
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
  while ((m = fnRe.exec(litesvmSrc)) !== null) {
    const fnName = m[1];
    const rawParams = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const args: string[] = [];
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
        args.push("provider");
      } else if (/^ChainHelpers\b/.test(ptype)) {
        args.push("chain");
      } else {
        const varName = classToVar.get(ptype);
        if (!varName) {
          resolved = false;
          break;
        }
        args.push(varName);
      }
    }

    if (resolved && args.length === rawParams.length) {
      calls.push({ functionName: fnName, args });
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Generator: scripts/backend/idl.ts
// ---------------------------------------------------------------------------

function generateIdlTs(programs: ProgramEntry[], root: string): string {
  const imports = programs
    .map(
      (p) => `import ${p.pascal}Idl from "${resolveIdlImportPath(root, p)}";`
    )
    .join("\n");
  const fields = programs.map((p) => `${p.pascal}Idl`).join(", ");
  return `${imports}\n\nexport function loadIdl() {\n  return { ${fields} };\n}\n`;
}

// ---------------------------------------------------------------------------
// Generator: scripts/common/account/index.ts
// ---------------------------------------------------------------------------

function generateAccountIndexTs(
  root: string,
  allPrograms: ProgramEntry[],
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[]
): string {
  // programs        = non-ignored (fully generated)
  // ignoredPrograms = ignored (partial — helpers only, provider-only ctor)

  const allHelperImports = [...programs, ...ignoredPrograms]
    .map((p) => `import { ${p.pascal}Helpers } from "./${p.kebab}";`)
    .join("\n");

  const generics = programs
    .map((p) => `IDL_${p.key} extends Idl`)
    .join(",\n  ");
  const genericList = programs.map((p) => `IDL_${p.key}`).join(", ");
  const idlParams = programs.map((p) => `  ${p.pascal}Idl: any`).join(",\n");
  const programGetters = programs
    .map(
      (p) =>
        `  const ${p.camel}Program = getProgram<IDL_${p.key}>(anchorProvider, ${p.pascal}Idl);`
    )
    .join("\n");
  const programReturn = programs.map((p) => `${p.camel}Program`).join(", ");

  const helperParams = programs
    .map((p) => `  ${p.camel}Program: Program<IDL_${p.key}>`)
    .join(",\n");

  // Extra cross-program constructor deps, detected from each helper's source.
  const extraDepsByProgram = new Map<string, ProgramEntry[]>();
  for (const p of programs) {
    const deps = getExtraConstructorDeps(root, p, allPrograms).filter((d) =>
      programs.some((pp) => pp.name === d.name)
    );
    extraDepsByProgram.set(p.name, deps);
  }

  // ignored helpers: provider only; regular helpers: provider + own program (+ extra deps)
  const helperInits = [
    ...ignoredPrograms.map(
      (p) => `  const ${p.camel} = new ${p.pascal}Helpers(provider);`
    ),
    ...programs.map((p) => {
      const deps = extraDepsByProgram.get(p.name) ?? [];
      const extraArgs = deps.map((d) => `, ${d.camel}Program as any`).join("");
      return `  const ${p.camel} = new ${p.pascal}Helpers(provider, ${p.camel}Program as any${extraArgs});`;
    }),
  ].join("\n");

  const helperReturn = [
    "chain",
    ...ignoredPrograms.map((p) => p.camel),
    ...programs.map((p) => p.camel),
  ].join(",\n    ");

  const idlPassthrough = programs.map((p) => `    ${p.pascal}Idl`).join(",\n");
  const progDestructure = programs.map((p) => `${p.camel}Program`).join(", ");
  const progPassthrough = programs
    .map((p) => `    ${p.camel}Program`)
    .join(",\n");

  const appFields = [
    ...ignoredPrograms.map((p) => `  ${p.camel}: ${p.pascal}Helpers;`),
    ...programs.map((p) => `  ${p.camel}: ${p.pascal}Helpers;`),
  ].join("\n");

  return `import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { IBlockchainProvider } from "./provider";
import { getProgram } from "../utils";
import { AppToken, getTokenPubkeySet } from "../config";
import { ChainHelpers } from "./chain";
${allHelperImports}

function getProgramSet<
  ${generics}
>(
  anchorProvider: AnchorProvider,
${idlParams}
) {
${programGetters}

  return { ${programReturn} };
}

function getHelperSetInternal<
  ${generics}
>(
  provider: IBlockchainProvider,
${helperParams}
) {
  const chain = new ChainHelpers(provider);
${helperInits}

  return {
    ${helperReturn},
  };
}

export function getHelperSet<
  ${generics}
>(
  provider: IBlockchainProvider,
  anchorProvider: AnchorProvider,
${idlParams}
) {
  const { ${progDestructure} } = getProgramSet<${genericList}>(
    anchorProvider,
${idlPassthrough}
  );

  return getHelperSetInternal(
    provider,
${progPassthrough}
  );
}

export interface App {
  provider: IBlockchainProvider;
  chain: ChainHelpers;
${appFields}
  token: ReturnType<typeof getTokenPubkeySet>;
}
`;
}

// ---------------------------------------------------------------------------
// Patcher: tests/litesvm-suite.ts  –  rewrites the initApp body atomically
// ---------------------------------------------------------------------------

const START_TAG = "// @generated:start:initApp-body";
const END_TAG = "// @generated:end:initApp-body";

function buildInitAppBody(
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[],
  prepareCalls: PrepareCall[]
): string {
  const idlNames = programs.map((p) => `${p.pascal}Idl`).join(", ");

  // ignored come first in destructure, matching getHelperSetInternal return order
  const helperDestructure = [
    "chain",
    ...ignoredPrograms.map((p) => p.camel),
    ...programs.map((p) => p.camel),
  ].join(", ");

  const idlArgs = programs.map((p) => `    ${p.pascal}Idl`).join(",\n");

  const returnFields = [
    ...ignoredPrograms.map((p) => `    ${p.camel},`),
    ...programs.map((p) => `    ${p.camel},`),
  ].join("\n");

  const prepareLines = prepareCalls
    .map((c) => `      await ${c.functionName}(${c.args.join(", ")});`)
    .join("\n");

  return [
    `  ${START_TAG}`,
    `  const { ${idlNames} } = loadIdl();`,
    `  const anchorProvider = getAnchorProvider(cluster, adminKeypair);`,
    `  const provider =`,
    `    cluster === Cluster.Localnet`,
    `      ? getLiteSvmProvider(adminKeypair)`,
    `      : createProvider({ type: "real", provider: anchorProvider });`,
    ``,
    `  const { ${helperDestructure} } = getHelperSet(`,
    `    provider,`,
    `    anchorProvider,`,
    idlArgs,
    `  );`,
    ``,
    `  if (provider instanceof LiteSvmProvider) {`,
    `    try {`,
    `      await initEnvWithBalances(provider, chain, programsToMigrate);`,
    prepareLines,
    `    } catch (e) {`,
    `      li(e);`,
    `    }`,
    `  }`,
    ``,
    `  return {`,
    `    provider: provider as IBlockchainProvider,`,
    `    chain,`,
    returnFields,
    `    token: getTokenPubkeySet(cluster),`,
    `  };`,
    `  ${END_TAG}`,
  ].join("\n");
}

function findInitAppBodyRange(src: string): [number, number] | null {
  const sigRe = /export\s+async\s+function\s+initApp\s*\(/;
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

  // Advance to the opening '{' of the function body
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

function patchInitApp(
  src: string,
  programs: ProgramEntry[],
  ignoredPrograms: ProgramEntry[],
  prepareCalls: PrepareCall[]
): string {
  const newBody = buildInitAppBody(programs, ignoredPrograms, prepareCalls);

  const startIdx = src.indexOf(START_TAG);
  const endIdx = src.indexOf(END_TAG);

  if (startIdx !== -1 && endIdx !== -1) {
    const lineStart = src.lastIndexOf("\n", startIdx) + 1;
    const lineEnd = src.indexOf("\n", endIdx + END_TAG.length);
    const tail = lineEnd === -1 ? "" : src.slice(lineEnd);
    return src.slice(0, lineStart) + newBody + tail;
  }

  const range = findInitAppBodyRange(src);
  if (!range) {
    console.warn(
      `⚠  Could not locate initApp in litesvm-suite.ts – skipping patch.\n` +
        `   Place these markers inside the function body and re-run:\n\n` +
        `   ${START_TAG}\n   ${END_TAG}\n`
    );
    return src;
  }

  const [bodyOpen, bodyClose] = range;
  return (
    src.slice(0, bodyOpen + 1) + "\n" + newBody + "\n" + src.slice(bodyClose)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const root = ROOT_OVERRIDE ?? findProjectRoot(__dirname);
  console.log(`Project root: ${root}`);

  const configPath = path.join(root, "scripts", "common", "config", "index.ts");
  if (!fs.existsSync(configPath))
    throw new Error(`Config not found: ${configPath}`);

  const allPrograms = parseProgramConfig(configPath);

  // split once, reuse everywhere
  const ignoredPrograms = IGNORED_NAMES.size
    ? allPrograms.filter((p) => IGNORED_NAMES.has(p.name.toLowerCase()))
    : [];
  const programs = allPrograms.filter(
    (p) => !IGNORED_NAMES.has(p.name.toLowerCase())
  );

  if (ignoredPrograms.length) {
    console.log(`Ignoring: ${ignoredPrograms.map((p) => p.pascal).join(", ")}`);
  }
  console.log(`Programs: ${programs.map((p) => p.pascal).join(", ")}`);

  // 1. scripts/backend/idl.ts
  write(
    path.join(root, "scripts", "backend", "idl.ts"),
    generateIdlTs(programs, root)
  );

  // 2. scripts/common/account/index.ts
  write(
    path.join(root, "scripts", "common", "account", "index.ts"),
    generateAccountIndexTs(root, allPrograms, programs, ignoredPrograms)
  );

  // 3. tests/litesvm-suite.ts  (initApp body only)
  const liteSvmPath = path.join(root, "tests", "litesvm-suite.ts");
  if (!fs.existsSync(liteSvmPath)) {
    console.warn(`⚠  ${liteSvmPath} not found – skipping.`);
    return;
  }
  const original = fs.readFileSync(liteSvmPath, "utf8");
  const prepareCalls = detectPrepareCalls(original, programs, ignoredPrograms);
  if (prepareCalls.length) {
    console.log(
      `Detected prepare-functions: ${prepareCalls
        .map((c) => c.functionName)
        .join(", ")}`
    );
  }
  const patched = patchInitApp(
    original,
    programs,
    ignoredPrograms,
    prepareCalls
  );
  if (patched !== original) {
    write(liteSvmPath, patched);
  } else {
    console.log("ℹ  litesvm-suite.ts unchanged.");
  }
}

main();
