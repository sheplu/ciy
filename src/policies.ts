import type { Issue, JsonObject, JsonValue, PolicyConfig } from './types.js';

export function validatePolicies(document: JsonValue, policies: PolicyConfig | undefined): Issue[] {
  if (!policies || !isObject(document)) {
    return [];
  }

  const errors: Issue[] = [];

  if (policies.requiredFields) {
    for (const field of policies.requiredFields) {
      if (getPath(document, field) === undefined) {
        errors.push({ file: '', path: `$.${field}`, message: `required by policy: ${field}` });
      }
    }
  }

  if (policies.allowedKinds && typeof document.kind === 'string' && !policies.allowedKinds.includes(document.kind)) {
    errors.push({ file: '', path: '$.kind', message: `kind is not allowed by policy: ${document.kind}` });
  }

  if (policies.namePattern) {
    const name = getPath(document, 'metadata.name');
    if (typeof name === 'string' && !new RegExp(policies.namePattern, 'u').test(name)) {
      errors.push({ file: '', path: '$.metadata.name', message: `metadata.name does not match policy pattern ${policies.namePattern}` });
    }
  }

  if (policies.ownerPattern) {
    const owner = getPath(document, 'spec.owner');
    if (typeof owner === 'string' && !new RegExp(policies.ownerPattern, 'u').test(owner)) {
      errors.push({ file: '', path: '$.spec.owner', message: `spec.owner does not match policy pattern ${policies.ownerPattern}` });
    }
  }

  if (policies.allowedLifecycles) {
    const lifecycle = getPath(document, 'spec.lifecycle');
    if (typeof lifecycle === 'string' && !policies.allowedLifecycles.includes(lifecycle)) {
      errors.push({ file: '', path: '$.spec.lifecycle', message: `lifecycle is not allowed by policy: ${lifecycle}` });
    }
  }

  if (policies.requiredAnnotations) {
    const annotations = getPath(document, 'metadata.annotations');
    for (const annotation of policies.requiredAnnotations) {
      if (!isObject(annotations) || annotations[annotation] === undefined) {
        errors.push({ file: '', path: `$.metadata.annotations[${JSON.stringify(annotation)}]`, message: `annotation is required by policy: ${annotation}` });
      }
    }
  }

  return errors;
}

function getPath(document: JsonObject, dottedPath: string): JsonValue | undefined {
  let current: JsonValue | undefined = document;
  for (const part of dottedPath.split('.')) {
    if (!isObject(current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function isObject(value: JsonValue | undefined): value is JsonObject {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
}
