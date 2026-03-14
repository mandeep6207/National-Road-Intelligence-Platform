#!/usr/bin/env python3
file_path = r'd:\IIIT Hackathon\Project 1 VS code\frontend\app\page.tsx'

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)

# Keep only the first 311 lines
truncated_lines = lines[:311]

# Write back to the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(truncated_lines)

print(f'File truncated successfully. Kept 311 lines (out of {original_count} original lines).')
