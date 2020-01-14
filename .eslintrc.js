module.exports = {
  env: {
    node: true
  },
  parserOptions: {
    ecmaVersion: 11,
  },
  'extends': 'airbnb-base',
  rules: {
    camelcase: 'off',
    'semi': ['error', 'never'],
    'no-reserved-keys': 0,
    'no-multi-spaces': 0,
    'key-spacing': ['error', {'align': 'value'}],
    'new-cap': 0,
    'no-nested-ternary': 0,
    'no-console': 0,
    'no-void': 0,
    'consistent-return': ['error', { treatUndefinedAsUnspecified: true }],
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'arrow-parens': ['error', 'as-needed'],
    'require-await': 'error',
    'comma-dangle': ['error', {
        arrays:    'always-multiline',
        objects:   'always-multiline',
        imports:   'always-multiline',
        exports:   'always-multiline',
        functions: 'ignore',
    }],
    'object-curly-newline': ['error', {
      ObjectExpression:  { minProperties: 8, multiline: true, consistent: true },
      ObjectPattern:     { minProperties: 8, multiline: true, consistent: true },
      ImportDeclaration: { minProperties: 8, multiline: true, consistent: true },
      ExportDeclaration: { minProperties: 8, multiline: true, consistent: true },
    }],
  },
}
