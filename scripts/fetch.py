#!/usr/bin/env python3
"""抓取福彩（双色球、福彩3D、七乐彩）和体彩（大乐透、排列3、排列5、七星彩）全部历史开奖。
数据源：500彩票网走势图历史页。输出 docs/data/<玩法>.json / .csv 和 meta.json。
某个玩法抓取失败时保留它的旧数据。"""
import re, json, csv, sys, os, time, urllib.request, datetime
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'data')
B = 'https://datachart.500.com/'

def get(url):
    for i in range(4):
        try:
            raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
            for enc in ('utf-8', 'gb18030'):
                try: return raw.decode(enc)
                except UnicodeDecodeError: pass
        except Exception as e:
            print('  retry', i + 1, e); time.sleep(5 * (i + 1))
    raise RuntimeError('fetch failed ' + url)

def rows(html):
    out = []
    for r in re.findall(r'<tr class="t_tr1">(.*?)</tr>', html, re.S):
        r = re.sub(r'<!--.*?-->', '', r, flags=re.S)
        c = [re.sub(r'<[^>]+>', '', x).replace('&nbsp;', '').replace('&nbsp', '').strip() for x in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)]
        if c and re.fullmatch(r'\d{5,7}', c[0]): out.append(c)
    return out

def num(s):
    s = (s or '').replace(',', '').strip()
    return int(s) if s.isdigit() else None
def iss(s): return '20' + s if len(s) == 5 else s
Y = datetime.date.today().year % 100

GAMES = {
  # 福彩
  'ssq':  dict(url=f'{B}ssq/history/newinc/history.php?start=03001&end={Y}999',
               parse=lambda c: dict(issue=iss(c[0]), date=c[15], a=[int(x) for x in c[1:7]], b=[int(c[7])],
                                    pool=num(c[9]), n1=num(c[10]), p1=num(c[11]), sales=num(c[14])), min=16),
  'fc3d': dict(url=f'{B}sd/history/inc/history.php?start=2004001&end=20{Y}999',
               parse=lambda c: dict(issue=c[0], date=c[10], a=[int(x) for x in c[1].split()], sales=num(c[3])), min=11),
  'qlc':  dict(url=f'{B}qlc/history/newinc/history.php?start=07001&end={Y}999',
               parse=lambda c: (lambda n: dict(issue=iss(c[0]), date=c[-1], a=[int(x) for x in n[:7]], b=[int(n[7])],
                                               sales=num(c[3]), pool=num(c[4])))(c[1].split()), min=5),
  # 体彩
  'dlt':  dict(url=f'{B}dlt/history/newinc/history.php?start=07001&end={Y}999',
               parse=lambda c: dict(issue=iss(c[0]), date=c[14], a=[int(x) for x in c[1:6]], b=[int(x) for x in c[6:8]],
                                    pool=num(c[8]), n1=num(c[9]), p1=num(c[10]), sales=num(c[13])), min=15),
  'pl3':  dict(url=f'{B}pls/history/inc/history.php?start=04001&end={Y}999&limit=30000',
               parse=lambda c: dict(issue=iss(c[0]), date=c[-1], a=[int(x) for x in c[1].split()], sales=num(c[3])), min=5),
  'pl5':  dict(url=f'{B}plw/history/inc/history.php?start=04001&end={Y}999&limit=30000',
               parse=lambda c: dict(issue=iss(c[0]), date=c[-1], a=[int(x) for x in c[1].split()], sales=num(c[3])), min=5),
  'qxc':  dict(url=f'{B}qxc/history/inc/history.php?start=04001&end={Y}999',
               parse=lambda c: dict(issue=iss(c[0]), date=c[-1], a=[int(x) for x in c[1].split()], sales=num(c[3])), min=5),
}
NAMES = {'ssq': '双色球', 'fc3d': '福彩3D', 'qlc': '七乐彩', 'dlt': '大乐透', 'pl3': '排列3', 'pl5': '排列5', 'qxc': '七星彩'}

def save(gid, data):
    if len(data) < 500: raise RuntimeError(f'only {len(data)} rows')
    data.sort(key=lambda d: d['issue'])
    json.dump(data, open(f'{OUT}/{gid}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    keys = [k for k in ('pool', 'n1', 'p1', 'sales') if any(k in d for d in data)]
    head = {'pool': '奖池(元)', 'n1': '一等奖注数', 'p1': '一等奖单注(元)', 'sales': '销售额(元)'}
    with open(f'{OUT}/{gid}.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f); w.writerow(['期号', '开奖日期', '号码'] + (['后区/特别号'] if 'b' in data[0] else []) + [head[k] for k in keys])
        for d in reversed(data):
            sep = ' ' if 'b' in d else ''
            w.writerow([d['issue'], d['date'], sep.join(f'{x:02d}' if 'b' in d else str(x) for x in d['a'])] +
                       ([' '.join(f'{x:02d}' for x in d['b'])] if 'b' in d else []) + [d.get(k) for k in keys])
    print(f'{gid} {NAMES[gid]}: {len(data)} 期, 最新 {data[-1]["issue"]} {data[-1]["date"]}')

os.makedirs(OUT, exist_ok=True)
only = sys.argv[1:] or list(GAMES)
fail = []
for gid in only:
    g = GAMES[gid]
    try:
        data = [g['parse'](c) for c in rows(get(g['url'])) if len(c) >= g['min']]
        save(gid, data)
    except Exception as e:
        print(gid, 'FAILED', e); fail.append(gid)
json.dump({'updated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC'), 'failed': fail},
          open(f'{OUT}/meta.json', 'w'), ensure_ascii=False)
sys.exit(1 if len(fail) == len(only) else 0)
