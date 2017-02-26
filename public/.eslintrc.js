module.exports = {
  eslintConfig: {
    env: {
      browser: true,
      node:    false,
    },
  },
  globals: {
    Event:          true,
    Immutable:      true,
    XMLHttpRequest: true,
    document:       true,
    markdown:       true,
    window:         true,
  },
}
