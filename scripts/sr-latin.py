# Translittère les textes serbes (clé "sr") du cyrillique vers l'alphabet latin, comme la pub Serbie de Max.
#   python3 scripts/sr-latin.py
import json, re
M = {'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Ђ':'Đ','Е':'E','Ж':'Ž','З':'Z','И':'I','Ј':'J','К':'K','Л':'L','Љ':'Lj','М':'M','Н':'N','Њ':'Nj','О':'O','П':'P','Р':'R','С':'S','Т':'T','Ћ':'Ć','У':'U','Ф':'F','Х':'H','Ц':'C','Ч':'Č','Џ':'Dž','Ш':'Š'}
M.update({k.lower(): v.lower() for k, v in M.items()})
def lat(x):
    if isinstance(x, str):
        # Lj/Nj/Dž en majuscules dans un mot tout en capitales
        out = ''.join(M.get(c, c) for c in x)
        return re.sub(r'\b(Lj|Nj|Dž)(?=[A-ZČĆŽŠĐ])', lambda m: m.group(1).upper(), out)
    if isinstance(x, list): return [lat(v) for v in x]
    if isinstance(x, dict): return {k: lat(v) for k, v in x.items()}
    return x
dec = json.JSONDecoder()
def fix_exports(path):
    s = open(path).read(); out = ''; i = 0
    for m in re.finditer(r'export const \w+[^=]*= ', s):
        if m.start() < i: continue
        j = m.end(); obj, end = dec.raw_decode(s, j)
        if 'sr' in obj: obj['sr'] = lat(obj['sr'])
        out += s[i:j] + json.dumps(obj, ensure_ascii=False, indent=2); i = end
    open(path, 'w').write(out + s[i:]); print('ok', path)
for p in ['supabase/functions/_shared/logic/cardCopy.generated.ts', 'supabase/functions/_shared/logic/notesCopy.generated.ts',
          'supabase/functions/_shared/logic/inCountry.generated.ts', 'src/i18n/landingJob.generated.ts']:
    fix_exports(p)
p = 'supabase/functions/_shared/logic/jobCopy.ts'; s = open(p).read()
s = re.sub(r'(\n  sr: \{)(.*?)(\},\n)', lambda m: m.group(1) + lat(m.group(2)) + m.group(3), s, count=1)
open(p, 'w').write(s); print('ok', p)
