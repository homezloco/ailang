import * as path from 'path';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, WorkspaceConfiguration, Progress, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, ErrorAction, CloseAction } from 'vscode-languageclient/node';
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
