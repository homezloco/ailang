import * as path from 'path';
import * as vscode from 'vscode';
import { workspace, ExtensionContext, commands, window, WorkspaceConfiguration, Progress, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, ErrorAction, CloseAction } from 'vscode-languageclient/node';
import { registerFormatter } from './formatter';
import { registerCompletionProvider } from './completionProvider';
import { registerHoverProvider } from './hoverProvider';
import { registerDiagnosticProvider } from './diagnosticProvider';
import { registerCodeActionProvider } from './codeActionProvider';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
    console.log('AILang extension is activating...');
    
    // Show welcome message
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
        const validateCommand = commands.registerCommand('ailang.validateFile', validateCurrentFile);
        const formatCommand = commands.registerCommand('ailang.formatFile', formatCurrentFile);
        
        // Register providers with error handling
        try {
            console.log('Registering hover provider...');
            registerHoverProvider(context);
            console.log('Hover provider registered successfully');
        } catch (error) {
            console.error('Failed to register hover provider:', error);
            window.showErrorMessage(`Failed to register hover provider: ${error}`);
        }
        
        // Add commands to subscriptions
        context.subscriptions.push(
            welcomeCommand,
            validateCommand, 
            formatCommand
        );
        
        // Start the language server
        console.log('Starting language server...');
        startLanguageServer(context, config);
        
        // Show welcome message on first activation
        const isFirstActivation = context.globalState.get('isFirstActivation', true);
        if (isFirstActivation) {
            await showWelcome();
            await context.globalState.update('isFirstActivation', false);
        }
        
        console.log('AILang extension is now active!');
        
        // Register the formatter
        try {
            console.log('Registering formatter...');
            registerFormatter(context);
            console.log('Formatter registered successfully');
        } catch (error) {
            console.error('Failed to register formatter:', error);
        }
        
        // Register the completion provider
        try {
            console.log('Registering completion provider...');
            registerCompletionProvider(context);
            console.log('Completion provider registered successfully');
        } catch (error) {
            console.error('Failed to register completion provider:', error);
        }

        // Register the diagnostic provider
        try {
            console.log('Registering diagnostic provider...');
            registerDiagnosticProvider(context);
            console.log('Diagnostic provider registered successfully');
        } catch (error) {
            console.error('Failed to register diagnostic provider:', error);
        }
        
        // Register the code action provider
        try {
            console.log('Registering code action provider...');
            registerCodeActionProvider(context);
            console.log('Code action provider registered successfully');
        } catch (error) {
            console.error('Failed to register code action provider:', error);
        }
        
        console.log('All providers registered successfully');
        
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
    const editor = window.activeTextEditor;
    if (!editor || !editor.document || editor.document.languageId !== 'ailang') {
        window.showWarningMessage('No active AILang document found');
        return;
    }
    
    // In a real implementation, this would call the formatter
    window.showInformationMessage('Formatting not yet implemented');
}

function startLanguageServer(context: ExtensionContext, config: WorkspaceConfiguration) {
    try {
        console.log('Starting language server setup...');
        
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
