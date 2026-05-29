import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { isPathInside, relativePath, resolveInside } from '../../dist/fs/paths.js';

const root = path.resolve('/tmp/repo');

test('relativePath returns posix path', () => {
  assert.equal(relativePath(root, path.join(root, 'services', 'api')), 'services/api');
});

test('isPathInside accepts root and children', () => {
  assert.equal(isPathInside(root, root), true);
  assert.equal(isPathInside(root, path.join(root, 'services')), true);
});

test('isPathInside rejects parent paths', () => {
  assert.equal(isPathInside(root, path.resolve(root, '..', 'other')), false);
});

test('resolveInside resolves relative target safely', () => {
  assert.deepEqual(resolveInside(root, path.join(root, 'services'), './api/catalog-info.yaml'), {
    ok: true,
    path: path.join(root, 'services', 'api', 'catalog-info.yaml'),
  });
  assert.equal(resolveInside(root, path.join(root, 'services'), '../../outside.yaml').ok, false);
});
