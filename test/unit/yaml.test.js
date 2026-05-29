import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadDataFile, parseYamlDocuments } from '../../dist/yaml.js';

async function writeTempFile(content, extension = '.yaml') {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ciy-yaml-'));
  const file = path.join(directory, `file${extension}`);
  await fs.writeFile(file, content);
  return file;
}

test('parseYamlDocuments parses multi-document yaml', async () => {
  const file = await writeTempFile(`---
kind: Component
metadata:
  name: api
---
kind: Location
spec:
  targets:
    - ./service/catalog-info.yaml
`);
  const result = await parseYamlDocuments(file);
  assert.equal(result.errors.length, 0);
  assert.equal(result.documents.length, 2);
  assert.equal(result.documents[0].metadata.name, 'api');
});

test('parseYamlDocuments reports invalid yaml', async () => {
  const file = await writeTempFile('kind: [broken');
  const result = await parseYamlDocuments(file);
  assert.equal(result.documents.length, 0);
  assert.equal(result.errors.length, 1);
});

test('loadDataFile loads json and yaml files', async () => {
  const json = await writeTempFile('{"type":"object"}', '.json');
  const yaml = await writeTempFile('type: object', '.yaml');
  assert.deepEqual(await loadDataFile(json), { type: 'object' });
  assert.deepEqual(await loadDataFile(yaml), { type: 'object' });
});

test('parseYamlDocuments handles blank yaml content', async () => {
  const blank = await writeTempFile('');
  const result = await parseYamlDocuments(blank);
  assert.deepEqual(result, { documents: [], errors: [] });
});

test('parseYamlDocuments reports comment-only yaml as unparseable', async () => {
  const file = await writeTempFile('# only a comment\n');
  const result = await parseYamlDocuments(file);
  assert.equal(result.documents.length, 0);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].message, /Unable to parse YAML document/);
});

test('loadDataFile reports invalid json and yaml files', async () => {
  const json = await writeTempFile('{bad', '.json');
  const yaml = await writeTempFile('kind: [broken', '.yaml');

  await assert.rejects(() => loadDataFile(json), /Invalid JSON/);
  await assert.rejects(() => loadDataFile(yaml), /Invalid YAML/);
});
