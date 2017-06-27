/**
 * Copyright (c) 2016-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports = {
  extends: [
    './packages/eslint-config-fb-strict/index.js',
    'plugin:import/errors',
  ],
  parser: 'babel-eslint',
  rules: {
    'computed-property-spacing': 0,
    'flowtype/boolean-style': 2,
    'flowtype/no-primitive-constructor-types': 2,
    'flowtype/require-valid-file-annotation': 2,
    'max-len': 0,
    'no-multiple-empty-lines': 1,
    'import/no-duplicates': 2,
    'import/no-unresolved': [2, { ignore: ['^types/'] }],
    // This has to be disabled until all type and module imports are combined
    // https://github.com/benmosher/eslint-plugin-import/issues/645
    'import/order': 0,
    // These has to be disabled until the whole code base is converted to ESM
    'import/default': 0,
    'import/named': 0,
  },
  plugins: ['markdown', 'import'],
  overrides: [
    // to make it more suitable for running on code examples in docs/ folder
    {
      files: ['*.md'],
      rules: {
        'react/react-in-jsx-scope': 0,
        'react/jsx-no-undef': 0,
        'jest/no-focused-tests': 0,
        'jest/valid-expect': 0,
        'jest/no-identical-title': 0,
        'no-undef': 0,
        'no-unused-vars': 0,
        'consistent-return': 0,
        'import/no-unresolved': 0,
        'sort-keys': 0
      },
    },
    {
      files: ['examples/**/*'],
      rules: {
        'babel/func-params-comma-dangle': 0,
        'import/order': 0,
        'import/no-unresolved': [2, { 'ignore': ['^react-native$'] }]
      },
    },
    {
      files: ['scripts/**/*', 'integration_tests/**/*'],
      rules: {
        'babel/func-params-comma-dangle': 0,
      },
    },
  ],
};
