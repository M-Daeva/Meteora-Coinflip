#!/usr/bin/env npx ts-node
/**
 * idl-converter.ts
 *
 * Converts an Anchor v0.29 IDL to the Anchor v0.31 IDL spec,
 * and generates a companion TypeScript type schema file.
 *
 * Requirements:
 *   npm install --save-dev ts-node typescript @types/node
 *
 *   tsconfig.json must include:  "types": ["node"]
 *
 * Usage:
 *   bun idl-converter \
 *     --input  <path-to-v029-idl.json> \
 *     --output <path-to-v031-idl.json> \
 *     --address <program-address> \
 *     [--name <override-name>] \
 *     [--version <override-version>] \
 *     [--description <description>] \
 *     [--repository <repo-url>]
 * 
 * Example:
    bun idl-converter \
      --input  scripts/common/schema/kamino-lending/kamino_lending_legacy.json \
      --output scripts/common/schema/kamino-lending/kamino_lending.json \
      --address KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD \
      --name kamino_lending \
      --version 1.17.0 \
      --description "Kamino Lending Program" \
      --repository "https://github.com/Kamino-Finance/klend"
 *
 * Outputs:
 *   <output>.json  — Anchor v0.31 IDL (snake_case names)
 *   <output>.ts    — TypeScript type schema (camelCase names)
 *
 * Key transformations
 * -------------------
 * • Top-level shape    → { address, metadata, instructions, accounts, types, events, errors }
 * • Instruction names  → snake_case  (camelCase → snake_case)
 * • Discriminators     → sha256("global:<snake_name>")[0..8]  for instructions
 *                        sha256("account:<PascalName>")[0..8] for accounts
 * • Nested account groups → flattened into the parent accounts array
 * • isMut  → writable, isSigner → signer, isOptional → optional
 * • Type mapping:
 *     publicKey            → "pubkey"
 *     { defined: "Foo" }   → { defined: { name: "Foo" } }
 *     { option: T }        → { option: convertType(T) }
 *     { coption: T }       → { coption: convertType(T) }
 *     { vec: T }           → { vec: convertType(T) }
 *     { array: [T, N] }    → { array: [convertType(T), N] }
 *     everything else      → unchanged
 * • v0.31 accounts array  → only { name, discriminator }  (type def lives in "types")
 * • events                → kept as-is (fields converted)
 * • errors                → kept as-is
 * • "returns" on instructions → dropped (not representable without PDA seeds info)
 *
 * TypeScript schema transformations
 * ----------------------------------
 * • All "name" fields → camelCase
 * • Top-level type name → PascalCase
 * • metadata.name → camelCase
 * • Exported as:  export type PascalName = { ... }
 *                 export const pascalName: PascalName = { ... } as const
 */

import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI parsing (no external deps)
// ---------------------------------------------------------------------------
function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      out[args[i].slice(2)] = args[i + 1] ?? "";
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Discriminator helpers
// ---------------------------------------------------------------------------
function sha256(data: string): Buffer {
  return crypto.createHash("sha256").update(data, "utf8").digest();
}

/** Anchor instruction discriminator: sha256("global:<snake_name>")[0..8] */
function instructionDiscriminator(snakeName: string): number[] {
  return Array.from(sha256(`global:${snakeName}`).subarray(0, 8));
}

