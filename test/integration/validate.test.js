import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { basicSchema, componentCatalog, createTempRepository, locationCatalog } from '../helpers.js';

const cli = path.resolve('bin/ciy.js');

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: path.resolve('.'),
    encoding: 'utf8',
    ...options,
  });
}

test('default backstage preset validates without a schema file', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': componentCatalog('root'),
  });

  const result = runCli(['--root', root]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Catalog validation passed/);
});

test('check command fails on warnings by default', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': componentCatalog('root'),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const result = runCli(['check', '--root', root]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Warnings:/);
});

test('graph command prints declaration graph as json', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const result = runCli(['graph', '--root', root, '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const graph = JSON.parse(result.stdout);
  assert.equal(graph.root, 'catalog-info.yaml');
  assert.equal(graph.edges.length, 1);
});

test('init command creates starter files', async () => {
  const root = await createTempRepository({});

  const result = runCli(['init', '--root', root]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ciy.config.json/);

  const check = runCli(['check', '--root', root]);
  assert.equal(check.status, 0, check.stderr);
});

test('config policies are applied during validation', async () => {
  const root = await createTempRepository({
    'ciy.config.json': JSON.stringify({
      policies: { requiredFields: ['spec.owner'], ownerPattern: '^team-[a-z]+$' },
    }),
    'catalog-info.yaml': `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: root
spec:
  type: service
  lifecycle: production
  owner: platform
`,
  });

  const result = runCli(['validate', '--root', root]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /spec.owner does not match policy pattern/);
});

test('valid root-only catalog exits successfully', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': componentCatalog('root'),
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Catalog validation passed/);
});

test('valid declared sublevel catalog exits successfully', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const result = runCli(['validate', '--root', root, '--schema', path.join(root, 'schema.json')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Files checked: 2/);
});

test('missing declared sublevel catalog exits with error', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': locationCatalog(['./services/missing/catalog-info.yaml']),
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /declared catalog target does not exist/);
});

test('undeclared sublevel catalog is warning by default', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': componentCatalog('root'),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json')]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Warnings:/);
  assert.match(result.stdout, /not declared/);
});

test('undeclared sublevel catalog is error in strict mode', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': componentCatalog('root'),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json'), '--strict']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not declared/);
});

test('default backstage preset rejects invalid catalog documents', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': 'apiVersion: backstage.io/v1alpha1\nkind: NotBackstage\nmetadata:\n  name: bad\n',
  });

  const result = runCli(['--root', root]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expected one of/);
});

test('schema validation errors fail validation', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': 'apiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata: {}\n',
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /metadata.name/);
});

test('json output is parseable', async () => {
  const root = await createTempRepository({
    'schema.json': basicSchema,
    'catalog-info.yaml': componentCatalog('root'),
  });

  const result = runCli(['--root', root, '--schema', path.join(root, 'schema.json'), '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.deepEqual(report.files, ['catalog-info.yaml']);
});

test('help and version smoke tests', () => {
  const help = runCli(['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  assert.match(help.stdout, /check/);
  assert.match(help.stdout, /graph/);
  assert.match(help.stdout, /init/);

  const version = runCli(['--version']);
  assert.equal(version.status, 0);
  assert.match(version.stdout, /^0\.1\.0\n$/u);
});
