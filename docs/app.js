// 福彩选号助手：只做统计展示与"避开大众号"的随机选号。每组号码中奖概率完全相同。
(function (root) {
  'use strict';

  // ---------- 可复现的随机数（按日期做种子，同一天"今日推荐"不变） ----------
  function seedOf(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function pick(r, arr, k) { const a = arr.slice(), out = []; while (out.length < k && a.length) out.push(a.splice(Math.floor(r() * a.length), 1)[0]); return out; }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  // ---------- 统计 ----------
  function ssqStats(data, win) {
    const d = win ? data.slice(-win) : data;
    const red = Array(34).fill(0), blue = Array(17).fill(0);
    d.forEach(x => { x.red.forEach(n => red[n]++); blue[x.blue]++; });
    const redMiss = Array(34).fill(data.length), blueMiss = Array(17).fill(data.length);
    for (let i = data.length - 1; i >= 0; i--) {
      const ago = data.length - 1 - i;
      data[i].red.forEach(n => { if (redMiss[n] === data.length) redMiss[n] = ago; });
      if (blueMiss[data[i].blue] === data.length) blueMiss[data[i].blue] = ago;
    }
    return { n: d.length, red, blue, redMiss, blueMiss };
  }
  function d3Stats(data, win) {
    const d = win ? data.slice(-win) : data;
    const pos = [0, 1, 2].map(() => Array(10).fill(0));
    const sums = Array(28).fill(0);
    let z3 = 0, z6 = 0, bz = 0;
    d.forEach(x => { x.num.forEach((n, i) => pos[i][n]++); sums[x.num[0] + x.num[1] + x.num[2]]++; const u = new Set(x.num).size; if (u === 3) z6++; else if (u === 2) z3++; else bz++; });
    const miss = [0, 1, 2].map(() => Array(10).fill(data.length));
    for (let i = data.length - 1; i >= 0; i--) { const ago = data.length - 1 - i; data[i].num.forEach((n, p) => { if (miss[p][n] === data.length) miss[p][n] = ago; }); }
    return { n: d.length, pos, sums, z3, z6, bz, miss };
  }

  // ---------- 选号：只过滤极端形态，并尽量避开大众偏爱号码 ----------
  function ssqOk(red, pastSet) {
    const s = red.reduce((a, b) => a + b, 0);
    if (s < 70 || s > 140) return false;                          // 和值落在历史最常见区间
    const odd = red.filter(n => n % 2).length; if (odd === 0 || odd === 6) return false;
    const z = [0, 0, 0]; red.forEach(n => z[n <= 11 ? 0 : n <= 22 ? 1 : 2]++); if (z.includes(0)) return false;
    let run = 1, maxRun = 1; for (let i = 1; i < 6; i++) { run = red[i] === red[i - 1] + 1 ? run + 1 : 1; maxRun = Math.max(maxRun, run); } if (maxRun >= 3) return false;
    if (red.filter(n => n > 31).length < 1) return false;         // 至少一个 >31，避开"全是生日"的大众组合，中了少人分
    const gaps = new Set(red.slice(1).map((n, i) => n - red[i])); if (gaps.size === 1) return false; // 等差数列
    if (pastSet && pastSet.has(red.join(','))) return false;      // 与历史开奖红球完全相同
    return true;
  }
  function ssqPick(r, st, mode, pastSet) {
    const hot = range(1, 33).sort((a, b) => st.red[b] - st.red[a]).slice(0, 11);
    const cold = range(1, 33).sort((a, b) => st.redMiss[b] - st.redMiss[a]).slice(0, 11);
    for (let t = 0; t < 5000; t++) {
      let red;
      if (mode === 'hot') red = pick(r, hot, 3).concat(pick(r, range(1, 33).filter(n => !hot.includes(n)), 3));
      else if (mode === 'cold') red = pick(r, cold, 3).concat(pick(r, range(1, 33).filter(n => !cold.includes(n)), 3));
      else if (mode === 'mix') { const h = pick(r, hot, 2), c = pick(r, cold.filter(n => !h.includes(n)), 2); red = h.concat(c, pick(r, range(1, 33).filter(n => !h.includes(n) && !c.includes(n)), 2)); }
      else red = pick(r, range(1, 33), 6);
      red.sort((a, b) => a - b);
      if (new Set(red).size === 6 && ssqOk(red, pastSet)) {
        let blue;
        if (mode === 'hot') blue = range(1, 16).sort((a, b) => st.blue[b] - st.blue[a])[Math.floor(r() * 4)];
        else if (mode === 'cold') blue = range(1, 16).sort((a, b) => st.blueMiss[b] - st.blueMiss[a])[Math.floor(r() * 4)];
        else blue = 1 + Math.floor(r() * 16);
        return { red, blue, mode };
      }
    }
    return null;
  }
  function d3Pick(r, st, kind) {
    for (let t = 0; t < 5000; t++) {
      const n = [0, 1, 2].map(() => Math.floor(r() * 10)); const s = n[0] + n[1] + n[2]; const u = new Set(n).size;
      if (s < 8 || s > 19) continue;                                 // 和值 8-19 覆盖约 75% 的组合
      if (kind === 'z6' && u !== 3) continue;
      if (kind === 'z3' && u !== 2) continue;
      if (kind === 'zx' && u === 1) continue;
      if (kind !== 'zx') n.sort((a, b) => a - b);
      return { num: n, kind, sum: s };
    }
    return null;
  }

  function todayPicks(ssqData, d3Data, dateStr) {
    const r = rng(seedOf('fucai-' + dateStr));
    const st = ssqStats(ssqData, 100), past = new Set(ssqData.map(x => x.red.join(',')));
    const ssq = ['mix', 'hot', 'cold', 'rand', 'rand'].map(m => ssqPick(r, st, m, past));
    const d3s = d3Stats(d3Data, 100);
    const d3 = [d3Pick(r, d3s, 'zx'), d3Pick(r, d3s, 'zx'), d3Pick(r, d3s, 'zx'), d3Pick(r, d3s, 'z6'), d3Pick(r, d3s, 'z6')];
    return { ssq, d3 };
  }

  const API = { seedOf, rng, ssqStats, d3Stats, ssqOk, ssqPick, d3Pick, todayPicks };
  if (typeof module !== 'undefined') { module.exports = API; return; }
  root.Fucai = API;

  // ---------- 界面 ----------
  const $ = s => document.querySelector(s);
  const p2 = n => String(n).padStart(2, '0');
  const yi = n => n == null ? '—' : n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(0) + ' 万' : n.toLocaleString();
  const ball = (n, c, small) => `<span class="ball ${c}${small ? ' sm' : ''}">${c === 'd' ? n : p2(n)}</span>`;
  const modeName = { mix: '冷热搭配', hot: '近期热号', cold: '长期遗漏', rand: '纯随机' };
  const kindName = { zx: '直选', z6: '组选六', z3: '组选三' };
  let SSQ = [], D3 = [], tab = 'ssq', win = 100;

  function todayCN() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function nextSsq() { // 周二、四、日 21:15 开奖
    const now = new Date(Date.now() + 8 * 3600e3); for (let i = 0; i < 8; i++) { const d = new Date(now.getTime() + i * 864e5); const w = d.getUTCDay(); if ([0, 2, 4].includes(w) && (i > 0 || now.getUTCHours() * 60 + now.getUTCMinutes() < 21 * 60 + 15)) return d.toISOString().slice(5, 10).replace('-', '月') + '日 周' + '日一二三四五六'[w] + ' 21:15'; }
  }

  function bar(v, max, label, hl) { return `<div class="bar${hl ? ' hl' : ''}"><i style="height:${Math.max(4, v / max * 100)}%"></i><b>${label}</b><em>${v}</em></div>`; }

  function renderSsq() {
    const last = SSQ[SSQ.length - 1], st = ssqStats(SSQ, win);
    const maxR = Math.max(...st.red.slice(1)), maxB = Math.max(...st.blue.slice(1));
    const hot = st.red.map((v, i) => [i, v]).slice(1).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
    const cold = st.redMiss.map((v, i) => [i, v]).slice(1).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const picks = todayPicks(SSQ, D3, todayCN()).ssq;
    $('#main').innerHTML = `
    <section class="card hero">
      <div class="k">双色球 第 ${last.issue} 期 · ${last.date}</div>
      <div class="balls">${last.red.map(n => ball(n, 'r')).join('')}${ball(last.blue, 'b')}</div>
      <div class="grid3"><div><b>${yi(last.pool)}</b><span>奖池</span></div><div><b>${last.n1 ?? '—'} 注</b><span>一等奖</span></div><div><b>${yi(last.p1)}</b><span>单注奖金</span></div></div>
      <div class="note">下期开奖：${nextSsq()}｜2 元一注，一等奖概率 1/17,721,088，中任意奖约 6.7%</div>
    </section>
    <section class="card">
      <h2>今日参考号码 <small>${todayCN()}</small></h2>
      ${picks.map(p => `<div class="pick">${p.red.map(n => ball(n, 'r', 1)).join('')}${ball(p.blue, 'b', 1)}<span class="tag">${modeName[p.mode]}</span></div>`).join('')}
      <button id="again">再机选 5 注</button><div id="more"></div>
      <p class="note">过滤规则：和值 70–140、奇偶不全同、三个区间都有号、无三连号、至少一个红球 &gt;31（少和"生日号"撞车，万一中了少人分奖）、不与历史开奖重复。这些规则不会提高中奖概率。</p>
    </section>
    <section class="card">
      <h2>号码统计 <span class="seg">${[30, 50, 100, 0].map(w => `<a data-w="${w}" class="${w === win ? 'on' : ''}">${w ? '近' + w + '期' : '全部'}</a>`).join('')}</span></h2>
      <div class="k">红球出现次数（共 ${st.n} 期）</div>
      ${[1, 12, 23].map(a => `<div class="bars">${range(a, a + 10).map(n => bar(st.red[n], maxR, p2(n), hot.includes(n))).join('')}</div>`).join('')}
      <div class="k">蓝球出现次数</div>
      <div class="bars blue">${range(1, 16).map(n => bar(st.blue[n], maxB, p2(n))).join('')}</div>
      <div class="row2"><div><div class="k">热号</div>${hot.map(n => ball(n, 'r', 1)).join('')}</div><div><div class="k">遗漏最久（期）</div>${cold.map(([n, m]) => ball(n, 'r', 1) + `<sup>${m}</sup>`).join('')}</div></div>
    </section>
    <section class="card"><h2>最近 20 期 <a class="dl" href="data/ssq.csv" download>下载全部 ${SSQ.length} 期 CSV</a></h2>
      <table><tr><th>期号</th><th>号码</th><th>奖池</th><th>一等</th></tr>
      ${SSQ.slice(-20).reverse().map(x => `<tr><td>${x.issue.slice(2)}<br><small>${x.date.slice(5)}</small></td><td>${x.red.map(p2).join(' ')} <b class="bt">${p2(x.blue)}</b></td><td>${yi(x.pool)}</td><td>${x.n1 ?? ''}</td></tr>`).join('')}
      </table></section>`;
    bind(() => { const r = rng(Date.now()), s = ssqStats(SSQ, 100), past = new Set(SSQ.map(x => x.red.join(','))); $('#more').innerHTML = range(1, 5).map(() => ssqPick(r, s, 'rand', past)).map(p => `<div class="pick">${p.red.map(n => ball(n, 'r', 1)).join('')}${ball(p.blue, 'b', 1)}<span class="tag">机选</span></div>`).join(''); });
  }

  function renderD3() {
    const last = D3[D3.length - 1], st = d3Stats(D3, win);
    const picks = todayPicks(SSQ, D3, todayCN()).d3;
    const maxS = Math.max(...st.sums);
    $('#main').innerHTML = `
    <section class="card hero">
      <div class="k">福彩3D 第 ${last.issue} 期 · ${last.date}</div>
      <div class="balls">${last.num.map(n => ball(n, 'd')).join('')}</div>
      <div class="grid3"><div><b>1,040 元</b><span>直选 1/1000</span></div><div><b>346 元</b><span>组选三</span></div><div><b>173 元</b><span>组选六 1/167</span></div></div>
      <div class="note">每天 21:15 开奖｜2 元一注。中奖率是福彩里最高的，但固定奖金、没有奖池</div>
    </section>
    <section class="card">
      <h2>今日参考号码 <small>${todayCN()}</small></h2>
      ${picks.map(p => `<div class="pick">${p.num.map(n => ball(n, 'd', 1)).join('')}<span class="tag">${kindName[p.kind]} · 和值 ${p.sum}</span></div>`).join('')}
      <button id="again">再机选 5 注</button><div id="more"></div>
      <p class="note">只过滤和值 8–19（占全部组合约 75%）和豹子号，不会提高中奖概率。</p>
    </section>
    <section class="card">
      <h2>号码统计 <span class="seg">${[30, 50, 100, 0].map(w => `<a data-w="${w}" class="${w === win ? 'on' : ''}">${w ? '近' + w + '期' : '全部'}</a>`).join('')}</span></h2>
      ${['百位', '十位', '个位'].map((nm, i) => { const m = Math.max(...st.pos[i]); return `<div class="k">${nm}出现次数 / 当前遗漏</div><div class="bars d3">${range(0, 9).map(n => bar(st.pos[i][n], m, n + '<br><small>' + st.miss[i][n] + '</small>')).join('')}</div>`; }).join('')}
      <div class="k">和值分布（共 ${st.n} 期）｜组六 ${st.z6}、组三 ${st.z3}、豹子 ${st.bz}</div>
      ${[0, 14].map(a => `<div class="bars sums">${range(a, a + 13).map(n => bar(st.sums[n], maxS, n)).join('')}</div>`).join('')}
    </section>
    <section class="card"><h2>最近 20 期 <a class="dl" href="data/fc3d.csv" download>下载全部 ${D3.length} 期 CSV</a></h2>
      <table><tr><th>期号</th><th>日期</th><th>号码</th><th>形态</th></tr>
      ${D3.slice(-20).reverse().map(x => { const u = new Set(x.num).size; return `<tr><td>${x.issue}</td><td>${x.date.slice(5)}</td><td><b>${x.num.join(' ')}</b></td><td>${u === 3 ? '组六' : u === 2 ? '组三' : '豹子'} · ${x.num[0] + x.num[1] + x.num[2]}</td></tr>`; }).join('')}
      </table></section>`;
    bind(() => { const r = rng(Date.now()), s = d3Stats(D3, 100); $('#more').innerHTML = range(1, 5).map(() => d3Pick(r, s, 'zx')).map(p => `<div class="pick">${p.num.map(n => ball(n, 'd', 1)).join('')}<span class="tag">机选直选 · 和值 ${p.sum}</span></div>`).join(''); });
  }

  function bind(again) {
    $('#again').onclick = again;
    document.querySelectorAll('.seg a').forEach(a => a.onclick = () => { win = +a.dataset.w; render(); });
  }
  function render() { document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.t === tab)); tab === 'ssq' ? renderSsq() : renderD3(); }

  root.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.tabs a').forEach(a => a.onclick = () => { tab = a.dataset.t; win = 100; render(); });
    try {
      const v = '?t=' + Math.floor(Date.now() / 36e5);
      [SSQ, D3] = await Promise.all(['data/ssq.json', 'data/fc3d.json'].map(u => fetch(u + v).then(r => r.json())));
      const meta = await fetch('data/meta.json' + v).then(r => r.json()).catch(() => ({}));
      $('#upd').textContent = '数据更新：' + (meta.updated || '');
      render();
    } catch (e) { $('#main').innerHTML = '<p class="card">数据加载失败：' + e + '</p>'; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
