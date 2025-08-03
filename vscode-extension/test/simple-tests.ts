import * as assert from 'assert';
import { describe, it } from 'mocha';

// Import utility functions or classes that don't depend on VS Code APIs
// For example, parser functions, validators, etc.

// Simple utility function to test
function validateAILangModel(modelText: string): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  
  // Check for basic syntax
  if (!modelText.includes('model')) {
    errors.push('Missing model declaration');
  }
  
  // Check for opening and closing braces
  const openBraces = (modelText.match(/{/g) || []).length;
  const closeBraces = (modelText.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched braces: ${openBraces} opening vs ${closeBraces} closing`);
  }
  
  // Check for common layer parameters
  if (modelText.includes('Dense(') && !modelText.includes('units=')) {
    errors.push('Dense layer missing required units parameter');
  }
  
  if (modelText.includes('Conv2D(') && !modelText.includes('filters=')) {
    errors.push('Conv2D layer missing required filters parameter');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

describe('AILang Validation Tests', () => {
  describe('Model Validation', () => {
    it('should detect valid models', () => {
      const validModel = 'model TestModel { Dense(units=10) }';
      const result = validateAILangModel(validModel);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });
    
    it('should detect missing model declaration', () => {
      const invalidModel = '{ Dense(units=10) }';
      const result = validateAILangModel(invalidModel);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0], 'Missing model declaration');
    });
    
    it('should detect mismatched braces', () => {
      const invalidModel = 'model TestModel { Dense(units=10)';
      const result = validateAILangModel(invalidModel);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(error => error.includes('Mismatched braces')));
    });
    
    it('should detect missing required parameters', () => {
      const invalidModel = 'model TestModel { Dense() }';
      const result = validateAILangModel(invalidModel);
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(error => error.includes('Dense layer missing required units parameter')));
    });
  });
});

