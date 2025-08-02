""
Tests for the AILang validator.
"""

import unittest
from pathlib import Path
import tempfile
import json

from validators import AILangValidator, validate_ailang


class TestAILangValidator(unittest.TestCase):
    """Test cases for AILang validator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.validator = AILangValidator()
        self.valid_code = """
        model ValidModel:
          input_shape: [28, 28, 1]
          
          layers:
            - type: conv2d
              filters: 32
              kernel_size: [3, 3]
              activation: relu
              
            - type: maxpool2d
              pool_size: [2, 2]
              
            - type: flatten
            
            - type: dense
              units: 10
              activation: softmax
          
          train:
            optimizer: adam
            learning_rate: 0.001
            loss: categorical_crossentropy
            metrics: [accuracy]
            epochs: 10
            batch_size: 32
        """
        
        self.invalid_code = """
        model invalid_model:  # Invalid: model name should be PascalCase
          layers:  # Missing required sections
            - type: simple_rnn  # Deprecated layer type
              units: 32
        """
    
    def test_validate_valid_code(self):
        """Test validation of valid AILang code."""
        is_valid, issues = self.validator.validate(self.valid_code)
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_validate_invalid_code(self):
        """Test validation of invalid AILang code."""
        is_valid, issues = self.validator.validate(self.invalid_code)
        self.assertFalse(is_valid)
        self.assertGreater(len(issues), 0)
        
        # Check that we have the expected error types
        error_codes = {issue["code"] for issue in issues}
        self.assertIn("E1001", error_codes)  # Missing required section
        self.assertIn("E1003", error_codes)  # Invalid model name
        self.assertIn("W1001", error_codes)  # Deprecated layer type
    
    def test_validate_from_file(self):
        """Test validation from a file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.ail', delete=False) as f:
            f.write(self.valid_code)
            file_path = f.name
        
        try:
            is_valid, issues = self.validator.validate("", file_path=file_path)
            self.assertTrue(is_valid)
            self.assertEqual(len(issues), 0)
        finally:
            Path(file_path).unlink()
    
    def test_validate_with_config(self):
        """Test validation with a custom configuration."""
        # Create a temporary config file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({
                "required_sections": ["model", "train", "dataset"],
                "deprecated_constructs": {
                    "layers": ["dense"]  # Mark dense layers as deprecated
                }
            }, f)
            config_path = f.name
        
        try:
            validator = AILangValidator(config_path)
            is_valid, issues = validator.validate(self.valid_code)
            
            # Should be invalid because we require a 'dataset' section
            self.assertFalse(is_valid)
            
            # Should have a warning about using dense layer
            self.assertTrue(any(issue["code"] == "W1001" for issue in issues))
        finally:
            Path(config_path).unlink()
    
    def test_validate_function(self):
        """Test the validate_ailang convenience function."""
        is_valid, issues = validate_ailang(self.valid_code)
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
        
        is_valid, issues = validate_ailang(self.invalid_code)
        self.assertFalse(is_valid)
        self.assertGreater(len(issues), 0)


class TestCLI(unittest.TestCase):
    """Test cases for the command-line interface."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.valid_code = """
        model ValidModel:
          input_shape: [28, 28, 1]
          
          layers:
            - type: conv2d
              filters: 32
              kernel_size: [3, 3]
              activation: relu
          
          train:
            optimizer: adam
            learning_rate: 0.001
            loss: categorical_crossentropy
        """
        
        # Create a temporary file with valid code
        self.valid_file = tempfile.NamedTemporaryFile(mode='w', suffix='.ail', delete=False)
        self.valid_file.write(self.valid_code)
        self.valid_file.close()
        
        # Create a temporary file with invalid code
        self.invalid_file = tempfile.NamedTemporaryFile(mode='w', suffix='.ail', delete=False)
        self.invalid_file.write("model invalid_model:\n  layers: []")
        self.invalid_file.close()
    
    def tearDown(self):
        """Clean up test fixtures."""
        Path(self.valid_file.name).unlink()
        Path(self.invalid_file.name).unlink()
    
    def test_validate_files_valid(self):
        """Test validation of valid files."""
        from validators.cli import validate_files
        
        exit_code = validate_files(
            [self.valid_file.name],
            output_format="text"
        )
        
        self.assertEqual(exit_code, 0)
    
    def test_validate_files_invalid(self):
        """Test validation of invalid files."""
        from validators.cli import validate_files
        
        exit_code = validate_files(
            [self.invalid_file.name],
            output_format="text"
        )
        
        self.assertEqual(exit_code, 1)
    
    def test_validate_files_json_output(self):
        """Test JSON output format."""
        from validators.cli import validate_files
        import io
        
        output = io.StringIO()
        exit_code = validate_files(
            [self.invalid_file.name],
            output_format="json",
            output_file=output
        )
        
        self.assertEqual(exit_code, 1)
        
        # Parse the JSON output
        issues = json.loads(output.getvalue())
        self.assertGreater(len(issues), 0)
        self.assertIn("type", issues[0])
        self.assertIn("message", issues[0])


if __name__ == "__main__":
    unittest.main()
