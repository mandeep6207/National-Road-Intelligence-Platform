#!/usr/bin/env python
"""
Python syntax validation script for backend files
"""
import py_compile
import sys

files_to_validate = [
    'app/main.py',
    'app/core/config.py',
    'app/core/database.py',
    'app/core/security.py',
    'app/models/__init__.py',
    'app/schemas/__init__.py',
    'app/api/v1/__init__.py',
    'app/api/v1/endpoints/auth.py',
    'app/api/v1/endpoints/detection.py',
    'app/api/v1/endpoints/potholes.py',
    'app/api/v1/endpoints/complaints.py',
    'app/api/v1/endpoints/contractors.py',
    'app/api/v1/endpoints/repairs.py',
    'app/api/v1/endpoints/dashboard.py',
    'app/api/v1/endpoints/transparency.py',
    'app/api/v1/endpoints/blockchain.py',
    'app/api/v1/endpoints/prediction.py',
    'app/services/detection_service.py',
    'app/services/blockchain_service.py',
    'app/services/risk_service.py',
    'app/services/complaint_service.py',
    'app/services/verification_service.py',
    'app/services/prediction_service.py',
]

errors = []

for filepath in files_to_validate:
    try:
        py_compile.compile(filepath, doraise=True)
        print(f'✓ {filepath}')
    except py_compile.PyCompileError as e:
        print(f'✗ {filepath}')
        errors.append(str(e))

if errors:
    print("\n" + "="*80)
    print("SYNTAX ERRORS FOUND:")
    print("="*80)
    for error in errors:
        print(error)
    sys.exit(1)
else:
    print("\n" + "="*80)
    print(f"SUCCESS: All {len(files_to_validate)} files compiled without syntax errors!")
    print("="*80)
    sys.exit(0)
