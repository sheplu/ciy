import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { basicSchema, componentCatalog, createTempRepository, locationCatalog } from '../helpers.js';
import { validateCatalog } from '../../dist/catalog/validate-catalog.js';

function options(root, overrides = {}) {
  return {
    root,
    schemaPreset: 'backstage',
    strict: false,
    failOnWarning: false,
    ...overrides,
  };
}

test('validateCatalog reports missing root path and missing root catalog', async () => {
  const root = path.join(await createTempRepository({}), 'missing');
  const missingRoot = await validateCatalog(options(root));
  assert.equal(missingRoot.ok, false);
  assert.match(missingRoot.errors[0].message, /Root path does not exist/);

  await fs.mkdir(root, { recursive: true });
  const missingCatalog = await validateCatalog(options(root));
  assert.equal(missingCatalog.ok, false);
  assert.match(missingCatalog.errors[0].message, /Root catalog-info.yaml does not exist/);
});

test('validateCatalog reports missing declared targets and parses discovered catalogs', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./missing/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const report = await validateCatalog(options(root, { strict: true }));
  assert.equal(report.ok, false);
  assert.match(report.errors[0].message, /declared catalog target does not exist/);
  assert.equal(report.errors.some((error) => error.message.includes('not declared')), true);
  assert.deepEqual(report.files, ['catalog-info.yaml', 'services/api/catalog-info.yaml']);
});

test('validateCatalog fails on warnings when requested', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': componentCatalog('root'),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const report = await validateCatalog(options(root, { failOnWarning: true }));
  assert.equal(report.ok, false);
  assert.equal(report.errors.length, 0);
  assert.match(report.warnings[0].message, /not declared/);
});

test('validateCatalog reports yaml parse, schema, and policy errors', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': 'kind: [broken',
  });
  const parseReport = await validateCatalog(options(root));
  assert.equal(parseReport.ok, false);
  assert.match(parseReport.errors[0].message, /Flow sequence/);

  await fs.writeFile(path.join(root, 'catalog-info.yaml'), componentCatalog('Bad Name'));
  const policyReport = await validateCatalog(options(root, {
    policies: { namePattern: '^[a-z0-9-]+$' },
  }));
  assert.equal(policyReport.ok, false);
  assert.equal(policyReport.errors.some((error) => error.message.includes('metadata.name does not match policy pattern')), true);
});

test('validateCatalog reports schema loading failures', async () => {
  const nonObjectRoot = await createTempRepository({
    'schema.json': '[]',
    'catalog-info.yaml': componentCatalog('api'),
  });
  const nonObject = await validateCatalog(options(nonObjectRoot, { schema: path.join(nonObjectRoot, 'schema.json') }));
  assert.equal(nonObject.ok, false);
  assert.match(nonObject.errors[0].message, /Schema must be an object/);

  const invalidRoot = await createTempRepository({
    'schema.json': '{bad',
    'catalog-info.yaml': componentCatalog('api'),
  });
  const invalid = await validateCatalog(options(invalidRoot, { schema: path.join(invalidRoot, 'schema.json') }));
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors[0].message, /Invalid JSON/);
});

test('validateCatalog follows linked catalogs once through cycles', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': locationCatalog(['../../catalog-info.yaml']),
  });

  const report = await validateCatalog(options(root, { schema: path.join(root, 'schema.json') }));
  assert.equal(report.ok, true);
  assert.deepEqual(report.files, ['catalog-info.yaml', 'services/api/catalog-info.yaml']);
});
