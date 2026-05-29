import type { GraphReport, InitReport, Issue, OutputFormat, Report } from '../types.js';

export function formatReport(report: Report, format: OutputFormat = 'text'): string {
  if (format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  return formatTextReport(report);
}

export function formatGraphReport(report: GraphReport, format: OutputFormat = 'text'): string {
  if (format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines: string[] = [];
  lines.push(report.ok ? 'Catalog graph built' : 'Catalog graph has missing declarations');
  lines.push('');
  lines.push(`Root: ${report.root}`);
  lines.push(`Nodes: ${report.nodes.length}`);
  lines.push(`Edges: ${report.edges.length}`);

  if (report.edges.length > 0) {
    lines.push('');
    lines.push('Edges:');
    for (const edge of report.edges) {
      lines.push(`- ${edge.from} -> ${edge.to}`);
    }
  }

  appendIssueSection(lines, 'Missing:', report.missing);
  appendIssueSection(lines, 'Undeclared:', report.undeclared);
  appendIssueSection(lines, 'Warnings:', report.warnings);

  return `${lines.join('\n')}\n`;
}

export function formatInitReport(report: InitReport, format: OutputFormat = 'text'): string {
  if (format === 'json') {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines: string[] = [];
  lines.push(report.ok ? 'Project initialized' : 'Project initialization failed');
  if (report.created.length > 0) {
    lines.push('');
    lines.push('Created:');
    for (const file of report.created) {
      lines.push(`- ${file}`);
    }
  }
  if (report.skipped.length > 0) {
    lines.push('');
    lines.push('Skipped:');
    for (const file of report.skipped) {
      lines.push(`- ${file}`);
    }
  }
  appendIssueSection(lines, 'Errors:', report.errors);
  return `${lines.join('\n')}\n`;
}

function formatTextReport(report: Report): string {
  const lines: string[] = [];
  lines.push(report.ok ? 'Catalog validation passed' : 'Catalog validation failed');
  lines.push('');
  lines.push(`Files checked: ${report.files.length}`);

  appendIssueSection(lines, 'Errors:', report.errors);
  appendIssueSection(lines, 'Warnings:', report.warnings);

  return `${lines.join('\n')}\n`;
}

function appendIssueSection(lines: string[], title: string, issues: Issue[]): void {
  if (issues.length === 0) {
    return;
  }

  lines.push('');
  lines.push(title);
  for (const issue of issues) {
    lines.push(`- ${formatIssue(issue)}`);
  }
}

function formatIssue(issue: Issue): string {
  const document = issue.document === undefined ? '' : `#document[${issue.document}]`;
  return `${issue.file}${document} ${issue.path}: ${issue.message}`;
}
