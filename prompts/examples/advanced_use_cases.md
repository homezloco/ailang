# Advanced AILang Use Cases

This file contains specialized examples of AILang for advanced machine learning scenarios.

## Example 1: Multi-Input Multi-Output Model

**Use Case**: A model that processes both image and text inputs to generate multiple predictions.

```ail
model MultiModalClassifier:
  # Image input branch
  image_input:
    name: image_input
    shape: [224, 224, 3]
    
  # Text input branch
  text_input:
    name: text_input
    shape: [100]  # Sequence of token IDs
    dtype: int32

  # Image processing branch
  image_branch:
    - type: conv2d
      filters: 32
      kernel_size: [3, 3]
      activation: relu
    - type: maxpool2d
      pool_size: [2, 2]
    - type: flatten
    - type: dense
      units: 64
      activation: relu

  # Text processing branch
  text_branch:
    - type: embedding
      input_dim: 10000
      output_dim: 64
    - type: lstm
      units: 64
      return_sequences: false

  # Combined processing
  combined:
    - type: concatenate
      inputs: [image_branch, text_branch]
    - type: dense
      units: 32
      activation: relu
    
    # Multiple outputs
    - type: dense
      name: category_output
      units: 10
      activation: softmax
    - type: dense
      name: sentiment_output
      units: 1
      activation: sigmoid

  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.001
    loss:
      category_output: categorical_crossentropy
      sentiment_output: binary_crossentropy
    loss_weights:
      category_output: 1.0
      sentiment_output: 0.5
    metrics:
      category_output: [accuracy, top_k_accuracy]
      sentiment_output: [binary_accuracy]
```

## Example 2: Custom Layer with Parameters

**Use Case**: Defining a custom attention layer with configurable parameters.

```ail
model TextClassifierWithAttention:
  input_shape: [None]  # Variable length sequences
  
  layers:
    # Embedding layer
    - type: embedding
      input_dim: 10000
      output_dim: 128
      
    # Custom attention layer
    - type: custom
      class: MultiHeadAttention
      params:
        num_heads: 8
        key_dim: 64
        value_dim: 64
        output_shape: 128
      
    # Global average pooling
    - type: global_average_pooling1d
    
    # Output layer
    - type: dense
      units: 1
      activation: sigmoid

  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.0005
    loss: binary_crossentropy
    metrics: [binary_accuracy]
    callbacks:
      - type: early_stopping
        monitor: val_loss
        patience: 5
        restore_best_weights: true
```

## Example 3: Transfer Learning with Fine-tuning

**Use Case**: Fine-tuning a pre-trained vision transformer.

```ail
model FineTunedViT:
  # Base model configuration
  base_model:
    name: vit_b16
    pretrained: imagenet21k+imagenet2012
    trainable: false  # Freeze base model initially
    
  # Input preprocessing
  preprocessing:
    - type: resize
      size: [384, 384]  # ViT-B/16 expects 384x384 inputs
    - type: normalization
      mean: [0.485, 0.456, 0.406]
      std: [0.229, 0.224, 0.225]
  
  # Custom head
  head:
    - type: dense
      units: 1024
      activation: gelu
    - type: layer_normalization
    - type: dropout
      rate: 0.2
    - type: dense
      units: 10  # Number of classes
      activation: softmax
  
  # Training configuration
  train:
    # Phase 1: Train only the head
    - phase: head_training
      trainable: head  # Only train the head layers
      optimizer: adamw
      learning_rate: 0.001
      weight_decay: 0.0001
      loss: categorical_crossentropy
      metrics: [accuracy]
      epochs: 10
      callbacks:
        - type: model_checkpoint
          filepath: 'models/head_best.h5'
          save_best_only: true
          monitor: 'val_accuracy'
    
    # Phase 2: Fine-tune the entire model
    - phase: fine_tuning
      trainable: all  # Unfreeze all layers
      optimizer: adamw
      learning_rate: 0.00001  # Lower learning rate for fine-tuning
      weight_decay: 0.00001
      loss: categorical_crossentropy
      metrics: [accuracy]
      epochs: 50
      callbacks:
        - type: model_checkpoint
          filepath: 'models/full_model_best.h5'
          save_best_only: true
          monitor: 'val_accuracy'
        - type: reduce_lr_on_plateau
          monitor: 'val_loss'
          factor: 0.2
          patience: 3
          min_lr: 1e-7
```

## Example 4: Time Series Forecasting

**Use Case**: Multi-step time series forecasting with attention.

