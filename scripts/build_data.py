"""Regenera data/data.js a partir de los CSV de data/. Uso: python scripts/build_data.py"""
import pandas as pd, json
d = pd.read_csv('data/def_area_2004_2019.csv', encoding='utf-8-sig').set_index('Ano/Estados')
f = pd.read_csv('data/inpe_brazilian_amazon_fires_1999_2019.csv')
e = pd.read_csv('data/el_nino_la_nina_1999_2019.csv', encoding='utf-8-sig')
fm = {'ACRE':'AC','AMAZONAS':'AM','AMAPA':'AP','MARANHAO':'MA','MATO GROSSO':'MT','PARA':'PA','RONDONIA':'RO','RORAIMA':'RR','TOCANTINS':'TO'}
f['st'] = f.state.map(fm)
fy = f.groupby('year').firespots.sum()
fs = f.groupby(['st','year']).firespots.sum().unstack(0).fillna(0).astype(int)
data = {
  'defor': {int(y): int(v) for y, v in d['AMZ LEGAL'].items()},
  'deforState': {s: {int(y): int(v) for y, v in d[s].items()} for s in fm.values()},
  'fires': {int(y): int(v) for y, v in fy.items()},
  'firesState': {s: {int(y): int(v) for y, v in fs[s].items()} for s in fm.values()},
  'enso': [{'start': int(r['start year']), 'end': int(r['end year']), 'phase': r.phenomenon.strip(), 'sev': r.severity.strip()} for _, r in e.iterrows()],
}
open('data/data.js', 'w', encoding='utf-8').write('window.AMAZONIA_DATA = ' + json.dumps(data) + ';\n')
print('data/data.js actualizado')
