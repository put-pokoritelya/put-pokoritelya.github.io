from pathlib import Path
import re

ROOT = Path('.')
pattern = re.compile(r'assets/photo-v2/([a-z0-9-]+)\.webp')
allowed = {'.html', '.htm', '.xml', '.js', '.css', '.json', '.txt', '.md'}
exclude_parts = {'.git', 'node_modules'}
changed_files = 0
changed_refs = 0

for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in allowed:
        continue
    if any(part in exclude_parts for part in path.parts):
        continue
    if path.as_posix() in {'scripts/rollback_photo_v2.py'}:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    new_text, count = pattern.subn(r'assets/photo/\1.jpg', text)
    if count:
        path.write_text(new_text, encoding='utf-8')
        changed_files += 1
        changed_refs += count

print(f'Restored {changed_refs} portrait references across {changed_files} files')