```ail
model TimeSeriesForecaster:
  # Input: (batch_size, lookback, num_features)
  input_shape: [None, 24, 5]  # 24 time steps, 5 features
  
  layers:
    # Encoder with LSTM
    - type: lstm
      units: 64
      return_sequences: true
    - type: layer_normalization
    - type: dropout
      rate: 0.2
    
    # Attention mechanism
    - type: multi_head_attention
      num_heads: 4
      key_dim: 16
      value_dim: 16
    - type: layer_normalization
    
    # Decoder with LSTM
    - type: lstm
      units: 64
      return_sequences: true
    - type: layer_normalization
    - type: dropout
      rate: 0.2
    
    # Time-distributed dense for multi-step forecasting
    - type: time_distributed
      layer:
        type: dense
        units: 1  # Predict one value per time step

  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.001
    loss: mse
    metrics: [mae, mape]
    epochs: 100
    batch_size: 32
    validation_split: 0.2
    callbacks:
      - type: early_stopping
        monitor: 'val_loss'
        patience: 10
        restore_best_weights: true
      - type: reduce_lr_on_plateau
        monitor: 'val_loss'
        factor: 0.5
        patience: 5
        min_lr: 1e-6
```

## Example 5: Reinforcement Learning Agent

**Use Case**: Deep Q-Network (DQN) for reinforcement learning.

```ail
model DQNAgent:
  # Input: state representation (e.g., game screen)
  input_shape: [84, 84, 4]  # Stack of 4 grayscale frames
  
  # Network architecture
  network:
    # Convolutional layers for feature extraction
    - type: conv2d
      filters: 32
      kernel_size: [8, 8]
      strides: [4, 4]
      activation: relu
    - type: conv2d
      filters: 64
      kernel_size: [4, 4]
      strides: [2, 2]
      activation: relu
    - type: conv2d
      filters: 64
      kernel_size: [3, 3]
      activation: relu
    - type: flatten
    
    # Dueling DQN architecture
    - type: dense
      units: 512
      activation: relu
    
    # Separate streams for value and advantage
    - type: dueling_dqn
      num_actions: 4  # Number of possible actions
      units: 512      # Hidden units in the dueling streams

  # Training configuration
  train:
    algorithm: dqn
    gamma: 0.99                # Discount factor
    epsilon_start: 1.0          # Initial exploration rate
    epsilon_end: 0.01           # Minimum exploration rate
    epsilon_decay: 0.995        # Decay rate for exploration
    batch_size: 32              # Batch size for experience replay
    replay_buffer_size: 100000   # Size of the experience replay buffer
    target_update_freq: 1000     # How often to update target network
    learning_starts: 5000       # Steps before learning starts
    
    # Optimizer configuration
    optimizer:
      type: adam
      learning_rate: 0.00025
      clipnorm: 1.0             # Gradient clipping
    
    # Loss function
    loss: huber_loss
    
    # Training loop configuration
    max_steps: 1000000          # Total training steps
    train_freq: 4               # Train every N steps
    update_freq: 4              # Update target network every N steps
    
    # Callbacks
    callbacks:
      - type: model_checkpoint
        filepath: 'models/dqn_weights.h5'
        save_weights_only: true
        save_freq: 10000
      - type: tensorboard
        log_dir: 'logs/dqn'
        update_freq: 'episode'

  # Environment configuration
  env:
    name: 'BreakoutNoFrameskip-v4'  # Atari environment
    frame_skip: 4                   # Frame skipping
    noop_max: 30                    # Random no-ops at start
    clip_rewards: true              # Clip rewards to [-1, 1]
    terminal_on_life_loss: true     # End episode on life loss
    grayscale: true                 # Convert to grayscale
    scale: true                     # Scale pixel values to [0, 1]
    
    # Observation preprocessing
    preprocess:
      - type: resize
        width: 84
        height: 84
      - type: normalize
        mean: 0.0
        std: 255.0

  # Evaluation configuration
  evaluation:
    eval_episodes: 10              # Number of episodes for evaluation
    eval_freq: 10000               # Evaluate every N steps
    render: false                  # Render during evaluation
    exploration_rate: 0.01         # Fixed epsilon for evaluation
    
    # Metrics to track
    metrics:
      - episode_reward
      - episode_length
      - mean_q_value
```

## Example 6: Graph Neural Network

**Use Case**: Node classification in graph data.

