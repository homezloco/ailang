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
- **VS Code Extension**: Full language support with IntelliSense, diagnostics, and refactoring tools
- **Validation & Linting**: Real-time feedback on model architecture and best practices
- **Interactive REPL**: Test models and agents interactively
- **Visualization**: Graph-based visualization of models and pipelines

### Deployment
- **Cloud-Native**: Export to Docker, Kubernetes, and serverless
- **Edge Ready**: Optimized for edge deployment
- **WebAssembly**: Run models directly in the browser

## 💪 Benefits for Developers and AI Agents

### Benefits for Developers
- **Simplified AI/ML Development**
  - Intuitive syntax that abstracts away framework complexity
  - Reduced boilerplate code for common ML patterns
  - Faster prototyping and iteration cycles
- **Enhanced Developer Experience**
  - Rich IDE support with real-time diagnostics and suggestions
  - Intelligent validation of model architecture and parameters
  - Advanced refactoring tools for model optimization
- **Cross-Platform Compatibility**
  - Write once, deploy to multiple ML frameworks
  - Consistent API across different environments
  - Seamless deployment from edge to cloud
- **Learning Curve Reduction**
  - Standardized patterns for common ML tasks
  - Self-documenting model structure
  - Built-in ML best practices

### Benefits for AI Agents
- **Structured Model Definition**
  - Formal grammar that's easier for AI to parse and generate
  - Clear semantic structure for model components
  - Built-in validation rules for generating valid code
- **Agent Orchestration Support**
  - First-class support for defining AI agents and capabilities
  - Native syntax for tool integration
  - Specialized constructs for conversation flows
- **Code Generation Advantages**
  - Compact representation requiring fewer tokens
  - Strong typing reduces invalid code generation
  - Standardized syntax for predictable outputs

### Future Growth Potential
- **Technical Expansion**
  - Enhanced integration with emerging ML frameworks
  - Support for cutting-edge model architectures
  - Domain-specific extensions for specialized AI tasks
- **Ecosystem Development**
  - Growing library of pre-built components
  - Expanding community contributions
  - Enterprise adoption and industry-specific implementations
- **AI Integration Opportunities**
  - Preferred interface for AI-assisted ML development
  - Standard language for defining and deploying AI agents
  - Native support for LLM orchestration and fine-tuning
- **Educational Impact**
  - Accessible syntax for teaching ML concepts
  - Potential adoption in academic settings
  - Easier knowledge transfer across expertise levels

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
2. Open any `.ail` file for syntax highlighting, diagnostics, and IntelliSense
3. Use the command palette (`Ctrl+Shift+P`) to access AILang commands

The extension provides:
- **Real-time diagnostics** for missing parameters, type errors, model architecture issues, and best practices
- **Code completion** for AILang keywords, layer types, and parameters with context-aware suggestions
- **Hover information** with comprehensive documentation for language elements and parameters
- **Formatting** with configurable indentation and style options
- **Code snippets** for common AILang patterns and model architectures
- **Advanced refactoring tools** including:
  - Hyperparameter optimization
  - Adding regularization techniques
  - Converting between model types
  - Extracting model components
  - Adding data augmentation
  - Quick fixes for common issues

For developers contributing to the extension, a comprehensive test suite validates all features including activation, diagnostics, completion, hover functionality, and refactoring tools.

### Example: Simple Classification Model

```python
# Define a simple classification model
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

### Example: Convolutional Neural Network (CNN)

```python
# Define a CNN model for image classification
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

### Example: Recurrent Neural Network (RNN) for Text

```python
# Define an RNN model for text classification
model TextRNN {
  Input(shape=(100,))
  Embedding(input_dim=10000, output_dim=128)
  LSTM(units=64, return_sequences=true)
  LSTM(units=32)
  Dense(units=64, activation='relu')
  Dropout(rate=0.3)
  Dense(units=1, activation='sigmoid')
}

compile optimizer='rmsprop' loss='binary_crossentropy' metrics=['accuracy']
fit epochs=5 batch_size=32 validation_split=0.2
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

### Layer Types

AILang supports a wide range of layer types for different neural network architectures:

#### Core Layers
- `Input`: Define input shape and type
- `Dense`: Fully connected layer
- `Dropout`: Regularization layer
- `Flatten`: Reshape layer
- `Reshape`: Change tensor dimensions

#### Convolutional Layers
- `Conv1D`, `Conv2D`, `Conv3D`: Convolutional layers
- `MaxPooling1D`, `MaxPooling2D`, `MaxPooling3D`: Max pooling layers
- `AveragePooling1D`, `AveragePooling2D`, `AveragePooling3D`: Average pooling layers
- `BatchNormalization`: Batch normalization layer

#### Recurrent Layers
- `SimpleRNN`: Basic recurrent layer
- `LSTM`: Long Short-Term Memory layer
- `GRU`: Gated Recurrent Unit layer
- `Bidirectional`: Bidirectional wrapper for RNNs

#### Embedding Layers
- `Embedding`: Word embedding layer

#### Attention Layers
- `Attention`: Basic attention mechanism
- `MultiHeadAttention`: Transformer-style attention

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

4. Package the VS Code extension:
   ```bash
   npm install -g vsce
   vsce package
   ```

### VS Code Extension Development

The VS Code extension is built using TypeScript and the VS Code Extension API. It includes:

1. **Language Server**: Provides language features like diagnostics, completion, and hover
2. **Client**: Handles VS Code integration and UI components
3. **Formatter**: Formats AILang code according to style guidelines
4. **Code Actions**: Provides refactoring tools and quick fixes

To debug the extension:
1. Open the extension folder in VS Code
2. Press F5 to launch a new VS Code instance with the extension loaded
3. Open an AILang file to test the extension features

## 🚀 Roadmap

### Phase 1: Core MVP (Current)
- [x] Model definition syntax
- [x] Basic transpilation to Python
- [x] VS Code extension with syntax highlighting
- [x] Comprehensive diagnostics and validation
- [x] Code completion and hover information
- [x] Advanced refactoring tools
- [x] Robust test suite for extension features
- [ ] Training pipeline integration

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

### Documentation
- [AILang Official Documentation](https://ailang.dev/docs) (coming soon)
- [API Reference](https://ailang.dev/api) (coming soon)
- [Examples](examples/README.md)

### Tutorials
- [Getting Started with AILang](https://ailang.dev/tutorials/getting-started) (coming soon)
- [Building Your First Neural Network](https://ailang.dev/tutorials/first-nn) (coming soon)
- [Advanced Model Architectures](https://ailang.dev/tutorials/advanced) (coming soon)

### External Resources
- [TensorFlow Documentation](https://www.tensorflow.org/api_docs)
- [Keras Documentation](https://keras.io/api/)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)
- [Deep Learning Specialization](https://www.coursera.org/specializations/deep-learning)
- [Neural Network Architectures Cheat Sheet](https://towardsdatascience.com/the-mostly-complete-chart-of-neural-networks-explained-3fb6f2367464)
