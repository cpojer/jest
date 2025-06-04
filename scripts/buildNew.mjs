import {strict as assert} from 'assert';
import * as path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import {glob} from 'glob';
import fs from 'graceful-fs';
import stripJsonComments from 'strip-json-comments';
import {build} from 'tsdown';
import {getPackagesWithTsConfig} from './buildUtils.mjs';

const packages = getPackagesWithTsConfig();
const root = process.cwd();

const {stdout: allWorkspacesString} = await execa('yarn', [
  'workspaces',
  'list',
  '--json',
]);

const workspacesWithTs = new Map(
  JSON.parse(`[${allWorkspacesString.split('\n').join(',')}]`)
    .filter(({location}) =>
      packages.some(({packageDir}) => packageDir.endsWith(location)),
    )
    .map(({location, name}) => [name, location]),
);

for (const {packageDir, pkg} of packages) {
  assert.ok(pkg.types, `Package ${pkg.name} is missing \`types\` field`);

  assert.strictEqual(
    pkg.types,
    pkg.main.replace(/\.js$/, '.d.ts'),
    `\`main\` and \`types\` field of ${pkg.name} does not match`,
  );

  const jestDependenciesOfPackage = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ]
    .filter(dep => {
      if (!workspacesWithTs.has(dep)) {
        return false;
      }

      // nothing should depend on these
      if (dep === 'jest-circus' || dep === 'jest-jasmine2') {
        return false;
      }

      // these are just `require.resolve`-ed
      if (pkg.name === 'jest-config') {
        if (dep === '@jest/test-sequencer' || dep === 'babel-jest') {
          return false;
        }
      }

      // only test files depend on '@jest/test-utils', i.e. it is always a dev dependency
      // see additional checks below
      if (dep === '@jest/test-utils') {
        return false;
      }

      return true;
    })
    .map(dep =>
      path.relative(
        packageDir,
        `${packageDir}/../../${workspacesWithTs.get(dep)}`,
      ),
    )
    .sort();

  if (jestDependenciesOfPackage.length > 0) {
    const tsConfig = JSON.parse(
      stripJsonComments(fs.readFileSync(`${packageDir}/tsconfig.json`, 'utf8')),
    );

    const references = tsConfig.references.map(({path}) => path);

    assert.deepStrictEqual(
      references,
      jestDependenciesOfPackage,
      `Expected declared references to match dependencies in package ${
        pkg.name
      }. Got:\n\n${references.join(
        '\n',
      )}\nExpected:\n\n${jestDependenciesOfPackage.join('\n')}`,
    );
  }

  let hasJestTestUtils = Object.keys(pkg.dependencies || {}).includes(
    '@jest/test-utils',
  );

  if (hasJestTestUtils) {
    throw new Error(
      chalk.red(
        `Package '${pkg.name}' declares '@jest/test-utils' as dependency, but it must be declared as dev dependency`,
      ),
    );
  }

  hasJestTestUtils = Object.keys(pkg.devDependencies || {}).includes(
    '@jest/test-utils',
  );

  const tsConfigPaths = glob.sync('**/__tests__/tsconfig.json', {
    absolute: true,
    cwd: packageDir,
  });

  const testUtilsReferences = tsConfigPaths.filter(tsConfigPath => {
    const tsConfig = JSON.parse(
      stripJsonComments(fs.readFileSync(tsConfigPath, 'utf8')),
    );

    return tsConfig.references.some(
      ({path}) => path && path.endsWith('test-utils'),
    );
  });

  if (hasJestTestUtils && testUtilsReferences.length === 0) {
    throw new Error(
      chalk.red(
        `Package '${
          pkg.name
        }' declares '@jest/test-utils' as dev dependency, but it is not referenced in:\n\n${tsConfigPaths.join(
          '\n',
        )}`,
      ),
    );
  }

  if (!hasJestTestUtils && testUtilsReferences.length > 0) {
    throw new Error(
      chalk.red(
        `Package '${
          pkg.name
        }' does not declare '@jest/test-utils' as dev dependency, but it is referenced in:\n\n${testUtilsReferences.join(
          '\n',
        )}`,
      ),
    );
  }
}

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
  ['packages/jest-repl', './src/cli/repl.ts'],
  ['packages/jest-snapshot', './src/worker.ts'],
];

for (const {packageDir, pkg} of packages) {
  console.log(chalk.green.bold(`Building package '${pkg.name}'`));

  await build({
    clean: true,
    cwd: packageDir,
    dts: true,
    entry: [pkg.name === 'jest-circus' ? 'src/runner.ts' : 'src/index.ts'],
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
