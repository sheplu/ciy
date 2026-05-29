import { buildCatalogGraph } from '../graph.js';
import { initProject } from '../init.js';
import { applyConfig } from '../config.js';
import { parseArgs, UsageError } from './args.js';
import { getHelpText } from './help.js';
import { formatGraphReport, formatInitReport, formatReport } from './output.js';
import { VERSION } from '../version.js';
import { validateCatalog } from '../catalog/validate-catalog.js';
import type { ValidationOptions } from '../types.js';

interface CliIO {
  cwd: () => string;
  stdout: Pick<NodeJS.WriteStream, 'write'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
}

export async function main(argv = process.argv.slice(2), io: CliIO = process): Promise<number> {
  try {
    const parsedOptions = parseArgs(argv, io.cwd());

    if (parsedOptions.help) {
      io.stdout.write(getHelpText());
      return 0;
    }

    if (parsedOptions.version) {
      io.stdout.write(`${VERSION}\n`);
      return 0;
    }

    if (parsedOptions.command === 'init') {
      const report = await initProject(parsedOptions.root, parsedOptions.force);
      const output = formatInitReport(report, parsedOptions.format);
      const target = report.ok ? io.stdout : io.stderr;
      target.write(output);
      return report.ok ? 0 : 1;
    }

    const options = await applyConfig(parsedOptions);

    if (options.command === 'graph') {
      const report = await buildCatalogGraph(options as ValidationOptions);
      const output = formatGraphReport(report, options.format);
      const target = report.ok ? io.stdout : io.stderr;
      target.write(output);
      return report.ok ? 0 : 1;
    }

    const report = await validateCatalog(options as ValidationOptions);
    const output = formatReport(report, options.format);
    const target = report.ok ? io.stdout : io.stderr;
    target.write(output);
    return report.ok ? 0 : 1;
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr.write(`${error.message}\n\n${getHelpText()}`);
      return error.exitCode;
    }

    io.stderr.write(`Unexpected error: ${formatUnexpectedError(error)}\n`);
    return 3;
  }
}

function formatUnexpectedError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
