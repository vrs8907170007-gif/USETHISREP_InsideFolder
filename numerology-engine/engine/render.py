# -*- coding: utf-8 -*-
"""Render a Divine Code report to PDF: cover + contents (real page numbers) + sections + summary card.

Usage:  python3 render.py path/to/content_en.py [path/to/content_hi.py ...] [--out OUTDIR]
A content file defines L (labels), SECTIONS, SUMMARY and DISCLAIMER; see ../examples/content_template.py.
Fonts come from ../node_modules/@fontsource (run `npm install` in numerology-engine once)."""
import importlib.util, os, re, sys, asyncio
from pypdf import PdfReader, PdfWriter
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
FS = 'file://' + os.path.join(os.path.dirname(HERE), 'node_modules/@fontsource')
OUT = os.path.join(os.getcwd(), 'out')

FONTS = ''.join(
    f"@font-face{{font-family:'{fam}';src:url('{FS}/{pkg}/files/{pkg}-{sub}-{w}-{st}.woff2') format('woff2');font-weight:{w};font-style:{st};}}"
    for fam, pkg, sub, ws, sts in [
        ('Fraunces', 'fraunces', 'latin', (400, 500, 600, 700), ('normal', 'italic')),
        ('Inter', 'inter', 'latin', (400, 500, 600, 700), ('normal',)),
        ('NotoSerifDeva', 'noto-serif-devanagari', 'devanagari', (400, 500, 600, 700), ('normal',)),
        ('NotoSansDeva', 'noto-sans-devanagari', 'devanagari', (400, 500, 600, 700), ('normal',)),
    ] + [(f'Noto{k.title()}{scr.title()}', f'noto-{k}-{scr}', scr, (400, 600), ('normal',))
         for scr in ('gujarati', 'bengali', 'gurmukhi', 'tamil', 'telugu', 'kannada') for k in ('sans', 'serif')]
    for w in ws for st in sts)

# language code -> (display font, body font, file-name suffix). Marathi and Hindi share Devanagari.
LANGS = {
    'en': ("'Fraunces',serif", "'Inter',sans-serif", 'English'),
    'hi': ("'NotoSerifDeva','Fraunces',serif", "'NotoSansDeva','Inter',sans-serif", 'Hindi'),
    'mr': ("'NotoSerifDeva','Fraunces',serif", "'NotoSansDeva','Inter',sans-serif", 'Marathi'),
    'gu': ("'NotoSerifGujarati','Fraunces',serif", "'NotoSansGujarati','Inter',sans-serif", 'Gujarati'),
    'bn': ("'NotoSerifBengali','Fraunces',serif", "'NotoSansBengali','Inter',sans-serif", 'Bengali'),
    'pa': ("'NotoSerifGurmukhi','Fraunces',serif", "'NotoSansGurmukhi','Inter',sans-serif", 'Punjabi'),
    'ta': ("'NotoSerifTamil','Fraunces',serif", "'NotoSansTamil','Inter',sans-serif", 'Tamil'),
    'te': ("'NotoSerifTelugu','Fraunces',serif", "'NotoSansTelugu','Inter',sans-serif", 'Telugu'),
    'kn': ("'NotoSerifKannada','Fraunces',serif", "'NotoSansKannada','Inter',sans-serif", 'Kannada'),
}

