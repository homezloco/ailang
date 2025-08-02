"""
JavaScript transpiler for AILang.
Converts AILang IR to TensorFlow.js code.
"""

def _get_activation_function(activation):
    """Get the corresponding TensorFlow.js activation function name."""
    if not activation:
        return None
    
    activation = activation.lower()
    if activation in ['relu', 'sigmoid', 'tanh', 'softmax']:
        return f'tf.layers.activation({{activation: "{activation}"}})'
    return None

def _generate_imports():
    """Generate necessary imports for TensorFlow.js."""
    return """// Import TensorFlow.js
const tf = require('@tensorflow/tfjs');

// Add a global model variable
let model;

"""

def _generate_model_definition(model):
    """Generate model definition code from IR."""
    lines = [f'// Model: {model.name}', 'function createModel() {', '  const model = tf.sequential();', '  ']
    
    # Add input layer if specified
    if hasattr(model, 'input_shape'):
        lines.append(f'  model.add(tf.layers.inputLayer({{shape: {model.input_shape}}}));')
    
    # Add layers
    for layer in model.layers:
        activation = _get_activation_function(layer.activation)
        
        layer_config = f'    units: {layer.units}'
        if activation:
            layer_config += f',\n    activation: "{layer.activation}"'
        
        lines.append(f'  model.add(tf.layers.dense({{{layer_config}
  }}));')
    
    # Add model compilation
    if hasattr(model, 'optimizer') and hasattr(model, 'loss'):
        lines.append('')
        lines.append(f'  // Compile the model\n  model.compile({{')
        lines.append(f'    optimizer: tf.train.{model.optimizer.name.lower()}(),')
        lines.append(f'    loss: "{model.loss.name.lower()}",')
        lines.append('    metrics: ["accuracy"]')
        lines.append('  });')
    
    lines.append('  ')
    lines.append('  return model;')
    lines.append('}')
    
    return '\n'.join(lines)

def _generate_training_function(model):
    """Generate training function if training config exists."""
    if not hasattr(model, 'train_config'):
        return ""
    
    train_cfg = model.train_config
    return f"""
// Train the model
async function trainModel() {{
  // Example training data - replace with your actual data
  const xs = tf.randomNormal([100, {train_cfg.input_shape if hasattr(train_cfg, 'input_shape') else 'input_size'}]);
  const ys = tf.randomNormal([100, {train_cfg.output_units if hasattr(train_cfg, 'output_units') else 'output_units'}]);
  
  // Train the model
  const history = await model.fit(xs, ys, {{
    epochs: {train_cfg.epochs},
    batchSize: 32,
    validationSplit: 0.2,
    callbacks: {{
      onEpochEnd: (epoch, logs) => {{
        console.log(`Epoch ${{epoch}}: loss = ${{logs.loss.toFixed(4)}}, accuracy = ${{logs.acc.toFixed(4)}}`);
      }}
    }}
  }});
  
  return history;
}}
"""

def _generate_usage_example():
    """Generate example usage code."""
    return """
// Initialize and use the model
async function main() {
  try {
    // Create and compile the model
    model = createModel();
    
    // Print model summary
    model.summary();
    
    // Train the model if training data is available
    if (typeof trainModel === 'function') {
      console.log('Training model...');
      await trainModel();
      console.log('Training complete!');
    }
    
    // Example prediction
    // const input = tf.tensor2d([/* your input data */], [1, input_size]);
    // const prediction = model.predict(input);
    // prediction.print();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
main().catch(console.error);
"""

def transpile_to_js(ir):
    """
    Convert AILang IR to TensorFlow.js code.
    
    Args:
        ir: The intermediate representation (IR) of the AILang program
        
    Returns:
        str: Generated JavaScript code as a string
    """
    code_parts = [_generate_imports()]
    
    # Handle different IR components
    if hasattr(ir, 'models'):
        for model in ir.models:
            code_parts.append(_generate_model_definition(model))
            training_code = _generate_training_function(model)
            if training_code:
                code_parts.append(training_code)
    
    # Add usage example
    code_parts.append(_generate_usage_example())
    
    # Join all code parts and remove empty lines
    return '\n'.join(filter(None, code_parts))
