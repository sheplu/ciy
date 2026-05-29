import path from 'node:path';
import { relativePath } from '../fs/paths.js';
import { findCatalogFiles, pathExists } from '../fs/walk.js';
import { loadDataFile, parseYamlDocuments } from '../yaml.js';
import { getSchemaPreset } from '../schema/presets.js';
import { validatePolicies } from '../policies.js';
import { validateSchema } from '../schema/validate-schema.js';
import { extractCatalogLinks } from './links.js';
import type { Issue, JsonObject, JsonValue, Report, SchemaObject, ValidationOptions } from '../types.js';

interface ReportOptions {
  failOnWarning: boolean;
}

interface SchemaResolutionSuccess {
  ok: true;
  schema: SchemaObject;
}

interface SchemaResolutionFailure {
  ok: false;
  errors: Issue[];
}

type SchemaResolution = SchemaResolutionSuccess | SchemaResolutionFailure;

export async function validateCatalog(options: ValidationOptions): Promise<Report> {
  const root = options.root;
  const rootCatalog = options.catalog ?? path.join(root, 'catalog-info.yaml');
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const files = new Set<string>();
  const visited = new Set<string>();

  if (!(await pathExists(root))) {
    return failure(root, [{ file: root, path: '$', message: 'Root path does not exist' }], warnings, files);
  }

  if (!(await pathExists(rootCatalog))) {
    return failure(root, [{ file: rootCatalog, path: '$', message: 'Root catalog-info.yaml does not exist' }], warnings, files);
  }

  const schemaResult = await resolveSchema(options);
  if (!schemaResult.ok) {
    return failure(root, schemaResult.errors, warnings, files);
  }
  const schema = schemaResult.schema;

  const discovered = new Set(await findCatalogFiles(root));
  await visitCatalog(rootCatalog);

  for (const catalogFile of discovered) {
    if (!visited.has(catalogFile)) {
      await parseAndValidate(catalogFile);
      const message = 'catalog file exists but is not declared by the root catalog';
      const issue = { file: catalogFile, path: '$', message };
      if (options.strict) {
        errors.push(issue);
      } else {
        warnings.push(issue);
      }
    }
  }

  return makeReport(root, errors, warnings, files, options);

  async function visitCatalog(catalogFile: string): Promise<void> {
    if (visited.has(catalogFile)) {
      return;
    }
    visited.add(catalogFile);
    files.add(catalogFile);

    if (!(await pathExists(catalogFile))) {
      errors.push({ file: catalogFile, path: '$', message: 'declared catalog target does not exist' });
      return;
    }

    const documents = await parseAndValidate(catalogFile);
    const extracted = extractCatalogLinks(documents, catalogFile, root);
    warnings.push(...extracted.warnings);

    for (const link of extracted.links) {
      if (!(await pathExists(link.file))) {
        errors.push({
          file: catalogFile,
          document: link.document,
          path: '$.spec.targets',
          message: `declared catalog target does not exist: ${link.target}`,
        });
        continue;
      }
      await visitCatalog(link.file);
    }
  }

  async function parseAndValidate(catalogFile: string): Promise<JsonValue[]> {
    files.add(catalogFile);
    let result;
    try {
      result = await parseYamlDocuments(catalogFile);
    } catch (error) {
      errors.push({ file: catalogFile, path: '$', message: getErrorMessage(error) });
      return [];
    }

    errors.push(...result.errors);

    result.documents.forEach((document, documentIndex) => {
      const validation = validateSchema(document, schema);
      for (const error of validation.errors) {
        errors.push({
          file: catalogFile,
          document: documentIndex,
          path: error.path,
          message: error.message,
        });
      }

      for (const error of validatePolicies(document, options.policies)) {
        errors.push({
          file: catalogFile,
          document: documentIndex,
          path: error.path,
          message: error.message,
        });
      }
    });

    return result.documents;
  }
}

async function resolveSchema(options: ValidationOptions): Promise<SchemaResolution> {
  if (!options.schema) {
    return { ok: true, schema: getSchemaPreset(options.schemaPreset) };
  }

  try {
    const loadedSchema = await loadDataFile(options.schema);
    if (!isSchemaObject(loadedSchema)) {
      return { ok: false, errors: [{ file: options.schema, path: '$', message: 'Schema must be an object' }] };
    }
    return { ok: true, schema: loadedSchema as SchemaObject };
  } catch (error) {
    return { ok: false, errors: [{ file: options.schema, path: '$', message: getErrorMessage(error) }] };
  }
}

function failure(root: string, errors: Issue[], warnings: Issue[], files: Set<string>): Report {
  return makeReport(root, errors, warnings, files, { failOnWarning: false });
}

function makeReport(root: string, errors: Issue[], warnings: Issue[], files: Set<string>, options: ReportOptions): Report {
  const shouldFailForWarnings = options.failOnWarning && warnings.length > 0;
  return {
    ok: errors.length === 0 && !shouldFailForWarnings,
    errors: normalizeIssues(root, errors),
    warnings: normalizeIssues(root, warnings),
    files: [...files].sort().map((file) => relativePath(root, file)),
  };
}

function normalizeIssues(root: string, issues: Issue[]): Issue[] {
  return issues.map((issue) => ({
    file: relativePath(root, issue.file),
    ...(issue.document === undefined ? {} : { document: issue.document }),
    path: issue.path,
    message: issue.message,
  }));
}

function isSchemaObject(value: JsonValue): value is JsonObject & SchemaObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
