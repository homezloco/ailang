# AILang Language Support for VS Code

This extension provides rich language support for AILang files in VS Code, including syntax highlighting, code completion, validation, diagnostics, and more.

## Features

- **Syntax Highlighting**: Full support for AILang syntax with color coding for different language elements.
- **Code Completion**: Intelligent code suggestions for AILang keywords, layer types, and parameters.
  - Context-aware suggestions based on model architecture
  - Parameter type and value hints
  - Documentation in completion items
- **Diagnostics**: Real-time validation of AILang code with helpful error messages and warnings.
  - Missing parameter detection
  - Type checking for model parameters
  - Invalid value detection
  - Unclosed model detection
  - Architecture validation (layer compatibility)
  - Best practices recommendations
- **Hover Information**: Comprehensive documentation on hover for AILang elements and parameters.
  - Layer descriptions and parameter details
  - Type information and default values
  - Usage examples and best practices
- **Formatting**: Format AILang code with consistent indentation and style.
  - Configurable indentation
  - Trailing whitespace handling
  - Final newline options
- **Snippets**: Handy code snippets for common AILang patterns.
  - Model templates
  - Layer configurations
  - Training setups
- **Code Actions**: Advanced refactoring tools and quick fixes.
  - Convert between model types
  - Add regularization techniques
  - Extract model components
  - Optimize hyperparameters
  - Add data augmentation
  - Fix common issues

## Benefits for Developers

This extension enhances your AILang development experience with:

- **Simplified AI/ML Development**
  - Intuitive syntax highlighting and completion reduces cognitive load
  - Real-time diagnostics catch errors before runtime
  - Snippets accelerate common model creation patterns

- **Enhanced Productivity**
  - Hover documentation provides instant reference without leaving the editor
  - Code formatting ensures consistent, readable AILang code
  - Quick fixes automatically resolve common issues

- **Learning Support**
  - Context-sensitive suggestions help learn the AILang syntax
  - Detailed error messages explain validation issues
  - Example snippets demonstrate best practices

## Benefits for AI Agents

AILang and this extension provide advantages for AI-assisted development:

- **Structured Code Generation**
  - Formal grammar makes it easier for AI to generate valid AILang code
  - Strong typing and validation reduces invalid code generation
  - Standardized syntax leads to more predictable outputs

- **Agent Development Support**
  - First-class support for defining AI agents and their capabilities
  - Native syntax for tool integration and conversation flows
  - Specialized constructs for agent orchestration

## Future Roadmap

We're continuously improving the AILang extension with planned features including:

