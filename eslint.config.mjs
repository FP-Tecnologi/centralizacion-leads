import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  {
    // Vireo (plantilla comercial de terceros) trae estos issues en su
    // propio código base; se bajan a "warn" para no bloquear CI por deuda
    // técnica heredada, sin desactivarlos (siguen visibles en el output).
    rules: {
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'prefer-const': 'warn',
      'react/jsx-no-comment-textnodes': 'warn',
    },
  },
];

export default eslintConfig;
