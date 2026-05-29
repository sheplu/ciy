import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SCHEMA_PRESET, getSchemaPreset, isSchemaPreset } from '../../dist/schema/presets.js';
import { validateSchema } from '../../dist/schema/validate-schema.js';

test('default schema preset is backstage', () => {
  assert.equal(DEFAULT_SCHEMA_PRESET, 'backstage');
  assert.equal(isSchemaPreset('backstage'), true);
  assert.equal(isSchemaPreset('other'), false);
});

test('backstage preset validates common entities', () => {
  const schema = getSchemaPreset('backstage');
  const result = validateSchema({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'api' },
    spec: {
      type: 'service',
      lifecycle: 'production',
      owner: 'team-a',
    },
  }, schema);

  assert.equal(result.ok, true);
});

test('backstage preset rejects unknown kinds and missing component spec', () => {
  const schema = getSchemaPreset('backstage');
  const unknownKind = validateSchema({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Unknown',
    metadata: { name: 'api' },
  }, schema);
  const missingSpec = validateSchema({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'api' },
  }, schema);

  assert.equal(unknownKind.ok, false);
  assert.equal(missingSpec.ok, false);
});