```ail
model GraphNeuralNetwork:
  # Input specifications
  inputs:
    # Node features: [num_nodes, num_features]
    node_features:
      name: node_features
      shape: [None, 1433]
      
    # Edge indices: [2, num_edges]
    edge_indices:
      name: edge_indices
      shape: [2, None]
      dtype: int32
      
    # Edge weights: [num_edges]
    edge_weights:
      name: edge_weights
      shape: [None]
      required: false  # Optional, defaults to ones
  
  # Graph convolution layers
  layers:
    - type: graph_conv
      output_dim: 64
      activation: relu
      dropout: 0.5
      normalization: layer_norm
      
    - type: graph_conv
      output_dim: 32
      activation: relu
      dropout: 0.5
      normalization: layer_norm
  
  # Readout layer
  - type: global_mean_pool
  
  # Classification head
  - type: dense
    units: 7  # Number of classes
    activation: softmax
  
  # Training configuration
  train:
    optimizer: adam
    learning_rate: 0.01
    weight_decay: 5e-4
    loss: categorical_crossentropy
    metrics: [accuracy]
    epochs: 200
    batch_size: 1  # Full-batch training for small graphs
    
    # Early stopping
    callbacks:
      - type: early_stopping
        monitor: 'val_accuracy'
        patience: 20
        restore_best_weights: true
  
  # Data loading
  dataset:
    name: 'cora'  # Cora citation network
    split:
      train: 0.6
      val: 0.2
      test: 0.2
    
    # Data augmentation
    augmentation:
      - type: edge_dropout
        rate: 0.2
      - type: feature_dropout
        rate: 0.1
  
  # Evaluation metrics
  evaluation:
    metrics:
      - accuracy
      - f1_score
      - precision
      - recall
    
    # Node-wise metrics
    node_metrics:
      - type: accuracy
        mask: 'val'  # Evaluate on validation set
      - type: f1_score
        average: 'macro'
    
    # Visualization
    visualization:
      - type: tsne
        n_components: 2
        perplexity: 30
        learning_rate: 200
        n_iter: 1000
```

## Example 7: Self-Supervised Learning

**Use Case**: Contrastive learning with SimCLR.

```ail
model SimCLR:
  # Input: augmented images
  input_shape: [224, 224, 3]
  
  # Base encoder (e.g., ResNet-50)
  encoder:
    name: resnet50
    include_top: false
    pooling: avg
    trainable: true
  
  # Projection head
  projection_head:
    - type: dense
      units: 2048
      activation: relu
    - type: batch_normalization
    - type: dense
      units: 128  # Projection dimension
      activation: l2_normalize  # Normalize to unit sphere
  
  # Training configuration
  train:
    algorithm: simclr
    temperature: 0.1
    
    # Augmentations
    augmentations:
      - type: random_resized_crop
        scale: [0.2, 1.0]
        ratio: [0.75, 1.33]
      - type: random_flip_left_right
      - type: random_color_jitter
        brightness: 0.8
        contrast: 0.8
        saturation: 0.8
        hue: 0.2
      - type: random_grayscale
        p: 0.2
      - type: gaussian_blur
        kernel_size: 23
        sigma: [0.1, 2.0]
        p: 0.5
    
    # Optimizer
    optimizer:
      type: lars  # Layer-wise Adaptive Rate Scaling
      learning_rate: 0.3 * (batch_size / 256)  # Linear scaling rule
      weight_decay: 1e-6
      momentum: 0.9
      exclude_from_weight_decay: ['batch_normalization', 'bias']
    
    # Learning rate schedule
    lr_schedule:
      type: cosine_decay_with_warmup
      warmup_epochs: 10
      total_epochs: 1000
      initial_learning_rate: 0.0
      alpha: 0.0  # Final learning rate will be alpha * initial_lr
    
    # Training parameters
    batch_size: 1024  # Large batch sizes work better
    epochs: 1000
    
    # Distributed training
    distributed:
      strategy: mirrored  # For multi-GPU training
      num_gpus: 8
      tpu_address: null  # Set to TPU address if using TPUs
  
  # Linear evaluation protocol
  linear_evaluation:
    enabled: true
    start_epoch: 0  # When to start linear eval (0 = from start)
    frequency: 10    # How often to run evaluation (in epochs)
    
    # Classifier head
    classifier:
      - type: global_average_pooling2d
      - type: dense
        units: 1000  # Number of classes in downstream task
        activation: softmax
    
    # Training config
    train:
      optimizer: sgd
      learning_rate: 0.1
      momentum: 0.9
      weight_decay: 0.0
      batch_size: 256
      epochs: 90
      
      # Learning rate schedule
      lr_schedule:
        type: piecewise_constant_decay
        boundaries: [30, 60, 80]
        values: [0.1, 0.01, 0.001, 0.0001]
  
  # Self-supervised evaluation metrics
  metrics:
    - type: contrastive_accuracy
    - type: alignment  # How close positive pairs are
    - type: uniformity  # How uniform the features are on the unit sphere
    
  # Callbacks
  callbacks:
    - type: model_checkpoint
      filepath: 'checkpoints/simclr_weights_epoch_{epoch:04d}.h5'
      save_weights_only: true
      save_freq: 'epoch'
      
    - type: tensorboard
      log_dir: 'logs/simclr'
      update_freq: 'batch'
      
    - type: learning_rate_scheduler
      verbose: 1
