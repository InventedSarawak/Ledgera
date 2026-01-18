import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import prettier from 'eslint-plugin-prettier'

export default [
    {
        ignores: [
            'node_modules/**',
            '**/node_modules/**',
            'dist/**',
            '**/dist/**',
            'build/**',
            '**/build/**',
            '.turbo/**',
            '**/.turbo/**',
            '.next/**',
            '**/.next/**',
            'out/**',
            '**/out/**',
            '**/*.config.js',
            '**/webpack/**/*.js'
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            }
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier
        },
        rules: {
            'prettier/prettier': 'error',
            'no-console': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn'
        }
    }
]
