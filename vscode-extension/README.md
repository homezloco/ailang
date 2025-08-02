# AILang Language Support for VS Code

This extension provides rich language support for AILang files in VS Code, including syntax highlighting, code completion, validation, and more.

## Features

- **Syntax Highlighting**: Full support for AILang syntax with color coding for different language elements.
- **Code Completion**: Intelligent code suggestions for AILang keywords, layer types, and parameters.
- **Validation**: Real-time validation of AILang code with helpful error messages and warnings.
- **Hover Information**: Quick documentation on hover for AILang elements.
- **Formatting**: Format AILang code with consistent indentation and style.
- **Snippets**: Handy code snippets for common AILang patterns.

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open the Extensions view
3. Search for "AILang"
4. Click "Install"

## Usage

### Opening AILang Files

Files with the `.ail` extension will automatically be recognized as AILang files and have syntax highlighting and other features enabled.

### Commands

- **AILang: Validate File** - Validates the current AILang file and shows any errors or warnings.
- **AILang: Format File** - Formats the current AILang file according to style guidelines.

### Configuration

The following settings are available for the AILang extension:

- `ailang.validation.enable` - Enable/disable validation (default: true)
- `ailang.format.enable` - Enable/disable formatting (default: true)
- `ailang.lint.enable` - Enable/disable linting (default: true)
- `ailang.trace.server` - Traces the communication between VS Code and the AILang language server (default: "off")
- `ailang.path` - Path to the AILang executable (default: null)
- `ailang.configPath` - Path to the AILang configuration file (default: null)

## Extension Settings

Include your extension settings in your `settings.json` file:

```json
{
    "ailang.validation.enable": true,
    "ailang.format.enable": true,
    "ailang.lint.enable": true,
    "ailang.trace.server": "off",
    "ailang.path": null,
    "ailang.configPath": null
}
```

## Requirements

- VS Code 1.70.0 or higher
- Node.js 14.x or higher (for development)

## Development

### Setup

1. Clone the repository
2. Run `npm install` in the extension directory
3. Open the folder in VS Code
4. Press F5 to start debugging

### Build

To build the extension, run:

```bash
npm run compile
```

### Package

To create a VSIX package for distribution:

```bash
npm install -g vsce
vsce package
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
