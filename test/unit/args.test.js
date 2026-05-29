import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { parseArgs } from '../../dist/cli/args.js';

const cwd = path.resolve('/tmp/project');

test('parseArgs defaults root and supports optional validate command', () => {
  const options = parseArgs(['validate', '--schema', 'schema.json'], cwd);
  assert.equal(options.command, 'validate');
  assert.equal(options.root, cwd);
  assert.equal(options.schema, path.join(cwd, 'schema.json'));
  assert.equal(options.schemaPreset, 'backstage');
  assert.equal(options.format, 'text');
});

test('parseArgs parses alternate commands', () => {
  assert.equal(parseArgs(['check'], cwd).command, 'check');
  assert.equal(parseArgs(['graph'], cwd).command, 'graph');
  assert.equal(parseArgs(['init'], cwd).command, 'init');
});

test('parseArgs supports config and force', () => {
  const options = parseArgs(['init', '--root', 'repo', '--config', 'ciy.config.json', '--force'], cwd);
  assert.equal(options.config, path.join(cwd, 'ciy.config.json'));
  assert.equal(options.force, true);
});

test('parseArgs supports strict, json format, and fail-on-warning', () => {
  const options = parseArgs(['--schema', 'schema.json', '--strict', '--format', 'json', '--fail-on-warning'], cwd);
  assert.equal(options.strict, true);
  assert.equal(options.strictSet, true);
  assert.equal(options.failOnWarning, true);
  assert.equal(options.failOnWarningSet, true);
  assert.equal(options.format, 'json');
  assert.equal(options.formatSet, true);
});

test('parseArgs marks schema preset as explicitly set', () => {
  const options = parseArgs(['--schema-preset', 'backstage'], cwd);
  assert.equal(options.schemaPresetSet, true);
});

test('parseArgs leaves *Set flags false when defaults are used', () => {
  const options = parseArgs([], cwd);
  assert.equal(options.strictSet, false);
  assert.equal(options.formatSet, false);
  assert.equal(options.schemaPresetSet, false);
  assert.equal(options.failOnWarningSet, false);
});

test('parseArgs resolves catalog relative to root', () => {
  const options = parseArgs(['--root', 'repo', '--schema', 'schema.json', '--catalog', 'custom/catalog-info.yaml'], cwd);
  assert.equal(options.root, path.join(cwd, 'repo'));
  assert.equal(options.catalog, path.join(cwd, 'repo', 'custom/catalog-info.yaml'));
});

test('parseArgs defaults to the backstage preset when schema is omitted', () => {
  const options = parseArgs([], cwd);
  assert.equal(options.schema, undefined);
  assert.equal(options.schemaPreset, 'backstage');
});

test('parseArgs throws for unknown option', () => {
  assert.throws(() => parseArgs(['--schema', 'schema.json', '--bad'], cwd), /Unknown option/);
});

test('parseArgs parses explicit schema preset', () => {
  const options = parseArgs(['--schema-preset', 'backstage'], cwd);
  assert.equal(options.schemaPreset, 'backstage');
});

test('parseArgs throws for invalid schema preset', () => {
  assert.throws(() => parseArgs(['--schema-preset', 'unknown'], cwd), /Invalid schema preset/);
});

test('parseArgs throws for invalid format', () => {
  assert.throws(() => parseArgs(['--schema', 'schema.json', '--format', 'xml'], cwd), /Invalid format/);
});

test('parseArgs parses help, version, and force flags', () => {
  const options = parseArgs(['init', '--help', '--version', '--force'], cwd);
  assert.equal(options.help, true);
  assert.equal(options.version, true);
  assert.equal(options.force, true);
});

test('parseArgs throws for unexpected arguments and missing values', () => {
  assert.throws(() => parseArgs(['catalog-info.yaml'], cwd), /Unexpected argument/);
  assert.throws(() => parseArgs(['--schema'], cwd), /Missing value/);
  assert.throws(() => parseArgs(['--schema', '--strict'], cwd), /Missing value/);
});
