import { spawnSync } from 'node:child_process';

const MINIMUM_COVERAGE = 95;

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-?]*[ -/]*[@-~]/gu;

const result = spawnSync(process.execPath, ['--test', '--experimental-test-coverage'], {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exitCode = result.status ?? 1;
} else {
  const output = stripAnsi(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  const match = output.match(/all files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|/iu);
  if (!match) {
    console.error('Unable to find all-files coverage row in test coverage output');
    process.exitCode = 1;
  } else {
    const metrics = {
      line: Number(match[1]),
      branch: Number(match[2]),
      function: Number(match[3]),
    };
    for (const [name, value] of Object.entries(metrics)) {
      if (value < MINIMUM_COVERAGE) {
        console.error(`${name} coverage ${value.toFixed(2)}% is below ${MINIMUM_COVERAGE}%`);
        process.exitCode = 1;
      }
    }
  }
}

function stripAnsi(value) {
  return value.replace(ANSI_PATTERN, '');
}
