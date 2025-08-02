const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the compiled server
const serverPath = path.join(__dirname, '..', 'vscode-extension', 'server', 'out', 'server.js');
const testFile = path.resolve(__dirname, 'fixtures', 'mymodel.ail');

// Verify files exist
if (!fs.existsSync(serverPath)) {
    console.error(`Error: Server not found at ${serverPath}`);
    console.error('Please make sure to build the server first by running:');
    console.error('  cd vscode-extension/server && npm run compile');
    process.exit(1);
}

if (!fs.existsSync(testFile)) {
    console.error(`Error: Test file not found at ${testFile}`);
    process.exit(1);
}

// Read the test file
const fileContent = fs.readFileSync(testFile, 'utf8');
console.log(`Testing with file: ${testFile}`);
console.log('File content:');
console.log('---');
console.log(fileContent);
console.log('---\n');

// Create a mock connection to the language server
console.log(`Starting language server: node ${serverPath} --node-ipc`);
const server = spawn('node', [serverPath, '--node-ipc'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: path.dirname(serverPath)
});

// Buffer to collect server output
let buffer = '';

// Handle server output
server.stdout.on('data', (data) => {
    const str = data.toString();
    buffer += str;
    
    // Try to parse complete messages
    while (true) {
        // Look for Content-Length header
        const contentLengthMatch = buffer.match(/^Content-Length: (\d+)\r\n/);
        if (!contentLengthMatch) break;
        
        const contentLength = parseInt(contentLengthMatch[1], 10);
        const messageStart = buffer.indexOf('\r\n\r\n') + 4;
        
        // If we don't have the complete message yet, wait for more data
        if (buffer.length < messageStart + contentLength) break;
        
        // Extract the message
        const message = buffer.slice(messageStart, messageStart + contentLength);
        buffer = buffer.slice(messageStart + contentLength);
        
        try {
            const parsed = JSON.parse(message);
            console.log('\n[Server Message]', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('\n[Server Raw]', message);
        }
    }
});

// Send initialization request
const initializeRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
        processId: process.pid,
        rootPath: __dirname,
        capabilities: {},
        workspaceFolders: [{
            uri: `file://${__dirname}`,
            name: 'test-workspace'
        }]
    }
};

// Send the initialization request
sendRequest(initializeRequest);

// Send a didOpen notification with our test file
const didOpenNotification = {
    jsonrpc: '2.0',
    method: 'textDocument/didOpen',
    params: {
        textDocument: {
            uri: `file://${testFile}`,
            languageId: 'ailang',
            version: 1,
            text: fileContent
        }
    }
};

// Send the didOpen notification
sendNotification(didOpenNotification);

// Helper function to send a request
function sendRequest(request) {
    const message = `Content-Length: ${JSON.stringify(request).length}\r\n\r\n${JSON.stringify(request)}`;
    server.stdin.write(message, 'utf8');
}

// Helper function to send a notification
function sendNotification(notification) {
    const message = `Content-Length: ${JSON.stringify(notification).length}\r\n\r\n${JSON.stringify(notification)}`;
    server.stdin.write(message, 'utf8');
}

// Handle server exit
server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
});
