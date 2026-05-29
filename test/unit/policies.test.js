import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePolicies } from '../../dist/policies.js';

const document = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'Bad Name',
    annotations: {
      'github.com/project-slug': 'org/repo',
    },
  },
  spec: {
    lifecycle: 'unknown',
    owner: 'not-team',
  },
};

test('validatePolicies accepts missing policy config and non-object documents', () => {
  assert.deepEqual(validatePolicies(document, undefined), []);
  assert.deepEqual(validatePolicies(null, { requiredFields: ['metadata.name'] }), []);
});

test('validatePolicies stops traversal when a path segment is not an object', () => {
  const errors = validatePolicies({ metadata: 'not-an-object' }, {
    requiredFields: ['metadata.name'],
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, '$.metadata.name');
});

test('validatePolicies reports policy failures', () => {
  const errors = validatePolicies(document, {
    requiredFields: ['spec.type'],
    allowedKinds: ['API'],
    namePattern: '^[a-z0-9-]+$',
    ownerPattern: '^team-[a-z0-9-]+$',
    allowedLifecycles: ['production'],
    requiredAnnotations: ['backstage.io/techdocs-ref'],
  });

  assert.deepEqual(errors.map((error) => error.path), [
    '$.spec.type',
    '$.kind',
    '$.metadata.name',
    '$.spec.owner',
    '$.spec.lifecycle',
    '$.metadata.annotations["backstage.io/techdocs-ref"]',
  ]);
});
