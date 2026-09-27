import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', '.claude', '.claude-flow', '.swarm'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      // The ported code is intentionally loosely typed (see src/model/game/types.ts).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  // Layers: model (state, rules, world generation), view (drawing, windows, audio) and
  // controller (loop, input, wiring). The model knows nothing of views and controllers, views never
  // drive the game, and core is shared by everyone.
  {
    files: ['src/model/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/view/**', '**/controller/**'],
              message: 'The model must not import views or controllers: use core/ports.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/view/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/controller/**'], message: 'Views must not import controllers.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/model/**', '**/view/**', '**/controller/**'],
              message: 'core is shared: it imports no layer.',
            },
          ],
        },
      ],
    },
  },
);
