import ts from "typescript";
import * as path from "path";

interface TypeInfo {
  name: string;
  properties: PropertyInfo[];
  isOptional?: boolean;
}

interface PropertyInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

interface EnumInfo {
  name: string;
  /** Variant names in declaration order, e.g. ["Head", "Tail"] */
  variants: string[];
}

interface FunctionInfo {
  name: string;
  parameters: ParameterInfo[];
}

interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
}

export class AnchorTypeGenerator {
  private sourceFile: ts.SourceFile;
  private typeChecker: ts.TypeChecker;
  private program: ts.Program;
  private enumNames = new Set<string>();

  constructor(filePath: string) {
    this.program = ts.createProgram([filePath], {
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.CommonJS,
    });
    this.typeChecker = this.program.getTypeChecker();
    this.sourceFile = this.program.getSourceFile(filePath)!;
  }

  getSrcImports(types: TypeInfo[], enums: EnumInfo[]): string {
    const importPath =
      "./" + path.basename(this.sourceFile.fileName).replace(/\.ts$/, "");

    const names = [...types.map((t) => t.name), ...enums.map((e) => e.name)];

    return `import { ${names.join(", ")} } from '${importPath}';\n\n`;
  }

  generate(): string {
    const enums = this.extractEnums();
    this.enumNames = new Set(enums.map((e) => e.name));
    const types = this.extractTypes();
    const functions = this.extractFunctions();

    let output = `// Auto-generated Anchor types and converters\n`;
    output += `import * as anchor from '@coral-xyz/anchor';\n`;
    output += `import { PublicKey } from '@solana/web3.js';\n`;
    output += this.getSrcImports(types, enums);

    // Generate anchor types
    output += this.generateAnchorTypes(types, enums);

    // Generate converter functions
    output += this.generateConverters(types, functions, enums);

    return output;
  }

