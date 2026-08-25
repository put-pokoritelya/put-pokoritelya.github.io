#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / 'assets' / 'photo-v2'
PAT = re.compile(r'assets/photo/([A-Za-z0-9-]+)\.jpg')

changed_files = 0
changed_refs = 0
missing = set()

for path in ROOT.rglob('*'):
    if not path.is_file():
        continue
    if path.name == 'photo-v2-preview.html':
        continue
    if path.suffix.lower() not in {'.html', '.js', '.xml', '.json'}:
        continue

    text = path.read_text(encoding='utf-8', errors='strict')

    def repl(m):
        global changed_refs
        slug = m.group(1)
        candidate = V2 / f'{slug}.webp'
        if not candidate.exists():
            missing.add(slug)
            return m.group(0)
        changed_refs += 1
        return f'assets/photo-v2/{slug}.webp'

    new = PAT.sub(repl, text)
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed_files += 1

print(f'Changed {changed_refs} portrait references across {changed_files} files')
if missing:
    print('Skipped missing V2:', ', '.join(sorted(missing)))
