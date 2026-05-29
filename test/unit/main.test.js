import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { componentCatalog, createTempRepository, locationCatalog } from '../helpers.js';
import { main } from '../../dist/cli/main.js';

function createIo(root) {
  let stdout = '';
  let stderr = '';
  return {
    io: {
      cwd: () => root,
      stdout: { write: (chunk) => { stdout += chunk; return true; } },
      stderr: { write: (chunk) => { stderr += chunk; return true; } },
    },
    output: () => ({ stdout, stderr }),
  };
}

test('main runs graph and init commands', async () => {
  const graphRoot = await createTempRepository({
    'catalog-info.yaml': locationCatalog(['./services/api/catalog-info.yaml']),
    'services/api/catalog-info.yaml': componentCatalog('api'),
  });
  const graphIo = createIo(graphRoot);

  assert.equal(await main(['graph'], graphIo.io), 0);
  assert.match(graphIo.output().stdout, /Catalog graph built/);

  const initRoot = path.join(await createTempRepository({}), 'new-project');
  const initIo = createIo(initRoot);
  assert.equal(await main(['init'], initIo.io), 0);
  assert.match(initIo.output().stdout, /Project initialized/);
  assert.equal(await fs.readFile(path.join(initRoot, 'catalog-info.yaml'), 'utf8').then((content) => content.includes('kind: Component')), true);
});

test('main routes validation failures and usage errors to stderr', async () => {
  const root = await createTempRepository({
    'catalog-info.yaml': 'apiVersion: backstage.io/v1alpha1\nkind: Bad\nmetadata:\n  name: bad\n',
  });
  const validationIo = createIo(root);

  assert.equal(await main([], validationIo.io), 1);
  assert.match(validationIo.output().stderr, /Catalog validation failed/);

  const usageIo = createIo(root);
  assert.equal(await main(['--bad'], usageIo.io), 2);
  assert.match(usageIo.output().stderr, /Unknown option/);
});

test('init skips existing files without --force', async () => {
  const root = path.join(await createTempRepository({}), 'project');
  await fs.mkdir(root);
  await fs.writeFile(path.join(root, 'ciy.config.json'), '{}');

  const { io, output } = createIo(root);
  assert.equal(await main(['init'], io), 0);
  assert.match(output().stdout, /Skipped:/);
  assert.match(output().stdout, /ciy.config.json/);
});

test('init reports mkdir failures', async () => {
  const parent = await createTempRepository({});
  const blocker = path.join(parent, 'blocker');
  await fs.writeFile(blocker, 'not a directory');

  const initRoot = path.join(blocker, 'project');
  const { io, output } = createIo(initRoot);
  const code = await main(['init'], io);

  assert.equal(code, 1);
  assert.match(output().stderr, /Project initialization failed/);
});

test('init reports write failures via the report', async () => {
  const parent = await createTempRepository({});
  const initRoot = path.join(parent, 'project');
  await fs.mkdir(initRoot);
  await fs.writeFile(path.join(initRoot, 'ciy.config.json'), '');
  await fs.chmod(path.join(initRoot, 'ciy.config.json'), 0o400);

  const { io, output } = createIo(initRoot);
  const code = await main(['init', '--force'], io);

  await fs.chmod(path.join(initRoot, 'ciy.config.json'), 0o600);

  assert.equal(code, 1);
  assert.match(output().stderr, /Project initialization failed/);
  assert.match(output().stderr, /Errors:/);
});

test('main reports unexpected config errors', async () => {
  const root = await createTempRepository({ 'ciy.config.json': '[]' });
  const { io, output } = createIo(root);

  assert.equal(await main([], io), 3);
  assert.match(output().stderr, /Unexpected error:/);
  assert.match(output().stderr, /Config must be an object/);
});

test('main prints help and version on flag', async () => {
  const root = await createTempRepository({});

  const helpIo = createIo(root);
  assert.equal(await main(['--help'], helpIo.io), 0);
  assert.match(helpIo.output().stdout, /Usage:/);

  const versionIo = createIo(root);
  assert.equal(await main(['--version'], versionIo.io), 0);
  assert.match(versionIo.output().stdout, /^\d+\.\d+\.\d+\n$/u);
});

test('main stringifies non-Error throws when reporting unexpected errors', async () => {
  const root = await createTempRepository({});
  const { io, output } = createIo(root);
  io.cwd = () => { throw 'plain string failure'; };

  assert.equal(await main([], io), 3);
  assert.match(output().stderr, /plain string failure/);
});
