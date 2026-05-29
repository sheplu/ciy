import path from 'node:path';
import { extractCatalogLinks } from './catalog/links.js';
import { relativePath } from './fs/paths.js';
import { findCatalogFiles, pathExists } from './fs/walk.js';
import { parseYamlDocuments } from './yaml.js';
import type { GraphEdge, GraphNode, GraphReport, Issue, ValidationOptions } from './types.js';

export async function buildCatalogGraph(options: ValidationOptions): Promise<GraphReport> {
  const root = options.root;
  const rootCatalog = options.catalog ?? path.join(root, 'catalog-info.yaml');
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const missing: Issue[] = [];
  const warnings: Issue[] = [];
  const visited = new Set<string>();

  if (!(await pathExists(rootCatalog))) {
    missing.push({ file: rootCatalog, path: '$', message: 'Root catalog-info.yaml does not exist' });
    return makeGraphReport(root, rootCatalog, nodes, edges, missing, [], warnings, options.strict);
  }

  await visit(rootCatalog, true);

  const undeclared: Issue[] = [];
  const discovered = await findCatalogFiles(root);
  for (const catalogFile of discovered) {
    if (!nodes.has(catalogFile)) {
      nodes.set(catalogFile, { file: catalogFile, declared: false, exists: true });
      undeclared.push({ file: catalogFile, path: '$', message: 'catalog file exists but is not declared by the root catalog' });
    }
  }

  return makeGraphReport(root, rootCatalog, nodes, edges, missing, undeclared, warnings, options.strict);

  async function visit(catalogFile: string, declared: boolean): Promise<void> {
    if (visited.has(catalogFile)) {
      return;
    }

    visited.add(catalogFile);
    const exists = await pathExists(catalogFile);
    nodes.set(catalogFile, { file: catalogFile, declared, exists });

    if (!exists) {
      missing.push({ file: catalogFile, path: '$', message: 'declared catalog target does not exist' });
      return;
    }

    const parsed = await parseYamlDocuments(catalogFile);
    warnings.push(...parsed.errors);
    const extracted = extractCatalogLinks(parsed.documents, catalogFile, root);
    warnings.push(...extracted.warnings);

    for (const link of extracted.links) {
      const exists = await pathExists(link.file);
      edges.push({
        from: catalogFile,
        to: link.file,
        target: link.target,
        document: link.document,
        exists,
      });
      if (!exists) {
        missing.push({ file: catalogFile, document: link.document, path: '$.spec.targets', message: `declared catalog target does not exist: ${link.target}` });
        nodes.set(link.file, { file: link.file, declared: true, exists: false });
        continue;
      }
      await visit(link.file, true);
    }
  }
}

function makeGraphReport(
  root: string,
  rootCatalog: string,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  missing: Issue[],
  undeclared: Issue[],
  warnings: Issue[],
  strict: boolean,
): GraphReport {
  return {
    ok: missing.length === 0 && (!strict || undeclared.length === 0),
    root: relativePath(root, rootCatalog),
    nodes: [...nodes.values()].sort((left, right) => left.file.localeCompare(right.file)).map((node) => ({
      ...node,
      file: relativePath(root, node.file),
    })),
    edges: edges.map((edge) => ({
      ...edge,
      from: relativePath(root, edge.from),
      to: relativePath(root, edge.to),
    })),
    missing: normalizeIssues(root, missing),
    undeclared: normalizeIssues(root, undeclared),
    warnings: normalizeIssues(root, warnings),
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
