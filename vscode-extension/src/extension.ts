import * as path from 'path';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, WorkspaceConfiguration, Progress, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, ErrorAction, CloseAction } from 'vscode-languageclient/node';
import * as fs from 'fs';
import * as os from 'os';
import { registerFormatter } from './formatter';
import { registerCompletionProvider } from './completionProvider';
import { registerHoverProvider } from './hoverProvider';
import { registerDiagnosticProvider } from './diagnosticProvider';
import { registerCodeActionProvider } from './codeActionProvider';
import { registerFoldingRangeProvider } from './foldingRangeProvider';
import { logDebugInfo } from './debug';
import { AILangSettingsManager, getSettingsManager } from './settingsManager';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
    console.log('AILang extension is now activating!');
    window.showInformationMessage('AILang extension is now activating!');
    
    console.log('Extension path:', context.extensionPath);
    console.log('Extension URI:', context.extensionUri.toString());
    console.log('Extension mode:', context.extensionMode);
    
    // Initialize settings manager
    const settingsManager = getSettingsManager();
    console.log('Settings manager initialized');
    
    const welcomeCommand = commands.registerCommand('ailang.showWelcome', () => {
        window.showInformationMessage('Welcome to AILang extension!');
    });
    
    commands.executeCommand('ailang.showWelcome').then(() => {
        console.log('Welcome command executed successfully');
    }, (error) => {
        console.error('Failed to execute welcome command:', error);
    });
    
    console.log('All registered commands:', commands.getCommands(true).then(cmds => console.log(cmds)));
    
    const showWelcome = async () => {
        try {
            const selection = await window.showInformationMessage(
                'AILang extension is now active!',
                'Open Documentation',
                'Got it!'
            );
            
            if (selection === 'Open Documentation') {
                commands.executeCommand('vscode.open', Uri.parse('https://github.com/yourusername/ailang#readme'));
            }
        } catch (error) {
            console.error('Error in showWelcome:', error);
        }
    };
    
    try {
        // Register the welcome command
        const welcomeCommand = commands.registerCommand('ailang.showWelcome', showWelcome);
        
        // Get the configuration
        const config = workspace.getConfiguration('ailang');
        
        // Register commands and providers
        console.log('Registering commands...');
        
        // Register all commands explicitly
        const validateCommand = commands.registerCommand('ailang.validateFile', validateCurrentFile);
        context.subscriptions.push(validateCommand);
        console.log('Registered ailang.validateFile command');
        
        const formatCommand = commands.registerCommand('ailang.formatFile', formatCurrentFile);
        context.subscriptions.push(formatCommand);
        console.log('Registered ailang.formatFile command');
        
        const debugCommand = commands.registerCommand('ailang.debugInfo', logDebugInfo);
        context.subscriptions.push(debugCommand);
        console.log('Registered ailang.debugInfo command');
        
        // Register code action commands
        const convertToSequentialCommand = commands.registerCommand('ailang.convertToSequential', convertToSequential);
        context.subscriptions.push(convertToSequentialCommand);
        console.log('Registered ailang.convertToSequential command');
        
        const extractLayersCommand = commands.registerCommand('ailang.extractLayers', extractLayers);
        context.subscriptions.push(extractLayersCommand);
        console.log('Registered ailang.extractLayers command');
        
        const optimizeHyperparametersCommand = commands.registerCommand('ailang.optimizeHyperparameters', optimizeHyperparameters);
        context.subscriptions.push(optimizeHyperparametersCommand);
        console.log('Registered ailang.optimizeHyperparameters command');
        
        const validateModelCommand = commands.registerCommand('ailang.validateModel', validateModel);
        context.subscriptions.push(validateModelCommand);
        console.log('Registered ailang.validateModel command');
        
        const visualizeModelArchitectureCommand = commands.registerCommand('ailang.visualizeModelArchitecture', visualizeModelArchitecture);
        context.subscriptions.push(visualizeModelArchitectureCommand);
        console.log('Registered ailang.visualizeModelArchitecture command');
        
        // Register a command to set the language ID for the current file
        const setLanguageCommand = commands.registerCommand('ailang.setLanguageId', async () => {
            try {
                const editor = window.activeTextEditor;
                if (!editor) {
                    window.showWarningMessage('No active editor found');
                    return;
                }
                
                const document = editor.document;
                console.log(`Current document: ${document.fileName}, Language ID: ${document.languageId}`);
                
                // Set the language ID to ailang
                await commands.executeCommand('setEditorLanguage', { languageId: 'ailang' });
                
                window.showInformationMessage(`Language ID set to AILang for ${path.basename(document.fileName)}`);
                console.log(`Language ID set to AILang for ${document.fileName}`);
            } catch (error) {
                console.error('Error setting language ID:', error);
                window.showErrorMessage(`Failed to set language ID: ${error}`);
            }
        });
        
        // Register providers with error handling
        try {
            // Register the formatter
            if (settingsManager.formattingEnabled) {
                console.log('Registering formatter...');
                registerFormatter(context);
            } else {
                console.log('Formatter disabled in settings');
            }
            
            // Register the completion provider
            if (settingsManager.completionEnabled) {
                console.log('Registering completion provider...');
                registerCompletionProvider(context);
            } else {
                console.log('Completion provider disabled in settings');
            }
            
            // Register the hover provider
            if (settingsManager.hoverEnabled) {
                console.log('Registering hover provider...');
                registerHoverProvider(context);
            } else {
                console.log('Hover provider disabled in settings');
            }
            
            // Register the diagnostic provider
            if (settingsManager.validationEnabled) {
                console.log('Registering diagnostic provider...');
                registerDiagnosticProvider(context);
            } else {
                console.log('Diagnostic provider disabled in settings');
            }
            
            // Register the code action provider
            if (settingsManager.codeActionsEnabled) {
                console.log('Registering code action provider...');
                registerCodeActionProvider(context);
            } else {
                console.log('Code action provider disabled in settings');
            }
            
            // Register the folding range provider
            console.log('Registering folding range provider...');
            registerFoldingRangeProvider(context);
        } catch (error) {
            console.error('Failed to register providers:', error);
            window.showErrorMessage(`Failed to register providers: ${error}`);
        }
        
        // Register commands and providers
        // We've already added some commands to subscriptions individually
        // Add the remaining commands
        context.subscriptions.push(
            welcomeCommand,
            setLanguageCommand
        );
        
        // Force VS Code to recognize our commands
        commands.executeCommand('setContext', 'ailang.commandsRegistered', true);
        
        // Ensure all core commands are properly registered
        console.log('All core AILang commands registered successfully');
        
        // Log all registered commands
        commands.getCommands(true).then(allCommands => {
            console.log('All registered commands:', allCommands);
            const ailangCommands = allCommands.filter(cmd => cmd.startsWith('ailang.'));
            console.log('AILang commands:', ailangCommands);
        });
        
        // Start the language server
        console.log('Starting language server...');
        startLanguageServer(context, config);
        
        // Register configuration change listener
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('ailang')) {
                    console.log('AILang configuration changed, reloading settings...');
                    settingsManager.reloadSettings();
                    
                    // Restart the language server if server-related settings changed
                    if (e.affectsConfiguration('ailang.path') || 
                        e.affectsConfiguration('ailang.configPath') ||
                        e.affectsConfiguration('ailang.trace.server')) {
                        console.log('Server-related settings changed, restarting server...');
                        restartLanguageServer(context);
                    }
                }
            })
        );
        
        // Show welcome message on first activation
        const isFirstActivation = context.globalState.get('isFirstActivation', true);
        if (isFirstActivation) {
            await showWelcome();
            await context.globalState.update('isFirstActivation', false);
        }
        
        console.log('AILang extension is now active!');
        
        // Log the current document language modes for debugging
        workspace.textDocuments.forEach(doc => {
            console.log(`Document: ${doc.fileName}, Language: ${doc.languageId}`);
        });
        
    } catch (error) {
        console.error('Error during AILang extension activation:', error);
        window.showErrorMessage(`AILang extension failed to activate: ${error}`);
    }
}

