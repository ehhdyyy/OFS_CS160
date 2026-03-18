"""
Pytest configuration — ensures the project root is on sys.path
so that `import main` works from the tests/ directory.
"""
import sys
from pathlib import Path

# Add project root to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
