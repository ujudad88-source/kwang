from pathlib import Path
from bs4 import BeautifulSoup
import sys, re
root=Path(__file__).resolve().parents[2]
html=(root/'index.html').read_text(encoding='utf-8')
soup=BeautifulSoup(html,'html.parser')
errors=[]
for p in [
 'app/core/styles/legacy-base.css','app/core/scripts/legacy-runtime.js',
 'app/core/styles/module-boundaries.css','app/core/scripts/module-boundary-guard.js',
 'app/pages/drawing/styles/workspace-layout.css','app/pages/drawing/styles/bottom-workspace.css'
]:
    if not (root/p).exists(): errors.append(f'missing {p}')
ids=[x['id'] for x in soup.select('[id]')]
dups=sorted({x for x in ids if ids.count(x)>1})
if dups: errors.append('duplicate ids: '+', '.join(dups[:20]))
# Assert extracted inline blocks are gone except JSON-like script payloads (none expected)
if soup.find('style'): errors.append('inline style remains')
for s in soup.find_all('script'):
    if not s.get('src') and s.get_text(strip=True): errors.append('inline script remains')
if errors:
    print('FAIL')
    print('\n'.join(errors))
    sys.exit(1)
print('PASS: architecture files, externalized CSS/JS, and unique IDs verified')
