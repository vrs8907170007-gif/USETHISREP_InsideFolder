# -*- coding: utf-8 -*-
# TEMPLATE for one language of one report. Copy to the work folder as content_en.py (and content_hi.py if Hindi is
# requested), replace everything, and keep the four names L, SECTIONS, SUMMARY, DISCLAIMER.
# Every number must come from facts.json (engine/numerology.py). Fictional client shown: Priya Sharma, born 14/08/1990.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
from blocks import T, todo_box, GRID, grid_from_counts  # noqa: E402

L = dict(
  lang='en', html_lang='en',                       # 'hi' for the Hindi edition
  brand='The Divine Code Numerology',
  doc='Complete Life Report', doc_en='Complete Life Report',
  cover_kicker='The Divine Code · Complete Life Report',
  cover_title='Complete Life Report',
  cover_for='Prepared for',
  client='Priya Sharma', client_en='Priya Sharma',
  cover_meta=['Born 14 August 1990', 'Personal forecast: January – December 2027'],
  cover_date='Prepared January 2027',
  cover_edition='English edition',
  contents='Contents', todo='What to do', page='Page',
  footer_conf='Prepared personally for Priya Sharma · Confidential',
  file_name='Complete_Life_Report_Priya_Sharma',      # PDF file name (ASCII); language suffix is added
)
TODO = lambda items: todo_box(items, L['todo'])

SECTIONS = []
def S(num, title, html):
    SECTIONS.append(dict(num=num, title=title, html=html))

S('', 'How to read this report', '''
<p class="lead">This report was written around the goals you shared: starting your own clothing boutique, buying a home, and feeling less stuck at work.</p>
<p>Each section explains what your numbers show and ends with a short <b>What to do</b> box.</p>
''')

S('1', 'Welcome letter', '''<div class="letter"><p>Dear Priya,</p><p>You told me you want to build something of your own…</p>
<p class="sign">With respect,<br><b>Vishal Singh</b><br><span>The Divine Code Numerology</span></p></div>''')

S('2', 'Your core numbers at a glance', T(['Number', 'Priya'], [
  ['Moolank (birth day)', '<b>5</b> · Mercury'],
  ['Bhagyank (full date)', '1+4+0+8+1+9+9+0 = 32 → <b>5</b> · Mercury'],
  ['Name number: "Priya Sharma"', '29 → 11 → <b>2</b> · Moon'],
  ['Personal Year 2027', '1+4+0+8 + 2+0+2+7 = 24 → <b>6</b>'],
]) + TODO(['Use the 5th, 14th or 23rd of a month for launches.']))

# Name tables: first cell = the name, second = Chaldean total, third = reduced number (check.py verifies these rows).
S('3', 'Name analysis', T(['Name', 'Total', 'Number', 'Reading'], [
  ['Priya Sharma', '29 → 11', '2', 'Moon: gentle, but not matched to her double 5.'],
  ['★Priyaa Sharrma', '32', '5', 'Matches both birth numbers. Recommended.'],
]))

# Lo Shu grid from facts: GRID(grid_from_counts(facts['client']['loshu']['counts']), caption)
S('4', 'Your Lo Shu grid', GRID(grid_from_counts({'1': 2, '2': 0, '3': 0, '4': 1, '5': 2, '6': 0, '7': 0, '8': 1, '9': 2}),
                                'Priya · 14 Aug 1990 · missing: 2, 3, 6, 7'))

SUMMARY = dict(
  title='Your summary card', sub='Save this page on your phone.', name='Priya Sharma',
  nums=[('5', 'Moolank'), ('5', 'Bhagyank'), ('2', 'Name'), ('6', '2027')],
  rows=[('Lucky dates', '5, 14, 23'), ('Best day', 'Wednesday'), ('Colours', 'Green · light grey')],
  steps=['Sign as "Priyaa Sharrma"', 'Launch in April 2027', 'Buy the home in September'],
)

DISCLAIMER = ('This report is guidance for reflection and planning, based on numerology. It is not financial, legal, medical or '
              'psychological advice, and it does not guarantee any result.')
