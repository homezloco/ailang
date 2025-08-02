# Model Definition Examples

This file contains few-shot examples of AILang model definitions for various use cases.

## Example 1: Simple Feedforward Network

**User Request**:
"Create a simple feedforward neural network for MNIST classification with two hidden layers (128 and 64 units) and dropout."

**AILang Code**:
```ail
model MNISTClassifier:
  # Input shape for MNIST (28x28 pixels flattened)
  input_shape: [784]
  
  layers:
    # First hidden layer with ReLU activation
    - type: dense
      units: 128
      activation: relu
      
    # Dropout for regularization
    - type: dropout
      rate: 0.3
      
    # Second hidden layer
    - type: dense
      units: 64
      activation: relu
      
    # Output layer with 10 units (digits 0-9)
    - type: dense
      units: 10
      activation: softmax

  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.001
    loss: categorical_crossentropy
    metrics: [accuracy]
    epochs: 15
    batch_size: 64
    
  # Data loading
  dataset:
    name: mnist
    batch_size: 64
    validation_split: 0.2
    shuffle: true
```

## Example 2: Convolutional Neural Network

**User Request**:
"Define a CNN for CIFAR-10 classification with data augmentation."

**AILang Code**:
```ail
model CIFAR10Classifier:
  # Input shape for CIFAR-10 (32x32 RGB images)
  input_shape: [32, 32, 3]
  
  # Data augmentation
  augmentation:
    - type: random_rotation
      factor: 0.1
    - type: random_zoom
      height_factor: 0.1
      width_factor: 0.1
    - type: horizontal_flip
      enabled: true

  # Model architecture
  layers:
    # First conv block
    - type: conv2d
      filters: 32
      kernel_size: [3, 3]
      activation: relu
      padding: same
    - type: batch_normalization
    - type: maxpool2d
      pool_size: [2, 2]
      
    # Second conv block
    - type: conv2d
      filters: 64
      kernel_size: [3, 3]
      activation: relu
      padding: same
    - type: batch_normalization
    - type: maxpool2d
      pool_size: [2, 2]
      
    # Dense layers
    - type: flatten
    - type: dense
      units: 128
      activation: relu
    - type: dropout
      rate: 0.5
    - type: dense
      units: 10
      activation: softmax

  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.0005
    loss: sparse_categorical_crossentropy
    metrics: [accuracy]
    epochs: 50
    batch_size: 128
    callbacks:
      - type: early_stopping
        monitor: val_accuracy
        patience: 10
        restore_best_weights: true
      - type: reduce_lr_on_plateau
        monitor: val_loss
        factor: 0.5
        patience: 5
        min_lr: 1e-6

  # Data loading
  dataset:
    name: cifar10
    batch_size: 128
    validation_split: 0.2
    shuffle: true
```

## Example 3: LSTM for Text Classification

**User Request**:
"Create an LSTM model for text classification with word embeddings."

**AILang Code**:
```ail
model TextClassifier:
  # Input for text (sequence of word indices)
  input:
    name: text_input
    shape: [None]  # Variable length sequences
    dtype: int32
    
  # Model architecture
  layers:
    # Embedding layer (pretrained or trainable)
    - type: embedding
      input_dim: 10000  # Vocabulary size
      output_dim: 128   # Embedding dimension
      input_length: 500  # Max sequence length
      trainable: true
      
    # Bidirectional LSTM
    - type: bidirectional
      layer:
        type: lstm
        units: 64
        return_sequences: false
      merge_mode: concat
      
    # Dense layers
    - type: dense
      units: 32
      activation: relu
      
    # Output layer (binary classification)
    - type: dense
      units: 1
      activation: sigmoid

  # Training configuration
  train:
    optimizer: rmsprop
    learning_rate: 0.001
    loss: binary_crossentropy
    metrics: [binary_accuracy]
    epochs: 10
    batch_size: 32
    
  # Text data preprocessing
  text_processing:
    max_words: 10000
    max_sequence_length: 500
    padding: post
    truncating: post
    
  # Callbacks
  callbacks:
    - type: model_checkpoint
      filepath: 'models/text_classifier_best.h5'
      save_best_only: true
      monitor: 'val_accuracy'
    - type: early_stopping
      monitor: 'val_loss'
      patience: 3
```

## Example 4: Transfer Learning with Pre-trained Model

**User Request**:
"Use a pre-trained ResNet50 model for image classification on a custom dataset."

**AILang Code**:
```ail
model CustomImageClassifier:
  # Input shape for ImageNet-compatible models
  input_shape: [224, 224, 3]
  
  # Use pre-trained ResNet50
  base_model:
    name: resnet50
    trainable: false  # Freeze base model layers
    include_top: false  # Exclude final classification layer
    
  # Custom classification head
  layers:
    - type: global_average_pooling2d
    - type: dense
      units: 256
      activation: relu
    - type: dropout
      rate: 0.5
    - type: dense
      units: 10  # Number of classes in custom dataset
      activation: softmax

  # Training configuration
  train:
    # Use a lower learning rate for fine-tuning
    optimizer: sgd
    learning_rate: 0.0001
    momentum: 0.9
    
    loss: categorical_crossentropy
    metrics: [accuracy, top_k_accuracy]
    
    # Two-phase training
    phases:
      - name: feature_extraction
        epochs: 10
        batch_size: 32
        callbacks:
          - type: reduce_lr_on_plateau
            monitor: val_loss
            factor: 0.2
            patience: 3
            
      - name: fine_tuning
        # Unfreeze some layers for fine-tuning
        unfreeze: block5_conv1
        learning_rate: 0.00001  # Lower learning rate for fine-tuning
        epochs: 20
        batch_size: 16
        callbacks:
          - type: model_checkpoint
            filepath: 'models/fine_tuned_best.h5'
            save_best_only: true
            monitor: 'val_accuracy'

  # Data loading
  dataset:
    path: 'data/custom_dataset'
    batch_size: 32
    validation_split: 0.2
    shuffle: true
    
    # Image preprocessing
    preprocessing:
      rescale: 1./255
      rotation_range: 20
      width_shift_range: 0.2
      height_shift_range: 0.2
      horizontal_flip: true
      fill_mode: nearest
```

These examples demonstrate various patterns and best practices for defining models in AILang. They cover different architectures, training configurations, and data processing pipelines commonly used in deep learning projects.
