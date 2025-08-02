"""
File utilities for AILang compiler.
Handles build directory management, file operations, and path resolution.
"""

import os
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List
import json
import hashlib

class BuildManager:
    """Manages build directories and file operations for AILang compilation."""
    
    def __init__(self, build_dir: str = "build"):
        """
        Initialize the BuildManager.
        
        Args:
            build_dir: Base build directory path
        """
        self.build_dir = Path(build_dir)
        self.artifacts: Dict[str, Dict[str, Any]] = {}
        self._ensure_build_structure()
    
    def _ensure_build_structure(self) -> None:
        """Ensure the build directory structure exists."""
        # Main build directories
        self.build_dir.mkdir(exist_ok=True)
        (self.build_dir / "obj").mkdir(exist_ok=True)
        (self.build_dir / "bin").mkdir(exist_ok=True)
        (self.build_dir / "logs").mkdir(exist_ok=True)
        
        # Metadata file to track build artifacts
        self.metadata_file = self.build_dir / "build_metadata.json"
        self._load_metadata()
    
    def _load_metadata(self) -> None:
        """Load build metadata from file if it exists."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    self.artifacts = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.artifacts = {}
    
    def _save_metadata(self) -> None:
        """Save build metadata to file."""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.artifacts, f, indent=2)
    
    def get_output_path(self, source_path: str, target: str, suffix: str = "") -> Path:
        """
        Get the output path for a compiled file.
        
        Args:
            source_path: Path to the source file
            target: Target platform/language (e.g., 'python', 'cpp')
            suffix: Optional suffix for the output filename
            
        Returns:
            Path: Full path to the output file
        """
        source_path = Path(source_path)
        output_dir = self.build_dir / "obj" / target
        output_dir.mkdir(exist_ok=True)
        
        # Create a hash of the source file path to avoid filename collisions
        path_hash = hashlib.md5(str(source_path).encode()).hexdigest()[:8]
        suffix = f"_{suffix}" if suffix else ""
        
        return output_dir / f"{source_path.stem}_{path_hash}{suffix}{source_path.suffix}"
    
    def write_compiled_file(self, source_path: str, target: str, content: str, 
                          metadata: Optional[Dict[str, Any]] = None) -> Path:
        """
        Write compiled output to a file.
        
        Args:
            source_path: Path to the source file
            target: Target platform/language
            content: Content to write
            metadata: Optional metadata about the compilation
            
        Returns:
            Path: Path to the written file
        """
        output_path = self.get_output_path(source_path, target)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Update metadata
        rel_path = str(output_path.relative_to(self.build_dir))
        self.artifacts[rel_path] = {
            'source': str(source_path),
            'target': target,
            'timestamp': str(output_path.stat().st_mtime),
            'metadata': metadata or {}
        }
        self._save_metadata()
        
        return output_path
    
    def clean(self, target: Optional[str] = None) -> None:
        """
        Clean build artifacts.
        
        Args:
            target: If specified, only clean artifacts for this target
        """
        if target:
            # Clean specific target
            target_dir = self.build_dir / "obj" / target
            if target_dir.exists():
                shutil.rmtree(target_dir)
            
            # Update metadata
            self.artifacts = {
                k: v for k, v in self.artifacts.items() 
                if not k.startswith(f"obj/{target}/") and not k.startswith(f"bin/{target}")
            }
        else:
            # Clean everything
            for item in self.build_dir.glob("*"):
                if item.name != "build_metadata.json":
                    if item.is_dir():
                        shutil.rmtree(item)
                    else:
                        item.unlink()
            self.artifacts = {}
        
        self._save_metadata()
        self._ensure_build_structure()
    
    def get_artifacts(self, source_path: Optional[str] = None, 
                     target: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get information about build artifacts.
        
        Args:
            source_path: Filter by source file path
            target: Filter by target platform
            
        Returns:
            List of artifact information dictionaries
        """
        results = []
        for rel_path, info in self.artifacts.items():
            if source_path and info['source'] != source_path:
                continue
            if target and info['target'] != target:
                continue
                
            results.append({
                'path': str(self.build_dir / rel_path),
                'source': info['source'],
                'target': info['target'],
                'timestamp': info['timestamp'],
                'metadata': info['metadata']
            })
        
        return results

# Global instance for convenience
build_manager = BuildManager()

def get_build_manager() -> BuildManager:
    """Get the global build manager instance."""
    return build_manager
