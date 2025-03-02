# @nivalis/linter

[![npm version](https://img.shields.io/npm/v/@nivalis/linter.svg)](https://www.npmjs.com/package/@nivalis/linter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Lint your code with Biome and ESLint at once

## Overview

@nivalis/linter is a unified linting tool that combines the power of [Biome](https://biomejs.dev/) and [ESLint](https://eslint.org/) into a single, streamlined interface. Instead of running these linters separately, you can use @nivalis/linter to run both simultaneously and get consolidated results.

## Features

- ✅ **Unified Interface**: Run both Biome and ESLint with a single command
- 🔄 **Merged Results**: Get consolidated linting results from both tools
- 🛠️ **Auto-fixing**: Automatically fix linting issues with the `--fix` flag
- 🔍 **Debug Mode**: Get performance metrics and detailed error information
- ⚡ **Performance**: Optimized for speed with caching enabled

## Installation

```bash
# Using npm
npm install --save-dev @nivalis/linter

# Using yarn
yarn add --dev @nivalis/linter

# Using pnpm
pnpm add --save-dev @nivalis/linter

# Using bun
bun add --dev @nivalis/linter
```

## Usage

```bash
# Basic usage
npx nivalis-linter "src/**/*.{js,ts,jsx,tsx}"

# With auto-fixing
npx nivalis-linter "src/**/*.{js,ts,jsx,tsx}" --fix

# With debug mode
npx nivalis-linter "src/**/*.{js,ts,jsx,tsx}" --debug

# Allow unsafe fixes
npx nivalis-linter "src/**/*.{js,ts,jsx,tsx}" --fix --unsafe
```

## Configuration

@nivalis/linter uses your existing ESLint and Biome configurations. It will automatically detect:

- ESLint configuration files (`.eslintrc.*`, `eslint.config.js`)
- Biome configuration file (`biome.json`)

If no configuration is found, default configurations will be used.

## Options

| Option    | Description                       | Default |
|-----------|-----------------------------------|---------|
| `--fix`   | Automatically fix linting issues  | `false` |
| `--debug` | Run in debug mode                 | `false` |
| `--unsafe`| Allow unsafe fixes                | `false` |

## Why Use @nivalis/linter?

- **Save Time**: Run both linters at once instead of separately
- **Unified Output**: Get consolidated results in a single format
- **Best of Both Worlds**: Benefit from both Biome's and ESLint's capabilities
- **Simplified Workflow**: Integrate with your existing development process

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)
