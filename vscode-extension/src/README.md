# AILang VS Code Extension Source Code

This directory contains the source code for the AILang VS Code extension, which provides language support for the AILang machine learning language.

## Architecture

The extension follows a standard VS Code extension architecture with the following key components:

- `extension.ts`: Main entry point that activates the extension and registers all providers
- `settingsManager.ts`: Central settings management for all extension components
- `diagnosticProvider.ts`: Provides diagnostics (errors, warnings) for AILang files
- `completionProvider.ts`: Provides code completion suggestions
- `hoverProvider.ts`: Provides hover information for AILang constructs
- `codeActionProvider.ts`: Provides code actions (quick fixes, refactorings)
- `formatter.ts`: Provides code formatting for AILang files

## Settings Manager

The `settingsManager.ts` module provides a centralized way to access user-configurable settings for the extension. It follows the singleton pattern to ensure consistent settings across all components.

### Using the Settings Manager

To use the settings manager in your component:

```typescript
import { getSettingsManager } from './settingsManager';

// Get the settings manager instance
const settingsManager = getSettingsManager();

// Access settings
if (settingsManager.validationEnabled) {
    // Perform validation
}

// Use specific settings
const indentSize = settingsManager.indentSize;
```

### Available Settings

The settings manager provides access to the following setting categories:

#### Validation Settings
- `validationEnabled`: Whether validation is enabled
- `validationStrict`: Whether strict validation is enabled
- `checkNamingConventions`: Whether to check naming conventions
- `checkDeprecated`: Whether to check for deprecated features
- `maxNumberOfProblems`: Maximum number of problems to report
- `maxWarningLevel`: Maximum warning level to report
- `ignorePatterns`: Patterns to ignore during validation

#### Formatting Settings
- `formattingEnabled`: Whether formatting is enabled
- `indentSize`: Number of spaces for indentation
- `insertFinalNewline`: Whether to insert a final newline
- `trimTrailingWhitespace`: Whether to trim trailing whitespace

#### Hover Settings
- `hoverEnabled`: Whether hover information is enabled
- `showExamples`: Whether to show examples in hover information

#### Completion Settings
- `completionEnabled`: Whether code completion is enabled
- `showDocumentation`: Whether to show documentation in completion items

#### Code Action Settings
- `codeActionsEnabled`: Whether code actions are enabled
- `enableQuickFixes`: Whether to enable quick fixes
- `enableRefactoring`: Whether to enable refactoring actions
- `enableModelTransformation`: Whether to enable model transformation actions
- `enableLayerExtraction`: Whether to enable layer extraction actions

#### Visualization Settings
- `visualizationEnabled`: Whether model visualization is enabled
- `autoShowVisualization`: Whether to automatically show visualization
- `visualizationTheme`: Theme for visualization
- `visualizationLayout`: Layout for visualization
- `showLayerDetails`: Whether to show layer details
- `maxDisplayedLayers`: Maximum number of layers to display

#### Performance Settings
- `enableCaching`: Whether to enable caching
- `debounceDelay`: Delay for debouncing operations
- `maxFileSize`: Maximum file size for processing
- `enableBackgroundProcessing`: Whether to enable background processing

#### AI Integration Settings
- `aiSuggestionsEnabled`: Whether AI suggestions are enabled
- `suggestionMode`: How AI suggestions are displayed
- `modelOptimizationSuggestions`: Whether to enable model optimization suggestions
- `hyperparameterSuggestions`: Whether to enable hyperparameter suggestions
- `showExplanations`: Whether to show explanations for AI suggestions

## Best Practices

1. **Always use the settings manager**: Don't access VS Code settings directly. Use the settings manager to ensure consistent behavior.

2. **Check if features are enabled**: Before performing operations, check if the relevant feature is enabled in settings.

3. **Respect user preferences**: Use the settings values to customize your component's behavior.

4. **Handle configuration changes**: The settings manager automatically handles configuration changes, so you don't need to listen for them in your components.

## Example: Integrating with a New Component

```typescript
import * as vscode from 'vscode';
import { getSettingsManager } from './settingsManager';

export class MyNewProvider {
    public provideFeature(): void {
        // Get settings manager
        const settingsManager = getSettingsManager();
        
        // Check if feature is enabled
        if (!settingsManager.myFeatureEnabled) {
            return;
        }
        
        // Use settings to customize behavior
        const option1 = settingsManager.myOption1;
        const option2 = settingsManager.myOption2;
        
        // Implement feature with respect to settings
        // ...
    }
}

export function registerMyNewProvider(context: vscode.ExtensionContext): void {
    try {
        // Check if feature is enabled in settings
        const settingsManager = getSettingsManager();
        if (!settingsManager.myFeatureEnabled) {
            console.log('Feature disabled in settings, skipping registration');
            return;
        }
        
        // Register provider
        const provider = new MyNewProvider();
        context.subscriptions.push(
            vscode.languages.registerSomeProvider(
                { scheme: 'file', language: 'ailang' },
                provider
            )
        );
        
        console.log('Provider registered successfully');
    } catch (error) {
        console.error('Failed to register provider:', error);
        vscode.window.showErrorMessage(`Failed to register provider: ${error}`);
    }
}
```
