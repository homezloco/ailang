"""Base runtime interface for AILang."""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pathlib import Path

class AIRuntime(ABC):
    """Abstract base class for AILang runtimes."""
    
    def __init__(self, model_config: Dict[str, Any]):
        """Initialize the runtime with model configuration.
        
        Args:
            model_config: Dictionary containing model architecture and training configuration
        """
        self.model_config = model_config
        self.model = None
        self._initialized = False
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the model and any required resources."""
        pass
    
    @abstractmethod
    def train(self, x_train: Any, y_train: Any, **kwargs) -> Dict[str, Any]:
        """Train the model on the given data.
        
        Args:
            x_train: Training input data
            y_train: Training target data
            **kwargs: Additional training arguments
            
        Returns:
            Dictionary containing training metrics and history
        """
        pass
    
    @abstractmethod
    def evaluate(self, x_test: Any, y_test: Any, **kwargs) -> Dict[str, Any]:
        """Evaluate the model on test data.
        
        Args:
            x_test: Test input data
            y_test: Test target data
            **kwargs: Additional evaluation arguments
            
        Returns:
            Dictionary containing evaluation metrics
        """
        pass
    
    @abstractmethod
    def predict(self, x: Any, **kwargs) -> Any:
        """Generate predictions for input data.
        
        Args:
            x: Input data for prediction
            **kwargs: Additional prediction arguments
            
        Returns:
            Model predictions
        """
        pass
    
    @abstractmethod
    def save(self, path: str) -> None:
        """Save the model to disk.
        
        Args:
            path: Path to save the model
        """
        pass
    
    @classmethod
    @abstractmethod
    def load(cls, path: str) -> 'AIRuntime':
        """Load a saved model from disk.
        
        Args:
            path: Path to the saved model
            
        Returns:
            Loaded AIRuntime instance
        """
        pass
    
    @property
    def is_initialized(self) -> bool:
        """Check if the runtime is initialized."""
        return self._initialized
    
    def _ensure_initialized(self) -> None:
        """Ensure the runtime is initialized."""
        if not self._initialized:
            self.initialize()
            self._initialized = True
