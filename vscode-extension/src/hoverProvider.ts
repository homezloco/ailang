import * as vscode from 'vscode';
import { getSettingsManager } from './settingsManager';

interface HoverInfo {
    signature: string;
    description: string;
    examples?: string[];
    link?: string;
    parameters?: { [key: string]: string };
}

const HOVER_DOCS: Record<string, HoverInfo> = {
    // Training related
    'compile': {
        signature: 'compile optimizer=<optimizer> loss=<loss_function> metrics=[<metrics>]',
        description: 'Configures the model for training with the specified optimizer, loss function, and metrics to monitor.',
        parameters: {
            'optimizer': 'String or optimizer instance. The optimizer to use for training.',
            'loss': 'String or loss function. The loss function to use for training.',
            'metrics': 'List of metrics to be evaluated during training and testing.',
            'loss_weights': 'Optional list or dictionary specifying scalar coefficients to weight the loss contributions.',
            'weighted_metrics': 'List of metrics to be evaluated and weighted by sample_weight or class_weight during training and testing.',
            'run_eagerly': 'Boolean. If True, the model\'s logic will not be wrapped in a TensorFlow graph.',
            'steps_per_execution': 'Int. The number of batches to run during each training iteration.'
        },
        examples: [
            '```ailang\n// Basic compilation with Adam optimizer\ncompile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n\n// Using SGD with custom learning rate\ncompile optimizer=\'sgd(learning_rate=0.01, momentum=0.9)\' loss=\'mean_squared_error\' metrics=[\'mae\', \'mse\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/Model#compile'
    },
    'fit': {
        signature: 'fit x=<input_data> y=<target_data> epochs=<num_epochs> batch_size=<batch_size> [options]',
        description: 'Trains the model for a fixed number of epochs (iterations on a dataset).',
        parameters: {
            'x': 'Input data. Could be a Numpy array or a dataset.',
            'y': 'Target data. Could be a Numpy array or None if x is a dataset.',
            'batch_size': 'Integer or None. Number of samples per gradient update.',
            'epochs': 'Integer. Number of epochs to train the model.',
            'verbose': 'Integer. 0, 1, or 2. Verbosity mode.',
            'callbacks': 'List of callbacks to apply during training.',
            'validation_split': 'Float between 0 and 1. Fraction of the training data to be used as validation data.',
            'validation_data': 'Data on which to evaluate the loss and any model metrics at the end of each epoch.',
            'shuffle': 'Boolean. Whether to shuffle the training data before each epoch.',
            'class_weight': 'Dictionary mapping class indices to a weight value.',
            'sample_weight': 'Numpy array of weights for the training samples.',
            'initial_epoch': 'Integer. Epoch at which to start training.',
            'steps_per_epoch': 'Integer or None. Total number of steps (batches) before declaring one epoch finished.',
            'validation_steps': 'Integer or None. Total number of steps (batches) to validate before stopping.'
        },
        examples: [
            '```ailang\n// Basic training\nfit x=train_data y=train_labels epochs=10 batch_size=32\n\n// With validation and callbacks\nfit x=train_data y=train_labels epochs=20 batch_size=64 validation_split=0.2 verbose=1\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/Model#fit'
    },
    'evaluate': {
        signature: 'evaluate x=<test_data> y=<test_labels> [options]',
        description: 'Returns the loss value & metrics values for the model in test mode.',
        parameters: {
            'x': 'Input data. Could be a Numpy array or a dataset.',
            'y': 'Target data. Could be a Numpy array or None if x is a dataset.',
            'batch_size': 'Integer or None. Number of samples per batch.',
            'verbose': 'Integer. 0 or 1. Verbosity mode.',
            'sample_weight': 'Numpy array of weights for the test samples.',
            'steps': 'Integer or None. Total number of steps (batches) before declaring the evaluation round finished.',
            'callbacks': 'List of callbacks to apply during evaluation.'
        },
        examples: [
            '```ailang\n// Basic evaluation\nevaluate x=test_data y=test_labels\n\n// With batch size\nevaluate x=test_data y=test_labels batch_size=32 verbose=1\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/Model#evaluate'
    },
    'predict': {
        signature: 'predict x=<input_data> [options]',
        description: 'Generates output predictions for the input samples.',
        parameters: {
            'x': 'Input data. Could be a Numpy array or a dataset.',
            'batch_size': 'Integer or None. Number of samples per batch.',
            'verbose': 'Integer. 0 or 1. Verbosity mode.',
            'steps': 'Integer or None. Total number of steps (batches) before declaring the prediction round finished.',
            'callbacks': 'List of callbacks to apply during prediction.'
        },
        examples: [
            '```ailang\n// Basic prediction\npredict x=new_data\n\n// With batch size\npredict x=new_data batch_size=32 verbose=1\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/Model#predict'
    },
    // Model related
    'model': {
        signature: 'model ModelName { ... }',
        description: 'Defines a new AILang model with the specified architecture. The model block contains layer definitions and configurations for training.',
        examples: [
            '```ailang\nmodel MyModel {\n  // Define layers\n  input input_layer (28, 28, 1)\n  conv2d filters=32 kernel_size=(3, 3) activation=\'relu\'\n  maxpooling2d pool_size=(2, 2)\n  flatten\n  dense 128 activation=\'relu\'\n  dropout rate=0.2\n  dense 10 activation=\'softmax\'\n  \n  // Configure training\n  compile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n  fit x=train_data y=train_labels epochs=10 batch_size=32 validation_split=0.2\n}\n```'
        ],
        link: 'https://github.com/ailang-ai/ailang'
    },
    
    // Core layers
    'dense': {
        signature: 'dense units activation=<activation_function> [options]',
        description: 'Regular densely-connected neural network layer. Implements the operation: `output = activation(dot(input, kernel) + bias)`',
        parameters: {
            'units': 'Positive integer, dimensionality of the output space.',
            'activation': 'Activation function to use (e.g., \'relu\', \'sigmoid\', \'softmax\').',
            'use_bias': 'Boolean, whether the layer uses a bias vector.',
            'kernel_initializer': 'Initializer for the kernel weights matrix.',
            'bias_initializer': 'Initializer for the bias vector.',
            'kernel_regularizer': 'Regularizer function applied to the kernel weights matrix.',
            'bias_regularizer': 'Regularizer function applied to the bias vector.',
            'activity_regularizer': 'Regularizer function applied to the output of the layer.',
            'kernel_constraint': 'Constraint function applied to the kernel weights matrix.',
            'bias_constraint': 'Constraint function applied to the bias vector.'
        },
        examples: [
            '```ailang\n// Basic dense layer with 64 units and ReLU activation\ndense 64 activation=\'relu\'\n\n// Output layer with softmax activation for classification\ndense 10 activation=\'softmax\'\n\n// With custom initializers\ndense 128 activation=\'relu\' kernel_initializer=\'he_uniform\' bias_initializer=\'zeros\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/Dense'
    },
    
    'conv2d': {
        signature: 'conv2d filters=<num_filters> kernel_size=<size> [options]',
        description: '2D convolution layer (e.g., spatial convolution over images). This layer creates a convolution kernel that is convolved with the layer input to produce a tensor of outputs.',
        parameters: {
            'filters': 'Integer, the dimensionality of the output space (i.e., the number of output filters in the convolution).',
            'kernel_size': 'An integer or tuple/list of 2 integers, specifying the height and width of the 2D convolution window.',
            'strides': 'An integer or tuple/list of 2 integers, specifying the strides of the convolution along the height and width.',
            'padding': 'One of \'valid\' or \'same\' (case-insensitive).',
            'data_format': 'A string, one of \'channels_last\' or \'channels_first\'.',
            'dilation_rate': 'An integer or tuple/list of 2 integers, specifying the dilation rate to use for dilated convolution.',
            'activation': 'Activation function to use.',
            'use_bias': 'Boolean, whether the layer uses a bias vector.',
            'kernel_initializer': 'Initializer for the kernel weights matrix.',
            'bias_initializer': 'Initializer for the bias vector.'
        },
        examples: [
            '```ailang\n// Basic 2D convolution with 32 filters and 3x3 kernel\nconv2d filters=32 kernel_size=(3, 3) activation=\'relu\'\n\n// With stride and padding\nconv2d filters=64 kernel_size=(5, 5) strides=(2, 2) padding=\'same\' activation=\'relu\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/Conv2D'
    },
    
    'dropout': {
        signature: 'dropout rate=<rate> [options]',
        description: 'Applies Dropout to the input. Dropout consists of randomly setting a fraction `rate` of input units to 0 at each update during training time, which helps prevent overfitting.',
        parameters: {
            'rate': 'Float between 0 and 1. Fraction of the input units to drop.',
            'noise_shape': '1D integer tensor representing the shape of the binary dropout mask that will be multiplied with the input.',
            'seed': 'A Python integer to use as random seed.'
        },
        examples: [
            '```ailang\n// Dropout with 20% rate\ndropout rate=0.2\n\n// Higher dropout for more regularization\ndropout rate=0.5\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/Dropout'
    },
    
    'flatten': {
        signature: 'flatten',
        description: 'Flattens the input. Does not affect the batch size. Useful for transitioning between convolutional and dense layers.',
        examples: [
            '```ailang\n// After convolutional layers, before dense layers\nconv2d filters=32 kernel_size=(3, 3) activation=\'relu\'\nmaxpooling2d pool_size=(2, 2)\nflatten\ndense 128 activation=\'relu\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/Flatten'
    },
    
    'maxpooling2d': {
        signature: 'maxpooling2d pool_size=<size> [options]',
        description: 'Max pooling operation for 2D spatial data. Downsamples the input by taking the maximum value over a spatial window of size defined by pool_size.',
        parameters: {
            'pool_size': 'Integer or tuple of 2 integers, factors by which to downscale (vertical, horizontal).',
            'strides': 'Integer, tuple of 2 integers, or None. Strides values.',
            'padding': 'One of \'valid\' or \'same\' (case-insensitive).',
            'data_format': 'A string, one of \'channels_last\' or \'channels_first\'.'
        },
        examples: [
            '```ailang\n// Basic max pooling with 2x2 pool size\nmaxpooling2d pool_size=(2, 2)\n\n// With custom stride\nmaxpooling2d pool_size=(2, 2) strides=(2, 2) padding=\'valid\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/MaxPool2D'
    },
    
    'averagepooling2d': {
        signature: 'averagepooling2d pool_size=<size> [options]',
        description: 'Average pooling operation for 2D spatial data. Downsamples the input by taking the average value over a spatial window of size defined by pool_size.',
        parameters: {
            'pool_size': 'Integer or tuple of 2 integers, factors by which to downscale (vertical, horizontal).',
            'strides': 'Integer, tuple of 2 integers, or None. Strides values.',
            'padding': 'One of \'valid\' or \'same\' (case-insensitive).',
            'data_format': 'A string, one of \'channels_last\' or \'channels_first\'.'
        },
        examples: [
            '```ailang\n// Basic average pooling with 2x2 pool size\naveragepooling2d pool_size=(2, 2)\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/AveragePooling2D'
    },
    
    'lstm': {
        signature: 'lstm units=<num_units> [options]',
        description: 'Long Short-Term Memory layer - Hochreiter 1997. A recurrent layer that can learn long-term dependencies in sequence data.',
        parameters: {
            'units': 'Positive integer, dimensionality of the output space.',
            'activation': 'Activation function to use.',
            'recurrent_activation': 'Activation function to use for the recurrent step.',
            'use_bias': 'Boolean, whether the layer uses a bias vector.',
            'return_sequences': 'Boolean. Whether to return the last output in the output sequence, or the full sequence.',
            'return_state': 'Boolean. Whether to return the last state in addition to the output.',
            'go_backwards': 'Boolean. If True, process the input sequence backwards.',
            'stateful': 'Boolean. If True, the last state for each sample at index i in a batch will be used as initial state for the sample of index i in the following batch.'
        },
        examples: [
            '```ailang\n// Basic LSTM layer\nlstm units=128\n\n// LSTM returning full sequence for stacking multiple RNN layers\nlstm units=64 return_sequences=true\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/LSTM'
    },
    
    'gru': {
        signature: 'gru units=<num_units> [options]',
        description: 'Gated Recurrent Unit - Cho et al. 2014. A recurrent layer that is generally more efficient than LSTM.',
        parameters: {
            'units': 'Positive integer, dimensionality of the output space.',
            'activation': 'Activation function to use.',
            'recurrent_activation': 'Activation function to use for the recurrent step.',
            'use_bias': 'Boolean, whether the layer uses a bias vector.',
            'return_sequences': 'Boolean. Whether to return the last output in the output sequence, or the full sequence.',
            'return_state': 'Boolean. Whether to return the last state in addition to the output.',
            'go_backwards': 'Boolean. If True, process the input sequence backwards.',
            'stateful': 'Boolean. If True, the last state for each sample at index i in a batch will be used as initial state for the sample of index i in the following batch.'
        },
        examples: [
            '```ailang\n// Basic GRU layer\ngru units=128\n\n// GRU with custom activation\ngru units=64 activation=\'tanh\' recurrent_activation=\'sigmoid\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/GRU'
    },
    
    'batchnormalization': {
        signature: 'batchnormalization [options]',
        description: 'Batch normalization layer (Ioffe and Szegedy, 2014). Normalizes the activations of the previous layer at each batch, i.e. applies a transformation that maintains the mean activation close to 0 and the activation standard deviation close to 1.',
        parameters: {
            'axis': 'Integer, the axis that should be normalized (typically the features axis).',
            'momentum': 'Momentum for the moving average.',
            'epsilon': 'Small float added to variance to avoid dividing by zero.',
            'center': 'If True, add offset of beta to normalized tensor. If False, beta is ignored.',
            'scale': 'If True, multiply by gamma. If False, gamma is not used.'
        },
        examples: [
            '```ailang\n// Basic batch normalization\nbatchnormalization\n\n// With custom parameters\nbatchnormalization axis=1 momentum=0.99 epsilon=0.001\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/BatchNormalization'
    },
    
    // Activation functions
    'relu': {
        signature: 'activation=\'relu\'',
        description: 'Rectified Linear Unit activation function. Returns `max(x, 0)`, the element-wise maximum of 0 and the input tensor.',
        examples: [
            '```ailang\n// Used as a parameter in layers\ndense 64 activation=\'relu\'\nconv2d filters=32 kernel_size=(3, 3) activation=\'relu\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/activations/relu'
    },
    'sigmoid': {
        signature: 'activation=\'sigmoid\'',
        description: 'Sigmoid activation function. Returns `1 / (1 + exp(-x))`, element-wise. The sigmoid activation squashes real values to the range [0, 1]. It is commonly used for binary classification in the output layer.',
        examples: [
            '```ailang\n// Used as a parameter in layers\ndense 1 activation=\'sigmoid\' // For binary classification\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/activations/sigmoid'
    },
    'tanh': {
        signature: 'activation=\'tanh\'',
        description: 'Hyperbolic tangent activation function. Returns `tanh(x) = (exp(x) - exp(-x)) / (exp(x) + exp(-x))`, element-wise. The tanh activation squashes real values to the range [-1, 1].',
        examples: [
            '```ailang\n// Used as a parameter in layers\ndense 64 activation=\'tanh\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/activations/tanh'
    },
    'softmax': {
        signature: 'activation=\'softmax\'',
        description: 'Softmax activation function. Returns the normalized exponential function of the input tensor. The softmax activation is often used as the output activation for multi-class classification problems, as it converts a vector of values to a probability distribution.',
        examples: [
            '```ailang\n// Used as a parameter in the output layer for multi-class classification\ndense 10 activation=\'softmax\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/activations/softmax'
    },
    'leakyrelu': {
        signature: 'activation=\'leakyrelu\'',
        description: 'Leaky version of a Rectified Linear Unit. It allows a small gradient when the unit is not active: `f(x) = alpha * x for x < 0, f(x) = x for x >= 0`.',
        examples: [
            '```ailang\n// Used as a parameter in layers\ndense 64 activation=\'leakyrelu\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/layers/LeakyReLU'
    },
    'elu': {
        signature: 'activation=\'elu\'',
        description: 'Exponential Linear Unit. The ELU activation: `f(x) = alpha * (exp(x) - 1) for x < 0, f(x) = x for x >= 0`.',
        examples: [
            '```ailang\n// Used as a parameter in layers\ndense 64 activation=\'elu\'\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/activations/elu'
    },
    
    // Optimizers
    'adam': {
        signature: 'optimizer=\'adam(learning_rate=0.001, beta_1=0.9, beta_2=0.999, epsilon=1e-7)\'',
        description: 'Adam optimizer (Kingma & Ba, 2014). A stochastic gradient descent method that is based on adaptive estimation of first-order and second-order moments.',
        parameters: {
            'learning_rate': 'A float, the learning rate.',
            'beta_1': 'A float, exponential decay rate for the 1st moment estimates.',
            'beta_2': 'A float, exponential decay rate for the 2nd moment estimates.',
            'epsilon': 'A small constant for numerical stability.'
        },
        examples: [
            '```ailang\n// Default Adam optimizer\ncompile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n\n// With custom learning rate\ncompile optimizer=\'adam(learning_rate=0.0001)\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/Adam'
    },
    'sgd': {
        signature: 'optimizer=\'sgd(learning_rate=0.01, momentum=0.0, nesterov=false)\'',
        description: 'Stochastic gradient descent optimizer with support for momentum, learning rate decay, and Nesterov momentum.',
        parameters: {
            'learning_rate': 'A float, the learning rate.',
            'momentum': 'A float, accelerates SGD in the relevant direction and dampens oscillations.',
            'nesterov': 'A boolean, whether to apply Nesterov momentum.'
        },
        examples: [
            '```ailang\n// Basic SGD\ncompile optimizer=\'sgd\' loss=\'mean_squared_error\' metrics=[\'mae\']\n\n// SGD with momentum\ncompile optimizer=\'sgd(learning_rate=0.01, momentum=0.9)\' loss=\'mean_squared_error\' metrics=[\'mae\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/SGD'
    },
    'rmsprop': {
        signature: 'optimizer=\'rmsprop(learning_rate=0.001, rho=0.9, epsilon=1e-7)\'',
        description: 'RMSprop optimizer. It is recommended to leave the parameters of this optimizer at their default values (except the learning rate, which can be freely tuned).',
        parameters: {
            'learning_rate': 'A float, the learning rate.',
            'rho': 'A float, discounting factor for the history/coming gradient.',
            'epsilon': 'A small constant for numerical stability.'
        },
        examples: [
            '```ailang\n// Default RMSprop\ncompile optimizer=\'rmsprop\' loss=\'binary_crossentropy\' metrics=[\'accuracy\']\n\n// With custom learning rate\ncompile optimizer=\'rmsprop(learning_rate=0.0005)\' loss=\'binary_crossentropy\' metrics=[\'accuracy\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/optimizers/RMSprop'
    },
    
    // Loss functions
    'categorical_crossentropy': {
        signature: 'loss=\'categorical_crossentropy\'',
        description: 'Categorical crossentropy loss. Used for multi-class classification with one-hot encoded targets.',
        examples: [
            '```ailang\n// For multi-class classification with one-hot encoded labels\ncompile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/losses/CategoricalCrossentropy'
    },
    'sparse_categorical_crossentropy': {
        signature: 'loss=\'sparse_categorical_crossentropy\'',
        description: 'Sparse categorical crossentropy loss. Used for multi-class classification with integer targets.',
        examples: [
            '```ailang\n// For multi-class classification with integer encoded labels\ncompile optimizer=\'adam\' loss=\'sparse_categorical_crossentropy\' metrics=[\'accuracy\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/losses/SparseCategoricalCrossentropy'
    },
    'binary_crossentropy': {
        signature: 'loss=\'binary_crossentropy\'',
        description: 'Binary crossentropy loss. Used for binary classification.',
        examples: [
            '```ailang\n// For binary classification\ncompile optimizer=\'adam\' loss=\'binary_crossentropy\' metrics=[\'accuracy\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/losses/BinaryCrossentropy'
    },
    'mean_squared_error': {
        signature: 'loss=\'mean_squared_error\'',
        description: 'Mean squared error loss. Used for regression problems.',
        examples: [
            '```ailang\n// For regression problems\ncompile optimizer=\'adam\' loss=\'mean_squared_error\' metrics=[\'mae\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/losses/MeanSquaredError'
    },
    'mean_absolute_error': {
        signature: 'loss=\'mean_absolute_error\'',
        description: 'Mean absolute error loss. Used for regression problems.',
        examples: [
            '```ailang\n// For regression problems\ncompile optimizer=\'adam\' loss=\'mean_absolute_error\' metrics=[\'mse\']\n```'
        ],
        link: 'https://www.tensorflow.org/api_docs/python/tf/keras/losses/MeanAbsoluteError'
    }
};

export class AILangHoverProvider implements vscode.HoverProvider {
    constructor() {
        // No need to initialize config here as we'll use the settings manager
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        try {
            // Get settings manager
            const settingsManager = getSettingsManager();
            
            // Check if hover is enabled
            if (!settingsManager.hoverEnabled) {
                return undefined;
            }
            
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return undefined;
            }

            const word = document.getText(wordRange).toLowerCase();
            const line = document.lineAt(position.line).text;

            console.log('Hover requested for word:', word);
            
            // Check if the word exists in our hover documentation
            let hoverInfo = HOVER_DOCS[word];
            
            // If not found directly, try to determine context
            if (!hoverInfo) {
                const contextInfo = this.getContextFromLine(line, word);
                if (contextInfo) {
                    hoverInfo = HOVER_DOCS[contextInfo];
                }
            }

            if (!hoverInfo) {
                console.log('No hover info found for:', word);
                return undefined;
            }

            console.log('Found hover info for:', word);
            const markdown = new vscode.MarkdownString();
            
            // Add signature
            markdown.appendCodeblock(hoverInfo.signature, 'ailang');
            markdown.appendMarkdown('\n\n' + hoverInfo.description);

            // Add parameters section if available
            if (hoverInfo.parameters && Object.keys(hoverInfo.parameters).length > 0) {
                markdown.appendMarkdown('\n\n### Parameters\n');
                for (const [param, desc] of Object.entries(hoverInfo.parameters)) {
                    markdown.appendMarkdown(`- **${param}**: ${desc}\n`);
                }
            }

            // Add examples section if available and enabled in settings
            if (settingsManager.showExamples && hoverInfo.examples && hoverInfo.examples.length > 0) {
                markdown.appendMarkdown('\n\n### Examples\n');
                hoverInfo.examples.forEach(example => {
                    markdown.appendMarkdown(example + '\n');
                });
            }

            // Add documentation link if available
            if (hoverInfo.link) {
                markdown.appendMarkdown(`\n\n[Documentation](${hoverInfo.link})`);
            }

            // Set isTrusted to true to allow command execution in markdown
            markdown.isTrusted = true;
            
            return new vscode.Hover(markdown, wordRange);
        } catch (error) {
            console.error('Error in provideHover:', error);
            return undefined;
        }
    }
    
    /**
     * Attempts to determine the context of a word based on the current line
     * @param line The current line text
     * @param word The word being hovered
     * @returns A context identifier that can be used to look up hover info
     */
    private getContextFromLine(line: string, word: string): string | null {
        // Check if we're in a parameter context (e.g., activation='relu')
        const paramMatch = line.match(/(\w+)\s*=\s*['"](\w+)['"]/);
        if (paramMatch && paramMatch[2].toLowerCase() === word) {
            const paramType = paramMatch[1].toLowerCase();
            if (paramType === 'activation' || paramType === 'optimizer' || paramType === 'loss') {
                return word; // The word itself is the context
            }
        }

        // Check if we're in a layer definition
        const layerMatch = line.match(/^\s*(\w+)\s/);
        if (layerMatch && layerMatch[1].toLowerCase() === word) {
            return word; // The word is a layer name
        }

        return null;
    }
}

export function registerHoverProvider(context: vscode.ExtensionContext): void {
    console.log('Registering hover provider for AILang');
    try {
        // Check if hover is enabled in settings
        const settingsManager = getSettingsManager();
        if (!settingsManager.hoverEnabled) {
            console.log('Hover provider registration skipped - hover is disabled in settings');
            return;
        }
        
        const hoverProvider = vscode.languages.registerHoverProvider(
            { scheme: 'file', language: 'ailang' },
            new AILangHoverProvider()
        );
        context.subscriptions.push(hoverProvider);
        console.log('Hover provider registered successfully for AILang');
        
        // Log all registered languages for debugging
        const languages = vscode.workspace.textDocuments.map(doc => doc.languageId);
        console.log('Currently registered languages in workspace:', [...new Set(languages)]);
        
    } catch (error) {
        console.error('Failed to register hover provider:', error);
        vscode.window.showErrorMessage(`Failed to register AILang hover provider: ${error}`);
    }
}
