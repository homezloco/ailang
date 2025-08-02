"""AILang runtime module.

This module provides an interface for executing AILang models on different backends.
"""
from typing import Dict, Type, Any, Optional
import importlib
import os
import sys

from .base_runtime import AIRuntime

# Runtime registry mapping backend names to runtime classes
_RUNTIME_REGISTRY: Dict[str, Type[AIRuntime]] = {}

def register_runtime(backend: str, runtime_class: Type[AIRuntime]) -> None:
    """Register a runtime class for a specific backend.
    
    Args:
        backend: Name of the backend (e.g., 'python', 'javascript', 'cpp')
        runtime_class: Runtime class that implements the AIRuntime interface
    """
    _RUNTIME_REGISTRY[backend] = runtime_class

def get_runtime(backend: str, model_config: Dict[str, Any]) -> AIRuntime:
    """Get a runtime instance for the specified backend.
    
    Args:
        backend: Name of the backend (e.g., 'python', 'javascript', 'cpp')
        model_config: Model configuration dictionary
        
    Returns:
        An instance of the requested runtime
        
    Raises:
        ValueError: If the specified backend is not supported
        ImportError: If required dependencies for the backend are not installed
    """
    # Try to import the runtime module if not already registered
    if backend not in _RUNTIME_REGISTRY:
        try:
            module_name = f"runtime.{backend}.runtime"
            module = importlib.import_module(module_name)
            runtime_class = getattr(module, f"{backend.capitalize()}Runtime", None)
            
            if runtime_class is None:
                raise ValueError(
                    f"Could not find {backend.capitalize()}Runtime class in {module_name}"
                )
                
            register_runtime(backend, runtime_class)
            
        except ImportError as e:
            raise ImportError(
                f"Could not import runtime for backend '{backend}'. "
                f"Make sure all required dependencies are installed. Error: {e}"
            ) from e
    
    # Create and return a new runtime instance
    return _RUNTIME_REGISTRY[backend](model_config)

# Register built-in runtimes
try:
    from .py.runtime import KerasRuntime
    register_runtime('python', KerasRuntime)
except ImportError:
    # Keras/TensorFlow not available, but don't fail here
    # The runtime will be loaded dynamically when needed
    pass

# Export the AIRuntime class for direct import from runtime module
__all__ = ['AIRuntime', 'get_runtime', 'register_runtime']
