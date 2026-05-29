# Catalog CLI implementation plan

This document describes the complete plan for building `ciy`, a Node.js CLI that validates `catalog-info.yaml` files and their repository-level linking rules.

## Goals

- Provide an npm-based Node.js CLI named `ciy`.
- Scan a repository for `catalog-info.yaml` files.
- Require a root-level catalog file by default.
- Validate every catalog document against a user-provided schema.
- Support YAML parsing through a runtime YAML library.
- Support root-declared and recursively linked sublevel catalog files.
- Report missing declared files as errors.
- Report undeclared sublevel catalog files as warnings by default.
- Treat undeclared sublevel catalog files as errors when `--strict` is enabled.
- Use native Node.js tests for unit and integration coverage.
- Use npm only for package management.
- Add a GitHub Actions workflow named `quality gates`.

## Target CLI

```bash
ciy validate --root .
```

The `validate` command is optional, so this also works:

```bash
ciy --root . --schema ./catalog.schema.json
```

## CLI options

| Option | Required | Description |
| --- | --- | --- |
| `--root <path>` | no | Repository root to scan. Defaults to the current working directory. |
| `--schema <path>` | no | JSON or YAML schema file used to validate catalog documents. Overrides the built-in preset. |
| `--schema-preset <name>` | no | Built-in schema preset used when `--schema` is omitted. Defaults to `backstage`. |
| `--catalog <path>` | no | Root catalog path. Defaults to `<root>/catalog-info.yaml`. |
| `--strict` | no | Treat undeclared sublevel catalogs as errors. |
| `--format <text\|json>` | no | Output format. Defaults to `text`. |
| `--fail-on-warning` | no | Exit non-zero when warnings are produced. |
| `--help` | no | Print help. |
| `--version` | no | Print package version. |

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Validation passed. |
| `1` | Validation completed with errors, or warnings with `--fail-on-warning`. |
| `2` | CLI usage or configuration error. |
| `3` | Unexpected internal failure. |

## Catalog discovery rules

1. Resolve `--root` to an absolute repository path.
2. Resolve the root catalog from `--catalog` or `<root>/catalog-info.yaml`.
3. Fail if the root catalog does not exist.
4. Recursively walk the repository and collect every file named `catalog-info.yaml`.
5. Skip dependency, VCS, cache, and build folders such as `.git`, `node_modules`, `dist`, and `coverage`.
6. Parse and validate the root catalog.
7. Extract local linked catalog paths from `spec.target` and `spec.targets`.
8. Resolve linked paths relative to the catalog file that declares them.
9. Fail if a declared local target is missing.
10. Recursively parse linked catalog files and their links.
11. Validate every discovered catalog file, including undeclared files.
12. Warn for discovered sublevel catalog files that are not reachable from the root catalog declaration graph.
13. Turn undeclared sublevel warnings into errors when `--strict` is used.

## YAML parsing implementation

Use the `yaml` npm package for parsing catalog files and YAML schema files.

Required behavior:

- Support standard YAML syntax handled by the library.
- Support multi-document YAML files.
- Preserve useful parser diagnostics.
- Report file path and document index for invalid YAML.

## Schema validation implementation

Implement a focused JSON Schema-compatible validator internally instead of adding a schema-validator dependency.

Initial supported keywords:

- `type`
- `required`
- `properties`
- `items`
- `enum`
- `const`
- `additionalProperties`
- `minLength`
- `maxLength`
- `pattern`
- `minimum`
- `maximum`
- `oneOf`
- `anyOf`
- `allOf`
- local `$ref` values such as `#/definitions/Entity`

Validation errors include:

- file path
- document index
- schema/data path
- human-readable message

## Project structure