export function deactivate(): vscode.ProviderResult<void> {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

async function validateCurrentFile() {
    const editor = window.activeTextEditor;
    if (!editor || !editor.document || editor.document.languageId !== 'ailang') {
        window.showWarningMessage('No active AILang document found');
        return;
    }
    
    const document = editor.document;
    
    try {
        // Show progress indicator
        await window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Validating AILang file',
            cancellable: false
        }, async (progress: Progress<{ message?: string; increment?: number }>) => {
            progress.report({ message: 'Running validations...' });
            
            // In a real implementation, this would call the language server
            // For now, we'll just show a message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Show results in the problems panel
            const diagnostics = [];
            // Add your validation logic here
            
            if (diagnostics.length === 0) {
                window.showInformationMessage('No issues found in the current file');
            } else {
                window.showWarningMessage(`Found ${diagnostics.length} issue(s) in the current file`);
            }
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        window.showErrorMessage(`Validation failed: ${errorMessage}`);
    }
}

async function formatCurrentFile() {
    try {
        console.log('Formatting current file...');
        const editor = window.activeTextEditor;
        if (!editor) {
            window.showWarningMessage('No active editor found');
            return;
        }
        
        const document = editor.document;
        console.log(`Current document: ${document.fileName}, Language ID: ${document.languageId}`);
        
        // Check if formatting is enabled
        const settingsManager = getSettingsManager();
        if (!settingsManager.formattingEnabled) {
            window.showInformationMessage('AILang formatting is disabled in settings');
            return;
        }
        
        // Set the language ID to ailang if it's not already set
        if (document.languageId !== 'ailang' && document.fileName.endsWith('.ail')) {
            console.log('Setting language ID to ailang...');
            await commands.executeCommand('setEditorLanguage', { languageId: 'ailang' });
            
            // Wait a moment for the language ID to be applied
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Use the standard VS Code format command which will use our registered formatter
        await commands.executeCommand('editor.action.formatDocument');
        
        // If the standard format command doesn't work, show a message
        window.showInformationMessage('AILang format command executed. If no formatting occurred, try setting the language ID first.');
    } catch (error) {
        console.error('Error formatting document:', error);
        window.showErrorMessage(`Error formatting document: ${error}`);
    }
}

function startLanguageServer(context: ExtensionContext, config: WorkspaceConfiguration) {
    try {
        console.log('Starting language server setup...');
        
        const settingsManager = getSettingsManager();
        
        // The server is implemented in Node.js
        const serverModule = context.asAbsolutePath(
            path.join('server', 'out', 'server.js')
        );
        console.log(`Server module path: ${serverModule}`);
        
        // Check if the server module exists
        try {
            const fs = require('fs');
            if (fs.existsSync(serverModule)) {
                console.log('Server module file exists');
            } else {
                console.error(`Server module file does not exist: ${serverModule}`);
                window.showErrorMessage(`AILang server module not found at: ${serverModule}`);
                return;
            }
        } catch (fsError) {
            console.error('Error checking server module file:', fsError);
        }
        
        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions: ServerOptions = {
            run: { 
                module: serverModule, 
                transport: TransportKind.ipc 
            },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: {
                    execArgv: ['--nolazy', '--inspect=6009']
                }
            }
        };
        
        // Options to control the language client
        const clientOptions: LanguageClientOptions = {
            // Register the server for AILang documents
            documentSelector: [{ scheme: 'file', language: 'ailang' }],
            synchronize: {
                // Notify the server about file changes to .ail files contained in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/*.ail')
            },
            // Add error handling
            errorHandler: {
                error: (error, message, count) => {
                    console.error(`Language client error: ${error} (message: ${message}, count: ${count})`);
                    return { action: ErrorAction.Continue };
                },
                closed: () => {
                    console.log('Language client connection closed');
                    return { action: CloseAction.Restart };
                }
            },
            // Initialize settings
            initializationOptions: {
                validation: {
                    enable: settingsManager.validationEnabled,
                    strict: settingsManager.validationStrict,
                    checkNamingConventions: settingsManager.checkNamingConventions,
                    checkDeprecated: settingsManager.checkDeprecated,
                    maxNumberOfProblems: settingsManager.maxNumberOfProblems,
                    maxWarningLevel: settingsManager.maxWarningLevel,
                    ignorePatterns: settingsManager.ignorePatterns
                },
                format: {
                    enable: settingsManager.formattingEnabled,
                    indentSize: settingsManager.indentSize,
                    insertFinalNewline: settingsManager.insertFinalNewline,
                    trimTrailingWhitespace: settingsManager.trimTrailingWhitespace
                },
                experimental: {
                    enableAdvancedValidation: settingsManager.enableAdvancedValidation,
                    enableTypeChecking: settingsManager.enableTypeChecking
                },
                performance: {
                    enableCaching: settingsManager.enableCaching,
                    debounceDelay: settingsManager.debounceDelay,
                    maxFileSize: settingsManager.maxFileSize,
                    enableBackgroundProcessing: settingsManager.enableBackgroundProcessing
                }
            }
        };
        
        console.log('Creating language client...');
        // Create the language client and start the client
        client = new LanguageClient(
            'ailangLanguageServer',
            'AILang Language Server',
            serverOptions,
            clientOptions
        );
        
        console.log('Starting language client...');
        // Start the client and the server
        client.start().catch(error => {
            console.error('Failed to start language client:', error);
            window.showErrorMessage(`Failed to start AILang language server: ${error.message}`);
        });
        
        console.log('Language server setup completed');
    } catch (error) {
        console.error('Error in startLanguageServer:', error);
        window.showErrorMessage(`Error starting AILang language server: ${error}`);
    }
}

/**
 * Restart the language server
 */
async function restartLanguageServer(context: ExtensionContext) {
    try {
        if (client) {
            console.log('Stopping language client...');
            await client.stop();
            client = undefined;
        }
        
        console.log('Restarting language server...');
        const config = workspace.getConfiguration('ailang');
        startLanguageServer(context, config);
    } catch (error) {
        console.error('Error restarting language server:', error);
        window.showErrorMessage(`Error restarting AILang language server: ${error}`);
    }
}

/**
 * Convert the current model to a Sequential model
 */
async function convertToSequential(uri?: Uri) {
    try {
        const document = await getDocumentFromUri(uri);
        if (!document) return;
        
        // Find the model definition
        const text = document.getText();
        const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
        const modelMatch = modelRegex.exec(text);
        
        if (!modelMatch) {
            window.showErrorMessage('No model definition found in the current file.');
            return;
        }
        
        const modelName = modelMatch[1];
        const modelContent = modelMatch[2];
        
        // Extract layers from the model
        const layerRegex = /\s*(\w+)\s*\(([^)]*)\)/g;
        const layers: string[] = [];
        let layerMatch;
        
        while ((layerMatch = layerRegex.exec(modelContent)) !== null) {
            const layerType = layerMatch[1];
            const layerParams = layerMatch[2];
            layers.push(`${layerType}(${layerParams})`);
        }
        
        // Create the Sequential model
        const sequentialModel = `model Sequential_${modelName} {\n  ${layers.join('\n  ')}\n}\n`;
        
        // Insert the new model after the existing one
        const edit = new vscode.WorkspaceEdit();
        const position = document.positionAt(modelMatch.index + modelMatch[0].length);
        edit.insert(document.uri, position, '\n\n' + sequentialModel);
        
        await vscode.workspace.applyEdit(edit);
        window.showInformationMessage(`Created Sequential model: Sequential_${modelName}`);
    } catch (error) {
        console.error('Error converting to Sequential model:', error);
        window.showErrorMessage(`Error converting to Sequential model: ${error.message}`);
    }
}

