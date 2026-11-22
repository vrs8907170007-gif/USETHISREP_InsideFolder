# -*- coding: utf-8 -*-
"""Building blocks for report content files: tables, "What to do" boxes and Lo Shu grids."""

def T(head, rows, cls=''):
    """Table. Start a row's first cell with ★ to highlight it as the recommendation."""
    h = ''.join(f'<th>{x}</th>' for x in head)
    r = ''.join('<tr%s>%s</tr>' % (' class="rec"' if str(row[0]).startswith('★') else '',
                ''.join(f'<td>{str(c).lstrip("★")}</td>' for c in row)) for row in rows)
    return f'<table class="{cls}"><thead><tr>{h}</tr></thead><tbody>{r}</tbody></table>'

def todo_box(items, label='What to do'):
    lis = ''.join(f'<li>{i}</li>' for i in items)
    return f'<div class="todo"><div class="todo-h">{label}</div><ul>{lis}</ul></div>'

def grid_from_counts(counts):
    """counts: facts['client']['loshu']['counts'] (keys may be str or int) -> cells for GRID()."""
    c = {int(k): v for k, v in counts.items()}
    return [[str(p), str(p) * c[p] if c[p] else '—', 1 if c[p] else 0] for p in (4, 9, 2, 3, 5, 7, 8, 1, 6)]

def GRID(cells, cap):
    c = ''.join(f'<div class="g{"" if on else " off"}"><span class="pos">{p}</span>{v}</div>' for p, v, on in cells)
    return f'<div class="grid-wrap"><div class="grid">{c}</div><div class="grid-cap">{cap}</div></div>'
