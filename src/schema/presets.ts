import type { SchemaObject, SchemaPreset } from '../types.js';

export const DEFAULT_SCHEMA_PRESET: SchemaPreset = 'backstage';

export function getSchemaPreset(name: SchemaPreset): SchemaObject {
  switch (name) {
    case 'backstage':
      return backstageSchema;
  }
}

export function isSchemaPreset(value: string): value is SchemaPreset {
  return value === 'backstage';
}

const metadataSchema: SchemaObject = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
    namespace: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    labels: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    annotations: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    tags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', minLength: 1 },
          title: { type: 'string' },
          icon: { type: 'string' },
          type: { type: 'string' },
        },
      },
    },
  },
};

const commonSpecSchema: SchemaObject = {
  type: 'object',
};

const backstageSchema: SchemaObject = {
  type: 'object',
  required: ['apiVersion', 'kind', 'metadata'],
  properties: {
    apiVersion: {
      type: 'string',
      pattern: '^backstage\\.io\\/v1(alpha1|beta1)$',
    },
    kind: {
      type: 'string',
      enum: ['API', 'Component', 'Domain', 'Group', 'Location', 'Resource', 'System', 'Template', 'User'],
    },
    metadata: metadataSchema,
    spec: commonSpecSchema,
  },
  allOf: [
    {
      anyOf: [
        {
          properties: {
            kind: { enum: ['Domain', 'Group', 'Location', 'System', 'User'] },
          },
        },
        {
          required: ['spec'],
          properties: {
            kind: { enum: ['API', 'Component', 'Resource', 'Template'] },
          },
        },
      ],
    },
  ],
};
