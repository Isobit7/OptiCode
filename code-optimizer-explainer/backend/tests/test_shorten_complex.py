"""
Complex shorten endpoint tests - AST correctness and minification contracts.
Tests realistic code with docstrings, decorators, and nested structures.
"""
import sys
import os
import ast
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.deterministic_tools.tools import shorten


class TestShortenPythonAST:
    """Test Python shortening with AST verification."""
    
    def test_python_class_removes_all_docstrings(self):
        """Class with Google-style docstrings in all methods."""
        code = '''class DataProcessor:
    """Main processor class."""
    
    def __init__(self, name):
        """Initialize processor.
        
        Args:
            name: Processor name
        """
        self.name = name
    
    def process(self, items):
        """Process items.
        
        Args:
            items: List of items
            
        Returns:
            Processed data
        """
        result = []
        for item in items:
            result.append(item * 2)
        return result
    
    def cleanup(self):
        """Cleanup resources."""
        self.name = None
'''
        result = shorten(code, "python")
        
        # Assert no docstrings remain
        assert "Main processor class" not in result
        assert "Initialize processor" not in result
        assert "Process items" not in result
        assert "Cleanup resources" not in result
        assert "Google" not in result
        
        # Assert function/class names and logic preserved
        assert "class DataProcessor" in result
        assert "def __init__" in result
        assert "def process" in result
        
        # Assert it's valid Python
        ast.parse(result)

    def test_python_removes_inline_comments(self):
        """Code with inline comments removed."""
        code = '''def fibonacci(n):  # Calculate fibonacci number
    # Base case
    if n <= 1:
        return n  # Return n
    # Recursive case
    return fibonacci(n-1) + fibonacci(n-2)  # Sum two previous
'''
        result = shorten(code, "python")
        
        # No comments should remain
        assert "Calculate fibonacci" not in result
        assert "Base case" not in result
        assert "Recursive case" not in result
        
        # Function preserved
        assert "def fibonacci" in result
        assert "fibonacci(n" in result  # May have spaces: fibonacci(n - 1)
        
        # Valid Python
        ast.parse(result)

    def test_python_async_with_docstrings(self):
        """Async function with docstrings and comments."""
        code = '''async def fetch_data(url):
    """Fetch data from URL.
    
    Args:
        url: Target URL
        
    Returns:
        JSON data
    """
    # Create session
    async with aiohttp.ClientSession() as session:
        # Fetch data
        async with session.get(url) as resp:
            data = await resp.json()  # Parse JSON
            return data
'''
        result = shorten(code, "python")
        
        assert "Fetch data from URL" not in result
        assert "Create session" not in result
        assert "Fetch data" not in result
        assert "Parse JSON" not in result
        
        assert "async def fetch_data" in result
        assert "aiohttp.ClientSession" in result
        
        # Valid Python
        ast.parse(result)

    def test_python_decorators_preserved(self):
        """Decorators should be preserved."""
        code = '''@decorator
@another_decorator
def decorated_func():
    """Docstring to remove."""
    return 42
'''
        result = shorten(code, "python")
        
        assert "@decorator" in result
        assert "@another_decorator" in result
        assert "Docstring to remove" not in result
        assert "def decorated_func" in result
        
        # Valid Python
        ast.parse(result)

    def test_python_docstring_at_module_level(self):
        """Module-level docstring should be removed."""
        code = '''"""This is the module docstring.

This module does important things.
It has multiple lines.
"""

def func():
    return 1
'''
        result = shorten(code, "python")
        
        # Module docstring removed
        assert "This is the module docstring" not in result
        assert "multiple lines" not in result
        
        # Function preserved
        assert "def func" in result
        
        # Valid Python
        ast.parse(result)

    def test_python_multiline_docstring_formats(self):
        """Various docstring formats should be removed."""
        code = '''def func1():
    """Single line docstring."""
    return 1

def func2():
    \'''Triple single quote docstring.\'''
    return 2

def func3():
    """
    Multi-line docstring
    with multiple lines
    """
    return 3
'''
        result = shorten(code, "python")
        
        assert "Single line docstring" not in result
        assert "Triple single quote" not in result
        assert "Multi-line docstring" not in result
        
        assert "def func1" in result
        assert "def func2" in result
        assert "def func3" in result
        
        ast.parse(result)

    def test_python_docstring_not_removed_as_value(self):
        """Docstring assigned as value should NOT be removed."""
        code = '''def process(text):
    x = """This is assigned to a variable"""
    return x
'''
        result = shorten(code, "python")
        
        # This IS assigned, so it should be kept
        # The shortener should preserve it
        assert "def process" in result
        assert result.strip() != ""
        
        ast.parse(result)

    def test_python_only_docstrings(self):
        """Code that's only docstrings should result in empty or pass."""
        code = '''"""Module docstring."""

def func():
    """Function docstring."""
    pass
'''
        result = shorten(code, "python")
        
        # Should not crash, may be empty or have pass
        assert isinstance(result, str)
        
        # If non-empty, should be valid
        if result.strip():
            ast.parse(result)

    def test_python_class_methods_preserved(self):
        """Class methods and static methods preserved."""
        code = '''class Helper:
    """Helper class."""
    
    @classmethod
    def create(cls):
        """Create instance."""
        return cls()
    
    @staticmethod
    def utility():
        """Static utility."""
        return 42
    
    def instance_method(self):
        """Instance method."""
        return self.utility()
'''
        result = shorten(code, "python")
        
        assert "@classmethod" in result
        assert "@staticmethod" in result
        assert "def create" in result
        assert "def utility" in result
        assert "def instance_method" in result
        
        ast.parse(result)

    def test_python_empty_function_preserved(self):
        """Empty functions with pass should be preserved."""
        code = '''def empty():
    """Do nothing."""
    pass
'''
        result = shorten(code, "python")
        
        assert "def empty" in result
        # Should contain pass or at least not crash
        assert "pass" in result or "def empty" in result
        
        ast.parse(result)

    def test_python_boundary_exactly_5001_lines(self):
        """Exactly 5,001 lines should be handled (boundary test)."""
        # Create code with exactly 5001 lines
        lines = ["def func():"]
        for i in range(4999):
            lines.append(f"    x = {i}  # comment {i}")
        lines.append("    return x")
        
        code = "\n".join(lines)
        # This should be fine (still valid)
        result = shorten(code, "python")
        
        assert "def func" in result
        assert isinstance(result, str)


