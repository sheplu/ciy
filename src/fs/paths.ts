import path from 'node:path';

export interface ResolvedInsidePath {
  ok: boolean;
  path: string;
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

export function relativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath) || '.';
  return toPosixPath(relative);
}

export function isPathInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveInside(root: string, fromDirectory: string, target: string): ResolvedInsidePath {
  const resolved = path.resolve(fromDirectory, target);
  if (!isPathInside(root, resolved)) {
    return { ok: false, path: resolved };
  }
  return { ok: true, path: resolved };
}
