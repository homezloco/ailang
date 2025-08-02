const net = require('net');
const path = require('path');
const fs = require('fs');

// Configuration
const SERVER_PATH = path.join(__dirname, '..', 'vscode-extension', 'server', 'out', 'server.js');
const TEST_FILE = path.resolve(__dirname, 'fixtures', 'mymodel.ail');

// Verify files exist
if (!fs.existsSync(SERVER_PATH)) {
    console.error(`Error: Server not found at ${SERVER_PATH}`);
    process.exit(1);
}

if (!fs.existsSync(TEST_FILE)) {
    console.error(`Error: Test file not found at ${TEST_FILE}`);
    process.exit(1);
}

// Read the test file
const fileContent = fs.readFileSync(TEST_FILE, 'utf8');
console.log('Testing with file:', TEST_FILE);
console.log('File content:');
console.log('---');
console.log(fileContent);
console.log('---\n');

// Message ID counter
let requestId = 1;

// Create a simple message queue
const messageQueue = [];
let isProcessing = false;

// Function to send a message to the server
function sendMessage(conn, method, params) {
    const message = {
        jsonrpc: '2.0',
        id: method === 'initialize' ? 1 : requestId++,
        method,
        params
    };
    
    const messageStr = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(messageStr, 'utf8')}\r\n\r\n`;
    const data = header + messageStr;
    
    console.log('\nSending message:');
    console.log(JSON.stringify(message, null, 2));
    
    conn.write(data, 'utf8');
}

// Create a connection to the language server
console.log('Starting language server...');
const { spawn } = require('child_process');
const server = spawn('node', [SERVER_PATH, '--stdio'], {
    stdio: ['pipe', 'pipe', 'inherit']
});

// Handle server output
let buffer = '';
server.stdout.on('data', (data) => {
    const str = data.toString();
    console.log('\nReceived data:', JSON.stringify(str));
    buffer += str;
    
    // Process complete messages
    while (true) {
        const contentLengthMatch = buffer.match(/Content-Length: (\d+)\r\n/);
        if (!contentLengthMatch) break;
        
        const contentLength = parseInt(contentLengthMatch[1], 10);
        const messageStart = buffer.indexOf('\r\n\r\n') + 4;
        
        if (buffer.length < messageStart + contentLength) break;
        
        const messageStr = buffer.slice(messageStart, messageStart + contentLength);
        buffer = buffer.slice(messageStart + contentLength);
        
        try {
            const message = JSON.parse(messageStr);
            console.log('\n[Server]', JSON.stringify(message, null, 2));
            
            // Handle initialization response
            if (message.id === 1) {
                console.log('\nSending didOpen notification...');
                sendMessage(server.stdin, 'textDocument/didOpen', {
                    textDocument: {
                        uri: `file://${TEST_FILE}`,
                        languageId: 'ailang',
                        version: 1,
                        text: fileContent
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    }
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

server.on('close', (code) => {
    console.log(`\nServer process exited with code ${code}`);
    process.exit(code);
});

// Start the test by sending initialization
console.log('Sending initialize request...');
sendMessage(server.stdin, 'initialize', {
    processId: process.pid,
    rootPath: path.dirname(TEST_FILE),
    capabilities: {},
    workspaceFolders: [{
        uri: `file://${path.dirname(TEST_FILE)}`,
        name: 'test-workspace'
    }]
});

// Set a timeout to close the connection
setTimeout(() => {
    console.log('\nTest completed.');
    server.stdin.end();
}, 5000);
