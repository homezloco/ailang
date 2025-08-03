import * as vscode from 'vscode';
import { TextDocument, Range, TextEdit, Position } from 'vscode';

export class AILangFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private indentSize: number = 2;
    private maxLineLength: number = 100;
    private insertFinalNewline: boolean = true;
    private trimTrailingWhitespace: boolean = true;
    private config: vscode.WorkspaceConfiguration;
    
    constructor() {
        // Initialize with configuration
        this.updateConfiguration();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ailang.format')) {
                this.updateConfiguration();
                console.log('Formatter configuration updated');
            }
        });
    }
    
    private updateConfiguration(): void {
        this.config = vscode.workspace.getConfiguration('ailang');
        const formatConfig = this.config.get<{
            enable: boolean;
            indentSize: number;
            insertFinalNewline: boolean;
            trimTrailingWhitespace: boolean;
        }>('format', {
            enable: true,
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
        });
        
        this.indentSize = formatConfig.indentSize;
        this.insertFinalNewline = formatConfig.insertFinalNewline;
        this.trimTrailingWhitespace = formatConfig.trimTrailingWhitespace;
    }

    public provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        console.log(`Formatting document: ${document.fileName}, Language ID: ${document.languageId}`);
        // Format the document even if language ID is not 'ailang' but has .ail extension
        if (document.fileName.endsWith('.ail') || document.languageId === 'ailang') {
            return this.formatDocument(document);
        }
        console.log('Document not eligible for AILang formatting');
        return [];
    }

    public provideDocumentRangeFormattingEdits(document: TextDocument, range: Range): TextEdit[] {
        return this.formatDocument(document, range);
    }

    private formatDocument(document: TextDocument, range?: Range): TextEdit[] {
        // Check if formatting is enabled in settings
        const formatConfig = this.config.get<{ enable: boolean }>('format', { enable: true });
        if (!formatConfig.enable) {
            console.log('Formatting disabled by configuration');
            return [];
        }
        
        const text = document.getText(range);
        const lines = text.split('\n');
        const formattedLines: string[] = [];
        let indentLevel = 0;
        let inMultiLineComment = false;
        let inBlock = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Apply trim trailing whitespace if enabled
            if (this.trimTrailingWhitespace) {
                line = line.trimEnd();
            }
            
            // Skip empty lines but preserve them
            if (line.trim() === '') {
                formattedLines.push('');
                continue;
            }

            // Handle multi-line comments
            if (line.includes('/*')) {
                inMultiLineComment = true;
            }
            if (inMultiLineComment) {
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + line);
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            // Handle block opening/closing
            if (line.endsWith('{')) {
                line = line.slice(0, -1).trimEnd();
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + line);
                indentLevel++;
                formattedLines.push(' '.repeat(this.indentSize * (indentLevel - 1)) + '{');
                inBlock = true;
                continue;
            }

            // Handle block closing
            if (line.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + line);
                inBlock = false;
                continue;
            }

            // Format regular lines
            if (inBlock) {
                line = ' '.repeat(this.indentSize * indentLevel) + line;
            }
            
            // Handle line length
            if (line.length > this.maxLineLength) {
                line = this.breakLongLine(line, indentLevel);
            }

            formattedLines.push(line);
        }
        
        // Add final newline if enabled
        if (this.insertFinalNewline && formattedLines[formattedLines.length - 1] !== '') {
            formattedLines.push('');
        }

        const fullRange = range || 
            new Range(
                new Position(0, 0),
                document.positionAt(document.getText().length)
            );

        return [TextEdit.replace(fullRange, formattedLines.join('\n'))];
    }

    private breakLongLine(line: string, indentLevel: number): string {
        // Simple line breaking logic - can be enhanced with more sophisticated rules
        const indent = ' '.repeat(this.indentSize * indentLevel);
        const parts = [];
        let current = '';
        
        for (const token of line.split(' ')) {
            if ((current + ' ' + token).length > this.maxLineLength) {
                parts.push(current);
                current = indent + token;
            } else {
                current = current ? current + ' ' + token : token;
            }
        }
        
        if (current) {
            parts.push(current);
        }
        
        return parts.join('\n');
    }
}

// Register the formatter
export function registerFormatter(context: vscode.ExtensionContext) {
    try {
        console.log('Creating AILang formatter instance...');
        const formatter = new AILangFormatter();
        console.log('AILang formatter instance created successfully');
        
        // Register document formatting provider for AILang language ID
        console.log('Registering document formatting provider for AILang...');
        const documentSelector = [
            { scheme: 'file', language: 'ailang' },
            { scheme: 'file', pattern: '**/*.ail' }
        ];
        
        // Register document formatting provider
        const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
            documentSelector, 
            formatter
        );
        context.subscriptions.push(formattingProvider);
        
        // Register range formatting provider
        const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider(
            documentSelector, 
            formatter
        );
        context.subscriptions.push(rangeFormattingProvider);
        
        console.log('Document formatting providers registered successfully');
        
        // Register a direct format command that bypasses VS Code's formatter selection
        const formatCommand = vscode.commands.registerCommand('ailang.formatFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No active editor found');
                    return;
                }
                
                const document = editor.document;
                console.log(`Formatting document: ${document.fileName}, Language ID: ${document.languageId}`);
                
                // Apply formatting directly using our formatter
                const edits = formatter.provideDocumentFormattingEdits(document);
                if (edits && edits.length > 0) {
                    const edit = new vscode.WorkspaceEdit();
                    edits.forEach(textEdit => {
                        edit.replace(document.uri, textEdit.range, textEdit.newText);
                    });
                    
                    const success = await vscode.workspace.applyEdit(edit);
                    if (success) {
                        vscode.window.showInformationMessage('AILang document formatted successfully');
                        console.log('Document formatted successfully');
                    } else {
                        vscode.window.showErrorMessage('Failed to apply formatting edits');
                        console.error('Failed to apply formatting edits');
                    }
                } else {
                    vscode.window.showInformationMessage('No formatting changes needed');
                    console.log('No formatting changes needed');
                }
            } catch (error) {
                console.error('Error formatting document:', error);
                vscode.window.showErrorMessage(`Error formatting document: ${error}`);
            }
        });
        context.subscriptions.push(formatCommand);
        
        // Log registration details for debugging
        console.log('Formatter registered with document selectors:', JSON.stringify(documentSelector));
        
        // Log active text editors and their language IDs
        vscode.window.visibleTextEditors.forEach(editor => {
            console.log(`Active editor: ${editor.document.fileName}, Language ID: ${editor.document.languageId}`);
        });
        
        console.log('All formatter registrations completed successfully');
    } catch (error) {
        console.error('Error registering formatter:', error);
        vscode.window.showErrorMessage(`Failed to register AILang formatter: ${error}`);
    }
}
