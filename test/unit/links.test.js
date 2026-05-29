import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { extractCatalogLinks } from '../../dist/catalog/links.js';

const root = path.resolve('/tmp/repo');
const catalogFile = path.join(root, 'catalog-info.yaml');

test('extractCatalogLinks ignores non-object documents and documents without targets', () => {
  const { links, warnings } = extractCatalogLinks([
    null,
    'catalog',
    { kind: 'Component' },
    { spec: 'not-an-object' },
  ], catalogFile, root);

  assert.deepEqual(links, []);
  assert.deepEqual(warnings, []);
});

test('extractCatalogLinks extracts target and targets', () => {
  const { links, warnings } = extractCatalogLinks([
    { spec: { target: './service/catalog-info.yaml' } },
    { spec: { targets: ['./web/catalog-info.yaml'] } },
  ], catalogFile, root);

  assert.equal(warnings.length, 0);
  assert.deepEqual(links.map((link) => link.file), [
    path.join(root, 'service/catalog-info.yaml'),
    path.join(root, 'web/catalog-info.yaml'),
  ]);
});

test('extractCatalogLinks deduplicates targets', () => {
  const { links } = extractCatalogLinks([{ spec: { targets: ['./service/catalog-info.yaml', './service/catalog-info.yaml'] } }], catalogFile, root);
  assert.equal(links.length, 1);
});

test('extractCatalogLinks warns for remote and non-string targets', () => {
  const { links, warnings } = extractCatalogLinks([{ spec: { targets: ['https://example.com/catalog-info.yaml', 42] } }], catalogFile, root);
  assert.equal(links.length, 0);
  assert.equal(warnings.length, 2);
});

test('extractCatalogLinks warns for targets outside root', () => {
  const nestedCatalog = path.join(root, 'services', 'catalog-info.yaml');
  const { links, warnings } = extractCatalogLinks([{ spec: { target: '../../catalog-info.yaml' } }], nestedCatalog, root);
  assert.equal(links.length, 0);
  assert.equal(warnings.length, 1);
});
