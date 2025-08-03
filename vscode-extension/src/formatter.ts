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
        return this.formatDocument(document);
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
        
        console.log('Registering document formatting provider for AILang...');
        const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider('ailang', formatter);
        context.subscriptions.push(formattingProvider);
        console.log('Document formatting provider registered successfully');
        
        console.log('Registering document range formatting provider for AILang...');
        const rangeFormattingProvider = vscode.languages.registerDocumentRangeFormattingEditProvider('ailang', formatter);
        context.subscriptions.push(rangeFormattingProvider);
        console.log('Document range formatting provider registered successfully');
        
        // Register a command to manually trigger formatting
        console.log('Registering format command...');
        const formatCommand = vscode.commands.registerCommand('ailang.format', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'ailang') {
                vscode.commands.executeCommand('editor.action.formatDocument');
            } else {
                vscode.window.showWarningMessage('No active AILang document found');
            }
        });
        context.subscriptions.push(formatCommand);
        console.log('Format command registered successfully');
        
        console.log('All formatter registrations completed successfully');
    } catch (error) {
        console.error('Error registering formatter:', error);
        vscode.window.showErrorMessage(`Failed to register AILang formatter: ${error}`);
    }
}