/**
 * Extract selected layers to a new model
 */
async function extractLayers(uri?: Uri, selection?: vscode.Selection) {
    try {
        const editor = window.activeTextEditor;
        if (!editor) {
            window.showWarningMessage('No active editor found');
            return;
        }
        
        const document = editor.document;
        const selectedText = selection ? document.getText(selection) : editor.document.getText(editor.selection);
        
        if (!selectedText || selectedText.trim().length === 0) {
            window.showWarningMessage('No text selected. Please select the layers to extract.');
            return;
        }
        
        // Extract layers from the selected text
        const layerRegex = /\s*(\w+)\s*\(([^)]*)\)/g;
        const layers: string[] = [];
        let layerMatch;
        
        while ((layerMatch = layerRegex.exec(selectedText)) !== null) {
            const layerType = layerMatch[1];
            const layerParams = layerMatch[2];
            layers.push(`${layerType}(${layerParams})`);
        }
        
        if (layers.length === 0) {
            window.showWarningMessage('No valid layers found in the selection.');
            return;
        }
        
        // Ask for the new model name
        const modelName = await window.showInputBox({
            prompt: 'Enter a name for the new model',
            placeHolder: 'ExtractedModel'
        });
        
        if (!modelName) {
            return; // User cancelled
        }
        
        // Create the new model
        const newModel = `model ${modelName} {\n  ${layers.join('\n  ')}\n}\n`;
        
        // Insert the new model at the end of the file
        const edit = new vscode.WorkspaceEdit();
        const lastLine = document.lineAt(document.lineCount - 1);
        const position = new vscode.Position(lastLine.lineNumber + 1, 0);
        edit.insert(document.uri, position, '\n' + newModel);
        
        await vscode.workspace.applyEdit(edit);
        window.showInformationMessage(`Created new model: ${modelName} with ${layers.length} extracted layers.`);
    } catch (error) {
        console.error('Error extracting layers:', error);
        window.showErrorMessage(`Error extracting layers: ${error.message}`);
    }
}

