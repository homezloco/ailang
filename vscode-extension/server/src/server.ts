import * as path from 'path';
import { fileURLToPath } from 'url';
import * as vscode from 'vscode';
import { TextDocument as LSPTextDocument, Diagnostic as LSPDiagnostic, DiagnosticSeverity as LSPDiagnosticSeverity, Range as LSPRange, Position as LSPPosition } from 'vscode-languageserver-types';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    Diagnostic,
    DiagnosticSeverity,
    InitializeResult,
    CompletionItem,
    CompletionList,
    Hover,
    MarkupKind,
    TextEdit,
    Connection,
    DidChangeConfigurationParams,
    CompletionParams,
    HoverParams,
    DocumentFormattingParams,
    TextDocumentPositionParams,
    TextDocument,
    TextDocumentChangeEvent,
    Disposable
} from 'vscode-languageserver/node';
import { TextDocument as TextDocumentNode } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';

// Import the validator from a local path (adjust the path as needed)
interface ValidationIssue {
    message: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    code: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    relatedIssues?: Array<{
        message: string;
        range: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    }>;
}

interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    warnings: ValidationIssue[];
    errors: ValidationIssue[];
    infos: ValidationIssue[];
}

// AILangValidator implementation with enhanced validation
class AILangValidator {
    private document: TextDocument | null = null;
    
    validate(uri: string, content: string, parsed: any): ValidationResult {
        const defaultRange = {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 }
        };
        
        const result: ValidationResult = {
            valid: true,
            issues: [],
            warnings: [],
            errors: [],
            infos: []
        };

        // Basic validation logic
        if (!parsed) {
            this.addError(result, 'Invalid AILang document: Could not parse content', defaultRange);
            return result;
        }

        // Check for required model definition
        if (!content.includes('model ')) {
            this.addError(result, 'No model definition found. A valid AILang file must contain a model definition.', defaultRange);
        }

