import * as vscode from 'vscode';

/**
 * Generates a professional docstring or JSDoc template
 */
function generateDocstring(language: string, name: string, params: string[]): string {
    if (language === 'python') {
        const paramLines = params.map(p => `:param ${p}: DESCRIPTION`).join('\n');
        return `"""${name} description.\n\n${paramLines}${params.length ? '\n' : ''}:return: DESCRIPTION\n"""`;
    } else if (language === 'javascript' || language === 'typescript') {
        const paramLines = params.map(p => ` * @param {any} ${p} DESCRIPTION`).join('\n');
        return `/**\n * ${name} description.\n${paramLines}${params.length ? '\n' : ''} * @returns {any} DESCRIPTION\n */`;
    }
    return '';
}

/**
 * Detects function or class declaration and returns {type, name, params}
 */
function parseFunctionOrClass(line: string, language: string) {
    let funcRegex: RegExp, classRegex: RegExp;

    if (language === 'python') {
        funcRegex = /^\s*def\s+(\w+)\s*\(([^)]*)\)/;
        classRegex = /^\s*class\s+(\w+)/;
    } else {
        funcRegex = /^\s*function\s+(\w+)\s*\(([^)]*)\)/;
        classRegex = /^\s*class\s+(\w+)/;
    }

    const matchFunc = line.match(funcRegex);
    if (matchFunc) {
        const params = matchFunc[2].split(',').map(p => p.trim()).filter(p => p.length > 0);
        return { type: 'function', name: matchFunc[1], params };
    }

    const matchClass = line.match(classRegex);
    if (matchClass) {
        return { type: 'class', name: matchClass[1], params: [] };
    }

    return null;
}

/**
 * Inserts docstring at a specific line
 */
async function insertDocstringAtLine(editor: vscode.TextEditor, lineNumber: number, docstring: string) {
    const lineText = editor.document.lineAt(lineNumber).text;
    const indentMatch = lineText.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';

    await editor.edit(editBuilder => {
        editBuilder.insert(
            new vscode.Position(lineNumber, 0),
            indent + docstring.replace(/\n/g, `\n${indent}`) + '\n'
        );
    });
}

/**
 * Generate docstrings for all functions and classes in the active file
 */
async function generateDocstringsForFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
    }

    const document = editor.document;
    const language = document.languageId;
    const totalLines = document.lineCount;

    // Iterate all lines
    for (let lineNumber = 0; lineNumber < totalLines; lineNumber++) {
        const lineText = document.lineAt(lineNumber).text;
        const parsed = parseFunctionOrClass(lineText, language);
        if (!parsed) continue;

        // Skip if docstring already exists (look 2 lines above)
        let hasDocstring = false;
        for (let i = 0; i <= 2; i++) {
            if (lineNumber - i >= 0) {
                const checkLine = document.lineAt(lineNumber - i).text;
                if (checkLine.includes('"""') || checkLine.includes('/**')) {
                    hasDocstring = true;
                    break;
                }
            }
        }
        if (hasDocstring) continue;

        const docstring = generateDocstring(language, parsed.name, parsed.params);
        await insertDocstringAtLine(editor, lineNumber, docstring);
    }

    vscode.window.showInformationMessage('Docstrings inserted for all functions/classes in file!');
}

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Auto-Doc Generator is now active!');

    const disposable = vscode.commands.registerCommand(
        'auto-doc-generator.generateDocstringForFile',
        generateDocstringsForFile
    );

    context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension
 */
export function deactivate() {}
