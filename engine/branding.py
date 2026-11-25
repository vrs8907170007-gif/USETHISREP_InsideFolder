# -*- coding: utf-8 -*-
"""Mandatory branding for every Divine Code report: the two logos (small, 1:1) at the start and end,
a Credits section with the MRP, and the full disclaimer.

Use in a content file:
    from branding import apply_branding
    ... define L, SECTIONS (via S), SUMMARY ...
    DISCLAIMER = apply_branding(L, S, mrp=6999, package='Life Blueprint', paid=None)

apply_branding():
  * puts both logos on the cover (start of the report) by prefixing L['brand'];
  * adds MRP to the cover meta lines;
  * appends the 'Credits, MRP and disclaimer' section (logos + credits + price + full disclaimer);
  * returns the short disclaimer (with logos, MRP and copyright) for the final summary page (end of the report).
`paid` = the discounted amount the customer actually paid, if different from the MRP."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SIGNOFF = 'SANATANI V (Vishal R Singh)'
# Mandatory closing of every welcome letter (and the final note of the action plan):
SIGN_HTML = ('<p class="sign">With respect and good wishes,<br><b>SANATANI V (Vishal R Singh)</b><br>'
             '<span>The Divine Code Numerology</span></p>')
PRICES = {'snapshot': 499, 'life': 1499, 'name': 2499, 'consult': 3100, 'business': 5100, 'blueprint': 6999}


def _load_logos():
    """The two square logos are embedded in ../branding.py (numerology-engine/branding.py); reuse them from there."""
    import importlib.util
    p = os.path.join(os.path.dirname(HERE), 'branding.py')
    spec = importlib.util.spec_from_file_location('_divine_code_logos', p)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m._LOGOS


_LOGOS = _load_logos()


def _uri(name):
    return 'data:image/jpeg;base64,' + _LOGOS[name]


def logos(size='14mm', align='flex-start', gap='3mm'):
    st = f'width:{size};height:{size};border-radius:2mm;object-fit:cover;border:0.6pt solid #d4af6a;'
    return (f'<div style="display:flex;gap:{gap};justify-content:{align};margin:0 0 3mm;">'
            f'<img src="{_uri("logo_nonchalant.jpg")}" style="{st}" alt="Nonchalant">'
            f'<img src="{_uri("logo_sanatani.jpg")}" style="{st}" alt="Sanatani V"></div>')


def rupees(n):
    s = str(int(n))
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:]); head = head[:-2]
        if head: parts.insert(0, head)
        s = ','.join(parts) + ',' + tail
    return '₹' + s + '/-'


SIGN_HTML_HI = ('<p class="sign">सादर शुभकामनाओं सहित,<br><b>SANATANI V (Vishal R Singh)</b><br>'
                '<span>The Divine Code Numerology</span></p>')


def apply_branding(L, S, mrp, package, paid=None, contact='vsofficial.vercel.app · WhatsApp +91 91365 40798'):
    from blocks import T
    if L.get('lang') == 'hi':
        return _apply_hi(L, S, mrp, package, paid, contact, T)
    price_line = f'MRP {rupees(mrp)}' + (f' · Paid {rupees(paid)}' if paid and paid != mrp else '')
    L['brand'] = logos() + L.get('brand', 'The Divine Code Numerology')
    L['cover_meta'] = list(L.get('cover_meta', [])) + [f'{package} · {price_line}']
    rows = [
        ['Report by', 'SANATANI V (Vishal R Singh) · The Divine Code Numerology'],
        ['Presented with', 'Nonchalant — Live · Learn · Explore (podcast) and Sanatani V — Wisdom Meets Technology'],
        ['Calculations', 'The Divine Code numerology engine — Chaldean name values, Lo Shu grid, Personal Year cycle; every number machine-calculated and arithmetic-checked'],
        ['Report', f'{package} · MRP {rupees(mrp)} (inclusive of all taxes)' + (f' · Amount paid {rupees(paid)}' if paid and paid != mrp else '')],
        ['Contact', contact],
    ]
    S('', 'Credits, MRP and disclaimer', logos('16mm', 'center', '5mm') + '<h3>Credits</h3>' + T(['Item', 'Details'], rows) + '''
<h3>Disclaimer</h3>
<p>This report is for personal reflection and planning, based on numerology and traditional Indian thought. Numerology is a
belief-based practice, not a science; its readings describe tendencies, not certainties.</p>
<ul class="pts">
<li><b>No guarantees.</b> No result — financial, professional, personal or otherwise — is promised or guaranteed. Outcomes
depend on your own decisions, effort and circumstances.</li>
<li><b>Not professional advice.</b> Nothing here is medical, psychological, legal, tax, investment or financial advice. Consult a
qualified doctor for health matters, a CA or registered financial adviser for money and investment decisions, and a lawyer for
legal matters.</li>
<li><b>Names and documents.</b> Spelling suggestions are for signatures and informal use. Do not change legal names or official
documents on the basis of this report.</li>
<li><b>Free remedies only.</b> No gemstones, paid rituals or purchases are recommended or required.</li>
<li><b>Data and fees.</b> Readings are based on the details provided; incorrect details change the results. Personal information
is kept confidential. The fee is for the time and preparation of this personalised report. Decisions you take remain your own
responsibility.</li>
</ul>''')
    return (logos('11mm', 'center', '4mm') +
            f'{package} · {price_line}. Guidance for reflection and planning, based on numerology. Not medical, legal, tax, '
            'investment or financial advice; no result is guaranteed. Keep legal names and documents unchanged. Full disclaimer on '
            'the previous page. © The Divine Code Numerology · Nonchalant · Sanatani V.')


def _apply_hi(L, S, mrp, package, paid, contact, T):
    price_line = f'MRP {rupees(mrp)}' + (f' · भुगतान {rupees(paid)}' if paid and paid != mrp else '')
    L['brand'] = logos() + L.get('brand', 'The Divine Code Numerology')
    L['cover_meta'] = list(L.get('cover_meta', [])) + [f'{package} · {price_line}']
    rows = [
        ['रिपोर्ट', 'SANATANI V (Vishal R Singh) · The Divine Code Numerology'],
        ['प्रस्तुति', 'Nonchalant — Live · Learn · Explore (पॉडकास्ट) और Sanatani V — Wisdom Meets Technology'],
        ['गणना', 'The Divine Code न्यूमरोलॉजी इंजन — कैल्डियन नाम-मान, लो शू ग्रिड, व्यक्तिगत वर्ष चक्र; हर अंक मशीन से गणना और जाँचा गया'],
        ['रिपोर्ट मूल्य', f'{package} · MRP {rupees(mrp)} (सभी करों सहित)' + (f' · भुगतान राशि {rupees(paid)}' if paid and paid != mrp else '')],
        ['संपर्क', contact],
    ]
    S('', 'श्रेय, MRP और अस्वीकरण', logos('16mm', 'center', '5mm') + '<h3>श्रेय</h3>' + T(['विषय', 'विवरण'], rows) + '''
<h3>अस्वीकरण</h3>
<p>यह रिपोर्ट अंक ज्योतिष पर आधारित, व्यक्तिगत चिंतन व योजना हेतु है। अंक ज्योतिष आस्था-आधारित पद्धति है, विज्ञान नहीं।</p>
<ul class="pts">
<li><b>कोई गारंटी नहीं।</b> किसी भी परिणाम का वादा या गारंटी नहीं; परिणाम आपके निर्णयों और प्रयास पर निर्भर हैं।</li>
<li><b>पेशेवर सलाह नहीं।</b> यहाँ कुछ भी चिकित्सा, मनोवैज्ञानिक, कानूनी, कर, निवेश या वित्तीय सलाह नहीं है। स्वास्थ्य के लिए योग्य
डॉक्टर, धन व निवेश के लिए CA या पंजीकृत वित्तीय सलाहकार, और कानूनी विषयों के लिए वकील से परामर्श लें।</li>
<li><b>नाम और दस्तावेज़।</b> वर्तनी के सुझाव केवल हस्ताक्षर और अनौपचारिक उपयोग के लिए हैं। इस रिपोर्ट के आधार पर कानूनी नाम या
सरकारी दस्तावेज़ न बदलें।</li>
<li><b>केवल निःशुल्क उपाय।</b> कोई रत्न, सशुल्क अनुष्ठान या खरीदारी न सुझाई गई है, न आवश्यक है।</li>
<li><b>जानकारी और शुल्क।</b> निष्कर्ष दी गई जानकारी पर आधारित हैं। जानकारी गोपनीय रखी जाती है; शुल्क रिपोर्ट तैयार करने
के श्रम का है। निर्णय आपकी अपनी ज़िम्मेदारी हैं।</li>
</ul>''')
    return (logos('11mm', 'center', '4mm') +
            f'{package} · {price_line}. अंक ज्योतिष पर आधारित चिंतन और योजना हेतु मार्गदर्शन। यह चिकित्सा, कानूनी, कर, निवेश या '
            'वित्तीय सलाह नहीं है; किसी परिणाम की गारंटी नहीं। कानूनी नाम और दस्तावेज़ यथावत रखें। पूरा अस्वीकरण पिछले पृष्ठ पर। '
            '© The Divine Code Numerology · Nonchalant · Sanatani V.')
