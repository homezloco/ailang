import * as vscode from 'vscode';

/**
 * Class to manage AILang extension settings
 */
export class AILangSettingsManager {
    private static instance: AILangSettingsManager;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('ailang');
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
    }

    /**
     * Get the singleton instance of AILangSettingsManager
     */
    public static getInstance(): AILangSettingsManager {
        if (!AILangSettingsManager.instance) {
            AILangSettingsManager.instance = new AILangSettingsManager();
        }
        return AILangSettingsManager.instance;
    }

    /**
     * Handle configuration changes
     */
    private onConfigurationChanged(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('ailang')) {
            this.config = vscode.workspace.getConfiguration('ailang');
            // Emit an event that settings have changed
            this.notifySettingsChanged();
        }
    }

    /**
     * Notify that settings have changed
     */
    private notifySettingsChanged(): void {
        // You can implement an event emitter here if needed
        console.log('AILang settings changed');
    }

    /**
     * Reload settings from workspace configuration
     */
    public reloadSettings(): void {
        this.config = vscode.workspace.getConfiguration('ailang');
    }

    // Validation settings
    public get validationEnabled(): boolean {
        return this.config.get<boolean>('validation.enable', true);
    }

    public get validationStrict(): boolean {
        return this.config.get<boolean>('validation.strict', false);
    }

    public get checkNamingConventions(): boolean {
        return this.config.get<boolean>('validation.checkNamingConventions', true);
    }

    public get checkDeprecated(): boolean {
        return this.config.get<boolean>('validation.checkDeprecated', true);
    }

    public get maxNumberOfProblems(): number {
        return this.config.get<number>('validation.maxNumberOfProblems', 100);
    }

    public get maxWarningLevel(): string {
        return this.config.get<string>('validation.maxWarningLevel', 'warning');
    }

    public get ignorePatterns(): string[] {
        return this.config.get<string[]>('validation.ignorePatterns', []);
    }

    // Formatting settings
    public get formattingEnabled(): boolean {
        return this.config.get<boolean>('format.enable', true);
    }

    public get indentSize(): number {
        return this.config.get<number>('format.indentSize', 2);
    }

    public get insertFinalNewline(): boolean {
        return this.config.get<boolean>('format.insertFinalNewline', true);
    }

    public get trimTrailingWhitespace(): boolean {
        return this.config.get<boolean>('format.trimTrailingWhitespace', true);
    }

    // Hover settings
    public get hoverEnabled(): boolean {
        return this.config.get<boolean>('hover.enable', true);
    }

    public get showExamples(): boolean {
        return this.config.get<boolean>('hover.showExamples', true);
    }

    // Completion settings
    public get completionEnabled(): boolean {
        return this.config.get<boolean>('completion.enable', true);
    }

    public get showDocumentation(): boolean {
        return this.config.get<boolean>('completion.showDocumentation', true);
    }

    // Server trace settings
    public get traceServer(): string {
        return this.config.get<string>('trace.server', 'off');
    }

    // Path settings
    public get ailangPath(): string | null {
        return this.config.get<string | null>('path', null);
    }

    public get configPath(): string | null {
        return this.config.get<string | null>('configPath', null);
    }

    // Experimental settings
    public get enableAdvancedValidation(): boolean {
        return this.config.get<boolean>('experimental.enableAdvancedValidation', false);
    }

    public get enableTypeChecking(): boolean {
        return this.config.get<boolean>('experimental.enableTypeChecking', false);
    }

    // Visualization settings (new)
    public get visualizationEnabled(): boolean {
        return this.config.get<boolean>('visualization.enable', true);
    }

    public get autoShowVisualization(): boolean {
        return this.config.get<boolean>('visualization.autoShowOnOpen', false);
    }

    public get visualizationTheme(): string {
        return this.config.get<string>('visualization.theme', 'system');
    }

    public get visualizationLayout(): string {
        return this.config.get<string>('visualization.layout', 'auto');
    }

    public get showLayerDetails(): boolean {
        return this.config.get<boolean>('visualization.showLayerDetails', true);
    }

    public get maxDisplayedLayers(): number {
        return this.config.get<number>('visualization.maxDisplayedLayers', 100);
    }

    // Performance settings (new)
    public get enableCaching(): boolean {
        return this.config.get<boolean>('performance.enableCaching', true);
    }

    public get debounceDelay(): number {
        return this.config.get<number>('performance.debounceDelay', 300);
    }

    public get maxFileSize(): number {
        return this.config.get<number>('performance.maxFileSize', 1000000);
    }

    public get enableBackgroundProcessing(): boolean {
        return this.config.get<boolean>('performance.enableBackgroundProcessing', true);
    }

    // AI Integration settings (new)
    public get aiSuggestionsEnabled(): boolean {
        return this.config.get<boolean>('aiIntegration.enableSuggestions', true);
    }

    public get suggestionMode(): string {
        return this.config.get<string>('aiIntegration.suggestionMode', 'inline');
    }

    public get modelOptimizationSuggestions(): boolean {
        return this.config.get<boolean>('aiIntegration.modelOptimizationSuggestions', true);
    }

    public get hyperparameterSuggestions(): boolean {
        return this.config.get<boolean>('aiIntegration.hyperparameterSuggestions', true);
    }

    public get showExplanations(): boolean {
        return this.config.get<boolean>('aiIntegration.showExplanations', true);
    }

    // Code Actions settings (new)
    public get codeActionsEnabled(): boolean {
        return this.config.get<boolean>('codeActions.enable', true);
    }

    public get enableQuickFixes(): boolean {
        return this.config.get<boolean>('codeActions.enableQuickFixes', true);
    }

    public get enableRefactoring(): boolean {
        return this.config.get<boolean>('codeActions.enableRefactoring', true);
    }

    public get enableModelTransformation(): boolean {
        return this.config.get<boolean>('codeActions.enableModelTransformation', true);
    }

    public get enableLayerExtraction(): boolean {
        return this.config.get<boolean>('codeActions.enableLayerExtraction', true);
    }
}

/**
 * Helper function to get the settings manager instance
 */
export function getSettingsManager(): AILangSettingsManager {
    return AILangSettingsManager.getInstance();
}
