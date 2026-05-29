import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSchema } from '../../dist/schema/validate-schema.js';

test('validateSchema accepts matching object', () => {
  const result = validateSchema({ name: 'api', tags: ['node'] }, {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      tags: { type: 'array', items: { type: 'string' } },
    },
  });
  assert.equal(result.ok, true);
});

test('validateSchema reports required and type errors', () => {
  const result = validateSchema({ count: '1' }, {
    type: 'object',
    required: ['name'],
    properties: {
      count: { type: 'number' },
    },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    { path: '$.name', message: 'is required' },
    { path: '$.count', message: 'expected type number' },
  ]);
});

test('validateSchema supports enum, const, and additionalProperties', () => {
  const result = validateSchema({ kind: 'Bad', extra: true }, {
    type: 'object',
    properties: {
      kind: { enum: ['Component'], const: 'Component' },
    },
    additionalProperties: false,
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3);
});

test('validateSchema supports local refs', () => {
  const schema = {
    $ref: '#/definitions/entity',
    definitions: {
      entity: {
        type: 'object',
        required: ['metadata'],
        properties: {
          metadata: { $ref: '#/definitions/metadata' },
        },
      },
      metadata: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    },
  };
  const result = validateSchema({ metadata: { name: 'api' } }, schema);
  assert.equal(result.ok, true);
});

test('validateSchema supports anyOf and oneOf', () => {
  const anyOf = validateSchema('api', { anyOf: [{ type: 'number' }, { type: 'string' }] });
  assert.equal(anyOf.ok, true);

  const oneOf = validateSchema('api', { oneOf: [{ type: 'string' }, { const: 'api' }] });
  assert.equal(oneOf.ok, false);
  assert.match(oneOf.errors[0].message, /matched 2/);
});

test('validateSchema supports allOf and string, number, and array constraints', () => {
  const result = validateSchema({ name: 'API1', count: 11, tags: ['node', 2] }, {
    allOf: [
      {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 5, maxLength: 6, pattern: '^[a-z]+$' },
          count: { type: 'integer', minimum: 1, maximum: 10 },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map((error) => error.message), [
    'expected minimum length 5',
    'expected string to match pattern ^[a-z]+$',
    'expected maximum 10',
    'expected type string',
  ]);
});

test('validateSchema supports typed additionalProperties', () => {
  const result = validateSchema({ name: 'api', count: 1 }, {
    type: 'object',
    properties: { name: { type: 'string' } },
    additionalProperties: { type: 'string' },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [{ path: '$.count', message: 'expected type string' }]);
});

test('validateSchema reports unresolved and circular refs', () => {
  const unresolved = validateSchema('api', { $ref: '#/definitions/missing', definitions: {} });
  assert.equal(unresolved.ok, false);
  assert.match(unresolved.errors[0].message, /unresolved schema reference/);

  const circular = validateSchema('api', {
    $ref: '#/definitions/self',
    definitions: { self: { $ref: '#/definitions/self' } },
  });
  assert.equal(circular.ok, false);
  assert.match(circular.errors[0].message, /circular schema reference/);
});

test('validateSchema handles unknown schema types and non-object schema values', () => {
  const unknown = validateSchema('api', { type: 'custom-type' });
  assert.equal(unknown.ok, true);

  const nullable = validateSchema(null, { type: ['null', 'string'] });
  assert.equal(nullable.ok, true);
});

test('validateSchema accepts a non-object schema as a no-op', () => {
  const result = validateSchema({ name: 'api' }, true);
  assert.equal(result.ok, true);

  const arraySchema = validateSchema('api', []);
  assert.equal(arraySchema.ok, true);
});

test('validateSchema enforces maxLength and number bounds', () => {
  const tooLong = validateSchema('abcdefg', { type: 'string', maxLength: 5 });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.errors[0].message, /maximum length 5/);

  const tooSmall = validateSchema(0, { type: 'number', minimum: 1 });
  assert.equal(tooSmall.ok, false);
  assert.match(tooSmall.errors[0].message, /minimum 1/);

  const tooLarge = validateSchema(99, { type: 'number', maximum: 10 });
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.errors[0].message, /maximum 10/);
});

test('validateSchema oneOf accepts exactly one match', () => {
  const result = validateSchema('api', { oneOf: [{ type: 'string' }, { type: 'number' }] });
  assert.equal(result.ok, true);
});

test('validateSchema rejects refs that do not start with #/', () => {
  const result = validateSchema('api', { $ref: 'http://example.com/schema.json', definitions: {} });
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /unresolved schema reference/);
});

test('validateSchema rejects refs that traverse non-object intermediate values', () => {
  const result = validateSchema('api', {
    $ref: '#/definitions/name/inside',
    definitions: { name: 'leaf' },
  });
  assert.equal(result.ok, false);
});

test('validateSchema rejects mismatched null type', () => {
  const result = validateSchema('not-null', { type: 'null' });
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /expected type null/);
});

test('validateSchema accepts boolean and integer types', () => {
  assert.equal(validateSchema(true, { type: 'boolean' }).ok, true);
  assert.equal(validateSchema(false, { type: 'boolean' }).ok, true);
  assert.equal(validateSchema('yes', { type: 'boolean' }).ok, false);
  assert.equal(validateSchema(7, { type: 'integer' }).ok, true);
  assert.equal(validateSchema(7.5, { type: 'integer' }).ok, false);
});

test('validateSchema escapes unusual property names in error paths', () => {
  const result = validateSchema({ 'with space': 1 }, {
    type: 'object',
    properties: { 'with space': { type: 'string' } },
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].path, '$["with space"]');
});
