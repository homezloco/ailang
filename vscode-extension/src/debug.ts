import * as vscode from 'vscode';

export function logDebugInfo() {
    console.log('=== AILang Debug Information ===');
    
    // Log all registered languages
    console.log('Registered languages:');
    vscode.languages.getLanguages().then(languages => {
        console.log(languages);
        console.log('Is ailang registered:', languages.includes('ailang'));
    });
    
    // Log active editor information
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        console.log('Active editor:');
        console.log('  File:', editor.document.fileName);
        console.log('  Language ID:', editor.document.languageId);
        console.log('  Is AILang:', editor.document.languageId === 'ailang');
    } else {
        console.log('No active editor');
    }
    
    // Log registered formatters
    console.log('Checking for registered formatters...');
    
    // Log extension context
    console.log('Extension activation events:');
    const extension = vscode.extensions.getExtension('ailang');
    if (extension) {
        console.log('  Extension found:', extension.id);
        console.log('  Is active:', extension.isActive);
        console.log('  Activation events:', extension.packageJSON.activationEvents);
    } else {
        console.log('  Extension not found');
    }
}