        // Validate model structure
        const modelMatch = content.match(/model\s+(\w+)\s*{([^}]*)}/s);
        if (modelMatch) {
            const modelContent = modelMatch[2];
            
            // Check for input layer
            if (!modelContent.includes('Input(')) {
                this.addWarning(result, 'Model should have an Input layer', this.getLineRange(content, modelMatch.index));
            }
            
            // Check for output layer
            if (!modelContent.includes('Dense(')) {
                this.addWarning(result, 'Model should have at least one Dense layer', this.getLineRange(content, modelMatch.index));
            }
            
            // Check for compilation block
            if (!modelContent.includes('compile(')) {
                this.addWarning(result, 'Model should include a compile() statement with optimizer and loss', this.getLineRange(content, modelMatch.index));
            }
        }

        // Check for common issues
        this.checkForCommonIssues(content, result);

        return result;
    }

    private checkForCommonIssues(content: string, result: ValidationResult) {
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            // Check for TODOs and FIXMEs
            if (line.includes('TODO') || line.includes('FIXME')) {
                this.addInfo(result, 'TODO/FIXME found', {
                    start: { line: index, character: line.indexOf('TODO') },
                    end: { line: index, character: line.indexOf('TODO') + 8 }
                });
            }
            
            // Check for deprecated layers
            const deprecatedLayers = ['SimpleRNN', 'GRU', 'LSTM'];
            deprecatedLayers.forEach(layer => {
                if (line.includes(layer + '(')) {
                    this.addWarning(result, `Consider using newer alternatives to ${layer}`, {
                        start: { line: index, character: line.indexOf(layer) },
                        end: { line: index, character: line.indexOf(layer) + layer.length }
                    });
                }
            });
            
            // Check for potential issues in layer configurations
            if (line.includes('Dense(') && line.includes('units=0')) {
                this.addError(result, 'Dense layer units cannot be 0', {
                    start: { line: index, character: line.indexOf('units=0') },
                    end: { line: index, character: line.indexOf('units=0') + 7 }
                });
            }
        });
    }

    private getLineRange(content: string, position: number = 0) {
        const lines = content.substring(0, position).split('\n');
        const line = Math.max(0, lines.length - 1);
        const character = lines[line] ? lines[line].length : 0;
        return {
            start: { line, character: Math.max(0, character) },
            end: { line, character: Math.max(0, character + 1) }
        };
    }

    private addError(result: ValidationResult, message: string, range: { start: { line: number; character: number }; end: { line: number; character: number } } = this.getDefaultRange()) {
        this.addIssue(result, 'error', message, range);
    }

    private addWarning(result: ValidationResult, message: string, range: { start: { line: number; character: number }; end: { line: number; character: number } } = this.getDefaultRange()) {
        this.addIssue(result, 'warning', message, range);
    }

    private addInfo(result: ValidationResult, message: string, range: { start: { line: number; character: number }; end: { line: number; character: number } } = this.getDefaultRange()) {
        this.addIssue(result, 'info', message, range);
    }

    private addIssue(
        result: ValidationResult,
        severity: 'error' | 'warning' | 'info' | 'hint',
        message: string,
        range: { start: { line: number; character: number }; end: { line: number; character: number } }
    ) {
        const issue: ValidationIssue = {
            message,
            severity,
            code: `validation-${severity}`,
            range
        };

        result.issues.push(issue);
        
        switch (severity) {
            case 'error':
                result.valid = false;
                result.errors.push(issue);
                break;
            case 'warning':
                result.warnings.push(issue);
                break;
            case 'info':
            case 'hint':
                result.infos.push(issue);
                break;
        }
    }

    private getDefaultRange() {
        return {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 }
        };
    }

    public addSyntaxValidation(content: string, diagnostics: LSPDiagnostic[]): void {
        const lines = content.split('\n');
        
        // Check for common syntax errors
        lines.forEach((line, lineIndex) => {
            // Check for unclosed brackets
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                const charIndex = Math.max(0, line.indexOf(openBraces > closeBraces ? '{' : '}'));
                const range = LSPRange.create(
                    LSPPosition.create(lineIndex, charIndex),
                    LSPPosition.create(lineIndex, charIndex + 1)
                );
                
                const diagnostic = LSPDiagnostic.create(
                    range,
                    'Mismatched braces',
                    LSPDiagnosticSeverity.Error,
                    'syntax-error',
                    'ailang'
                );
                diagnostics.push(diagnostic);
            }
            
            // Check for common typos in keywords
            const keywords = ['model', 'input', 'dense', 'conv2d', 'maxpooling2d', 'dropout', 'flatten'];
            keywords.forEach(keyword => {
                const typoRegex = new RegExp(`\\b${keyword.substring(0, 3)}[a-z]*\\b`, 'i');
                const match = typoRegex.exec(line);
                if (match && match[0].toLowerCase() !== keyword) {
                    const range = LSPRange.create(
                        LSPPosition.create(lineIndex, match.index),
                        LSPPosition.create(lineIndex, match.index + match[0].length)
                    );
                    
                    const diagnostic = LSPDiagnostic.create(
                        range,
                        `Did you mean '${keyword}'?`,
                        LSPDiagnosticSeverity.Warning,
                        'possible-typo',
                        'ailang'
                    );
                    diagnostics.push(diagnostic);
                }
            });
        });
    }
}

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocumentNode> = new TextDocuments(TextDocumentNode);

// Cache for document settings and validation results
const documentSettings = new Map<string, Thenable<AILangSettings>>();
const documentValidations = new Map<string, ValidationResult>();

// The workspace folder this server is operating on
let workspaceFolder: string | null = null;

// Configuration settings
interface AILangSettings {
    validation: {
        enable: boolean;
        strict: boolean;
        checkNamingConventions: boolean;
        checkDeprecated: boolean;
        maxNumberOfProblems: number;
        maxWarningLevel: 'none' | 'info' | 'warning' | 'error';
        ignorePatterns: string[];
    };
    format: {
        enable: boolean;
        indentSize: number;
        insertFinalNewline: boolean;
        trimTrailingWhitespace: boolean;
    };
    lint: {
        enable: boolean;
        rules: {
            noUnusedLayers: boolean;
            requireCompile: boolean;
            requireFit: boolean;
        };
    };
    hover: {
        enable: boolean;
        showExamples: boolean;
        showLinks: boolean;
    };
    completion: {
        enable: boolean;
        showDocumentation: boolean;
    };
    trace: {
        server: 'off' | 'messages' | 'verbose';
    };
    path: string | null;
    configPath: string | null;
    experimental: {
        enableAdvancedValidation: boolean;
        enableTypeChecking: boolean;
    };
}

