"""
Semantic analyzer for AILang code.

This module provides semantic analysis capabilities for AILang code,
including type checking, variable resolution, and other static analyses.
"""

from typing import Dict, List, Optional, Set, Union, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum, auto
import re

class AIType:
    """Base class for AILang types."""
    def __eq__(self, other):
        return isinstance(other, type(self))
    
    def __str__(self):
        return self.__class__.__name__

class TensorType(AIType):
    """Type for tensors with shape information."""
    def __init__(self, shape: Optional[List[Union[int, str]]] = None, dtype: str = 'float32'):
        self.shape = shape or []
        self.dtype = dtype
    
    def __eq__(self, other):
        if not isinstance(other, TensorType):
            return False
        # For shapes, we consider them equal if they have the same length
        # and all non-None dimensions match
        if len(self.shape) != len(other.shape):
            return False
        for s1, s2 in zip(self.shape, other.shape):
            if s1 is not None and s2 is not None and s1 != s2:
                return False
        return self.dtype == other.dtype
    
    def __str__(self):
        shape_str = '[' + ', '.join(str(d) for d in self.shape) + ']' if self.shape else '[]'
        return f"Tensor{shape_str}:{self.dtype}"

class FunctionType(AIType):
    """Type for functions with parameter and return types."""
    def __init__(self, params: List[AIType], returns: AIType):
        self.params = params
        self.returns = returns
    
    def __eq__(self, other):
        if not isinstance(other, FunctionType):
            return False
        return all(p1 == p2 for p1, p2 in zip(self.params, other.params)) and \
               self.returns == other.returns
    
    def __str__(self):
        params_str = ', '.join(str(p) for p in self.params)
        return f"({params_str}) -> {self.returns}"

class SymbolTable:
    """Symbol table for tracking variables and their types."""
    def __init__(self, parent: Optional['SymbolTable'] = None):
        self.parent = parent
        self.symbols: Dict[str, AIType] = {}
    
    def define(self, name: str, type_: AIType) -> None:
        """Define a new symbol in the current scope."""
        self.symbols[name] = type_
    
    def resolve(self, name: str) -> Optional[AIType]:
        """Resolve a symbol, checking parent scopes if not found."""
        if name in self.symbols:
            return self.symbols[name]
        if self.parent is not None:
            return self.parent.resolve(name)
        return None

@dataclass
class SemanticError:
    """Represents a semantic error in the AILang code."""
    message: str
    line: int = 0
    col: int = 0
    code: str = ""
    suggestion: Optional[str] = None

