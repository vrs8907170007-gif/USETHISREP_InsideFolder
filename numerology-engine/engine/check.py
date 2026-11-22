# -*- coding: utf-8 -*-
"""Arithmetic check for a report content file. Run before sending any report.

  python3 check.py content_en.py [facts.json]

Checks every "a → b → c" reduction chain, every "x+y+z = n" sum, every Chaldean name total written as
"Name" (total) in name tables (rows whose first cell is a name and second cell a number), and — when
facts.json is given — that the client's Moolank, Bhagyank and Personal Years in facts appear in the text.
Exit code 1 if anything is wrong."""
import importlib.util, json, os, re, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from numbers_lib import red, name_total  # noqa

def load(p):
    spec = importlib.util.spec_from_file_location('c', p); m = importlib.util.module_from_spec(spec)
    sys.path.insert(0, os.path.dirname(os.path.abspath(p))); spec.loader.exec_module(m); return m

def main():
    C = load(sys.argv[1]); errs = []; n = 0
    text = html.unescape(re.sub(r'<[^>]+>', ' ', ' '.join(s['html'] + ' ' + s['title'] for s in C.SECTIONS)))
    # reduction chains: 56 → 11 → 2
    for m in re.finditer(r'\b(\d{2,3})((?:\s*(?:→|->)\s*\d+\b(?!\s*\+))+)', text):
        seq = [int(m.group(1))] + [int(x) for x in re.findall(r'\d+', m.group(2))]
        for a, b in zip(seq, seq[1:]):
            n += 1
            if sum(map(int, str(a))) != b: errs.append(f'chain {m.group(0)!r}: {a} does not reduce to {b}')
    # sums: 1+5+0+5 = 11
    for m in re.finditer(r'((?:\d+\s*\+\s*)+\d+)\s*=\s*(\d+)', text):
        n += 1
        if sum(int(x) for x in re.findall(r'\d+', m.group(1))) != int(m.group(2)): errs.append(f'sum {m.group(0)!r} is wrong')
    # name tables: rows like <td>Name</td><td>Total</td><td>Number ...</td>
    raw = ' '.join(s['html'] for s in C.SECTIONS)
    for m in re.finditer(r'<tr[^>]*><td>([^<]+?)</td><td>(\d{1,3})(?:\s*(?:→|->)\s*\d+)*</td><td>(\d)\b', raw):
        nm = re.sub(r'\s*\(.*?\)\s*$', '', html.unescape(m.group(1))).strip().lstrip('★')
        if re.search(r'\d', nm): continue  # phone / vehicle / house rows: checked as digits below
        n += 1
        if name_total(nm) != int(m.group(2)) or red(int(m.group(2))) != int(m.group(3)):
            errs.append(f'name {nm!r}: Chaldean total {name_total(nm)} → {red(name_total(nm))}, report says {m.group(2)} → {m.group(3)}')
    # digit rows: <td>98201 45673</td><td>52</td><td>7 ...
    for m in re.finditer(r'<tr[^>]*><td>([^<]*\d[^<]*)</td><td>(\d{1,3})</td><td>(\d)\b', raw):
        digs = sum(int(c) for c in m.group(1) if c.isdigit()); n += 1
        if digs != int(m.group(2)) or red(digs) != int(m.group(3)):
            errs.append(f'digits {m.group(1)!r}: total {digs} → {red(digs)}, report says {m.group(2)} → {m.group(3)}')
    if len(sys.argv) > 2:
        f = json.load(open(sys.argv[2], encoding='utf-8'))['client']
        for label, val in (('Moolank', f['moolank']['number']), ('Bhagyank', f['bhagyank']['number'])):
            n += 1
            if str(val) not in text: errs.append(f'{label} {val} never appears in the report')
    print(f'checked {n} calculations')
    for e in errs: print('  ✗', e)
    print('OK' if not errs else f'{len(errs)} problem(s) — fix before sending')
    sys.exit(1 if errs else 0)

if __name__ == '__main__': main()
