import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { AILangCodeActionProvider } from '../codeActionProvider';
import { getSettingsManager } from '../settingsManager';

suite('AILang Code Action Provider Test Suite', () => {
    let document: vscode.TextDocument;
    let provider: AILangCodeActionProvider;
    const settingsManager = getSettingsManager();

    suiteSetup(async () => {
        // Create a test document
        const testFilePath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'test_code_actions.ail');
        const uri = vscode.Uri.file(testFilePath);
        
        // Create the document with some content
        const content = `model TestModel {
  Input(shape=(28, 28, 1))
  Conv2D(filters=32, kernel_size=(3, 3), activation='relu')
  MaxPooling2D(pool_size=(2, 2))
  Flatten()
  Dense(units=128, activation='relu')
  Dense(units=10, activation='softmax')
}

compile optimizer='adam' loss='categorical_crossentropy' metrics=['accuracy']`;
        
        // Ensure the fixtures directory exists
        const fixturesDir = path.join(__dirname, '..', '..', 'test', 'fixtures');
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(fixturesDir));
        } catch (error) {
            // Directory might already exist, which is fine
        }
        
        const edit = new vscode.WorkspaceEdit();
        edit.createFile(uri, { overwrite: true });
        await vscode.workspace.applyEdit(edit);
        
        const writeEdit = new vscode.WorkspaceEdit();
        writeEdit.insert(uri, new vscode.Position(0, 0), content);
        await vscode.workspace.applyEdit(writeEdit);
        
        document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);
        
        // Create the provider
        provider = new AILangCodeActionProvider();
    });
    
    test('Code actions are enabled when settings allow', async () => {
        // Mock the settings manager to return true for code actions
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => true
        });
        
        // Create a diagnostic to trigger code actions
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            'Test diagnostic',
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'missing-compile';
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [diagnostic],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original setting
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        
        // Verify actions are provided
        assert.ok(actions.length > 0, 'Code actions should be provided when enabled');
    });
    
    test('Code actions are disabled when settings disallow', async () => {
        // Mock the settings manager to return false for code actions
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => false
        });
        
        // Create a diagnostic to trigger code actions
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            'Test diagnostic',
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'missing-compile';
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [diagnostic],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original setting
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        
        // Verify no actions are provided
        assert.strictEqual(actions.length, 0, 'No code actions should be provided when disabled');
    });
    
    test('Quick fix actions respect enableQuickFixes setting', async () => {
        // Mock the settings manager
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        const originalEnableQuickFixes = settingsManager.enableQuickFixes;
        
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableQuickFixes', {
            get: () => false
        });
        
        // Create a diagnostic to trigger quick fix actions
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
            'Test diagnostic',
            vscode.DiagnosticSeverity.Warning
        );
        diagnostic.code = 'missing-input-layer';
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [diagnostic],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original settings
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        Object.defineProperty(settingsManager, 'enableQuickFixes', {
            get: () => originalEnableQuickFixes
        });
        
        // Verify no quick fix actions are provided
        const quickFixes = actions.filter(action => action.kind && action.kind.contains(vscode.CodeActionKind.QuickFix));
        assert.strictEqual(quickFixes.length, 0, 'No quick fix actions should be provided when enableQuickFixes is false');
    });
    
    test('Refactoring actions respect enableRefactoring setting', async () => {
        // Mock the settings manager
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        const originalEnableRefactoring = settingsManager.enableRefactoring;
        
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => false
        });
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original settings
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => originalEnableRefactoring
        });
        
        // Verify no refactoring actions are provided
        const refactorings = actions.filter(action => action.kind && action.kind.contains(vscode.CodeActionKind.Refactor));
        assert.strictEqual(refactorings.length, 0, 'No refactoring actions should be provided when enableRefactoring is false');
    });
    
    test('Model transformation actions respect enableModelTransformation setting', async () => {
        // Mock the settings manager
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        const originalEnableRefactoring = settingsManager.enableRefactoring;
        const originalEnableModelTransformation = settingsManager.enableModelTransformation;
        
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableModelTransformation', {
            get: () => false
        });
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original settings
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => originalEnableRefactoring
        });
        Object.defineProperty(settingsManager, 'enableModelTransformation', {
            get: () => originalEnableModelTransformation
        });
        
        // Verify no model transformation actions are provided
        const transformActions = actions.filter(action => 
            action.title === 'Convert to Sequential model' || 
            action.title === 'Optimize hyperparameters' ||
            action.title === 'Validate model architecture'
        );
        assert.strictEqual(transformActions.length, 0, 'No model transformation actions should be provided when enableModelTransformation is false');
    });
    
    test('Layer extraction actions respect enableLayerExtraction setting', async () => {
        // Mock the settings manager
        const originalCodeActionsEnabled = settingsManager.codeActionsEnabled;
        const originalEnableRefactoring = settingsManager.enableRefactoring;
        const originalEnableLayerExtraction = settingsManager.enableLayerExtraction;
        
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => true
        });
        Object.defineProperty(settingsManager, 'enableLayerExtraction', {
            get: () => false
        });
        
        // Get code actions
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));
        const context: vscode.CodeActionContext = {
            diagnostics: [],
            only: undefined,
            triggerKind: vscode.CodeActionTriggerKind.Automatic
        };
        
        const actions = provider.provideCodeActions(document, range, context, new vscode.CancellationTokenSource().token);
        
        // Restore original settings
        Object.defineProperty(settingsManager, 'codeActionsEnabled', {
            get: () => originalCodeActionsEnabled
        });
        Object.defineProperty(settingsManager, 'enableRefactoring', {
            get: () => originalEnableRefactoring
        });
        Object.defineProperty(settingsManager, 'enableLayerExtraction', {
            get: () => originalEnableLayerExtraction
        });
        
        // Verify no layer extraction actions are provided
        const extractActions = actions.filter(action => action.title === 'Extract layers to new model');
        assert.strictEqual(extractActions.length, 0, 'No layer extraction actions should be provided when enableLayerExtraction is false');
    });
    
    suiteTeardown(async () => {
        // Clean up the test file
        const testFilePath = path.join(__dirname, '..', '..', 'test', 'fixtures', 'test_code_actions.ail');
        const uri = vscode.Uri.file(testFilePath);
        
        try {
            await vscode.workspace.fs.delete(uri);
        } catch (error) {
            console.error('Error cleaning up test file:', error);
        }
    });
});
