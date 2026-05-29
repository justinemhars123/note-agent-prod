const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        ignores: ['node_modules/**', 'coverage/**', 'public/js/vendor/**']
    },
    // ESLint configuration file itself
    {
        files: ['eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        }
    },
    // Backend files config (CommonJS)
    {
        files: ['server.js', 'helpers/**/*.js', 'routes/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                fetch: 'readonly',
                AbortController: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly'
            }
        },
        plugins: {
            prettier: prettier
        },
        rules: {
            ...prettierConfig.rules,
            'prettier/prettier': 'error',
            'no-console': [
                'warn',
                {
                    allow: ['warn', 'error', 'log']
                }
            ],
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_'
                }
            ],
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],
            'curly': 'error',
            'brace-style': ['error', '1tbs']
        }
    },
    // Frontend files config (ES Modules)
    {
        files: ['public/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.serviceworker
            }
        },
        plugins: {
            prettier: prettier
        },
        rules: {
            ...prettierConfig.rules,
            'prettier/prettier': 'error',
            'no-console': [
                'warn',
                {
                    allow: ['warn', 'error', 'log']
                }
            ],
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_'
                }
            ],
            'prefer-const': 'error',
            'no-var': 'error',
            'eqeqeq': ['error', 'always'],
            'curly': 'error',
            'brace-style': ['error', '1tbs']
        }
    },
    // Test files config
    {
        files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
];
