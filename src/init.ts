import fs from 'node:fs/promises';
import path from 'node:path';
import { relativePath } from './fs/paths.js';
import { pathExists } from './fs/walk.js';
import type { InitReport, Issue } from './types.js';

const CONFIG_TEMPLATE = `${JSON.stringify({
  schemaPreset: 'backstage',
  strict: false,
  failOnWarning: false,
  policies: {
    requiredFields: ['metadata.name'],
    namePattern: '^[a-z0-9][a-z0-9_.-]*$',
  },
}, null, 2)}\n`;

const CATALOG_TEMPLATE = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: example-component
spec:
  type: service
  lifecycle: experimental
  owner: team-example
`;

export async function initProject(root: string, force: boolean): Promise<InitReport> {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: Issue[] = [];

  try {
    await fs.mkdir(root, { recursive: true });
  } catch (error) {
    errors.push({ file: relativePath(root, root), path: '$', message: getErrorMessage(error) });
    return { ok: false, created, skipped, errors };
  }

  await writeStarterFile(root, path.join(root, 'ciy.config.json'), CONFIG_TEMPLATE, force, created, skipped, errors);
  await writeStarterFile(root, path.join(root, 'catalog-info.yaml'), CATALOG_TEMPLATE, force, created, skipped, errors);

  return {
    ok: errors.length === 0,
    created,
    skipped,
    errors,
  };
}

async function writeStarterFile(root: string, filePath: string, content: string, force: boolean, created: string[], skipped: string[], errors: Issue[]): Promise<void> {
  const relative = relativePath(root, filePath);
  if (!force && await pathExists(filePath)) {
    skipped.push(relative);
    return;
  }

  try {
    await fs.writeFile(filePath, content, 'utf8');
    created.push(relative);
  } catch (error) {
    errors.push({ file: relative, path: '$', message: getErrorMessage(error) });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