CSS = """
:root{ --ink:#15132f; --ink2:#221d4f; --gold:#b8913f; --gold2:#d4af6a; --paper:#fbf8f1; --text:#26243a; --muted:#6b6880; --line:#e6dfcd; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; }
body{ font-family: var(--body); color: var(--text); font-size: 11.2pt; line-height: 1.66; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body.indic{ font-size: 11.8pt; line-height: 1.85; } body.indic table{ font-size: 10.6pt; } body.indic .sec-head h2{ font-size: 23pt; }
body.ta, body.te, body.kn{ font-size: 11pt; } body.ta table, body.te table, body.kn table{ font-size: 9.8pt; } body.ta .sec-head h2, body.te .sec-head h2, body.kn .sec-head h2{ font-size: 20pt; }
h1,h2,h3{ font-family: var(--display); color: var(--ink); margin:0; font-weight: 600; }
b{ color: var(--ink); font-weight: 600; }
p{ margin: 0 0 9pt; text-align: left; }
.sec{ break-before: page; }
.sec-head{ border-bottom: 1.5pt solid var(--gold); padding-bottom: 10pt; margin-bottom: 16pt; display:flex; align-items:flex-end; gap: 14pt; }
.sec-num{ font-family: var(--display); font-size: 40pt; line-height: .9; color: var(--gold); font-weight: 500; min-width: 30pt; }
.sec-head h2{ font-size: 22pt; line-height: 1.15; }
.sec-kick{ font-family: 'Inter', var(--body); font-size: 7.5pt; letter-spacing: .22em; text-transform: uppercase; color: var(--gold); font-weight: 700; margin-bottom: 4pt; }
h3{ font-size: 13.5pt; margin: 16pt 0 7pt; break-after: avoid; }
.lead{ font-size: 11.6pt; color: var(--ink); }
.note{ font-size: 9pt; color: var(--muted); font-style: italic; border-left: 2pt solid var(--line); padding-left: 10pt; margin-top: 12pt; }
ul.pts{ margin: 0 0 8pt; padding: 0; list-style: none; }
ul.pts li{ position: relative; padding: 0 0 7pt 16pt; }
ul.pts li::before{ content:'✦'; position:absolute; left:0; top:0; color: var(--gold); font-size: 8.5pt; }
table{ width:100%; border-collapse: collapse; margin: 6pt 0 12pt; font-size: 9.9pt; line-height: 1.5; break-inside: auto; }
thead{ display: table-header-group; }
tr{ break-inside: avoid; }
th{ background: var(--ink); color: #f3e7c8; text-align:left; font-family: 'Inter', var(--body); font-weight: 600; font-size: 8pt; letter-spacing: .06em; text-transform: uppercase; padding: 6pt 8pt; }
body.indic th{ text-transform: none; letter-spacing: 0; font-size: 8.8pt; }
td{ padding: 6pt 8pt; border-bottom: .6pt solid var(--line); vertical-align: top; }
tbody tr:nth-child(even) td{ background: #faf6ec; }
tr.rec td{ background: #f3e6c4 !important; }
tr.rec td:first-child{ border-left: 3pt solid var(--gold); }
.todo{ break-inside: avoid; background: var(--ink); color: #ece6d6; border-radius: 8pt; padding: 12pt 16pt 8pt; margin: 14pt 0 4pt; }
.todo-h{ font-family: 'Inter', var(--body); font-size: 8pt; letter-spacing: .2em; text-transform: uppercase; color: var(--gold2); font-weight: 700; margin-bottom: 6pt; }
body.indic .todo-h{ letter-spacing: .02em; font-size: 10pt; }
.todo ul{ margin:0; padding-left: 15pt; } .todo li{ margin-bottom: 5pt; } .todo b{ color:#fff; }
.letter{ background: #fff; border: .8pt solid var(--line); border-radius: 8pt; padding: 22pt 26pt; font-size: 11pt; }
.letter p{ margin-bottom: 11pt; }
.sign{ margin-top: 16pt; } .sign span{ color: var(--muted); font-size: 9pt; }
.grid-wrap{ display:flex; align-items:center; gap: 18pt; margin: 8pt 0 12pt; break-inside: avoid; }
.grid{ display:grid; grid-template-columns: repeat(3, 58pt); gap: 5pt; }
.g{ position: relative; height: 58pt; border: 1.2pt solid var(--gold); background: #fff; display:flex; align-items:center; justify-content:center; font-family: var(--display); font-size: 19pt; color: var(--ink); border-radius: 4pt; }
.g.off{ border-style: dashed; color: #c9c2ad; background: transparent; }
.g .pos{ position:absolute; top: 3pt; left: 5pt; font-family:'Inter'; font-size: 6.5pt; color: var(--gold); }
.grid-cap{ font-size: 9pt; color: var(--muted); max-width: 200pt; }
ol.plan{ margin: 0; padding-left: 18pt; } ol.plan li{ margin-bottom: 9pt; padding-left: 4pt; }
.closing{ margin-top: 18pt; padding: 16pt 18pt; border: 1pt solid var(--gold); border-radius: 8pt; background: #fffaf0; break-inside: avoid; }
/* contents */
.toc h2{ font-size: 24pt; margin-bottom: 18pt; }
.toc-row{ display:flex; align-items: baseline; gap: 10pt; padding: 7pt 0; border-bottom: .6pt solid var(--line); font-size: 11pt; }
.toc-row .n{ font-family: var(--display); color: var(--gold); width: 22pt; font-size: 13pt; }
.toc-row .t{ flex: 1; color: var(--ink); }
.toc-row .p{ font-family: 'Inter'; color: var(--muted); font-size: 9.5pt; }
.toc-intro{ margin-top: 22pt; font-size: 9.5pt; color: var(--muted); }
/* summary card */
.card-page{ break-before: page; text-align: center; }
.card-page h2{ font-size: 22pt; } .card-page .sub{ color: var(--muted); margin: 4pt 0 16pt; }
.scard{ display:inline-block; text-align:left; width: 300pt; border-radius: 22pt; padding: 22pt 22pt 18pt; background: linear-gradient(165deg, #2c2668, var(--ink) 60%); color: #ece6d6; border: 1.4pt solid var(--gold2); }
.scard .t{ font-family:'Inter'; font-size: 7.5pt; letter-spacing: .26em; color: var(--gold2); text-transform: uppercase; font-weight: 700; }
.scard .n{ font-family: 'Fraunces', serif; font-size: 22pt; color: #fff; margin-top: 6pt; }
.scard .nums{ display:flex; gap: 7pt; margin: 14pt 0 12pt; }
.scard .nums div{ flex:1; text-align:center; border: .8pt solid rgba(212,175,106,.45); border-radius: 9pt; padding: 7pt 0 5pt; }
.scard .nums b{ display:block; font-family:'Fraunces',serif; font-size: 24pt; color: var(--gold2); font-weight: 500; line-height: 1.1; }
.scard .nums small{ font-size: 7.5pt; color: #bdb7a6; }
.scard .rows div{ display:flex; justify-content: space-between; gap: 10pt; font-size: 9pt; padding: 4pt 0; border-bottom: .5pt solid rgba(212,175,106,.2); }
.scard .rows span:first-child{ color: #bdb7a6; } .scard .rows span:last-child{ color: #fff; text-align: right; }
.scard ol{ margin: 12pt 0 0; padding-left: 16pt; font-size: 9pt; line-height: 1.65; }
.disc{ margin-top: 26pt; font-size: 8.5pt; color: var(--muted); font-style: italic; text-align: left; border-top: .6pt solid var(--line); padding-top: 10pt; }
.sec, .card-page{ position: relative; } .mark{ position:absolute; top:0; right:0; font-size: 4pt; color: #fffffe; line-height:1; font-family: 'Inter', sans-serif; white-space: nowrap; }
"""

