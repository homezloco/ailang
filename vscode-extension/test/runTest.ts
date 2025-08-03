import * as path from 'path';
import * as cp from 'child_process';
import { runTests, downloadAndUnzipVSCode } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    // Try to use an existing VS Code installation if available
    let vscodeExecutablePath;
    try {
      // Download VS Code with a timeout to avoid hanging
      console.log('Downloading VS Code for testing...');
      vscodeExecutablePath = await Promise.race([
        downloadAndUnzipVSCode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('VS Code download timeout')), 60000))
      ]);
      console.log('VS Code downloaded successfully');
    } catch (err) {
      console.warn('Failed to download VS Code:', err);
      console.log('Attempting to run tests with existing VS Code installation...');
    }

    // Run the tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
      ...(vscodeExecutablePath ? { vscodeExecutablePath } : {})
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