  private extractTypes(): TypeInfo[] {
    const types: TypeInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node) && node.name) {
        const typeInfo = this.extractTypeInfo(node);
        if (typeInfo) {
          types.push(typeInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return types;
  }

  private extractEnums(): EnumInfo[] {
    const enums: EnumInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isEnumDeclaration(node)) {
        enums.push({
          name: node.name.text,
          variants: node.members.map((m) => m.name.getText(this.sourceFile)),
        });
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return enums;
  }

  private extractFunctions(): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const functionInfo = this.extractFunctionInfo(node);
        if (functionInfo) {
          functions.push(functionInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return functions;
  }

  private extractTypeInfo(node: ts.InterfaceDeclaration): TypeInfo | null {
    const name = node.name.text;
    const properties: PropertyInfo[] = [];

    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const propInfo = this.extractPropertyInfo(member);
        if (propInfo) {
          properties.push(propInfo);
        }
      }
    }

    return { name, properties };
  }

  private extractPropertyInfo(prop: ts.PropertySignature): PropertyInfo | null {
    if (!prop.name || !ts.isIdentifier(prop.name)) return null;

    const name = prop.name.text;
    const type = this.typeChecker.getTypeAtLocation(prop);

    // Split `T | null | undefined` into T + nullability, using the source node
    // (the checker drops null/undefined when strictNullChecks is off)
    const { node: baseNode, nullable } = this.unwrapNullable(prop.type);
    const isOptional = !!prop.questionToken || nullable;

    let typeString = this.typeChecker.typeToString(
      this.typeChecker.getNonNullableType(type)
    );

    // TypeScript resolves N<64> to plain "number", so prefer the source text
    // whenever it contains N<…> (covers N<64>, N<8>[], Array<N<64>>, etc.)
    if (baseNode && /\bN<\d+>/.test(baseNode.getText())) {
      typeString = baseNode.getText();
    }

    return {
      name,
      type: typeString,
      isOptional,
      isArray: this.isArrayType(this.typeChecker.getNonNullableType(type)),
      isEnum: this.isEnumType(type),
      enumValues: this.getEnumValues(type),
    };
  }

  private unwrapNullable(node: ts.TypeNode | undefined): {
    node: ts.TypeNode | undefined;
    nullable: boolean;
  } {
    if (!node || !ts.isUnionTypeNode(node)) return { node, nullable: false };

    const isNullish = (t: ts.TypeNode) =>
      (ts.isLiteralTypeNode(t) &&
        t.literal.kind === ts.SyntaxKind.NullKeyword) ||
      t.kind === ts.SyntaxKind.UndefinedKeyword;

    const rest = node.types.filter((t) => !isNullish(t));
    const nullable = rest.length !== node.types.length;

    return { node: rest.length === 1 ? rest[0] : node, nullable };
  }

  private extractFunctionInfo(
    node: ts.FunctionDeclaration
  ): FunctionInfo | null {
    if (!node.name) return null;

    const name = node.name.text;
    const parameters: ParameterInfo[] = [];

    for (const param of node.parameters) {
      if (ts.isIdentifier(param.name)) {
        const paramName = param.name.text;
        const isOptional = !!param.questionToken;
        const type = this.typeChecker.getTypeAtLocation(param);
        const typeString = this.typeChecker.typeToString(type);

        parameters.push({
          name: paramName,
          type: typeString,
          isOptional,
        });
      }
    }

    return { name, parameters };
  }

  private isArrayType(type: ts.Type): boolean {
    return this.typeChecker.isArrayType(type);
  }

  private isArrayTypeString(type: string): boolean {
    return type.endsWith("[]") || /^Array<(.+)>$/.test(type);
  }

  private isEnumType(type: ts.Type): boolean {
    return !!(type.flags & ts.TypeFlags.EnumLike);
  }

  private getEnumValues(type: ts.Type): string[] | undefined {
    if (this.isEnumType(type)) {
      return type.symbol?.valueDeclaration &&
        ts.isEnumDeclaration(type.symbol.valueDeclaration)
        ? type.symbol.valueDeclaration.members.map((m) =>
            ts.isIdentifier(m.name) ? m.name.text : ""
          )
        : undefined;
    }
    return undefined;
  }

  private generateAnchorTypes(types: TypeInfo[], enums: EnumInfo[]): string {
    let output = `// Anchor-generated types\n`;

    for (const e of enums) {
      output += this.generateAnchorEnumType(e);
    }

    for (const type of types) {
      output += this.generateAnchorType(type);
    }

    return output + "\n";
  }

  /**
   * Anchor encodes a Rust enum variant as an object with a single camelCase
   * key: `{ head: {} }`. The enum type is the union of those shapes.
   */
  private generateAnchorEnumType(e: EnumInfo): string {
    const variants = e.variants.map((v) => `{ ${this.variantKey(v)}: {} }`);
    return `export type Anchor${e.name} =\n  | ${variants.join("\n  | ")};\n\n`;
  }

  private variantKey(variant: string): string {
    return variant.charAt(0).toLowerCase() + variant.slice(1);
  }

  private generateAnchorType(type: TypeInfo): string {
    const anchorTypeName = `Anchor${type.name}`;

    // Check if this should be a tuple type (for function arguments)
    if (type.name.endsWith("Args")) {
      return this.generateTupleType(type, anchorTypeName);
    }

    // Generate interface type
    let output = `export interface ${anchorTypeName} {\n`;

    for (const prop of type.properties) {
      const anchorType = this.convertToAnchorType(prop);
      const finalType = prop.isOptional ? `${anchorType} | null` : anchorType;
      output += `  ${prop.name}: ${finalType};\n`;
    }

    output += `}\n\n`;
    return output;
  }

  private generateTupleType(type: TypeInfo, anchorTypeName: string): string {
    const tupleTypes = type.properties.map((prop) => {
      const anchorType = this.convertToAnchorType(prop);
      return prop.isOptional ? `${anchorType} | null` : anchorType;
    });

    return `export type ${anchorTypeName} = [\n  ${tupleTypes.join(
      ",\n  "
    )}\n];\n\n`;
  }

  private convertToAnchorType(prop: PropertyInfo): string {
    const baseType = this.getBaseType(prop.type);

    // Handle arrays first, before other type conversions
    if (prop.isArray) {
      const elementType = this.extractArrayElementType(prop.type);
      const elementProp: PropertyInfo = {
        ...prop,
        type: elementType,
        isArray: this.isArrayTypeString(elementType),
      };
      const elementAnchorType = this.convertToAnchorType(elementProp);
      return `${elementAnchorType}[]`;
    }

    // Handle N<T> sized number types
    const nTypeMatch = this.extractNType(baseType);
    if (nTypeMatch) {
      const size = parseInt(nTypeMatch);
      // N<64> should be anchor.BN, smaller sizes remain number
      return size >= 64 ? "anchor.BN" : "number";
    }

    // Handle specific type conversions
    switch (baseType) {
      case "number":
        // Numbers that represent amounts/balances should be BN
        if (
          prop.name.includes("amount") ||
          prop.name.includes("balance") ||
          prop.name.includes("fee") ||
          prop.name.includes("value")
        ) {
          return "anchor.BN";
        }
        return "number";

      case "bigint":
      case "BN":
      case "anchor.BN":
        return "anchor.BN";

      case "string":
        // Strings that represent addresses should be PublicKey
        if (
          prop.name.includes("address") ||
          prop.name.includes("key") ||
          prop.name.includes("mint") ||
          prop.name.includes("account")
        ) {
          return "PublicKey";
        }
        return "string";

      case "PublicKey":
        return "PublicKey";

      case "boolean":
        return "boolean";

      default:
        // Enums and custom interfaces both get a generated Anchor* type
        if (this.enumNames.has(baseType) || this.isCustomType(baseType)) {
          return `Anchor${baseType}`;
        }

        return baseType;
    }
  }

  /**
   * Extract the size parameter from N<T> type
   * @param typeString - The type string to check
   * @returns The size as string if it's an N<T> type, null otherwise
   */
  private extractNType(typeString: string): string | null {
    const nTypeMatch = typeString.match(/^N<(\d+)>$/);
    return nTypeMatch ? nTypeMatch[1] : null;
  }

  /**
   * Check if a type is a sized number type N<T>
   * @param typeString - The type string to check
   * @returns true if it's an N<T> type
   */
  private isNType(typeString: string): boolean {
    return /^N<\d+>$/.test(typeString);
  }

  private getBaseType(typeString: string): string {
    // Remove optional markers and whitespace
    let type = typeString.replace(/\s*\|\s*(undefined|null)/g, "").trim();

    // Handle array types
    if (type.endsWith("[]")) {
      return type.slice(0, -2);
    }

    // Handle Array<T> syntax
    const arrayMatch = type.match(/^Array<(.+)>$/);
    if (arrayMatch) {
      return arrayMatch[1];
    }

    return type;
  }

  private extractArrayElementType(typeString: string): string {
    if (typeString.endsWith("[]")) {
      return typeString.slice(0, -2);
    }

    const arrayMatch = typeString.match(/^Array<(.+)>$/);
    if (arrayMatch) {
      return arrayMatch[1];
    }

    return typeString;
  }

  private isCustomType(type: string): boolean {
    const primitiveTypes = [
      "number",
      "string",
      "boolean",
      "bigint",
      "PublicKey",
      "BN",
      "anchor.BN",
    ];
    return (
      !primitiveTypes.includes(type) &&
      !type.includes("|") &&
      !type.includes("undefined") &&
      !this.isNType(type)
    );
  }

  private generateConverters(
    types: TypeInfo[],
    functions: FunctionInfo[],
    enums: EnumInfo[]
  ): string {
    let output = `// Type converters\n`;

    for (const e of enums) {
      output += this.generateEnumConverter(e);
    }

    for (const type of types) {
      output += this.generateConverter(type);
    }

    // Generate function argument converters
    for (const func of functions) {
      if (func.parameters.length > 0) {
        output += this.generateFunctionConverter(func);
      }
    }

    return output;
  }

  /**
   * Switch on the TS enum member rather than its runtime value, so this works
   * for numeric, string and explicitly-initialised enums alike.
   */
  private generateEnumConverter(e: EnumInfo): string {
    let output = `export function convert${e.name}(\n  value: ${e.name}\n): Anchor${e.name} {\n`;
    output += `  switch (value) {\n`;
    for (const v of e.variants) {
      output += `    case ${e.name}.${v}:\n      return { ${this.variantKey(
        v
      )}: {} };\n`;
    }
    output += `    default:\n      throw new Error(\`Unknown ${e.name} value: \${value}\`);\n`;
    output += `  }\n}\n\n`;
    return output;
  }

  private generateConverter(type: TypeInfo): string {
    const converterName = `convert${type.name}`;
    const anchorTypeName = `Anchor${type.name}`;

    if (type.name.endsWith("Args")) {
      return this.generateArgsConverter(type, converterName, anchorTypeName);
    }

    return this.generateObjectConverter(type, converterName, anchorTypeName);
  }

  private generateArgsConverter(
    type: TypeInfo,
    converterName: string,
    anchorTypeName: string
  ): string {
    let output = `export function ${converterName}(\n  args: ${type.name}\n): ${anchorTypeName} {\n`;

    const conversions: string[] = [];

    for (const prop of type.properties) {
      const conversion = this.generatePropertyConversion(
        prop,
        `args.${prop.name}`
      );
      conversions.push(conversion);
    }

    output += `  return [\n    ${conversions.join(",\n    ")}\n  ];\n}\n\n`;
    return output;
  }

  private generateObjectConverter(
    type: TypeInfo,
    converterName: string,
    anchorTypeName: string
  ): string {
    let output = `export function ${converterName}(\n  obj: ${type.name}\n): ${anchorTypeName} {\n`;
    output += `  return {\n`;

    for (const prop of type.properties) {
      const conversion = this.generatePropertyConversion(
        prop,
        `obj.${prop.name}`
      );
      output += `    ${prop.name}: ${conversion},\n`;
    }

    output += `  };\n}\n\n`;
    return output;
  }

  private generateFunctionConverter(func: FunctionInfo): string {
    const converterName = `convert${this.capitalize(func.name)}Args`;
    const argsTypeName = `${this.capitalize(func.name)}Args`;
    const anchorArgsTypeName = `Anchor${this.capitalize(func.name)}Args`;

    let output = `export function ${converterName}(\n  args: ${argsTypeName}\n): ${anchorArgsTypeName} {\n`;

    const conversions: string[] = [];

    for (const param of func.parameters) {
      const propInfo: PropertyInfo = {
        name: param.name,
        type: param.type,
        isOptional: param.isOptional,
        isArray: false,
        isEnum: false,
      };

      const conversion = this.generatePropertyConversion(
        propInfo,
        `args.${param.name}`
      );
      conversions.push(conversion);
    }

    output += `  return [\n    ${conversions.join(",\n    ")}\n  ];\n}\n\n`;
    return output;
  }

  private generatePropertyConversion(
    prop: PropertyInfo,
    accessor: string
  ): string {
    if (prop.isOptional) {
      const innerConversion = this.generateNonOptionalConversion(
        prop,
        accessor
      );
      return `${accessor} != null ? ${innerConversion} : null`;
    }

    return this.generateNonOptionalConversion(prop, accessor);
  }

  private generateNonOptionalConversion(
    prop: PropertyInfo,
    accessor: string
  ): string {
    const baseType = this.getBaseType(prop.type);

    // Handle arrays first
    if (prop.isArray) {
      const elementType = this.extractArrayElementType(prop.type);
      const elementProp: PropertyInfo = {
        ...prop,
        type: elementType,
        isArray: this.isArrayTypeString(elementType),
      };
      const elementConversion = this.generateNonOptionalConversion(
        elementProp,
        "item"
      );

      // If the element conversion is just 'item', we can use a direct map
      if (elementConversion === "item") {
        return accessor;
      }

      // For custom types, use the converter function name directly
      if (this.isCustomType(elementType)) {
        return `${accessor}.map(convert${elementType})`;
      }

      return `${accessor}.map(item => ${elementConversion})`;
    }

    // Handle N<T> sized number types in conversions
    const nTypeMatch = this.extractNType(baseType);
    if (nTypeMatch) {
      const size = parseInt(nTypeMatch);
      // N<64> should be converted to anchor.BN
      return size >= 64 ? `new anchor.BN(${accessor})` : accessor;
    }

    switch (baseType) {
      case "number":
        if (
          prop.name.includes("amount") ||
          prop.name.includes("balance") ||
          prop.name.includes("fee") ||
          prop.name.includes("value")
        ) {
          return `new anchor.BN(${accessor})`;
        }
        return accessor;

      case "bigint":
        return `new anchor.BN(${accessor})`;

      case "string":
        if (
          prop.name.includes("address") ||
          prop.name.includes("key") ||
          prop.name.includes("mint") ||
          prop.name.includes("account")
        ) {
          return `new PublicKey(${accessor})`;
        }
        return accessor;

      case "PublicKey":
      case "boolean":
      case "BN":
      case "anchor.BN":
        return accessor;

      default:
        // Enums and custom interfaces both get a generated convert* function
        if (this.enumNames.has(baseType) || this.isCustomType(baseType)) {
          return `convert${baseType}(${accessor})`;
        }

        return accessor;
    }
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
