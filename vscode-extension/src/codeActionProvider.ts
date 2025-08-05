import * as vscode from 'vscode';
import { getSettingsManager } from './settingsManager';

/**
 * Provides code actions for AILang files
 */
export class AILangCodeActionProvider {
    private settingsManager = getSettingsManager();
    
    constructor() {
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ailang')) {
                // Settings manager handles configuration updates automatically
                console.log('Code action configuration updated');
            }
        });
    }
    
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        // Check if code actions are enabled in settings
        if (!this.settingsManager.codeActionsEnabled) {
            return [];
        }
        
        const codeActions: vscode.CodeAction[] = [];
        
        // Process each diagnostic to provide relevant code actions
        for (const diagnostic of context.diagnostics) {
            // Add model template action
            if (diagnostic.code === 'no-model-definition') {
                codeActions.push(this.createAddModelAction(document, range));
            }
            
            // Add missing compile action
            if (diagnostic.code === 'missing-compile') {
                codeActions.push(this.createAddCompileAction(document, range));
            }
            
            // Add input layer action
            if (diagnostic.code === 'missing-input-layer') {
                codeActions.push(this.createAddInputLayerAction(document, range));
            }
            
            // Add output layer action
            if (diagnostic.code === 'missing-output-layer') {
                codeActions.push(this.createAddOutputLayerAction(document, range));
            }
            
            // Fix indentation issues
            if (diagnostic.code === 'indentation-error') {
                codeActions.push(this.createFixIndentationAction(document, diagnostic.range));
            }
        }
        
        // Add general code actions that are always available
        this.addGeneralCodeActions(document, range, codeActions);
        
        return codeActions;
    }
    
    private createAddModelAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        // Only provide this action if quick fixes are enabled
        if (!this.settingsManager.enableQuickFixes) {
            return null;
        }
        
        const action = new vscode.CodeAction('Add model template', vscode.CodeActionKind.QuickFix);
        const modelTemplate = 'model MyModel {\n  Input(shape=(28, 28, 1))\n  Flatten()\n  Dense(units=128, activation=\'relu\')\n  Dense(units=10, activation=\'softmax\')\n}\n\ncompile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n';
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.insert(document.uri, new vscode.Position(0, 0), modelTemplate);
        action.isPreferred = true;
        action.diagnostics = []; // Link to the diagnostic this fixes
        
        return action;
    }
    
    private createAddCompileAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        // Only provide this action if quick fixes are enabled
        if (!this.settingsManager.enableQuickFixes) {
            return null;
        }
        
        const action = new vscode.CodeAction('Add compile statement', vscode.CodeActionKind.QuickFix);
        const compileStatement = 'compile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n';
        
        // Find the end of the model block
        const text = document.getText();
        const modelEndMatch = /}(?![^{]*})/.exec(text);
        
        action.edit = new vscode.WorkspaceEdit();
        if (modelEndMatch) {
            const position = document.positionAt(modelEndMatch.index + 1);
            action.edit.insert(document.uri, position, '\n\n' + compileStatement);
        } else {
            // If we can't find the end of the model, just append to the end of the document
            const endPosition = document.lineAt(document.lineCount - 1).range.end;
            action.edit.insert(document.uri, endPosition, '\n\n' + compileStatement);
        }
        
        action.isPreferred = true;
        
        return action;
    }
    
    private createAddInputLayerAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        // Only provide this action if quick fixes are enabled
        if (!this.settingsManager.enableQuickFixes) {
            return null;
        }
        
        const action = new vscode.CodeAction('Add Input layer', vscode.CodeActionKind.QuickFix);
        const inputLayer = '  Input(shape=(28, 28, 1))\n';
        
        // Find the opening brace of the model block
        const text = document.getText();
        const modelOpenMatch = /model\s+\w+\s*{/.exec(text);
        
        action.edit = new vscode.WorkspaceEdit();
        if (modelOpenMatch) {
            const position = document.positionAt(modelOpenMatch.index + modelOpenMatch[0].length);
            action.edit.insert(document.uri, position, '\n' + inputLayer);
        }
        
        action.isPreferred = true;
        
        return action;
    }
    
    private createAddOutputLayerAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        // Only provide this action if quick fixes are enabled
        if (!this.settingsManager.enableQuickFixes) {
            return null;
        }
        
        const action = new vscode.CodeAction('Add Output layer', vscode.CodeActionKind.QuickFix);
        const outputLayer = '  Dense(units=10, activation=\'softmax\')\n';
        
        // Find the closing brace of the model block
        const text = document.getText();
        const modelCloseMatch = /}(?![^{]*})/.exec(text);
        
        action.edit = new vscode.WorkspaceEdit();
        if (modelCloseMatch) {
            const position = document.positionAt(modelCloseMatch.index);
            action.edit.insert(document.uri, position, outputLayer);
        }
        
        action.isPreferred = true;
        
        return action;
    }
    
    private createFixIndentationAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        // Only provide this action if quick fixes are enabled
        if (!this.settingsManager.enableQuickFixes) {
            return null;
        }
        
        const action = new vscode.CodeAction('Fix indentation', vscode.CodeActionKind.QuickFix);
        
        // Get the current line and its indentation
        const line = document.lineAt(range.start.line);
        const text = line.text;
        const indentSize = this.settingsManager.indentSize;
        
        // Determine the correct indentation level
        let indentLevel = 0;
        const modelMatch = text.match(/model\s+\w+\s*{/);
        if (modelMatch) {
            indentLevel = 0;
        } else if (text.includes('}')) {
            indentLevel = 0;
        } else {
            // Inside a model block
            indentLevel = 1;
        }
        
        const correctIndentation = ' '.repeat(indentSize * indentLevel);
        const trimmedText = text.trimStart();
        const correctedText = correctIndentation + trimmedText;
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.replace(document.uri, line.range, correctedText);
        
        return action;
    }
    
    private addGeneralCodeActions(document: vscode.TextDocument, range: vscode.Range, codeActions: vscode.CodeAction[]): void {
        // Only add refactoring actions if they're enabled in settings
        if (!this.settingsManager.enableRefactoring) {
            return;
        }
        
        // Add a general action to add a new layer
        const addLayerAction = new vscode.CodeAction('Add new layer', vscode.CodeActionKind.Refactor);
        addLayerAction.command = {
            title: 'Add new layer',
            command: 'ailang.addLayer',
            arguments: [document.uri, range.start]
        };
        codeActions.push(addLayerAction);
        
        // Only add model transformation actions if they're enabled in settings
        if (this.settingsManager.enableModelTransformation) {
            // Add action to convert to sequential model
            const convertToSequentialAction = new vscode.CodeAction('Convert to Sequential model', vscode.CodeActionKind.Refactor);
            convertToSequentialAction.command = {
                title: 'Convert to Sequential model',
                command: 'ailang.convertToSequential',
                arguments: [document.uri]
            };
            codeActions.push(convertToSequentialAction);
            
            // Add action to optimize hyperparameters
            const optimizeHyperparametersAction = new vscode.CodeAction('Optimize hyperparameters', vscode.CodeActionKind.Refactor);
            optimizeHyperparametersAction.command = {
                title: 'Optimize hyperparameters',
                command: 'ailang.optimizeHyperparameters',
                arguments: [document.uri]
            };
            codeActions.push(optimizeHyperparametersAction);
            
            // Add action to validate model architecture
            const validateModelAction = new vscode.CodeAction('Validate model architecture', vscode.CodeActionKind.Refactor);
            validateModelAction.command = {
                title: 'Validate model architecture',
                command: 'ailang.validateModel',
                arguments: [document.uri]
            };
            codeActions.push(validateModelAction);
        }
        
        // Only add layer extraction actions if they're enabled in settings
        if (this.settingsManager.enableLayerExtraction) {
            // Add action to extract layers to a new model
            const extractLayersAction = new vscode.CodeAction('Extract layers to new model', vscode.CodeActionKind.Refactor);
            extractLayersAction.command = {
                title: 'Extract layers to new model',
                command: 'ailang.extractLayers',
                arguments: [document.uri, range]
            };
            codeActions.push(extractLayersAction);
        }
    }
}

