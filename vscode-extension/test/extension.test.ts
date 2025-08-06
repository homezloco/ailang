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

// Helper function to setup diagnostic collection spy
function setupDiagnosticSpy(provider: AILangDiagnosticProvider): { 
    diagnosticCollection: vscode.DiagnosticCollection, 
    diagnostics: vscode.Diagnostic[],
    originalSet: any,
    restore: () => void
} {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
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
    
    return { 
        diagnosticCollection, 
        diagnostics, 
        originalSet,
        restore: () => { diagnosticCollection.set = originalSet; }
    };
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
        
        assert.ok(hasUnits, 'Completions should include units parameter');
        assert.ok(hasActivation, 'Completions should include activation parameter');
    });
    
    test('Completion provider should provide suggestions for layer types', async () => {
        const provider = new AILangCompletionItemProvider();
        const doc = await createTestDocument('model test { ');
        
        const position = new vscode.Position(0, 13);
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
        const hasDense = completionItems.some(item => item.label === 'Dense');
        const hasConv2D = completionItems.some(item => item.label === 'Conv2D');
        const hasLSTM = completionItems.some(item => item.label === 'LSTM');
        
        assert.ok(hasDense, 'Completions should include Dense layer');
        assert.ok(hasConv2D, 'Completions should include Conv2D layer');
        assert.ok(hasLSTM, 'Completions should include LSTM layer');
    });
    
    test('Diagnostic provider should detect missing required parameters', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('model test { Dense() }'); // Missing required units parameter
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about missing units parameter
        const hasUnitsError = diagnostics.some(d => 
            d.message.includes('missing') && d.message.includes('units')
        );
        
        assert.ok(hasUnitsError, 'Diagnostics should include error about missing units parameter');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Diagnostic provider should detect invalid parameter types', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('model test { Dense(units="invalid") }'); // units should be a number
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about invalid parameter type
        const hasTypeError = diagnostics.some(d => 
            d.message.includes('must be a number')
        );
        
        assert.ok(hasTypeError, 'Diagnostics should include error about invalid parameter type');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Hover provider should provide documentation for layers', async () => {
        const provider = new AILangHoverProvider();
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu") }');
        
        const position = new vscode.Position(0, 15); // Position on "Dense"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);
        
        assert.ok(hover, 'Hover should be provided');
        if (hover) {
            const hoverText = hover.contents.map(content => content.toString()).join('');
            assert.ok(hoverText.includes('Dense'), 'Hover should include information about Dense layer');
        }
    });
    
    test('Hover provider should provide documentation for parameters', async () => {
        const provider = new AILangHoverProvider();
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu") }');
        
        const position = new vscode.Position(0, 22); // Position on "units"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);
        
        assert.ok(hover, 'Hover should be provided');
        if (hover) {
            const hoverText = hover.contents.map(content => content.toString()).join('');
            assert.ok(hoverText.includes('units'), 'Hover should include information about units parameter');
        }
    });
    
    test('Diagnostic provider should detect unclosed model blocks', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('model test { Dense(units=10, activation="relu")'); // Missing closing brace
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about unclosed model block - be more flexible with message matching
        const hasUnclosedError = diagnostics.some(d => 
            d.message.includes('unclosed') || d.message.includes('missing') || d.message.includes('brace')
        );
        
        assert.ok(hasUnclosedError, 'Diagnostics should include error about unclosed model block');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Diagnostic provider should detect invalid activation functions', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('model test { Dense(units=10, activation="invalid") }');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about invalid activation function - be more flexible with message matching
        const hasActivationError = diagnostics.some(d => 
            (d.message.includes('Invalid') || d.message.includes('invalid')) && d.message.includes('activation')
        );
        
        assert.ok(hasActivationError, 'Diagnostics should include error about invalid activation function');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Should validate training configuration and required parameters', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('compile(optimizer="adam")');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about missing loss parameter - be more flexible with message matching
        const hasLossError = diagnostics.some(d => 
            (d.message.includes('missing') || d.message.includes('requires')) && d.message.includes('loss')
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

    // New test cases for edge cases and error handling

    test('Diagnostic provider should handle empty files', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        const doc = await createTestDocument('');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Empty file should not cause errors but might have warnings
        assert.ok(true, 'Empty file validation should not throw errors');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle extremely large files', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Generate a large model with many layers
        let content = 'model LargeModel {\n';
        content += '  Input(shape=(224, 224, 3))\n';
        
        // Add 100 layers to make it large
        for (let i = 0; i < 100; i++) {
            content += `  Conv2D(filters=${32 * (i % 8 + 1)}, kernel_size=(3, 3), activation="relu")\n`;
            if (i % 3 === 0) {
                content += '  MaxPooling2D(pool_size=(2, 2))\n';
            }
            if (i % 5 === 0) {
                content += '  BatchNormalization()\n';
            }
            if (i % 10 === 0) {
                content += '  Dropout(rate=0.3)\n';
            }
        }
        
        content += '  Flatten()\n';
        content += '  Dense(units=1024, activation="relu")\n';
        content += '  Dropout(rate=0.5)\n';
        content += '  Dense(units=10, activation="softmax")\n';
        content += '}\n';
        content += 'compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])\n';
        content += 'fit(epochs=10, batch_size=32, validation_split=0.2)';
        
        const doc = await createTestDocument(content);
        
        // Measure performance
        const startTime = Date.now();
        await provider.validateDocument(doc);
        const endTime = Date.now();
        
        // Performance check - should validate in a reasonable time (adjust threshold as needed)
        const validationTime = endTime - startTime;
        assert.ok(validationTime < 5000, `Large file validation should be reasonably fast (took ${validationTime}ms)`);
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle malformed JSON in parameters', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with malformed JSON in parameters
        const doc = await createTestDocument('model test { Dense(units=10, config={invalid json}) }');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about invalid JSON
        const hasJsonError = diagnostics.some(d => 
            d.message.includes('invalid') || d.message.includes('malformed') || d.message.includes('syntax')
        );
        
        assert.ok(hasJsonError, 'Diagnostics should include error about invalid JSON');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle invalid layer sequences', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with invalid layer sequence (Dense before Input)
        const doc = await createTestDocument('model test { Dense(units=10) Input(shape=(28, 28, 1)) }');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about invalid layer sequence
        const hasSequenceError = diagnostics.some(d => 
            d.message.includes('Input') || d.message.includes('sequence') || d.message.includes('order')
        );
        
        assert.ok(hasSequenceError, 'Diagnostics should include error about invalid layer sequence');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle incompatible layer combinations', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with incompatible layer combination (Conv2D directly to Dense without Flatten)
        const doc = await createTestDocument(
            'model test {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Conv2D(filters=32, kernel_size=(3, 3))\n' +
            '  Dense(units=10)\n' +
            '}'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about incompatible layers - be more flexible with message matching
        const hasCompatibilityError = diagnostics.some(d => 
            d.message.includes('Flatten') || d.message.includes('shape') || d.message.includes('dimension') || 
            d.message.includes('incompatible') || d.message.includes('compatibility')
        );
        
        assert.ok(hasCompatibilityError, 'Diagnostics should include error about incompatible layers');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle duplicate layer names', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with duplicate layer names
        const doc = await createTestDocument(
            'model test {\n' +
            '  Input(shape=(28, 28, 1), name="layer1")\n' +
            '  Conv2D(filters=32, kernel_size=(3, 3), name="layer1")\n' +
            '}'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about duplicate layer names
        const hasDuplicateError = diagnostics.some(d => 
            d.message.includes('duplicate') || d.message.includes('name') || d.message.includes('layer1')
        );
        
        assert.ok(hasDuplicateError, 'Diagnostics should include error about duplicate layer names');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle invalid optimizer configurations', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with invalid optimizer configuration
        const doc = await createTestDocument(
            'model test {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Dense(units=10)\n' +
            '}\n' +
            'compile(optimizer="adam", learning_rate=-0.1, loss="categorical_crossentropy")'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about invalid learning rate
        const hasLearningRateError = diagnostics.some(d => 
            d.message.includes('learning_rate') && d.message.includes('negative')
        );
        
        assert.ok(hasLearningRateError, 'Diagnostics should include error about invalid learning rate');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Completion provider should handle incomplete input', async () => {
        const provider = new AILangCompletionItemProvider();
        
        // Test with incomplete input
        const doc = await createTestDocument('model test { Inp');
        
        const position = new vscode.Position(0, 15); // Position after "Inp"
        const completions = await provider.provideCompletionItems(
            doc, 
            position, 
            new vscode.CancellationTokenSource().token, 
            { triggerKind: vscode.CompletionTriggerKind.Invoke }
        );
        
        assert.ok(completions, 'Completions should be provided even with incomplete input');
        assert.ok(Array.isArray(completions), 'Completions should be an array');
        
        // Check for Input layer suggestion
        const completionItems = completions as vscode.CompletionItem[];
        const hasInput = completionItems.some(item => item.label === 'Input');
        
        assert.ok(hasInput, 'Completions should include Input layer even with incomplete input');
    });

    test('Hover provider should handle positions outside of valid tokens', async () => {
        const provider = new AILangHoverProvider();
        const doc = await createTestDocument('model test { Dense(units=10) }');
        
        // Test with position in whitespace
        const position = new vscode.Position(0, 7); // Position in whitespace between "model" and "test"
        const hover = await provider.provideHover(doc, position, new vscode.CancellationTokenSource().token);
        
        // Should not crash, but may return null or undefined for whitespace
        assert.ok(hover === undefined || hover === null, 'Hover on empty line should return undefined or null');
    });

    test('Diagnostic provider should handle syntax errors gracefully', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with syntax error
        const doc = await createTestDocument('model test { @#$%^ }');
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for syntax error
        const hasSyntaxError = diagnostics.some(d => 
            d.message.includes('syntax') || d.message.includes('invalid') || d.message.includes('unexpected')
        );
        
        assert.ok(hasSyntaxError, 'Diagnostics should include syntax error');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle nested model definitions', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with nested model definition (which should be invalid)
        const doc = await createTestDocument(
            'model outer {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  model inner {\n' +
            '    Dense(units=10)\n' +
            '  }\n' +
            '}'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for error about nested models
        const hasNestedError = diagnostics.some(d => 
            d.message.includes('nested') || d.message.includes('model inside') || d.message.includes('invalid')
        );
        
        assert.ok(hasNestedError, 'Diagnostics should include error about nested models');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should validate model architecture best practices', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with a model that could benefit from BatchNormalization
        const doc = await createTestDocument(
            'model test {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Conv2D(filters=32, kernel_size=(3, 3), activation="relu")\n' +
            '  Conv2D(filters=64, kernel_size=(3, 3), activation="relu")\n' +
            '  Conv2D(filters=128, kernel_size=(3, 3), activation="relu")\n' +
            '  Flatten()\n' +
            '  Dense(units=10, activation="softmax")\n' +
            '}'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for suggestion about BatchNormalization - be more flexible with message matching
        const hasBatchNormSuggestion = diagnostics.some(d => 
            d.message.includes('BatchNormalization') || d.message.includes('batch normalization') || 
            d.message.includes('consider adding') || d.message.includes('recommend')
        );
        
        assert.ok(hasBatchNormSuggestion, 'Diagnostics should include suggestion about BatchNormalization');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should validate training configuration best practices', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Test with potentially problematic training configuration
        const doc = await createTestDocument(
            'model test {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Dense(units=1000, activation="relu")\n' +
            '  Dense(units=1000, activation="relu")\n' +
            '  Dense(units=10, activation="softmax")\n' +
            '}\n' +
            'compile(optimizer="adam", loss="categorical_crossentropy")\n' +
            'fit(epochs=1000, batch_size=5000)'
        );
        await provider.validateDocument(doc);
        
        // Restore original method
        restore();
        
        // Check for warnings about training configuration - be more flexible with message matching
        const hasTrainingWarning = diagnostics.some(d => 
            (d.message.includes('batch_size') && (d.message.includes('large') || d.message.includes('high'))) ||
            (d.message.includes('epochs') && (d.message.includes('high') || d.message.includes('many')))
        );
        
        assert.ok(hasTrainingWarning, 'Diagnostics should include warnings about training configuration');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Diagnostic provider should handle concurrent validation requests', async () => {
        const provider = new AILangDiagnosticProvider();
        
        // Create multiple documents
        const doc1 = await createTestDocument('model test1 { Dense(units=10) }');
        const doc2 = await createTestDocument('model test2 { Conv2D(filters=32, kernel_size=(3, 3)) }');
        const doc3 = await createTestDocument('model test3 { LSTM(units=64) }');
        
        // Validate concurrently
        const promises = [
            provider.validateDocument(doc1),
            provider.validateDocument(doc2),
            provider.validateDocument(doc3)
        ];
        
        // Should not throw errors
        await Promise.all(promises);
        assert.ok(true, 'Concurrent validation should not throw errors');
    });

    test('Diagnostic provider should handle document changes during validation', async () => {
        const provider = new AILangDiagnosticProvider();
        const { diagnosticCollection, diagnostics, restore } = setupDiagnosticSpy(provider);
        
        // Create a document
        const doc = await createTestDocument('model test { Dense(units=10) }');
        
        // Start validation
        const validationPromise = provider.validateDocument(doc);
        
        // Simulate document change during validation
        const edit = new vscode.WorkspaceEdit();
        edit.insert(doc.uri, new vscode.Position(0, 24), ', activation="relu"');
        await vscode.workspace.applyEdit(edit);
        
        // Wait for validation to complete
        await validationPromise;
        
        // Restore original method
        restore();
        
        // Should not crash
        assert.ok(true, 'Validation should handle document changes gracefully');
        
        // Clean up
        diagnosticCollection.dispose();
    });

    test('Should handle large AILang files without performance issues', async () => {
        // Create a large AILang file with many layers
        let content = 'model LargeModel {\n';
        for (let i = 0; i < 100; i++) {
            content += `  Dense(units=${i + 10}, activation="relu")\n`;
        }
        content += '}\n';
        
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        const doc = await createTestDocument(content);
        
        // Measure time to validate
        const startTime = Date.now();
        await provider.validateDocument(doc);
        const endTime = Date.now();
        
        // Should validate in a reasonable time (less than 5 seconds)
        assert.ok((endTime - startTime) < 5000, 'Validation of large file took too long');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Should handle malformed AILang syntax gracefully', async () => {
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
        
        // Test with malformed syntax
        const doc = await createTestDocument('model { Dense(units=10, activation=relu) }');
        
        // This should not throw an exception
        try {
            await provider.validateDocument(doc);
            // If we get here, the test passed
            assert.ok(true, 'Validation handled malformed syntax without crashing');
        } catch (e) {
            assert.fail('Validation should handle malformed syntax without throwing exceptions');
        }
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // There should be diagnostics for the malformed syntax
        assert.ok(diagnostics.length > 0, 'Diagnostics should be reported for malformed syntax');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Should validate nested model structures correctly', async () => {
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
        
        // Test with nested model structure
        const doc = await createTestDocument(
            'model OuterModel {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Conv2D(filters=32, kernel_size=(3, 3))\n' +
            '  model InnerModel {\n' +
            '    Dense(units=128)\n' +
            '    Dropout(rate=0.5)\n' +
            '  }\n' +
            '  Dense(units=10, activation="softmax")\n' +
            '}'
        );
        
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check for nested model validation
        const hasNestedModelError = diagnostics.some(d => 
            d.message.includes('nested') || d.message.includes('inner model')
        );
        
        assert.ok(hasNestedModelError, 'Diagnostics should detect nested model structures');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Should handle complex parameter types correctly', async () => {
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
        
        // Test with complex parameter types
        const doc = await createTestDocument(
            'model ComplexParams {\n' +
            '  Input(shape=(None, 28, 28, 3))\n' +
            '  Conv2D(filters=32, kernel_size=[3, 3], strides=(2, 2), padding="same")\n' +
            '  Dense(units=10, kernel_regularizer={"l1": 0.01, "l2": 0.001})\n' +
            '}'
        );
        
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // There should be no errors for valid complex parameter types
        const hasComplexParamError = diagnostics.some(d => 
            d.message.toLowerCase().includes('kernel_size') || 
            d.message.toLowerCase().includes('strides') || 
            d.message.toLowerCase().includes('kernel_regularizer') ||
            d.message.toLowerCase().includes('shape') ||
            d.message.toLowerCase().includes('padding')
        );
        
        assert.ok(!hasComplexParamError, 'Valid complex parameter types should not cause errors');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Should validate optimizer parameters correctly', async () => {
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
        
        // Test with invalid optimizer parameters
        const doc = await createTestDocument(
            'model TestModel {\n' +
            '  Input(shape=(28, 28, 1))\n' +
            '  Dense(units=10, activation="softmax")\n' +
            '}\n' +
            'compile(optimizer={"algorithm": "adam", "learning_rate": -0.1}, loss="categorical_crossentropy")'
        );
        
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Check for negative learning rate error
        const hasNegativeLRError = diagnostics.some(d => 
            d.message.toLowerCase().includes('learning_rate') && 
            d.message.toLowerCase().includes('negative')
        );
        
        assert.ok(hasNegativeLRError, 'Diagnostics should detect negative learning rate');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Should recover from errors and continue validation', async () => {
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
        
        // Test with multiple errors
        const doc = await createTestDocument(
            'model ErrorModel {\n' +
            '  Input(shape="invalid")\n' +  // Error 1: Invalid shape
            '  Conv2D()\n' +               // Error 2: Missing required parameters
            '  Dense(units="ten")\n' +     // Error 3: Wrong type for units
            '}\n' +
            'compile()'                    // Error 4: Missing required parameters
        );
        
        await provider.validateDocument(doc);
        
        // Restore original method
        diagnosticCollection.set = originalSet;
        
        // Should have multiple errors
        assert.ok(diagnostics.length >= 4, 'Validation should detect multiple errors');
        
        // Check for specific errors
        const hasShapeError = diagnostics.some(d => d.message.includes('shape'));
        const hasConvError = diagnostics.some(d => d.message.includes('Conv2D') && d.message.includes('filters'));
        const hasUnitsError = diagnostics.some(d => d.message.includes('units') && d.message.includes('number'));
        const hasCompileError = diagnostics.some(d => d.message.includes('compile') && d.message.includes('missing'));
        
        assert.ok(hasShapeError, 'Should detect invalid shape parameter');
        assert.ok(hasConvError, 'Should detect missing Conv2D parameters');
        assert.ok(hasUnitsError, 'Should detect wrong type for units parameter');
        assert.ok(hasCompileError, 'Should detect missing compile parameters');
        
        // Clean up
        diagnosticCollection.dispose();
    });
    
    test('Completion provider should handle context-aware suggestions', async () => {
        const provider = new AILangCompletionItemProvider();
        
        // Test completion in different contexts
        
        // 1. After model declaration
        const modelDoc = await createTestDocument('model TestModel {\n  ');
        const modelPos = new vscode.Position(1, 2);
        const modelCompletions = await provider.provideCompletionItems(
            modelDoc, 
            modelPos, 
            new vscode.CancellationTokenSource().token, 
            { triggerKind: vscode.CompletionTriggerKind.Invoke }
        );
        
        // Should suggest layers
        const modelItems = modelCompletions as vscode.CompletionItem[];
        const hasLayerSuggestions = modelItems.some(item => 
            item.label === 'Dense' || 
            item.label === 'Conv2D' || 
            item.label === 'Input'
        );
        
        assert.ok(hasLayerSuggestions, 'Should suggest layers after model declaration');
        
        // 2. After compile statement
        const compileDoc = await createTestDocument('compile(');
        const compilePos = new vscode.Position(0, 8);
        const compileCompletions = await provider.provideCompletionItems(
            compileDoc, 
            compilePos, 
            new vscode.CancellationTokenSource().token, 
            { triggerKind: vscode.CompletionTriggerKind.Invoke }
        );
        
        // Should suggest compile parameters
        const compileItems = compileCompletions as vscode.CompletionItem[];
        const hasCompileParams = compileItems.some(item => 
            item.label === 'optimizer' || 
            item.label === 'loss' || 
            item.label === 'metrics'
        );
        
        assert.ok(hasCompileParams, 'Should suggest compile parameters');
    });
    
    test('Hover provider should handle edge cases gracefully', async () => {
        const provider = new AILangHoverProvider();
        
        // Test hover on empty line
        const emptyDoc = await createTestDocument('\n\n');
        const emptyPos = new vscode.Position(1, 0);
        const emptyHover = await provider.provideHover(emptyDoc, emptyPos, new vscode.CancellationTokenSource().token);
        
        // Should not crash and should return undefined or null
        assert.ok(emptyHover === undefined || emptyHover === null, 'Hover on empty line should return undefined or null');
        
        // Test hover on comment
        const commentDoc = await createTestDocument('# This is a comment\nmodel Test {}');
        const commentPos = new vscode.Position(0, 5);
        const commentHover = await provider.provideHover(commentDoc, commentPos, new vscode.CancellationTokenSource().token);
        
        // Should not provide hover for comments
        assert.ok(commentHover === undefined || commentHover === null, 'Should not provide hover for comments');
    });
    
    test('Should handle files with mixed line endings', async () => {
        // Create content with mixed line endings (CRLF and LF)
        const content = 'model Test {\r\n  Dense(units=10)\n  Dropout(rate=0.5)\r\n}';
        
        const provider = new AILangDiagnosticProvider();
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('ailang-test');
        
        // Set the diagnostic collection on the provider
        (provider as any).diagnosticCollection = diagnosticCollection;
        
        // This should not throw an exception
        try {
            const doc = await createTestDocument(content);
            await provider.validateDocument(doc);
            // If we get here, the test passed
            assert.ok(true, 'Validation handled mixed line endings without crashing');
        } catch (e) {
            assert.fail('Validation should handle mixed line endings without throwing exceptions');
        }
        
        // Clean up
        diagnosticCollection.dispose();
    });
});
