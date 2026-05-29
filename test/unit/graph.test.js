import assert from 'node:assert/strict';
import test from 'node:test';
import { componentCatalog, createTempRepository, locationCatalog } from '../helpers.js';
import { buildCatalogGraph } from '../../dist/graph.js';

test('buildCatalogGraph returns declaration graph', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
    'services/other/catalog-info.yaml': componentCatalog('other'),
  });

  const graph = await buildCatalogGraph({
    root,
    schemaPreset: 'backstage',
    strict: false,
    failOnWarning: false,
  });

  assert.equal(graph.ok, true);
  assert.equal(graph.root, 'catalog-info.yaml');
  assert.deepEqual(graph.edges.map((edge) => [edge.from, edge.to]), [['catalog-info.yaml', 'services/api/catalog-info.yaml']]);
  assert.deepEqual(graph.undeclared.map((issue) => issue.file), ['services/other/catalog-info.yaml']);
});

test('buildCatalogGraph reports missing declarations', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./missing/catalog-info.yaml']),
  });

  const graph = await buildCatalogGraph({
    root,
    schemaPreset: 'backstage',
    strict: false,
    failOnWarning: false,
  });

  assert.equal(graph.ok, false);
  assert.match(graph.missing[0].message, /does not exist/);
});

test('buildCatalogGraph reports a missing root catalog', async () => {
  const root = await createTempRepository({});

  const graph = await buildCatalogGraph({
    root,
    schemaPreset: 'backstage',
    strict: false,
    failOnWarning: false,
  });

  assert.equal(graph.ok, false);
  assert.equal(graph.root, 'catalog-info.yaml');
  assert.deepEqual(graph.nodes, []);
  assert.match(graph.missing[0].message, /Root catalog-info.yaml does not exist/);
});

test('buildCatalogGraph fails when strict and undeclared catalogs are found', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
    'services/other/catalog-info.yaml': componentCatalog('other'),
  });

  const graph = await buildCatalogGraph({
    root,
    schemaPreset: 'backstage',
    strict: true,
    failOnWarning: false,
  });

  assert.equal(graph.ok, false);
  assert.equal(graph.undeclared.length, 1);
});

test('buildCatalogGraph records parse warnings and avoids catalog cycles', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml', './broken/catalog-info.yaml']),
    'services/api/catalog-info.yaml': locationCatalog(['../../catalog-info.yaml']),
    'broken/catalog-info.yaml': 'kind: [broken',
  });

  const graph = await buildCatalogGraph({
    root,
    schemaPreset: 'backstage',
    strict: false,
    failOnWarning: false,
  });

  assert.equal(graph.ok, true);
  assert.equal(graph.edges.length, 3);
  assert.equal(graph.undeclared.length, 0);
  assert.match(graph.warnings[0].message, /Flow sequence/);
});