// Default settings
const defaultSettings: AILangSettings = {
    validation: {
        enable: true,
        strict: false,
        checkNamingConventions: true,
        checkDeprecated: true,
        maxNumberOfProblems: 100,
        maxWarningLevel: 'warning',
        ignorePatterns: [],
    },
    format: {
        enable: true,
        indentSize: 2,
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
    },
    lint: {
        enable: true,
        rules: {
            noUnusedLayers: true,
            requireCompile: true,
            requireFit: false,
        },
    },
    hover: {
        enable: true,
        showExamples: true,
        showLinks: true,
    },
    completion: {
        enable: true,
        showDocumentation: true,
    },
    trace: {
        server: 'off'
    },
    path: null,
    configPath: null,
    experimental: {
        enableAdvancedValidation: false,
        enableTypeChecking: false,
    },
};

// Global settings with deep copy of defaults
let globalSettings: AILangSettings = JSON.parse(JSON.stringify(defaultSettings));

// Cache the settings of all open documents
const document2Settings: Map<string, Thenable<AILangSettings>> = new Map();

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;
    workspaceFolder = params.rootPath || null;

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ':']
            },
            // Hover provider
            hoverProvider: true,
            // Document formatting provider
            documentFormattingProvider: true,
            // Document symbol provider
            documentSymbolProvider: true,
            // Workspace symbol provider
            workspaceSymbolProvider: true,
            // Document highlight provider
            documentHighlightProvider: true,
            // Document link provider
            documentLinkProvider: {
                resolveProvider: true
            },
            // Definition provider
            definitionProvider: true,
            // References provider
            referencesProvider: true,
            // Code action provider
            codeActionProvider: true,
            // Rename provider
            renameProvider: true,
            // Execute command provider
            executeCommandProvider: {
                commands: ['ailang.validateFile', 'ailang.formatFile']
            }
        }
    };

    if (workspaceFolder) {
        result.workspace = {
            workspaceFolders: [{
                uri: URI.file(workspaceFolder).toString(),
                name: path.basename(workspaceFolder)
            }]
        };
    }

    return result;
});

// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: CompletionParams): CompletionItem[] => {
    // In a real implementation, this would provide actual completion items
    // based on the AILang language syntax and context
    const completionItems: CompletionItem[] = [
        {
            label: 'model',
            kind: 14, // Keyword
            detail: 'AILang model definition',
            documentation: {
                kind: MarkupKind.Markdown,
                value: 'Define a new AILang model\n\n```ailang\nmodel MyModel:\n  # Model definition here\n```'
            }
        },
        {
            label: 'layers',
            kind: 15, // Snippet
            detail: 'Layers section',
            documentation: 'Define model layers',
            insertText: 'layers:\n  - type: ${1|dense,conv2d,dropout,batch_norm|}\n    ${2:params}\n'
        },
        {
            label: 'train',
            kind: 15, // Snippet
            detail: 'Training configuration',
            documentation: 'Define training parameters',
            insertText: 'train:\n  optimizer: ${1|adam,rmsprop,sgd|}\n  learning_rate: 0.001\n  loss: ${2|categorical_crossentropy,binary_crossentropy,mse|}\n  metrics: [accuracy]\n  epochs: 10\n  batch_size: 32\n'
        }
    ];
    return completionItems;
});

// This handler resolves additional information for the item selected in the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        return item;
    }
);

// Provide hover information
connection.onHover((params: HoverParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    // Get the word at the current position
    const text = document.getText();
    const offset = document.offsetAt(params.position);
    
    // Simple word detection (in a real implementation, use a proper tokenizer)
    const wordMatch = text.slice(0, offset).match(/\b(\w+)\s*$/);
    const word = wordMatch ? wordMatch[1] : '';

    // Provide hover information based on the word
    switch (word.toLowerCase()) {
        case 'model':
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value: '### Model Definition\n\nDefines a new AILang model.\n\n```ailang\nmodel MyModel:\n  # Model definition\n```'
                }
            };
            
        case 'layers':
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value: '### Layers Section\n\nDefines the layers of the neural network.\n\n```ailang\nlayers:\n  - type: dense\n    units: 64\n    activation: relu\n```'
                }
            };
            
        case 'train':
            return {
                contents: {
                    kind: MarkupKind.Markdown,
                    value: '### Training Configuration\n\nDefines training parameters for the model.\n\n```ailang\ntrain:\n  optimizer: adam\n  learning_rate: 0.001\n  loss: categorical_crossentropy\n  metrics: [accuracy]\n  epochs: 10\n  batch_size: 32\n```'
                }
            };
    }

    return null;
});

