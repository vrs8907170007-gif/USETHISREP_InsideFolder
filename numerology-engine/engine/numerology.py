# -*- coding: utf-8 -*-
"""Command-line entry point. See numbers_lib.py for the calculations.

  python3 numerology.py booking.json [--today YYYY-MM-DD] > facts.json
  python3 numerology.py --name "Vishal Singh" "Divine Code"
  python3 numerology.py --spell "Vishal Singh" --target 5,6
  python3 numerology.py --dates 2027-04 --want 5,6
  python3 numerology.py --digits "MH01 AQ 7979" "403"
"""
import os, runpy, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'numbers_lib.py'), run_name='__main__')
