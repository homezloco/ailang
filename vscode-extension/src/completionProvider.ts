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
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const lineSuffix = document.lineAt(position).text.substr(position.character);
        
        // Get the current word being typed
        const wordRange = document.getWordRangeAtPosition(position, /[\w.]+/);
        const currentWord = wordRange ? document.getText(wordRange) : '';
        
        // Check if we're in a parameter context (after = or :)
        const isParameterValue = /[=:][^=:]*$/.test(linePrefix);
        
        // Filter snippets based on context
        let filteredItems = this.snippets;
        
        // If we're in a parameter value, show relevant completions
        if (isParameterValue) {
            const paramName = linePrefix.split(/[=:]/).pop()?.trim().toLowerCase();
            
            // Handle specific parameter values
            if (paramName === 'activation') {
                filteredItems = this.getActivations();
            } else if (paramName === 'optimizer') {
                filteredItems = this.getOptimizers();
            } else if (paramName === 'loss') {
                filteredItems = this.getLosses();
            } else if (paramName === 'metrics') {
                filteredItems = this.getMetrics();
            } else {
                // Default parameter values
                return [];
            }
        } else if (currentWord) {
            // Filter by current word if we're not in a parameter value
            filteredItems = this.snippets.filter(item => 
                (item.label as string).toLowerCase().includes(currentWord.toLowerCase())
            );
        }
        
        return filteredItems;
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
