// 福彩 / 体彩 选号助手：统计展示 + "避开大众号"的随机选号。每一注中奖概率完全相同。
(function (root) {
  'use strict';
  const GAMES = [
    { id: 'ssq', org: '福彩', name: '双色球', tag: '奖池最高', type: 'lotto', A: [33, 6], B: [16, 1], days: [2, 4, 0], time: '21:15',
      facts: [['一等奖', '1/17,721,088'], ['奖金', '浮动，单注最高 1000 万'], ['中任意奖', '约 6.7%']] },
    { id: 'qlc', org: '福彩', name: '七乐彩', tag: '大奖最容易', type: 'lotto', A: [30, 7], B: null, days: [1, 3, 5], time: '21:15',
      facts: [['一等奖', '1/2,035,800'], ['选号', '30 选 7'], ['奖金', '浮动']] },
    { id: 'fc3d', org: '福彩', name: '福彩3D', tag: '中奖率最高', type: 'digit', P: [10, 10, 10], days: 'daily', time: '21:15', three: true,
      facts: [['直选', '1/1000 · 1040 元'], ['组选三', '346 元'], ['组选六', '1/167 · 173 元']] },
    { id: 'dlt', org: '体彩', name: '大乐透', tag: '奖池最高', type: 'lotto', A: [35, 5], B: [12, 2], days: [1, 3, 6], time: '21:25',
      facts: [['一等奖', '1/21,425,712'], ['奖金', '浮动，追加多拿'], ['单注', '2 元，追加 3 元']] },
    { id: 'pl3', org: '体彩', name: '排列3', tag: '中奖率最高', type: 'digit', P: [10, 10, 10], days: 'daily', time: '21:25', three: true,
      facts: [['直选', '1/1000 · 1040 元'], ['组选三', '346 元'], ['组选六', '1/167 · 173 元']] },
    { id: 'pl5', org: '体彩', name: '排列5', tag: '10 万固定奖', type: 'digit', P: [10, 10, 10, 10, 10], days: 'daily', time: '21:25',
      facts: [['直选', '1/100,000'], ['奖金', '固定 10 万元'], ['选号', '5 位 0–9']] },
    { id: 'qxc', org: '体彩', name: '七星彩', tag: '最高 500 万', type: 'digit', P: [10, 10, 10, 10, 10, 10, 15], since: '2020101', days: [2, 5, 0], time: '21:25',
      facts: [['一等奖', '1/15,000,000'], ['奖金', '浮动，最高 500 万'], ['选号', '前 6 位 0–9，末位 0–14']] },
  ];

  // ---------- 可复现随机数 ----------
  function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, arr, k) { const a = arr.slice(), out = []; while (out.length < k && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const sum = a => a.reduce((x, y) => x + y, 0);
  function pct(arr, p) { const s = arr.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }

  // ---------- 统计 ----------
  function lottoStats(g, data, win) {
    const d = win ? data.slice(-win) : data, N = g.A[0], M = g.B ? g.B[0] : 0;
    const a = Array(N + 1).fill(0), b = Array(M + 1).fill(0);
    d.forEach(x => { x.a.forEach(n => a[n]++); if (g.B) x.b.forEach(n => b[n]++); });
    const aMiss = Array(N + 1).fill(data.length), bMiss = Array(M + 1).fill(data.length);
    for (let i = data.length - 1; i >= 0; i--) {
      const ago = data.length - 1 - i;
      data[i].a.forEach(n => { if (aMiss[n] === data.length) aMiss[n] = ago; });
      if (g.B) data[i].b.forEach(n => { if (bMiss[n] === data.length) bMiss[n] = ago; });
    }
    const sums = data.slice(-1000).map(x => sum(x.a));
    return { n: d.length, a, b, aMiss, bMiss, sumLo: pct(sums, 0.1), sumHi: pct(sums, 0.9) };
  }
  function digitStats(g, data, win) {
    const d = win ? data.slice(-win) : data, L = g.P.length;
    const pos = g.P.map(m => Array(m).fill(0)), miss = g.P.map(m => Array(m).fill(data.length));
    d.forEach(x => x.a.forEach((n, i) => pos[i][n]++));
    for (let i = data.length - 1; i >= 0; i--) { const ago = data.length - 1 - i; data[i].a.forEach((n, p) => { if (miss[p][n] === data.length) miss[p][n] = ago; }); }
    const maxSum = sum(g.P) - L, sums = Array(maxSum + 1).fill(0);
    let z3 = 0, z6 = 0, bz = 0;
    d.forEach(x => { sums[sum(x.a)]++; if (L === 3) { const u = new Set(x.a).size; u === 3 ? z6++ : u === 2 ? z3++ : bz++; } });
    const all = data.slice(-2000).map(x => sum(x.a));
    return { n: d.length, pos, miss, sums, z3, z6, bz, sumLo: pct(all, 0.125), sumHi: pct(all, 0.875) };
  }

  // ---------- 选号 ----------
  function lottoOk(g, a, st, past) {
    const N = g.A[0], k = g.A[1], s = sum(a);
    if (s < st.sumLo || s > st.sumHi) return false;
    const odd = a.filter(n => n % 2).length; if (odd === 0 || odd === k) return false;
    const z = [0, 0, 0]; a.forEach(n => z[Math.min(2, Math.floor((n - 1) * 3 / N))]++); if (z.includes(0)) return false;
    let run = 1; for (let i = 1; i < k; i++) { run = a[i] === a[i - 1] + 1 ? run + 1 : 1; if (run >= 3) return false; }
    if (N > 31 && !a.some(n => n > 31)) return false;          // 避开"全是生日"的大众组合
    if (new Set(a.slice(1).map((n, i) => n - a[i])).size === 1) return false;
    if (past && past.has(a.join(','))) return false;
    return true;
  }
  function lottoPick(r, g, st, mode, past) {
    const N = g.A[0], k = g.A[1], all = range(1, N);
    const hot = all.slice().sort((x, y) => st.a[y] - st.a[x]).slice(0, Math.round(N / 3));
    const cold = all.slice().sort((x, y) => st.aMiss[y] - st.aMiss[x]).slice(0, Math.round(N / 3));
    const h = Math.ceil(k / 2);
    for (let t = 0; t < 8000; t++) {
      let a;
      if (mode === 'hot') { const x = pick(r, hot, h); a = x.concat(pick(r, all.filter(n => !x.includes(n)), k - h)); }
      else if (mode === 'cold') { const x = pick(r, cold, h); a = x.concat(pick(r, all.filter(n => !x.includes(n)), k - h)); }
      else if (mode === 'mix') { const x = pick(r, hot, 2), y = pick(r, cold.filter(n => !x.includes(n)), 2); a = x.concat(y, pick(r, all.filter(n => !x.includes(n) && !y.includes(n)), k - 4)); }
      else a = pick(r, all, k);
      a.sort((x, y) => x - y);
      if (!lottoOk(g, a, st, past)) continue;
      let b = [];
      if (g.B) {
        const M = g.B[0], m = g.B[1], ball = range(1, M);
        const pool = mode === 'hot' ? ball.slice().sort((x, y) => st.b[y] - st.b[x]).slice(0, Math.max(m + 2, 5))
          : mode === 'cold' ? ball.slice().sort((x, y) => st.bMiss[y] - st.bMiss[x]).slice(0, Math.max(m + 2, 5)) : ball;
        b = pick(r, pool, m).sort((x, y) => x - y);
      }
      return { a, b, mode };
    }
    return null;
  }
  function digitPick(r, g, st, kind) {
    for (let t = 0; t < 8000; t++) {
      const a = g.P.map(m => Math.floor(r() * m)), s = sum(a);
      if (s < st.sumLo || s > st.sumHi) continue;
      const u = new Set(g.three ? a : a.slice(0, 6)).size;
      if (u === 1) continue;                                      // 不出豹子
      if (kind === 'z6' && u !== 3) continue;
      if (kind === 'z6') a.sort((x, y) => x - y);
      return { a, kind, sum: s };
    }
    return null;
  }
  function scoped(g, data) { return g.since ? data.filter(x => x.issue >= g.since) : data; }
  function todayPicks(g, data, dateStr) {
    data = scoped(g, data);
    const r = rng(seedOf(g.id + '-' + dateStr));
    if (g.type === 'lotto') {
      const st = lottoStats(g, data, 100), past = new Set(data.map(x => x.a.join(',')));
      return ['mix', 'hot', 'cold', 'rand', 'rand'].map(m => lottoPick(r, g, st, m, past));
    }
    const st = digitStats(g, data, 100);
    return (g.three ? ['zx', 'zx', 'zx', 'z6', 'z6'] : ['zx', 'zx', 'zx', 'zx', 'zx']).map(k => digitPick(r, g, st, k));
  }

  const API = { GAMES, seedOf, rng, lottoStats, digitStats, lottoOk, lottoPick, digitPick, todayPicks, scoped };
  if (typeof module !== 'undefined') { module.exports = API; return; }

  // ---------- 界面 ----------
  const $ = s => document.querySelector(s);
  const p2 = n => String(n).padStart(2, '0');
  const yi = n => n == null ? '—' : n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(0) + ' 万' : n.toLocaleString();
  const ball = (n, c, sm) => `<span class="ball ${c}${sm ? ' sm' : ''}">${c === 'd' ? n : p2(n)}</span>`;
  const modeName = { mix: '冷热搭配', hot: '近期热号', cold: '长期遗漏', rand: '纯随机' };
  const kindName = { zx: '直选', z6: '组选六' };
  const cache = {};
  let org = '福彩', gid = 'ssq', win = 100;
  const todayCN = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  function nextDraw(g) {
    const now = new Date(Date.now() + 8 * 3600e3), [hh, mm] = g.time.split(':').map(Number);
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getTime() + i * 864e5), w = d.getUTCDay();
      if ((g.days === 'daily' || g.days.includes(w)) && (i > 0 || now.getUTCHours() * 60 + now.getUTCMinutes() < hh * 60 + mm))
        return (i === 0 ? '今天' : i === 1 ? '明天' : d.toISOString().slice(5, 10).replace('-', '月') + '日') + ' 周' + '日一二三四五六'[w] + ' ' + g.time;
    }
  }
  const drawDays = g => g.days === 'daily' ? '每天' : '每周' + g.days.slice().sort((a, b) => (a || 7) - (b || 7)).map(w => '日一二三四五六'[w]).join('、');
  const bar = (v, max, label, hl) => `<div class="bar${hl ? ' hl' : ''}"><i style="height:${Math.max(4, v / max * 100)}%"></i><b>${label}</b><em>${v}</em></div>`;
  const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const seg = () => `<span class="seg">${[30, 50, 100, 0].map(w => `<a data-w="${w}" class="${w === win ? 'on' : ''}">${w ? '近' + w + '期' : '全部'}</a>`).join('')}</span>`;
  const fmtPick = (g, p, tag) => g.type === 'lotto'
    ? `<div class="pick">${p.a.map(n => ball(n, 'r', 1)).join('')}${p.b.map(n => ball(n, 'b', 1)).join('')}<span class="tag">${tag}</span></div>`
    : `<div class="pick">${p.a.map(n => ball(n, 'd', 1)).join('')}<span class="tag">${tag}</span></div>`;

  function hero(g, last) {
    const nums = g.type === 'lotto' ? last.a.map(n => ball(n, 'r')).join('') + (last.b || []).map(n => ball(n, 'b')).join('') : last.a.map(n => ball(n, 'd')).join('');
    const facts = g.type === 'lotto' && last.n1 != null
      ? [[yi(last.pool), '奖池'], [last.n1 + ' 注', '上期一等奖'], [last.p1 ? yi(last.p1) : '—', '单注奖金']]
      : g.type === 'lotto' && last.pool != null ? [[yi(last.pool), '奖池'], [g.facts[0][1], g.facts[0][0]], [g.facts[1][1], g.facts[1][0]]]
      : g.facts.map(([k, v]) => [v, k]);
    return `<section class="card hero">
      <div class="k">${g.name} 第 ${last.issue} 期 · ${last.date}${g.id === 'qlc' ? ' · 蓝色为特别号' : ''}</div>
      <div class="balls">${nums}</div>
      <div class="grid3">${facts.map(([v, k]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}</div>
      <div class="note">${drawDays(g)} ${g.time} 开奖｜下期：${nextDraw(g)}｜2 元一注${g.type === 'lotto' && last.pool != null ? '｜' + g.facts.map(f => f.join(' ')).join('，') : ''}</div></section>`;
  }

  function render() {
    document.querySelectorAll('.orgs a').forEach(a => a.classList.toggle('on', a.dataset.o === org));
    $('#games').innerHTML = GAMES.filter(g => g.org === org).map(g => `<a data-g="${g.id}" class="${g.id === gid ? 'on' : ''}">${g.name}${g.tag ? `<small>${g.tag}</small>` : ''}</a>`).join('');
    document.querySelectorAll('#games a').forEach(a => a.onclick = () => { gid = a.dataset.g; win = 100; load(); });
    const g = GAMES.find(x => x.id === gid), all = cache[gid], data = scoped(g, all), last = all[all.length - 1];
    const picks = todayPicks(g, all, todayCN());
    let rule, stats;
    if (g.type === 'lotto') {
      const st = lottoStats(g, data, win), N = g.A[0], maxA = Math.max(...st.a.slice(1));
      const hot = range(1, N).sort((x, y) => st.a[y] - st.a[x]).slice(0, 6), cold = range(1, N).sort((x, y) => st.aMiss[y] - st.aMiss[x]).slice(0, 6);
      rule = `过滤：和值 ${st.sumLo}–${st.sumHi}（近千期中间 80%）、奇偶不全同、三个区间都有号、无三连号${N > 31 ? '、至少一个号 >31（少和"生日号"撞车，中了少人分奖）' : ''}、不与历史开奖重复。`;
      stats = `<div class="k">${g.B ? '前区/红球' : '号码'}出现次数（共 ${st.n} 期）</div>
        ${chunks(range(1, N), N > 30 ? 12 : 10).map(c => `<div class="bars">${c.map(n => bar(st.a[n], maxA, p2(n), hot.includes(n))).join('')}</div>`).join('')}
        ${g.B ? `<div class="k">${g.id === 'dlt' ? '后区' : '蓝球'}出现次数</div><div class="bars blue">${range(1, g.B[0]).map(n => bar(st.b[n], Math.max(...st.b.slice(1)), p2(n))).join('')}</div>` : ''}
        <div class="row2"><div><div class="k">热号</div>${hot.map(n => ball(n, 'r', 1)).join('')}</div><div><div class="k">遗漏最久（期）</div>${cold.map(n => ball(n, 'r', 1) + `<sup>${st.aMiss[n]}</sup>`).join('')}</div></div>`;
    } else {
      const st = digitStats(g, data, win), names = g.P.length === 3 ? ['百位', '十位', '个位'] : g.P.map((_, i) => '第 ' + (i + 1) + ' 位');
      rule = `只过滤和值 ${st.sumLo}–${st.sumHi}（历史中间约 75%）和全相同号码。`;
      stats = names.map((nm, i) => `<div class="k">${nm}出现次数 / 当前遗漏</div><div class="bars d3">${range(0, g.P[i] - 1).map(n => bar(st.pos[i][n], Math.max(...st.pos[i]), n + '<br><small>' + st.miss[i][n] + '</small>')).join('')}</div>`).join('')
        + (g.three ? `<div class="k">和值分布（共 ${st.n} 期）｜组六 ${st.z6}、组三 ${st.z3}、豹子 ${st.bz}</div>${chunks(range(0, 27), 14).map(c => `<div class="bars sums">${c.map(n => bar(st.sums[n], Math.max(...st.sums), n)).join('')}</div>`).join('')}` : '');
    }
    const recent = all.slice(-20).reverse().map(x => g.type === 'lotto'
      ? `<tr><td>${x.issue.slice(2)}<br><small>${x.date.slice(5)}</small></td><td>${x.a.map(p2).join(' ')} <b class="bt">${(x.b || []).map(p2).join(' ')}</b></td><td>${x.pool != null ? yi(x.pool) : ''}</td><td>${x.n1 ?? ''}</td></tr>`
      : `<tr><td>${x.issue}</td><td>${x.date.slice(5)}</td><td><b>${x.a.join(' ')}</b></td><td>${sum(x.a)}</td></tr>`).join('');
    $('#main').innerHTML = hero(g, last) + `
      <section class="card"><h2>今日参考号码 <small>${todayCN()}</small></h2>
        ${picks.filter(Boolean).map(p => fmtPick(g, p, g.type === 'lotto' ? modeName[p.mode] : kindName[p.kind] + ' · 和值 ' + p.sum)).join('')}
        <button id="again">再机选 5 注</button><div id="more"></div><p class="note">${rule}这些规则不会提高中奖概率。</p></section>
      <section class="card"><h2>号码统计 ${seg()}</h2>${g.since ? `<div class="note">七星彩 2020 年 10 月改为新规则，只统计 ${g.since} 期以后。</div>` : ''}${stats}</section>
      <section class="card"><h2>最近 20 期 <a class="dl" href="data/${g.id}.csv" download>下载全部 ${all.length} 期 CSV</a></h2>
        <table><tr>${g.type === 'lotto' ? '<th>期号</th><th>号码</th><th>奖池</th><th>一等</th>' : '<th>期号</th><th>日期</th><th>号码</th><th>和值</th>'}</tr>${recent}</table></section>`;
    $('#again').onclick = () => {
      const r = rng(Date.now());
      if (g.type === 'lotto') { const st = lottoStats(g, data, 100), past = new Set(data.map(x => x.a.join(','))); $('#more').innerHTML = range(1, 5).map(() => fmtPick(g, lottoPick(r, g, st, 'rand', past), '机选')).join(''); }
      else { const st = digitStats(g, data, 100); $('#more').innerHTML = range(1, 5).map(() => { const p = digitPick(r, g, st, 'zx'); return fmtPick(g, p, '机选 · 和值 ' + p.sum); }).join(''); }
    };
    document.querySelectorAll('.seg a').forEach(a => a.onclick = () => { win = +a.dataset.w; render(); });
  }

  async function load() {
    try {
      if (!cache[gid]) { $('#main').innerHTML = '<p class="card">加载开奖数据…</p>'; cache[gid] = await fetch(`data/${gid}.json?t=${Math.floor(Date.now() / 36e5)}`).then(r => r.json()); }
      render();
    } catch (e) { $('#main').innerHTML = '<p class="card">数据加载失败：' + e + '</p>'; }
  }
  root.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.orgs a').forEach(a => a.onclick = () => { org = a.dataset.o; gid = GAMES.find(g => g.org === org).id; win = 100; load(); });
    fetch('data/meta.json?t=' + Date.now()).then(r => r.json()).then(m => { $('#upd').textContent = '数据更新：' + m.updated; }).catch(() => {});
    load();
  });
})(typeof window !== 'undefined' ? window : globalThis);