/** Anchor account discriminator: sha256("account:<PascalName>")[0..8] */
function accountDiscriminator(pascalName: string): number[] {
  return Array.from(sha256(`account:${pascalName}`).subarray(0, 8));
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------
/** camelCase / PascalCase → snake_case */
function toSnakeCase(s: string): string {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

/** snake_case → camelCase */
function toCamelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** snake_case / camelCase → PascalCase */
function toPascalCase(s: string): string {
  const camel = toCamelCase(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// ---------------------------------------------------------------------------
// Type conversion  (v0.29 → v0.31)
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyType = any;

function convertType(t: AnyType): AnyType {
  if (t === "publicKey") return "pubkey";
  if (typeof t === "string") return t; // bool, u8, u64, string, bytes, pubkey …

  if (typeof t !== "object" || t === null) return t;

  // { defined: "FooBar" }  →  { defined: { name: "FooBar" } }
  if ("defined" in t) {
    const inner = t.defined;
    if (typeof inner === "string") {
      return { defined: { name: inner } };
    }
    // already new-style: { defined: { name, generics? } }
    return t;
  }

  if ("option" in t) return { option: convertType(t.option) };
  if ("coption" in t) return { coption: convertType(t.coption) };
  if ("vec" in t) return { vec: convertType(t.vec) };

  if ("array" in t) {
    const [elemType, size] = t.array as [AnyType, AnyType];
    return { array: [convertType(elemType), size] };
  }

  return t;
}

// ---------------------------------------------------------------------------
// Field / arg conversion
// ---------------------------------------------------------------------------
function convertField(f: AnyType): AnyType {
  return {
    name: f.name,
    ...(f.docs ? { docs: f.docs } : {}),
    type: convertType(f.type),
  };
}

// ---------------------------------------------------------------------------
// Account item conversion  (flattens nested groups)
// ---------------------------------------------------------------------------
function flattenAccounts(items: AnyType[]): AnyType[] {
  const result: AnyType[] = [];
  for (const item of items ?? []) {
    if (Array.isArray(item.accounts)) {
      // nested group → recurse and flatten
      result.push(...flattenAccounts(item.accounts));
    } else {
      const acc: AnyType = { name: item.name };
      if (item.isMut) acc.writable = true;
      if (item.isSigner) acc.signer = true;
      if (item.isOptional) acc.optional = true;
      // v0.31 has no isMut/isSigner — copy any remaining known fields
      // (address, pda) are not present in v0.29 so we skip them
      result.push(acc);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Instruction conversion
// ---------------------------------------------------------------------------
function convertInstruction(ix: AnyType): AnyType {
  const snakeName = toSnakeCase(ix.name);
  return {
    name: snakeName,
    discriminator: instructionDiscriminator(snakeName),
    accounts: flattenAccounts(ix.accounts ?? []),
    args: (ix.args ?? []).map(convertField),
    // "returns" intentionally dropped — v0.29 had minimal return type info
    // that cannot be round-tripped without source code.
  };
}

// ---------------------------------------------------------------------------
// Types conversion  (structs & enums in "types")
// ---------------------------------------------------------------------------
function convertTypesDef(td: AnyType): AnyType {
  const pascalName = toPascalCase(td.name);
  const kind = td.type?.kind;
  if (kind === "struct") {
    return {
      name: pascalName,
      ...(td.docs ? { docs: td.docs } : {}),
      type: {
        kind: "struct",
        fields: (td.type.fields ?? []).map(convertField),
      },
    };
  }
  if (kind === "enum") {
    return {
      name: pascalName,
      ...(td.docs ? { docs: td.docs } : {}),
      type: {
        kind: "enum",
        variants: (td.type.variants ?? []).map((v: AnyType) => {
          const variant: AnyType = { name: v.name };
          if (v.fields) {
            // tuple fields  [ "u8", "publicKey", … ]
            // or named fields [ { name, type }, … ]
            if (Array.isArray(v.fields)) {
              variant.fields = v.fields.map((f: AnyType) =>
                typeof f === "object" && "name" in f
                  ? convertField(f)
                  : convertType(f)
              );
            }
          }
          return variant;
        }),
      },
    };
  }
  return { ...td, name: pascalName };
}

// ---------------------------------------------------------------------------
// Accounts section  (v0.31: only name + discriminator; full def lives in types)
// ---------------------------------------------------------------------------
function convertAccountEntry(acc: AnyType): AnyType {
  const pascalName = toPascalCase(acc.name);
  return {
    name: pascalName,
    discriminator: accountDiscriminator(pascalName),
  };
}

// ---------------------------------------------------------------------------
// Events conversion
// ---------------------------------------------------------------------------
function convertEvent(ev: AnyType): AnyType {
  return {
    name: ev.name,
    ...(ev.discriminator ? { discriminator: ev.discriminator } : {}),
    fields: (ev.fields ?? []).map((f: AnyType) => ({
      name: f.name,
      type: convertType(f.type),
      index: f.index ?? false,
    })),
  };
}

// ---------------------------------------------------------------------------
// TypeScript schema generation
// ---------------------------------------------------------------------------

/** Recursively transform all "name" string values to camelCase within the IDL. */
function toCamelCaseIdl(node: AnyType): AnyType {
  if (Array.isArray(node)) {
    return node.map(toCamelCaseIdl);
  }
  if (typeof node === "object" && node !== null) {
    const result: AnyType = {};
    for (const key of Object.keys(node)) {
      const val = node[key];
      if (key === "name" && typeof val === "string") {
        // Only camelCase names that look like identifiers (not addresses/versions/specs)
        const camel = toCamelCase(val);
        result[key] = camel.charAt(0).toLowerCase() + camel.slice(1);
      } else {
        result[key] = toCamelCaseIdl(val);
      }
    }
    return result;
  }
  return node;
}

/**
 * Serialize a value to TypeScript literal syntax (pretty-printed).
 * Produces a TS "as const"-compatible literal.
 */
function serializeToTsLiteral(val: AnyType, indent: number): string {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  if (val === null) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return JSON.stringify(val);

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    const items = val.map(
      (v) => `${padInner}${serializeToTsLiteral(v, indent + 1)}`
    );
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";
    const entries = keys.map(
      (k) => `${padInner}"${k}": ${serializeToTsLiteral(val[k], indent + 1)}`
    );
    return `{\n${entries.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(val);
}

/**
 * Build the TypeScript type annotation string from an IDL type node.
 * This produces TS types that mirror the structure (for the `export type` declaration).
 */
function buildTsTypeAnnotation(val: AnyType, indent: number): string {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  if (val === null) return "null";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return "number";
  if (typeof val === "string") return `"${val}"`;

  if (Array.isArray(val)) {
    if (val.length === 0) return "readonly []";
    // Tuple if mixed types, array-like otherwise
    const items = val.map(
      (v) => `${padInner}${buildTsTypeAnnotation(v, indent + 1)}`
    );
    return `readonly [\n${items.join(",\n")}\n${pad}]`;
  }

  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "Record<string, never>";
    const entries = keys.map(
      (k) =>
        `${padInner}readonly "${k}": ${buildTsTypeAnnotation(
          val[k],
          indent + 1
        )}`
    );
    return `{\n${entries.join(",\n")}\n${pad}}`;
  }

  return `"${val}"`;
}

/**
 * Generate the TypeScript schema file content from a v0.31 IDL object.
 */
function generateTsSchema(v031: AnyType, programName: string): string {
  const camelIdl = toCamelCaseIdl(v031);
  camelIdl.metadata.name = toCamelCase(programName);

  const typeName = toPascalCase(programName);
  const constName = toCamelCase(programName);

  const literal = serializeToTsLiteral(camelIdl, 0);

  return (
    `/**\n` +
    ` * Program IDL in camelCase format in order to be used in JS/TS.\n` +
    ` *\n` +
    ` * Note that this is only a type helper and is not the actual IDL. The original\n` +
    ` * IDL can be found at \`target/idl/${programName}.json\`.\n` +
    ` */\n` +
    `export type ${typeName} = ${literal};\n\n` +
    `export const ${constName}: ${typeName} = ${literal};\n`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const args = parseArgs();

  const inputPath = args["input"];
  const outputPath = args["output"];
  const address = args["address"];

  if (!inputPath || !outputPath || !address) {
    console.error(
      "Usage: npx ts-node idl-converter.ts " +
        "--input <v029.json> --output <v031.json> --address <ProgramId> " +
        "[--name <name>] [--version <version>] [--description <desc>] [--repository <url>]"
    );
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
  const v029 = JSON.parse(raw);

  const name = args["name"] ?? toSnakeCase(v029.name ?? "unknown_program");
  const version = args["version"] ?? v029.version ?? "0.1.0";
  const description = args["description"] ?? "Converted from Anchor v0.29 IDL";
  const repository = args["repository"] ?? "";

  const metadata: AnyType = {
    name,
    version,
    spec: "0.1.0",
    description,
  };
  if (repository) metadata.repository = repository;

  // v0.31 "accounts" array = account types referenced by instructions
  // v0.29 "accounts" array holds the full struct definition
  const accountDefs: AnyType[] = (v029.accounts ?? []).map(convertAccountEntry);

  // Full struct definitions go into "types"
  const accountTypeDefs: AnyType[] = (v029.accounts ?? []).map(convertTypesDef);
  const extraTypeDefs: AnyType[] = (v029.types ?? []).map(convertTypesDef);

  // Deduplicate by name (accounts first, then types)
  const typesByName = new Map<string, AnyType>();
  for (const t of [...accountTypeDefs, ...extraTypeDefs]) {
    if (!typesByName.has(t.name)) typesByName.set(t.name, t);
  }
  const allTypes = Array.from(typesByName.values());

  const v031: AnyType = {
    address,
    metadata,
    instructions: (v029.instructions ?? []).map(convertInstruction),
    accounts: accountDefs,
    types: allTypes,
  };

  // ignore events
  // if (v029.events?.length) {
  //   v031.events = v029.events.map(convertEvent);
  // }

  if (v029.errors?.length) {
    v031.errors = v029.errors; // error format is identical
  }

  // Resolve output paths (strip .json extension if present for base path)
  const resolvedOutput = path.resolve(outputPath);
  const basePath = resolvedOutput.endsWith(".json")
    ? resolvedOutput.slice(0, -5)
    : resolvedOutput;
  const jsonOutputPath = `${basePath}.json`;
  const tsOutputPath = `${basePath}.ts`;

  const outDir = path.dirname(resolvedOutput);
  fs.mkdirSync(outDir, { recursive: true });

  // Write JSON
  fs.writeFileSync(jsonOutputPath, JSON.stringify(v031, null, 2), "utf8");

  // Write TS schema
  const tsContent = generateTsSchema(v031, name);
  fs.writeFileSync(tsOutputPath, tsContent, "utf8");

  console.log(`✅  Converted IDL written to:  ${jsonOutputPath}`);
  console.log(`✅  TypeScript schema written to: ${tsOutputPath}`);
  console.log(`    Instructions : ${v031.instructions.length}`);
  console.log(`    Accounts     : ${v031.accounts.length}`);
  console.log(`    Types        : ${v031.types.length}`);
  if (v031.events) console.log(`    Events       : ${v031.events.length}`);
  if (v031.errors) console.log(`    Errors       : ${v031.errors.length}`);
}

main();
