module.exports = {
  'extends': 'airbnb',
  'installedESLint': true,
  'plugins': [
    'jsx-a11y',
  ],
  'rules': {
    'semi': ['error', 'never'],
    'no-multi-spaces': 0,
    'key-spacing': ['error', {'align': 'value'}],
    'new-cap': 0,
    'no-nested-ternary': 0,
    'no-console': 0,
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'arrow-parens': ['error', 'as-needed'],
    'comma-dangle': ['error', {
        arrays:    'always-multiline',
        objects:   'always-multiline',
        imports:   'always-multiline',
        exports:   'always-multiline',
        functions: 'ignore',
    }]

  },
}
