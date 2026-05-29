import type { JsonObject, JsonValue, SchemaObject, SchemaValidationError, SchemaValidationResult } from '../types.js';

interface ValidateSchemaOptions {
  rootSchema?: SchemaObject;
}

interface ResolvedRef {
  ok: boolean;
  schema?: SchemaObject;
}

export function validateSchema(value: JsonValue, schema: SchemaObject, options: ValidateSchemaOptions = {}): SchemaValidationResult {
  const rootSchema = options.rootSchema ?? schema;
  const errors = validateValue(value, schema, '$', rootSchema, new Set<string>());
  return { ok: errors.length === 0, errors };
}

function validateValue(
  value: JsonValue,
  schema: SchemaObject,
  dataPath: string,
  rootSchema: SchemaObject,
  refStack: Set<string>,
): SchemaValidationError[] {
  if (!isSchemaObject(schema)) {
    return [];
  }

  if (typeof schema.$ref === 'string') {
    const resolved = resolveRef(rootSchema, schema.$ref);
    if (!resolved.ok || !resolved.schema) {
      return [{ path: dataPath, message: `unresolved schema reference ${schema.$ref}` }];
    }
    if (refStack.has(schema.$ref)) {
      return [{ path: dataPath, message: `circular schema reference ${schema.$ref}` }];
    }
    return validateValue(value, resolved.schema, dataPath, rootSchema, new Set([...refStack, schema.$ref]));
  }

  const errors: SchemaValidationError[] = [];

  errors.push(...validateCombinators(value, schema, dataPath, rootSchema, refStack));

  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push({ path: dataPath, message: `expected const ${JSON.stringify(schema.const)}` });
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => deepEqual(entry, value))) {
    errors.push({ path: dataPath, message: `expected one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(', ')}` });
  }

  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowedTypes.some((type) => matchesType(value, type))) {
      errors.push({ path: dataPath, message: `expected type ${allowedTypes.join(' or ')}` });
      return errors;
    }
  }

  if (isObject(value)) {
    errors.push(...validateObject(value, schema, dataPath, rootSchema, refStack));
  }

  if (Array.isArray(value)) {
    errors.push(...validateArray(value, schema, dataPath, rootSchema, refStack));
  }

  if (typeof value === 'string') {
    errors.push(...validateString(value, schema, dataPath));
  }

  if (typeof value === 'number') {
    errors.push(...validateNumber(value, schema, dataPath));
  }

  return errors;
}

function validateCombinators(
  value: JsonValue,
  schema: SchemaObject,
  dataPath: string,
  rootSchema: SchemaObject,
  refStack: Set<string>,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (Array.isArray(schema.allOf)) {
    for (const childSchema of schema.allOf) {
      errors.push(...validateValue(value, childSchema, dataPath, rootSchema, refStack));
    }
  }

  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter((childSchema) => validateValue(value, childSchema, dataPath, rootSchema, refStack).length === 0);
    if (matches.length === 0) {
      errors.push({ path: dataPath, message: 'expected value to match at least one anyOf schema' });
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((childSchema) => validateValue(value, childSchema, dataPath, rootSchema, refStack).length === 0);
    if (matches.length !== 1) {
      errors.push({ path: dataPath, message: `expected value to match exactly one oneOf schema, matched ${matches.length}` });
    }
  }

  return errors;
}

function validateObject(
  value: JsonObject,
  schema: SchemaObject,
  dataPath: string,
  rootSchema: SchemaObject,
  refStack: Set<string>,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  const properties = schema.properties ?? {};

  if (Array.isArray(schema.required)) {
    for (const property of schema.required) {
      if (!Object.hasOwn(value, property)) {
        errors.push({ path: appendPath(dataPath, property), message: 'is required' });
      }
    }
  }

  for (const [property, propertySchema] of Object.entries(properties)) {
    if (Object.hasOwn(value, property)) {
      const propertyValue = value[property];
      if (propertyValue !== undefined) {
        errors.push(...validateValue(propertyValue, propertySchema, appendPath(dataPath, property), rootSchema, refStack));
      }
    }
  }

  if (schema.additionalProperties === false) {
    for (const property of Object.keys(value)) {
      if (!Object.hasOwn(properties, property)) {
        errors.push({ path: appendPath(dataPath, property), message: 'additional property is not allowed' });
      }
    }
  } else if (isSchemaObject(schema.additionalProperties)) {
    for (const property of Object.keys(value)) {
      if (!Object.hasOwn(properties, property)) {
        const propertyValue = value[property];
        if (propertyValue !== undefined) {
          errors.push(...validateValue(propertyValue, schema.additionalProperties, appendPath(dataPath, property), rootSchema, refStack));
        }
      }
    }
  }

  return errors;
}

function validateArray(
  value: JsonValue[],
  schema: SchemaObject,
  dataPath: string,
  rootSchema: SchemaObject,
  refStack: Set<string>,
): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  if (isSchemaObject(schema.items)) {
    value.forEach((entry, index) => {
      errors.push(...validateValue(entry, schema.items as SchemaObject, `${dataPath}[${index}]`, rootSchema, refStack));
    });
  }
  return errors;
}

function validateString(value: string, schema: SchemaObject, dataPath: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
    errors.push({ path: dataPath, message: `expected minimum length ${schema.minLength}` });
  }
  if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
    errors.push({ path: dataPath, message: `expected maximum length ${schema.maxLength}` });
  }
  if (typeof schema.pattern === 'string') {
    const pattern = new RegExp(schema.pattern, 'u');
    if (!pattern.test(value)) {
      errors.push({ path: dataPath, message: `expected string to match pattern ${schema.pattern}` });
    }
  }
  return errors;
}

function validateNumber(value: number, schema: SchemaObject, dataPath: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  if (typeof schema.minimum === 'number' && value < schema.minimum) {
    errors.push({ path: dataPath, message: `expected minimum ${schema.minimum}` });
  }
  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    errors.push({ path: dataPath, message: `expected maximum ${schema.maximum}` });
  }
  return errors;
}

function matchesType(value: JsonValue, type: string): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return isObject(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

function resolveRef(rootSchema: SchemaObject, ref: string): ResolvedRef {
  if (!ref.startsWith('#/')) {
    return { ok: false };
  }

  const parts = ref.slice(2).split('/').map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  let current: unknown = rootSchema;
  for (const part of parts) {
    if (!isObject(current) && !Array.isArray(current)) {
      return { ok: false };
    }
    current = Array.isArray(current) ? current[Number(part)] : current[part];
    if (current === undefined) {
      return { ok: false };
    }
  }
  return isSchemaObject(current) ? { ok: true, schema: current } : { ok: false };
}

function appendPath(dataPath: string, property: string): string {
  if (/^[A-Za-z_$][\w$]*$/u.test(property)) {
    return `${dataPath}.${property}`;
  }
  return `${dataPath}[${JSON.stringify(property)}]`;
}

function isSchemaObject(value: unknown): value is SchemaObject {
  return isObject(value);
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
