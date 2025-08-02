""
AILang Validator Command Line Interface

This module provides a command-line interface for validating AILang code.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional, TextIO, Union

from . import AILangValidator, validate_ailang


def format_issue(issue: dict, show_suggestions: bool = True) -> str:
    """Format an issue as a human-readable string."""
    file_info = f"{issue.get('file', '<string>')}:{issue.get('line', 0)}:{issue.get('col', 0)}"
    
    # Format the message with color codes
    if issue["type"] == "error":
        prefix = "\033[91mERROR\033[0m"  # Red
    else:
        prefix = "\033[93mWARNING\033[0m"  # Yellow
    
    message = f"{file_info}: {prefix} [{issue['code']}] {issue['message']}"
    
    if show_suggestions and "suggestion" in issue:
        message += f"\n    \033[94mSuggestion:\033[0m {issue['suggestion']}"
    
    return message


def validate_files(
    files: List[Union[str, Path]],
    config_path: Optional[Union[str, Path]] = None,
    output_format: str = "text",
    output_file: Optional[TextIO] = None,
    show_suggestions: bool = True,
) -> int:
    """
    Validate one or more AILang files.
    
    Args:
        files: List of file paths to validate
        config_path: Path to configuration file
        output_format: Output format ('text' or 'json')
        output_file: File object to write output to (default: stdout)
        show_suggestions: Whether to include suggestions in the output
        
    Returns:
        Exit code (0 for success, 1 for validation errors, 2 for other errors)
    """
    if output_file is None:
        output_file = sys.stdout
    
    validator = AILangValidator(config_path)
    all_issues = []
    has_errors = False
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
            
            is_valid, issues = validator.validate(code, file_path)
            all_issues.extend(issues)
            
            if not is_valid:
                has_errors = True
                
        except Exception as e:
            print(f"Error processing {file_path}: {str(e)}", file=sys.stderr)
            return 2
    
    # Output results
    if output_format.lower() == "json":
        json.dump(all_issues, output_file, indent=2)
        output_file.write("\n")
    else:
        for issue in all_issues:
            print(format_issue(issue, show_suggestions), file=output_file)
    
    return 1 if has_errors else 0


def main():
    """Run the AILang validator from the command line."""
    parser = argparse.ArgumentParser(
        description="Validate AILang code for syntax and best practices."
    )
    
    parser.add_argument(
        "files",
        nargs="+",
        help="AILang files to validate"
    )
    
    parser.add_argument(
        "--config",
        "-c",
        type=str,
        help="Path to configuration file"
    )
    
    parser.add_argument(
        "--format",
        "-f",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    
    parser.add_argument(
        "--output",
        "-o",
        type=argparse.FileType('w'),
        help="Output file (default: stdout)"
    )
    
    parser.add_argument(
        "--no-suggestions",
        action="store_false",
        dest="show_suggestions",
        help="Don't show suggestions for fixing issues"
    )
    
    parser.add_argument(
        "--version",
        action="store_true",
        help="Show version and exit"
    )
    
    args = parser.parse_args()
    
    if args.version:
        from .. import __version__
        print(f"AILang Validator v{__version__}")
        return 0
    
    try:
        return validate_files(
            files=args.files,
            config_path=args.config,
            output_format=args.format,
            output_file=args.output,
            show_suggestions=args.show_suggestions
        )
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
