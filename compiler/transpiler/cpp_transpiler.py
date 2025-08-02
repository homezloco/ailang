"""
C++ transpiler for AILang.
Converts AILang IR to C++ code using Eigen for matrix operations.
"""

def _get_activation_function(activation):
    """Get the corresponding activation function name in C++."""
    if not activation:
        return ""
    
    activation = activation.lower()
    if activation == 'relu':
        return "relu"
    elif activation == 'sigmoid':
        return "sigmoid"
    elif activation == 'tanh':
        return "tanh"
    elif activation == 'softmax':
        return "softmax"
    return ""

def _generate_includes():
    """Generate necessary includes for the C++ code."""
    return """#include <Eigen/Dense>
#include <vector>
#include <string>
#include <stdexcept>
#include <cmath>
#include <memory>

using namespace Eigen;

// Forward declarations
float relu(float x);
float sigmoid(float x);
float tanh_activation(float x);
VectorXf softmax(const VectorXf& x);

"""

def _generate_activation_functions():
    """Generate activation function implementations."""
    return """// Activation functions
float relu(float x) {
    return std::max(0.0f, x);
}

float sigmoid(float x) {
    return 1.0f / (1.0f + std::exp(-x));
}

float tanh_activation(float x) {
    return std::tanh(x);
}

VectorXf softmax(const VectorXf& x) {
    VectorXf exp_x = (x.array() - x.maxCoeff()).exp();
    return exp_x / exp_x.sum();
}

"""

def _generate_layer_class():
    """Generate the Layer base class and Dense layer implementation."""
    return """// Base class for all layers
class Layer {
public:
    virtual ~Layer() = default;
    virtual VectorXf forward(const VectorXf& input) = 0;
    virtual std::string getName() const = 0;
};

// Dense (fully connected) layer
class Dense : public Layer {
public:
    Dense(int input_size, int output_size, const std::string& activation = "") 
        : weights_(MatrixXf::Random(output_size, input_size) * 0.1f),
          bias_(VectorXf::Zero(output_size)),
          activation_(activation) {}
    
    VectorXf forward(const VectorXf& input) override {
        VectorXf output = weights_ * input + bias_;
        
        // Apply activation
        if (activation_ == "relu") {
            return output.unaryExpr(&relu);
        } else if (activation_ == "sigmoid") {
            return output.unaryExpr(&sigmoid);
        } else if (activation_ == "tanh") {
            return output.unaryExpr(&tanh_activation);
        } else if (activation_ == "softmax") {
            return softmax(output);
        }
        
        return output;
    }
    
    std::string getName() const override {
        return "Dense";
    }
    
private:
    MatrixXf weights_;
    VectorXf bias_;
    std::string activation_;
};

"""

def _generate_model_class():
    """Generate the Model class that holds and executes layers."""
    return """// Neural Network Model
class Model {
public:
    void addLayer(std::unique_ptr<Layer> layer) {
        layers_.push_back(std::move(layer));
    }
    
    VectorXf predict(const VectorXf& input) {
        VectorXf output = input;
        for (const auto& layer : layers_) {
            output = layer->forward(output);
        }
        return output;
    }
    
private:
    std::vector<std::unique_ptr<Layer>> layers_;
};

"""

def _generate_model_definition(model):
    """Generate model definition code from IR."""
    lines = [f'// Model: {model.name}', 'void setupModel(Model& model) {']
    
    # Add layers
    for i, layer in enumerate(model.layers):
        activation = _get_activation_function(layer.activation)
        activation_param = f', "{activation}"' if activation else ''
        lines.append(f'    model.addLayer(std::make_unique<Dense>(/* input_size */ {layer.units if i == 0 else model.layers[i-1].units}, ' \
                   f'/* output_size */ {layer.units}{activation_param}));')
    
    lines.append('}')
    return '\n'.join(lines)

def _generate_main_function():
    """Generate the main function with example usage."""
    return """
int main() {
    // Initialize model
    Model model;
    setupModel(model);
    
    // Example usage:
    // VectorXf input = VectorXf::Random(input_size);
    // VectorXf output = model.predict(input);
    // std::cout << "Model output: " << output.transpose() << std::endl;
    
    return 0;
}
"""

def transpile_to_cpp(ir):
    """
    Convert AILang IR to C++ code using Eigen.
    
    Args:
        ir: The intermediate representation (IR) of the AILang program
        
    Returns:
        str: Generated C++ code as a string
    """
    code_parts = [
        _generate_includes(),
        _generate_activation_functions(),
        _generate_layer_class(),
        _generate_model_class()
    ]
    
    # Handle different IR components
    if hasattr(ir, 'models'):
        for model in ir.models:
            code_parts.append(_generate_model_definition(model))
    
    code_parts.append(_generate_main_function())
    
    # Join all code parts and remove empty lines
    return '\n'.join(filter(None, code_parts))