/**
 * Optimize hyperparameters for the current model
 */
async function optimizeHyperparameters(uri?: Uri) {
    try {
        const document = await getDocumentFromUri(uri);
        if (!document) return;
        
        // Find the compile statement
        const text = document.getText();
        const compileRegex = /compile\s+([^;]*)/;
        const compileMatch = compileRegex.exec(text);
        
        if (!compileMatch) {
            window.showErrorMessage('No compile statement found in the current file.');
            return;
        }
        
        const compileParams = compileMatch[1];
        
        // Show optimization options
        const optimizationOption = await window.showQuickPick([
            { label: 'Optimize learning rate', description: 'Find the optimal learning rate for training' },
            { label: 'Optimize batch size', description: 'Find the optimal batch size for training' },
            { label: 'Optimize both', description: 'Find optimal learning rate and batch size' }
        ], { placeHolder: 'Select hyperparameter optimization option' });
        
        if (!optimizationOption) {
            return; // User cancelled
        }
        
        // Show a progress notification
        await window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Optimizing hyperparameters...',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0 });
            
            // Simulate optimization process
            for (let i = 0; i < 5; i++) {
                if (token.isCancellationRequested) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
                progress.report({ increment: 20, message: `Testing configuration ${i+1}/5` });
            }
            
            // Generate optimization results
            let optimizedParams = compileParams;
            
            if (optimizationOption.label.includes('learning rate')) {
                optimizedParams = optimizedParams.replace(/learning_rate\s*=\s*[^,\s]+/, 'learning_rate=0.001');
                if (!optimizedParams.includes('learning_rate')) {
                    optimizedParams += ' learning_rate=0.001';
                }
            }
            
            if (optimizationOption.label.includes('batch size')) {
                optimizedParams = optimizedParams.replace(/batch_size\s*=\s*\d+/, 'batch_size=32');
                if (!optimizedParams.includes('batch_size')) {
                    optimizedParams += ' batch_size=32';
                }
            }
            
            // Apply the optimized parameters
            const edit = new vscode.WorkspaceEdit();
            const startPos = document.positionAt(compileMatch.index + 'compile'.length);
            const endPos = document.positionAt(compileMatch.index + compileMatch[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            edit.replace(document.uri, range, ' ' + optimizedParams);
            await vscode.workspace.applyEdit(edit);
            
            window.showInformationMessage('Hyperparameters optimized successfully.');
        });
    } catch (error) {
        console.error('Error optimizing hyperparameters:', error);
        window.showErrorMessage(`Error optimizing hyperparameters: ${error.message}`);
    }
}

/**
 * Validate the current model architecture
 */
