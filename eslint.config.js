import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    files: ['client/service-worker.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        VERSION: 'readonly',
        PRECACHE: 'readonly',
        caches: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'tmp/**',
      'client/src/components/ui/**',
      'client/src/hooks/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
