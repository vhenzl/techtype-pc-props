// @ts-check

import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  stylistic.configs.customize({
    semi: true,
    braceStyle: '1tbs',
  }),
  {
    rules: {
      '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'never', avoidEscape: true }],
      '@stylistic/operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
    },
  },
);
