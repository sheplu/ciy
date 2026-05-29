export type Command = 'validate' | 'check' | 'graph' | 'init';
export type OutputFormat = 'text' | 'json';
export type SchemaPreset = 'backstage';

export interface PolicyConfig {
  requiredFields?: string[];
  allowedKinds?: string[];
  namePattern?: string;
  ownerPattern?: string;
  allowedLifecycles?: string[];
  requiredAnnotations?: string[];
}

export interface CiyConfig {
  schema?: string;
  schemaPreset?: SchemaPreset;
  catalog?: string;
  strict?: boolean;
  format?: OutputFormat;
  failOnWarning?: boolean;
  policies?: PolicyConfig;
}

export interface CliOptions {
  command: Command;
  root: string;
  config?: string;
  schema?: string;
  schemaPreset: SchemaPreset;
  schemaPresetSet: boolean;
  catalog?: string;
  strict: boolean;
  strictSet: boolean;
  format: OutputFormat;
  formatSet: boolean;
  failOnWarning: boolean;
  failOnWarningSet: boolean;
  force: boolean;
  policies?: PolicyConfig;
  help: boolean;
  version: boolean;
}

export interface ValidationOptions {
  root: string;
  config?: string;
  schema?: string;
  schemaPreset: SchemaPreset;
  catalog?: string;
  strict: boolean;
  failOnWarning: boolean;
  policies?: PolicyConfig;
}

export interface Issue {
  file: string;
  document?: number;
  path: string;
  message: string;
}

export interface Report {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  files: string[];
}

export interface GraphNode {
  file: string;
  declared: boolean;
  exists: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  target: string;
  document: number;
  exists: boolean;
}

export interface GraphReport {
  ok: boolean;
  root: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  missing: Issue[];
  undeclared: Issue[];
  warnings: Issue[];
}

export interface InitReport {
  ok: boolean;
  created: string[];
  skipped: string[];
  errors: Issue[];
}

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface SchemaObject {
  $ref?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  enum?: JsonValue[];
  const?: JsonValue;
  additionalProperties?: boolean | SchemaObject;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  allOf?: SchemaObject[];
  definitions?: Record<string, SchemaObject>;
  [key: string]: unknown;
}

export interface SchemaValidationError {
  path: string;
  message: string;
}

export interface SchemaValidationResult {
  ok: boolean;
  errors: SchemaValidationError[];
}

export interface CatalogLink {
  file: string;
  target: string;
  document: number;
}
