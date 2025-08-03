# AILang

AILang is an evolving domain-specific language (DSL) designed to simplify AI/ML development through a clean, intuitive syntax. It provides a unified interface for defining, training, evaluating, and deploying machine learning models, with a strong focus on LLM orchestration and agent-based workflows.

## 🌟 Key Features

### Core Capabilities
- **Model Definition**: Intuitive syntax for neural network architectures
- **Multi-Platform**: Transpiles to Python, C++, and JavaScript
- **LLM Agent Orchestration**: Built-in support for agent and tool definitions
- **Pipeline Design**: Visual workflow composition for data and model pipelines
- **Training & Evaluation**: Integrated training loops and evaluation metrics

### Developer Experience
- **VS Code Extension**: Full language support with IntelliSense
- **Validation & Linting**: Real-time feedback on model architecture
- **Interactive REPL**: Test models and agents interactively
- **Visualization**: Graph-based visualization of models and pipelines

### Deployment
- **Cloud-Native**: Export to Docker, Kubernetes, and serverless
- **Edge Ready**: Optimized for edge deployment
- **WebAssembly**: Run models directly in the browser

## 🏗️ Project Structure

```
ailang/
├── core/               # Core compiler infrastructure
│   ├── parser/         # Lark grammar & tokenizer
│   ├── ir/             # Intermediate representation
│   ├── transpilers/    # Language transpilers (Python, JS, C++, etc.)
│   └── runtime/        # Execution environment
├── cli/                # Command-line interface
│   └── main.py         # `ailang` CLI entrypoint
├── stdlib/             # Standard library components
│   ├── layers/        # Built-in neural network layers
│   ├── agents/        # Predefined agent templates
│   └── tools/         # Common tools for agents
├── examples/           # Example projects
│   ├── models/        # Example model definitions
│   ├── pipelines/     # Data processing pipelines
│   └── agents/        # Agent-based examples
├── playground/         # Interactive playground (web-based)
├── vscode-extension/   # VS Code language support
│   ├── client/        # Extension UI components
│   └── server/        # Language server implementation
├── tests/             # Test suite
├── docs/              # Documentation
└── validators/        # Validation and analysis tools
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+ (for VS Code extension)
- pip (Python package manager)
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ailang.git
   cd ailang
   ```

2. Set up a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install development dependencies:
   ```bash
   pip install -r requirements-dev.txt
   cd vscode-extension
   npm install
   ```

5. Install the CLI tool in development mode:
   ```bash
   pip install -e .
   ```

## 🛠️ Usage

### Basic Commands

Compile an AILang model to Python:
```bash
ailang compile examples/models/cnn.ail --target python
```

Train a model:
```bash
ailang train examples/train_config.ail
```

Start the interactive REPL:
```bash
ailang repl
```

### VS Code Extension

1. Install the AILang extension from the VS Code marketplace
2. Open any `.ail` file for syntax highlighting and IntelliSense
3. Use the command palette (`Ctrl+Shift+P`) to access AILang commands

### Example: Simple Neural Network

```python
# Define a simple CNN model
model MNIST_CNN {
    # Input layer
    Input(shape=(28, 28, 1))
    
    # Feature extraction
    Conv2D(filters=32, kernel_size=3, activation='relu')
    MaxPooling2D(pool_size=2)
    Dropout(0.25)
    
    # Classification head
    Flatten()
    Dense(128, activation='relu')
    Dense(10, activation='softmax')
    
    # Training configuration
    train {
        optimizer: 'adam',
        loss: 'sparse_categorical_crossentropy',
        metrics: ['accuracy'],
        epochs: 5,
        batch_size: 32
    }
}
```

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

## 🛠 Development

### Building from Source

1. Clone and set up the development environment:
   ```bash
   git clone https://github.com/yourusername/ailang.git
   cd ailang
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -e .[dev]
   ```

2. Run tests:
   ```bash
   pytest
   ```

3. Build the VS Code extension:
   ```bash
   cd vscode-extension
   npm install
   npm run compile
   ```

## 🚀 Roadmap

### Phase 1: Core MVP (Current)
- [x] Model definition syntax
- [x] Basic transpilation to Python
- [x] VS Code extension with syntax highlighting
- [ ] Training pipeline integration
- [ ] Basic validation and linting

### Phase 2: Training & Evaluation
- [ ] Training configuration blocks
- [ ] Built-in evaluation metrics
- [ ] Dataset management
- [ ] Pipeline chaining

### Phase 3: LLM Agent Orchestration
- [ ] Agent definition syntax
- [ ] Tool integration
- [ ] Conversation flow DSL
- [ ] RAG support

### Future Phases
- Modular pipeline support
- Cloud deployment tools
- Web playground
- Advanced visualization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Keras, PyTorch, and modern ML frameworks
- Built with ❤️ by the AILang community

## 🌐 Community

Join our community to get help and contribute:

- [GitHub Discussions](https://github.com/yourusername/ailang/discussions)
- [Discord Channel](#) (coming soon)
- [Twitter](#) (coming soon)

## 📚 Resources

- [Documentation](https://ailang.dev/docs) (coming soon)
- [Examples](examples/README.md)
- [API Reference](#) (coming soon)
