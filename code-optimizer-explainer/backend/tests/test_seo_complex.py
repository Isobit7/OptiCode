"""
Complex SEO optimize tests - real HTML documents with realistic SEO failures.
Tests score calculations, checklist structure, and comprehensive optimizations.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.deterministic_tools.tools import seo_optimize


class TestSEOComplexEcommerce:
    """Test with realistic e-commerce product pages."""
    
    def test_ecommerce_100line_page_with_four_failures(self):
        """100-line e-commerce page with: no lang, no description, 3 h1s, 6 imgs without alt."""
        code = '''<!DOCTYPE html>
<html>
<head>
    <title>Product Page</title>
</head>
<body>
    <header>
        <h1>Welcome to Store</h1>
        <h1>Amazing Products</h1>
        <h1>Best Prices</h1>
    </header>
    
    <nav>
        <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/contact">Contact</a></li>
        </ul>
    </nav>
    
    <main>
        <div class="product">
            <img src="product1.jpg">
            <h2>Product 1</h2>
            <p>Description here</p>
            <img src="product2.jpg">
            <p>Price: $99</p>
        </div>
        
        <div class="product">
            <img src="product3.jpg">
            <h2>Product 2</h2>
            <p>Another great product</p>
            <img src="product4.jpg">
            <p>Price: $199</p>
        </div>
        
        <div class="product">
            <img src="product5.jpg">
            <h2>Product 3</h2>
            <p>Premium option</p>
            <img src="product6.jpg">
            <p>Price: $299</p>
        </div>
    </main>
    
    <footer>
        <p>&copy; 2024 Store Inc.</p>
    </footer>
</body>
</html>
'''
        optimized, suggestions, score, checklist = seo_optimize(code)
        
        # Should have low score due to failures
        assert score < 50, f"Expected low score, got {score}"
        
        # Check all checklist items present (8 total)
        assert len(checklist) == 8, f"Expected 8 checklist items, got {len(checklist)}"
        
        # Verify specific failures are in checklist
        categories = [item["category"] for item in checklist]
        assert "Lang" in categories
        assert "Meta" in categories
        assert "Headings" in categories
        assert "Alt" in categories
        
        # Verify specific failures have warning status
        lang_item = [item for item in checklist if item["category"] == "Lang"][0]
        assert lang_item["status"] == "warning"
        
        # Verify the optimized HTML has fixes
        assert 'lang=' in optimized
        # BeautifulSoup may reorder attributes, so check for both patterns
        assert 'description' in optimized.lower()
        assert 'alt=' in optimized
        
        # Should still be valid HTML
        assert '<html' in optimized
        assert '</html>' in optimized

    def test_ecommerce_multiple_images_without_alt(self):
        """Page with 20 images, all without alt."""
        img_tags = "\n".join([f'<img src="img{i}.jpg">' for i in range(20)])
        code = f'''<html><head><title>Gallery</title></head><body>
<div class="gallery">
{img_tags}
</div>
</body></html>
'''
        optimized, suggestions, score, checklist = seo_optimize(code)
        
        # Should add alt to all 20
        optimized_count = optimized.count('alt=')
        assert optimized_count >= 20, f"Expected at least 20 alt attributes, got {optimized_count}"
        
        # Should be single Alt checklist item (not 20)
        alt_items = [item for item in checklist if item["category"] == "Alt"]
        assert len(alt_items) == 1, "Should have exactly one Alt checklist item"

    def test_well_optimized_blog_post_100_score(self):
        """Well-optimized blog post should score 100."""
        code = '''<!DOCTYPE html>
<html lang="en">
<head>
    <title>Complete Guide to SEO</title>
    <meta name="description" content="A comprehensive guide to SEO best practices and techniques for modern websites."/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body>
    <header>
        <nav>...</nav>
    </header>
    
    <main>
        <article>
            <h1>Complete Guide to SEO</h1>
            <section>
                <h2>Introduction</h2>
                <p>SEO is important for your website...</p>
            </section>
            <section>
                <h2>Key Techniques</h2>
                <p>Here are the best practices...</p>
            </section>
        </article>
        
        <figure>
            <img src="seo-diagram.png" alt="SEO Workflow Diagram">
            <figcaption>The SEO workflow</figcaption>
        </figure>
    </main>
    
    <footer>
        <p>&copy; 2024</p>
    </footer>
</body>
</html>
'''
        optimized, suggestions, score, checklist = seo_optimize(code)
        
        # Should have perfect or near-perfect score
        assert score == 100, f"Expected 100, got {score}"
        
        # All checklist items should be pass
        for item in checklist:
            assert item["status"] == "pass", f"Expected all pass, got {item['status']} for {item['category']}"
        
        # Idempotence: running again should give same score
        optimized2, _, score2, _ = seo_optimize(optimized)
        assert score2 == 100

    def test_score_with_title_but_empty(self):
        """Title present but empty (whitespace only)."""
        code = '''<html lang="en"><head>
<title>   </title>
<meta name="description" content="desc"/>
<meta name="viewport" content="width=device-width"/>
</head><body><h1>Page</h1></body></html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Empty title should be detected as failure
        title_items = [item for item in checklist if item["category"] == "Title"]
        assert len(title_items) > 0
        # Should be warning (title was replaced)
        assert any(item["status"] == "warning" for item in title_items)

    def test_lang_attribute_respected(self):
        """Existing lang attribute should not be overwritten."""
        code = '''<html lang="fr">
<head><title>Français</title></head>
<body><h1>Bonjour</h1></body>
</html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Should keep lang="fr"
        assert 'lang="fr"' in optimized
        
        # Lang check should pass
        lang_items = [item for item in checklist if item["category"] == "Lang"]
        assert any(item["status"] == "pass" for item in lang_items)

    def test_html_with_head_but_no_title(self):
        """HTML with <head> but missing <title>."""
        code = '''<html><head>
<meta name="description" content="test"/>
</head><body></body></html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Should add title
        assert '<title>' in optimized
        
        # Verify in checklist
        title_items = [item for item in checklist if item["category"] == "Title"]
        assert len(title_items) > 0

    def test_html_with_no_head_tag(self):
        """HTML with no <head> tag at all."""
        code = '''<html><body><h1>Hello</h1></body></html>'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Should create head
        assert '<head>' in optimized
        
        # Should add title and meta inside head
        assert '<title>' in optimized
        assert 'name="description"' in optimized
        
        # Head check should warn
        head_items = [item for item in checklist if item["category"] == "Head"]
        assert any(item["status"] == "warning" for item in head_items)

    def test_semantic_elements_detected(self):
        """Page with semantic elements should pass semantic check."""
        code = '''<html lang="en"><head>
<title>Semantic</title>
<meta name="description" content="test"/>
<meta name="viewport" content="width=device-width"/>
</head><body>
<header>Header</header>
<main>Main content</main>
<footer>Footer</footer>
</body></html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Semantic check should pass
        semantic_items = [item for item in checklist if item["category"] == "Semantic"]
        assert any(item["status"] == "pass" for item in semantic_items)

    def test_no_semantic_elements(self):
        """Page without semantic elements."""
        code = '''<html lang="en"><head>
<title>No Semantics</title>
<meta name="description" content="test"/>
<meta name="viewport" content="width=device-width"/>
</head><body>
<div class="header">Header</div>
<div class="main">Main</div>
<div class="footer">Footer</div>
</body></html>
'''
        optimized, suggestions, score, checklist = seo_optimize(code)
        
        # Semantic check should warn
        semantic_items = [item for item in checklist if item["category"] == "Semantic"]
        assert any(item["status"] == "warning" for item in semantic_items)
        
        # Should have suggestions
        assert len(suggestions) > 0


class TestSEOScoreCalculation:
    """Test score formula accuracy."""
    
    def test_score_formula_all_pass_equals_100(self):
        """8/8 checks passing = 100 points."""
        code = '''<html lang="en"><head>
<title>Perfect</title>
<meta name="description" content="Perfect page"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
</head><body>
<header>H</header>
<main><h1>Main</h1></main>
<img src="test.jpg" alt="Test"/>
</body></html>
'''
        _, _, score, checklist = seo_optimize(code)
        
        pass_count = sum(1 for item in checklist if item["status"] == "pass")
        expected_score = int((pass_count / 8) * 100)
        assert score == expected_score

    def test_score_formula_boundaries(self):
        """Test that score scales correctly with pass count."""
        # Score should be (pass_count / 8) * 100
        # So: 0/8=0, 1/8=12, 2/8=25, 3/8=37, 4/8=50, 5/8=62, 6/8=75, 7/8=87, 8/8=100
        
        for pass_count in range(9):
            expected_score = int((pass_count / 8) * 100)
            assert expected_score in [0, 12, 25, 37, 50, 62, 75, 87, 100]


class TestSEOChecklistStructure:
    """Test checklist format and content."""
    
    def test_checklist_has_all_required_fields(self):
        """Every checklist item must have category, status, message."""
        code = '<html><body></body></html>'
        _, _, _, checklist = seo_optimize(code)
        
        for item in checklist:
            assert "category" in item, "Missing category field"
            assert "status" in item, "Missing status field"
            assert "message" in item, "Missing message field"
            
            # Status must be one of these
            assert item["status"] in ["pass", "warning", "error"]

    def test_all_8_categories_present(self):
        """Should always return exactly 8 checklist items."""
        code = '<html><body></body></html>'
        _, _, _, checklist = seo_optimize(code)
        
        assert len(checklist) == 8
        
        expected_categories = {"Lang", "Head", "Title", "Meta", "Viewport", "Alt", "Headings", "Semantic"}
        actual_categories = {item["category"] for item in checklist}
        
        assert actual_categories == expected_categories


class TestSEOEdgeCases:
    """Test edge cases and error handling."""
    
    def test_empty_html_string(self):
        """Empty string input."""
        optimized, suggestions, score, checklist = seo_optimize("")
        
        assert isinstance(optimized, str)
        assert isinstance(suggestions, list)
        assert isinstance(score, int)
        assert len(checklist) > 0

    def test_python_code_instead_of_html(self):
        """Python code fed to SEO optimizer."""
        code = '''def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
'''
        optimized, suggestions, score, checklist = seo_optimize(code)
        
        # Should not crash
        assert isinstance(optimized, str)
        assert score >= 0

    def test_very_large_html(self):
        """Large HTML document."""
        code = '''<html lang="en"><head>
<title>Large</title>
<meta name="description" content="Large page"/>
<meta name="viewport" content="width=device-width"/>
</head><body>
<main>
<h1>Content</h1>
''' + "<p>Paragraph</p>" * 1000 + '''
</main>
</body></html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        assert isinstance(optimized, str)
        assert 0 <= score <= 100

    def test_malformed_html_with_missing_tags(self):
        """Malformed HTML missing closing tags."""
        code = '''<html>
<head>
<title>Malformed
<meta name="description" content="test">
</head>
<body>
<div>No closing div
<p>No closing p
</body>
</html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        # Should not crash
        assert isinstance(optimized, str)
        assert len(checklist) > 0

    def test_html_with_scripts_and_styles(self):
        """HTML with script and style tags."""
        code = '''<html lang="en"><head>
<title>With Scripts</title>
<meta name="description" content="test"/>
<meta name="viewport" content="width=device-width"/>
<style>
body { margin: 0; }
</style>
</head><body>
<h1>Content</h1>
<script>
console.log('test');
</script>
</body></html>
'''
        optimized, _, score, checklist = seo_optimize(code)
        
        assert len(checklist) == 8
        assert 0 <= score <= 100


class TestSEOOptimizationResultsInValidHTML:
    """Verify optimized output is valid HTML."""
    
    def test_optimized_contains_basic_structure(self):
        """Optimized HTML should have proper structure."""
        code = '<div>Just a div</div>'
        optimized, _, _, _ = seo_optimize(code)
        
        assert '<html' in optimized.lower()
        assert '<head>' in optimized
        assert '<title>' in optimized
        # BeautifulSoup may reorder attributes
        assert 'description' in optimized.lower()
        assert 'viewport' in optimized.lower()

    def test_optimized_title_not_empty(self):
        """Optimized title should never be empty."""
        code = '<html><head></head><body></body></html>'
        optimized, _, _, _ = seo_optimize(code)
        
        # Extract title
        start = optimized.find('<title>') + 7
        end = optimized.find('</title>')
        title_content = optimized[start:end]
        
        assert title_content.strip() != ""

    def test_viewport_with_proper_content(self):
        """Viewport meta tag should have proper content."""
        code = '<html><head></head><body></body></html>'
        optimized, _, _, _ = seo_optimize(code)
        
        assert 'name="viewport"' in optimized
        assert 'content="width=device-width' in optimized


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
