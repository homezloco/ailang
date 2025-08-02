"""Python runtime for AILang using Keras.

This module provides a Keras-based implementation of the AILang runtime.
It supports training, evaluation, and inference of neural network models
defined in the AILang DSL.
"""

import os
import json
import numpy as np
from typing import Dict, Any, Optional, Tuple, Union, List
from pathlib import Path

# Try to import Keras and related dependencies
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential, load_model as keras_load_model
    from tensorflow.keras.layers import (
        Dense, Conv2D, MaxPooling2D, Flatten, Dropout, BatchNormalization,
        LSTM, GRU, Embedding, SimpleRNN, InputLayer
    )
    from tensorflow.keras.optimizers import Adam, SGD, RMSprop
    from tensorflow.keras.losses import (
        CategoricalCrossentropy, SparseCategoricalCrossentropy,
        BinaryCrossentropy, MeanSquaredError, MeanAbsoluteError
    )
    from tensorflow.keras.metrics import (
        CategoricalAccuracy, SparseCategoricalAccuracy,
        BinaryAccuracy, AUC, Precision, Recall
    )
    from tensorflow.keras.callbacks import (
        ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, CSVLogger, TensorBoard
    )
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

from ..base_runtime import AIRuntime

# Map AILang layer types to Keras layer classes
LAYER_MAPPING = {
    'dense': Dense,
    'conv2d': Conv2D,
    'maxpool2d': MaxPooling2D,
    'flatten': Flatten,
    'dropout': Dropout,
    'batchnorm': BatchNormalization,
    'lstm': LSTM,
    'gru': GRU,
    'embedding': Embedding,
    'simplernn': SimpleRNN,
}

# Map AILang activation functions to Keras activation names
ACTIVATION_MAPPING = {
    'relu': 'relu',
    'sigmoid': 'sigmoid',
    'softmax': 'softmax',
    'tanh': 'tanh',
    'linear': 'linear',
    'softplus': 'softplus',
    'softsign': 'softsign',
    'selu': 'selu',
    'elu': 'elu',
    'exponential': 'exponential',
}

# Map AILang optimizers to Keras optimizer classes
OPTIMIZER_MAPPING = {
    'adam': Adam,
    'sgd': SGD,
    'rmsprop': RMSprop,
}

# Map AILang loss functions to Keras loss classes
LOSS_MAPPING = {
    'categorical_crossentropy': CategoricalCrossentropy,
    'sparse_categorical_crossentropy': SparseCategoricalCrossentropy,
    'binary_crossentropy': BinaryCrossentropy,
    'mse': MeanSquaredError,
    'mean_squared_error': MeanSquaredError,
    'mae': MeanAbsoluteError,
    'mean_absolute_error': MeanAbsoluteError,
}

