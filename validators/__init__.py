"""
AILang Validators

This package provides validation utilities for AILang code, including:
- Syntax validation
- Semantic validation
- Type checking
- Performance analysis
- Best practices checking
- Code style enforcement
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union, Any
import json
import re
import ast

from .semantic_analyzer import SemanticAnalyzer
from .performance_analyzer import PerformanceAnalyzer

class AILangValidator:
    """Base class for AILang validators."""
    
    def __init__(self, config_path: Optional[Union[str, Path]] = None):
        """Initialize the validator with optional configuration."""
        self.config = self._load_config(config_path)
        self.errors: List[Dict] = []
        self.warnings: List[Dict] = []
    
    def _load_config(self, config_path: Optional[Union[str, Path]]) -> dict:
        """Load validation configuration from a JSON file."""
        default_config = {
            "max_line_length": 120,
            "indent_size": 2,
            "allowed_imports": ["tensorflow", "torch", "numpy"],
            "required_sections": ["model", "train"],
            "deprecated_constructs": {
                "layers": ["simple_rnn"],  # Example: prefer LSTM/GRU over SimpleRNN
                "optimizers": ["sgd"],     # Example: prefer Adam/RMSprop over SGD
            },
            "naming_conventions": {
                "model_name": r'^[A-Z][a-zA-Z0-9]*$',  # PascalCase
                "variable_names": r'^[a-z][a-z0-9_]*$',  # snake_case
            }
        }
        
        if not config_path:
            return default_config
            
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                # Merge with defaults
                return {**default_config, **config}
        except (FileNotFoundError, json.JSONDecodeError):
            return default_config
    
    def validate(self, code: str, file_path: Optional[Union[str, Path]] = None) -> Tuple[bool, List[Dict]]:
        """
        Validate AILang code.
        
        Args:
            code: The AILang code to validate
            file_path: Optional path to the source file (for better error reporting)
            
        Returns:
            Tuple of (is_valid, issues) where issues is a list of errors and warnings
        """
        self.errors = []
        self.warnings = []
        
        # Reset state for this validation run
        self._prepare_validation()
        
        # Run all validation methods
        self._validate_syntax(code, file_path)
        
        # Only proceed with deeper analysis if syntax is valid
        if not self.errors:
            # Parse the AST for semantic analysis
            ast = self._parse_ast(code, file_path)
            
            if ast is not None:
                # Run semantic analysis
                semantic_analyzer = SemanticAnalyzer()
                semantic_ok, semantic_issues = semantic_analyzer.analyze(ast)
                
                # Run performance analysis
                performance_analyzer = PerformanceAnalyzer()
                performance_issues = performance_analyzer.analyze(ast)
                
                # Combine all issues
                all_issues = semantic_issues + performance_issues
                
                # Categorize issues into errors and warnings
                for issue in all_issues:
                    if issue.get('type') == 'error':
                        self.errors.append(issue)
                    else:
                        self.warnings.append(issue)
        
        # Run additional validations
        self._validate_structure(code, file_path)
        self._validate_naming_conventions(code, file_path)
        self._validate_best_practices(code, file_path)
        
        return len(self.errors) == 0, self.errors + self.warnings
    
    def _prepare_validation(self):
        """Prepare for a new validation run."""
        # Reset any state from previous validations
        pass
    
    def _parse_ast(self, code: str, file_path: Optional[Union[str, Path]] = None) -> Optional[Dict]:
        """Parse AILang code into an AST."""
        try:
            # This is a simplified example - in a real implementation,
            # you would use your actual AILang parser here
            return {
                'type': 'ModelDef',
                'name': 'ExampleModel',
                'body': [
                    # Example AST structure - replace with actual parser output
                    {'type': 'LayerDef', 'layer_type': 'dense', 'params': {'units': 64}},
                    {'type': 'LayerDef', 'layer_type': 'dropout', 'params': {'rate': 0.5}},
                ]
            }
        except Exception as e:
            self.errors.append({
                'type': 'error',
                'code': 'E1050',
                'message': f'Failed to parse AILang code: {str(e)}',
                'file': str(file_path) if file_path else '<string>',
                'line': 0,
                'col': 0
            })
            return None
    
    def _validate_syntax(self, code: str, file_path: Optional[Union[str, Path]] = None):
        """Validate basic syntax of AILang code."""
        # Check for required sections
        for section in self.config.get("required_sections", []):
            if f"{section}:" not in code.lower():
                self.errors.append({
                    "type": "error",
                    "code": "E1001",
                    "message": f"Missing required section: {section}",
                    "file": str(file_path) if file_path else "<string>",
                    "line": 0,
                    "col": 0
                })
        
        # Check for common syntax errors
        if "model:" not in code.lower():
            self.errors.append({
                "type": "error",
                "code": "E1002",
                "message": "Missing 'model' section",
                "file": str(file_path) if file_path else "<string>",
                "line": 0,
                "col": 0
            })
        
        # Check for unbalanced brackets, quotes, etc.
        for char in ['{', '}', '[', ']', '(', ')']:
            if code.count(char) % 2 != 0:
                self.errors.append({
                    'type': 'error',
                    'code': 'E1003',
                    'message': f'Unbalanced {char} character',
                    'file': str(file_path) if file_path else '<string>',
                    'line': code.count('\n', 0, code.find(char)) + 1,
                    'col': code.find(char) - code.rfind('\n', 0, code.find(char))
                })
    
    def _validate_structure(self, code: str, file_path: Optional[Union[str, Path]] = None):
        """Validate the structure of the AILang code."""
        lines = code.split('\n')
        in_model_section = False
        in_layers_section = False
        indent_stack = []
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
                
            # Track indentation
            indent = len(line) - len(line.lstrip())
            
            # Check for model section
            if stripped.lower().startswith('model'):
                in_model_section = True
                if not re.match(r'^model\s+[A-Z]\w*\s*:', line.strip()):
                    self.errors.append({
                        "type": "error",
                        "code": "E1003",
                        "message": "Model name must be in PascalCase",
                        "file": str(file_path) if file_path else "<string>",
                        "line": i,
                        "col": 0
                    })
            
            # Check layer definitions
            if in_model_section and 'layers:' in stripped.lower():
                in_layers_section = True
                
            if in_layers_section and stripped.endswith(':'):
                # This is a layer definition
                layer_type = stripped[:-1].strip()
                if layer_type.lower() in self.config.get("deprecated_constructs", {}).get("layers", []):
                    self.warnings.append({
                        "type": "warning",
                        "code": "W1001",
                        "message": f"Deprecated layer type: {layer_type}",
                        "file": str(file_path) if file_path else "<string>",
                        "line": i,
                        "col": 0,
                        "suggestion": f"Consider using a more modern alternative to {layer_type}"
                    })
    
    def _validate_naming_conventions(self, code: str, file_path: Optional[Union[str, Path]] = None):
        """Validate naming conventions in the AILang code."""
        # Extract model name
        model_match = re.search(r'^model\s+([A-Za-z0-9_]+)', code, re.MULTILINE)
        if model_match:
            model_name = model_match.group(1)
            if not re.match(self.config["naming_conventions"]["model_name"], model_name):
                self.warnings.append({
                    "type": "warning",
                    "code": "W1002",
                    "message": f"Model name '{model_name}' doesn't follow naming convention",
                    "file": str(file_path) if file_path else "<string>",
                    "line": code[:model_match.start()].count('\n') + 1,
                    "col": model_match.start(1) - model_match.start(),
                    "suggestion": f"Rename to {model_name.title()}"
                })
    
    def _validate_best_practices(self, code: str, file_path: Optional[Union[str, Path]] = None):
        """Validate best practices in the AILang code."""
        # Check for learning rate
        lr_match = re.search(r'learning_rate\s*:\s*([0-9.]+)', code, re.IGNORECASE)
        if lr_match:
            lr = float(lr_match.group(1))
            if lr > 0.01:
                self.warnings.append({
                    "type": "warning",
                    "code": "W1003",
                    "message": f"High learning rate detected: {lr}",
                    "file": str(file_path) if file_path else "<string>",
                    "line": code[:lr_match.start()].count('\n') + 1,
                    "col": lr_match.start(),
                    "suggestion": "Consider using a lower learning rate (e.g., 0.001) with learning rate scheduling"
                })
        
        # Check for missing dropout/batch normalization
        if 'dropout' not in code.lower() and 'batch_norm' not in code.lower():
            self.warnings.append({
                "type": "warning",
                "code": "W1004",
                "message": "No regularization (dropout/batch normalization) detected",
                "file": str(file_path) if file_path else "<string>",
                "line": 0,
                "col": 0,
                "suggestion": "Consider adding dropout or batch normalization to prevent overfitting"
            })


class AILintError(Exception):
    """Base exception for AILang validation errors."""
    pass


def validate_ailang(code: str, config_path: Optional[Union[str, Path]] = None) -> Tuple[bool, List[Dict]]:
    """
    Validate AILang code.
    
    Args:
        code: The AILang code to validate
        config_path: Optional path to a configuration file
        
    Returns:
        Tuple of (is_valid, issues) where issues is a list of errors and warnings
    """
    validator = AILangValidator(config_path)
    return validator.validate(code)