COVER_CSS = """
@page{ size: A4; margin: 0; }
html,body{ margin:0; height: 297mm; }
.cover{ width: 210mm; height: 297mm; position: relative; overflow: hidden; background: radial-gradient(120% 80% at 85% 0%, #2f2775 0%, #15132f 55%, #0d0c22 100%); color: #ece6d6; padding: 30mm 22mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cover .kick{ font-family:'Inter', var(--body); font-size: 9pt; letter-spacing: .3em; text-transform: uppercase; color: #d4af6a; font-weight: 700; }
.cover h1{ font-family: var(--display); color: #fff; font-size: 54pt; line-height: 1.05; margin: 14mm 0 0; font-weight: 500; }
.cover .rule{ width: 60mm; height: 1.4pt; background: #d4af6a; margin: 10mm 0; }
.cover .for{ font-family: var(--body); font-size: 11pt; color: #bdb7a6; letter-spacing: .04em; }
.cover .name{ font-family: var(--display); font-size: 30pt; color: #d4af6a; margin-top: 3mm; line-height: 1.2; }
.cover .meta{ margin-top: 9mm; font-family: var(--body); font-size: 10.5pt; color: #ddd6c4; line-height: 1.9; }
.cover .loshu{ position:absolute; right: 22mm; bottom: 34mm; display:grid; grid-template-columns: repeat(3, 21mm); gap: 3mm; }
.cover .loshu span{ height: 21mm; border: 1.2pt solid #d4af6a; display:flex; align-items:center; justify-content:center; font-family:'Fraunces', serif; font-size: 22pt; color: #d4af6a; border-radius: 2mm; }
.cover .loshu span.c{ background: #d4af6a; color: #15132f; }
.cover .foot{ position:absolute; left: 22mm; bottom: 22mm; font-family: var(--body); font-size: 9pt; color: #bdb7a6; line-height: 1.8; }
.cover .foot b{ color: #fff; font-weight: 600; }
.cover .brandmark{ position:absolute; left: 22mm; bottom: 34mm; font-family: var(--display); font-size: 14pt; color: #fff; }
"""

