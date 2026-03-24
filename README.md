# Petal

A minimal text editor built with [Tauri 2](https://v2.tauri.app/), [Vue 3](https://vuejs.org/), and TypeScript.

Petal is a lightweight notepad that does one thing — open, edit, and save plain text files. No tabs, no plugins, no bloat. Built as a learning project to explore Tauri's desktop capabilities.

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

## Development

```bash
# Install dependencies
npm install

# Run in development mode (launches the Tauri window with hot reload)
npm run dev
```

## Building

```bash
# Build for the current platform
npm run tauri:build
```

Built binaries are output to `src-tauri/target/release/bundle/`.

## Scripts

| Script                   | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `npm run dev`            | Start Tauri dev mode with hot reload                    |
| `npm run build`          | Type-check and build the frontend                       |
| `npm run tauri:build`    | Build the full desktop app                              |
| `npm run lint`           | Run ESLint                                              |
| `npm run format`         | Format with Prettier                                    |
| `npm run type-check`     | Run `vue-tsc --noEmit`                                  |
| `npm run test`           | Run Vitest                                              |
| `npm run ci:check`       | Full CI pipeline: lint, format, type-check, build, test |
| `npm run icons:generate` | Regenerate app icons from `src/assets/icon.svg`         |

## Project Structure

```
src/                  Vue 3 frontend
  App.vue             Single-component notepad UI
  main.ts             Vue app entry point
  style.scss          Global styles + CSS variables
src-tauri/            Tauri / Rust backend
  src/lib.rs          IPC commands (read_text_file, write_text_file) + window setup
  src/main.rs         Application entry point
  tauri.conf.json     Tauri configuration
  capabilities/       Permission scoping for the main window
tests/                Vitest component tests
```

## License

[MIT](LICENSE)
