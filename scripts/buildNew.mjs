import {existsSync} from 'node:fs';
import * as path from 'path';
import chalk from 'chalk';
import {build} from 'tsdown';
import {getPackages} from './buildUtils.mjs';

const packages = getPackages();
const root = process.cwd();

const extraEndpoints = [
  ['packages/jest-worker', './src/workers/processChild.ts'],
  ['packages/jest-worker', 'src/workers/threadChild.ts'],
  ['packages/jest-haste-map', './src/worker.ts'],
  ['packages/jest-reporters', './src/CoverageWorker.ts'],
  ['packages/jest-runner', './src/testWorker.ts'],
  ['packages/jest-circus', './src/legacy-code-todo-rewrite/jestAdapterInit.ts'],
  ['packages/jest-jasmine2', './src/jasmine/jasmineLight.ts'],
  ['packages/jest-jasmine2', './src/jestExpect.ts'],
  ['packages/jest-jasmine2', './src/setup_jest_globals.ts'],
  ['packages/jest-snapshot', './src/worker.ts'],
];

for (const {packageDir, pkg} of packages) {
  console.log(chalk.green.bold(`Building package '${pkg.name}'`));

  const entry = pkg.name === 'jest-circus' ? 'src/runner.ts' : 'src/index.ts';
  if (!existsSync(path.join(packageDir, entry))) {
    console.warn(
      chalk.yellow.bold(
        `Skipping package '${pkg.name}' because it is not a TypeScript package.`,
      ),
    );
    continue;
  }
  if (pkg.name === '@jest/globals') {
    console.warn(
      chalk.yellow.bold(
        `Skipping package '${pkg.name}' because it does not require a build.`,
      ),
    );
    continue;
  }

  await build({
    clean: true,
    cwd: packageDir,
    dts: true,
    entry: [entry],
    external: [
      '@jest/globals',
      'fsevents',
      'jest-pnp-resolver',
      'unrs-resolver',
    ],
    format: ['esm', 'cjs'],
    outDir: 'build/',
    target: 'node18',
  });
}

for (const [packageDir, entry] of extraEndpoints) {
  await build({
    clean: false,
    cwd: path.join(root, packageDir),
    dts: true,
    entry: [entry],
    external: [
      '@jest/globals',
      'fsevents',
      'jest-pnp-resolver',
      'unrs-resolver',
    ],
    format: ['esm', 'cjs'],
    outDir: 'build/',
    target: 'node18',
  });
}
