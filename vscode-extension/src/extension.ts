import * as path from 'path';
import { workspace, ExtensionContext, commands, window, WorkspaceConfiguration } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
    // Get the configuration
    const config = workspace.getConfiguration('ailang');
    
    // Register commands
    const validateCommand = commands.registerCommand('ailang.validateFile', validateCurrentFile);
    const formatCommand = commands.registerCommand('ailang.formatFile', formatCurrentFile);
    
    context.subscriptions.push(validateCommand, formatCommand);
    
    // Start the language server
    startLanguageServer(context, config);
    
    // Show welcome message
    window.showInformationMessage('AILang extension is now active!');
}

export function deactivate(): Thenable<void> | undefined {
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
            location: window.ProgressLocation.Notification,
            title: 'Validating AILang file',
            cancellable: false
        }, async (progress) => {
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
    } catch (error) {
        window.showErrorMessage(`Validation failed: ${error.message}`);
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
    // The server is implemented in Node.js
    const serverModule = context.asAbsolutePath(
        path.join('server', 'out', 'server.js')
    );
    
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
        }
    };
    
    // Create the language client and start the client
    client = new LanguageClient(
        'ailangLanguageServer',
        'AILang Language Server',
        serverOptions,
        clientOptions
    );
    
    // Start the client and the server
    client.start();
}
