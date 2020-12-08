module.exports = {
  "extends": "airbnb-base",
  "env": {
    "es6": true,
    "node": true,
    "mocha": true
  },
  "rules": {
    "arrow-body-style": ["error", "always"],
    "max-len": ["error", { "code": 100, "comments": 200 }],
    "no-use-before-define": ["error", { "functions": false, "classes": true }],
    "indent": ["error", 2, { "MemberExpression": 0 }],
    "global-require": "off",
    "import/no-dynamic-require": "off",
    "import/no-unresolved": [2, { "ignore": ['@.+'] }]
  }
};
