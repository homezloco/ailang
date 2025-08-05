import * as vscode from 'vscode';
import { getSettingsManager } from './settingsManager';

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

// Cache to store parsed model structures
interface DocumentCache {
    version: number;
    structure: ModelStructure;
    diagnostics: vscode.Diagnostic[];
}

export class AILangDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private documentCache: Map<string, DocumentCache> = new Map();
    private validationDelayTimer: NodeJS.Timeout | undefined;
    private validationDelay: number = 500; // ms
    
    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang');
        // Initialize validation delay from settings
        const settingsManager = getSettingsManager();
        this.validationDelay = settingsManager.debounceDelay;
    }

    public async validateDocument(document: vscode.TextDocument): Promise<void> {
        // Get settings manager
        const settingsManager = getSettingsManager();
        
        // Check if validation is enabled
        if (!settingsManager.validationEnabled) {
            // Clear any existing diagnostics if validation is disabled
            this.diagnosticCollection.set(document.uri, []);
            return;
        }
        
        // Clear any existing timer
        if (this.validationDelayTimer) {
            clearTimeout(this.validationDelayTimer);
        }

        // Debounce validation to avoid excessive processing during typing
        this.validationDelayTimer = setTimeout(() => {
            this.performValidation(document);
        }, this.validationDelay);
    }

    private async performValidation(document: vscode.TextDocument): Promise<void> {
        const settingsManager = getSettingsManager();
        const documentKey = document.uri.toString();
        const cachedData = this.documentCache.get(documentKey);

        // Check if we can use cached results
        if (settingsManager.enableCaching && cachedData && cachedData.version === document.version) {
            this.diagnosticCollection.set(document.uri, cachedData.diagnostics);
            return;
        }

        // Check file size limit
        if (document.getText().length > settingsManager.maxFileSize) {
            const diagnostics: vscode.Diagnostic[] = [];
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 1),
                `File exceeds maximum size limit (${settingsManager.maxFileSize} characters). Validation skipped.`,
                vscode.DiagnosticSeverity.Information
            ));
            this.diagnosticCollection.set(document.uri, diagnostics);
            return;
        }

        // Start validation
        console.time('AILang validation');
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Parse AILang structure (single pass)
        const modelStructure = this.parseModelStructure(lines);
        
        // Run all validations in a single pass where possible
        this.validateAll(lines, modelStructure, diagnostics);

        // Limit the number of problems reported
        if (diagnostics.length > settingsManager.maxNumberOfProblems) {
            diagnostics.length = settingsManager.maxNumberOfProblems;
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 1),
                `Only showing first ${settingsManager.maxNumberOfProblems} problems. More issues may exist.`,
                vscode.DiagnosticSeverity.Information
            ));
        }

        // Cache the results if caching is enabled
        if (settingsManager.enableCaching) {
            this.documentCache.set(documentKey, {
                version: document.version,
                structure: modelStructure,
                diagnostics: diagnostics
            });
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
        console.timeEnd('AILang validation');
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

        // Pre-compile regular expressions for better performance
        const modelRegex = /^model\s+(\w+)\s*\{/;
        const layerRegex = /^(\w+)\s*\(?/;
        const commentRegex = /^(\/\/|#)/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines
            
            // Check for model definition
            const modelMatch = line.match(modelRegex);
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
                // Count braces more efficiently
                for (let j = 0; j < line.length; j++) {
                    if (line[j] === '{') braceCount++;
                    else if (line[j] === '}') braceCount--;
                }
                
                if (braceCount === 0) {
                    if (currentModel) {
                        currentModel.endLine = i;
                    }
                    inModel = false;
                    currentModel = null;
                }

                // Parse layers
                if (!line.match(commentRegex)) {
                    const layerMatch = line.match(layerRegex);
                    if (layerMatch) {
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
        
        // Extract parameters more efficiently
        const paramStart = line.indexOf('(');
        if (paramStart === -1) return parameters;
        
        const paramEnd = line.lastIndexOf(')');
        if (paramEnd === -1) return parameters;
        
        const paramString = line.substring(paramStart + 1, paramEnd);
        
        // Handle empty parameters
        if (!paramString.trim()) return parameters;
        
        // Split parameters by commas, but respect nested structures
        let inQuote = false;
        let nestedLevel = 0;
        let currentParam = '';
        
        for (let i = 0; i < paramString.length; i++) {
            const char = paramString[i];
            
            // Handle quotes
            if (char === '"' || char === "'") {
                inQuote = !inQuote;
            }
            
            // Handle nested structures
            if (!inQuote) {
                if (char === '(' || char === '[' || char === '{') {
                    nestedLevel++;
                } else if (char === ')' || char === ']' || char === '}') {
                    nestedLevel--;
                }
            }
            
            // Split parameters
            if (char === ',' && !inQuote && nestedLevel === 0) {
                this.addParameter(currentParam.trim(), parameters);
                currentParam = '';
            } else {
                currentParam += char;
            }
        }
        
        // Add the last parameter
        if (currentParam.trim()) {
            this.addParameter(currentParam.trim(), parameters);
        }
        
        return parameters;
    }
    
    private addParameter(param: string, parameters: { [key: string]: string }): void {
        const equalsIndex = param.indexOf('=');
        if (equalsIndex !== -1) {
            const key = param.substring(0, equalsIndex).trim();
            const value = param.substring(equalsIndex + 1).trim();
            parameters[key] = value;
        }
    }

    private validateAll(lines: string[], structure: ModelStructure, diagnostics: vscode.Diagnostic[]): void {
        const settingsManager = getSettingsManager();
        
        // Skip validation if disabled
        if (!settingsManager.validationEnabled) {
            return;
        }
        
        // Check for ignored patterns
        const ignorePatterns = settingsManager.ignorePatterns;
        const documentText = lines.join('\n');
        for (const pattern of ignorePatterns) {
            try {
                const regex = new RegExp(pattern);
                if (regex.test(documentText)) {
                    // Skip validation for this file
                    return;
                }
            } catch (error) {
                console.error(`Invalid ignore pattern regex: ${pattern}`, error);
            }
        }
        
        // Run specific validations
        this.validateModelStructure(structure, diagnostics);
        
        // Only run advanced validations if enabled
        if (settingsManager.enableAdvancedValidation) {
            this.validateLayerParameters(structure, diagnostics);
            this.validateTrainingConfiguration(structure, diagnostics);
        } else {
            // Run basic parameter validation only
            this.validateBasicParameters(structure, diagnostics);
        }
    }
    
    // New method for basic parameter validation
    private validateBasicParameters(structure: ModelStructure, diagnostics: vscode.Diagnostic[]): void {
        const settingsManager = getSettingsManager();
        
        // Check for missing required parameters in layers
        structure.layers.forEach(layer => {
            if (!layer.parameters.units && ['dense', 'lstm', 'gru'].includes(layer.type.toLowerCase())) {
                const range = new vscode.Range(layer.line, 0, layer.line, 50);
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Layer '${layer.type}' requires 'units' parameter`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
        
        // Check for missing required parameters in training
        structure.training.forEach(training => {
            if (training.type === 'compile' && !training.parameters.optimizer) {
                const range = new vscode.Range(training.line, 0, training.line, 50);
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Compile requires 'optimizer' parameter`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
        });
    }

    private validateModelStructure(structure: ModelStructure, diagnostics: vscode.Diagnostic[]): void {
        const settingsManager = getSettingsManager();
        
        // Check if models are defined
        if (structure.models.length === 0) {
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 1),
                'No model defined in the file',
                settingsManager.validationStrict ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning
            ));
            return;
        }
        
        // Check if model has layers
        structure.models.forEach(model => {
            // Check if model has layers
            if (model.layers.length === 0) {
                const range = new vscode.Range(model.startLine, 0, model.startLine, 50);
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Model '${model.name}' has no layers defined`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for input layer
            const hasInputLayer = model.layers.some(layer => layer.type === 'Input');
            if (!hasInputLayer) {
                const range = new vscode.Range(model.startLine, 0, model.startLine, 50);
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Model '${model.name}' should have an Input layer`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        });
    }

    private validateLayerParameters(structure: ModelStructure, diagnostics: vscode.Diagnostic[]): void {
        const settingsManager = getSettingsManager();
        
        // Define required parameters for common layer types
        const requiredParams: { [key: string]: string[] } = {
            'Dense': ['units'],
            'Conv2D': ['filters', 'kernel_size'],
            'Conv1D': ['filters', 'kernel_size'],
            'LSTM': ['units'],
            'GRU': ['units'],
            'MaxPooling2D': ['pool_size'],
            'Dropout': ['rate'],
            'Input': ['shape']
        };
        
        // Validate layer parameters
        structure.layers.forEach(layer => {
            // Check required parameters
            const required = requiredParams[layer.type];
            if (required) {
                required.forEach(param => {
                    if (!(param in layer.parameters)) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Layer '${layer.type}' requires '${param}' parameter`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                });
            }
            
            // Validate parameter types
            Object.entries(layer.parameters).forEach(([key, value]) => {
                // Number parameters
                if (['units', 'filters', 'rate'].includes(key)) {
                    if (isNaN(Number(value.replace(/['"`]/g, '')))) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Parameter '${key}' must be a number`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
                
                // Tuple parameters
                if (['shape', 'kernel_size', 'pool_size', 'strides'].includes(key)) {
                    if (!value.startsWith('(') || !value.endsWith(')')) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Parameter '${key}' must be a tuple`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
                
                // Enum parameters
                if (key === 'activation') {
                    const validActivations = ['relu', 'sigmoid', 'tanh', 'softmax', 'linear', 'elu', 'selu', 'softplus', 'softsign', 'leaky_relu'];
                    if (!validActivations.includes(value.replace(/['"`]/g, ''))) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Invalid activation function: '${value}'. Valid options: ${validActivations.join(', ')}`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
                
                if (key === 'padding') {
                    const validPadding = ['valid', 'same'];
                    if (!validPadding.includes(value.replace(/['"`]/g, ''))) {
                        const range = new vscode.Range(layer.line, 0, layer.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Invalid padding: '${value}'. Valid options: ${validPadding.join(', ')}`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
            });
        });
    }

    private validateTrainingConfiguration(structure: ModelStructure, diagnostics: vscode.Diagnostic[]): void {
        const settingsManager = getSettingsManager();
        
        // Valid loss functions
        const validLossFunctions = [
            'binary_crossentropy', 'categorical_crossentropy', 'sparse_categorical_crossentropy',
            'mean_squared_error', 'mean_absolute_error', 'huber_loss', 'cosine_similarity',
            'poisson', 'kl_divergence'
        ];
        
        // Valid optimizers
        const validOptimizers = ['Adam', 'SGD', 'RMSprop', 'Adagrad', 'Adadelta', 'Adamax', 'Nadam'];
        
        // Validate training configuration
        structure.training.forEach(training => {
            // Check required parameters
            if (training.type === 'compile' || training.type === 'train') {
                if (!training.parameters.optimizer) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Training configuration requires 'optimizer' parameter`,
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    // Check if optimizer is valid
                    const optimizer = training.parameters.optimizer.replace(/['"`]/g, '');
                    const optimizerName = optimizer.split('(')[0];
                    if (!validOptimizers.includes(optimizerName)) {
                        const range = new vscode.Range(training.line, 0, training.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Unknown optimizer: '${optimizerName}'. Valid options: ${validOptimizers.join(', ')}`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
                
                if (!training.parameters.loss) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Training configuration requires 'loss' parameter`,
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    // Check if loss function is valid
                    const loss = training.parameters.loss.replace(/['"`]/g, '');
                    if (!validLossFunctions.includes(loss)) {
                        const range = new vscode.Range(training.line, 0, training.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Unknown loss function: '${loss}'. Valid options: ${validLossFunctions.join(', ')}`,
                            vscode.DiagnosticSeverity.Warning
                        ));
                    }
                }
            }
            
            if (training.type === 'fit' || training.type === 'train') {
                if (!training.parameters.epochs) {
                    const range = new vscode.Range(training.line, 0, training.line, 50);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Training configuration requires 'epochs' parameter`,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
            
            // Validate parameter types
            Object.entries(training.parameters).forEach(([key, value]) => {
                // Number parameters
                if (['epochs', 'batch_size', 'validation_split'].includes(key)) {
                    if (isNaN(Number(value.replace(/['"`]/g, '')))) {
                        const range = new vscode.Range(training.line, 0, training.line, 50);
                        diagnostics.push(new vscode.Diagnostic(
                            range,
                            `Parameter '${key}' must be a number`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
            });
        });
    }

    public dispose(): void {
        if (this.validationDelayTimer) {
            clearTimeout(this.validationDelayTimer);
        }
        this.documentCache.clear();
        this.diagnosticCollection.dispose();
    }
}

export function registerDiagnosticProvider(context: vscode.ExtensionContext): AILangDiagnosticProvider {
    const provider = new AILangDiagnosticProvider();
    const settingsManager = getSettingsManager();
    
    // Register document change listeners with debouncing
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

    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('ailang')) {
            // Update validation delay from settings
            (provider as any).validationDelay = settingsManager.debounceDelay;
            
            // Re-validate all open documents
            vscode.workspace.textDocuments.forEach(document => {
                if (document.languageId === 'ailang') {
                    provider.validateDocument(document);
                }
            });
        }
    }));

    context.subscriptions.push(provider);
    return provider;
}
