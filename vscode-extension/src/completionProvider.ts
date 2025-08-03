import * as vscode from 'vscode';

type LayerSnippet = {
    label: string;
    detail: string;
    documentation: string;
    insertText: vscode.SnippetString;
    sortText: string;
};

export class AILangCompletionItemProvider implements vscode.CompletionItemProvider {
    private readonly snippets: vscode.CompletionItem[] = [];
    
    // Layer parameter definitions for context-aware suggestions
    private readonly layerParameters: { [layerType: string]: { [param: string]: { type: string, description: string } } } = {
        'dense': {
            'units': { type: 'number', description: 'Number of output units' },
            'activation': { type: 'string', description: 'Activation function' },
            'use_bias': { type: 'boolean', description: 'Whether to use a bias term' },
            'kernel_initializer': { type: 'string', description: 'Initializer for kernel weights' },
            'bias_initializer': { type: 'string', description: 'Initializer for bias vector' },
            'kernel_regularizer': { type: 'string', description: 'Regularizer for kernel weights' },
            'bias_regularizer': { type: 'string', description: 'Regularizer for bias vector' },
            'activity_regularizer': { type: 'string', description: 'Regularizer for layer output' },
            'kernel_constraint': { type: 'string', description: 'Constraint for kernel weights' },
            'bias_constraint': { type: 'string', description: 'Constraint for bias vector' }
        },
        'conv2d': {
            'filters': { type: 'number', description: 'Number of output filters' },
            'kernel_size': { type: 'tuple', description: 'Size of convolution kernel' },
            'strides': { type: 'tuple', description: 'Stride of convolution' },
            'padding': { type: 'string', description: 'Padding mode' },
            'data_format': { type: 'string', description: 'Channel ordering' },
            'dilation_rate': { type: 'tuple', description: 'Dilation rate for dilated convolution' },
            'activation': { type: 'string', description: 'Activation function' },
            'use_bias': { type: 'boolean', description: 'Whether to use a bias term' },
            'kernel_initializer': { type: 'string', description: 'Initializer for kernel weights' },
            'bias_initializer': { type: 'string', description: 'Initializer for bias vector' }
        },
        'lstm': {
            'units': { type: 'number', description: 'Number of output units' },
            'activation': { type: 'string', description: 'Activation function' },
            'recurrent_activation': { type: 'string', description: 'Activation for recurrent step' },
            'use_bias': { type: 'boolean', description: 'Whether to use a bias term' },
            'kernel_initializer': { type: 'string', description: 'Initializer for input kernel' },
            'recurrent_initializer': { type: 'string', description: 'Initializer for recurrent kernel' },
            'bias_initializer': { type: 'string', description: 'Initializer for bias vector' },
            'return_sequences': { type: 'boolean', description: 'Whether to return the full sequence' },
            'return_state': { type: 'boolean', description: 'Whether to return the last state' },
            'go_backwards': { type: 'boolean', description: 'Process the sequence backwards' },
            'stateful': { type: 'boolean', description: 'Whether to reuse state between batches' },
            'dropout': { type: 'number', description: 'Dropout rate for inputs' },
            'recurrent_dropout': { type: 'number', description: 'Dropout rate for recurrent state' }
        }
        // Add more layer types as needed
    };
    
    // Compile parameters for context-aware suggestions
    private readonly compileParameters: { [param: string]: { type: string, description: string } } = {
        'optimizer': { type: 'string', description: 'Optimizer algorithm' },
        'loss': { type: 'string', description: 'Loss function' },
        'metrics': { type: 'array', description: 'List of metrics to monitor' },
        'loss_weights': { type: 'array', description: 'Weights for multi-output models' },
        'weighted_metrics': { type: 'array', description: 'List of metrics to weight by sample' },
        'run_eagerly': { type: 'boolean', description: 'Whether to run eagerly' },
        'steps_per_execution': { type: 'number', description: 'Steps per execution' }
    };
    
