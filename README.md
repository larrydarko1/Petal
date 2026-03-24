# Petal

![License](https://img.shields.io/github/license/larrydarko1/Petal)
![Issues](https://img.shields.io/github/issues/larrydarko1/Petal)
![Pull Requests](https://img.shields.io/github/issues-pr/larrydarko1/Petal)

If you find Petal useful, consider [giving it a star ⭐](https://github.com/larrydarko1/Petal) — thank you!

Petal is a **minimal plain-text editor** for desktop, built with [Tauri 2](https://v2.tauri.app/), [Vue 3](https://vuejs.org/), and **TypeScript**. Open, edit, and save `.txt` files — nothing more. No tabs, no plugins, no bloat.

# Demo

![Petal Demo](src/assets/demo.png)

## Features

- **New / Open / Save / Save As** — standard file operations via native OS dialogs
- **Unsaved changes prompt** — warns before discarding edits
- **Keyboard shortcuts** — `⌘/Ctrl+N`, `⌘/Ctrl+O`, `⌘/Ctrl+S`, `⌘/Ctrl+Shift+S`
- **Dark mode** — follows system preference automatically
- **Draggable toolbar** — native window drag region
- **Cross-platform** — macOS, Windows, Linux

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://www.rust-lang.org/tools/install)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

## Getting Started

1. **Clone the repository**

```sh
git clone https://github.com/larrydarko1/Petal.git
cd Petal
```

2. **Install dependencies**

```sh
npm install
```

3. **Run in development mode**

```sh
npm run dev
```

## Testing & Code Quality

```sh
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint source code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Check formatting
npm run format:check

# Auto-format source code
npm run format
```

Tests live in the `tests/` directory. The CI pipeline runs lint, format check, type-check, build, and tests in that order — use `npm run ci:check` to run the full sequence locally.

## Building for Production

```sh
# Build for your current platform
npm run tauri:build
```

Built installers are output to `src-tauri/target/release/bundle/`:

- **macOS:** `.dmg` installer + `.app` bundle
- **Windows:** `.exe` installer (NSIS) + `.msi`
- **Linux:** `.deb`, `.AppImage`

## Tech Stack

- **Desktop:** Tauri 2 (native macOS, Windows, Linux app)
- **Frontend:** Vue 3, TypeScript, SCSS
- **Backend:** Rust — IPC commands for file system access
- **Build tool:** [Vite](https://vitejs.dev)
- **Testing:** [Vitest](https://vitest.dev) + [Vue Test Utils](https://test-utils.vuejs.org)
- **Linting:** [ESLint](https://eslint.org) (flat config) + [typescript-eslint](https://typescript-eslint.io) + [Prettier](https://prettier.io)

## Project Structure

```
petal/
├── src/                        # Vue 3 frontend
│   ├── App.vue                 # Single-component editor UI
│   ├── main.ts                 # Vue app entry point
│   ├── style.scss              # Global styles and CSS variables
│   ├── vite-env.d.ts           # Vite environment type declarations
│   └── assets/
│       ├── demo.png            # Demo screenshot
│       └── icon.svg            # App icon (SVG)
├── src-tauri/                  # Tauri / Rust backend
│   ├── src/
│   │   ├── lib.rs              # IPC commands (read_text_file, write_text_file) + window setup
│   │   └── main.rs             # Application entry point
│   ├── capabilities/
│   │   └── default.json        # Permission scoping for the main window
│   ├── icons/                  # App icons for all platforms
│   ├── gen/schemas/            # Auto-generated Tauri capability schemas
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── tests/                      # Vitest component tests
│   └── App.test.ts
├── scripts/
│   └── generate-icons.js       # Icon generation helper
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline (lint, type-check, test, build)
│       └── release.yml         # Release / distribution workflow
├── .husky/                     # Git hooks (pre-commit, commit-msg)
├── commitlint.config.ts        # Commit message linting rules
├── eslint.config.ts            # ESLint flat config
├── vite.config.ts              # Vite build configuration
├── vitest.config.ts            # Vitest test configuration
├── tsconfig.json               # TypeScript config (app)
└── tsconfig.node.json          # TypeScript config (Node / build scripts)
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
