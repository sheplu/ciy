import path from 'node:path';
import { isSchemaPreset } from './schema/presets.js';
import { pathExists } from './fs/walk.js';
import { loadDataFile } from './yaml.js';
import type { CiyConfig, CliOptions, JsonObject, JsonValue, OutputFormat, PolicyConfig, SchemaPreset } from './types.js';

const CONFIG_FILES = ['ciy.config.json', 'ciy.config.yaml', 'ciy.config.yml'];

export async function loadConfig(root: string, explicitConfig?: string): Promise<CiyConfig> {
  const configPath = explicitConfig ?? await findConfig(root);
  if (!configPath) {
    return {};
  }

  const loaded = await loadDataFile(configPath);
  if (!isObject(loaded)) {
    throw new Error(`Config must be an object: ${configPath}`);
  }

  return normalizeConfig(loaded, path.dirname(configPath));
}

export async function applyConfig(options: CliOptions): Promise<CliOptions> {
  const config = await loadConfig(options.root, options.config);
  const merged: CliOptions = { ...options };

  if (config.schema && options.schema === undefined) {
    merged.schema = config.schema;
  }
  if (config.schemaPreset && !options.schemaPresetSet) {
    merged.schemaPreset = config.schemaPreset;
  }
  if (config.catalog && options.catalog === undefined) {
    merged.catalog = path.resolve(options.root, config.catalog);
  }
  if (typeof config.strict === 'boolean' && !options.strictSet) {
    merged.strict = config.strict;
  }
  if (config.format && !options.formatSet) {
    merged.format = config.format;
  }
  if (typeof config.failOnWarning === 'boolean' && !options.failOnWarningSet) {
    merged.failOnWarning = config.failOnWarning;
  }
  if (config.policies) {
    merged.policies = config.policies;
  }

  if (options.command === 'check' && !options.failOnWarningSet && config.failOnWarning === undefined) {
    merged.failOnWarning = true;
  }

  return merged;
}

async function findConfig(root: string): Promise<string | undefined> {
  for (const file of CONFIG_FILES) {
    const configPath = path.join(root, file);
    if (await pathExists(configPath)) {
      return configPath;
    }
  }
  return undefined;
}

function normalizeConfig(config: JsonObject, configDirectory: string): CiyConfig {
  const normalized: CiyConfig = {};

  if (typeof config.schema === 'string') {
    normalized.schema = path.resolve(configDirectory, config.schema);
  }
  if (typeof config.schemaPreset === 'string') {
    if (!isSchemaPreset(config.schemaPreset)) {
      throw new Error(`Invalid schema preset in config: ${config.schemaPreset}`);
    }
    normalized.schemaPreset = config.schemaPreset as SchemaPreset;
  }
  if (typeof config.catalog === 'string') {
    normalized.catalog = config.catalog;
  }
  if (typeof config.strict === 'boolean') {
    normalized.strict = config.strict;
  }
  if (typeof config.failOnWarning === 'boolean') {
    normalized.failOnWarning = config.failOnWarning;
  }
  if (typeof config.format === 'string') {
    if (!isOutputFormat(config.format)) {
      throw new Error(`Invalid output format in config: ${config.format}`);
    }
    normalized.format = config.format;
  }
  if (isObject(config.policies)) {
    normalized.policies = normalizePolicies(config.policies);
  }

  return normalized;
}

function normalizePolicies(policies: JsonObject): PolicyConfig {
  const normalized: PolicyConfig = {};

  const requiredFields = stringArray(policies.requiredFields);
  if (requiredFields) {
    normalized.requiredFields = requiredFields;
  }
  const allowedKinds = stringArray(policies.allowedKinds);
  if (allowedKinds) {
    normalized.allowedKinds = allowedKinds;
  }
  if (typeof policies.namePattern === 'string') {
    normalized.namePattern = policies.namePattern;
  }
  if (typeof policies.ownerPattern === 'string') {
    normalized.ownerPattern = policies.ownerPattern;
  }
  const allowedLifecycles = stringArray(policies.allowedLifecycles);
  if (allowedLifecycles) {
    normalized.allowedLifecycles = allowedLifecycles;
  }
  const requiredAnnotations = stringArray(policies.requiredAnnotations);
  if (requiredAnnotations) {
    normalized.requiredAnnotations = requiredAnnotations;
  }

  return normalized;
}

function stringArray(value: JsonValue | undefined): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function isOutputFormat(value: string): value is OutputFormat {
  return value === 'text' || value === 'json';
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
}