    // Fit parameters for context-aware suggestions
    private readonly fitParameters: { [param: string]: { type: string, description: string } } = {
        'x': { type: 'string', description: 'Input data' },
        'y': { type: 'string', description: 'Target data' },
        'batch_size': { type: 'number', description: 'Number of samples per batch' },
        'epochs': { type: 'number', description: 'Number of epochs to train' },
        'verbose': { type: 'number', description: 'Verbosity mode (0, 1, or 2)' },
        'callbacks': { type: 'array', description: 'List of callbacks' },
        'validation_split': { type: 'number', description: 'Fraction of data for validation' },
        'validation_data': { type: 'string', description: 'Validation data' },
        'shuffle': { type: 'boolean', description: 'Whether to shuffle training data' },
        'class_weight': { type: 'object', description: 'Class weights' },
        'sample_weight': { type: 'string', description: 'Sample weights' },
        'initial_epoch': { type: 'number', description: 'Epoch at which to start training' },
        'steps_per_epoch': { type: 'number', description: 'Steps per epoch' },
        'validation_steps': { type: 'number', description: 'Validation steps' }
    };
    
    constructor() {
        this.snippets = this.createCompletionItems();
    }

    private createCompletionItems(): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];
        
        // Model structure
        items.push(this.createSnippet('model', 'Model definition', 'Define a new neural network model',
            'model ${1:ModelName} {\n\t$0\n}'));

        // Input layer
        items.push(this.createSnippet('input', 'Input layer', 'Define an input layer',
            'input ${1:input_name} (${2:shape})'));

        // Core layers
        items.push(this.createSnippet('dense', 'Dense layer', 'Fully connected layer',
            'dense ${1:units} activation=\'${2|relu,tanh,sigmoid,softmax,linear|}\''));
            
        items.push(this.createSnippet('conv1d', '1D Convolution', '1D Convolutional layer',
            'conv1d ${1:filters}=${2:64} kernel_size=${3:3} activation=\'${4|relu,tanh,sigmoid,linear|}\''));
            
        items.push(this.createSnippet('conv2d', '2D Convolution', '2D Convolutional layer',
            'conv2d ${1:filters}=${2:32} kernel_size=(${3:3}, ${4:3}) activation=\'${5|relu,tanh,sigmoid,linear|}\''));
            
        items.push(this.createSnippet('lstm', 'LSTM layer', 'Long Short-Term Memory layer',
            'lstm ${1:units}=${2:128} return_sequences=${3|true,false|}'));
            
        items.push(this.createSnippet('gru', 'GRU layer', 'Gated Recurrent Unit layer',
            'gru ${1:units}=${2:128} return_sequences=${3|true,false|}'));
            
        // Pooling layers
        items.push(this.createSnippet('maxpooling1d', '1D Max Pooling', '1D Max Pooling layer',
            'maxpooling1d pool_size=${1:2}'));
            
        items.push(this.createSnippet('maxpooling2d', '2D Max Pooling', '2D Max Pooling layer',
            'maxpooling2d pool_size=(${1:2}, ${2:2})'));
            
        items.push(this.createSnippet('globalmaxpooling1d', 'Global 1D Max Pooling', 'Global 1D Max Pooling layer',
            'globalmaxpooling1d'));

        // Regularization
        items.push(this.createSnippet('dropout', 'Dropout layer', 'Applies Dropout to the input',
            'dropout rate=${1:0.5}'));
            
        items.push(this.createSnippet('batchnormalization', 'Batch Normalization', 'Batch Normalization layer',
            'batchnormalization'));

        // Core tensor ops
        items.push(this.createSnippet('flatten', 'Flatten layer', 'Flattens the input',
            'flatten'));
            
        items.push(this.createSnippet('reshape', 'Reshape layer', 'Reshapes the output to the specified shape',
            'reshape target_shape=(${1:shape})'));
            
        items.push(this.createSnippet('concatenate', 'Concatenate', 'Concatenates inputs',
            'concatenate [${1:input1}, ${2:input2}]'));

        // Model configuration
        items.push(this.createSnippet('compile', 'Compile model', 'Configures the model for training',
            'compile optimizer=\'${1|adam,sgd,rmsprop,adagrad,adadelta,adamax,nadam|}\' loss=\'${2|categorical_crossentropy,sparse_categorical_crossentropy,binary_crossentropy,mean_squared_error,mean_absolute_error,huber_loss|}\' metrics=[\'${3|accuracy,precision,recall,auc,mse,mae|}\']'));
            
        items.push(this.createSnippet('fit', 'Fit model', 'Trains the model',
            'fit x=${1:X_train} y=${2:y_train} epochs=${3:10} batch_size=${4:32} validation_split=${5:0.2} verbose=${6|0,1,2|}'));
            
        items.push(this.createSnippet('evaluate', 'Evaluate model', 'Evaluates the model',
            'evaluate x=${1:X_test} y=${2:y_test} batch_size=${3:32} verbose=${4|0,1|}'));
            
        items.push(this.createSnippet('predict', 'Make predictions', 'Generates output predictions',
            'predict x=${1:X_test} batch_size=${2:32} verbose=${3|0,1|}'));

        // Training configuration
        items.push(this.createSnippet('optimizer', 'Optimizer', 'Configure optimizer',
            'optimizer: ${1|adam,sgd,rmsprop,adagrad,adadelta,adamax,nadam|}'));
            
        items.push(this.createSnippet('loss', 'Loss function', 'Configure loss function',
            'loss: ${1|categorical_crossentropy,sparse_categorical_crossentropy,binary_crossentropy,mean_squared_error,mean_absolute_error,huber_loss|}'));
            
        items.push(this.createSnippet('metrics', 'Metrics', 'Configure metrics',
            'metrics: [${1|accuracy,precision,recall,auc,mse,mae|}]'));

        return items.map((item, index) => {
            const completionItem = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.Function);
            if (item.detail) {
                completionItem.detail = item.detail;
            }
            if (item.documentation) {
                const docString = typeof item.documentation === 'string' ? item.documentation : item.documentation.value;
                completionItem.documentation = new vscode.MarkdownString(docString);
            }
            if (item.insertText) {
                completionItem.insertText = item.insertText;
            }
            completionItem.sortText = index.toString().padStart(3, '0');
            return completionItem;
        });
    }
    
    private createSnippet(label: string, detail: string, documentation: string, insertText: string): LayerSnippet {
        return {
            label,
            detail,
            documentation,
            insertText: new vscode.SnippetString(insertText),
            sortText: label
        };
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        const lineSuffix = document.lineAt(position).text.substring(position.character);
        const fullLine = document.lineAt(position).text;
        
        // Get the current word being typed
        const wordRange = document.getWordRangeAtPosition(position, /[\w.]+/);
        const currentWord = wordRange ? document.getText(wordRange) : '';
        
        // Analyze document context for smarter suggestions
        const documentContext = this.analyzeDocumentContext(document, position);
        
        // Check if we're in a parameter context (after = or :)
        const isParameterValue = /[=:][^=:]*$/.test(linePrefix);
        
        // Check if we're inside a model block
        const isInsideModelBlock = this.isInsideModelBlock(document, position);
        
        // Check if we're inside a compile statement
        const isInsideCompileStatement = fullLine.trim().startsWith('compile');
        
        // Check if we're inside a fit statement
        const isInsideFitStatement = fullLine.trim().startsWith('fit');
        
        // Filter snippets based on context
        let filteredItems: vscode.CompletionItem[] = [];
        
        // If we're in a parameter value, show relevant completions
        if (isParameterValue) {
            const paramMatch = linePrefix.match(/([\w_]+)\s*[=:]\s*['"]?([^'"=:]*)$/);
            const paramName = paramMatch ? paramMatch[1].trim().toLowerCase() : '';
            const paramValue = paramMatch ? paramMatch[2].trim().toLowerCase() : '';
            
            // Handle specific parameter values based on context
            if (paramName === 'activation') {
                filteredItems = this.getActivations();
            } else if (paramName === 'optimizer') {
                filteredItems = this.getOptimizers();
            } else if (paramName === 'loss') {
                filteredItems = this.getLosses();
            } else if (paramName === 'metrics') {
                filteredItems = this.getMetrics();
            } else if (paramName === 'kernel_initializer') {
                filteredItems = this.getInitializers();
            } else if (paramName === 'bias_initializer') {
                filteredItems = this.getInitializers();
            } else if (paramName === 'padding') {
                filteredItems = this.getPaddingOptions();
            } else if (paramName === 'data_format') {
                filteredItems = this.getDataFormatOptions();
            } else {
                // Default parameter values - try to infer from context
                if (isInsideCompileStatement) {
                    // Suggest compile-specific parameters
                    filteredItems = this.getCompileParameters(paramName);
                } else if (isInsideFitStatement) {
                    // Suggest fit-specific parameters
                    filteredItems = this.getFitParameters(paramName);
                } else {
                    // Try to infer layer type and suggest appropriate parameters
                    const layerType = this.inferLayerTypeFromLine(fullLine);
                    if (layerType) {
                        filteredItems = this.getLayerParameters(layerType, paramName);
                    }
                }
            }
        } else {
            // Not in a parameter value context
            if (isInsideModelBlock) {
                // Inside a model block, suggest layers
                filteredItems = this.getLayerSuggestions();
                
                // If we have a current word, filter by it
                if (currentWord) {
                    filteredItems = filteredItems.filter(item => 
                        (item.label as string).toLowerCase().includes(currentWord.toLowerCase())
                    );
                }
            } else {
                // Outside model block, suggest model structure items
                filteredItems = this.getModelStructureSuggestions();
                
                // If we have a current word, filter by it
                if (currentWord) {
                    filteredItems = filteredItems.filter(item => 
                        (item.label as string).toLowerCase().includes(currentWord.toLowerCase())
                    );
                }
            }
        }
        
        return filteredItems.length > 0 ? filteredItems : this.snippets;
    }
    
    private getActivations(): vscode.CompletionItem[] {
        const activations = [
            'relu', 'sigmoid', 'tanh', 'softmax', 'softplus', 
            'softsign', 'selu', 'elu', 'exponential', 'linear'
        ];
        
        return activations.map(act => {
            const item = new vscode.CompletionItem(act, vscode.CompletionItemKind.Value);
            item.insertText = act;
            item.detail = 'Activation function';
            return item;
        });
    }
    
    private getOptimizers(): vscode.CompletionItem[] {
        const optimizers = [
            { name: 'adam', desc: 'Adam optimizer' },
            { name: 'sgd', desc: 'Stochastic Gradient Descent' },
            { name: 'rmsprop', desc: 'RMSprop optimizer' },
            { name: 'adagrad', desc: 'Adagrad optimizer' },
            { name: 'adadelta', desc: 'Adadelta optimizer' },
            { name: 'adamax', desc: 'Adamax optimizer' },
            { name: 'nadam', desc: 'Nesterov Adam optimizer' },
            { name: 'ftrl', desc: 'FTRL optimizer' }
        ];
        
        return optimizers.map(opt => {
            const item = new vscode.CompletionItem(opt.name, vscode.CompletionItemKind.Value);
            item.insertText = opt.name;
            item.detail = opt.desc;
            item.documentation = new vscode.MarkdownString(`**${opt.name}**\n\n${opt.desc}`);
            return item;
        });
    }
    
    private getLosses(): vscode.CompletionItem[] {
        const losses = [
            { name: 'categorical_crossentropy', desc: 'Cross-entropy loss for multi-class classification' },
            { name: 'sparse_categorical_crossentropy', desc: 'Cross-entropy for integer-encoded labels' },
            { name: 'binary_crossentropy', desc: 'Cross-entropy for binary classification' },
            { name: 'mean_squared_error', desc: 'Mean squared error loss' },
            { name: 'mean_absolute_error', desc: 'Mean absolute error loss' },
            { name: 'mean_squared_logarithmic_error', desc: 'Logarithmic mean squared error' },
            { name: 'squared_hinge', desc: 'Squared hinge loss' },
            { name: 'hinge', desc: 'Hinge loss' },
            { name: 'categorical_hinge', desc: 'Categorical hinge loss' },
            { name: 'logcosh', desc: 'Logarithm of the hyperbolic cosine of the prediction error' },
            { name: 'huber_loss', desc: 'Huber loss' },
            { name: 'poisson', desc: 'Poisson loss' },
            { name: 'kullback_leibler_divergence', desc: 'Kullback-Leibler divergence' },
            { name: 'cosine_similarity', desc: 'Cosine similarity' }
        ];
        
        return losses.map(loss => {
            const item = new vscode.CompletionItem(loss.name, vscode.CompletionItemKind.Value);
            item.insertText = loss.name;
            item.detail = loss.desc;
            item.documentation = new vscode.MarkdownString(`**${loss.name}**\n\n${loss.desc}`);
            return item;
        });
    }
    
    private getMetrics(): vscode.CompletionItem[] {
        const metrics = [
            { name: 'accuracy', desc: 'Calculates how often predictions equal labels' },
            { name: 'precision', desc: 'Computes the precision of the predictions' },
            { name: 'recall', desc: 'Computes the recall of the predictions' },
            { name: 'auc', desc: 'Computes Area Under the Curve' },
            { name: 'mse', desc: 'Mean squared error' },
            { name: 'mae', desc: 'Mean absolute error' },
            { name: 'mape', desc: 'Mean absolute percentage error' },
            { name: 'msle', desc: 'Mean squared logarithmic error' },
            { name: 'cosine_similarity', desc: 'Cosine similarity' }
        ];
        
        return metrics.map(metric => {
            const item = new vscode.CompletionItem(metric.name, vscode.CompletionItemKind.Value);
            item.insertText = metric.name;
            item.detail = metric.desc;
            item.documentation = new vscode.MarkdownString(`**${metric.name}**\n\n${metric.desc}`);
            return item;
        });
    }
    
    /**
     * Analyze the document context to provide more relevant suggestions
     */
    private analyzeDocumentContext(document: vscode.TextDocument, position: vscode.Position): any {
        const text = document.getText();
        const cursorOffset = document.offsetAt(position);
        
        // Find model blocks
        const modelBlocks: { start: number, end: number, name: string }[] = [];
        const modelRegex = /model\s+([\w_]+)\s*\{([^}]*)\}/gs;
        let match;
        
        while ((match = modelRegex.exec(text)) !== null) {
            modelBlocks.push({
                start: match.index,
                end: match.index + match[0].length,
                name: match[1]
            });
        }
        
        // Find current model block
        const currentModelBlock = modelBlocks.find(block => 
            cursorOffset >= block.start && cursorOffset <= block.end
        );
        
        // Find layer declarations
        const layers: { type: string, name: string, line: number }[] = [];
        const lineCount = document.lineCount;
        
        for (let i = 0; i < lineCount; i++) {
            const line = document.lineAt(i).text;
            const layerMatch = line.match(/^\s*([\w_]+)\s+([\w_]+)\s*\(?/);
            
            if (layerMatch) {
                layers.push({
                    type: layerMatch[1],
                    name: layerMatch[2],
                    line: i
                });
            }
        }
        
        return {
            modelBlocks,
            currentModelBlock,
            layers
        };
    }
    
    /**
     * Check if the cursor is inside a model block
     */
    private isInsideModelBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        const context = this.analyzeDocumentContext(document, position);
        return context.currentModelBlock !== undefined;
    }
    
    /**
     * Get initializer options for weights and biases
     */
    private getInitializers(): vscode.CompletionItem[] {
        const initializers = [
            { name: 'glorot_uniform', desc: 'Glorot/Xavier uniform initializer' },
            { name: 'glorot_normal', desc: 'Glorot/Xavier normal initializer' },
            { name: 'he_uniform', desc: 'He/Kaiming uniform initializer' },
            { name: 'he_normal', desc: 'He/Kaiming normal initializer' },
            { name: 'zeros', desc: 'Initialize with zeros' },
            { name: 'ones', desc: 'Initialize with ones' },
            { name: 'random_normal', desc: 'Random normal initializer' },
            { name: 'random_uniform', desc: 'Random uniform initializer' },
            { name: 'truncated_normal', desc: 'Truncated normal initializer' },
            { name: 'orthogonal', desc: 'Orthogonal initializer' }
        ];
        
        return initializers.map(init => {
            const item = new vscode.CompletionItem(init.name, vscode.CompletionItemKind.Value);
            item.insertText = init.name;
            item.detail = init.desc;
            item.documentation = new vscode.MarkdownString(`**${init.name}**\n\n${init.desc}`);
            return item;
        });
    }
    
    /**
     * Get padding options for convolutional layers
     */
    private getPaddingOptions(): vscode.CompletionItem[] {
        const options = [
            { name: 'valid', desc: 'No padding' },
            { name: 'same', desc: 'Padding to maintain same output dimensions' },
            { name: 'causal', desc: 'Causal padding for temporal data' }
        ];
        
        return options.map(opt => {
            const item = new vscode.CompletionItem(opt.name, vscode.CompletionItemKind.Value);
            item.insertText = opt.name;
            item.detail = opt.desc;
            item.documentation = new vscode.MarkdownString(`**${opt.name}**\n\n${opt.desc}`);
            return item;
        });
    }
    
    /**
     * Get data format options
     */
    private getDataFormatOptions(): vscode.CompletionItem[] {
        const options = [
            { name: 'channels_last', desc: 'Data format with channels last (default)' },
            { name: 'channels_first', desc: 'Data format with channels first' }
        ];
        
        return options.map(opt => {
            const item = new vscode.CompletionItem(opt.name, vscode.CompletionItemKind.Value);
            item.insertText = opt.name;
            item.detail = opt.desc;
            item.documentation = new vscode.MarkdownString(`**${opt.name}**\n\n${opt.desc}`);
            return item;
        });
    }
    
    /**
     * Get compile parameters as completion items
     */
    private getCompileParameters(paramName?: string): vscode.CompletionItem[] {
        // If a specific parameter name is provided, filter by it
        const params = paramName ? 
            Object.entries(this.compileParameters).filter(([key]) => key.includes(paramName)) :
            Object.entries(this.compileParameters);
        
        return params.map(([key, value]) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.insertText = key + '=';
            item.detail = value.description;
            item.documentation = new vscode.MarkdownString(`**${key}** (${value.type})\n\n${value.description}`);
            return item;
        });
    }
    
    /**
     * Get fit parameters as completion items
     */
    private getFitParameters(paramName?: string): vscode.CompletionItem[] {
        // If a specific parameter name is provided, filter by it
        const params = paramName ? 
            Object.entries(this.fitParameters).filter(([key]) => key.includes(paramName)) :
            Object.entries(this.fitParameters);
        
        return params.map(([key, value]) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.insertText = key + '=';
            item.detail = value.description;
            item.documentation = new vscode.MarkdownString(`**${key}** (${value.type})\n\n${value.description}`);
            return item;
        });
    }
    
    /**
     * Infer the layer type from a line of text
     */
    private inferLayerTypeFromLine(line: string): string | undefined {
        const match = line.trim().match(/^([\w_]+)\s/);
        if (match && this.layerParameters[match[1]]) {
            return match[1];
        }
        return undefined;
    }
    
    /**
     * Get layer parameters as completion items
     */
    private getLayerParameters(layerType: string, paramName?: string): vscode.CompletionItem[] {
        if (!this.layerParameters[layerType]) {
            return [];
        }
        
        // If a specific parameter name is provided, filter by it
        const params = paramName ? 
            Object.entries(this.layerParameters[layerType]).filter(([key]) => key.includes(paramName)) :
            Object.entries(this.layerParameters[layerType]);
        
        return params.map(([key, value]) => {
            const item = new vscode.CompletionItem(key, vscode.CompletionItemKind.Property);
            item.insertText = key + '=';
            item.detail = value.description;
            item.documentation = new vscode.MarkdownString(`**${key}** (${value.type})\n\n${value.description}`);
            return item;
        });
    }
    
    /**
     * Get layer suggestions for inside model blocks
     */
    private getLayerSuggestions(): vscode.CompletionItem[] {
        // Filter snippets to only include layer types
        return this.snippets.filter(item => {
            const label = item.label as string;
            return !['model', 'compile', 'fit', 'evaluate', 'predict'].includes(label);
        });
    }
    
    /**
     * Get model structure suggestions for outside model blocks
     */
    private getModelStructureSuggestions(): vscode.CompletionItem[] {
        // Filter snippets to only include model structure items
        return this.snippets.filter(item => {
            const label = item.label as string;
            return ['model', 'compile', 'fit', 'evaluate', 'predict'].includes(label);
        });
    }
}

// Register the completion provider
export function registerCompletionProvider(context: vscode.ExtensionContext) {
    const provider = vscode.languages.registerCompletionItemProvider(
        'ailang',
        new AILangCompletionItemProvider(),
        ' ' // Trigger completion on space
    );
    
    context.subscriptions.push(provider);
}
