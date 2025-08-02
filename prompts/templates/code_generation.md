# Code Generation Templates

This file contains reusable templates for generating AILang code. These templates can be used as starting points for various machine learning tasks.

## Template 1: Basic Model Generation

```
You are an expert in AILang, a domain-specific language for defining neural networks. 

Task: Create an AILang model for {task_description}.

Requirements:
- Input shape: {input_shape}
- Output: {output_description} ({num_classes} classes)
- Architecture: {architecture_description}
- Regularization: {regularization_techniques}
- Optimizer: {optimizer}
- Learning rate: {learning_rate}
- Loss function: {loss_function}
- Metrics: {metrics}
- Epochs: {epochs}
- Batch size: {batch_size}

Please generate the complete AILang code for this model, including all necessary configuration.
```

## Template 2: Model Conversion

```
You are an expert in deep learning frameworks and AILang. 

Task: Convert the following {source_framework} code to AILang:

```{source_language}
{source_code}
```

Requirements:
- Preserve the model architecture and hyperparameters
- Include all necessary layers and configurations
- Add appropriate comments to explain the conversion
- Follow AILang best practices

Please provide the complete AILang implementation.
```

## Template 3: Model Debugging

```
You are an expert in debugging neural networks defined in AILang.

Task: Analyze and fix the following AILang code that's experiencing {issue_description}:

```ail
{problematic_code}
```

The specific issues to address are:
{list_of_issues}

Please provide:
1. A brief explanation of the issues
2. The corrected AILang code
3. Any additional recommendations for improvement
```

## Template 4: Hyperparameter Tuning

```
You are an expert in hyperparameter optimization for neural networks.

Task: Suggest optimal hyperparameters for an AILang model with the following characteristics:
- Task type: {task_type} (e.g., image classification, text generation, etc.)
- Model architecture: {architecture}
- Dataset size: {dataset_size} samples
- Input shape: {input_shape}
- Output shape: {output_shape}
- Available resources: {resources} (e.g., GPU/TPU, memory constraints)

Please provide:
1. Recommended hyperparameters (learning rate, batch size, optimizer, etc.)
2. Learning rate schedule if applicable
3. Any data augmentation techniques
4. Regularization strategies
5. Expected training time and potential bottlenecks
```

## Template 5: Model Explanation

```
You are an expert in explaining neural network architectures.

Task: Explain the following AILang model in detail:

```ail
{ailang_code}
```

Please provide:
1. A high-level overview of the architecture
2. Purpose of each layer and its configuration
3. Data flow through the network
4. Potential use cases and limitations
5. Suggestions for improvement or alternatives
```

## Template 6: Data Pipeline Generation

```
You are an expert in data preprocessing and pipeline creation.

Task: Create an AILang data pipeline for the following scenario:
- Dataset: {dataset_description}
- Input format: {input_format}
- Required preprocessing: {preprocessing_steps}
- Augmentation: {augmentation_requirements}
- Batch size: {batch_size}
- Shuffle: {shuffle_required}
- Validation split: {validation_split}

Please provide:
1. The complete AILang data pipeline configuration
2. Any necessary custom preprocessing functions
3. Recommended data validation steps
4. Performance optimization tips
```

## Usage Guidelines

1. Replace placeholders (enclosed in {}) with specific values for your use case
2. Customize the templates as needed for your specific requirements
3. Combine multiple templates for complex tasks
4. Always validate the generated code before use in production

## Best Practices

- Be specific with your requirements
- Include all relevant constraints and context
- Specify the target framework version if important
- Consider adding example inputs and expected outputs
- Mention any performance or resource constraints