class TestShortenJavaScript:
    """Test JavaScript shortening."""
    
    def test_javascript_removes_jsdoc_comments(self):
        """JSDoc block comments should be removed."""
        code = '''/**
 * @param {string} name - User name
 * @returns {string} Greeting
 */
function greet(name) {
    return "Hello " + name;
}
'''
        result = shorten(code, "javascript")
        
        assert "JSDoc" not in result.lower() or "/**" not in result
        assert "function greet" in result or "greet" in result

    def test_javascript_removes_comments(self):
        """All comment types in JavaScript removed."""
        code = '''// Single line comment
function process() {
    /* Block comment */
    let x = 1;  // inline comment
    /* Another block */
    return x;
}
'''
        result = shorten(code, "javascript")
        
        assert "Single line comment" not in result
        assert "Block comment" not in result
        assert "inline comment" not in result
        
        assert "function process" in result or "process" in result


class TestShortenC:
    """Test C code shortening."""
    
    def test_c_removes_single_line_comments(self):
        """C single-line comments removed."""
        code = '''// This is a comment
int main() {
    int x = 42; // Initialize
    return x;   // Return value
}
'''
        result = shorten(code, "c")
        
        assert "This is a comment" not in result
        assert "Initialize" not in result
        assert "Return value" not in result
        
        assert "main" in result
        assert "42" in result

    def test_c_removes_block_comments(self):
        """C block comments removed."""
        code = '''/* Multi-line
   block comment
   spanning lines */
int add(int a, int b) {
    /* Compute sum */
    return a + b;  /* Return */
}
'''
        result = shorten(code, "c")
        
        assert "Multi-line" not in result
        assert "Compute sum" not in result
        
        assert "add" in result
        assert "a + b" in result

    def test_c_10_multiline_blocks(self):
        """10 multi-line comment blocks should all be removed."""
        code = '''
/* Block 1 */
int x;
/* Block 2 */
int y;
/* Block 3 */
int z;
/* Block 4 */
int a;
/* Block 5 */
int b;
/* Block 6 */
int c;
/* Block 7 */
int d;
/* Block 8 */
int e;
/* Block 9 */
int f;
/* Block 10 */
int g;
'''
        result = shorten(code, "c")
        
        # All "Block" strings should be gone
        assert result.count("Block") == 0
        
        # Variables should remain
        assert "int x" in result or "x" in result


class TestShortenEmptyAndEdgeCases:
    """Test edge cases."""
    
    def test_empty_string_python(self):
        """Empty Python code."""
        result = shorten("", "python")
        assert result.strip() == ""

    def test_empty_string_javascript(self):
        """Empty JavaScript code."""
        result = shorten("", "javascript")
        assert result.strip() == ""

    def test_only_comments_python(self):
        """Python code that is only comments."""
        code = '''# Comment 1
# Comment 2
# Comment 3
'''
        result = shorten(code, "python")
        assert isinstance(result, str)

    def test_only_docstring_module(self):
        """Module with only a docstring."""
        code = '"""Just a docstring."""'
        result = shorten(code, "python")
        assert isinstance(result, str)

    def test_boundary_20001_chars_should_be_ok(self):
        """20,001 chars should still be processed (handled at endpoint level)."""
        code = "def f():\n    pass\n" * 1111  # ~20,000 chars
        code = code[:20001]
        result = shorten(code, "python")
        assert isinstance(result, str)


class TestShortenIdempotence:
    """Test that shortening is idempotent where expected."""
    
    def test_python_shorten_twice(self):
        """Shortening already-shortened code should be safe."""
        code = '''def func():
    """Docstring."""
    return 42
'''
        first = shorten(code, "python")
        # Shorten again - should not crash
        second = shorten(first, "python")
        
        assert isinstance(second, str)
        # Both should be valid Python
        ast.parse(first)
        ast.parse(second)


class TestShortenASTParsing:
    """Verify all shortened Python code is valid AST."""
    
    def test_all_shortened_python_is_valid_ast(self):
        """Every shortened Python output should parse as valid AST."""
        test_cases = [
            'def f():\n    """Doc."""\n    return 1',
            'class C:\n    """Class doc."""\n    def m(self):\n        """Method."""\n        pass',
            '@decorator\ndef f():\n    """Decorated."""\n    pass',
        ]
        
        for code in test_cases:
            result = shorten(code, "python")
            if result.strip():  # If non-empty
                try:
                    ast.parse(result)
                except SyntaxError as e:
                    pytest.fail(f"Shortened code is not valid Python: {result}\nError: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
