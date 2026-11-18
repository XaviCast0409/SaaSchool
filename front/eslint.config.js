// ESLint (configuración plana). Se ejecuta en el CI: `pnpm lint`.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'public/sw.js', 'stats.html'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Errores reales de hooks (hooks condicionales): siempre error
      'react-hooks/rules-of-hooks': 'error',
      // Dependencias de efectos: aviso (a veces se omiten a propósito)
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Código existente con `any` en tipos de terceros: aviso, no bloquea
      '@typescript-eslint/no-explicit-any': 'warn',
      // Límites de tamaño y complejidad para componentes y funciones: aviso, no bloquea
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 15],
    },
  },
);