class KerasRuntime(AIRuntime):
    """Keras-based runtime for AILang models."""
    
    def __init__(self, model_config: Dict[str, Any]):
        """Initialize the Keras runtime.
        
        Args:
            model_config: Dictionary containing model architecture and training configuration
        """
        if not TF_AVAILABLE:
            raise ImportError(
                "TensorFlow is required for the Keras runtime. "
                "Install with: pip install tensorflow"
            )
            
        super().__init__(model_config)
        self.history = None
        self.callbacks = []
        self._configure_callbacks()
    
    def _create_model(self) -> Sequential:
        """Create a Keras Sequential model from the model config."""
        model = Sequential()
        
        # Add input layer if specified
        if 'input' in self.model_config:
            input_config = self.model_config['input']
            input_shape = input_config.get('shape')
            if input_shape:
                model.add(InputLayer(input_shape=input_shape))
        
        # Add hidden layers
        for layer_config in self.model_config.get('layers', []):
            layer_type = layer_config.get('type')
            if not layer_type or layer_type not in LAYER_MAPPING:
                raise ValueError(f"Unsupported layer type: {layer_type}")
            
            # Get layer class and create layer with parameters
            layer_class = LAYER_MAPPING[layer_type]
            layer_params = layer_config.get('params', {})
            
            # Convert activation function name if needed
            if 'activation' in layer_params:
                activation = layer_params['activation']
                if activation in ACTIVATION_MAPPING:
                    layer_params['activation'] = ACTIVATION_MAPPING[activation]
            
            # Add layer to model
            model.add(layer_class(**layer_params))
        
        return model
    
    def _configure_optimizer(self) -> Any:
        """Configure the optimizer from the model config."""
        optimizer_config = self.model_config.get('optimizer', {})
        optimizer_type = optimizer_config.get('type', 'adam')
        
        if optimizer_type not in OPTIMIZER_MAPPING:
            raise ValueError(f"Unsupported optimizer: {optimizer_type}")
        
        optimizer_class = OPTIMIZER_MAPPING[optimizer_type]
        optimizer_params = optimizer_config.get('params', {})
        
        # Convert learning rate to float if it's a string
        if 'learning_rate' in optimizer_params:
            if isinstance(optimizer_params['learning_rate'], str):
                optimizer_params['learning_rate'] = float(optimizer_params['learning_rate'])
        
        return optimizer_class(**optimizer_params)
    
    def _configure_loss(self) -> Any:
        """Configure the loss function from the model config."""
        loss_config = self.model_config.get('loss', {})
        loss_type = loss_config.get('type', 'categorical_crossentropy')
        
        if isinstance(loss_type, str):
            if loss_type not in LOSS_MAPPING:
                # Try to use the string directly as a Keras loss
                return loss_type
            loss_class = LOSS_MAPPING[loss_type]
            return loss_class(**loss_config.get('params', {}))
        
        return loss_type  # Assume it's already a callable
    
    def _configure_metrics(self) -> List[Any]:
        """Configure metrics from the model config."""
        metrics_config = self.model_config.get('metrics', ['accuracy'])
        
        if not isinstance(metrics_config, list):
            metrics_config = [metrics_config]
        
        metrics = []
        for metric in metrics_config:
            if isinstance(metric, str):
                metric = metric.lower()
                if metric in ['accuracy', 'acc']:
                    metrics.append('accuracy')
                elif metric in ['auc']:
                    metrics.append(AUC())
                elif metric in ['precision']:
                    metrics.append(Precision())
                elif metric in ['recall']:
                    metrics.append(Recall())
                else:
                    metrics.append(metric)  # Let Keras handle other string metrics
            else:
                metrics.append(metric)  # Assume it's a Keras metric instance
        
        return metrics
    
    def _configure_callbacks(self) -> None:
        """Configure callbacks from the model config."""
        callbacks_config = self.model_config.get('callbacks', [])
        
        for cb_config in callbacks_config:
            cb_type = cb_config.get('type')
            cb_params = cb_config.get('params', {})
            
            if cb_type == 'model_checkpoint':
                # Ensure directory exists
                filepath = cb_params.get('filepath', 'model_checkpoint.h5')
                os.makedirs(os.path.dirname(filepath), exist_ok=True)
                self.callbacks.append(ModelCheckpoint(**cb_params))
                
            elif cb_type == 'early_stopping':
                self.callbacks.append(EarlyStopping(**cb_params))
                
            elif cb_type == 'reduce_lr':
                self.callbacks.append(ReduceLROnPlateau(**cb_params))
                
            elif cb_type == 'csv_logger':
                # Ensure directory exists
                filename = cb_params.get('filename', 'training.log')
                os.makedirs(os.path.dirname(filename), exist_ok=True)
                self.callbacks.append(CSVLogger(**cb_params))
                
            elif cb_type == 'tensorboard':
                # Ensure log directory exists
                log_dir = cb_params.get('log_dir', 'logs')
                os.makedirs(log_dir, exist_ok=True)
                self.callbacks.append(TensorBoard(**cb_params))
    
    def initialize(self) -> None:
        """Initialize the Keras model."""
        if self._initialized:
            return
            
        # Create and compile the model
        self.model = self._create_model()
        
        optimizer = self._configure_optimizer()
        loss = self._configure_loss()
        metrics = self._configure_metrics()
        
        self.model.compile(
            optimizer=optimizer,
            loss=loss,
            metrics=metrics
        )
        
        self._initialized = True
    
    def train(
        self, 
        x_train: Any,
        y_train: Any,
        x_val: Optional[Any] = None,
        y_val: Optional[Any] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Train the model on the given data.
        
        Args:
            x_train: Training input data
            y_train: Training target data
            x_val: Optional validation input data
            y_val: Optional validation target data
            **kwargs: Additional training arguments
            
        Returns:
            Dictionary containing training history and metrics
        """
        self._ensure_initialized()
        
        # Get training parameters with defaults
        epochs = kwargs.get('epochs', self.model_config.get('epochs', 10))
        batch_size = kwargs.get('batch_size', self.model_config.get('batch_size', 32))
        validation_split = kwargs.get('validation_split', self.model_config.get('validation_split', 0.1))
        shuffle = kwargs.get('shuffle', self.model_config.get('shuffle', True))
        
        # Prepare validation data
        validation_data = None
        if x_val is not None and y_val is not None:
            validation_data = (x_val, y_val)
        
        # Train the model
        history = self.model.fit(
            x_train,
            y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split if validation_data is None else 0.0,
            validation_data=validation_data,
            shuffle=shuffle,
            callbacks=self.callbacks,
            verbose=kwargs.get('verbose', 1)
        )
        
        self.history = history.history
        return self.history
    
    def evaluate(
        self, 
        x_test: Any, 
        y_test: Any,
        **kwargs
    ) -> Dict[str, Any]:
        """Evaluate the model on test data.
        
        Args:
            x_test: Test input data
            y_test: Test target data
            **kwargs: Additional evaluation arguments
            
        Returns:
            Dictionary containing evaluation metrics
        """
        self._ensure_initialized()
        
        batch_size = kwargs.get('batch_size', 32)
        verbose = kwargs.get('verbose', 1)
        
        metrics = self.model.evaluate(
            x_test,
            y_test,
            batch_size=batch_size,
            verbose=verbose,
            return_dict=True
        )
        
        return metrics
    
    def predict(
        self, 
        x: Any,
        **kwargs
    ) -> Any:
        """Generate predictions for input data.
        
        Args:
            x: Input data for prediction
            **kwargs: Additional prediction arguments
            
        Returns:
            Model predictions
        """
        self._ensure_initialized()
        
        batch_size = kwargs.get('batch_size', 32)
        verbose = kwargs.get('verbose', 0)
        
        return self.model.predict(
            x,
            batch_size=batch_size,
            verbose=verbose
        )
    
    def save(self, path: str) -> None:
        """Save the model to disk.
        
        Args:
            path: Path to save the model
        """
        self._ensure_initialized()
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        
        # Save the model
        self.model.save(path)
        
        # Save additional metadata
        metadata = {
            'model_config': self.model_config,
            'class_name': self.__class__.__name__,
            'keras_version': tf.__version__
        }
        
        metadata_path = f"{path}.metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    @classmethod
    def load(cls, path: str) -> 'KerasRuntime':
        """Load a saved model from disk.
        
        Args:
            path: Path to the saved model
            
        Returns:
            Loaded KerasRuntime instance
        """
        # Load the Keras model
        model = keras_load_model(path, compile=True)
        
        # Load metadata
        metadata_path = f"{path}.metadata.json"
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            model_config = metadata.get('model_config', {})
        else:
            model_config = {}
        
        # Create runtime instance
        runtime = cls(model_config)
        runtime.model = model
        runtime._initialized = True
        
        return runtime
    
    def summary(self) -> None:
        """Print a summary of the model architecture."""
        self._ensure_initialized()
        return self.model.summary()
    
    def get_config(self) -> Dict[str, Any]:
        """Get the model configuration.
        
        Returns:
            Dictionary containing the model configuration
        """
        return self.model_config
    
    def set_config(self, config: Dict[str, Any]) -> None:
        """Update the model configuration.
        
        Args:
            config: New model configuration
        """
        self.model_config = config
        self._initialized = False  # Need to reinitialize with new config
