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

    /**
     * Validates number parameters
     */
    private validateNumberParameter(key: string, value: string, rule: any, line: number, diagnostics: vscode.Diagnostic[]): void {
        if (isNaN(Number(value))) {
            const range = new vscode.Range(line, 0, line, 50);
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
                const range = new vscode.Range(line, 0, line, 50);
                diagnostics.push({
                    range,
                    message: `Parameter '${key}' should be at least ${rule.min}, got: ${numValue}`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'range-error'
                });
            }
            if (rule.max !== undefined && numValue > rule.max) {
                const range = new vscode.Range(line, 0, line, 50);
                diagnostics.push({
                    range,
                    message: `Parameter '${key}' should be at most ${rule.max}, got: ${numValue}`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'range-error'
                });
            }
        }
    }

    /**
     * Validates enum parameters (string with predefined values)
     */
    private validateEnumParameter(key: string, value: string, rule: any, line: number, diagnostics: vscode.Diagnostic[]): void {
        if (!rule.values?.includes(value)) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Invalid value for '${key}': '${value}'. Valid options: ${rule.values?.join(', ')}`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'invalid-value'
            });
        }
    }

    /**
     * Validates boolean parameters
     */
    private validateBooleanParameter(key: string, value: string, line: number, diagnostics: vscode.Diagnostic[]): void {
        if (value !== 'true' && value !== 'false') {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Parameter '${key}' should be a boolean (true/false), got: '${value}'`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'type-error'
            });
        }
    }

    /**
     * Validates tuple parameters (e.g., (28, 28, 1))
     */
    private validateTupleParameter(key: string, value: string, line: number, diagnostics: vscode.Diagnostic[]): void {
        // Enhanced tuple validation with better error messages
        const tupleMatch = value.match(/^\(\s*\d+(?:\s*,\s*\d+)*\s*\)$/);
        if (!tupleMatch) {
            const range = new vscode.Range(line, 0, line, 50);
            
            // Provide more specific error messages based on common mistakes
            if (value.indexOf('(') === -1 || value.indexOf(')') === -1) {
                diagnostics.push({
                    range,
                    message: `Parameter '${key}' should be a tuple enclosed in parentheses (e.g., (28, 28, 1)), got: '${value}'`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'tuple-format-error'
                });
            } else if (!/\d/.test(value)) {
                diagnostics.push({
                    range,
                    message: `Parameter '${key}' should contain numeric values (e.g., (28, 28, 1)), got: '${value}'`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'tuple-content-error'
                });
            } else {
                diagnostics.push({
                    range,
                    message: `Parameter '${key}' should be a tuple (e.g., (28, 28, 1)), got: '${value}'`,
                    severity: vscode.DiagnosticSeverity.Error,
                    code: 'type-error'
                });
            }
        }
    }

    /**
     * Validates object parameters (e.g., {l1: 0.01, l2: 0.001})
     */
    private validateObjectParameter(key: string, value: string, rule: any, line: number, diagnostics: vscode.Diagnostic[]): void {
        // Check if the value looks like an object (starts with { and ends with })
        if (!value.trim().startsWith('{') || !value.trim().endsWith('}')) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Parameter '${key}' should be an object (e.g., {prop1: value1, prop2: value2}), got: '${value}'`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'object-format-error'
            });
            return;
        }

        // Try to parse the object-like string
        try {
            // Remove the curly braces and split by commas
            const objContent = value.trim().slice(1, -1).trim();
            const properties = objContent.split(',').map(prop => prop.trim());
            
            // Process each property
            properties.forEach(prop => {
                if (!prop) return; // Skip empty properties
                
                const [propKey, propValue] = prop.split(':').map(p => p.trim());
                
                if (!propKey || !propValue) {
                    const range = new vscode.Range(line, 0, line, 50);
                    diagnostics.push({
                        range,
                        message: `Invalid property format in object '${key}': '${prop}'. Expected 'key: value'`,
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'object-property-error'
                    });
                    return;
                }
                
                // Check if the property is valid for this object type
                if (rule.properties && !rule.properties[propKey]) {
                    const range = new vscode.Range(line, 0, line, 50);
                    diagnostics.push({
                        range,
                        message: `Unknown property '${propKey}' in object '${key}'`,
                        severity: vscode.DiagnosticSeverity.Warning,
                        code: 'unknown-object-property'
                    });
                    return;
                }
                
                // Validate property value if we have a rule for it
                if (rule.properties && rule.properties[propKey]) {
                    const propRule = rule.properties[propKey];
                    
                    if (propRule.type === 'number') {
                        this.validateNumberParameter(propKey, propValue, propRule, line, diagnostics);
                    } else if (propRule.type === 'string' && propRule.values) {
                        this.validateEnumParameter(propKey, propValue, propRule, line, diagnostics);
                    } else if (propRule.type === 'boolean') {
                        this.validateBooleanParameter(propKey, propValue, line, diagnostics);
                    }
                }
            });
        } catch (error) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Error parsing object parameter '${key}': ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'object-parse-error'
            });
        }
    }

    /**
     * Validates optimizer parameters
     */
    private validateOptimizerParameters(optimizerName: string, paramsStr: string, rules: { [param: string]: any }, line: number, diagnostics: vscode.Diagnostic[]): void {
        // Skip validation if params string is empty
        if (!paramsStr.trim()) {
            return;
        }

        try {
            // Split the parameters string by commas, but handle the case where commas might be inside nested structures
            const params = this.splitOptimizerParams(paramsStr);
            
            params.forEach(param => {
                // Split each parameter by '=' to get key-value pairs
                const [key, value] = param.split('=').map(p => p.trim());
                
                if (!key || !value) {
                    const range = new vscode.Range(line, 0, line, 50);
                    diagnostics.push({
                        range,
                        message: `Invalid parameter format in optimizer '${optimizerName}': '${param}'. Expected 'key=value'`,
                        severity: vscode.DiagnosticSeverity.Error,
                        code: 'optimizer-param-format-error'
                    });
                    return;
                }
                
                // Check if the parameter is valid for this optimizer
                if (!rules[key]) {
                    const range = new vscode.Range(line, 0, line, 50);
                    diagnostics.push({
                        range,
                        message: `Unknown parameter '${key}' for optimizer '${optimizerName}'`,
                        severity: vscode.DiagnosticSeverity.Warning,
                        code: 'unknown-optimizer-param'
                    });
                    return;
                }
                
                // Validate parameter value based on its type
                const rule = rules[key];
                if (rule.type === 'number') {
                    this.validateNumberParameter(key, value, rule, line, diagnostics);
                } else if (rule.type === 'string' && rule.values) {
                    this.validateEnumParameter(key, value, rule, line, diagnostics);
                } else if (rule.type === 'boolean') {
                    this.validateBooleanParameter(key, value, line, diagnostics);
                } else if (rule.type === 'object') {
                    this.validateObjectParameter(key, value, rule, line, diagnostics);
                }
            });
        } catch (error) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Error parsing optimizer parameters: ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'optimizer-parse-error'
            });
        }
    }

    /**
     * Helper method to split optimizer parameters string by commas,
     * but respecting nested structures like objects and arrays
     */
    private splitOptimizerParams(paramsStr: string): string[] {
        const result: string[] = [];
        let current = '';
        let depth = 0;
        
        for (let i = 0; i < paramsStr.length; i++) {
            const char = paramsStr[i];
            
            if ((char === '{' || char === '[' || char === '(')) {
                depth++;
                current += char;
            } else if ((char === '}' || char === ']' || char === ')')) {
                depth--;
                current += char;
            } else if (char === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            result.push(current.trim());
        }
        
        return result;
    }

    /**
     * Validates array parameters (e.g., [1, 2, 3])
     */
    private validateArrayParameter(key: string, value: string, rule: any, line: number, diagnostics: vscode.Diagnostic[]): void {
        // Check if the value looks like an array (starts with [ and ends with ])
        if (!value.trim().startsWith('[') || !value.trim().endsWith(']')) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Parameter '${key}' should be an array (e.g., [1, 2, 3]), got: '${value}'`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'array-format-error'
            });
            return;
        }

        // Try to parse the array-like string
        try {
            // Remove the brackets and split by commas
            const arrayContent = value.trim().slice(1, -1).trim();
            const items = arrayContent.split(',').map(item => item.trim());
            
            // If we have item validation rules, check each item
            if (rule.items) {
                items.forEach((item, index) => {
                    if (!item) return; // Skip empty items
                    
                    if (rule.items.type === 'number') {
                        this.validateNumberParameter(`${key}[${index}]`, item, rule.items, line, diagnostics);
                    } else if (rule.items.type === 'string' && rule.items.values) {
                        this.validateEnumParameter(`${key}[${index}]`, item, rule.items, line, diagnostics);
                    } else if (rule.items.type === 'boolean') {
                        this.validateBooleanParameter(`${key}[${index}]`, item, line, diagnostics);
                    }
                });
            }
        } catch (error) {
            const range = new vscode.Range(line, 0, line, 50);
            diagnostics.push({
                range,
                message: `Error parsing array parameter '${key}': ${error.message}`,
                severity: vscode.DiagnosticSeverity.Error,
                code: 'array-parse-error'
            });
        }
    }

    private validateTypeErrors(lines: string[], structure: any): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        // Layer-specific validation rules with enhanced type checking
        interface ValidationRule {
            type: string;
            values?: string[];
            min?: number;
            max?: number;
            required?: boolean;
            format?: RegExp;
            items?: ValidationRule;
            properties?: { [key: string]: ValidationRule };
            description?: string;
        }
        
        const layerValidationRules: { [key: string]: { [param: string]: ValidationRule } } = {
            'Dense': {
                'units': { 
                    type: 'number', 
                    min: 1, 
                    required: true,
                    description: 'Number of output neurons in the layer'
                },
                'activation': { 
                    type: 'string', 
                    values: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'elu', 'selu', 'softplus', 'softsign', 'leaky_relu', 'prelu', 'thresholded_relu'],
                    description: 'Activation function to use'
                },
                'use_bias': { 
                    type: 'boolean',
                    description: 'Whether the layer uses a bias vector'
                },
                'kernel_initializer': { 
                    type: 'string', 
                    values: ['zeros', 'ones', 'random_normal', 'random_uniform', 'glorot_normal', 'glorot_uniform', 'he_normal', 'he_uniform'],
                    description: 'Initializer for the kernel weights matrix'
                },
                'bias_initializer': { 
                    type: 'string', 
                    values: ['zeros', 'ones', 'random_normal', 'random_uniform'],
                    description: 'Initializer for the bias vector'
                },
                'kernel_regularizer': {
                    type: 'object',
                    properties: {
                        'l1': { type: 'number', min: 0 },
                        'l2': { type: 'number', min: 0 }
                    },
                    description: 'Regularizer function applied to the kernel weights matrix'
                }
            },
            'Conv2D': {
                'filters': { 
                    type: 'number', 
                    min: 1, 
                    required: true,
                    description: 'Number of output filters in the convolution'
                },
                'kernel_size': { 
                    type: 'tuple', 
                    required: true,
                    description: 'Height and width of the 2D convolution window'
                },
                'strides': { 
                    type: 'tuple',
                    description: 'Strides of the convolution along height and width'
                },
                'padding': { 
                    type: 'string', 
                    values: ['valid', 'same'],
                    description: 'Padding method'
                },
                'activation': { 
                    type: 'string', 
                    values: ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'elu', 'selu', 'softplus', 'softsign', 'leaky_relu'],
                    description: 'Activation function to use'
                },
                'use_bias': { 
                    type: 'boolean',
                    description: 'Whether the layer uses a bias vector'
                },
                'data_format': {
                    type: 'string',
                    values: ['channels_last', 'channels_first'],
                    description: 'The ordering of the dimensions in the inputs'
                }
            },
            'MaxPooling2D': {
                'pool_size': { 
                    type: 'tuple', 
                    required: true,
                    description: 'Factors by which to downscale in each dimension'
                },
                'strides': { 
                    type: 'tuple',
                    description: 'Strides values'
                },
                'padding': { 
                    type: 'string', 
                    values: ['valid', 'same'],
                    description: 'Padding method'
                },
                'data_format': {
                    type: 'string',
                    values: ['channels_last', 'channels_first'],
                    description: 'The ordering of the dimensions in the inputs'
                }
            },
            'Dropout': {
                'rate': { 
                    type: 'number', 
                    min: 0, 
                    max: 1, 
                    required: true,
                    description: 'Fraction of the input units to drop'
                },
                'noise_shape': {
                    type: 'tuple',
                    description: 'Shape of the binary dropout mask'
                },
                'seed': {
                    type: 'number',
                    description: 'Random seed to ensure reproducibility'
                }
            },
            'BatchNormalization': {
                'axis': { 
                    type: 'number',
                    description: 'The axis that should be normalized'
                },
                'momentum': { 
                    type: 'number', 
                    min: 0, 
                    max: 1,
                    description: 'Momentum for the moving average'
                },
                'epsilon': { 
                    type: 'number', 
                    min: 0,
                    description: 'Small float added to variance to avoid dividing by zero'
                },
                'center': {
                    type: 'boolean',
                    description: 'If True, add offset of beta to normalized tensor'
                },
                'scale': {
                    type: 'boolean',
                    description: 'If True, multiply by gamma'
                }
            },
            'Flatten': {
                'data_format': {
                    type: 'string',
                    values: ['channels_last', 'channels_first'],
                    description: 'The ordering of the dimensions in the inputs'
                }
            },
            'Input': {
                'shape': { 
                    type: 'tuple', 
                    required: true,
                    description: 'Shape of the input tensor'
                },
                'batch_size': {
                    type: 'number',
                    min: 1,
                    description: 'Optional static batch size (integer)'
                },
                'name': {
                    type: 'string',
                    description: 'Name of the input layer'
                },
                'dtype': {
                    type: 'string',
                    values: ['float32', 'int32', 'bool'],
                    description: 'Datatype of the input'
                }
            },
            'LSTM': {
                'units': {
                    type: 'number',
                    min: 1,
                    required: true,
                    description: 'Dimensionality of the output space'
                },
                'activation': {
                    type: 'string',
                    values: ['tanh', 'sigmoid', 'relu', 'linear'],
                    description: 'Activation function to use'
                },
                'recurrent_activation': {
                    type: 'string',
                    values: ['sigmoid', 'tanh', 'relu', 'linear'],
                    description: 'Activation function to use for recurrent step'
                },
                'return_sequences': {
                    type: 'boolean',
                    description: 'Whether to return the last output or full sequence'
                },
                'return_state': {
                    type: 'boolean',
                    description: 'Whether to return the last state in addition to the output'
                }
            }
        };

        // Optimizer validation rules with enhanced type checking
        const optimizerValidationRules: { [key: string]: { [param: string]: ValidationRule } } = {
            'Adam': {
                'learning_rate': { 
                    type: 'number', 
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'beta_1': { 
                    type: 'number', 
                    min: 0, 
                    max: 1,
                    description: 'Exponential decay rate for the 1st moment estimates'
                },
                'beta_2': { 
                    type: 'number', 
                    min: 0, 
                    max: 1,
                    description: 'Exponential decay rate for the 2nd moment estimates'
                },
                'epsilon': { 
                    type: 'number', 
                    min: 0,
                    description: 'Small constant for numerical stability'
                },
                'amsgrad': {
                    type: 'boolean',
                    description: 'Whether to apply AMSGrad variant of Adam'
                },
                'weight_decay': {
                    type: 'number',
                    min: 0,
                    description: 'Weight decay (L2 regularization)'
                }
            },
            'SGD': {
                'learning_rate': { 
                    type: 'number', 
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'momentum': { 
                    type: 'number', 
                    min: 0,
                    description: 'Accelerates gradient descent in the relevant direction'
                },
                'nesterov': { 
                    type: 'boolean',
                    description: 'Whether to apply Nesterov momentum'
                },
                'weight_decay': {
                    type: 'number',
                    min: 0,
                    description: 'Weight decay (L2 regularization)'
                }
            },
            'RMSprop': {
                'learning_rate': { 
                    type: 'number', 
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'rho': { 
                    type: 'number', 
                    min: 0, 
                    max: 1,
                    description: 'Discounting factor for the gradient squared'
                },
                'epsilon': { 
                    type: 'number', 
                    min: 0,
                    description: 'Small constant for numerical stability'
                },
                'momentum': {
                    type: 'number',
                    min: 0,
                    description: 'Momentum factor'
                },
                'centered': {
                    type: 'boolean',
                    description: 'If True, gradients are normalized by the estimated variance of the gradient'
                },
                'weight_decay': {
                    type: 'number',
                    min: 0,
                    description: 'Weight decay (L2 regularization)'
                }
            },
            'Adagrad': {
                'learning_rate': {
                    type: 'number',
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'initial_accumulator_value': {
                    type: 'number',
                    min: 0,
                    description: 'Starting value for the accumulators'
                },
                'epsilon': {
                    type: 'number',
                    min: 0,
                    description: 'Small constant for numerical stability'
                }
            },
            'Adadelta': {
                'learning_rate': {
                    type: 'number',
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'rho': {
                    type: 'number',
                    min: 0,
                    max: 1,
                    description: 'Decay rate for the moving average of squared gradients'
                },
                'epsilon': {
                    type: 'number',
                    min: 0,
                    description: 'Small constant for numerical stability'
                }
            },
            'Adamax': {
                'learning_rate': {
                    type: 'number',
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'beta_1': {
                    type: 'number',
                    min: 0,
                    max: 1,
                    description: 'Exponential decay rate for the 1st moment estimates'
                },
                'beta_2': {
                    type: 'number',
                    min: 0,
                    max: 1,
                    description: 'Exponential decay rate for the exponentially weighted infinity norm'
                },
                'epsilon': {
                    type: 'number',
                    min: 0,
                    description: 'Small constant for numerical stability'
                }
            },
            'Nadam': {
                'learning_rate': {
                    type: 'number',
                    min: 0,
                    description: 'Learning rate (step size) for the optimizer'
                },
                'beta_1': {
                    type: 'number',
                    min: 0,
                    max: 1,
                    description: 'Exponential decay rate for the 1st moment estimates'
                },
                'beta_2': {
                    type: 'number',
                    min: 0,
                    max: 1,
                    description: 'Exponential decay rate for the 2nd moment estimates'
                },
                'epsilon': {
                    type: 'number',
                    min: 0,
                    description: 'Small constant for numerical stability'
                }
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
            
            // Validate parameter types and values with enhanced type checking
            Object.entries(layer.parameters).forEach(([key, value]) => {
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
                
                // Extract value string from parameter
                const valueStr = typeof value === 'string' ? value : String(value);
                
                // Type checking with enhanced validation
                if (rule.type === 'number') {
                    this.validateNumberParameter(key, valueStr, rule, layer.line, diagnostics);
                } else if (rule.type === 'string' && rule.values) {
                    this.validateEnumParameter(key, valueStr, rule, layer.line, diagnostics);
                } else if (rule.type === 'boolean') {
                    this.validateBooleanParameter(key, valueStr, layer.line, diagnostics);
                } else if (rule.type === 'tuple') {
                    this.validateTupleParameter(key, valueStr, layer.line, diagnostics);
                } else if (rule.type === 'object') {
                    this.validateObjectParameter(key, valueStr, rule, layer.line, diagnostics);
                } else if (rule.type === 'array') {
                    this.validateArrayParameter(key, valueStr, rule, layer.line, diagnostics);
                }
            });
        });
        
        // Validate training configurations
        structure.training.forEach((training: any) => {
            if (training.type === 'compile') {
                // Check optimizer with enhanced validation
                const optimizer = training.parameters.optimizer;
                if (optimizer) {
                    // Extract optimizer name and parameters
                    const optimizerMatch = optimizer.match(/^(\w+)\((.*)\)$/);
                    if (optimizerMatch) {
                        const optimizerName = optimizerMatch[1];
                        const optimizerParamsStr = optimizerMatch[2];
                        
                        // Check if optimizer is valid
                        if (!optimizerValidationRules[optimizerName]) {
                            const range = new vscode.Range(training.line, 0, training.line, 50);
                            diagnostics.push({
                                range,
                                message: `Unknown optimizer: '${optimizerName}'`,
                                severity: vscode.DiagnosticSeverity.Warning,
                                code: 'unknown-optimizer'
                            });
                        } else {
                            // Parse and validate optimizer parameters
                            this.validateOptimizerParameters(optimizerName, optimizerParamsStr, optimizerValidationRules[optimizerName], training.line, diagnostics);
                        }
                    } else {
                        // Invalid optimizer format
                        const range = new vscode.Range(training.line, 0, training.line, 50);
                        diagnostics.push({
                            range,
                            message: `Invalid optimizer format: '${optimizer}'. Expected format: 'OptimizerName(param1=value1, param2=value2)'`,
                            severity: vscode.DiagnosticSeverity.Error,
                            code: 'invalid-optimizer-format'
                        });
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