```text
.
├── bin/
│   └── ciy.js
├── docs/
│   └── IMPLEMENTATION_PLAN.md
├── src/
│   ├── catalog/
│   │   ├── links.ts
│   │   └── validate-catalog.ts
│   ├── cli/
│   │   ├── args.ts
│   │   ├── help.ts
│   │   ├── main.ts
│   │   └── output.ts
│   ├── fs/
│   │   ├── paths.ts
│   │   └── walk.ts
│   ├── schema/
│   │   └── validate-schema.ts
│   ├── types.ts
│   └── yaml.ts
├── dist/
│   └── compiled JavaScript output
├── test/
│   ├── integration/
│   └── unit/
├── .github/workflows/
│   └── quality-gates.yml
├── package.json
├── package-lock.json
├── README.md
└── oxlint.json
```

## Implementation steps

### 1. Repository setup

- Create a task branch.
- Inspect repository guidance and existing files.
- Confirm npm and Node.js are available.

### 2. Project scaffold

- Create `package.json` with ESM enabled and TypeScript build output consumed by the CLI bin.
- Add the `ciy` bin entry.
- Add npm scripts for build, typecheck, lint, test, integration tests, coverage, audit, and check.
- Install runtime dependency `yaml`.
- Install dev dependencies `typescript`, `@types/node`, and `oxlint`.
- Generate `package-lock.json` with npm.

### 3. CLI argument parser

- Implement a dependency-free argument parser.
- Support optional `validate` command.
- Validate required values and allowed formats.
- Return structured usage errors with exit code `2`.

### 4. Filesystem scanning

- Implement repository walk logic.
- Skip unsafe or irrelevant folders.
- Detect `catalog-info.yaml` files.
- Normalize paths for stable output across platforms.
- Prevent linked targets from escaping the configured root.

### 5. YAML loading

- Implement `parseYamlDocuments` for catalog files.
- Implement `loadDataFile` for JSON or YAML schema files.
- Convert YAML parser failures into structured validation errors.

### 6. Link extraction

- Extract local catalog links from `spec.target` and `spec.targets`.
- Ignore unsupported or remote URL targets with warnings.
- Resolve relative links from the declaring catalog file.
- Deduplicate links.

### 7. Schema validator

- Implement the supported JSON Schema subset.
- Add local `$ref` resolution.
- Add combinator support for `oneOf`, `anyOf`, and `allOf`.
- Return deterministic error paths.

### 8. Catalog compliance validator

- Load custom schema or the default `backstage` schema preset.
- Parse and validate the root catalog.
- Follow declared links recursively.
- Check missing declared files.
- Validate undeclared discovered catalog files.
- Produce a single report with `ok`, `errors`, `warnings`, and `files`.

### 9. Output formatting

- Implement text output for humans.
- Implement JSON output for automation.
- Keep output stable for integration tests.

### 10. Unit tests

Use `node:test` and `node:assert/strict` for:

- CLI argument parsing.
- Path normalization and root containment.
- Link extraction.
- Schema validation keywords.
- YAML document parsing.

### 11. Integration tests

Use temporary repositories created during tests for:

- Valid root-only catalog.
- Valid declared sublevel catalog.
- Missing declared sublevel catalog.
- Undeclared sublevel warning.
- Strict mode undeclared error.
- Invalid schema compliance.
- JSON output.
- Help/version smoke tests.

### 12. Documentation

Update `README.md` with:

- Installation and usage.
- CLI options.
- Schema example.
- Link declaration examples.
- Strict mode behavior.
- Exit codes.
- Development commands.

### 13. Quality gates CI

Create `.github/workflows/quality-gates.yml` with:

- `push` on `main`.
- `pull_request`.
- `workflow_dispatch`.
- npm cache.
- Node.js version matrix.
- `npm ci`.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build`.
- `npm run test:coverage`.
- `npm run audit`.
- CLI smoke checks.

### 14. Verification

Run locally:

```bash
npm run typecheck
npm run build
npm run lint
npm run test
npm run test:integration
npm run test:coverage
npm run audit
node ./bin/ciy.js --help
node ./bin/ciy.js --version
```

### 15. Delivery

- Check the final diff.
- Commit the implementation.
- Push the task branch.
- Open a draft pull request.
- Report the PR URL and verification results.
