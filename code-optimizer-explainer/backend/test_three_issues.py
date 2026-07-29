#!/usr/bin/env python3
"""
Test Script for 3 Issues:
1. User login & Supabase data persistence
2. Prettify feature working correctly
3. User preferences affecting responses
"""

import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://localhost:8000/api"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
END = '\033[0m'

def print_section(title: str):
    print(f"\n{BLUE}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{END}\n")

def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{END}")

def print_error(msg: str):
    print(f"{RED}❌ {msg}{END}")

def print_info(msg: str):
    print(f"{YELLOW}ℹ️  {msg}{END}")

# ============================================================================
# ISSUE #1: User Login & Supabase Data Persistence
# ============================================================================

def test_issue_1_user_login():
    print_section("ISSUE #1: User Login & Supabase Data Persistence")
    
    # Test 1: Register a new user
    print_info("Test 1.1: Registering new test user...")
    timestamp = int(time.time() * 1000)
    test_email = f"test_user_{timestamp}@example.com"
    test_password = "TestPassword123!"
    
    try:
        register_response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "email": test_email,
                "password": test_password,
                "full_name": f"Test User {timestamp}"
            }
        )
        
        if register_response.status_code == 200:
            reg_data = register_response.json()
            user_id = reg_data.get("user_id")
            access_token = reg_data.get("access_token")
            print_success(f"User registered: {user_id}")
            
            # Test 1.2: Save some history (simulate user typing code)
            print_info("Test 1.2: Saving code history to Supabase...")
            
            test_code_samples = [
                {"code": "def hello():\n    print('world')", "feature": "prettify"},
                {"code": "x = 1\ny = 2\nz = x + y", "feature": "explain"},
                {"code": "// TODO: refactor this\nfunction test() {}", "feature": "shorten"}
            ]
            
            headers = {"Authorization": f"Bearer {access_token}"}
            saved_count = 0
            
            for idx, sample in enumerate(test_code_samples):
                history_response = requests.post(
                    f"{BASE_URL}/history",
                    json={
                        "user_id": user_id,
                        "input_code": sample["code"],
                        "feature_used": sample["feature"],
                        "output": f"Processed output {idx+1}"
                    },
                    headers=headers
                )
                
                if history_response.status_code == 200:
                    saved_count += 1
                    print_success(f"Saved history entry {idx+1}: {sample['feature']}")
                else:
                    print_error(f"Failed to save history {idx+1}: {history_response.status_code}")
            
            # Test 1.3: Retrieve user history
            print_info("Test 1.3: Retrieving user history from Supabase...")
            history_response = requests.get(
                f"{BASE_URL}/history",
                params={"user_id": user_id},
                headers=headers
            )
            
            if history_response.status_code == 200:
                history_data = history_response.json()
                if isinstance(history_data, list):
                    print_success(f"Retrieved {len(history_data)} history entries for user")
                    if len(history_data) >= saved_count:
                        print_success(f"All {saved_count} saved entries are in Supabase ✓")
                        for entry in history_data[:3]:
                            print(f"  - {entry.get('feature_used')}: {entry.get('input_code')[:30]}...")
                        return True
                    else:
                        print_error(f"Expected {saved_count} entries, got {len(history_data)}")
                else:
                    print_error(f"History response is not a list: {type(history_data)}")
            else:
                print_error(f"Failed to retrieve history: {history_response.status_code}")
                
        else:
            print_error(f"Registration failed: {register_response.status_code}")
            print(register_response.text)
            
    except Exception as e:
        print_error(f"Test failed: {str(e)}")
    
    return False


# ============================================================================
# ISSUE #2: Prettify Feature Working Correctly
# ============================================================================

