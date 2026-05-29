import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createTempRepository(files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ciy-test-'));
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }
  return root;
}

export const basicSchema = JSON.stringify({
  type: 'object',
  required: ['apiVersion', 'kind', 'metadata'],
  properties: {
    apiVersion: { type: 'string' },
    kind: { type: 'string', enum: ['Component', 'Location'] },
    metadata: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
      },
    },
    spec: { type: 'object' },
  },
}, null, 2);

export function componentCatalog(name = 'api') {
  return `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${name}
spec:
  type: service
  lifecycle: production
  owner: team-a
`;
}

export function locationCatalog(targets) {
  const lines = targets.map((target) => `    - ${target}`).join('\n');
  return `apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: services
spec:
  targets:
${lines}
`;
}
