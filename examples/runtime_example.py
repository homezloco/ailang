"""Example demonstrating the AILang Python runtime with Keras backend.

This example shows how to use the AILang Python runtime to train and evaluate
a simple neural network on the MNIST dataset.
"""

import os
import numpy as np
from pathlib import Path

# Add the project root to the Python path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

# Try to import the runtime
try:
    from runtime import get_runtime, AIRuntime
except ImportError as e:
    print(f"Error importing runtime: {e}")
    print("Make sure you're running from the project root directory.")
    sys.exit(1)

# Try to import TensorFlow and Keras
try:
    import tensorflow as tf
    from tensorflow.keras.datasets import mnist
    from tensorflow.keras.utils import to_categorical
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("TensorFlow is required for this example. Install with: pip install tensorflow")


def load_mnist_data():
    """Load and preprocess the MNIST dataset."""
    if not TF_AVAILABLE:
        raise ImportError("TensorFlow is required to load the MNIST dataset")
    
    # Load the MNIST dataset
    (x_train, y_train), (x_test, y_test) = mnist.load_data()
    
    # Preprocess the data
    x_train = x_train.astype('float32') / 255.0
    x_test = x_test.astype('float32') / 255.0
    
    # Add channel dimension (for CNN)
    x_train = np.expand_dims(x_train, -1)
    x_test = np.expand_dims(x_test, -1)
    
    # Convert class vectors to one-hot encoded targets
    num_classes = 10
    y_train = to_categorical(y_train, num_classes)
    y_test = to_categorical(y_test, num_classes)
    
    return (x_train, y_train), (x_test, y_test)


def create_model_config():
    """Create a model configuration for a simple CNN."""
    return {
        'input': {
            'shape': (28, 28, 1)  # MNIST images are 28x28 pixels with 1 channel
        },
        'layers': [
            {
                'type': 'conv2d',
                'params': {
                    'filters': 32,
                    'kernel_size': (3, 3),
                    'activation': 'relu',
                    'input_shape': (28, 28, 1)
                }
            },
            {
                'type': 'maxpool2d',
                'params': {
                    'pool_size': (2, 2)
                }
            },
            {
                'type': 'conv2d',
                'params': {
                    'filters': 64,
                    'kernel_size': (3, 3),
                    'activation': 'relu'
                }
            },
            {
                'type': 'maxpool2d',
                'params': {
                    'pool_size': (2, 2)
                }
            },
            {
                'type': 'flatten',
                'params': {}
            },
            {
                'type': 'dense',
                'params': {
                    'units': 128,
                    'activation': 'relu'
                }
            },
            {
                'type': 'dropout',
                'params': {
                    'rate': 0.5
                }
            },
            {
                'type': 'dense',
                'params': {
                    'units': 10,  # 10 classes for MNIST
                    'activation': 'softmax'
                }
            }
        ],
        'optimizer': {
            'type': 'adam',
            'params': {
                'learning_rate': 0.001
            }
        },
        'loss': {
            'type': 'categorical_crossentropy',
            'params': {}
        },
        'metrics': ['accuracy'],
        'callbacks': [
            {
                'type': 'early_stopping',
                'params': {
                    'monitor': 'val_loss',
                    'patience': 3,
                    'restore_best_weights': True
                }
            },
            {
                'type': 'model_checkpoint',
                'params': {
                    'filepath': 'models/mnist_model.h5',
                    'save_best_only': True,
                    'monitor': 'val_accuracy',
                    'mode': 'max',
                    'save_weights_only': False
                }
            },
            {
                'type': 'reduce_lr',
                'params': {
                    'monitor': 'val_loss',
                    'factor': 0.5,
                    'patience': 2,
                    'min_lr': 1e-6
                }
            }
        ],
        'epochs': 15,
        'batch_size': 128
    }


def main():
    # Create output directory
    os.makedirs('models', exist_ok=True)
    
    # Load and prepare the data
    print("Loading MNIST dataset...")
    (x_train, y_train), (x_test, y_test) = load_mnist_data()
    
    print(f"Training data shape: {x_train.shape}")
    print(f"Test data shape: {x_test.shape}")
    
    # Create model configuration
    model_config = create_model_config()
    
    # Create and initialize the runtime
    print("\nInitializing model...")
    runtime = get_runtime('python', model_config)
    
    # Print model summary
    print("\nModel architecture:")
    runtime.summary()
    
    # Train the model
    print("\nTraining model...")
    history = runtime.train(
        x_train,
        y_train,
        x_val=x_test[:5000],  # Use part of test set as validation
        y_val=y_test[:5000],
        epochs=model_config.get('epochs', 10),
        batch_size=model_config.get('batch_size', 128),
        verbose=1
    )
    
    # Evaluate the model
    print("\nEvaluating model...")
    metrics = runtime.evaluate(x_test, y_test, verbose=1)
    print(f"\nTest metrics: {metrics}")
    
    # Save the model
    model_path = 'models/mnist_model_final.h5'
    print(f"\nSaving model to {model_path}...")
    runtime.save(model_path)
    
    # Load the model back
    print("Loading saved model...")
    loaded_runtime = runtime.__class__.load(model_path)
    
    # Test prediction
    sample = x_test[0:1]  # Take the first test sample
    prediction = loaded_runtime.predict(sample)
    predicted_class = np.argmax(prediction[0])
    true_class = np.argmax(y_test[0])
    
    print(f"\nSample prediction:")
    print(f"  Predicted: {predicted_class}, True: {true_class}")
    print(f"  Confidence: {np.max(prediction[0]):.2%}")
    
    print("\nExample completed successfully!")


if __name__ == "__main__":
    main()
