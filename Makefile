.PHONY: help install test lint format validate clean

# Variables
PYTHON = python
PIP = pip
VALIDATOR = $(PYTHON) -m validators.cli
TEST_DIR = tests
SRC_DIR = validators
EXAMPLES_DIR = examples

# Help message
default: help
help:
	@echo "AILang Build System"
	@echo "==================="
	@echo "Available targets:"
	@echo "  help         - Show this help message"
	@echo "  install      - Install development dependencies"
	@echo "  test         - Run all tests"
	@echo "  lint         - Run linter"
	@echo "  format       - Format code"
	@echo "  validate     - Validate AILang files"
	@echo "  clean        - Remove build artifacts"

# Installation
install:
	$(PIP) install -e .[dev]
	$(PIP) install pre-commit
	pre-commit install

# Testing
test:
	$(PYTHON) -m pytest $(TEST_DIR) -v --cov=$(SRC_DIR) --cov-report=term-missing

# Linting
lint:
	$(PYTHON) -m flake8 $(SRC_DIR) $(TEST_DIR)
	$(PYTHON) -m mypy $(SRC_DIR) $(TEST_DIR)

# Formatting
format:
	$(PYTHON) -m black $(SRC_DIR) $(TEST_DIR) $(EXAMPLES_DIR)
	$(PYTHON) -m isort $(SRC_DIR) $(TEST_DIR) $(EXAMPLES_DIR)

# Validation
validate:
	@echo "Validating AILang files..."
	@find . -name "*.ail" -not -path "*/.venv/*" -not -path "*/build/*" | xargs -I {} sh -c 'echo "Validating {}" && $(VALIDATOR) {} || exit 255'

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.py[co]" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf build
	rm -rf dist
	rm -rf *.egg-info

# Pre-commit hook configuration
.PHONY: pre-commit-install
pre-commit-install:
	pre-commit install --install-hooks

# CI/CD pipeline configuration
.PHONY: ci-test
ci-test: lint test validate

# Local development setup
.PHONY: dev
setup: install pre-commit-install

# Build distribution package
.PHONY: dist
dist: clean
	$(PYTHON) setup.py sdist bdist_wheel

# Upload to PyPI (requires twine)
.PHONY: upload
upload: dist
	twine upload dist/*
