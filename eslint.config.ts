import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// ─── ESLint flat config: TypeScript · Vue · Prettier ─────────────────────────
export default tseslint.config(
    { ignores: ['dist/', 'src-tauri/', 'node_modules/'] },

    // ── TypeScript ────────────────────────────────────────────────────────────
    ...tseslint.configs.recommended,

    // ── Vue ───────────────────────────────────────────────────────────────────
    ...pluginVue.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
    },

    // ── Project rules ─────────────────────────────────────────────────────────
    {
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },

    // ── Prettier — disables conflicting format rules, must be last ─────────────
    prettier,
);
