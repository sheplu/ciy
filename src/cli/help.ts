import { VERSION } from '../version.js';

export function getHelpText(): string {
  return `ciy ${VERSION}

Validate catalog-info.yaml files and linked catalog declarations.

Usage:
  ciy validate [options]
  ciy check [options]
  ciy graph [options]
  ciy init [options]
  ciy [options]

Commands:
  validate              Validate catalog files (default command)
  check                 CI-friendly validation shortcut; fails on warnings by default
  graph                 Print the local catalog declaration graph
  init                  Create starter ciy.config.json and catalog-info.yaml files

Options:
  --root <path>          Repository root to scan (default: current directory)
  --config <path>        Config file path (default: auto-detect ciy.config.*)
  --schema <path>        JSON or YAML schema used to validate catalog documents
  --schema-preset <name> Built-in schema preset when --schema is not set (default: backstage)
  --catalog <path>       Root catalog path (default: <root>/catalog-info.yaml)
  --strict               Treat undeclared sublevel catalogs as errors
  --format <text|json>   Output format (default: text)
  --fail-on-warning      Exit with code 1 when warnings are emitted
  --force                Overwrite starter files with init
  --help                 Show this help message
  --version              Show the CLI version
`;
}