// Format document
connection.onDocumentFormatting(async (params: DocumentFormattingParams): Promise<TextEdit[]> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    try {
        const settings = await getDocumentSettings(params.textDocument.uri);
        if (!settings.format || !settings.format.enable) {
            return [];
        }

        const text = document.getText();
        const lines = text.split('\n');
        const formattedLines: string[] = [];
        let indentLevel = 0;
        const indentSize = 2;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Trim trailing whitespace if enabled
            if (settings.format.trimTrailingWhitespace) {
                line = line.replace(/\s+$/, '');
            }
            
            // Skip empty lines
            if (line.trim() === '') {
                formattedLines.push('');
                continue;
            }
            
            // Handle indentation
            const trimmedLine = line.trimStart();
            
            // Adjust indent level based on line content
            if (trimmedLine.endsWith(':')) {
                // This is a new block, increase indent for next line
                const currentIndent = ' '.repeat(indentLevel * indentSize);
                formattedLines.push(currentIndent + trimmedLine);
                indentLevel++;
            } else if (trimmedLine.startsWith('-')) {
                // This is a list item, maintain current indent
                const currentIndent = ' '.repeat(indentLevel * indentSize);
                formattedLines.push(currentIndent + trimmedLine);
            } else {
                // This is a property, maintain current indent
                const currentIndent = ' '.repeat(indentLevel * indentSize);
                formattedLines.push(currentIndent + trimmedLine);
                
                // If this is the end of a block, decrease indent for next line
                if (trimmedLine.endsWith(']') || trimmedLine.endsWith('}')) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }
            }
        }
        
        // Ensure final newline if enabled
        let formattedText = formattedLines.join('\n');
        if (settings.format.insertFinalNewline && !formattedText.endsWith('\n')) {
            formattedText += '\n';
        }
        
        return [{
            range: {
                start: { line: 0, character: 0 },
                end: { line: document.lineCount, character: 0 }
            },
            newText: formattedText
        }];
    } catch (error) {
        console.error('Error formatting document:', error);
        return [];
    }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    // Use a small debounce to avoid validating on every keystroke
    const uri = change.document.uri;
    
    // Clear any existing timeout for this document
    const existingTimeout = validationTimeouts.get(uri);
    if (existingTimeout) {
        clearTimeout(existingTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
        validateDocument(change.document);
        validationTimeouts.delete(uri);
    }, 300); // 300ms debounce
    
    validationTimeouts.set(uri, timeout);
});

// Track validation timeouts for debouncing
const validationTimeouts = new Map<string, NodeJS.Timeout>();

// Clean up timeouts when documents are closed
documents.onDidClose(e => {
    const uri = e.document.uri;
    const timeout = validationTimeouts.get(uri);
    if (timeout) {
        clearTimeout(timeout);
        validationTimeouts.delete(uri);
    }
});

// The settings interface describe the server relevant settings part
interface Settings {
    ailang?: Partial<AILangSettings>;
}

// Cache the settings of all open documents
const documentSettingsCache = new Map<string, Thenable<AILangSettings>>();

// The settings have changed. Is sent on server activation as well.
connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    if (change.settings) {
        const settings = change.settings as { ailang?: Partial<AILangSettings> };
        if (settings.ailang) {
            globalSettings = {
                ...defaultSettings,
                ...settings.ailang,
                validation: {
                    ...defaultSettings.validation,
                    ...(settings.ailang.validation || {})
                },
                format: {
                    ...defaultSettings.format,
                    ...(settings.ailang.format || {})
                },
                lint: {
                    ...defaultSettings.lint,
                    ...(settings.ailang.lint || {})
                },
                experimental: {
                    ...defaultSettings.experimental,
                    ...(settings.ailang.experimental || {})
                }
            };
        }
    }

    // Revalidate all open documents
    documents.all().forEach(doc => validateDocument(doc));
});

