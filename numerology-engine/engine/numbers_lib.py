# -*- coding: utf-8 -*-
"""The Divine Code numerology calculator — the single source of every number in a report.

Usage
  python3 numbers.py booking.json            -> prints facts JSON (save it as facts.json)
  python3 numbers.py --name "Vishal Singh" "Divine Code"     -> Chaldean totals
  python3 numbers.py --spell "Vishal Singh" --target 5,6    -> readable spellings that total the target
  python3 numbers.py --dates 2027-04 --want 5,6               -> dates of a month whose day reduces to 5 or 6
  python3 numbers.py --digits "MH01 AQ 7979" "403"            -> digit totals (vehicles, flats, phones)

booking.json is the "Booking data (for the report agent)" JSON from the website booking email.
"""
import datetime, json, re, sys

CHALDEAN = {**{c: 1 for c in 'AIJQY'}, **{c: 2 for c in 'BKR'}, **{c: 3 for c in 'CGLS'}, **{c: 4 for c in 'DMT'},
            **{c: 5 for c in 'EHNX'}, **{c: 6 for c in 'UVW'}, **{c: 7 for c in 'OZ'}, **{c: 8 for c in 'FP'}}
PLANET = {1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars'}
PLANET_HI = {1: 'सूर्य', 2: 'चंद्र', 3: 'गुरु', 4: 'राहु', 5: 'बुध', 6: 'शुक्र', 7: 'केतु', 8: 'शनि', 9: 'मंगल'}
DAY = {1: 'Sunday', 2: 'Monday', 3: 'Thursday', 4: 'Saturday', 5: 'Wednesday', 6: 'Friday', 7: 'Monday', 8: 'Saturday', 9: 'Tuesday'}
# Classical (naisargika) planetary friendship of Vedic astrology, read as: how planet A treats planet B.
# Rahu (4) and Ketu (7) follow Saturn and Mars respectively, as is common practice.
FRIEND = {1: {2, 3, 9}, 2: {1, 5}, 3: {1, 2, 9}, 4: {5, 6, 8}, 5: {1, 6}, 6: {5, 8}, 7: {1, 2, 3}, 8: {5, 6}, 9: {1, 2, 3}}
ENEMY = {1: {6, 8}, 2: set(), 3: {5, 6}, 4: {1, 2, 9}, 5: {2}, 6: {1, 2}, 7: {5}, 8: {1, 2, 9}, 9: {5}}
YEAR_THEME = {1: 'new beginnings', 2: 'partnership and patience', 3: 'expression and creativity', 4: 'hard work and foundations',
              5: 'change, travel and expansion', 6: 'home, family and responsibility', 7: 'reflection and inner growth',
              8: 'money, power and results', 9: 'completion and letting go'}
LOSHU_POS = [4, 9, 2, 3, 5, 7, 8, 1, 6]
PLANES = {'Mental plane (4-9-2)': (4, 9, 2), 'Emotional plane (3-5-7)': (3, 5, 7), 'Practical plane (8-1-6)': (8, 1, 6),
          'Thought plane (4-3-8)': (4, 3, 8), 'Will plane (9-5-1)': (9, 5, 1), 'Action plane (2-7-6)': (2, 7, 6),
          'Success plane (4-5-6)': (4, 5, 6), 'Property plane (2-5-8)': (2, 5, 8)}


def reduce_chain(n):
    """29 -> [29, 11, 2]"""
    chain = [n]
    while chain[-1] > 9:
        chain.append(sum(map(int, str(chain[-1]))))
    return chain


def red(n):
    return reduce_chain(n)[-1]


def digits_total(s):
    return sum(int(c) for c in str(s) if c.isdigit())


def name_total(s):
    return sum(CHALDEAN.get(c, 0) for c in s.upper())


def name_info(s):
    t = name_total(s)
    ch = reduce_chain(t) if t else [0]
    return {'name': s, 'total': t, 'chain': ch, 'number': ch[-1], 'planet': PLANET.get(ch[-1], '')}


def relation(a, b):
    """How planet a treats planet b: friend / neutral / enemy."""
    if a == b: return 'same'
    if b in FRIEND.get(a, set()): return 'friend'
    if b in ENEMY.get(a, set()): return 'enemy'
    return 'neutral'


def parse_date(s):
    s = (s or '').strip()
    for f in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y'):
        try: return datetime.datetime.strptime(s, f).date()
        except ValueError: pass
    return None


def loshu(d, mool, bhag):
    ds = [int(c) for c in d.strftime('%d%m%Y') if c != '0'] + [mool, bhag]
    cnt = {k: ds.count(k) for k in range(1, 10)}
    return {
        'digits_used': sorted(ds), 'counts': cnt,
        'grid_rows': [[(p, str(p) * cnt[p] if cnt[p] else '—') for p in LOSHU_POS[i:i + 3]] for i in (0, 3, 6)],
        'missing': [k for k in range(1, 10) if not cnt[k]],
        'repeated': {k: v for k, v in cnt.items() if v > 1},
        'planes_complete': [n for n, ks in PLANES.items() if all(cnt[k] for k in ks)],
        'planes_empty': [n for n, ks in PLANES.items() if not any(cnt[k] for k in ks)],
    }


def personal(d, today):
    base = d.day + d.month
    base_digits = digits_total(d.strftime('%d%m'))
    years = {}
    for y in (today.year, today.year + 1, today.year + 2):
        py = red(base_digits + digits_total(y))
        months = {datetime.date(y, m, 1).strftime('%b %Y'): red(py + m) for m in range(1, 13)}
        years[y] = {'personal_year': py, 'theme': YEAR_THEME[py], 'calc': f'{base_digits} + {digits_total(y)} = {base_digits + digits_total(y)} -> {py}', 'months': months}
    return years


def person(name, daily, dob, today):
    d = parse_date(dob)
    if not d: return {'error': f'could not read date of birth: {dob!r}'}
    mool = red(d.day)
    bchain = reduce_chain(digits_total(d.strftime('%d%m%Y')))
    bhag = bchain[-1]
    names = {}
    for label, n in (('official', name), ('daily', daily)):
        if n: names[label] = name_info(n)
    if name: names['first'] = name_info(name.split()[0])
    return {
        'dob': d.isoformat(), 'weekday_born': d.strftime('%A'),
        'moolank': {'number': mool, 'from_day': d.day, 'planet': PLANET[mool], 'planet_hi': PLANET_HI[mool]},
        'bhagyank': {'number': bhag, 'chain': bchain, 'planet': PLANET[bhag], 'planet_hi': PLANET_HI[bhag], 'calc': '+'.join(d.strftime('%d%m%Y')) + f' = {bchain[0]}'},
        'moolank_vs_bhagyank': {'moolank_treats_bhagyank': relation(mool, bhag), 'bhagyank_treats_moolank': relation(bhag, mool)},
        'names': names,
        'loshu': loshu(d, mool, bhag),
        'lucky': {'dates': sorted({x for x in range(1, 32) if red(x) == mool}), 'friendly_numbers': sorted(FRIEND[mool]), 'unfriendly_numbers': sorted(ENEMY[mool]), 'day_of_planet': DAY[mool]},
        'personal_years': personal(d, today),
    }


def spellings(name, targets, max_edits=2):
    """Readable variants (doubling one letter per word, adding a middle initial) whose total reduces to a target."""
    words = name.split()
    def variants(w):
        out = {w}
        for i in range(len(w)): out.add(w[:i + 1] + w[i].lower() + w[i + 1:] if i else w[0] + w[0].lower() + w[1:])
        return out
    import itertools
    res = []
    for combo in itertools.product(*[sorted(variants(w)) for w in words]):
        cand = ' '.join(combo)
        edits = sum(a != b for a, b in zip(combo, words))
        if edits <= max_edits and red(name_total(cand)) in targets and cand != name:
            res.append((edits, cand, name_total(cand), red(name_total(cand))))
    return sorted(set(res))[:40]


def month_dates(ym, want):
    y, m = map(int, ym.split('-'))
    out = []
    for dd in range(1, 32):
        try: dt = datetime.date(y, m, dd)
        except ValueError: break
        if red(dd) in want:
            out.append({'date': dt.isoformat(), 'weekday': dt.strftime('%A'), 'day_number': red(dd), 'universal_day': red(digits_total(dt.strftime('%d%m%Y')))})
    return out


STATUS_WORDS = {'divorced', 'single', 'unmarried', 'widowed', 'widow', 'widower', 'separated', 'none', 'na', 'n/a', 'nil', '-', 'not married', 'no partner'}


def split_mobiles(text):
    """'8369578225 9136540798', '+91 91365 40798, 98201-45673' -> ['8369578225', '9136540798', ...]
    Tokens are joined until they make a 10-digit number (or 12 with a leading 91, 11 with a leading 0)."""
    out = []
    def flush(acc):
        if len(acc) == 12 and acc.startswith('91'): acc = acc[2:]
        elif len(acc) == 11 and acc.startswith('0'): acc = acc[1:]
        if len(acc) >= 6: out.append(acc)
    for chunk in re.split(r'[,;/\n]| and ', text or ''):
        acc = ''
        for tok in chunk.split():
            acc += re.sub(r'\D', '', tok)
            if len(acc) >= 10 and not (acc.startswith('91') and len(acc) < 12) and not (acc.startswith('0') and len(acc) < 11):
                flush(acc); acc = ''
        flush(acc)
    return out


def split_vehicles(text):
    """'MH14FH0424 MH01AQ7979' or 'MH14 FH 0424; MH01 AQ 7979' -> one entry per registration."""
    out = []
    for chunk in re.split(r'[,;/\n+]| and ', text or ''):
        plates = re.findall(r'[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4}', chunk.upper())
        if plates: out += [re.sub(r'\s+', ' ', x).strip() for x in plates]
        elif re.search(r'\d', chunk): out.append(chunk.strip())
    return out


def from_booking(b, today=None):
    today = today or datetime.date.today()
    c = b.get('client', {})
    facts = {'ref': b.get('ref'), 'package': b.get('package'), 'addons': b.get('addons', []), 'language': b.get('language'), 'generated_on': today.isoformat(),
             'client': person(c.get('official_name', ''), c.get('daily_name', ''), c.get('dob', ''), today)}
    p = b.get('partner') or {}
    status = (b.get('relationship_status') or '').strip()
    pname = (p.get('name') or '').strip()
    if pname.lower().strip('. ') in STATUS_WORDS:          # e.g. "Divorced" typed into the partner-name box
        status = status or pname; pname = ''
    if p.get('dob') and parse_date(p.get('dob')) == parse_date(c.get('dob', '')):
        pname = ''                                          # partner DOB copied from the client's own: not a real partner
    facts['relationship_status'] = status or ('Married / partner' if pname else 'Not given')
    if pname and p.get('dob'):
        facts['partner'] = person(p['name'], '', p['dob'], today)
        cm, pm = facts['client'].get('moolank', {}).get('number'), facts['partner'].get('moolank', {}).get('number')
        cb, pb = facts['client'].get('bhagyank', {}).get('number'), facts['partner'].get('bhagyank', {}).get('number')
        facts['couple'] = {
            'moolank_relation': {'client_to_partner': relation(cm, pm), 'partner_to_client': relation(pm, cm)},
            'bhagyank_relation': {'client_to_partner': relation(cb, pb), 'partner_to_client': relation(pb, cb)},
            'shared_missing': sorted(set(facts['client']['loshu']['missing']) & set(facts['partner']['loshu']['missing'])),
            'client_gives_partner': sorted(set(facts['partner']['loshu']['missing']) - set(facts['client']['loshu']['missing'])),
            'partner_gives_client': sorted(set(facts['client']['loshu']['missing']) - set(facts['partner']['loshu']['missing'])),
        }
        md = parse_date(p.get('marriage', ''))
        if md:
            facts['couple']['marriage_date'] = {'date': md.isoformat(), 'day_number': red(md.day), 'total': digits_total(md.strftime('%d%m%Y')), 'number': red(digits_total(md.strftime('%d%m%Y')))}
    # mobiles / vehicles / properties: website v17 sends lists of objects; older bookings send one text field
    def as_list(v, key):
        if isinstance(v, list): return [(x.get(key, '') if isinstance(x, dict) else str(x), x if isinstance(x, dict) else {}) for x in v]
        return None
    ml = as_list(b.get('mobiles'), 'number')
    mobiles = [(n, extra) for raw, extra in ml for n in split_mobiles(raw)] if ml is not None else [(n, {}) for n in split_mobiles(b.get('mobiles'))]
    facts['mobiles'] = [{'number': n, 'use': e.get('use', ''), 'total': digits_total(n), 'chain': reduce_chain(digits_total(n)), 'number_reduced': red(digits_total(n)), 'planet': PLANET[red(digits_total(n))]} for n, e in mobiles]
    vl = as_list(b.get('vehicles'), 'reg')
    vehicles = [(n, extra) for raw, extra in vl for n in (split_vehicles(raw) or [raw])] if vl is not None else [(n, {}) for n in split_vehicles(b.get('vehicles'))]
    facts['vehicles'] = [{'number': n, 'type': e.get('type', ''), 'total': digits_total(n), 'chain': reduce_chain(digits_total(n)), 'number_reduced': red(digits_total(n)), 'planet': PLANET[red(digits_total(n))]} for n, e in vehicles if re.search(r'\d', n)]
    props = b.get('properties')
    if not isinstance(props, list):
        props = [{'flat': b.get('house') or ''}] if b.get('house') else []
    facts['houses'] = []
    for pr in props:
        h = pr.get('flat', '') if isinstance(pr, dict) else str(pr)
        m = re.search(r'(?:flat|house|apt|apartment|unit|office|shop|no\.?|#)\s*([0-9]+)', h, re.I) or re.search(r'\b([0-9]{1,5})\b', h)
        if not m: continue
        floor = (pr.get('floor', '') if isinstance(pr, dict) else '')
        fm = re.search(r'\d+', floor or '')
        facts['houses'].append({'text': ', '.join(x for x in (h, pr.get('building', '') if isinstance(pr, dict) else '', ('floor ' + floor) if floor else '') if x),
                                'flat_number': m.group(1), 'total': digits_total(m.group(1)), 'chain': reduce_chain(digits_total(m.group(1))), 'number': red(digits_total(m.group(1))),
                                'floor_number': red(int(fm.group(0))) if fm else None,
                                'building_name_numbers': name_info(pr.get('building', '').split(',')[0]) if isinstance(pr, dict) and pr.get('building') else None})
    if facts['houses']: facts['house'] = facts['houses'][0]
    facts['languages'] = b.get('languages') or [x.strip() for x in re.split(r' and |,', b.get('language') or 'English') if x.strip()]
    biz = b.get('business') or {}
    if biz.get('name'): facts['business_name'] = name_info(biz['name'])
    baby = b.get('baby') or {}
    bd = parse_date(baby.get('dob', ''))
    if bd:
        facts['baby'] = {'dob': bd.isoformat(), 'moolank': red(bd.day), 'bhagyank_chain': reduce_chain(digits_total(bd.strftime('%d%m%Y')))}
    # best dates over the next 6 months for the client's own numbers
    cl = facts['client']
    if 'moolank' in cl:
        want = {cl['moolank']['number']} | ({x for x in FRIEND[cl['moolank']['number']]} & {cl['bhagyank']['number'], 5, 6, 1})
        months = []
        d0 = today.replace(day=1)
        for i in range(6):
            y, mth = d0.year + (d0.month - 1 + i) // 12, (d0.month - 1 + i) % 12 + 1
            months.append({'month': f'{y}-{mth:02d}', 'personal_month': cl['personal_years'][y]['months'][datetime.date(y, mth, 1).strftime('%b %Y')],
                           'good_dates': month_dates(f'{y}-{mth:02d}', {cl['moolank']['number']})})
        facts['client_good_dates'] = months
    return facts


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    if a[0] == '--name': print(json.dumps([name_info(x) for x in a[1:]], ensure_ascii=False, indent=1))
    elif a[0] == '--digits': print(json.dumps([{'text': x, 'total': digits_total(x), 'chain': reduce_chain(digits_total(x))} for x in a[1:]], indent=1))
    elif a[0] == '--spell':
        tg = {int(x) for x in a[a.index('--target') + 1].split(',')} if '--target' in a else set(range(1, 10))
        for r in spellings(a[1], tg): print(r)
    elif a[0] == '--dates':
        want = {int(x) for x in a[a.index('--want') + 1].split(',')} if '--want' in a else set(range(1, 10))
        print(json.dumps(month_dates(a[1], want), indent=1))
    else:
        b = json.load(open(a[0], encoding='utf-8'))
        today = parse_date(a[a.index('--today') + 1]) if '--today' in a else None
        print(json.dumps(from_booking(b, today), ensure_ascii=False, indent=1))