async function validateModel(uri?: Uri) {
    try {
        const document = await getDocumentFromUri(uri);
        if (!document) return;
        
        // Find the model definition
        const text = document.getText();
        const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
        const modelMatch = modelRegex.exec(text);
        
        if (!modelMatch) {
            window.showErrorMessage('No model definition found in the current file.');
            return;
        }
        
        const modelName = modelMatch[1];
        const modelContent = modelMatch[2];
        
        // Extract layers from the model
        const layerRegex = /\s*(\w+)\s*\(([^)]*)\)/g;
        const layerMatches = [...modelContent.matchAll(layerRegex)];
        
        if (layerMatches.length === 0) {
            window.showErrorMessage('No layers found in the model.');
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
            const layerParams = layerMatch[2];
            
            if (layerType === 'Input') {
                hasInputLayer = true;
            } else if (layerType === 'Dense' && layerParams.includes('softmax') || layerParams.includes('sigmoid')) {
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
        const compileMatch = compileRegex.exec(text);
        
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
        window.showInformationMessage(validationMessage, { modal: true });
    } catch (error) {
        console.error('Error validating model:', error);
        window.showErrorMessage(`Error validating model: ${error.message}`);
    }
}

/**
 * Visualize the model architecture
 */
async function visualizeModelArchitecture(uri?: Uri) {
    try {
        const document = await getDocumentFromUri(uri);
        if (!document) return;
        
        // Get settings manager to respect user configuration
        const settingsManager = getSettingsManager();
        
        // Parse the model from the document
        const text = document.getText();
        const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
        const modelMatch = modelRegex.exec(text);
        
        if (!modelMatch) {
            window.showErrorMessage('No model definition found in the current file.');
            return;
        }
        
        const modelName = modelMatch[1];
        const modelContent = modelMatch[2];
        
        // Extract layers
        const layerRegex = /\s*(\w+)\s*\(([^)]*)\)/g;
        const layers: ModelLayer[] = [];
        let layerMatch;
        let layerIndex = 0;
        
        while ((layerMatch = layerRegex.exec(modelContent)) !== null) {
            const layerType = layerMatch[1];
            const layerParams = layerMatch[2];
            
            // Parse parameters
            const params: { [key: string]: string } = {};
            const paramPairs = layerParams.split(',');
            
            for (const pair of paramPairs) {
                const [key, value] = pair.split('=').map(s => s.trim());
                if (key && value) {
                    params[key] = value;
                }
            }
            
            // Extract units/filters/size information
            let units = 0;
            let inputShape: number[] = [];
            let outputShape: number[] = [];
            
            if (params.units) {
                units = parseInt(params.units, 10);
            } else if (params.filters) {
                units = parseInt(params.filters, 10);
            }
            
            if (params.input_shape) {
                // Parse input shape like (28, 28, 1)
                const shapeStr = params.input_shape.replace(/[()]/g, '');
                inputShape = shapeStr.split(',').map(s => parseInt(s.trim(), 10));
            }
            
            // Calculate output shape based on layer type and parameters
            if (layerType === 'Dense') {
                if (layers.length > 0) {
                    const prevLayer = layers[layers.length - 1];
                    inputShape = prevLayer.outputShape;
                }
                outputShape = [units];
            } else if (layerType.includes('Conv2D')) {
                if (layers.length > 0) {
                    const prevLayer = layers[layers.length - 1];
                    inputShape = prevLayer.outputShape;
                }
                // Simple estimation for conv layers
                const kernelSize = params.kernel_size ? parseInt(params.kernel_size, 10) : 3;
                const stride = params.strides ? parseInt(params.strides, 10) : 1;
                const padding = params.padding === 'same' ? 0 : kernelSize - 1;
                
                if (inputShape.length >= 2) {
                    const outputHeight = Math.floor((inputShape[0] - kernelSize + padding) / stride + 1);
                    const outputWidth = Math.floor((inputShape[1] - kernelSize + padding) / stride + 1);
                    outputShape = [outputHeight, outputWidth, units];
                }
            } else if (layerType.includes('Pool')) {
                if (layers.length > 0) {
                    const prevLayer = layers[layers.length - 1];
                    inputShape = prevLayer.outputShape;
                }
                // Simple estimation for pooling layers
                const poolSize = params.pool_size ? parseInt(params.pool_size, 10) : 2;
                const stride = params.strides ? parseInt(params.strides, 10) : poolSize;
                
                if (inputShape.length >= 3) {
                    const outputHeight = Math.floor(inputShape[0] / stride);
                    const outputWidth = Math.floor(inputShape[1] / stride);
                    outputShape = [outputHeight, outputWidth, inputShape[2]];
                }
            } else if (layerType === 'Flatten') {
                if (layers.length > 0) {
                    const prevLayer = layers[layers.length - 1];
                    inputShape = prevLayer.outputShape;
                }
                // Flatten all dimensions into one
                let totalUnits = 1;
                for (const dim of inputShape) {
                    totalUnits *= dim;
                }
                outputShape = [totalUnits];
            } else {
                // For other layers, assume shape is preserved
                if (layers.length > 0) {
                    const prevLayer = layers[layers.length - 1];
                    inputShape = prevLayer.outputShape;
                    outputShape = [...inputShape];
                }
            }
            
            layers.push({
                id: layerIndex++,
                name: `${layerType}_${layerIndex}`,
                type: layerType,
                params: params,
                units: units,
                inputShape: inputShape,
                outputShape: outputShape
            });
        }
        
        // Generate visualization options
        const visualizationOptions = [
            { label: 'SVG Diagram', id: 'svg' },
            { label: 'HTML Interactive', id: 'html' },
            { label: 'Text Summary', id: 'text' },
            { label: 'JSON Structure', id: 'json' }
        ];
        
        // Show visualization options
        const selectedOption = await window.showQuickPick(visualizationOptions, {
            placeHolder: 'Select visualization format'
        });
        
        if (!selectedOption) {
            return; // User cancelled
        }
        
        // Generate visualization based on selected format
        let visualizationContent = '';
        let fileExtension = '';
        
        switch (selectedOption.id) {
            case 'svg':
                visualizationContent = generateSvgVisualization(modelName, layers);
                fileExtension = 'svg';
                break;
            case 'html':
                visualizationContent = generateHtmlVisualization(modelName, layers);
                fileExtension = 'html';
                break;
            case 'text':
                visualizationContent = generateTextVisualization(modelName, layers);
                fileExtension = 'txt';
                break;
            case 'json':
                visualizationContent = JSON.stringify(layers, null, 2);
                fileExtension = 'json';
                break;
        }
        
        // Create a temporary file to show the visualization
        const tempFile = path.join(os.tmpdir(), `ailang-model-${modelName}-${Date.now()}.${fileExtension}`);
        fs.writeFileSync(tempFile, visualizationContent);
        
        // Open the temp file
        if (fileExtension === 'html') {
            // Open in external browser
            vscode.env.openExternal(vscode.Uri.file(tempFile));
        } else if (fileExtension === 'svg') {
            // Try to open with SVG viewer if available
            vscode.commands.executeCommand('vscode.open', vscode.Uri.file(tempFile));
        } else {
            // Open in editor
            vscode.workspace.openTextDocument(tempFile).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
        
    } catch (error) {
        console.error('Error visualizing model architecture:', error);
        window.showErrorMessage(`Error visualizing model architecture: ${error.message}`);
    }
}

/**
 * Generate SVG visualization of model architecture
 */
function generateSvgVisualization(modelName: string, layers: ModelLayer[]): string {
    // SVG constants
    const width = 800;
    const height = 100 + layers.length * 100;
    const layerWidth = 180;
    const layerHeight = 80;
    const xOffset = (width - layerWidth) / 2;
    const colors = {
        dense: '#4285F4',
        conv: '#EA4335',
        pool: '#FBBC05',
        dropout: '#34A853',
        flatten: '#FF6D01',
        batch: '#46BDC6',
        activation: '#9C27B0',
        default: '#757575'
    };
    
    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <style>
        .layer { fill: #ffffff; stroke-width: 2px; }
        .layer-text { font-family: Arial; font-size: 14px; fill: #ffffff; text-anchor: middle; }
        .layer-params { font-family: Arial; font-size: 12px; fill: #ffffff; text-anchor: middle; }
        .arrow { fill: none; stroke: #757575; stroke-width: 2px; }
        .title { font-family: Arial; font-size: 20px; font-weight: bold; text-anchor: middle; }
    </style>
    <rect width="${width}" height="${height}" fill="#f5f5f5" />
    <text x="${width/2}" y="40" class="title">Model: ${modelName}</text>
`;
    
    // Draw layers
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const y = 80 + i * 100;
        
        // Determine color based on layer type
        let color = colors.default;
        if (layer.type.toLowerCase().includes('dense')) color = colors.dense;
        else if (layer.type.toLowerCase().includes('conv')) color = colors.conv;
        else if (layer.type.toLowerCase().includes('pool')) color = colors.pool;
        else if (layer.type.toLowerCase().includes('dropout')) color = colors.dropout;
        else if (layer.type.toLowerCase().includes('flatten')) color = colors.flatten;
        else if (layer.type.toLowerCase().includes('batch')) color = colors.batch;
        else if (layer.type.toLowerCase().includes('activation')) color = colors.activation;
        
        // Draw connection arrow from previous layer
        if (i > 0) {
            const prevY = 80 + (i - 1) * 100;
            svg += `    <path d="M ${xOffset + layerWidth/2} ${prevY + layerHeight} L ${xOffset + layerWidth/2} ${y}" class="arrow" marker-end="url(#arrow)" />`;
        }
        
        // Draw layer box
        svg += `    <rect x="${xOffset}" y="${y}" width="${layerWidth}" height="${layerHeight}" rx="5" class="layer" stroke="${color}" fill="${color}" />`;
        
        // Draw layer text
        svg += `    <text x="${xOffset + layerWidth/2}" y="${y + 25}" class="layer-text">${layer.type}</text>`;
        
        // Draw shape info
        let shapeText = '';
        if (layer.inputShape.length > 0 && layer.outputShape.length > 0) {
            shapeText = `${layer.inputShape.join('×')} → ${layer.outputShape.join('×')}`;
        } else if (layer.units > 0) {
            shapeText = `Units: ${layer.units}`;
        }
        
        if (shapeText) {
            svg += `    <text x="${xOffset + layerWidth/2}" y="${y + 50}" class="layer-params">${shapeText}</text>`;
        }
    }
    
    // Add arrow marker definition
    svg += `    <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#757575" />
        </marker>
    </defs>`;
    
    // Close SVG
    svg += '</svg>';
    
    return svg;
}

/**
 * Generate HTML visualization of model architecture with interactive elements
 */
function generateHtmlVisualization(modelName: string, layers: ModelLayer[]): string {
    // Create HTML with embedded CSS and JavaScript for interactivity
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AILang Model: ${modelName}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
        }
        .model-info {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 4px;
        }
        .layers-container {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .layer {
            padding: 15px;
            border-radius: 6px;
            color: white;
            position: relative;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .layer:hover {
            transform: translateY(-2px);
        }
        .layer-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .layer-type {
            font-weight: bold;
            font-size: 18px;
        }
        .layer-shape {
            font-size: 14px;
        }
        .layer-details {
            display: none;
            background-color: rgba(255,255,255,0.1);
            padding: 10px;
            margin-top: 10px;
            border-radius: 4px;
        }
        .arrow {
            text-align: center;
            color: #757575;
            font-size: 20px;
            margin: -5px 0;
        }
        .summary {
            margin-top: 30px;
            padding: 15px;
            background-color: #e9f5ff;
            border-radius: 6px;
        }
        .param-table {
            width: 100%;
            border-collapse: collapse;
        }
        .param-table th, .param-table td {
            text-align: left;
            padding: 6px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .param-table th {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AILang Model: ${modelName}</h1>
        
        <div class="model-info">
            <strong>Total layers:</strong> ${layers.length}<br>
            <strong>Model type:</strong> ${determineModelType(layers)}<br>
            <strong>Input shape:</strong> ${layers.length > 0 && layers[0].inputShape.length > 0 ? layers[0].inputShape.join('×') : 'Unknown'}<br>
            <strong>Output shape:</strong> ${layers.length > 0 ? layers[layers.length-1].outputShape.join('×') : 'Unknown'}
        </div>
        
        <div class="layers-container">`;
    
    // Add each layer
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        
        // Determine color based on layer type
        let color = '#757575';
        if (layer.type.toLowerCase().includes('dense')) color = '#4285F4';
        else if (layer.type.toLowerCase().includes('conv')) color = '#EA4335';
        else if (layer.type.toLowerCase().includes('pool')) color = '#FBBC05';
        else if (layer.type.toLowerCase().includes('dropout')) color = '#34A853';
        else if (layer.type.toLowerCase().includes('flatten')) color = '#FF6D01';
        else if (layer.type.toLowerCase().includes('batch')) color = '#46BDC6';
        else if (layer.type.toLowerCase().includes('activation')) color = '#9C27B0';
        
        // Add arrow between layers
        if (i > 0) {
            html += `
            <div class="arrow">↓</div>`;
        }
        
        // Add layer
        html += `
            <div class="layer" style="background-color: ${color};" onclick="toggleDetails(${i})">
                <div class="layer-header">
                    <div class="layer-type">${layer.type}</div>
                    <div class="layer-shape">`;
        
        // Add shape info
        if (layer.inputShape.length > 0 && layer.outputShape.length > 0) {
            html += `${layer.inputShape.join('×')} → ${layer.outputShape.join('×')}`;
        } else if (layer.units > 0) {
            html += `Units: ${layer.units}`;
        }
        
        html += `</div>
                </div>
                
                <div id="details-${i}" class="layer-details">
                    <table class="param-table">
                        <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                        </tr>`;
        
        // Add parameters
        for (const [key, value] of Object.entries(layer.params)) {
            html += `
                        <tr>
                            <td>${key}</td>
                            <td>${value}</td>
                        </tr>`;
        }
        
        html += `
                    </table>
                </div>
            </div>`;
    }
    
    // Add model summary
    html += `
        </div>
        
        <div class="summary">
            <h2>Model Summary</h2>
            <p>This model contains ${countLayersByType(layers, 'Dense')} dense layers, 
               ${countLayersByType(layers, 'Conv')} convolutional layers, 
               ${countLayersByType(layers, 'Pool')} pooling layers, and 
               ${countLayersByType(layers, 'Dropout')} dropout layers.</p>
            <p>Total parameters: ${estimateTotalParameters(layers).toLocaleString()}</p>
        </div>
    </div>
    
    <script>
        function toggleDetails(index) {
            const detailsElement = document.getElementById('details-' + index);
            if (detailsElement.style.display === 'block') {
                detailsElement.style.display = 'none';
            } else {
                detailsElement.style.display = 'block';
            }
        }
    </script>
</body>
</html>`;
    
    return html;
}

/**
 * Generate text visualization of model architecture
 */
function generateTextVisualization(modelName: string, layers: ModelLayer[]): string {
    let text = `Model: ${modelName}\n`;
    text += `${'='.repeat(modelName.length + 7)}\n\n`;
    
    text += `Total layers: ${layers.length}\n`;
    text += `Model type: ${determineModelType(layers)}\n`;
    text += `Input shape: ${layers.length > 0 && layers[0].inputShape.length > 0 ? layers[0].inputShape.join('×') : 'Unknown'}\n`;
    text += `Output shape: ${layers.length > 0 ? layers[layers.length-1].outputShape.join('×') : 'Unknown'}\n\n`;
    
    text += `Layer Architecture:\n`;
    text += `${'='.repeat(20)}\n\n`;
    
    // Add each layer
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        
        text += `Layer ${i+1}: ${layer.type}\n`;
        text += `${'-'.repeat(layer.type.length + 9)}\n`;
        
        // Add shape info
        if (layer.inputShape.length > 0 && layer.outputShape.length > 0) {
            text += `Shape: ${layer.inputShape.join('×')} → ${layer.outputShape.join('×')}\n`;
        } else if (layer.units > 0) {
            text += `Units: ${layer.units}\n`;
        }
        
        // Add parameters
        text += `Parameters:\n`;
        for (const [key, value] of Object.entries(layer.params)) {
            text += `  - ${key}: ${value}\n`;
        }
        
        // Add estimated parameter count for this layer
        const paramCount = estimateLayerParameters(layer);
        text += `Trainable parameters: ${paramCount.toLocaleString()}\n\n`;
        
        // Add connector except for the last layer
        if (i < layers.length - 1) {
            text += `    |\n    v\n\n`;
        }
    }
    
    // Add model summary
    text += `\nModel Summary:\n`;
    text += `${'='.repeat(14)}\n\n`;
    text += `Dense layers: ${countLayersByType(layers, 'Dense')}\n`;
    text += `Convolutional layers: ${countLayersByType(layers, 'Conv')}\n`;
    text += `Pooling layers: ${countLayersByType(layers, 'Pool')}\n`;
    text += `Dropout layers: ${countLayersByType(layers, 'Dropout')}\n`;
    text += `Total parameters: ${estimateTotalParameters(layers).toLocaleString()}\n`;
    
    return text;
}

/**
 * Determine the type of model based on its layers
 */
function determineModelType(layers: ModelLayer[]): string {
    if (layers.some(l => l.type.includes('Conv'))) {
        return 'Convolutional Neural Network (CNN)';
    } else if (layers.some(l => l.type === 'LSTM' || l.type === 'GRU' || l.type === 'RNN')) {
        return 'Recurrent Neural Network (RNN)';
    } else if (layers.every(l => l.type === 'Dense' || l.type === 'Dropout' || l.type === 'BatchNormalization')) {
        return 'Multilayer Perceptron (MLP)';
    } else {
        return 'Hybrid Neural Network';
    }
}

/**
 * Count layers by type
 */
function countLayersByType(layers: ModelLayer[], typeSubstring: string): number {
    return layers.filter(l => l.type.toLowerCase().includes(typeSubstring.toLowerCase())).length;
}

/**
 * Estimate parameters for a single layer
 */
function estimateLayerParameters(layer: ModelLayer): number {
    if (layer.type === 'Dense') {
        // Dense layer: (input_units + 1) * output_units
        const inputUnits = layer.inputShape.length > 0 ? layer.inputShape[0] : 0;
        return (inputUnits + 1) * layer.units;
    } else if (layer.type.includes('Conv2D')) {
        // Conv2D layer: kernel_size^2 * input_channels * filters + filters
        const kernelSize = layer.params.kernel_size ? parseInt(layer.params.kernel_size, 10) : 3;
        const inputChannels = layer.inputShape.length > 2 ? layer.inputShape[2] : 1;
        return (kernelSize * kernelSize * inputChannels * layer.units) + layer.units;
    } else if (layer.type === 'BatchNormalization') {
        // BatchNorm: 4 * channels (gamma, beta, moving_mean, moving_variance)
        const channels = layer.inputShape.length > 2 ? layer.inputShape[2] : 
                        layer.inputShape.length > 0 ? layer.inputShape[0] : 0;
        return 4 * channels;
    } else if (layer.type === 'Dropout' || layer.type.includes('Pool')) {
        // No parameters
        return 0;
    } else {
        // Default estimation
        return 0;
    }
}

/**
 * Estimate total parameters for the model
 */
function estimateTotalParameters(layers: ModelLayer[]): number {
    return layers.reduce((total, layer) => total + estimateLayerParameters(layer), 0);
}

// Type definitions
interface ModelLayer {
    id: number;
    name: string;
    type: string;
    params: { [key: string]: string };
    units: number;
    inputShape: number[];
    outputShape: number[];
}

/**
 * Helper function to get a document from a URI or the active editor
 */
async function getDocumentFromUri(uri?: Uri): Promise<vscode.TextDocument | undefined> {
    if (uri) {
        return await workspace.openTextDocument(uri);
    } else {
        const editor = window.activeTextEditor;
        if (!editor) {
            window.showWarningMessage('No active editor found');
            return undefined;
        }
        return editor.document;
    }
}
