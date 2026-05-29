# ciy

`ciy` is a Node.js CLI for validating `catalog-info.yaml` files and their linked catalog declarations.

It scans a repository, validates each catalog document against a schema, follows local `spec.target` and `spec.targets` links, and reports catalog files that are missing or not declared from the root catalog.

## Install

```bash
npm install
```

For local development, run the CLI directly:

```bash
node ./bin/ciy.js --help
```

## Commands

```bash
ciy validate
ciy check
ciy graph --format json
ciy init
```

| Command | Description |
| --- | --- |
| `validate` | Validate catalog files. This is the default command. |
| `check` | CI-friendly validation shortcut. It loads config defaults and fails on warnings by default. |
| `graph` | Print the local catalog declaration graph. |
| `init` | Create starter `ciy.config.json` and `catalog-info.yaml` files. |

## Usage

```bash
ciy validate
```

By default, `ciy` validates catalog documents with the built-in `backstage` schema preset. You can still provide a custom schema:

```bash
ciy validate --schema ./catalog.schema.json
```

or:

```bash
ciy --root . --schema ./catalog.schema.json
```

## Options

| Option | Description |
| --- | --- |
| `--root <path>` | Repository root to scan. Defaults to the current directory. |
| `--config <path>` | Config file path. Defaults to auto-detecting `ciy.config.*` in the root. |
| `--schema <path>` | JSON or YAML schema used to validate catalog documents. Overrides the built-in preset. |
| `--schema-preset <name>` | Built-in schema preset used when `--schema` is omitted. Defaults to `backstage`. |
| `--catalog <path>` | Root catalog path. Defaults to `<root>/catalog-info.yaml`. |
| `--strict` | Treat undeclared sublevel catalogs as errors. |
| `--format <text\|json>` | Output format. Defaults to `text`. |
| `--fail-on-warning` | Exit with code `1` when warnings are emitted. |
| `--force` | Overwrite starter files when using `init`. |
| `--help` | Show help. |
| `--version` | Show version. |

## Catalog linking rules

The root catalog is the entry point. By default it must exist at:

```text
catalog-info.yaml
```

Sublevel catalog files are declared with local `spec.target` or `spec.targets` values:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: services
spec:
  targets:
    - ./services/api/catalog-info.yaml
    - ./services/web/catalog-info.yaml
```

Rules:

- A declared local catalog target that does not exist is an error.
- A discovered sublevel `catalog-info.yaml` that is not reachable from the root catalog is a warning.
- With `--strict`, undeclared sublevel catalogs are errors.
- Linked catalog files can declare more linked catalog files recursively.
- Remote URL targets are ignored with a warning.
- Linked targets outside the configured root are ignored with a warning.

## Config file

`ciy` auto-loads one of these files from the root when present:

- `ciy.config.json`
- `ciy.config.yaml`
- `ciy.config.yml`

Example:

```json
{
  "schemaPreset": "backstage",
  "strict": false,
  "failOnWarning": false,
  "policies": {
    "requiredFields": ["metadata.name", "spec.owner"],
    "ownerPattern": "^team-[a-z0-9-]+$",
    "allowedLifecycles": ["production", "experimental", "deprecated"],
    "requiredAnnotations": ["github.com/project-slug"]
  }
}
```

CLI flags override config values.

## Policy rules

Policies complement schema validation and are configured under `policies`:

| Policy | Description |
| --- | --- |
| `requiredFields` | Requires dotted paths such as `metadata.name` or `spec.owner`. |
| `allowedKinds` | Restricts `kind` values. |
| `namePattern` | Validates `metadata.name`. |
| `ownerPattern` | Validates `spec.owner` when present. |
| `allowedLifecycles` | Restricts `spec.lifecycle` when present. |
| `requiredAnnotations` | Requires keys under `metadata.annotations`. |

## Declaration graph

```bash
ciy graph
ciy graph --format json
```

The graph output includes nodes, declaration edges, missing declared targets, undeclared discovered catalogs, and warnings for ignored links.

## Schema presets

The default preset is `backstage`:

```bash
ciy validate --schema-preset backstage
```

It validates the common Backstage entity envelope:

- `apiVersion` must be `backstage.io/v1alpha1` or `backstage.io/v1beta1`.
- `kind` must be one of `API`, `Component`, `Domain`, `Group`, `Location`, `Resource`, `System`, `Template`, or `User`.
- `metadata.name` is required.
- `spec` is required for `API`, `Component`, `Resource`, and `Template`.

Use `--schema` when a repository needs stricter local rules.

## Schema example

```json
{
  "type": "object",
  "required": ["apiVersion", "kind", "metadata"],
  "properties": {
    "apiVersion": {
      "type": "string"
    },
    "kind": {
      "type": "string",
      "enum": ["Component", "API", "Resource", "System", "Domain", "Location"]
    },
    "metadata": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "spec": {
      "type": "object"
    }
  }
}
```

The schema validator intentionally supports a focused JSON Schema subset:

- `type`
- `required`
- `properties`
- `items`
- `enum`
- `const`
- `additionalProperties`
- `minLength` / `maxLength`
- `pattern`
- `minimum` / `maximum`
- `oneOf` / `anyOf` / `allOf`
- local `$ref` values such as `#/definitions/Entity`

## Output formats

Text output:

```bash
ciy
```

JSON output:

```bash
ciy --format json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Validation passed. |
| `1` | Validation failed. |
| `2` | CLI usage/configuration error. |
| `3` | Unexpected internal error. |

## Development

```bash
npm run typecheck
npm run build
npm run lint
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
npm run audit
npm run check
```

The CLI source is written in TypeScript under `src/` and compiled to `dist/` for normal Node.js execution. The `bin/ciy.js` entrypoint loads the compiled output.

## Implementation plans

- Base implementation plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- Additional feature plan: [`docs/FEATURE_PLAN.md`](docs/FEATURE_PLAN.md)