class SemanticAnalyzer:
    """Performs semantic analysis on AILang code."""
    
    def __init__(self):
        self.errors: List[SemanticError] = []
        self.warnings: List[SemanticError] = []
        self.symbol_table = SymbolTable()
        self._initialize_builtins()
    
    def _initialize_builtins(self):
        """Initialize built-in types and functions."""
        # Tensor types
        self.symbol_table.define("Tensor", TensorType())
        self.symbol_table.define("float32", TensorType(dtype='float32'))
        self.symbol_table.define("float64", TensorType(dtype='float64'))
        self.symbol_table.define("int32", TensorType(dtype='int32'))
        
        # Common activation functions
        for func in ['relu', 'sigmoid', 'tanh', 'softmax', 'softplus', 'softsign',
                    'selu', 'elu', 'exponential', 'leaky_relu', 'prelu', 'swish']:
            self.symbol_table.define(
                func,
                FunctionType([TensorType()], TensorType())
            )
    
    def analyze(self, ast: dict) -> Tuple[bool, List[Dict]]:
        """
        Perform semantic analysis on the AST.
        
        Args:
            ast: The abstract syntax tree to analyze
            
        Returns:
            Tuple of (is_valid, issues) where issues is a list of errors and warnings
        """
        self.errors = []
        self.warnings = []
        
        # Start analysis from the root of the AST
        self._visit_node(ast)
        
        # Convert errors and warnings to dictionaries
        issues = []
        for error in self.errors:
            issues.append({
                'type': 'error',
                'code': error.code or 'E2000',
                'message': error.message,
                'line': error.line,
                'col': error.col,
                'suggestion': error.suggestion
            })
        
        for warning in self.warnings:
            issues.append({
                'type': 'warning',
                'code': warning.code or 'W2000',
                'message': warning.message,
                'line': warning.line,
                'col': warning.col,
                'suggestion': warning.suggestion
            })
        
        return len(self.errors) == 0, issues
    
    def _visit_node(self, node: dict):
        """Dispatch to the appropriate visitor method based on node type."""
        node_type = node.get('type')
        method_name = f'_visit_{node_type}'
        visitor = getattr(self, method_name, self._generic_visit)
        return visitor(node)
    
    def _generic_visit(self, node: dict):
        """Default visitor for node types without a specific handler."""
        # Default implementation does nothing
        pass
    
    def _visit_ModelDef(self, node: dict):
        """Visit a model definition node."""
        model_name = node.get('name')
        
        # Check model name follows conventions
        if not re.match(r'^[A-Z][a-zA-Z0-9]*$', model_name):
            self.errors.append(SemanticError(
                f"Model name '{model_name}' should be in PascalCase",
                node.get('line', 0),
                node.get('col', 0),
                code='E2001',
                suggestion=f"Rename model to {model_name[0].upper() + model_name[1:]}"
            ))
        
        # Create a new scope for the model
        old_table = self.symbol_table
        self.symbol_table = SymbolTable(old_table)
        
        # Process the model body
        for item in node.get('body', []):
            self._visit_node(item)
        
        # Restore the previous symbol table
        self.symbol_table = old_table
    
    def _visit_LayerDef(self, node: dict):
        """Visit a layer definition node."""
        layer_type = node.get('layer_type')
        layer_name = node.get('name')
        
        # Check layer name follows conventions
        if layer_name and not re.match(r'^[a-z][a-z0-9_]*$', layer_name):
            self.warnings.append(SemanticError(
                f"Layer name '{layer_name}' should be in snake_case",
                node.get('line', 0),
                node.get('col', 0),
                code='W2001',
                suggestion='Use snake_case for layer names'
            ))
        
        # Check for deprecated layer types
        if layer_type in ['simple_rnn']:
            self.warnings.append(SemanticError(
                f"Deprecated layer type: {layer_type}",
                node.get('line', 0),
                node.get('col', 0),
                code='W2002',
                suggestion=f"Consider using a more modern alternative to {layer_type}"
            ))
        
        # Check required parameters
        if layer_type == 'conv2d':
            if 'filters' not in node.get('params', {}):
                self.errors.append(SemanticError(
                    "Missing required parameter 'filters' for conv2d layer",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='E2002'
                ))
    
    def _visit_TrainingConfig(self, node: dict):
        """Visit a training configuration node."""
        # Check learning rate
        lr = node.get('learning_rate')
        if lr is not None:
            try:
                lr_val = float(lr)
                if lr_val > 0.01:
                    self.warnings.append(SemanticError(
                        f"High learning rate: {lr_val}",
                        node.get('line', 0),
                        node.get('col', 0),
                        code='W2003',
                        suggestion="Consider using a lower learning rate with scheduling"
                    ))
            except (ValueError, TypeError):
                self.errors.append(SemanticError(
                    f"Invalid learning rate: {lr}",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='E2003'
                ))
        
        # Check optimizer
        optimizer = node.get('optimizer', '').lower()
        if optimizer in ['sgd']:  # Add other deprecated optimizers as needed
            self.warnings.append(SemanticError(
                f"Suboptimal optimizer: {optimizer}",
                node.get('line', 0),
                node.get('col', 0),
                code='W2004',
                suggestion=f"Consider using 'adam' or another modern optimizer instead of {optimizer}"
            ))
    
    def _check_type_compatibility(self, expected: AIType, actual: AIType, node: dict) -> bool:
        """Check if actual type is compatible with expected type."""
        if expected == actual:
            return True
        
        # Handle tensor compatibility (allow different shapes but same dtype)
        if (isinstance(expected, TensorType) and 
            isinstance(actual, TensorType) and 
            expected.dtype == actual.dtype):
            return True
        
        self.errors.append(SemanticError(
            f"Type mismatch: expected {expected}, got {actual}",
            node.get('line', 0),
            node.get('col', 0),
            code='E2100'
        ))
        return False