def fam(lang):
    if lang in LANGS and lang != 'en':
        d, b, _ = LANGS[lang]; return f"--display:{d}; --body:{b};"
    return "--display:'Fraunces',serif; --body:'Inter',sans-serif;"

def body_html(C, pages=None):
    L = C.L
    toc_rows = []
    for i, s in enumerate(C.SECTIONS):
        pg = pages.get(f'S{i}', '') if pages else '00'
        toc_rows.append(f'<div class="toc-row"><span class="n">{s["num"]}</span><span class="t">{s["title"]}</span><span class="p">{pg}</span></div>')
    pg = pages.get('CARD', '') if pages else '00'
    toc_rows.append(f'<div class="toc-row"><span class="n">✦</span><span class="t">{C.SUMMARY["title"]}</span><span class="p">{pg}</span></div>')
    toc = f'<section class="toc"><h2>{L["contents"]}</h2>{"".join(toc_rows)}</section>'
    secs = []
    for i, s in enumerate(C.SECTIONS):
        num = f'<div class="sec-num">{s["num"]}</div>' if s['num'] else ''
        secs.append(f'<section class="sec"><div class="mark">QQZS{i}ZQQ</div><div class="sec-head">{num}<div><div class="sec-kick">{L["doc"]}</div><h2>{s["title"]}</h2></div></div>{s["html"]}</section>')
    sm = C.SUMMARY
    card = (f'<section class="card-page"><div class="mark">QQZCARDZQQ</div><h2>{sm["title"]}</h2><div class="sub">{sm["sub"]}</div>'
            f'<div class="scard"><div class="t">The Divine Code · {L["doc"]}</div><div class="n">{sm["name"]}</div>'
            f'<div class="nums">{"".join(f"<div><b>{a}</b><small>{b}</small></div>" for a, b in sm["nums"])}</div>'
            f'<div class="rows">{"".join(f"<div><span>{a}</span><span>{b}</span></div>" for a, b in sm["rows"])}</div>'
            f'<ol>{"".join(f"<li>{x}</li>" for x in sm["steps"])}</ol></div>'
            f'<p class="disc">{C.DISCLAIMER}</p></section>')
    return (f'<!doctype html><html lang="{L["html_lang"]}"><head><meta charset="utf-8"><style>{FONTS}:root{{{fam(L["lang"])}}}{CSS}'
            f'@page{{ size:A4; margin: 18mm 17mm 20mm; }}</style></head><body class="{L["lang"]}{" indic" if L["lang"] != "en" else ""}">{toc}{"".join(secs)}{card}</body></html>')

