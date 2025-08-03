/// <reference types="node" />
/// <reference types="mocha" />
/// <reference types="assert" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AILangDiagnosticProvider } from '../src/diagnosticProvider';
import { AILangCompletionItemProvider } from '../src/completionProvider';
import { AILangHoverProvider } from '../src/hoverProvider';
import { suite, test, after } from 'mocha';

// Helper function to create a test document with AILang content
async function createTestDocument(content: string): Promise<vscode.TextDocument> {
    return await vscode.workspace.openTextDocument({
        language: 'ailang',
        content
    });
}

// Helper function to create a temporary file with AILang content
async function createTempFile(content: string): Promise<vscode.Uri> {
    // Use process.cwd() instead of __dirname which may not be available
    const tmpDir = path.join(process.cwd(), 'test', 'tmp');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const fileName = `test_${Date.now()}.ail`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, content);
    
    return vscode.Uri.file(filePath);
}

// Helper function to clean up temporary files
function cleanupTempFiles() {
    const tmpDir = path.join(process.cwd(), 'test', 'tmp');
    if (fs.existsSync(tmpDir)) {
        const files = fs.readdirSync(tmpDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(tmpDir, file));
        });
    }
}

suite('AILang Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');
    
    // Clean up temp files after all tests
    after(() => {
        cleanupTempFiles();
    });

    test('Extension should be activated', async () => {
        const extension = vscode.extensions.getExtension('your-publisher.ailang');
        assert.ok(extension, 'Extension should be available');
        await extension?.activate();
        assert.strictEqual(extension?.isActive, true, 'Extension should be active');
    });

    test('Syntax highlighting should work for .ail files', async () => {
        const doc = await createTestDocument('model test { Dense(units=10) }');
        
        const tokens = await vscode.commands.executeCommand('vscode.provideDocumentTokens', doc.uri);
        assert.ok(tokens, 'Tokens should be provided for syntax highlighting');
    });
    
    test('Syntax highlighting should correctly identify AILang keywords', async () => {
        const doc = await createTestDocument(
            'model MyModel {\n' +
            '  Dense(units=64, activation="relu")\n' +
            '  Dropout(rate=0.5)\n' +
            '}\n' +
            'compile(optimizer="adam", loss="categorical_crossentropy")\n' +
            'fit(epochs=10, batch_size=32)'
        );
        
        const tokens = await vscode.commands.executeCommand('vscode.provideDocumentTokens', doc.uri);
        assert.ok(tokens, 'Tokens should be provided for AILang keywords');
    });

    test('Completion provider should provide suggestions for layer parameters', async () => {
        const provider = new AILangCompletionItemProvider();
        const doc = await createTestDocument('model test { Dense(');
        
        const position = new vscode.Position(0, 18);
        const completions = await provider.provideCompletionItems(
            doc, 
            position, 
            new vscode.CancellationTokenSource().token, 
            { triggerKind: vscode.CompletionTriggerKind.Invoke }
        );
        
        assert.ok(completions, 'Completions should be provided');
        assert.ok(Array.isArray(completions), 'Completions should be an array');
        
        // Check for specific completion items
        const completionItems = completions as vscode.CompletionItem[];
        const hasUnits = completionItems.some(item => item.label === 'units');
        const hasActivation = completionItems.some(item => item.label === 'activation');
        
        assert.ok(hasUnits, 'Completions should include "units" parameter');
        assert.ok(hasActivation, 'Completions should include "activation" parameter');
    });
    
    test('Completion provider should provide suggestions for model keywords', async () => {
        const provider = new AILangCompletionItemProvider();
        const doc = await createTestDocument('mod');
        
        const position = new vscode.Position(0, 3);
        const completions = await provider.provideCompletionItems(
            doc, 
            position, 
            new vscode.CancellationTokenSource().token, 
            { triggerKind: vscode.CompletionTriggerKind.Invoke }
        );
        
        assert.ok(completions, 'Completions should be provided');
        
        // Check for model keyword completion
        const completionItems = completions as vscode.CompletionItem[];
        const hasModel = completionItems.some(item => item.label === 'model');
        
        assert.ok(hasModel, 'Completions should include "model" keyword');
    });

    test('Diagnostic provider should detect missing required parameters', async () => {
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Create a spy on the diagnostic collection's set method
        let diagnostics: vscode.Diagnostic[] = [];
        const originalSet = diagnosticCollection.set;
        
        // Use type assertion to handle the overloaded function signature
        (diagnosticCollection as any).set = function(uri: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diags?: vscode.Diagnostic[] | undefined): void {
            if (uri instanceof vscode.Uri && diags !== undefined) {
                diagnostics = diags || [];
            }
            if (diags !== undefined) {
                return originalSet.apply(diagnosticCollection, [uri, diags]);
            } else {
                return originalSet.apply(diagnosticCollection, [uri as [vscode.Uri, vscode.Diagnostic[] | undefined][]]);
            }
        };
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument('model test { Dense() }'); // Missing required units parameter
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check that diagnostics were generated
        assert.ok(diagnostics.length > 0, 'Diagnostics should be generated for missing required parameters');
        
        // Check for specific error message about missing units
        const hasMissingUnitsError = diagnostics.some(d => 
            d.message.includes('missing required parameter') && 
            d.message.includes('units')
        );
        
        assert.ok(hasMissingUnitsError, 'Diagnostics should include error about missing units parameter');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should detect type errors', async () => {
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Create a spy on the diagnostic collection's set method
        let diagnostics: vscode.Diagnostic[] = [];
        const originalSet = diagnosticCollection.set;
        
        // Use type assertion to handle the overloaded function signature
        (diagnosticCollection as any).set = function(uri: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diags?: vscode.Diagnostic[] | undefined): void {
            if (uri instanceof vscode.Uri && diags !== undefined) {
                diagnostics = diags || [];
            }
            if (diags !== undefined) {
                return originalSet.apply(diagnosticCollection, [uri, diags]);
            } else {
                return originalSet.apply(diagnosticCollection, [uri as [vscode.Uri, vscode.Diagnostic[] | undefined][]]);
            }
        };
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument('model test { Dense(units="invalid") }'); // units should be a number
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check that diagnostics were generated
        assert.ok(diagnostics.length > 0, 'Diagnostics should be generated for type errors');
        
        // Check for specific error message about invalid type
        const hasTypeError = diagnostics.some(d => 
            d.message.includes('should be a number')
        );
        
        assert.ok(hasTypeError, 'Diagnostics should include error about invalid parameter type');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Hover provider should provide documentation for layers', async () => {
        const provider = new AILangHoverProvider();
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu") }');
        
        const position = new vscode.Position(0, 15); // Position over "Dense"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);
        
        assert.ok(hover, 'Hover information should be provided');
        if (hover) {
            assert.ok(hover.contents.length > 0, 'Hover should contain content');
            
            // Check that the hover content includes information about Dense layer
            const hoverText = hover.contents.map(content => content.toString()).join('');
            assert.ok(hoverText.includes('Dense'), 'Hover should include information about Dense layer');
        }
    });
    
    test('Hover provider should provide documentation for parameters', async () => {
        const provider = new AILangHoverProvider();
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu") }');
        
        const position = new vscode.Position(0, 22); // Position over "units"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);
        
        assert.ok(hover, 'Hover information should be provided for parameters');
        if (hover) {
            assert.ok(hover.contents.length > 0, 'Hover should contain content');
            
            // Check that the hover content includes information about units parameter
            const hoverText = hover.contents.map(content => content.toString()).join('');
            assert.ok(hoverText.includes('units'), 'Hover should include information about units parameter');
        }
    });

    test('Should validate model structure and detect unclosed models', async () => {
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Create a spy on the diagnostic collection's set method
        let diagnostics: vscode.Diagnostic[] = [];
        const originalSet = diagnosticCollection.set;
        
        // Use type assertion to handle the overloaded function signature
        (diagnosticCollection as any).set = function(uri: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diags?: vscode.Diagnostic[] | undefined): void {
            if (uri instanceof vscode.Uri && diags !== undefined) {
                diagnostics = diags || [];
            }
            if (diags !== undefined) {
                return originalSet.apply(diagnosticCollection, [uri, diags]);
            } else {
                return originalSet.apply(diagnosticCollection, [uri as [vscode.Uri, vscode.Diagnostic[] | undefined][]]);
            }
        };
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu")');
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check for syntax error about unclosed model
        const hasSyntaxError = diagnostics.some(d => 
            d.message.includes('syntax error') || d.message.includes('unclosed model')
        );
        
        assert.ok(hasSyntaxError, 'Diagnostics should include error about unclosed model');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Should validate activation function values', async () => {
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Create a spy on the diagnostic collection's set method
        let diagnostics: vscode.Diagnostic[] = [];
        const originalSet = diagnosticCollection.set;
        
        // Use type assertion to handle the overloaded function signature
        (diagnosticCollection as any).set = function(uri: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diags?: vscode.Diagnostic[] | undefined): void {
            if (uri instanceof vscode.Uri && diags !== undefined) {
                diagnostics = diags || [];
            }
            if (diags !== undefined) {
                return originalSet.apply(diagnosticCollection, [uri, diags]);
            } else {
                return originalSet.apply(diagnosticCollection, [uri as [vscode.Uri, vscode.Diagnostic[] | undefined][]]);
            }
        };
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument('model test { Dense(units=10, activation="invalid_activation") }');
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check for error about invalid activation function
        const hasActivationError = diagnostics.some(d => 
            d.message.includes('Invalid') && d.message.includes('activation')
        );
        
        assert.ok(hasActivationError, 'Diagnostics should include error about invalid activation function');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Should validate training configuration and required parameters', async () => {
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Create a spy on the diagnostic collection's set method
        let diagnostics: vscode.Diagnostic[] = [];
        const originalSet = diagnosticCollection.set;
        
        // Use type assertion to handle the overloaded function signature
        (diagnosticCollection as any).set = function(uri: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diags?: vscode.Diagnostic[] | undefined): void {
            if (uri instanceof vscode.Uri && diags !== undefined) {
                diagnostics = diags || [];
            }
            if (diags !== undefined) {
                return originalSet.apply(diagnosticCollection, [uri, diags]);
            } else {
                return originalSet.apply(diagnosticCollection, [uri as [vscode.Uri, vscode.Diagnostic[] | undefined][]]);
            }
        };
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument('compile(optimizer="adam")');
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check for error about missing loss parameter
        const hasLossError = diagnostics.some(d => 
            d.message.includes('missing') && d.message.includes('loss')
        );
        
        assert.ok(hasLossError, 'Diagnostics should include error about missing loss parameter');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Extension should handle real AILang files', async () => {
        // Create a temporary file with AILang content
        const content = 
            'model CNN {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Conv2D(filters=32, kernel_size=(3, 3), activation="relu")\n' +
            '  MaxPooling2D(pool_size=(2, 2))\n' +
            '  Flatten()\n' +
            '  Dense(units=128, activation="relu")\n' +
            '  Dropout(rate=0.5)\n' +
            '  Dense(units=10, activation="softmax")\n' +
            '}\n' +
            '\n' +
            'compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])\n' +
            'fit(epochs=10, batch_size=32, validation_split=0.2)';
        
        const fileUri = await createTempFile(content);
        
        try {
            // Open the file
            const doc = await vscode.workspace.openTextDocument(fileUri);
            
            // Ensure the language ID is set correctly
            assert.strictEqual(doc.languageId, 'ailang', 'File should be recognized as AILang');
            
            // Validate the document
            const provider = new AILangDiagnosticProvider();
            await provider.validateDocument(doc);
            
            // This is a valid AILang file, so there should be no errors
            // But we can't easily check the diagnostic collection here
            
        } finally {
            // Clean up
            if (fs.existsSync(fileUri.fsPath)) {
                fs.unlinkSync(fileUri.fsPath);
            }
        }
    });
});
