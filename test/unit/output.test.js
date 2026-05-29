import assert from 'node:assert/strict';
import test from 'node:test';
import { formatGraphReport, formatInitReport, formatReport } from '../../dist/cli/output.js';

test('formatReport renders text and json output', () => {
  const report = {
    ok: false,
    files: ['catalog-info.yaml'],
    errors: [{ file: 'catalog-info.yaml', document: 0, path: '$.kind', message: 'is required' }],
    warnings: [{ file: 'services/catalog-info.yaml', path: '$', message: 'not declared' }],
  };

  assert.match(formatReport(report), /Catalog validation failed/);
  assert.match(formatReport(report), /catalog-info.yaml#document\[0\] \$\.kind: is required/);
  assert.deepEqual(JSON.parse(formatReport(report, 'json')), report);
});

test('formatGraphReport renders edges and issue sections', () => {
  const output = formatGraphReport({
    ok: false,
    root: 'catalog-info.yaml',
    nodes: [{ file: 'catalog-info.yaml', declared: true, exists: true }],
    edges: [{ from: 'catalog-info.yaml', to: 'missing/catalog-info.yaml', target: './missing/catalog-info.yaml', document: 0, exists: false }],
    missing: [{ file: 'catalog-info.yaml', document: 0, path: '$.spec.targets', message: 'missing' }],
    undeclared: [{ file: 'other/catalog-info.yaml', path: '$', message: 'not declared' }],
    warnings: [{ file: 'catalog-info.yaml', path: '$.spec.targets', message: 'remote ignored' }],
  });

  assert.match(output, /Catalog graph has missing declarations/);
  assert.match(output, /catalog-info.yaml -> missing\/catalog-info.yaml/);
  assert.match(output, /Missing:/);
  assert.match(output, /Undeclared:/);
  assert.match(output, /Warnings:/);
});

test('formatInitReport renders created skipped and errors', () => {
  const report = {
    ok: false,
    created: ['ciy.config.json'],
    skipped: ['catalog-info.yaml'],
    errors: [{ file: 'catalog-info.yaml', path: '$', message: 'cannot write' }],
  };

  const output = formatInitReport(report);
  assert.match(output, /Project initialization failed/);
  assert.match(output, /Created:/);
  assert.match(output, /Skipped:/);
  assert.match(output, /Errors:/);
  assert.deepEqual(JSON.parse(formatInitReport(report, 'json')), report);
});
