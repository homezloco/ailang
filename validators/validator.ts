/**
 * AILang Validator
 * 
 * This module provides validation for AILang model definitions, including:
 * - Syntax validation
 * - Semantic analysis
 * - Type checking
 * - Performance suggestions
 * - Security checks
 */

export interface ValidationIssue {
    message: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    code: string;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    relatedIssues?: Omit<ValidationIssue, 'relatedIssues'>[];
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    warnings: ValidationIssue[];
    errors: ValidationIssue[];
    infos: ValidationIssue[];
}

export interface AILangValidatorOptions {
    strict?: boolean;
    checkNamingConventions?: boolean;
    checkDeprecated?: boolean;
    checkPerformance?: boolean;
    checkSecurity?: boolean;
    experimental?: {
        enableAdvancedValidation?: boolean;
        enableTypeChecking?: boolean;
    };
}

export class AILangValidator {
    private options: Required<AILangValidatorOptions>;

    constructor(options: AILangValidatorOptions = {}) {
        this.options = {
            strict: false,
            checkNamingConventions: true,
            checkDeprecated: true,
            checkPerformance: true,
            checkSecurity: true,
            experimental: {
                enableAdvancedValidation: false,
                enableTypeChecking: false,
                ...options.experimental
            },
            ...options
        };
    }

    /**
     * Validate an AILang document
     * @param uri Document URI (for error reporting)
     * @param content Raw document content
     * @param parsed Parsed document (YAML/JSON object)
     */
    validate(uri: string, content: string, parsed: any): ValidationResult {
        const issues: ValidationIssue[] = [];
        
        // Basic structure validation
        if (typeof parsed !== 'object' || parsed === null) {
            return this.createErrorResult('Invalid document: expected an object');
        }

        // Check for required top-level fields
        if (!('model' in parsed)) {
            issues.push(this.createIssue('Missing required "model" section', 'error', 'E1001'));
        }

        // If we have a model, validate its structure
        if (parsed.model) {
            this.validateModel(parsed.model, issues);
        }

        // Check for layers section if present
        if ('layers' in parsed && Array.isArray(parsed.layers)) {
            this.validateLayers(parsed.layers, issues);
        } else if (parsed.model) {
            // Only warn about missing layers if we have a model
            issues.push(this.createIssue('Model has no layers defined', 'warning', 'W1001'));
        }

        // Check training configuration if present
        if ('train' in parsed && typeof parsed.train === 'object') {
            this.validateTrainingConfig(parsed.train, issues);
        }

        // Additional checks based on options
        if (this.options.checkNamingConventions) {
            this.checkNamingConventions(parsed, issues);
        }

        if (this.options.checkDeprecated) {
            this.checkDeprecatedFeatures(parsed, issues);
        }

        if (this.options.checkPerformance) {
            this.checkPerformance(parsed, issues);
        }

        if (this.options.checkSecurity) {
            this.checkSecurity(parsed, issues);
        }

        // Experimental features
        if (this.options.experimental.enableAdvancedValidation) {
            this.runAdvancedValidation(parsed, issues);
        }

        if (this.options.experimental.enableTypeChecking) {
            this.runTypeChecking(parsed, issues);
        }

        // Categorize issues
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');
        const infos = issues.filter(i => i.severity === 'info' || i.severity === 'hint');

        return {
            valid: errors.length === 0,
            issues,
            errors,
            warnings,
            infos
        };
    }

    private validateModel(model: any, issues: ValidationIssue[]) {
        // Check model name format (PascalCase)
        if (typeof model === 'object' && model.name && typeof model.name === 'string') {
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(model.name)) {
                issues.push(this.createIssue(
                    'Model names should use PascalCase',
                    'warning',
                    'W1002',
                    { line: 0, character: 0 } // TODO: Get actual position
                ));
            }
        }
    }

    private validateLayers(layers: any[], issues: ValidationIssue[]) {
        if (!Array.isArray(layers)) return;

        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            if (typeof layer !== 'object' || layer === null) {
                issues.push(this.createIssue(
                    `Layer ${i + 1} is not a valid object`,
                    'error',
                    'E1002'
                ));
                continue;
            }

            if (!layer.type) {
                issues.push(this.createIssue(
                    `Layer ${i + 1} is missing required 'type' field`,
                    'error',
                    'E1003'
                ));
            }

            // Add more layer-specific validation here
        }
    }

    private validateTrainingConfig(config: any, issues: ValidationIssue[]) {
        if (!config) return;

        // Check learning rate
        if (config.learning_rate !== undefined) {
            const lr = parseFloat(config.learning_rate);
            if (isNaN(lr)) {
                issues.push(this.createIssue(
                    'Learning rate must be a number',
                    'error',
                    'E1004'
                ));
            } else if (lr > 0.01) {
                issues.push(this.createIssue(
                    'High learning rate detected. Consider using a smaller value with learning rate scheduling.',
                    'warning',
                    'W1003'
                ));
            } else if (lr < 1e-6) {
                issues.push(this.createIssue(
                    'Very low learning rate. Training may be slow or get stuck.',
                    'warning',
                    'W1004'
                ));
            }
        }

        // Check batch size
        if (config.batch_size !== undefined) {
            const batchSize = parseInt(config.batch_size, 10);
            if (isNaN(batchSize) || batchSize <= 0) {
                issues.push(this.createIssue(
                    'Batch size must be a positive integer',
                    'error',
                    'E1005'
                ));
            } else if (batchSize > 1024) {
                issues.push(this.createIssue(
                    'Large batch size detected. This may cause memory issues.',
                    'warning',
                    'W1005'
                ));
            }
        }
    }

    private checkNamingConventions(doc: any, issues: ValidationIssue[]) {
        // Check naming conventions for models, layers, etc.
        // This is a placeholder - implement actual naming convention checks
    }

    private checkDeprecatedFeatures(doc: any, issues: ValidationIssue[]) {
        // Check for use of deprecated features
        // This is a placeholder - implement actual deprecation checks
    }

    private checkPerformance(doc: any, issues: ValidationIssue[]) {
        // Check for potential performance issues
        // This is a placeholder - implement actual performance checks
    }

    private checkSecurity(doc: any, issues: ValidationIssue[]) {
        // Check for potential security issues
        // This is a placeholder - implement actual security checks
    }

    private runAdvancedValidation(doc: any, issues: ValidationIssue[]) {
        // Run advanced validation rules
        // This is a placeholder - implement advanced validation
    }

    private runTypeChecking(doc: any, issues: ValidationIssue[]) {
        // Run type checking
        // This is a placeholder - implement type checking
    }

    private createIssue(
        message: string,
        severity: ValidationIssue['severity'],
        code: string,
        position?: { line: number; character: number }
    ): ValidationIssue {
        const range = position ? {
            start: position,
            end: { line: position.line, character: position.character + 1 }
        } : undefined;

        return {
            message,
            severity,
            code,
            range
        };
    }

    private createErrorResult(message: string): ValidationResult {
        const issue = this.createIssue(message, 'error', 'E9999');
        return {
            valid: false,
            issues: [issue],
            errors: [issue],
            warnings: [],
            infos: []
        };
    }
}
