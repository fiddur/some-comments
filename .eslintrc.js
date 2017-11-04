module.exports = {
  env: {
    node: true
  },
  parserOptions: {
    ecmaVersion: 8,
  },

  'extends': 'airbnb',
  'installedESLint': true,
  'plugins': [
    'jsx-a11y',
    'async-await',
  ],
  rules: {
    'semi': ['error', 'never'],
    'no-reserved-keys': 0,
    'no-multi-spaces': 0,
    'key-spacing': ['error', {'align': 'value'}],
    'new-cap': 0,
    'no-nested-ternary': 0,
    'no-console': 0,
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'arrow-parens': ['error', 'as-needed'],
    'require-await': 'error',
    'comma-dangle': ['error', {
        arrays:    'always-multiline',
        objects:   'always-multiline',
        imports:   'always-multiline',
        exports:   'always-multiline',
        functions: 'ignore',
    }]

  },
}