- **Debugging Support**: Interactive debugging for AILang models
- **Framework Integration**: Direct integration with TensorFlow, PyTorch, and other ML frameworks
- **Visualization Tools**: In-editor visualization of model architecture and training metrics
- **Advanced Refactoring**: More sophisticated model optimization and refactoring tools
- **Collaborative Features**: Enhanced support for team-based AILang development

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` to open the Extensions view
3. Search for "AILang"
4. Click "Install"

## Usage

### Opening AILang Files

Files with the `.ail` extension will automatically be recognized as AILang files and have syntax highlighting and other features enabled.

### Commands

The extension provides several commands that can be accessed via the Command Palette (`Ctrl+Shift+P`):

- **AILang: Validate File** - Validates the current AILang file and shows any errors or warnings.
- **AILang: Format File** - Formats the current AILang file according to style guidelines.
- **AILang: Add Model Template** - Inserts a model template at the cursor position.
- **AILang: Add Layer** - Inserts a layer at the cursor position.
- **AILang: Add Compile Statement** - Inserts a compile statement at the cursor position.
- **AILang: Convert to Sequential Model** - Converts the current model to a sequential model.
- **AILang: Debug Info** - Shows debug information about the extension.

### Code Snippets

Type these prefixes to access code snippets:

- `model` - Create a new model
- `layer` - Add a layer
- `compile` - Add a compile statement
- `fit` - Add a fit statement
- `cnn` - Create a CNN model template
- `rnn` - Create an RNN model template
- `lstm` - Create an LSTM model template

### Configuration

The following settings are available for the AILang extension:

- `ailang.validation.enable` - Enable/disable validation (default: true)
- `ailang.validation.strict` - Enable strict validation mode (default: false)
- `ailang.validation.checkNamingConventions` - Check for naming convention violations (default: true)
- `ailang.validation.checkDeprecated` - Check for usage of deprecated features (default: true)
- `ailang.format.enable` - Enable/disable formatting (default: true)
- `ailang.format.indentSize` - Number of spaces for indentation (default: 2)
- `ailang.format.insertFinalNewline` - Insert final newline (default: true)
- `ailang.format.trimTrailingWhitespace` - Trim trailing whitespace (default: true)
- `ailang.lint.enable` - Enable/disable linting (default: true)
- `ailang.lint.rules.requireDocumentation` - Require documentation for models (default: false)
- `ailang.lint.rules.requireFit` - Require fit statement in model (default: false)
- `ailang.hover.enable` - Enable/disable hover (default: true)
- `ailang.hover.showExamples` - Show examples in hover (default: true)
- `ailang.completion.enable` - Enable/disable code completion (default: true)
- `ailang.completion.showDocumentation` - Show documentation in completion items (default: true)
- `ailang.trace.server` - Traces the communication between VS Code and the AILang language server (default: "off")
- `ailang.path` - Path to the AILang executable (default: null)
- `ailang.configPath` - Path to the AILang configuration file (default: null)
- `ailang.experimental.enableAdvancedValidation` - Enable advanced validation features (default: false)
- `ailang.experimental.enableTypeChecking` - Enable experimental type checking (default: false)

## Extension Settings

Include your extension settings in your `settings.json` file:

```json
{
    "ailang.validation.enable": true,
    "ailang.format.enable": true,
    "ailang.lint.enable": true,
    "ailang.hover.enable": true,
    "ailang.completion.enable": true,
    "ailang.trace.server": "off",
    "ailang.path": null,
    "ailang.configPath": null,
    "ailang.experimental.enableAdvancedValidation": false,
    "ailang.experimental.enableTypeChecking": false
}
```

## Examples

### Simple Classification Model

```
model SimpleClassifier {
  Input(shape=(28, 28, 1))
  Flatten()
  Dense(units=128, activation='relu')
  Dropout(rate=0.2)
  Dense(units=10, activation='softmax')
}

compile optimizer='adam' loss='categorical_crossentropy' metrics=['accuracy']
fit epochs=10 batch_size=32 validation_split=0.2
```

### Convolutional Neural Network (CNN)

```
model CNN {
  Input(shape=(32, 32, 3))
  
  # Convolutional layers
  Conv2D(filters=32, kernel_size=(3, 3), activation='relu', padding='same')
  BatchNormalization()
  MaxPooling2D(pool_size=(2, 2))
  
  Conv2D(filters=64, kernel_size=(3, 3), activation='relu', padding='same')
  BatchNormalization()
  MaxPooling2D(pool_size=(2, 2))
  
  # Fully connected layers
  Flatten()
  Dense(units=128, activation='relu')
  Dropout(rate=0.5)
  Dense(units=10, activation='softmax')
}

# Training configuration
compile optimizer='adam' loss='categorical_crossentropy' metrics=['accuracy']
fit epochs=20 batch_size=64 validation_split=0.2
```

## Requirements

- VS Code 1.75.0 or higher
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

### Testing

The extension includes comprehensive tests for all major features:

- Extension activation tests
- Syntax highlighting tests
- Completion provider tests
- Diagnostic provider tests (missing parameters, type errors, invalid values, unclosed models)
- Hover provider tests
- File handling tests
- Edge case handling tests
- Error recovery tests

To run the tests:

```bash
npm test
```

For simpler tests that don't require the VS Code API:

```bash
npm run test:simple
```

The test suite uses VS Code's extension testing API to validate functionality in a real VS Code environment.

### Package

To create a VSIX package for distribution:

```bash
npm install -g vsce
vsce package
```

## Troubleshooting

### Common Issues

1. **Extension not activating**: Make sure your file has a `.ail` extension or set the language mode to AILang manually.
2. **Formatter not working**: Check that formatting is enabled in your settings and that the file is recognized as an AILang file.
3. **Diagnostics not showing**: Verify that validation is enabled in your settings.

### Debugging

Use the `AILang: Debug Info` command to get information about the extension's state, including:
- Extension activation status
- Language server status
- File recognition
- Configuration settings

## External Resources

- [AILang Official Documentation](https://ailang.dev/docs) (coming soon)
- [AILang GitHub Repository](https://github.com/yourusername/ailang)
- [TensorFlow Documentation](https://www.tensorflow.org/api_docs)
- [Keras Documentation](https://keras.io/api/)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
