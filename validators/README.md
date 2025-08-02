# AILang Validator

A comprehensive validation suite for AILang code that ensures code quality, enforces best practices, and helps maintain consistency across projects.

## Features

- **Syntax Validation**: Checks for correct AILang syntax and structure
- **Best Practices**: Enforces coding standards and best practices
- **Custom Rules**: Configurable validation rules via JSON configuration
- **Integration**: Seamless integration with build systems and CI/CD pipelines
- **Pre-commit Hooks**: Automatically validate code before each commit
- **Detailed Reporting**: Clear error messages with suggestions for fixes

## Installation

```bash
# Install the package in development mode
pip install -e .

# Install pre-commit hooks
pre-commit install
```

## Usage

### Command Line

```bash
# Validate a single file
python -m validators.cli path/to/your/model.ail

# Validate multiple files
python -m validators.cli models/*.ail

# Validate with JSON output
python -m validators.cli --format json model.ail

# Use a custom configuration
python -m validators.cli -c config.json model.ail
```

### Programmatic API

```python
from validators import validate_ailang

code = """
model MyModel:
  input_shape: [28, 28, 1]
  
  layers:
    - type: dense
      units: 128
      activation: relu
"""

is_valid, issues = validate_ailang(code)

if not is_valid:
    for issue in issues:
        print(f"{issue['type'].upper()}: {issue['message']}")
        if 'suggestion' in issue:
            print(f"  Suggestion: {issue['suggestion']}")
```

## Configuration

Create a JSON configuration file to customize validation rules:

```json
{
  "max_line_length": 120,
  "indent_size": 2,
  "required_sections": ["model", "train"],
  "deprecated_constructs": {
    "layers": ["simple_rnn"],
    "optimizers": ["sgd"]
  },
  "naming_conventions": {
    "model_name": "^[A-Z][a-zA-Z0-9]*$",
    "variable_names": "^[a-z][a-z0-9_]*$"
  }
}
```

## Pre-commit Hook

The included pre-commit hook will automatically validate your AILang files before each commit. To enable it:

1. Install pre-commit: `pip install pre-commit`
2. Run `pre-commit install` in your repository

## GitHub Actions

Add the following to your GitHub Actions workflow to validate AILang files in CI:

```yaml
name: Validate AILang

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -e .
    - name: Validate AILang files
      run: |
        python -m validators.cli **/*.ail
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=validators --cov-report=term-missing
```

### Linting and Formatting

```bash
# Run linter
flake8 validators tests

# Format code
black validators tests
isort validators tests
```

## License

MIT
