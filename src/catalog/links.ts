import path from 'node:path';
import { resolveInside } from '../fs/paths.js';
import type { CatalogLink, Issue, JsonObject, JsonValue } from '../types.js';

const URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//iu;

export interface ExtractedCatalogLinks {
  links: CatalogLink[];
  warnings: Issue[];
}

export function extractCatalogLinks(documents: JsonValue[], catalogFile: string, root: string): ExtractedCatalogLinks {
  const links: CatalogLink[] = [];
  const warnings: Issue[] = [];
  const seen = new Set<string>();
  const fromDirectory = path.dirname(catalogFile);

  documents.forEach((document, documentIndex) => {
    if (!isObject(document)) {
      return;
    }

    const targets = getTargets(document);
    for (const target of targets) {
      if (typeof target !== 'string' || target.trim() === '') {
        warnings.push({
          file: catalogFile,
          document: documentIndex,
          path: '$.spec.targets',
          message: 'Ignoring non-string catalog target',
        });
        continue;
      }

      if (URL_PATTERN.test(target)) {
        warnings.push({
          file: catalogFile,
          document: documentIndex,
          path: '$.spec.targets',
          message: `Ignoring remote catalog target: ${target}`,
        });
        continue;
      }

      const resolved = resolveInside(root, fromDirectory, target);
      if (!resolved.ok) {
        warnings.push({
          file: catalogFile,
          document: documentIndex,
          path: '$.spec.targets',
          message: `Ignoring catalog target outside root: ${target}`,
        });
        continue;
      }

      if (!seen.has(resolved.path)) {
        seen.add(resolved.path);
        links.push({ file: resolved.path, target, document: documentIndex });
      }
    }
  });

  return { links, warnings };
}

function getTargets(document: JsonObject): JsonValue[] {
  const spec = document.spec;
  if (spec === undefined || !isObject(spec)) {
    return [];
  }

  const targets: JsonValue[] = [];
  if (Object.hasOwn(spec, 'target') && spec.target !== undefined) {
    targets.push(spec.target);
  }
  if (Array.isArray(spec.targets)) {
    targets.push(...spec.targets);
  }
  return targets;
}

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
