import * as vscode from 'vscode';

interface HoverInfo {
    signature: string;
    description: string;
    examples?: string[];
    link?: string;
}

const HOVER_DOCS: Record<string, HoverInfo> = {
    // Model related
    'model': {
        signature: 'model ModelName { ... }',
        description: 'Defines a new AILang model with the specified architecture.',
        examples: [
            '```ailang\nmodel MyModel {\n  input_shape: [28, 28, 1]\n  output_shape: [10]\n  \n  layers: [\n    Dense(units=128, activation=\'relu\')\n  ]\n}\n```'
        ]
    },
    
    // Core layers
    'Dense': {
        signature: 'Dense(units: number, activation?: string, **kwargs)',
        description: 'Regular densely-connected NN layer.\n\n- `units`: Positive integer, dimensionality of the output space.\n- `activation`: Activation function to use (e.g., \'relu\', \'sigmoid\', \'softmax\').',
        examples: [
            '```ailang\n# As first layer in a sequential model:\nDense(units=32, input_shape=(16,))\n\n# Now the model will take as input arrays of shape (*, 16)\n# and output arrays of shape (*, 32)\n```',
            '```ailang\n# After the first layer, you don\'t need to specify\n# the size of the input anymore:\nDense(units=64, activation=\'relu\')\n```'
        ]
    },
    
    'Conv2D': {
        signature: 'Conv2D(filters: number, kernel_size: number|tuple, **kwargs)',
        description: '2D convolution layer (e.g., spatial convolution over images).\n\n- `filters`: Integer, the dimensionality of the output space.\n- `kernel_size`: An integer or tuple/list of 2 integers, specifying the height and width of the 2D convolution window.',
        examples: [
            '```ailang\n# First layer in a sequential model:\nConv2D(32, (3, 3), input_shape=(28, 28, 1))\n\n# Subsequent layers:\nConv2D(64, (3, 3), activation=\'relu\')\n```'
        ]
    },
    
    'Dropout': {
        signature: 'Dropout(rate: number, **kwargs)',
        description: 'Applies Dropout to the input.\n\n- `rate`: Float between 0 and 1. Fraction of the input units to drop.\n- `noise_shape`: 1D integer tensor representing the shape of the binary dropout mask that will be multiplied with the input.',
        examples: [
            '```ailang\n# Add dropout with 30% dropout rate\nDropout(rate=0.3)\n```'
        ]
    },
    
    // Activation functions
    'relu': {
        signature: 'ReLU(**kwargs)',
        description: 'Rectified Linear Unit activation function.',
        examples: [
            '```ailang\nDense(units=64, activation=\'relu\')\n```'
        ]
    },
    'softmax': {
        signature: 'softmax(x, axis=-1)',
        description: 'Softmax activation function.\n\n- `axis`: Integer, axis along which the softmax normalization is applied.',
        examples: [
            '```ailang\nDense(units=10, activation=\'softmax\')\n```'
        ]
    },
    
    // Optimizers
    'Adam': {
        signature: 'Adam(learning_rate=0.001, **kwargs)',
        description: 'Adam optimizer.',
        examples: [
            '```ailang\noptimizer: Adam(learning_rate=0.001)\n```'
        ]
    },
    
    // Loss functions
    'categorical_crossentropy': {
        signature: 'categorical_crossentropy(y_true, y_pred)',
        description: 'Categorical crossentropy loss function.',
        examples: [
            '```ailang\nloss: categorical_crossentropy\n```'
        ]
    }
};

export class AILangHoverProvider implements vscode.HoverProvider {
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        console.log('\n=== Hover Provider Called ===');
        console.log('Document language:', document.languageId);
        console.log('File path:', document.uri.fsPath);
        console.log('Position:', position.line + 1, ':', position.character + 1);
        
        try {
            const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_]+/);
            if (!wordRange) {
                console.log('No word found at position');
                return undefined;
            }

            const word = document.getText(wordRange);
            const line = document.lineAt(position.line).text;
            console.log('Word under cursor:', word);
            console.log('Current line:', line);
            
            // Check if the word is part of a function call (e.g., Dense in 'Dense(units=64)')
            const nextChar = line[wordRange.end.character];
            const isFunctionCall = nextChar === '(';
            console.log('Is function call:', isFunctionCall);
            
            // Get hover info for the word
            const info = HOVER_DOCS[word];
            if (!info) {
                console.log('No hover info found for word:', word);
                console.log('Available hover items:', Object.keys(HOVER_DOCS).join(', '));
                return undefined;
            }
        
            console.log('Found hover info for:', word);

            const markdown = new vscode.MarkdownString();
            
            // Add signature
            markdown.appendCodeblock(info.signature, 'typescript');
            markdown.appendMarkdown('\n');
            
            // Add description
            markdown.appendMarkdown(info.description);
            markdown.appendMarkdown('\n\n');
            
            // Add examples if available
            if (info.examples && info.examples.length > 0) {
                markdown.appendMarkdown('**Examples:**\n\n');
                info.examples.forEach(example => {
                    markdown.appendMarkdown(example);
                    markdown.appendMarkdown('\n\n');
                });
            }
            
            // Add documentation link if available
            if (info.link) {
                markdown.appendMarkdown(`[Documentation](${info.link})`);
                markdown.appendMarkdown('\n\n');
            }
            
            // Set isTrusted to true to allow command execution in markdown
            markdown.isTrusted = true;
            
            console.log('Returning hover content for:', word);
            return new vscode.Hover(markdown, wordRange);
        } catch (error) {
            console.error('Error in provideHover:', error);
            return undefined;
        }
    }
}

export function registerHoverProvider(context: vscode.ExtensionContext): void {
    console.log('Registering hover provider for AILang');
    try {
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
