"""
AILang Command Line Interface (CLI)

This module provides a command-line interface for the AILang compiler.
"""

import os
import sys
import argparse
import importlib.util
import json
from pathlib import Path
from typing import Optional, List, Dict, Any, Union

# Add the project root to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the compiler components
try:
    from compiler.parser import parse
    from compiler.transpiler.py_transpiler import transpile_to_python
    from compiler.transpiler.cpp_transpiler import transpile_to_cpp
    from compiler.transpiler.js_transpiler import transpile_to_js
    from compiler.file_utils import get_build_manager, BuildManager
except ImportError as e:
    print(f"Error importing compiler modules: {e}")
    print("Make sure you're running from the project root directory.")
    sys.exit(1)

# Supported targets and their file extensions
TARGETS = {
    'python': {'ext': 'py', 'transpiler': transpile_to_python, 'runner': 'python'},
    'cpp': {'ext': 'cpp', 'transpiler': transpile_to_cpp, 'runner': 'g++'},
    'javascript': {'ext': 'js', 'transpiler': transpile_to_js, 'runner': 'node'},
}

# Initialize build manager
build_manager = get_build_manager()

def compile_file(input_path: str, target: str, output_path: Optional[str] = None, 
                clean: bool = False) -> Dict[str, Any]:
    """
    Compile an AILang source file to the specified target language.
    
    Args:
        input_path: Path to the input .ail file
        target: Target language (python, cpp, javascript)
        output_path: Optional output path for the compiled file
        clean: Whether to clean previous builds for this target
        
    Returns:
        Dict containing compilation metadata and output paths
    """
    if target not in TARGETS:
        raise ValueError(f"Unsupported target: {target}. Available targets: {', '.join(TARGETS.keys())}")
    
    # Clean previous build if requested
    if clean:
        build_manager.clean(target=target)
    
    # Read input file
    input_path = Path(input_path).resolve()
    with open(input_path, 'r', encoding='utf-8') as f:
        source = f.read()
    
    # Parse the source code
    try:
        ir = parse(source)
    except Exception as e:
        print(f"Error parsing {input_path}: {e}")
        if hasattr(e, 'line') and hasattr(e, 'column'):
            print(f"  at line {e.line}, column {e.column}")
        sys.exit(1)
    
    # Transpile to target language
    try:
        transpiler = TARGETS[target]['transpiler']
        output = transpiler(ir)
    except Exception as e:
        print(f"Error transpiling to {target}: {e}")
        if hasattr(e, '__traceback__'):
            import traceback
            traceback.print_exc()
        sys.exit(1)
    
    # Prepare metadata
    metadata = {
        'target': target,
        'source_file': str(input_path),
        'source_size': len(source),
        'output_size': len(output),
        'timestamp': str(datetime.datetime.now())
    }
    
    # Write output file using build manager
    if output_path:
        output_path = Path(output_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output)
        metadata['output_path'] = str(output_path)
    else:
        output_path = build_manager.write_compiled_file(
            input_path, target, output, metadata=metadata
        )
        metadata['output_path'] = str(output_path)
    
    # Save build info
    build_info = {
        'status': 'success',
        'metadata': metadata,
        'artifacts': [str(output_path)]
    }
    
    print(f"✅ Successfully compiled {input_path} to {target}")
    print(f"   Output: {output_path}")
    
    return build_info

