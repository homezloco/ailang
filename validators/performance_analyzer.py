"""
Performance analyzer for AILang code.

This module provides performance analysis and optimization suggestions
for AILang model definitions.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Set
import math

@dataclass
class PerformanceIssue:
    """Represents a performance issue found in the code."""
    message: str
    line: int = 0
    col: int = 0
    code: str = ""
    severity: str = "warning"  # 'warning' or 'suggestion'
    suggestion: Optional[str] = None

class PerformanceAnalyzer:
    """Analyzes AILang code for performance issues and optimization opportunities."""
    
    def __init__(self):
        self.issues: List[PerformanceIssue] = []
        self.layer_counts: Dict[str, int] = {}
        self.activation_counts: Dict[str, int] = {}
        self.param_counts: Dict[str, int] = {}
        self.total_params = 0
        self.has_batch_norm = False
        self.has_dropout = False
        self.has_learning_rate_schedule = False
        self.current_layer_type = None
        self.current_layer_name = None
    
    def analyze(self, ast: dict) -> List[Dict]:
        """
        Analyze the AST for performance issues.
        
        Args:
            ast: The abstract syntax tree to analyze
            
        Returns:
            List of performance issues found
        """
        self.issues = []
        self._reset_state()
        self._visit_node(ast)
        self._post_process_analysis()
        
        # Convert issues to dictionaries
        return [{
            'type': 'performance',
            'severity': issue.severity,
            'code': issue.code or 'P1000',
            'message': issue.message,
            'line': issue.line,
            'col': issue.col,
            'suggestion': issue.suggestion
        } for issue in self.issues]
    
    def _reset_state(self):
        """Reset the analyzer's state for a new analysis."""
        self.layer_counts = {}
        self.activation_counts = {}
        self.param_counts = {}
        self.total_params = 0
        self.has_batch_norm = False
        self.has_dropout = False
        self.has_learning_rate_schedule = False
        self.current_layer_type = None
        self.current_layer_name = None
    
    def _visit_node(self, node: dict):
        """Dispatch to the appropriate visitor method based on node type."""
        if not isinstance(node, dict) or 'type' not in node:
            return
        
        node_type = node['type']
        method_name = f'_visit_{node_type}'
        visitor = getattr(self, method_name, self._generic_visit)
        return visitor(node)
    
    def _generic_visit(self, node: dict):
        """Default visitor for node types without a specific handler."""
        # Recursively visit child nodes
        for value in node.values():
            if isinstance(value, dict):
                self._visit_node(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        self._visit_node(item)
    
    def _visit_ModelDef(self, node: dict):
        """Visit a model definition node."""
        self._generic_visit(node)
    
    def _visit_LayerDef(self, node: dict):
        """Visit a layer definition node."""
        self.current_layer_type = node.get('layer_type')
        self.current_layer_name = node.get('name')
        
        # Update layer counts
        self.layer_counts[self.current_layer_type] = self.layer_counts.get(self.current_layer_type, 0) + 1
        
        # Check for potential issues based on layer type
        self._analyze_layer(node)
        
        # Count parameters for this layer
        self._count_layer_parameters(node)
        
        # Check for activation functions
        activation = node.get('params', {}).get('activation')
        if activation:
            self.activation_counts[activation] = self.activation_counts.get(activation, 0) + 1
        
        self._generic_visit(node)
        
        self.current_layer_type = None
        self.current_layer_name = None
    
    def _analyze_layer(self, node: dict):
        """Analyze a layer for performance issues."""
        params = node.get('params', {})
        
        if self.current_layer_type == 'dense':
            units = params.get('units')
            if units and units > 4096:
                self.issues.append(PerformanceIssue(
                    f"Large dense layer with {units} units may be inefficient",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='P1001',
                    suggestion="Consider using a smaller number of units or a different architecture"
                ))
        
        elif self.current_layer_type == 'conv2d':
            kernel_size = params.get('kernel_size', [3, 3])
            if isinstance(kernel_size, list) and any(k > 5 for k in kernel_size):
                self.issues.append(PerformanceIssue(
                    f"Large kernel size {kernel_size} may be inefficient",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='P1002',
                    suggestion="Consider using smaller kernel sizes (3x3 or 5x5) with more layers"
                ))
        
        elif self.current_layer_type == 'batch_norm':
            self.has_batch_norm = True
            
            # Check if batch norm is used after activation
            prev_layer = self._find_previous_layer(node)
            if prev_layer and prev_layer.get('params', {}).get('activation'):
                self.issues.append(PerformanceIssue(
                    "BatchNorm should typically come before activation functions",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='P1003',
                    suggestion="Place BatchNorm layers before activation functions"
                ))
        
        elif self.current_layer_type == 'dropout':
            self.has_dropout = True
            rate = params.get('rate', 0.5)
            
            if rate > 0.5:
                self.issues.append(PerformanceIssue(
                    f"High dropout rate ({rate}) may lead to underfitting",
                    node.get('line', 0),
                    node.get('col', 0),
                    code='P1004',
                    suggestion="Consider using a lower dropout rate (0.2-0.5)"
                ))
    
    def _count_layer_parameters(self, node: dict):
        """Estimate the number of parameters in a layer."""
        if not self.current_layer_type:
            return
            
        params = node.get('params', {})
        layer_params = 0
        
        if self.current_layer_type == 'dense':
            input_units = params.get('input_dim')
            units = params.get('units')
            if input_units and units:
                layer_params = input_units * units + units  # weights + biases
        
        elif self.current_layer_type == 'conv2d':
            filters = params.get('filters')
            kernel_size = params.get('kernel_size', [3, 3])
            input_channels = params.get('input_shape', [0, 0, 0])[2] if 'input_shape' in params else 3
            
            if isinstance(kernel_size, int):
                kernel_size = [kernel_size, kernel_size]
            
            if filters and kernel_size and input_channels:
                # (kernel_h * kernel_w * input_channels + 1) * filters
                layer_params = (kernel_size[0] * kernel_size[1] * input_channels + 1) * filters
        
        elif self.current_layer_type in ['batch_norm', 'layer_norm']:
            # 4 parameters per feature: gamma, beta, moving_mean, moving_variance
            layer_params = 4 * params.get('units', 0)
        
        self.param_counts[self.current_layer_name or f"{self.current_layer_type}_{len(self.param_counts)}"] = layer_params
        self.total_params += layer_params
    
    def _find_previous_layer(self, node: dict) -> Optional[dict]:
        """Find the previous layer in the model."""
        # This is a simplified implementation - in a real implementation,
        # you'd need to traverse the AST to find the previous layer
        return None
    
    def _post_process_analysis(self):
        """Perform any post-processing after the full AST has been visited."""
        # Check for lack of batch normalization
        if not self.has_batch_norm and self.layer_counts.get('dense', 0) > 1:
            self.issues.append(PerformanceIssue(
                "Consider adding batch normalization for better training stability",
                code='P1100',
                severity='suggestion'
            ))
        
        # Check for lack of dropout
        if not self.has_dropout and self.total_params > 1000000:  # 1M parameters
            self.issues.append(PerformanceIssue(
                "Consider adding dropout to prevent overfitting in large models",
                code='P1101',
                severity='suggestion'
            ))
        
        # Check for overuse of activation functions
        for act, count in self.activation_counts.items():
            if count > 5 and act in ['relu', 'leaky_relu']:
                self.issues.append(PerformanceIssue(
                    f"Multiple ({count}) {act} activations may lead to dying ReLU problem",
                    code='P1102',
                    severity='suggestion',
                    suggestion=f"Consider using LeakyReLU or other variants to avoid dead neurons"
                ))
                break
        
        # Check total parameter count
        if self.total_params > 100000000:  # 100M parameters
            self.issues.append(PerformanceIssue(
                f"Large model with {self.total_params:,} parameters may be difficult to train",
                code='P1103',
                severity='warning',
                suggestion="Consider model pruning, quantization, or architecture search"
            ))
        
        # Check for imbalanced layer distribution
        if len(self.layer_counts) > 3:
            max_layers = max(self.layer_counts.values())
            for layer_type, count in self.layer_counts.items():
                if count > 5 and count > 2 * (sum(self.layer_counts.values()) / len(self.layer_counts)):
                    self.issues.append(PerformanceIssue(
                        f"Potential imbalance: {count} {layer_type} layers detected",
                        code='P1104',
                        severity='suggestion',
                        suggestion=f"Consider a more balanced architecture with different layer types"
                    ))
                    break
