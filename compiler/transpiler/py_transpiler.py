"""
Python transpiler for AILang.
Converts AILang IR to Keras Sequential model code.
"""

def _get_activation(activation):
    """Convert AILang activation to Keras activation string."""
    if not activation:
        return None
    return activation.lower()

def _generate_imports():
    """Generate necessary imports for Keras."""
    return """from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Input

"""

def _generate_model_definition(model):
    """Generate model definition code from IR."""
    lines = [f'# Model: {model.name}', 'model = Sequential([']
    
    # Add input layer if specified
    if hasattr(model, 'input_shape'):
        lines.append(f'    Input(shape={model.input_shape}),')
    
    # Add layers
    for layer in model.layers:
        activation = _get_activation(layer.activation)
        activation_str = f', activation="{activation}"' if activation else ''
        lines.append(f'    Dense({layer.units}{activation_str}),')
    
    lines.append('])')
    return '\n'.join(lines)

def _generate_compilation(model):
    """Generate model compilation code."""
    if not hasattr(model, 'optimizer') or not hasattr(model, 'loss'):
        return ""
    
    return f'''
# Compile the model
model.compile(
    optimizer='{model.optimizer.name.lower()}',
    loss='{model.loss.name.lower()}',
    metrics=['accuracy']
)'''

def _generate_training(model):
    """Generate training code if training config exists."""
    if not hasattr(model, 'train_config'):
        return ""
    
    train_cfg = model.train_config
    return f'''
# Train the model
model.fit(
    {train_cfg.dataset}.train_data,
    {train_cfg.dataset}.train_labels,
    epochs={train_cfg.epochs},
    batch_size=32,
    validation_data=({train_cfg.dataset}.test_data, {train_cfg.dataset}.test_labels)
)'''

def transpile_to_python(ir):
    """
    Convert AILang IR to Keras Python code.
    
    Args:
        ir: The intermediate representation (IR) of the AILang program
        
    Returns:
        str: Generated Python code as a string
    """
    code_parts = [_generate_imports()]
    
    # Handle different IR components
    if hasattr(ir, 'models'):
        for model in ir.models:
            code_parts.append(_generate_model_definition(model))
            code_parts.append(_generate_compilation(model))
            code_parts.append(_generate_training(model))
    
    # Join all code parts and remove empty lines
    return '\n'.join(filter(None, code_parts))
