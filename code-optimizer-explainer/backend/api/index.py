import os
import sys

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

# Export app for Vercel Python Serverless Runtime
__all__ = ["app"]