def run_compiled_file(file_path: str, target: str, args: Optional[List[str]] = None) -> None:
    """
    Execute a compiled file based on its target language.
    
    Args:
        file_path: Path to the compiled file
        target: Target language (python, cpp, javascript)
        args: Additional arguments to pass to the program
    """
    if target not in TARGETS:
        raise ValueError(f"Unsupported target: {target}")
    
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    runner = TARGETS[target]['runner']
    cmd = []
    
    try:
        if target == 'python':
            cmd = [sys.executable, str(file_path)]
        elif target == 'javascript':
            cmd = ['node', str(file_path)]
        elif target == 'cpp':
            # For C++, we need to compile first
            import subprocess
            import tempfile
            
            # Create a temporary directory for the build
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_dir = Path(temp_dir)
                output_path = temp_dir / 'a.out'
                
                # Compile the C++ code
                compile_cmd = [
                    'g++',
                    '-std=c++17',
                    '-I/usr/local/include/eigen3',  # Adjust Eigen path as needed
                    str(file_path),
                    '-o', str(output_path)
                ]
                
                print(f"Compiling C++ code: {' '.join(compile_cmd)}")
                subprocess.run(compile_cmd, check=True)
                
                # Run the compiled binary
                cmd = [str(output_path)]
        
        if args:
            cmd.extend(args)
            
        print(f"Running: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"Error running {file_path}: {e}")
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: {e.filename} not found. Make sure {runner} is installed.")
        sys.exit(1)

def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='AILang Compiler',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Common arguments
    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument('--verbose', '-v', action='count', default=0,
                             help='Increase verbosity (can be used multiple times)')
    
    # Compile command
    compile_parser = subparsers.add_parser(
        'compile', 
        parents=[common_parser],
        help='Compile an AILang file',
        description='Compile an AILang source file to a target language.'
    )
    compile_parser.add_argument('input', help='Input .ail file')
    compile_parser.add_argument('--target', '-t', 
                              choices=sorted(TARGETS.keys()), 
                              default='python',
                              help='Target language')
    compile_parser.add_argument('--output', '-o', 
                              help='Output file path (default: build/obj/<target>/<input>.<ext>)')
    compile_parser.add_argument('--clean', '-c', 
                              action='store_true',
                              help='Clean previous build artifacts for this target')
    compile_parser.add_argument('--list-targets', 
                              action='store_true',
                              help='List available target languages and exit')
    
    # Run command
    run_parser = subparsers.add_parser(
        'run', 
        parents=[common_parser],
        help='Compile and run an AILang file',
        description='Compile and immediately execute an AILang program.'
    )
    run_parser.add_argument('input', help='Input .ail file')
    run_parser.add_argument('--target', '-t', 
                          choices=['python', 'javascript'], 
                          default='python',
                          help='Target language')
    run_parser.add_argument('--clean', '-c', 
                          action='store_true',
                          help='Clean previous build artifacts for this target')
    run_parser.add_argument('args', nargs=argparse.REMAINDER,
                          help='Arguments to pass to the program')
    
    # Clean command
    clean_parser = subparsers.add_parser(
        'clean',
        parents=[common_parser],
        help='Clean build artifacts',
        description='Remove compiled files and build artifacts.'
    )
    clean_parser.add_argument('--target', '-t', 
                            choices=sorted(list(TARGETS.keys()) + ['all']),
                            default='all',
                            help='Target to clean (or "all" for everything)')
    
    # List targets command
    targets_parser = subparsers.add_parser(
        'targets',
        parents=[common_parser],
        help='List available target languages',
        description='List all supported target languages and their properties.'
    )
    
    # Version command
    version_parser = subparsers.add_parser(
        'version',
        parents=[common_parser],
        help='Show version information',
        description='Display version information about AILang.'
    )
    
    # Build info command
    info_parser = subparsers.add_parser(
        'info',
        parents=[common_parser],
        help='Show build information',
        description='Display information about build artifacts.'
    )
    info_parser.add_argument('--json', 
                           action='store_true',
                           help='Output in JSON format')
    info_parser.add_argument('--target', '-t',
                           choices=sorted(list(TARGETS.keys()) + ['all']),
                           default='all',
                           help='Filter by target')
    
    return parser.parse_args()

def setup_logging(verbosity: int) -> None:
    """Configure logging based on verbosity level."""
    import logging
    level = {
        0: logging.WARNING,
        1: logging.INFO,
        2: logging.DEBUG
    }.get(min(verbosity, 2), logging.DEBUG)
    
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )

def print_target_info() -> None:
    """Print information about available targets."""
    print("\nAvailable target languages:")
    print("-" * 50)
    print(f"{'Target':<12} {'Extension':<10} {'Runner':<12} Description")
    print("-" * 50)
    
    for target, info in sorted(TARGETS.items()):
        print(f"{target:<12} .{info['ext']:<10} {info.get('runner', 'N/A'):<12} "
              f"Compile to {target.capitalize()} code")
    
    print("\nExamples:")
    print("  ailang compile example.ail -t python   # Compile to Python")
    print("  ailang run example.ail -t python      # Run Python example")
    print("  ailang clean                         # Remove all build artifacts")

def main() -> None:
    """Main entry point for the CLI."""
    args = parse_args()
    setup_logging(args.verbose if hasattr(args, 'verbose') else 0)
    
    try:
        if args.command == 'compile':
            if args.list_targets:
                print_target_info()
                return
                
            if not args.input.endswith('.ail'):
                print("Error: Input file must have a .ail extension")
                sys.exit(1)
            
            if not os.path.exists(args.input):
                print(f"Error: File not found: {args.input}")
                sys.exit(1)
                
            compile_file(args.input, args.target, args.output, clean=args.clean)
        
        elif args.command == 'run':
            if not os.path.exists(args.input):
                print(f"Error: File not found: {args.input}")
                sys.exit(1)
                
            build_info = compile_file(
                args.input, 
                args.target, 
                clean=args.clean
            )
            output_path = build_info['metadata']['output_path']
            run_compiled_file(output_path, args.target, args.args)
        
        elif args.command == 'clean':
            target = None if args.target == 'all' else args.target
            print(f"Cleaning build artifacts for {args.target}...")
            build_manager.clean(target=target)
            print("Done!")
        
        elif args.command == 'targets':
            print_target_info()
        
        elif args.command == 'version':
            print("AILang Compiler")
            print("Version: 0.1.0")
            print("Copyright © 2023 AILang Team")
        
        elif args.command == 'info':
            target = None if args.target == 'all' else args.target
            artifacts = build_manager.get_artifacts(target=target)
            
            if args.json:
                print(json.dumps(artifacts, indent=2))
            else:
                if not artifacts:
                    print("No build artifacts found.")
                    return
                    
                print(f"\nBuild artifacts ({len(artifacts)}):")
                print("-" * 80)
                
                for i, artifact in enumerate(artifacts, 1):
                    print(f"{i}. {artifact['path']}")
                    print(f"   Source: {artifact['source']}")
                    print(f"   Target: {artifact['target']}")
                    print(f"   Modified: {artifact['timestamp']}")
                    
                    if artifact.get('metadata'):
                        print("   Metadata:")
                        for k, v in artifact['metadata'].items():
                            if k not in ['source_file', 'target', 'timestamp']:
                                print(f"     {k}: {v}")
                    print()
        
        else:
            # No command provided, show help
            parse_args(['--help'])
    
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        if hasattr(args, 'verbose') and args.verbose > 0:
            import traceback
            traceback.print_exc()
        else:
            print(f"Error: {e}")
            print("Use -v for more details")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
