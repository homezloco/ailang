# AILang

AILang is a domain-specific language (DSL) designed for defining and training neural network models with a clean, intuitive syntax. This project includes a compiler, transpiler, and runtime system to make it easy to work with neural networks across different platforms.

## Features

- **Clean, Python-like syntax** for defining neural network architectures
- **Multi-platform support** with transpilation to Python, C++, and JavaScript
- **Built-in validation** for model architecture and best practices
- **Extensible runtime system** with support for different backends
- **VS Code extension** for syntax highlighting, validation, and IntelliSense

## Project Structure

```
ailang/
├── compiler/           # Core compiler components
│   ├── lexer.py       # Lexical analysis
│   ├── parser.py      # Syntax parsing
│   ├── ir.py          # Intermediate representation
│   └── transpiler/    # Target language transpilers
│       ├── py_transpiler.py
│       ├── cpp_transpiler.py
│       └── js_transpiler.py
├── runtime/           # Runtime implementations
│   ├── py/            # Python runtime (Keras/TensorFlow)
│   ├── cpp/           # C++ runtime (planned)
│   └── js/            # JavaScript runtime (planned)
├── vscode-extension/  # VS Code language support
│   ├── client/        # VS Code extension client
│   └── server/        # Language server
├── examples/          # Example AILang models
├── tests/             # Test suite
└── validators/        # Validation and analysis tools
```

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+ (for VS Code extension development)
- pip (Python package manager)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ailang.git
   cd ailang
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Install development dependencies (for VS Code extension):
   ```bash
   cd vscode-extension
   npm install
   ```

### Using the CLI

Compile an AILang model to Python:
```bash
python -m cli compile examples/mymodel.ail --target python
```

Run a model directly:
```bash
python -m cli run examples/mymodel.ail
```

### VS Code Extension

1. Open the `vscode-extension` folder in VS Code
2. Press F5 to start debugging the extension
3. Open an `.ail` file to see syntax highlighting and validation

## Language Reference

### Basic Syntax

```python
model MyModel {
    # Define input shape
    Input(shape=(28, 28, 1))
    
    # Add layers
    Conv2D(filters=32, kernel_size=3, activation='relu')
    MaxPooling2D(pool_size=2)
    
    # Add dropout for regularization
    Dropout(0.25)
    
    # Flatten and add dense layers
    Flatten()
    Dense(128, activation='relu')
    Dense(10, activation='softmax')
    
    # Compile with optimizer and loss
    compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
}
```

## Development

### Building the Project

1. Install development dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```

2. Run tests:
   ```bash
   pytest
   ```

3. Build the VS Code extension:
   ```bash
   cd vscode-extension
   npm run compile
   ```

### Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Keras, PyTorch, and other deep learning frameworks
- Built with ❤️ by the AILang team
