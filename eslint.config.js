const globals = require('globals');

module.exports = [
    {
        ignores: ['node_modules/', 'coverage/', '.git/']
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.browser
            }
        },
        rules: {
            'no-undef': 'error',
            'no-unreachable': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-empty': ['warn', { 'allowEmptyCatch': true }]
        }
    }
];
