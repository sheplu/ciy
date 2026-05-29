import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createTempRepository } from '../helpers.js';
import { findCatalogFiles, pathExists } from '../../dist/fs/walk.js';

test('findCatalogFiles ignores symlinks and skipped directories', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': 'kind: Component\n',
    'services/api/catalog-info.yaml': 'kind: Component\n',
    'node_modules/pkg/catalog-info.yaml': 'kind: Component\n',
  });

  await fs.symlink(
    path.join(root, 'services', 'api', 'catalog-info.yaml'),
    path.join(root, 'linked-catalog-info.yaml'),
  );

  const files = await findCatalogFiles(root);
  const relative = files.map((file) => path.relative(root, file)).sort();
  assert.deepEqual(relative, [
    'catalog-info.yaml',
    path.join('services', 'api', 'catalog-info.yaml'),
  ]);
});

test('findCatalogFiles returns empty when root is unreadable', async () => {
  const missing = path.join('/tmp', `ciy-missing-${process.pid}-${Math.floor(Math.random() * 1e9)}`);
  const files = await findCatalogFiles(missing);
  assert.deepEqual(files, []);
});

test('pathExists returns false for missing paths', async () => {
  assert.equal(await pathExists('/tmp/definitely-not-here-xyz-123'), false);
});
