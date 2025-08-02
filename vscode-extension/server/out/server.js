"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const vscode_uri_1 = require("vscode-uri");
// AILangValidator implementation
class AILangValidator {
    validate(uri, content, parsed) {
        const result = {
            valid: true,
            issues: [],
            warnings: [],
            errors: [],
            infos: []
        };
        try {
            // Basic validation logic here
            if (typeof parsed !== 'object' || parsed === null) {
                this.addError(result, 'Invalid AILang document: expected an object', {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 1 }
                });
                return result;
            }
            // Add more validation rules as needed
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            this.addError(result, `Validation error: ${errorMessage}`, {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            });
        }
        return result;
    }
    addError(result, message, range) {
        const error = {
            message,
            severity: 'error',
            code: 'E1000',
            range
        };
        result.errors.push(error);
        result.issues.push(error);
        result.valid = false;
    }
}
// Create a connection for the server
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create a simple text document manager
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
// Cache for document settings and validation results
const documentSettings = new Map();
const documentValidations = new Map();
// The workspace folder this server is operating on
let workspaceFolder = null;
// Default settings
const defaultSettings = {
    maxNumberOfProblems: 1000,
    validation: {
        enable: true,
        strict: false,
        checkNamingConventions: true,
        checkDeprecated: true,
        checkPerformance: true,
        checkSecurity: true
    },
    format: {
        enable: true,
        insertFinalNewline: true,
        trimTrailingWhitespace: true
    },
    lint: {
        enable: true,
        maxWarningLevel: 'warning',
        ignorePatterns: []
    },
    experimental: {
        enableAdvancedValidation: false,
        enableTypeChecking: false
    }
};
// Global settings with deep copy of defaults
let globalSettings = JSON.parse(JSON.stringify(defaultSettings));
// Cache the settings of all open documents
const document2Settings = new Map();
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    workspaceFolder = params.rootPath || null;
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
                    uri: vscode_uri_1.URI.file(workspaceFolder).toString(),
                    name: path.basename(workspaceFolder)
                }]
        };
    }
    return result;
});
// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition) => {
    // In a real implementation, this would provide actual completion items
    // based on the AILang language syntax and context
    const completionItems = [
        {
            label: 'model',
            kind: 14,
            detail: 'AILang model definition',
            documentation: {
                kind: node_1.MarkupKind.Markdown,
                value: 'Define a new AILang model\n\n```ailang\nmodel MyModel:\n  # Model definition here\n```'
            }
        },
        {
            label: 'layers',
            kind: 15,
            detail: 'Layers section',
            documentation: 'Define model layers',
            insertText: 'layers:\n  - type: ${1|dense,conv2d,dropout,batch_norm|}\n    ${2:params}\n'
        },
        {
            label: 'train',
            kind: 15,
            detail: 'Training configuration',
            documentation: 'Define training parameters',
            insertText: 'train:\n  optimizer: ${1|adam,rmsprop,sgd|}\n  learning_rate: 0.001\n  loss: ${2|categorical_crossentropy,binary_crossentropy,mse|}\n  metrics: [accuracy]\n  epochs: 10\n  batch_size: 32\n'
        }
    ];
    return completionItems;
});
// This handler resolves additional information for the item selected in the completion list.
connection.onCompletionResolve((item) => {
    return item;
});
// Provide hover information
connection.onHover((params) => {
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
                    kind: node_1.MarkupKind.Markdown,
                    value: '### Model Definition\n\nDefines a new AILang model.\n\n```ailang\nmodel MyModel:\n  # Model definition\n```'
                }
            };
        case 'layers':
            return {
                contents: {
                    kind: node_1.MarkupKind.Markdown,
                    value: '### Layers Section\n\nDefines the layers of the neural network.\n\n```ailang\nlayers:\n  - type: dense\n    units: 64\n    activation: relu\n```'
                }
            };
        case 'train':
            return {
                contents: {
                    kind: node_1.MarkupKind.Markdown,
                    value: '### Training Configuration\n\nDefines training parameters for the model.\n\n```ailang\ntrain:\n  optimizer: adam\n  learning_rate: 0.001\n  loss: categorical_crossentropy\n  metrics: [accuracy]\n  epochs: 10\n  batch_size: 32\n```'
                }
            };
    }
    return null;
});
// Format document
connection.onDocumentFormatting(async (params) => {
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
        const formattedLines = [];
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
            }
            else if (trimmedLine.startsWith('-')) {
                // This is a list item, maintain current indent
                const currentIndent = ' '.repeat(indentLevel * indentSize);
                formattedLines.push(currentIndent + trimmedLine);
            }
            else {
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
    }
    catch (error) {
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
const validationTimeouts = new Map();
// Clean up timeouts when documents are closed
documents.onDidClose(e => {
    const uri = e.document.uri;
    const timeout = validationTimeouts.get(uri);
    if (timeout) {
        clearTimeout(timeout);
        validationTimeouts.delete(uri);
    }
});
// Cache the settings of all open documents
const documentSettingsCache = new Map();
// The settings have changed. Is sent on server activation as well.
connection.onDidChangeConfiguration((change) => {
    if (change.settings) {
        const settings = change.settings;
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
async function validateDocument(textDocument) {
    const diagnostics = [];
    try {
        const settings = await getDocumentSettings(textDocument.uri);
        if (!settings.validation.enable) {
            return;
        }
        const text = textDocument.getText();
        // Parse the document
        let parsed;
        try {
            parsed = yaml.load(text);
        }
        catch (err) {
            // Handle YAML parsing errors
            const error = err;
            const position = error.mark?.position !== undefined
                ? textDocument.positionAt(error.mark.position)
                : { line: 0, character: 0 };
            diagnostics.push({
                severity: node_1.DiagnosticSeverity.Error,
                range: {
                    start: position,
                    end: { line: position.line, character: position.character + 1 }
                },
                message: error.message,
                source: 'ailang',
                code: 'E1001'
            });
            // Send the diagnostics to the client
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics
            });
            return;
        }
        // Validate the document using the AILang validator
        const validator = new AILangValidator();
        const result = validator.validate(textDocument.uri, text, parsed);
        // Store the validation result
        documentValidations.set(textDocument.uri, result);
        // Convert validation issues to diagnostics
        const allIssues = [
            ...(result.errors || []),
            ...(result.warnings || []),
            ...(result.infos || [])
        ];
        const issueDiagnostics = allIssues
            .filter(issue => {
            if (!settings.validation.strict && issue.severity === 'warning') {
                return false;
            }
            return true;
        })
            .map(issue => {
            const severity = mapSeverity(issue.severity);
            const range = issue.range || {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 }
            };
            return {
                severity,
                range,
                message: issue.message,
                source: 'ailang',
                code: issue.code,
                relatedInformation: issue.relatedIssues?.map(ri => ({
                    location: {
                        uri: textDocument.uri,
                        range: ri.range || range
                    },
                    message: ri.message
                }))
            };
        });
        // Limit the number of diagnostics to avoid overwhelming the UI
        const maxDiagnostics = Math.min(settings.maxNumberOfProblems, 1000);
        const limitedDiagnostics = diagnostics.slice(0, maxDiagnostics);
        // Send the diagnostics to the client
        connection.sendDiagnostics({
            uri: textDocument.uri,
            diagnostics: limitedDiagnostics
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error validating document:', errorMessage);
        // Send error diagnostic to the client
        connection.sendDiagnostics({
            uri: textDocument.uri,
            diagnostics: [{
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: 0, character: 1 }
                    },
                    message: `Validation error: ${errorMessage}`,
                    source: 'ailang',
                    code: 'E9999'
                }]
        });
    }
}
// Helper function to map severity strings to DiagnosticSeverity
function mapSeverity(severity) {
    switch (severity.toLowerCase()) {
        case 'error': return node_1.DiagnosticSeverity.Error;
        case 'warning': return node_1.DiagnosticSeverity.Warning;
        case 'info': return node_1.DiagnosticSeverity.Information;
        case 'hint': return node_1.DiagnosticSeverity.Hint;
        default: return node_1.DiagnosticSeverity.Error;
    }
}
// Get document-specific settings with fallback to global settings
async function getDocumentSettings(resource) {
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
                const mergedSettings = {
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
            }
            catch (error) {
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
connection.onDidChangeConfiguration((change) => {
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
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
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
//# sourceMappingURL=server.js.map