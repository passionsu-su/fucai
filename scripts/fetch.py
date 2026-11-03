#!/usr/bin/env python3
"""抓取福彩 双色球 / 福彩3D 全部历史开奖（数据源：500彩票网走势图历史页），
生成 docs/data/ssq.json、docs/data/fc3d.json、docs/data/ssq.csv、docs/data/fc3d.csv。
抓取失败时保留旧数据并以非零码退出前不覆盖。"""
import re, json, csv, sys, os, urllib.request, datetime
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'data')

def get(url):
    req = urllib.request.Request(url, headers=UA)
    raw = urllib.request.urlopen(req, timeout=90).read()
    for enc in ('utf-8', 'gb18030'):
        try: return raw.decode(enc)
        except UnicodeDecodeError: pass
    return raw.decode('utf-8', 'ignore')

def rows(html):
    out = []
    for r in re.findall(r'<tr class="t_tr1">(.*?)</tr>', html, re.S):
        r = re.sub(r'<!--.*?-->', '', r, flags=re.S)
        out.append([re.sub(r'<[^>]+>', '', c).replace('&nbsp;', '').strip()
                    for c in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)])
    return out

def num(s):
    s = s.replace(',', '').strip()
    return int(s) if s.isdigit() else None

def ssq():
    html = get('https://datachart.500.com/ssq/history/newinc/history.php?start=03001&end=99999')
    data = []
    for c in rows(html):
        if len(c) < 16: continue
        data.append({'issue': '20' + c[0] if len(c[0]) == 5 else c[0], 'date': c[15],
                     'red': [int(x) for x in c[1:7]], 'blue': int(c[7]),
                     'pool': num(c[9]), 'n1': num(c[10]), 'p1': num(c[11]),
                     'n2': num(c[12]), 'p2': num(c[13]), 'sales': num(c[14])})
    data.sort(key=lambda d: d['issue'])
    return data

def fc3d():
    y = datetime.date.today().year
    html = get(f'https://datachart.500.com/sd/history/inc/history.php?start=2004001&end={y}999')
    data = []
    for c in rows(html):
        if len(c) < 11: continue
        d = c[1].split()
        if len(d) != 3: continue
        data.append({'issue': c[0], 'date': c[10], 'num': [int(x) for x in d],
                     'sales': num(c[3])})
    data.sort(key=lambda d: d['issue'])
    return data

def save(name, data, fields):
    if len(data) < 1000: raise SystemExit(f'{name}: only {len(data)} rows, keep old data')
    json.dump(data, open(f'{OUT}/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    with open(f'{OUT}/{name}.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); w.writerow([h for h, _ in fields])
        for d in reversed(data): w.writerow([fn(d) for _, fn in fields])
    print(name, len(data), data[-1]['issue'], data[-1]['date'])

os.makedirs(OUT, exist_ok=True)
ok = True
try:
    save('ssq', ssq(), [('期号', lambda d: d['issue']), ('开奖日期', lambda d: d['date']),
        ('红球', lambda d: ' '.join(f'{x:02d}' for x in d['red'])), ('蓝球', lambda d: f"{d['blue']:02d}"),
        ('奖池(元)', lambda d: d['pool']), ('一等奖注数', lambda d: d['n1']), ('一等奖单注(元)', lambda d: d['p1']),
        ('二等奖注数', lambda d: d['n2']), ('二等奖单注(元)', lambda d: d['p2']), ('销售额(元)', lambda d: d['sales'])])
except Exception as e: print('ssq failed', e); ok = False
try:
    save('fc3d', fc3d(), [('期号', lambda d: d['issue']), ('开奖日期', lambda d: d['date']),
        ('开奖号', lambda d: ''.join(map(str, d['num']))), ('销售额(元)', lambda d: d['sales'])])
except Exception as e: print('fc3d failed', e); ok = False
json.dump({'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}, open(f'{OUT}/meta.json', 'w'))
sys.exit(0 if ok else 1)
