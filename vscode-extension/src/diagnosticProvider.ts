import * as vscode from 'vscode';

export interface AILangError {
    range: vscode.Range;
    message: string;
    severity: vscode.DiagnosticSeverity;
    code?: string;
}

interface Model {
    name: string;
    startLine: number;
    endLine?: number;
    layers: Layer[];
}

interface Layer {
    type: string;
    line: number;
    parameters: { [key: string]: string };
}

interface TrainingConfig {
    type: 'compile' | 'fit' | 'train';
    line: number;
    parameters: { [key: string]: string };
}

interface ModelStructure {
    models: Model[];
    layers: Layer[];
    training: TrainingConfig[];
    errors: string[];
}

export class AILangDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang');
    }

    public async validateDocument(document: vscode.TextDocument): Promise<void> {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Parse AILang structure
        const modelStructure = this.parseModelStructure(lines);
        
        // Run validation checks
        diagnostics.push(...this.validateModelStructure(lines, modelStructure));
        diagnostics.push(...this.validateLayerParameters(lines, modelStructure));
        diagnostics.push(...this.validateTrainingConfiguration(lines, modelStructure));
        diagnostics.push(...this.validateSyntaxErrors(lines));
        diagnostics.push(...this.validateMissingParameters(lines, modelStructure));
        diagnostics.push(...this.validateTypeErrors(lines, modelStructure));

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private parseModelStructure(lines: string[]): ModelStructure {
        const structure: ModelStructure = {
            models: [],
            layers: [],
            training: [],
            errors: []
        };

        let currentModel: Model | null = null;
        let braceCount = 0;
        let inModel = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for model definition
            const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
            if (modelMatch) {
                currentModel = {
                    name: modelMatch[1],
                    startLine: i,
                    layers: []
                };
                structure.models.push(currentModel);
                inModel = true;
                braceCount = 1;
                continue;
            }

            // Track braces
            if (inModel) {
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                
                if (braceCount === 0) {
                    if (currentModel) {
                        currentModel.endLine = i;
                    }
                    inModel = false;
                    currentModel = null;
                }

                // Parse layers
                const layerMatch = line.match(/^(\w+)\s*\(?/);
                if (layerMatch && !line.startsWith('//') && !line.startsWith('#')) {
                    const layerName = layerMatch[1];
                    const layer = {
                        type: layerName,
                        line: i,
                        parameters: this.parseLayerParameters(line)
                    };
                    structure.layers.push(layer);
                    if (currentModel !== null) {
                        currentModel.layers.push(layer);
                    }
                }
            }

            // Parse training configuration
            if (line.startsWith('train') || line.includes('compile') || line.includes('fit')) {
                const trainingConfig: TrainingConfig = {
                    type: line.includes('compile') ? 'compile' : line.includes('fit') ? 'fit' : 'train',
                    line: i,
                    parameters: this.parseLayerParameters(line)
                };
                structure.training.push(trainingConfig);
            }
        }

        return structure;
    }

    private parseLayerParameters(line: string): { [key: string]: string } {
        const parameters: { [key: string]: string } = {};
        
        // Simple parameter parsing - can be enhanced
        const paramMatches = line.match(/(\w+)\s*=\s*([^,\s]+)/g);
        if (paramMatches) {
            paramMatches.forEach(match => {
                const [key, value] = match.split('=').map(s => s.trim());
                parameters[key] = value.replace(/['"]/g, '');
            });
        }

        return parameters;
    }

    private validateModelStructure(lines: string[], structure: ModelStructure): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Check for model definition
        const hasModel = lines.some(line => line.trim().match(/^model\s+\w+/));
        if (!hasModel) {
            diagnostics.push({
                range: new vscode.Range(0, 0, 0, 0),
                message: 'No model definition found. AILang requires at least one model definition.',
                severity: vscode.DiagnosticSeverity.Error,
                code: 'no-model'
            });
        }

        // Check for unclosed models
        structure.models.forEach((model: Model) => {
            if (!model.endLine) {
                const range = new vscode.Range(model.startLine, 0, model.startLine, 50);
                diagnostics.push({
                    range,
                    message: `Model '${model.name}' is not properly closed. Missing closing brace '}'.`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'unclosed-model'
                });
            }
        });

        return diagnostics;
    }

    private validateLayerParameters(lines: string[], structure: any): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const requiredParams: { [key: string]: string[] } = {
            'dense': ['units'],
            'conv2d': ['filters', 'kernel_size'],
            'conv1d': ['filters', 'kernel_size'],
            'lstm': ['units'],
            'gru': ['units'],
            'maxpooling2d': ['pool_size'],
            'dropout': ['rate']
        };

        structure.layers.forEach((layer: any) => {
            const required = requiredParams[layer.type];
            if (required) {
                required.forEach(param => {
                    if (!(param in layer.parameters)) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push({
                            range,
                            message: `Layer '${layer.type}' is missing required parameter: '${param}'`,
                            severity: vscode.DiagnosticSeverity.Error,
                            code: 'missing-parameter'
                        });
                    }
                });
            }
        });

        return diagnostics;
    }

    private validateTrainingConfiguration(lines: string[], structure: any): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const hasCompile = structure.training.some((t: any) => t.type === 'compile');
        const hasFit = structure.training.some((t: any) => t.type === 'fit');

        if (!hasCompile) {
            diagnostics.push({
                range: new vscode.Range(lines.length - 1, 0, lines.length - 1, 0),
                message: 'Model compilation is required before training. Add a compile statement.',
                severity: vscode.DiagnosticSeverity.Warning,
                code: 'missing-compile'
            });
        }

        if (!hasFit) {
            diagnostics.push({
                range: new vscode.Range(lines.length - 1, 0, lines.length - 1, 0),
                message: 'Model training is required. Add a fit statement.',
                severity: vscode.DiagnosticSeverity.Warning,
                code: 'missing-fit'
            });
        }

        return diagnostics;
    }

    private validateSyntaxErrors(lines: string[]): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Check for unclosed quotes
            const singleQuotes = (trimmed.match(/'/g) || []).length;
            const doubleQuotes = (trimmed.match(/"/g) || []).length;
            if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
                diagnostics.push({
                    range: new vscode.Range(index, 0, index, line.length),
                    message: 'Unclosed string literal',
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'unclosed-string'
                });
            }

            // Check for mismatched brackets
            const openBrackets = (trimmed.match(/\[/g) || []).length;
            const closeBrackets = (trimmed.match(/\]/g) || []).length;
            const openParens = (trimmed.match(/\(/g) || []).length;
            const closeParens = (trimmed.match(/\)/g) || []).length;
            
            if (openBrackets !== closeBrackets) {
                diagnostics.push({
                    range: new vscode.Range(index, 0, index, line.length),
                    message: 'Mismatched brackets',
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'mismatched-brackets'
                });
            }

            if (openParens !== closeParens) {
                diagnostics.push({
                    range: new vscode.Range(index, 0, index, line.length),
                    message: 'Mismatched parentheses',
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'mismatched-parens'
                });
            }

            // Check for invalid characters
            const invalidChars = line.match(/[^\w\s\[\]\(\)\{\}\=\,\'\"\#\:\.\-\+\*\/]/g);
            if (invalidChars) {
                diagnostics.push({
                    range: new vscode.Range(index, 0, index, line.length),
                    message: `Invalid character: ${invalidChars[0]}`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'invalid-character'
                });
            }
        });

        return diagnostics;
    }

    private validateMissingParameters(lines: string[], structure: any): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        structure.training.forEach((training: TrainingConfig) => {
            if (training.type === 'compile') {
                const hasOptimizer = 'optimizer' in training.parameters;
                const hasLoss = 'loss' in training.parameters;

                if (!hasOptimizer) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push({
                        range,
                        message: 'Compile statement missing required parameter: optimizer',
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'missing-optimizer'
                    });
                }

                if (!hasLoss) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push({
                        range,
                        message: 'Compile statement missing required parameter: loss',
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'missing-loss'
                    });
                }
            }
        });

        return diagnostics;
    }

    private validateTypeErrors(lines: string[], structure: any): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Layer-specific validation rules
        const layerValidationRules: { [key: string]: { [param: string]: { type: string, values?: string[], min?: number, max?: number, required?: boolean } } } = {
            'Dense': {
                'units': { type: 'number', min: 1, required: true },
                'activation': { type: 'string', values: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'elu', 'selu', 'softplus', 'softsign', 'leaky_relu', 'prelu', 'thresholded_relu'] },
                'use_bias': { type: 'boolean' },
                'kernel_initializer': { type: 'string', values: ['zeros', 'ones', 'random_normal', 'random_uniform', 'glorot_normal', 'glorot_uniform', 'he_normal', 'he_uniform'] },
                'bias_initializer': { type: 'string', values: ['zeros', 'ones', 'random_normal', 'random_uniform'] }
            },
            'Conv2D': {
                'filters': { type: 'number', min: 1, required: true },
                'kernel_size': { type: 'number', min: 1, required: true },
                'strides': { type: 'number', min: 1 },
                'padding': { type: 'string', values: ['valid', 'same'] },
                'activation': { type: 'string', values: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'elu', 'selu', 'softplus', 'softsign', 'leaky_relu'] },
                'use_bias': { type: 'boolean' }
            },
            'MaxPooling2D': {
                'pool_size': { type: 'number', min: 1, required: true },
                'strides': { type: 'number', min: 1 },
                'padding': { type: 'string', values: ['valid', 'same'] }
            },
            'Dropout': {
                'rate': { type: 'number', min: 0, max: 1, required: true }
            },
            'BatchNormalization': {
                'axis': { type: 'number' },
                'momentum': { type: 'number', min: 0, max: 1 },
                'epsilon': { type: 'number', min: 0 }
            },
            'Flatten': {},
            'Input': {
                'shape': { type: 'tuple', required: true }
            }
        };

        // Optimizer validation rules
        const optimizerValidationRules: { [key: string]: { [param: string]: { type: string, values?: string[], min?: number, max?: number, required?: boolean } } } = {
            'Adam': {
                'learning_rate': { type: 'number', min: 0 },
                'beta_1': { type: 'number', min: 0, max: 1 },
                'beta_2': { type: 'number', min: 0, max: 1 },
                'epsilon': { type: 'number', min: 0 }
            },
            'SGD': {
                'learning_rate': { type: 'number', min: 0 },
                'momentum': { type: 'number', min: 0 },
                'nesterov': { type: 'boolean' }
            },
            'RMSprop': {
                'learning_rate': { type: 'number', min: 0 },
                'rho': { type: 'number', min: 0, max: 1 },
                'epsilon': { type: 'number', min: 0 }
            }
        };

        // Loss function validation
        const validLossFunctions = [
            'categorical_crossentropy', 'binary_crossentropy', 'mse', 'mae', 'sparse_categorical_crossentropy',
            'kullback_leibler_divergence', 'poisson', 'cosine_similarity', 'huber'
        ];

        // Validate layers
        structure.layers.forEach((layer: any) => {
            const layerType = layer.type;
            const rules = layerValidationRules[layerType];
            
            if (!rules) {
                // Unknown layer type
                const range = new vscode.Range(layer.line, 0, layer.line, 50);
                diagnostics.push({
                    range,
                    message: `Unknown layer type: '${layerType}'`,
                    severity: vscode.DiagnosticSeverity.Warning,
                    code: 'unknown-layer'
                });
                return;
            }
            
            // Check required parameters
            Object.entries(rules).forEach(([param, rule]) => {
                if (rule.required && !(param in layer.parameters)) {
                    const range = new vscode.Range(layer.line, 0, layer.line, 50);
                    diagnostics.push({
                        range,
                        message: `Layer '${layerType}' is missing required parameter: '${param}'`,
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'missing-required-param'
                    });
                }
            });
            
            // Validate parameter types and values
            Object.entries(layer.parameters).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    const rule = rules[key];
                    
                    if (!rule) {
                        // Unknown parameter for this layer type
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push({
                            range,
                            message: `Unknown parameter '${key}' for layer type '${layerType}'`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'unknown-param'
                        });
                        return;
                    }
                    
                    // Type checking
                    if (rule.type === 'number') {
                        if (isNaN(Number(value))) {
                            const range = new vscode.Range(layer.line, 0, layer.line, 50);
                            diagnostics.push({
                                range,
                                message: `Parameter '${key}' should be a number, got: '${value}'`,
                                severity: vscode.DiagnosticSeverity.Error,
                                code: 'type-error'
                            });
                        } else {
                            const numValue = Number(value);
                            // Range checking
                            if (rule.min !== undefined && numValue < rule.min) {
                                const range = new vscode.Range(layer.line, 0, layer.line, 50);
                                diagnostics.push({
                                    range,
                                    message: `Parameter '${key}' should be at least ${rule.min}, got: ${numValue}`,
                                    severity: vscode.DiagnosticSeverity.Error,
                                    code: 'range-error'
                                });
                            }
                            if (rule.max !== undefined && numValue > rule.max) {
                                const range = new vscode.Range(layer.line, 0, layer.line, 50);
                                diagnostics.push({
                                    range,
                                    message: `Parameter '${key}' should be at most ${rule.max}, got: ${numValue}`,
                                    severity: vscode.DiagnosticSeverity.Error,
                                    code: 'range-error'
                                });
                            }
                        }
                    } else if (rule.type === 'string' && rule.values) {
                        // Enum checking
                        if (!rule.values.includes(value as string)) {
                            const range = new vscode.Range(layer.line, 0, layer.line, 50);
                            diagnostics.push({
                                range,
                                message: `Invalid value for '${key}': '${value}'. Valid options: ${rule.values.join(', ')}`,
                                severity: vscode.DiagnosticSeverity.Error,
                                code: 'invalid-value'
                            });
                        }
                    } else if (rule.type === 'boolean') {
                        if (value !== 'true' && value !== 'false') {
                            const range = new vscode.Range(layer.line, 0, layer.line, 50);
                            diagnostics.push({
                                range,
                                message: `Parameter '${key}' should be a boolean (true/false), got: '${value}'`,
                                severity: vscode.DiagnosticSeverity.Error,
                                code: 'type-error'
                            });
                        }
                    } else if (rule.type === 'tuple') {
                        // Check tuple format (e.g., (28, 28, 1))
                        const tupleMatch = (value as string).match(/^\(\s*\d+(?:\s*,\s*\d+)*\s*\)$/); 
                        if (!tupleMatch) {
                            const range = new vscode.Range(layer.line, 0, layer.line, 50);
                            diagnostics.push({
                                range,
                                message: `Parameter '${key}' should be a tuple (e.g., (28, 28, 1)), got: '${value}'`,
                                severity: vscode.DiagnosticSeverity.Error,
                                code: 'type-error'
                            });
                        }
                    }
                }
            });
        });
        
        // Validate training configurations
        structure.training.forEach((training: any) => {
            if (training.type === 'compile') {
                // Check optimizer
                const optimizer = training.parameters.optimizer;
                if (optimizer) {
                    // Extract optimizer name and parameters
                    const optimizerMatch = optimizer.match(/^(\w+)\((.*)\)$/);
                    if (optimizerMatch) {
                        const optimizerName = optimizerMatch[1];
                        const optimizerParams = optimizerMatch[2];
                        
                        // Check if optimizer is valid
                        if (!optimizerValidationRules[optimizerName]) {
                            const range = new vscode.Range(training.line, 0, training.line, 50);
                            diagnostics.push({
                                range,
                                message: `Unknown optimizer: '${optimizerName}'`,
                                severity: vscode.DiagnosticSeverity.Warning,
                                code: 'unknown-optimizer'
                            });
                        }
                        
                        // TODO: Parse and validate optimizer parameters
                    }
                }
                
                // Check loss function
                const loss = training.parameters.loss;
                if (loss && !validLossFunctions.includes(loss)) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push({
                        range,
                        message: `Unknown loss function: '${loss}'. Valid options: ${validLossFunctions.join(', ')}`,
                        severity: vscode.DiagnosticSeverity.Warning,
                        code: 'unknown-loss'
                    });
                }
            }
        });

        return diagnostics;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}

export function registerDiagnosticProvider(context: vscode.ExtensionContext): AILangDiagnosticProvider {
    const provider = new AILangDiagnosticProvider();
    
    // Register document change listeners
    const disposable = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'ailang') {
            provider.validateDocument(event.document);
        }
    });

    // Validate existing documents
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'ailang') {
            provider.validateDocument(document);
        }
    });

    context.subscriptions.push((provider as any).diagnosticCollection, disposable);
    return provider;
}
