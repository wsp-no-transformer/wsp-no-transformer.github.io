// Live demo on the project page: the visitor deletes or adds rows of the fact table that Claude Opus 5.5 wrote, the
// model is rebuilt in Web Workers and all 3,530 ARC test questions are answered again. Built from site_fragment.html
// by scripts/site_demo/build_site_demo.py; the scoring code is page/wsp_engine.js and page/wsp_shard.js.
(() => {
'use strict';
// One bird question, then one or two per topic, out of the twelve precomputed examples.
const SHOWN = [['Mercury_SC_401771', 'life'], ['Mercury_7056910', 'life'], ['Mercury_7092453', 'earth'],
  ['Mercury_7212503', 'physics'], ['Mercury_7212678', 'physics'], ['Mercury_7032865', 'space']];
const BIRD = 'Mercury_SC_401771', BASE_ACC = 0.5080028328611897, L = 'ABCD';
const $ = id => document.getElementById('d-' + id);
const pct = x => (100 * x).toFixed(2) + '%';
const ms = x => x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(2)} s`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
let DATA = null, index = -1, accSvc = null, predSvc = null, reqId = 0, latestAcc = 0, latestPred = 0, timer = null;
let shown = null, baseAnswers = null, visitorN = 0, topRows = null;
const deleted = new Set(), added = [], baseMax = new Map();

function fail(where, e) { const el = $('err'); el.hidden = false; el.textContent = `${where}: ${e.message || e}`; }
const facts = () => [...DATA.facts.filter(f => !deleted.has(f.id)), ...added];

function renderOptions(q, res) {
  shown = res;
  const top = Math.max(...res.scores, 1e-9);
  $('opts').innerHTML = q.options.map((o, i) => `<div class='d-opt${!res.tied && i === res.answer ? ' d-win' : ''}'>
    <span class='d-lab' title='${esc(o)}'><b>${L[i]}</b>${esc(o)}${i === q.answer ? "<span class='d-tag'>correct</span>" : ''}</span>
    <span class='d-track'><span class='d-fill' style='width:${Math.max(0, 100 * res.scores[i] / top)}%'></span></span>
    <span class='d-val'>${res.scores[i].toFixed(1)}</span></div>`).join('');
  const v = $('verdict');
  if (res.tied) { v.className = 'd-verdict no'; v.textContent = 'All four options tie. The model has no answer.'; }
  else if (res.answer === q.answer) { v.className = 'd-verdict ok'; v.textContent = `Model answers ${L[res.answer]}. Correct.`; }
  else { v.className = 'd-verdict no'; v.textContent = `Model answers ${L[res.answer]}. The correct answer is ${L[q.answer]}.`; }
}

function renderRows(q, groups) {
  const key = q.id;
  if (!baseMax.has(key)) baseMax.set(key, Math.max(1e-9, ...groups.flat().map(r => r.support)));
  const max = baseMax.get(key), win = i => !shown.tied && shown.answer === i;
  $('rows').innerHTML = groups.map((rows, i) => `<div class='d-group'><div class='d-gl'>${L[i]} · ${esc(q.options[i])}
    <b class='${win(i) ? 'd-on' : ''}'>${shown.scores[i].toFixed(1)}${win(i) ? ' · answer' : ''}</b></div>
    ${rows.length ? rows.map(r => `<div class='d-row${r.id.startsWith('visitor:') ? ' d-visitor' : ''}'>
      <span class='d-txt'>${esc(r.text)}<span class='d-src'>${r.id.startsWith('visitor:') ? 'your row' : esc(r.id)}</span></span>
      <span class='d-mini'><span style='width:${Math.min(100, 100 * r.support / max)}%'></span></span>
      <button class='d-x' data-del='${esc(r.id)}' aria-label='Delete this row' title='Delete this row'>×</button></div>`).join('')
      : "<div class='d-small'>No matching rows.</div>"}</div>`).join('');
}

function renderEdits() {
  const items = [...[...deleted].map(id => ({label: 'Deleted', id, text: DATA.facts.find(f => f.id === id).text})),
    ...added.map(f => ({label: 'Added', id: f.id, text: f.text}))];
  $('mylist').innerHTML = items.length ? items.map(e => `<div class='d-edit'><span><b>${e.label}</b>${esc(e.text)}</span>
    <button class='d-x' data-undo='${esc(e.id)}' aria-label='Undo' title='Undo'>↺</button></div>`).join('')
    : "<p class='d-small' style='margin:0'>No edits yet.</p>";
  $('reset').disabled = !items.length;
}

function renderAccuracy(acc, changed = [], answers = null) {
  $('acc').textContent = pct(acc);
  const d = 100 * (acc - BASE_ACC), el = $('delta');
  el.className = 'd-delta' + (Math.abs(d) < 1e-9 ? '' : d > 0 ? ' up' : ' down');
  el.textContent = Math.abs(d) < 1e-9 ? 'same as the unedited model, 50.80%' : `${d > 0 ? '+' : ''}${d.toFixed(2)} points vs the unedited 50.80%`;
  $('nchanged').textContent = changed.length.toLocaleString();
  const box = $('changedbox');
  box.hidden = !(changed.length && answers && baseAnswers);
  if (box.hidden) return;
  const items = changed.map(i => {
    const gold = DATA.questions[i].answer, was = baseAnswers[i] === gold, now = answers[i] === gold;
    return {i, kind: now && !was ? 'gain' : was && !now ? 'loss' : 'swap'};
  });
  const n = k => items.filter(x => x.kind === k).length;
  $('changedsum').textContent = `${n('gain')} now right, ${n('loss')} now wrong, ${n('swap')} moved between wrong options`;
  const rank = {loss: 0, gain: 1, swap: 2}, label = {gain: 'now right', loss: 'now wrong', swap: 'still wrong'};
  $('changed').innerHTML = items.sort((a, b) => rank[a.kind] - rank[b.kind]).map(x =>
    `<div class='${x.kind}'><i>${label[x.kind]}</i><span>${esc(DATA.questions[x.i].question)}</span></div>`).join('');
}

function predict() {
  const id = ++reqId, start = performance.now(), i = index;
  latestPred = id;
  predSvc.handle({id, type: 'predict', index: i, data: DATA, facts: facts()}).then(r => {
    if (r.id !== latestPred) return;
    if (r.error) { fail('Question', r.error); return; }
    $('tq').textContent = ms(performance.now() - start);
    const q = DATA.questions[i];
    topRows = r.result.supports.map(list => list.filter(s => s.pass === 1 && s.route === 'direct' && s.kind === 'fact')
      .sort((a, b) => b.support - a.support).slice(0, 3).map(s => ({id: s.factIds[0], text: s.texts[0], support: s.support})));
    renderOptions(q, r.result);
    renderRows(q, topRows);
  });
}

function progress(p) {
  if (p.id !== latestAcc) return;
  $('progbar').style.width = `${100 * p.progress.completed / p.progress.total}%`;
  $('checked').textContent = `${p.progress.completed.toLocaleString()} / ${p.progress.total.toLocaleString()}`;
}

function rescore() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const id = ++reqId, start = performance.now();
    latestAcc = id;
    accSvc.handle({id, type: 'rebuild', facts: facts(), progress: true}, progress).then(r => {
      if (r.id !== latestAcc) return;
      if (r.error) { fail('Accuracy', r.error); return; }
      $('checked').textContent = 'all 3,530';
      $('tall').textContent = ms(performance.now() - start);
      renderAccuracy(r.result.accuracy, r.result.changedAnswers, r.result.answers);
    });
  }, 200);
}

function edited() { renderEdits(); predict(); rescore(); }

function select(id) {
  index = DATA.questions.findIndex(q => q.id === id);
  const topic = SHOWN.find(([q]) => q === id)[1];
  $('qtext').textContent = DATA.questions[index].question;
  $('meta').textContent = `ARC test question · ${topic}`;
  $('birdnote').hidden = id !== BIRD;
  document.querySelectorAll('#d-pick button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.q === id)));
  predict();
}

function addRow() {
  const text = $('addtext').value.trim();
  if (!/[a-z]/i.test(text)) return;
  const q = DATA.questions[index];
  const best = topRows[q.answer][0] ?? topRows.flat()[0];
  if (!best) { fail('Add row', new Error('no fact row to place the new row next to')); return; }
  const anchor = DATA.facts.find(f => f.id === best.id) ?? added.find(f => f.id === best.id);
  added.push({...anchor, id: `visitor:${++visitorN}`, line: null, text});
  $('addtext').value = '';
  edited();
}

document.getElementById('demo').addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t || !DATA) return;
  const drop = id => id.startsWith('visitor:') ? added.splice(added.findIndex(f => f.id === id), 1) : null;
  if (t.dataset.q) select(t.dataset.q);
  else if (t.dataset.del) { if (!drop(t.dataset.del)) deleted.add(t.dataset.del); edited(); }
  else if (t.dataset.undo) { if (!drop(t.dataset.undo)) deleted.delete(t.dataset.undo); edited(); }
  else if (t.id === 'd-reset') { deleted.clear(); added.length = 0; edited(); }
  else if (t.id === 'd-addbtn') addRow();
});
$('addtext').addEventListener('keydown', e => { if (e.key === 'Enter' && DATA) addRow(); });

async function start() {
  const r = await fetch('demo/live_data.json');
  if (!r.ok) throw new Error(`model data: HTTP ${r.status}`);
  DATA = await r.json();
  $('pick').innerHTML = SHOWN.map(([id]) => {
    const q = DATA.questions.find(x => x.id === id).question;
    return `<button data-q='${id}' aria-pressed='false' title='${esc(q)}'>${esc(q)}</button>`;
  }).join('');
  const workers = Math.min(8, Math.max(1, (navigator.hardwareConcurrency || 2) - 1));
  const make = () => new Worker('demo/wsp_shard.js');
  accSvc = WSP.createService(make, workers);
  predSvc = WSP.createService(make, 1);
  select(BIRD);
  const id = ++reqId, t0 = performance.now();
  latestAcc = id;
  const r0 = await accSvc.handle({id, type: 'init', data: DATA, progress: true}, progress);
  if (r0.error) throw r0.error;
  if (r0.id !== latestAcc) return;
  baseAnswers = r0.result.answers.slice();
  $('checked').textContent = 'all 3,530';
  $('tall').textContent = ms(performance.now() - t0) + ' (first run)';
  renderAccuracy(r0.result.accuracy);
}

// The model data and the scoring workers load only when the demo comes near the screen.
const io = new IntersectionObserver(entries => {
  if (!entries.some(e => e.isIntersecting)) return;
  io.disconnect();
  start().catch(e => fail('The live model could not start', e));
}, {rootMargin: '600px 0px'});
io.observe(document.getElementById('demo'));
})();
