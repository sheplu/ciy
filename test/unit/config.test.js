import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createTempRepository } from '../helpers.js';
import { applyConfig, loadConfig } from '../../dist/config.js';

test('loadConfig reads ciy.config.json', async () => {
  const root = await createTempRepository({
    'ciy.config.json': JSON.stringify({
      strict: true,
      policies: { requiredFields: ['spec.owner'] },
    }),
  });

  const config = await loadConfig(root);
  assert.equal(config.strict, true);
  assert.deepEqual(config.policies.requiredFields, ['spec.owner']);
});

test('loadConfig reads yaml config files', async () => {
  const root = await createTempRepository({
    'ciy.config.yaml': 'format: json\nfailOnWarning: true\n',
  });

  const config = await loadConfig(root);
  assert.equal(config.format, 'json');
  assert.equal(config.failOnWarning, true);
});

test('applyConfig merges config defaults and check fail-on-warning', async () => {
  const root = await createTempRepository({
    'schema.json': '{}',
    'ciy.config.json': JSON.stringify({ schema: './schema.json', strict: true }),
  });

  const options = await applyConfig({
    command: 'check',
    root,
    schemaPreset: 'backstage',
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
  });

  assert.equal(options.schema, path.join(root, 'schema.json'));
  assert.equal(options.strict, true);
  assert.equal(options.failOnWarning, true);
});

test('loadConfig supports explicit config path', async () => {
  const root = await createTempRepository({});
  const configPath = path.join(root, 'custom.json');
  await fs.writeFile(configPath, JSON.stringify({ format: 'json' }));

  const config = await loadConfig(root, configPath);
  assert.equal(config.format, 'json');
});

test('loadConfig returns empty config when no config file exists', async () => {
  const root = await createTempRepository({});
  assert.deepEqual(await loadConfig(root), {});
});

test('loadConfig normalizes all config fields', async () => {
  const root = await createTempRepository({
    'ciy.config.json': JSON.stringify({
      schema: './schema.yaml',
      schemaPreset: 'backstage',
      catalog: 'custom/catalog-info.yaml',
      strict: true,
      failOnWarning: true,
      format: 'json',
      policies: {
        requiredFields: ['metadata.name', 42],
        allowedKinds: ['Component', false],
        namePattern: '^[a-z]+$',
        ownerPattern: '^team-',
        allowedLifecycles: ['production', null],
        requiredAnnotations: ['github.com/project-slug', true],
      },
    }),
  });

  const config = await loadConfig(root);
  assert.equal(config.schema, path.join(root, 'schema.yaml'));
  assert.equal(config.schemaPreset, 'backstage');
  assert.equal(config.catalog, 'custom/catalog-info.yaml');
  assert.equal(config.strict, true);
  assert.equal(config.failOnWarning, true);
  assert.equal(config.format, 'json');
  assert.deepEqual(config.policies, {
    requiredFields: ['metadata.name'],
    allowedKinds: ['Component'],
    namePattern: '^[a-z]+$',
    ownerPattern: '^team-',
    allowedLifecycles: ['production'],
    requiredAnnotations: ['github.com/project-slug'],
  });
});

test('loadConfig rejects invalid config values', async () => {
  const nonObjectRoot = await createTempRepository({ 'ciy.config.json': '[]' });
  await assert.rejects(() => loadConfig(nonObjectRoot), /Config must be an object/);

  const invalidPresetRoot = await createTempRepository({ 'ciy.config.json': JSON.stringify({ schemaPreset: 'unknown' }) });
  await assert.rejects(() => loadConfig(invalidPresetRoot), /Invalid schema preset/);

  const invalidFormatRoot = await createTempRepository({ 'ciy.config.json': JSON.stringify({ format: 'xml' }) });
  await assert.rejects(() => loadConfig(invalidFormatRoot), /Invalid output format/);
});

test('applyConfig preserves explicit cli options over config defaults', async () => {
  const root = await createTempRepository({
    'config-schema.json': '{}',
    'cli-schema.json': '{}',
    'ciy.config.json': JSON.stringify({
      schema: './config-schema.json',
      catalog: 'config/catalog-info.yaml',
      strict: true,
      format: 'json',
      failOnWarning: true,
      policies: { requiredFields: ['metadata.name'] },
    }),
  });

  const options = await applyConfig({
    command: 'validate',
    root,
    schema: path.join(root, 'cli-schema.json'),
    schemaPreset: 'backstage',
    schemaPresetSet: true,
    catalog: path.join(root, 'cli/catalog-info.yaml'),
    strict: true,
    strictSet: true,
    format: 'json',
    formatSet: true,
    failOnWarning: false,
    failOnWarningSet: true,
    force: false,
    help: false,
    version: false,
  });

  assert.equal(options.schema, path.join(root, 'cli-schema.json'));
  assert.equal(options.catalog, path.join(root, 'cli/catalog-info.yaml'));
  assert.equal(options.strict, true);
  assert.equal(options.format, 'json');
  assert.equal(options.failOnWarning, false);
  assert.deepEqual(options.policies, { requiredFields: ['metadata.name'] });
});

test('applyConfig pulls catalog and format from config when cli omits them', async () => {
  const root = await createTempRepository({
    'ciy.config.json': JSON.stringify({
      catalog: 'custom/catalog-info.yaml',
      format: 'json',
    }),
  });

  const options = await applyConfig({
    command: 'validate',
    root,
    schemaPreset: 'backstage',
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
  });

  assert.equal(options.catalog, path.join(root, 'custom/catalog-info.yaml'));
  assert.equal(options.format, 'json');
});

test('applyConfig lets explicit cli defaults override config', async () => {
  const root = await createTempRepository({
    'ciy.config.json': JSON.stringify({
      strict: true,
      format: 'json',
      failOnWarning: true,
    }),
  });

  const options = await applyConfig({
    command: 'validate',
    root,
    schemaPreset: 'backstage',
    schemaPresetSet: false,
    strict: false,
    strictSet: true,
    format: 'text',
    formatSet: true,
    failOnWarning: false,
    failOnWarningSet: true,
    force: false,
    help: false,
    version: false,
  });

  assert.equal(options.strict, false);
  assert.equal(options.format, 'text');
  assert.equal(options.failOnWarning, false);
});