/**
 * Register the code action provider
 */
export function registerCodeActionProvider(context: vscode.ExtensionContext): void {
    try {
        // Get settings manager
        const settingsManager = getSettingsManager();
        
        // Check if code actions are enabled in settings
        if (!settingsManager.codeActionsEnabled) {
            console.log('Code action provider registration skipped - code actions are disabled in settings');
            return;
        }
        
        const codeActionProvider = new AILangCodeActionProvider();
        
        // Register the provider
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider('ailang', {
                provideCodeActions: codeActionProvider.provideCodeActions.bind(codeActionProvider)
            }, {
                providedCodeActionKinds: [
                    vscode.CodeActionKind.QuickFix,
                    vscode.CodeActionKind.Refactor
                ]
            })
        );
        
        // Register commands used by code actions
        context.subscriptions.push(
            vscode.commands.registerCommand('ailang.addLayer', (uri: vscode.Uri, position: vscode.Position) => {
                const items = [
                    'Dense(units=128, activation=\'relu\')',
                    'Conv2D(filters=32, kernel_size=(3, 3), activation=\'relu\')',
                    'MaxPooling2D(pool_size=(2, 2))',
                    'Dropout(rate=0.25)',
                    'Flatten()',
                    'BatchNormalization()'
                ];
                
                vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a layer to add'
                }).then(selection => {
                    if (selection) {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(uri, position, '  ' + selection + '\n');
                        vscode.workspace.applyEdit(edit);
                    }
                });
            }),
            
            vscode.commands.registerCommand('ailang.convertToSequential', (uri: vscode.Uri) => {
                vscode.window.showInformationMessage('Converting to Sequential model - not yet implemented');
                // Implementation would go here
            }),
            
            vscode.commands.registerCommand('ailang.extractLayers', async (uri: vscode.Uri, range: vscode.Range) => {
                try {
                    // Get the document
                    const document = await vscode.workspace.openTextDocument(uri);
                    
                    // If no selection, show error and return
                    if (!range || range.isEmpty) {
                        vscode.window.showErrorMessage('Please select the layers you want to extract');
                        return;
                    }
                    
                    // Get the selected text
                    const selectedText = document.getText(range);
                    
                    // Check if the selection contains valid layer definitions
                    const layerRegex = /\s*([\w\d]+)\s*\([^)]*\)/g;
                    const matches = selectedText.match(layerRegex);
                    
                    if (!matches || matches.length === 0) {
                        vscode.window.showErrorMessage('No valid layer definitions found in the selection');
                        return;
                    }
                    
                    // Ask for the new model name
                    const modelName = await vscode.window.showInputBox({
                        prompt: 'Enter name for the new model',
                        placeHolder: 'NewModel',
                        value: 'ExtractedModel'
                    });
                    
                    if (!modelName) {
                        // User cancelled
                        return;
                    }
                    
                    // Create the new model with the extracted layers
                    const extractedModel = `model ${modelName} {\n${selectedText}\n}\n\n`;
                    
                    // Find a good position to insert the new model
                    // Try to find the end of the current model
                    const text = document.getText();
                    const modelEndMatch = /}(?![^{]*})/.exec(text);
                    
                    let insertPosition: vscode.Position;
                    if (modelEndMatch) {
                        // Insert after the end of the current model
                        insertPosition = document.positionAt(modelEndMatch.index + 1);
                    } else {
                        // If we can't find the end of the model, just append to the end of the document
                        insertPosition = document.lineAt(document.lineCount - 1).range.end;
                    }
                    
                    // Create and apply the edit
                    const edit = new vscode.WorkspaceEdit();
                    edit.insert(uri, insertPosition, '\n\n' + extractedModel);
                    
                    const success = await vscode.workspace.applyEdit(edit);
                    if (success) {
                        vscode.window.showInformationMessage(`Extracted layers to new model '${modelName}'`);
                    } else {
                        vscode.window.showErrorMessage('Failed to extract layers to new model');
                    }
                } catch (error) {
                    console.error('Error extracting layers:', error);
                    vscode.window.showErrorMessage(`Error extracting layers: ${error.message}`);
                }
            }),
            
            // Register the optimize hyperparameters command
            vscode.commands.registerCommand('ailang.optimizeHyperparameters', async (uri: vscode.Uri) => {
                try {
                    // Get the document
                    const document = await vscode.workspace.openTextDocument(uri);
                    const text = document.getText();
                    
                    // Find the compile statement
                    const compileRegex = /compile\s+([^;]*)/;
                    const compileMatch = text.match(compileRegex);
                    
                    if (!compileMatch) {
                        vscode.window.showErrorMessage('No compile statement found in the document');
                        return;
                    }
                    
                    // Extract the compile parameters
                    const compileParams = compileMatch[1];
                    
                    // Check for optimizer
                    const optimizerRegex = /optimizer\s*=\s*['"]([^'"]+)['"]/;
                    const optimizerMatch = compileParams.match(optimizerRegex);
                    
                    if (!optimizerMatch) {
                        vscode.window.showErrorMessage('No optimizer found in compile statement');
                        return;
                    }
                    
                    const currentOptimizer = optimizerMatch[1];
                    
                    // Suggest optimizers based on the current one
                    let suggestedOptimizers: string[] = [];
                    let suggestedLearningRates: string[] = [];
                    
                    switch (currentOptimizer) {
                        case 'sgd':
                            suggestedOptimizers = ['adam', 'rmsprop', 'sgd'];
                            suggestedLearningRates = ['0.01', '0.001', '0.0001'];
                            break;
                        case 'adam':
                            suggestedOptimizers = ['adam', 'adamw', 'nadam'];
                            suggestedLearningRates = ['0.001', '0.0001', '0.00001'];
                            break;
                        case 'rmsprop':
                            suggestedOptimizers = ['rmsprop', 'adam', 'adagrad'];
                            suggestedLearningRates = ['0.001', '0.0005', '0.0001'];
                            break;
                        default:
                            suggestedOptimizers = ['adam', 'rmsprop', 'sgd'];
                            suggestedLearningRates = ['0.001', '0.0001'];
                    }
                    
                    // Ask the user to select an optimizer
                    const selectedOptimizer = await vscode.window.showQuickPick(suggestedOptimizers, {
                        placeHolder: 'Select an optimizer',
                        title: 'Optimize Hyperparameters'
                    });
                    
                    if (!selectedOptimizer) {
                        // User cancelled
                        return;
                    }
                    
                    // Ask the user to select a learning rate
                    const selectedLearningRate = await vscode.window.showQuickPick(suggestedLearningRates, {
                        placeHolder: 'Select a learning rate',
                        title: 'Optimize Hyperparameters'
                    });
                    
                    if (!selectedLearningRate) {
                        // User cancelled
                        return;
                    }
                    
                    // Create the new optimizer configuration
                    let newCompileParams = compileParams;
                    
                    // Replace the optimizer
                    newCompileParams = newCompileParams.replace(
                        optimizerRegex, 
                        `optimizer='${selectedOptimizer}'`
                    );
                    
                    // Check if learning rate is already specified
                    const lrRegex = /learning_rate\s*=\s*([0-9.]+)/;
                    if (lrRegex.test(newCompileParams)) {
                        // Replace existing learning rate
                        newCompileParams = newCompileParams.replace(
                            lrRegex,
                            `learning_rate=${selectedLearningRate}`
                        );
                    } else {
                        // Add learning rate to the optimizer
                        newCompileParams = newCompileParams.replace(
                            `optimizer='${selectedOptimizer}'`,
                            `optimizer='${selectedOptimizer}', learning_rate=${selectedLearningRate}`
                        );
                    }
                    
                    // Create and apply the edit
                    const edit = new vscode.WorkspaceEdit();
                    const compileStartIndex = compileMatch.index!;
                    const compileEndIndex = compileStartIndex + compileMatch[0].length;
                    const compileRange = new vscode.Range(
                        document.positionAt(compileStartIndex),
                        document.positionAt(compileEndIndex)
                    );
                    
                    edit.replace(uri, compileRange, `compile ${newCompileParams}`);
                    
                    const success = await vscode.workspace.applyEdit(edit);
                    if (success) {
                        vscode.window.showInformationMessage(`Updated optimizer to '${selectedOptimizer}' with learning rate ${selectedLearningRate}`);
                    } else {
                        vscode.window.showErrorMessage('Failed to update optimizer');
                    }
                } catch (error) {
                    console.error('Error optimizing hyperparameters:', error);
                    vscode.window.showErrorMessage(`Error optimizing hyperparameters: ${error.message}`);
                }
            }),
            
            // Register the validate model command
            vscode.commands.registerCommand('ailang.validateModel', async (uri: vscode.Uri) => {
                try {
                    // Get the document
                    const document = await vscode.workspace.openTextDocument(uri);
                    const text = document.getText();
                    
                    // Find the model definition
                    const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
                    const matches = [...text.matchAll(modelRegex)];
                    
                    if (matches.length === 0) {
                        vscode.window.showErrorMessage('No model definition found in the document');
                        return;
                    }
                    
                    // If there are multiple models, ask the user which one to validate
                    let selectedModelMatch: RegExpMatchArray;
                    
                    if (matches.length === 1) {
                        selectedModelMatch = matches[0];
                    } else {
                        // Extract model names for the quick pick
                        const modelNames = matches.map(match => match[1]);
                        
                        const selectedName = await vscode.window.showQuickPick(modelNames, {
                            placeHolder: 'Select a model to validate'
                        });
                        
                        if (!selectedName) {
                            // User cancelled
                            return;
                        }
                        
                        selectedModelMatch = matches.find(match => match[1] === selectedName)!;
                    }
                    
                    // Extract model name and body
                    const modelName = selectedModelMatch[1];
                    const modelBody = selectedModelMatch[2];
                    
                    // Extract layers from the model body
                    const layerRegex = /\s*([\w\d]+)\s*\(([^)]*)\)/g;
                    const layerMatches = [...modelBody.matchAll(layerRegex)];
                    
                    if (layerMatches.length === 0) {
                        vscode.window.showErrorMessage('No layers found in the model');
                        return;
                    }
                    
                    // Perform basic validation
                    const validationResults: string[] = [];
                    let hasInputLayer = false;
                    let hasOutputLayer = false;
                    let hasFlatten = false;
                    let hasConvLayer = false;
                    let hasDenseLayer = false;
                    
                    for (const layerMatch of layerMatches) {
                        const layerType = layerMatch[1];
                        
                        if (layerType === 'Input') {
                            hasInputLayer = true;
                        } else if (layerType === 'Dense' && layerMatch[2].includes('softmax') || layerMatch[2].includes('sigmoid')) {
                            hasOutputLayer = true;
                        } else if (layerType === 'Flatten') {
                            hasFlatten = true;
                        } else if (layerType.includes('Conv')) {
                            hasConvLayer = true;
                        } else if (layerType === 'Dense') {
                            hasDenseLayer = true;
                        }
                    }
                    
                    // Check for common issues
                    if (!hasInputLayer) {
                        validationResults.push('❌ Missing Input layer');
                    }
                    
                    if (!hasOutputLayer) {
                        validationResults.push('❌ Missing output activation (softmax/sigmoid)');
                    }
                    
                    if (hasConvLayer && !hasFlatten && hasDenseLayer) {
                        validationResults.push('❌ Conv layers should be flattened before Dense layers');
                    }
                    
                    // Check the compile statement
                    const compileRegex = /compile\s+([^;]*)/;
                    const compileMatch = text.match(compileRegex);
                    
                    if (!compileMatch) {
                        validationResults.push('❌ Missing compile statement');
                    } else {
                        const compileParams = compileMatch[1];
                        
                        if (!compileParams.includes('optimizer')) {
                            validationResults.push('❌ Missing optimizer in compile statement');
                        }
                        
                        if (!compileParams.includes('loss')) {
                            validationResults.push('❌ Missing loss function in compile statement');
                        }
                        
                        if (!compileParams.includes('metrics')) {
                            validationResults.push('❌ Missing metrics in compile statement');
                        }
                    }
                    
                    // If no issues found, add a success message
                    if (validationResults.length === 0) {
                        validationResults.push('✅ Model structure looks good!');
                    }
                    
                    // Show the validation results
                    const validationMessage = `Validation results for model '${modelName}':\n\n${validationResults.join('\n')}`;
                    vscode.window.showInformationMessage(validationMessage, { modal: true });
                    
                } catch (error) {
                    console.error('Error validating model:', error);
                    vscode.window.showErrorMessage(`Error validating model: ${error.message}`);
                }
            })
        );
        
        console.log('Code action provider registered successfully');
    } catch (error) {
        console.error('Failed to register code action provider:', error);
        vscode.window.showErrorMessage(`Failed to register AILang code action provider: ${error}`);
    }
}