def test_issue_2_prettify():
    print_section("ISSUE #2: Prettify Feature Working Correctly")
    
    # Test messy code samples
    test_cases = [
        {
            "name": "Python messy formatting",
            "language": "python",
            "code": "def test(  ):x=1;y=2;z=x+y;return z"
        },
        {
            "name": "JavaScript inconsistent spacing",
            "language": "javascript",
            "code": "function calc(a,b){let c=a+b;  let d=c*2;return d}"
        },
        {
            "name": "Python with no spacing",
            "language": "python",
            "code": "class MyClass:\n    def __init__(self,name):\n        self.name=name"
        }
    ]
    
    print_info(f"Testing {len(test_cases)} different code samples...\n")
    
    results = []
    for idx, test_case in enumerate(test_cases):
        print_info(f"Test {idx+1}: {test_case['name']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/prettify",
                json={
                    "code": test_case["code"],
                    "language": test_case["language"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                formatted = data.get("formatted_code", "")
                detected_lang = data.get("detected_language", "unknown")
                
                # Check if output is different from input
                if formatted != test_case["code"]:
                    print_success(f"Prettify produced different output")
                    print(f"  Input:  {test_case['code'][:50]}...")
                    print(f"  Output: {formatted[:50]}...")
                    results.append(True)
                else:
                    print_error(f"Prettify returned same code as input")
                    results.append(False)
                    
                print(f"  Detected: {detected_lang}\n")
            else:
                print_error(f"Request failed: {response.status_code}")
                results.append(False)
                
        except Exception as e:
            print_error(f"Test failed: {str(e)}")
            results.append(False)
    
    # Compare if two different inputs produce different outputs
    print_info("Verifying different inputs produce different outputs...")
    try:
        resp1 = requests.post(
            f"{BASE_URL}/prettify",
            json={"code": "def a():pass", "language": "python"}
        )
        resp2 = requests.post(
            f"{BASE_URL}/prettify",
            json={"code": "def b():x=1;return x", "language": "python"}
        )
        
        if resp1.status_code == 200 and resp2.status_code == 200:
            out1 = resp1.json().get("formatted_code", "")
            out2 = resp2.json().get("formatted_code", "")
            
            if out1 != out2:
                print_success("Different inputs produce different outputs ✓")
                results.append(True)
            else:
                print_error("Different inputs produce SAME output ❌")
                print(f"  Output 1: {out1}")
                print(f"  Output 2: {out2}")
                results.append(False)
    except Exception as e:
        print_error(f"Comparison test failed: {str(e)}")
        results.append(False)
    
    return all(results) if results else False


# ============================================================================
# ISSUE #3: User Preferences Affecting Responses
# ============================================================================

def test_issue_3_preferences():
    print_section("ISSUE #3: User Preferences Affecting Responses")
    
    test_code = """
def process_data(items):
    result = []
    for item in items:
        if item > 0:
            result.append(item * 2)
    return result
    """
    
    # Test explain with different depths
    explain_depths = ["beginner", "intermediate", "advanced"]
    print_info(f"Testing EXPLAIN with {len(explain_depths)} different depth preferences...\n")
    
    explain_results = []
    explain_outputs = {}
    
    for depth in explain_depths:
        print_info(f"Requesting explanation at '{depth}' level...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/explain",
                json={
                    "code": test_code,
                    "language": "python",
                    "depth": depth
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                explanation = data.get("explanation", "")
                
                if explanation:
                    explain_outputs[depth] = explanation
                    word_count = len(explanation.split())
                    print_success(f"Received explanation ({word_count} words)")
                    print(f"  First 80 chars: {explanation[:80]}...\n")
                    explain_results.append(True)
                else:
                    print_error(f"Empty explanation returned")
                    explain_results.append(False)
            else:
                print_error(f"Request failed: {response.status_code}")
                explain_results.append(False)
                
        except Exception as e:
            print_error(f"Test failed: {str(e)}")
            explain_results.append(False)
    
    # Check if explanations differ by depth
    print_info("Comparing explanations by depth level...")
    if len(set(explain_outputs.values())) > 1:
        print_success("Different depths produce different explanations ✓")
        for depth, exp in explain_outputs.items():
            print(f"  {depth}: {len(exp.split())} words")
    else:
        print_error("Different depths produce SAME explanation ❌")
    
    # Test humanize with different modes
    humanize_modes = ["de-ai", "idiomatic", "simplify"]
    print_info(f"\nTesting HUMANIZE with {len(humanize_modes)} different modes...\n")
    
    humanize_results = []
    humanize_outputs = {}
    
    for mode in humanize_modes:
        print_info(f"Requesting humanize with mode '{mode}'...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/humanize",
                json={
                    "code": test_code,
                    "language": "python",
                    "mode": mode
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                humanized = data.get("humanized_code", "")
                
                if humanized:
                    humanize_outputs[mode] = humanized
                    print_success(f"Received humanized code")
                    print(f"  Length: {len(humanized)} chars\n")
                    humanize_results.append(True)
                else:
                    print_error(f"Empty humanized code returned")
                    humanize_results.append(False)
            else:
                print_error(f"Request failed: {response.status_code}")
                humanize_results.append(False)
                
        except Exception as e:
            print_error(f"Test failed: {str(e)}")
            humanize_results.append(False)
    
    # Check if outputs differ by mode
    print_info("Comparing humanized code by mode...")
    unique_outputs = len(set(humanize_outputs.values()))
    if unique_outputs > 1:
        print_success(f"Different modes produce different outputs ({unique_outputs} unique) ✓")
        for mode, code in humanize_outputs.items():
            print(f"  {mode}: {len(code)} chars")
    else:
        print_error("Different modes produce SAME output ❌")
    
    all_results = explain_results + humanize_results
    return all(all_results) if all_results else False


# ============================================================================
# Main Test Runner
# ============================================================================

def main():
    print(f"\n{BLUE}{'='*60}")
    print("  OPTICODE: 3 ISSUES COMPREHENSIVE TEST SUITE")
    print(f"{'='*60}{END}\n")
    
    results = {}
    
    # Run all tests
    results["Issue #1: User Login & Supabase"] = test_issue_1_user_login()
    results["Issue #2: Prettify Feature"] = test_issue_2_prettify()
    results["Issue #3: User Preferences"] = test_issue_3_preferences()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}PASS{END}" if result else f"{RED}FAIL{END}"
        print(f"{status} - {test_name}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{END}\n")
    
    if passed == total:
        print(f"{GREEN}✅ All tests passed! No issues detected.{END}\n")
    else:
        print(f"{RED}❌ {total - passed} test(s) failed. Issues detected above.{END}\n")


if __name__ == "__main__":
    main()
