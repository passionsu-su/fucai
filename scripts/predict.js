#!/usr/bin/env node
// 保存每期"参考号码"，开奖后与实际号码对比，统计命中情况。
// 输出 docs/data/predictions.json：
//   live     实盘：开奖前由 Actions 生成并提交（git 历史可证明生成时间早于开奖）
//   backtest 回测：用每期开奖前的历史数据、同一算法补算最近 BACKTEST 期
// 号码由 app.js 的 todayPicks 生成，种子 = 玩法 + 上一期期号，网页显示的就是这里存的号码。
'use strict';
const fs = require('fs'), path = require('path');
const A = require('../docs/app.js');
const DIR = path.join(__dirname, '..', 'docs', 'data');
const OUT = g => path.join(DIR, 'pred-' + g + '.json');
const BACKTEST = +(process.env.BACKTEST || 100);
const KEEP_LIVE = 400;

const C = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
const hyper = (N, k, r) => C(k, r) * C(N - k, k - r) / C(N, k);   // 选 k 个、开 k 个，命中 r 个的概率

// 中奖条件（达到最低奖级即算"中奖"），只看命中个数，不区分具体奖级
const WIN = {
  ssq: (r, b) => r >= 4 || b >= 1,                 // 六等奖：蓝球中即中
  dlt: (r, b) => r + b >= 3 || b === 2,            // 最低奖级：3+0、2+1、1+2、0+2
  qlc: (r, s) => r >= 4,                           // 七等奖：基本号中 4 个
};
function theory(g) {
  if (g.id === 'ssq') { let p = 0; for (let r = 0; r <= 6; r++) for (const b of [0, 1]) if (WIN.ssq(r, b)) p += hyper(33, 6, r) * (b ? 1 / 16 : 15 / 16); return { win: p, avg: 6 * 6 / 33 + 1 / 16 }; }
  if (g.id === 'dlt') { let p = 0; for (let r = 0; r <= 5; r++) for (let b = 0; b <= 2; b++) if (WIN.dlt(r, b)) p += hyper(35, 5, r) * hyper(12, 2, b); return { win: p, avg: 5 * 5 / 35 + 2 * 2 / 12 }; }
  if (g.id === 'qlc') { let p = 0; for (let r = 4; r <= 7; r++) p += hyper(30, 7, r); return { win: p, avg: 7 * 7 / 30 }; }
  if (g.three) return { win: null, avg: 0.3 };      // 直选 1/1000、组六 6/1000，按每注类型分别计算
  if (g.id === 'pl5') return { win: 1e-5, avg: 0.5 };
  if (g.id === 'qxc') return { win: null, avg: 0.6 + 1 / 15 };
}
function judge(g, pick, draw) {
  if (g.type === 'lotto') {
    const r = pick.a.filter(n => draw.a.includes(n)).length;
    if (g.id === 'qlc') { const s = pick.a.filter(n => draw.b.includes(n)).length; return { r, s, hits: r, win: WIN.qlc(r, s), label: r + (s ? '+特' : '') }; }
    const b = pick.b.filter(n => draw.b.includes(n)).length;
    return { r, b, hits: r + b, win: WIN[g.id](r, b), label: r + '+' + b };
  }
  const pos = pick.a.filter((n, i) => draw.a[i] === n).length;
  if (g.three) {
    const same = pick.a.slice().sort().join() === draw.a.slice().sort().join();
    const win = pick.kind === 'z6' ? same && new Set(draw.a).size === 3 : pos === 3;
    return { hits: pos, win, label: pick.kind === 'z6' ? (same ? '组六中' : '组六未中') : pos + '位对' };
  }
  return { hits: pos, win: g.id === 'pl5' ? pos === 5 : null, label: pos + '位对' };
}
const nextAfter = (data, issue) => data.find(x => x.issue > issue);

const updated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
for (const g of A.GAMES) {
  const file = path.join(DIR, g.id + '.json');
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8')).sort((x, y) => x.issue < y.issue ? -1 : 1);
  const old = fs.existsSync(OUT(g.id)) ? JSON.parse(fs.readFileSync(OUT(g.id), 'utf8')) : {};
  const make = (upto) => A.todayPicks(g, upto, '#' + upto[upto.length - 1].issue).filter(Boolean)
    .map(p => g.type === 'lotto' ? { a: p.a, b: p.b, mode: p.mode } : { a: p.a, kind: p.kind });

  // 实盘：保留旧记录（开奖前生成的号码不能改），补对比结果，再为下一期生成一条
  const live = (old.live || []).map(e => {
    if (e.result) return e;
    const d = nextAfter(data, e.after);
    return d ? { ...e, issue: d.issue, date: d.date, result: { a: d.a, b: d.b }, hits: e.picks.map(p => judge(g, p, d)) } : e;
  });
  const last = data[data.length - 1];
  if (!live.some(e => e.after === last.issue))
    live.push({ after: last.issue, made: updated, picks: make(data) });

  // 回测：每期只用它之前的数据
  const backtest = [];
  for (let i = Math.max(200, data.length - BACKTEST); i < data.length; i++) {
    const upto = data.slice(0, i), d = data[i], picks = make(upto);
    backtest.push({ after: upto[upto.length - 1].issue, issue: d.issue, date: d.date, picks, result: { a: d.a, b: d.b }, hits: picks.map(p => judge(g, p, d)) });
  }
  const summarize = list => {
    const done = list.filter(e => e.result), tickets = done.flatMap(e => e.hits), n = tickets.length;
    if (!n) return { draws: 0, tickets: 0 };
    const wins = tickets.filter(h => h.win).length, judged = tickets.filter(h => h.win !== null).length;
    const dist = {}; tickets.forEach(h => dist[h.label] = (dist[h.label] || 0) + 1);
    return { draws: done.length, tickets: n, wins, winRate: judged ? wins / judged : null,
             avgHits: tickets.reduce((s, h) => s + h.hits, 0) / n, best: Object.keys(dist).sort().reverse()[0], dist };
  };
  const th = theory(g);
  if (g.three) {   // 3 注直选 + 2 注组六 的随机期望中奖率
    const per = [];
    backtest.concat(live).forEach(e => e.picks.forEach(p => per.push(p.kind === 'z6' ? 0.006 : 0.001)));
    th.win = per.length ? per.reduce((s, x) => s + x, 0) / per.length : 0.0028;
  }
  const s = { name: g.name, theory: th, liveStats: summarize(live), backtestStats: summarize(backtest),
                      live: live.slice(-KEEP_LIVE), backtest };
  fs.writeFileSync(OUT(g.id), JSON.stringify(s));
  console.log(`${g.name}: 实盘 ${s.liveStats.draws} 期 · 回测 ${s.backtestStats.draws} 期 中奖率 ${s.backtestStats.winRate == null ? '-' : (s.backtestStats.winRate * 100).toFixed(2) + '%'}（随机期望 ${th.win == null ? '-' : (th.win * 100).toFixed(2) + '%'}）平均命中 ${s.backtestStats.avgHits?.toFixed(2)}（期望 ${th.avg.toFixed(2)}）`);
}