def cover_html(C):
    L = C.L
    meta = '<br>'.join(L['cover_meta'])
    grid = ''.join(f'<span class="{"c" if n == "5" else ""}">{n}</span>' for n in '492357816')
    return (f'<!doctype html><html lang="{L["html_lang"]}"><head><meta charset="utf-8"><style>{FONTS}:root{{{fam(L["lang"])}}}{COVER_CSS}</style></head><body>'
            f'<div class="cover"><div class="kick">{L["cover_kicker"]}</div><h1>{L["cover_title"]}</h1><div class="rule"></div>'
            f'<div class="for">{L["cover_for"]}</div><div class="name">{L["client"]}</div><div class="meta">{meta}</div>'
            f'<div class="loshu">{grid}</div>'
            f'<div class="foot"><b>{L["brand"]}</b><br>{L.get("cover_contact", "Vishal Singh · vsofficial.vercel.app · WhatsApp +91 91365 40798")}<br>{L["cover_date"]} · {L["cover_edition"]}</div></div></body></html>')

FOOTER = ('<div style="width:100%; font-family:Inter,sans-serif; font-size:7px; color:#8a8698; padding:0 17mm; display:flex; justify-content:space-between;">'
          '<span>{conf}</span><span>{page} <span class="pageNumber"></span></span></div>')

def load(path):
    sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(os.path.abspath(path)))
    spec = importlib.util.spec_from_file_location('content_' + os.path.basename(path).replace('.', '_'), path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

async def render(path):
    C = load(path); lang = C.L['lang']; os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page()
        async def pdf(html, path, footer):
            tmp = path.replace('.pdf', '.html'); open(tmp, 'w', encoding='utf-8').write(html)
            await pg.goto('file://' + tmp, wait_until='networkidle')
            await pg.evaluate('document.fonts.ready')
            await pg.wait_for_timeout(300)
            opts = dict(path=path, format='A4', print_background=True, prefer_css_page_size=True)
            if footer:
                opts.update(display_header_footer=True, header_template='<div></div>',
                            footer_template=FOOTER.format(conf=C.L['footer_conf'], page=C.L['page']))
            await pg.pdf(**opts)
        cov = os.path.join(OUT, f'cover-{lang}.pdf'); bod = os.path.join(OUT, f'body-{lang}.pdf')
        await pdf(cover_html(C), cov, False)
        await pdf(body_html(C), bod, True)
        # find the page of each section marker (body page index + 2 because the cover is page 1)
        pages = {}
        for i, page in enumerate(PdfReader(bod).pages):
            for m in re.findall(r'QQZ(S\d+|CARD)ZQQ', page.extract_text() or ''):
                pages.setdefault(m, i + 1)
        await pdf(body_html(C, pages), bod, True)
        await b.close()
    # page numbers in the footer count from the body; shift them by rendering the footer offset: simplest is to merge and accept body numbering +1
    w = PdfWriter()
    for f in (cov, bod):
        for pgx in PdfReader(f).pages: w.add_page(pgx)
    safe = re.sub(r'[^A-Za-z0-9]+', '_', C.L.get('file_name') or (C.L['doc_en'] if 'doc_en' in C.L else C.L['doc']) + '_' + C.L.get('client_en', C.L['client'])).strip('_')
    name = f"{safe}_{LANGS.get(lang, LANGS['en'])[2]}.pdf"
    w.add_metadata({'/Title': f'{C.L["doc"]} — {C.L["client"]}', '/Author': 'Vishal Singh · The Divine Code Numerology'})
    path = os.path.join(OUT, name); w.write(path)
    n = len(PdfReader(path).pages)
    print(lang, 'pages', n, 'sections at', pages)
    return path

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--out' in args:
        i = args.index('--out'); OUT = os.path.abspath(args[i + 1]); del args[i:i + 2]
    if not args: print(__doc__); sys.exit(1)
    for path in args:
        asyncio.run(render(path))
