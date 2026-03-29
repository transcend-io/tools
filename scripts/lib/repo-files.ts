import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const repoRoot = process.cwd();

export function fileExists(filePath: string): boolean {
  return existsSync(join(repoRoot, filePath));
}

export function readRepoFile(filePath: string): string {
  return readFileSync(join(repoRoot, filePath), 'utf8');
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readRepoFile(filePath)) as T;
}
