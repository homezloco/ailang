// Simple script to check language associations in VS Code
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get user settings file path
const settingsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json');

console.log(`Checking VS Code settings at: ${settingsPath}`);

try {
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Check for file associations
    console.log('\nFile associations:');
    if (settings['files.associations']) {
      console.log(JSON.stringify(settings['files.associations'], null, 2));
    } else {
      console.log('No custom file associations found');
    }
    
    // Check for language associations
    console.log('\nLanguage associations:');
    const languageAssociations = Object.keys(settings)
      .filter(key => key.startsWith('files.associations') || key.startsWith('[ailang]') || key.includes('language'));
    
    if (languageAssociations.length > 0) {
      languageAssociations.forEach(key => {
        console.log(`${key}: ${JSON.stringify(settings[key])}`);
      });
    } else {
      console.log('No language-related settings found');
    }
    
    // Check for formatter settings
    console.log('\nFormatter settings:');
    const formatterSettings = Object.keys(settings)
      .filter(key => key.includes('format') || key.includes('editor.default'));
    
    if (formatterSettings.length > 0) {
      formatterSettings.forEach(key => {
        console.log(`${key}: ${JSON.stringify(settings[key])}`);
      });
    } else {
      console.log('No formatter settings found');
    }
  } else {
    console.log('Settings file not found');
  }
} catch (error) {
  console.error('Error reading settings:', error);
}
