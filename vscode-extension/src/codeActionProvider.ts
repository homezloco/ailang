import * as vscode from 'vscode';

/**
 * Provides code actions for AILang files
 */
export class AILangCodeActionProvider {
    private config: vscode.WorkspaceConfiguration;
    
    constructor() {
        // Initialize with configuration
        this.updateConfiguration();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ailang')) {
                this.updateConfiguration();
                console.log('Code action configuration updated');
            }
        });
    }
    
    private updateConfiguration(): void {
        this.config = vscode.workspace.getConfiguration('ailang');
    }
    
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] {
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
        const action = new vscode.CodeAction('Add model template', vscode.CodeActionKind.QuickFix);
        const modelTemplate = 'model MyModel {\n  Input(shape=(28, 28, 1))\n  Flatten()\n  Dense(units=128, activation=\'relu\')\n  Dense(units=10, activation=\'softmax\')\n}\n\ncompile optimizer=\'adam\' loss=\'categorical_crossentropy\' metrics=[\'accuracy\']\n';
        
        action.edit = new vscode.WorkspaceEdit();
        action.edit.insert(document.uri, new vscode.Position(0, 0), modelTemplate);
        action.isPreferred = true;
        action.diagnostics = []; // Link to the diagnostic this fixes
        
        return action;
    }
    
    private createAddCompileAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
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
        const action = new vscode.CodeAction('Add Input layer', vscode.CodeActionKind.QuickFix);
        const inputLayer = '  Input(shape=(28, 28, 1))\n';
        
        // Find the beginning of the model block
        const text = document.getText();
        const modelStartMatch = /{/.exec(text);
        
        action.edit = new vscode.WorkspaceEdit();
        if (modelStartMatch) {
            const position = document.positionAt(modelStartMatch.index + 1);
            action.edit.insert(document.uri, position, '\n' + inputLayer);
        }
        
        action.isPreferred = true;
        
        return action;
    }
    
    private createAddOutputLayerAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction('Add output Dense layer', vscode.CodeActionKind.QuickFix);
        const outputLayer = '  Dense(units=10, activation=\'softmax\')\n';
        
        // Find the end of the model block
        const text = document.getText();
        const modelEndMatch = /}(?![^{]*})/.exec(text);
        
        action.edit = new vscode.WorkspaceEdit();
        if (modelEndMatch) {
            const position = document.positionAt(modelEndMatch.index);
            action.edit.insert(document.uri, position, outputLayer);
        }
        
        action.isPreferred = true;
        
        return action;
    }
    
    private createFixIndentationAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction('Fix indentation', vscode.CodeActionKind.QuickFix);
        
        // Get the current line and its indentation
        const line = document.lineAt(range.start.line);
        const text = line.text;
        const indentSize = this.config.get<{ indentSize: number }>('format', { indentSize: 2 }).indentSize;
        
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
        // Add a general action to add a new layer
        const addLayerAction = new vscode.CodeAction('Add new layer', vscode.CodeActionKind.Refactor);
        addLayerAction.command = {
            title: 'Add new layer',
            command: 'ailang.addLayer',
            arguments: [document.uri, range.start]
        };
        codeActions.push(addLayerAction);
        
        // Add action to convert to sequential model
        const convertToSequentialAction = new vscode.CodeAction('Convert to Sequential model', vscode.CodeActionKind.Refactor);
        convertToSequentialAction.command = {
            title: 'Convert to Sequential model',
            command: 'ailang.convertToSequential',
            arguments: [document.uri]
        };
        codeActions.push(convertToSequentialAction);
    }
}

/**
 * Register the code action provider
 */
export function registerCodeActionProvider(context: vscode.ExtensionContext): void {
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
        })
    );
}
