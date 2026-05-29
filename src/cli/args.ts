import path from 'node:path';
import { DEFAULT_SCHEMA_PRESET, isSchemaPreset } from '../schema/presets.js';
import type { CliOptions, Command, OutputFormat } from '../types.js';

const COMMANDS = new Set(['validate', 'check', 'graph', 'init']);
const VALUE_FLAGS = new Set(['--root', '--config', '--schema', '--schema-preset', '--catalog', '--format']);
const BOOLEAN_FLAGS = new Set(['--strict', '--fail-on-warning', '--force', '--help', '--version']);

export class UsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

export function parseArgs(argv: string[], cwd = process.cwd()): CliOptions {
  const args = [...argv];
  const command = isCommand(args[0]) ? args.shift() as Command : 'validate';
  const options: CliOptions = {
    command,
    root: cwd,
    schemaPreset: DEFAULT_SCHEMA_PRESET,
    schemaPresetSet: false,
    strict: false,
    strictSet: false,
    format: 'text',
    formatSet: false,
    failOnWarning: false,
    failOnWarningSet: false,
    force: false,
    help: false,
    version: false,
  };

  while (args.length > 0) {
    const flag = args.shift();
    if (flag === undefined) {
      break;
    }

    if (!flag.startsWith('--')) {
      throw new UsageError(`Unexpected argument: ${flag}`);
    }

    if (BOOLEAN_FLAGS.has(flag)) {
      setBooleanOption(options, flag);
      continue;
    }

    if (VALUE_FLAGS.has(flag)) {
      const value = args.shift();
      if (!value || value.startsWith('--')) {
        throw new UsageError(`Missing value for ${flag}`);
      }
      setValueOption(options, flag, value);
      continue;
    }

    throw new UsageError(`Unknown option: ${flag}`);
  }

  if (!isOutputFormat(options.format)) {
    throw new UsageError(`Invalid format: ${options.format}`);
  }

  if (!isSchemaPreset(options.schemaPreset)) {
    throw new UsageError(`Invalid schema preset: ${options.schemaPreset}`);
  }

  options.root = path.resolve(cwd, options.root);
  if (options.config) {
    options.config = path.resolve(cwd, options.config);
  }
  if (options.schema) {
    options.schema = path.resolve(cwd, options.schema);
  }
  if (options.catalog) {
    options.catalog = path.resolve(options.root, options.catalog);
  }

  return options;
}

function setBooleanOption(options: CliOptions, flag: string): void {
  switch (flag) {
    case '--strict':
      options.strict = true;
      options.strictSet = true;
      break;
    case '--fail-on-warning':
      options.failOnWarning = true;
      options.failOnWarningSet = true;
      break;
    case '--force':
      options.force = true;
      break;
    case '--help':
      options.help = true;
      break;
    case '--version':
      options.version = true;
      break;
    default:
      throw new UsageError(`Unknown option: ${flag}`);
  }
}

function setValueOption(options: CliOptions, flag: string, value: string): void {
  switch (flag) {
    case '--root':
      options.root = value;
      break;
    case '--config':
      options.config = value;
      break;
    case '--schema':
      options.schema = value;
      break;
    case '--schema-preset':
      if (!isSchemaPreset(value)) {
        throw new UsageError(`Invalid schema preset: ${value}`);
      }
      options.schemaPreset = value;
      options.schemaPresetSet = true;
      break;
    case '--catalog':
      options.catalog = value;
      break;
    case '--format':
      options.format = value as OutputFormat;
      options.formatSet = true;
      break;
    default:
      throw new UsageError(`Unknown option: ${flag}`);
  }
}

function isCommand(value: string | undefined): value is Command {
  return value !== undefined && COMMANDS.has(value);
}

function isOutputFormat(value: string): value is OutputFormat {
  return value === 'text' || value === 'json';
}
