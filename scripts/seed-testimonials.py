# -*- coding: utf-8 -*-
"""
Emits the seed half of migrations/010_testimonials.sql from the content file.

The ten comments were editorial content until the practice asked to collect
them through the site; generating the INSERTs rather than retyping them keeps
the Persian byte-identical to what is already published.

    python scripts/seed-testimonials.py
"""
import io
import re

src = io.open('src/content/testimonials.ts', encoding='utf-8').read()

entries = re.findall(
    r"\{\s*name:\s*'([^']*)',\s*countryCode:\s*'([^']*)',\s*quote:\s*'((?:[^'\\]|\\.)*)',\s*\}",
    src,
)
assert len(entries) == 10, len(entries)

rows = []
for name, code, quote in entries:
    quote = quote.replace("\\'", "'").replace("''", "'")
    rows.append(
        "  ('%s', '%s', '%s', 'approved')"
        % (name.replace("'", "''"), code, quote.replace("'", "''"))
    )

print("insert into testimonial (name, country_code, quote, status) values")
print(',\n'.join(rows) + ';')