// Validate an AILang document
const validateDocument = async (textDocument: TextDocument): Promise<void> => {
    try {
        const settings = await getDocumentSettings(textDocument.uri);
        if (!settings.validation.enable) {
            // Don't validate if validation is disabled
            return;
        }

        const text = textDocument.getText();
        const validator = new AILangValidator();
        const diagnostics: LSPDiagnostic[] = [];
        
        // Check for empty file
        if (text.trim().length === 0) {
            diagnostics.push({
                severity: DiagnosticSeverity.Warning,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                },
                message: 'Empty AILang file',
                source: 'ailang',
                code: 'empty-file'
            });
            
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics
            });
            return;
        }
        
        // Check for model definition
        if (!text.includes('model ')) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                },
                message: 'No model definition found. A valid AILang file must contain a model definition.',
                source: 'ailang',
                code: 'no-model-definition'
            });
            
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics
            });
        }
        
        try {
            // Parse using the AILang parser (simplified for now)
            const validationResult = validator.validate(textDocument.uri, text, { parsed: true });
            
            // Convert validation issues to diagnostics
            validationResult.issues.forEach(issue => {
                diagnostics.push({
                    severity: mapSeverity(issue.severity),
                    range: issue.range,
                    message: issue.message,
                    source: 'ailang',
                    code: issue.code,
                    relatedInformation: issue.relatedIssues?.map(related => ({
                        message: related.message,
                        location: {
                            uri: textDocument.uri,
                            range: related.range
                        }
                    }))
                });
            });
            
            // Add syntax validation
            validator.addSyntaxValidation(text, diagnostics);
            
            // Limit the number of diagnostics
            const maxProblems = settings.validation?.maxNumberOfProblems || 100;
            if (diagnostics.length > maxProblems) {
                diagnostics.length = maxProblems;
            }
            
        } catch (error) {
            // Handle parsing errors
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                },
                message: `Failed to parse AILang: ${errorMessage}`,
                source: 'ailang',
                code: 'parse-error'
            });
        }
        
        // Send the diagnostics to the client
        connection.sendDiagnostics({
            uri: textDocument.uri,
            diagnostics
        });
    } catch (error) {
        console.error('Error validating document:', error);
    }
}

// Helper function to map severity strings to DiagnosticSeverity
function mapSeverity(severity: string): DiagnosticSeverity {
    switch (severity.toLowerCase()) {
        case 'error': return DiagnosticSeverity.Error;
        case 'warning': return DiagnosticSeverity.Warning;
        case 'info': return DiagnosticSeverity.Information;
        case 'hint': return DiagnosticSeverity.Hint;
        default: return DiagnosticSeverity.Error;
    }
}

// Get document-specific settings with fallback to global settings
async function getDocumentSettings(resource: string): Promise<AILangSettings> {
    if (!hasConfigurationCapability) {
        return globalSettings;
    }
    
    let settingsPromise = documentSettings.get(resource);
    if (!settingsPromise) {
        settingsPromise = (async () => {
            try {
                const config = await connection.workspace.getConfiguration({
                    scopeUri: resource,
                    section: 'ailang'
                });
                
                // Merge with defaults
                const mergedSettings: AILangSettings = {
                    ...defaultSettings,
                    ...config,
                    validation: {
                        ...defaultSettings.validation,
                        ...(config?.validation || {})
                    },
                    format: {
                        ...defaultSettings.format,
                        ...(config?.format || {})
                    },
                    lint: {
                        ...defaultSettings.lint,
                        ...(config?.lint || {})
                    },
                    experimental: {
                        ...defaultSettings.experimental,
                        ...(config?.experimental || {})
                    }
                };
                
                return mergedSettings;
            } catch (error) {
                console.error('Error getting document settings:', error);
                return { ...defaultSettings };
            }
        })();
        
        documentSettings.set(resource, settingsPromise);
    }
    
    return settingsPromise;
}

// Clear document cache when a document is closed
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
    documentValidations.delete(e.document.uri);
});

// Configuration change handler
connection.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
    if (change.settings) {
        // Update global settings
        globalSettings = {
            ...defaultSettings,
            ...(change.settings.ailang || {})
        };
        
        // Revalidate all open documents
        documents.all().forEach(validateDocument);
    }
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// Track if we have the configuration capability
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', ':']
            },
            // Hover provider
            hoverProvider: true,
            // Document formatting provider
            documentFormattingProvider: true,
            // Document symbol provider
            documentSymbolProvider: true,
            // Workspace symbol provider
            workspaceSymbolProvider: true,
            // Document highlight provider
            documentHighlightProvider: true,
            // Document link provider
            documentLinkProvider: {
                resolveProvider: true
            },
            // Definition provider
            definitionProvider: true,
            // References provider
            referencesProvider: true,
            // Code action provider
            codeActionProvider: true,
            // Rename provider
            renameProvider: true,
            // Execute command provider
            executeCommandProvider: {
                commands: ['ailang.validateFile', 'ailang.formatFile']
            }
        }
    };

    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }

    return result;
});
