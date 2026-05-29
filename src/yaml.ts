import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { Issue, JsonValue } from './types.js';

export interface ParsedYamlDocuments {
  documents: JsonValue[];
  errors: Issue[];
}

export async function parseYamlDocuments(filePath: string): Promise<ParsedYamlDocuments> {
  const content = await fs.readFile(filePath, 'utf8');
  const documents = YAML.parseAllDocuments(content, { prettyErrors: true });
  const errors: Issue[] = [];
  const values: JsonValue[] = [];

  documents.forEach((document, index) => {
    for (const error of document.errors) {
      errors.push({
        file: filePath,
        document: index,
        path: '$',
        message: formatYamlError(error),
      });
    }

    if (document.errors.length === 0) {
      values.push(document.toJSON() as JsonValue);
    }
  });

  if (documents.length === 0 && content.trim() !== '') {
    errors.push({
      file: filePath,
      document: 0,
      path: '$',
      message: 'Unable to parse YAML document',
    });
  }

  return { documents: values, errors };
}

export async function loadDataFile(filePath: string): Promise<JsonValue> {
  const content = await fs.readFile(filePath, 'utf8');
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.json') {
    try {
      return JSON.parse(content) as JsonValue;
    } catch (error) {
      throw new Error(`Invalid JSON in ${filePath}: ${getErrorMessage(error)}`);
    }
  }

  try {
    return YAML.parse(content) as JsonValue;
  } catch (error) {
    throw new Error(`Invalid YAML in ${filePath}: ${formatYamlError(error)}`);
  }
}

function formatYamlError(error: unknown): string {
  return getErrorMessage(error).replace(/\n.*/s, '');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
