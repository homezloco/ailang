import * as vscode from 'vscode';

/**
 * Provides folding ranges for AILang files
 */
export class AILangFoldingRangeProvider implements vscode.FoldingRangeProvider {
    /**
     * Provide folding ranges for the given document
     */
    public provideFoldingRanges(
        document: vscode.TextDocument,
        context: vscode.FoldingContext,
        token: vscode.CancellationToken
    ): vscode.FoldingRange[] {
        const ranges: vscode.FoldingRange[] = [];
        
        // Track block starts and ends
        let blockStack: number[] = [];
        let inModelBlock = false;
        let layersBlockStart = -1;
        let trainBlockStart = -1;
        
        // Process each line of the document
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            
            // Model block folding
            if (text.match(/model\s+\w+\s*{/)) {
                blockStack.push(i);
                inModelBlock = true;
            } else if (text === '}' && blockStack.length > 0) {
                const startLine = blockStack.pop() as number;
                ranges.push(new vscode.FoldingRange(startLine, i, vscode.FoldingRangeKind.Region));
                inModelBlock = blockStack.length > 0;
            }
            
            // Layers section folding
            if (text === 'layers:') {
                layersBlockStart = i;
            } else if (layersBlockStart !== -1 && (text === 'train:' || text === '}')) {
                ranges.push(new vscode.FoldingRange(layersBlockStart, i - 1, vscode.FoldingRangeKind.Region));
                layersBlockStart = -1;
            }
            
            // Training section folding
            if (text === 'train:') {
                trainBlockStart = i;
            } else if (trainBlockStart !== -1 && text === '}') {
                ranges.push(new vscode.FoldingRange(trainBlockStart, i - 1, vscode.FoldingRangeKind.Region));
                trainBlockStart = -1;
            }
            
            // Indentation-based folding for layer groups
            if (inModelBlock && text.startsWith('-') && !text.endsWith(':')) {
                const indentLevel = line.firstNonWhitespaceCharacterIndex;
                let endLine = i;
                
                // Look ahead to find the end of this layer group
                for (let j = i + 1; j < document.lineCount; j++) {
                    const nextLine = document.lineAt(j);
                    const nextIndent = nextLine.firstNonWhitespaceCharacterIndex;
                    const nextText = nextLine.text.trim();
                    
                    if (nextText === '' || nextText === '}' || nextText === 'train:') {
                        break;
                    }
                    
                    if (nextText.startsWith('-') && nextIndent <= indentLevel) {
                        break;
                    }
                    
                    endLine = j;
                }
                
                if (endLine > i) {
                    ranges.push(new vscode.FoldingRange(i, endLine, vscode.FoldingRangeKind.Region));
                }
            }
            
            // Data augmentation section folding
            if (text === 'data_augmentation:') {
                const startLine = i;
                let endLine = i;
                
                // Look ahead to find the end of the data augmentation section
                for (let j = i + 1; j < document.lineCount; j++) {
                    const nextLine = document.lineAt(j);
                    const nextText = nextLine.text.trim();
                    
                    if (nextText === '' || nextText === '}' || nextText.match(/^\w+:/)) {
                        break;
                    }
                    
                    endLine = j;
                }
                
                if (endLine > startLine) {
                    ranges.push(new vscode.FoldingRange(startLine, endLine, vscode.FoldingRangeKind.Region));
                }
            }
            
            // Callbacks section folding
            if (text === 'callbacks:') {
                const startLine = i;
                let endLine = i;
                
                // Look ahead to find the end of the callbacks section
                for (let j = i + 1; j < document.lineCount; j++) {
                    const nextLine = document.lineAt(j);
                    const nextText = nextLine.text.trim();
                    
                    if (nextText === '' || nextText === '}' || nextText.match(/^\w+:/)) {
                        break;
                    }
                    
                    endLine = j;
                }
                
                if (endLine > startLine) {
                    ranges.push(new vscode.FoldingRange(startLine, endLine, vscode.FoldingRangeKind.Region));
                }
            }
        }
        
        return ranges;
    }
}

/**
 * Register the folding range provider
 */
export function registerFoldingRangeProvider(context: vscode.ExtensionContext): void {
    const foldingRangeProvider = new AILangFoldingRangeProvider();
    
    // Register the provider for AILang files
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(
            { language: 'ailang', scheme: 'file' },
            foldingRangeProvider
        )
    );
    
    console.log('AILang folding range provider registered');
}
