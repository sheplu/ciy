# Feature implementation plan: init, check, graph, and policies

## Goals

- Add a project bootstrap command: `ciy init`.
- Add a CI-friendly shortcut: `ciy check`.
- Add catalog declaration graph output: `ciy graph`.
- Add policy rules that complement schema validation.
- Keep normal Node.js execution through compiled TypeScript output.
- Keep npm-only development, native tests, and the existing quality gates workflow.

## Commands

### `ciy init`

Creates starter project files:

- `ciy.config.json`
- `catalog-info.yaml` when missing

Default behavior is safe and refuses to overwrite existing files. `--force` allows overwrites.

Starter config:

```json
{
  "schemaPreset": "backstage",
  "strict": false,
  "failOnWarning": false,
  "policies": {
    "requiredFields": ["metadata.name"],
    "namePattern": "^[a-z0-9][a-z0-9_.-]*$"
  }
}
```

### `ciy check`

Runs validation with project config defaults and CI-friendly behavior.

- Loads `ciy.config.json`, `ciy.config.yaml`, or `ciy.config.yml` from the root when present.
- Uses the default Backstage schema preset if no custom schema is configured.
- Fails on warnings by default unless config or CLI explicitly disables that behavior.

### `ciy graph`

Builds the local catalog declaration graph from the root catalog.

Outputs:

- root catalog path
- graph nodes
- declaration edges
- missing declared targets
- undeclared discovered catalogs
- warnings for ignored remote or unsafe links

Supports:

```bash
ciy graph --format text
ciy graph --format json
```

### `ciy validate`

Keeps the existing behavior, now also loading config defaults when available.

## Config file

Supported names:

- `ciy.config.json`
- `ciy.config.yaml`
- `ciy.config.yml`

Supported fields:

```json
{
  "schema": "./catalog.schema.json",
  "schemaPreset": "backstage",
  "catalog": "catalog-info.yaml",
  "strict": false,
  "failOnWarning": false,
  "format": "text",
  "policies": {
    "requiredFields": ["metadata.name", "spec.owner"],
    "allowedKinds": ["Component", "API"],
    "namePattern": "^[a-z0-9][a-z0-9_.-]*$",
    "ownerPattern": "^team-[a-z0-9-]+$",
    "allowedLifecycles": ["production", "experimental", "deprecated"],
    "requiredAnnotations": ["github.com/project-slug"]
  }
}
```

CLI flags override config values.

## Policy rules

Policies run after YAML parsing and schema validation. They report errors using the same report structure as schema validation.

Initial policies:

| Policy | Behavior |
| --- | --- |
| `requiredFields` | Requires dotted paths such as `metadata.name` or `spec.owner`. |
| `allowedKinds` | Restricts `kind` values. |
| `namePattern` | Validates `metadata.name`. |
| `ownerPattern` | Validates `spec.owner` when present. |
| `allowedLifecycles` | Restricts `spec.lifecycle` when present. |
| `requiredAnnotations` | Requires keys under `metadata.annotations`. |

## Implementation steps

1. Extend CLI parsing to support `validate`, `check`, `graph`, and `init` commands.
2. Add `--config` and `--force` flags.
3. Add config discovery and merge logic.
4. Add `ciy init` file generation.
5. Add policy rule evaluation and plug it into catalog validation.
6. Add graph builder and text/JSON output formatting.
7. Update help and README documentation.
8. Add unit tests for CLI parsing, config, policies, and graph behavior.
9. Add integration tests for `init`, `check`, `graph`, and policy failures.
10. Run full verification and push the PR branch.
