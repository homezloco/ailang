import * as vscode from 'vscode';
import { TextDocument, Range, TextEdit, Position } from 'vscode';
import { getSettingsManager } from './settingsManager';

export class AILangFormatter implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {
    private indentSize: number = 2;
    private maxLineLength: number = 100;
    private insertFinalNewline: boolean = true;
    private trimTrailingWhitespace: boolean = true;
    
    constructor() {
        // Initialize with configuration from settings manager
        this.updateConfiguration();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ailang')) {
                this.updateConfiguration();
                console.log('Formatter configuration updated');
            }
        });
    }
    
    private updateConfiguration(): void {
        const settingsManager = getSettingsManager();
        
        this.indentSize = settingsManager.indentSize;
        this.insertFinalNewline = settingsManager.insertFinalNewline;
        this.trimTrailingWhitespace = settingsManager.trimTrailingWhitespace;
        
        console.log(`Formatter settings updated: indentSize=${this.indentSize}, insertFinalNewline=${this.insertFinalNewline}, trimTrailingWhitespace=${this.trimTrailingWhitespace}`);
    }

    public provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
        console.log(`Formatting document: ${document.fileName}, Language ID: ${document.languageId}`);
        
        // Check if formatting is enabled
        const settingsManager = getSettingsManager();
        if (!settingsManager.formattingEnabled) {
            console.log('Formatting disabled by configuration');
            return [];
        }
        
        // Format the document even if language ID is not 'ailang' but has .ail extension
        if (document.fileName.endsWith('.ail') || document.languageId === 'ailang') {
            return this.formatDocument(document);
        }
        console.log('Document not eligible for AILang formatting');
        return [];
    }

    public provideDocumentRangeFormattingEdits(document: TextDocument, range: Range): TextEdit[] {
        // Check if formatting is enabled
        const settingsManager = getSettingsManager();
        if (!settingsManager.formattingEnabled) {
            console.log('Formatting disabled by configuration');
            return [];
        }
        
        return this.formatDocument(document, range);
    }

    private formatDocument(document: TextDocument, range?: Range): TextEdit[] {
        // Check if formatting is enabled
        const settingsManager = getSettingsManager();
        if (!settingsManager.formattingEnabled) {
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

            if (line.trim() === '}') {
                indentLevel = Math.max(0, indentLevel - 1);
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + '}');
                continue;
            }

            // Handle indentation
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
                // Comments keep their indentation
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + trimmedLine);
            } else if (trimmedLine.endsWith(':')) {
                // Section headers
                formattedLines.push(' '.repeat(this.indentSize * indentLevel) + trimmedLine);
            } else {
                // Check if the line is too long and needs to be broken
                if (trimmedLine.length + this.indentSize * indentLevel > this.maxLineLength) {
                    const brokenLine = this.breakLongLine(trimmedLine, indentLevel);
                    formattedLines.push(brokenLine);
                } else {
                    formattedLines.push(' '.repeat(this.indentSize * indentLevel) + trimmedLine);
                }
            }
        }

        // Handle final newline if enabled
        if (this.insertFinalNewline && formattedLines[formattedLines.length - 1] !== '') {
            formattedLines.push('');
        }

        // Create text edits
        const fullRange = range || new Range(
            0, 0,
            document.lineCount - 1,
            document.lineAt(document.lineCount - 1).text.length
        );
        
        return [TextEdit.replace(fullRange, formattedLines.join('\n'))];
    }

    private breakLongLine(line: string, indentLevel: number): string {
        // Simple line breaking for parameters
        if (line.includes('(') && line.includes(')')) {
            const parts = line.split('(');
            const prefix = parts[0];
            const params = parts[1].replace(')', '').split(',');
            
            let result = ' '.repeat(this.indentSize * indentLevel) + prefix + '(';
            for (let i = 0; i < params.length; i++) {
                const param = params[i].trim();
                if (i < params.length - 1) {
                    result += '\n' + ' '.repeat(this.indentSize * (indentLevel + 1)) + param + ',';
                } else {
                    result += '\n' + ' '.repeat(this.indentSize * (indentLevel + 1)) + param;
                }
            }
            result += '\n' + ' '.repeat(this.indentSize * indentLevel) + ')';
            return result;
        }
        
        // Default: just indent
        return ' '.repeat(this.indentSize * indentLevel) + line;
    }
}

// Register the formatter
export function registerFormatter(context: vscode.ExtensionContext): void {
    try {
        console.log('Registering AILang formatter...');
        
        // Check if formatting is enabled in settings
        const settingsManager = getSettingsManager();
        if (!settingsManager.formattingEnabled) {
            console.log('Formatter registration skipped - formatting is disabled in settings');
            return;
        }
        
        // Create formatter instance
        const formatter = new AILangFormatter();
        
        // Define document selectors
        const documentSelector = [
            { language: 'ailang', scheme: 'file' },
            { pattern: '**/*.ail', scheme: 'file' }
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
                
                // Check if formatting is enabled
                if (!settingsManager.formattingEnabled) {
                    vscode.window.showInformationMessage('AILang formatting is disabled in settings');
                    return;
                }
                
                // Check if this is an AILang file by extension or language ID
                const isAILangFile = document.fileName.endsWith('.ail') || document.languageId === 'ailang';
                if (!isAILangFile) {
                    const setLanguage = await vscode.window.showWarningMessage(
                        'This does not appear to be an AILang file. Would you like to set the language to AILang?',
                        'Yes', 'No'
                    );
                    
                    if (setLanguage === 'Yes') {
                        await vscode.commands.executeCommand('setEditorLanguage', { languageId: 'ailang' });
                        console.log('Language ID set to AILang');
                    } else {
                        console.log('User chose not to set language to AILang');
                        return;
                    }
                }
                
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
