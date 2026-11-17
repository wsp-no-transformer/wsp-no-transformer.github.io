(() => {
'use strict';
const __m = {};
__m["textproc.js"] = (() => {
const words = text => text.toLowerCase().match(/[a-z0-9']+/g) || [];
const readLines = text => text.split(/\r?\n/).map(s => s.split('#', 1)[0].trim()).filter(Boolean);

function cons(w, i) {
  if ('aeiou'.includes(w[i])) return false;
  if (w[i] === 'y') return i === 0 || !cons(w, i - 1);
  return true;
}
function measure(s) {
  let n = 0, i = 0;
  while (i < s.length && cons(s, i)) i++;
  while (i < s.length) {
    while (i < s.length && !cons(s, i)) i++;
    if (i >= s.length) break;
    while (i < s.length && cons(s, i)) i++;
    n++;
  }
  return n;
}
const hasVowel = s => [...s].some((_, i) => !cons(s, i));
const doubleC = s => s.length >= 2 && s.at(-1) === s.at(-2) && cons(s, s.length - 1);
const cvc = s => s.length >= 3 && cons(s, s.length - 3) && !cons(s, s.length - 2) &&
  cons(s, s.length - 1) && !'wxy'.includes(s.at(-1));
const STEP2 = [['ational','ate'],['tional','tion'],['enci','ence'],['anci','ance'],['izer','ize'],
  ['bli','ble'],['alli','al'],['entli','ent'],['eli','e'],['ousli','ous'],['ization','ize'],
  ['ation','ate'],['ator','ate'],['alism','al'],['iveness','ive'],['fulness','ful'],['ousness','ous'],
  ['aliti','al'],['iviti','ive'],['biliti','ble'],['logi','log']];
const STEP3 = [['icate','ic'],['ative',''],['alize','al'],['iciti','ic'],['ical','ic'],['ful',''],['ness','']];
const STEP4 = ['al','ance','ence','er','ic','able','ible','ant','ement','ment','ent','ion','ou','ism',
  'ate','iti','ous','ive','ize'];
function porter(input) {
  let w = input;
  if (w.length <= 2) return w;
  if (w.endsWith('sses') || w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);
  let extra = false;
  if (w.endsWith('eed')) { if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1); }
  else if (w.endsWith('ed') && hasVowel(w.slice(0, -2))) { w = w.slice(0, -2); extra = true; }
  else if (w.endsWith('ing') && hasVowel(w.slice(0, -3))) { w = w.slice(0, -3); extra = true; }
  if (extra) {
    if (['at','bl','iz'].some(s => w.endsWith(s))) w += 'e';
    else if (doubleC(w) && !'lsz'.includes(w.at(-1))) w = w.slice(0, -1);
    else if (measure(w) === 1 && cvc(w)) w += 'e';
  }
  if (w.endsWith('y') && hasVowel(w.slice(0, -1))) w = w.slice(0, -1) + 'i';
  for (const step of [STEP2, STEP3]) {
    for (const [suffix, replacement] of step) {
      if (w.endsWith(suffix)) {
        const stem = w.slice(0, -suffix.length);
        if (measure(stem) > 0) w = stem + replacement;
        break;
      }
    }
  }
  for (const suffix of STEP4) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measure(stem) > 1 && (suffix !== 'ion' || /[st]$/.test(stem))) w = stem;
      break;
    }
  }
  if (w.endsWith('e')) {
    const stem = w.slice(0, -1), m = measure(stem);
    if (m > 1 || (m === 1 && !cvc(stem))) w = stem;
  }
  if (measure(w) > 1 && doubleC(w) && w.endsWith('l')) w = w.slice(0, -1);
  return w;
}
function concepts(synonyms, stopwords) {
  const syn = new Map(), stop = new Set(readLines(stopwords).flatMap(s => s.split(/\s+/)));
  for (const line of readLines(synonyms)) {
    const at = line.indexOf(':'), head = (at < 0 ? line : line.slice(0, at)).trim();
    for (const v of (at < 0 ? [] : line.slice(at + 1).trim().split(/\s+/).filter(Boolean))) syn.set(v, head);
  }
  const stopstems = new Set([...stop].map(porter)), claims = new Map(), claim = new Map(), cache = new Map();
  for (const [v, head] of syn) if (head.startsWith('=')) {
    const stem = porter(v);
    if (!claims.has(stem)) claims.set(stem, new Set());
    claims.get(stem).add(head);
  }
  for (const [stem, heads] of claims) if (heads.size === 1) claim.set(stem, [...heads][0]);
  function key(w) {
    if (cache.has(w)) return cache.get(w);
    let k = null;
    if (w.endsWith("'s") && w.length > 3 && !syn.has(w)) k = key(w.slice(0, -2));
    else if (w.endsWith("'") && w.length > 2) k = key(w.slice(0, -1));
    else if (!stop.has(w)) {
      let base = syn.get(w) ?? w;
      for (let i = 0; i < 3; i++) if (base !== w && syn.has(base) && syn.get(base) !== base) base = syn.get(base);
      if (!stop.has(base)) {
        if (base.startsWith('=') || /^[0-9]/.test(base)) k = base;
        else if (base === w && claim.has(porter(w))) k = claim.get(porter(w));
        else { k = porter(base); if (stopstems.has(k) && !syn.has(base)) k = null; }
      }
    }
    cache.set(w, k);
    return k;
  }
  return key;
}
const FACT_NEG = new Set(["not","cannot","can't","don't","doesn't","isn't","aren't","never","won't",
  "didn't","wasn't","weren't","neither","nor"]);
function factWords(text) {
  const out = [];
  for (const clause of text.split(/[,;:.()]/)) for (const t of words(clause)) {
    if (FACT_NEG.has(t)) break;
    out.push(t);
  }
  return out;
}

return {words, readLines, porter, concepts, factWords};
})();
__m["numeric.js"] = (() => {
const f = Math.fround;
const add = (a, b) => Math.fround(a + b);
const mul = (a, b) => Math.fround(a * b);
const div = (a, b) => Math.fround(a / b);
const pow = (a, b) => Math.fround(Math.pow(a, b));

// Match libstdc++ partial_sort: equal top facts can change the second-pass expansion.
function topk(values, k) {
  if (values.length < k) throw new Error('Fewer rows than top-k');
  if (values.length < k * 64) return nthTopk(values, k);
  const heap = Array.from({length: k}, (_, i) => i);
  function adjust(hole, length, value) {
    const top = hole;
    let second = hole;
    while (second < Math.floor((length - 1) / 2)) {
      second = 2 * (second + 1);
      if (values[heap[second]] > values[heap[second - 1]]) second--;
      heap[hole] = heap[second]; hole = second;
    }
    if (length % 2 === 0 && second === (length - 2) / 2) {
      second = 2 * (second + 1);
      heap[hole] = heap[second - 1]; hole = second - 1;
    }
    let parent = Math.floor((hole - 1) / 2);
    while (hole > top && values[heap[parent]] > values[value]) {
      heap[hole] = heap[parent]; hole = parent; parent = Math.floor((hole - 1) / 2);
    }
    heap[hole] = value;
  }
  for (let parent = Math.floor((k - 2) / 2); parent >= 0; parent--) adjust(parent, k, heap[parent]);
  for (let i = k; i < values.length; i++) if (values[i] > values[heap[0]]) adjust(0, k, i);
  for (let length = k; length > 1;) {
    const value = heap[length - 1]; heap[length - 1] = heap[0];
    adjust(0, --length, value);
  }
  return heap;
}
function dotRows(matrix, vector) {
  const out = new Float32Array(matrix.rows.length);
  for (let r = 0; r < out.length; r++) {
    let sum = 0;
    for (const c of matrix.rows[r]) sum = add(sum, vector[c]);
    out[r] = sum;
  }
  return out;
}

function nthTopk(values, k) {
  const ids = Array.from({length: values.length}, (_, i) => i);
  const less = (a, b) => values[ids[a]] > values[ids[b]];
  const swap = (a, b) => { const t = ids[a]; ids[a] = ids[b]; ids[b] = t; };
  function insertion(first, last) {
    for (let i = first + 1; i < last; i++) {
      const value = ids[i];
      let j = i;
      while (j > first && values[value] > values[ids[j - 1]]) { ids[j] = ids[j - 1]; j--; }
      ids[j] = value;
    }
  }
  let first = 0, last = ids.length, depth = 2 * Math.floor(Math.log2(ids.length));
  const nth = k - 1;
  while (last - first > 3) {
    if (depth-- === 0) {
      const length = nth + 1 - first;
      function adjust(hole, value) {
        const top = hole;
        let second = hole;
        while (second < Math.floor((length - 1) / 2)) {
          second = 2 * (second + 1);
          if (values[ids[first + second]] > values[ids[first + second - 1]]) second--;
          ids[first + hole] = ids[first + second]; hole = second;
        }
        if (length % 2 === 0 && second === (length - 2) / 2) {
          second = 2 * (second + 1);
          ids[first + hole] = ids[first + second - 1]; hole = second - 1;
        }
        let parent = Math.floor((hole - 1) / 2);
        while (hole > top && values[ids[first + parent]] > values[value]) {
          ids[first + hole] = ids[first + parent]; hole = parent; parent = Math.floor((hole - 1) / 2);
        }
        ids[first + hole] = value;
      }
      for (let parent = Math.floor((length - 2) / 2); parent >= 0; parent--) adjust(parent, ids[first + parent]);
      for (let i = nth + 1; i < last; i++) if (less(i, first)) {
        const value = ids[i]; ids[i] = ids[first]; adjust(0, value);
      }
      swap(first, nth);
      insertion(0, k - 1);
      return ids.slice(0, k);
    }
    const a = first + 1, b = first + Math.floor((last - first) / 2), c = last - 1;
    let median;
    if (less(a, b)) median = less(b, c) ? b : less(a, c) ? c : a;
    else median = less(a, c) ? a : less(b, c) ? c : b;
    swap(first, median);
    let lo = first + 1, hi = last;
    for (;;) {
      while (less(lo, first)) lo++;
      hi--;
      while (less(first, hi)) hi--;
      if (lo >= hi) break;
      swap(lo++, hi);
    }
    if (lo <= nth) first = lo; else last = lo;
  }
  insertion(first, last);
  insertion(0, k - 1);
  return ids.slice(0, k);
}

return {f, add, mul, div, pow, topk, dotRows};
})();
__m["wsp_live.js"] = (() => {
const {words, readLines, concepts, factWords} = __m["textproc.js"];
const {f, add, mul, div, pow, topk, dotRows} = __m["numeric.js"];

const QCUE = new Set(['into','change','changes','changed','changing','transform','transforms','transformed',
  'transformation','transformations','convert','converts','converted','conversion','becomes','become','turns','turned','from']);
const OCUE = new Set(['to','into','then','from','becomes']);
const unique = ids => [...new Set(ids)].sort((a, b) => a - b);

function build(data, editedFacts = data.facts) {
  if (data.schema !== 1 || data.encoding.vocabPolicy !== 'fixed') throw new Error('Unsupported export schema or vocabulary policy');
  const sections = new Map(data.sections.map((s, i) => [s.id, i]));
  const seen = new Set();
  const facts = editedFacts.map((fact, order) => {
    if (!fact || typeof fact.text !== 'string' || /[\r\n]/.test(fact.text) || !fact.text.trim() || fact.text.trim().startsWith('#'))
      throw new Error('Each fact must be one nonempty, non-header line');
    if (!sections.has(fact.section) || data.sections[sections.get(fact.section)].file !== fact.file)
      throw new Error(`Unknown section/file for fact ${fact.id}`);
    if (typeof fact.id !== 'string' || seen.has(fact.id)) throw new Error(`Duplicate or invalid fact id: ${fact.id}`);
    seen.add(fact.id);
    return {...fact, order, text: fact.text.split('#', 1)[0].trim()};
  }).sort((a, b) => sections.get(a.section) - sections.get(b.section) || a.order - b.order);
  if (facts.length < 5) throw new Error('The Python model requires at least five facts for top-k retrieval');
  const key = concepts(data.synonyms, data.stopwords), cid = new Map([['', 0]]);
  const intern = k => { if (!cid.has(k)) cid.set(k, cid.size); return cid.get(k); };
  const seqs = facts.map(fact => {
    const seq = [];
    for (const token of factWords(fact.text)) {
      const k = key(token);
      if (k && (!seq.length || seq.at(-1) !== k)) seq.push(k);
    }
    return seq.map(intern);
  });
  const pairs = [];
  for (const line of readLines(data.isa)) {
    const at = line.indexOf(':'), head = at < 0 ? line : line.slice(0, at), rest = at < 0 ? '' : line.slice(at + 1);
    const targets = words(rest).map(key).filter(Boolean);
    for (const h of words(head)) {
      const hk = key(h);
      if (hk) for (const t of targets) if (t !== hk) pairs.push([intern(hk), intern(t)]);
    }
  }
  const C = cid.size, N = facts.length, p = Object.fromEntries(Object.entries(data.constants.PARAMS).map(([k, v]) => [k, f(v)]));
  const rows = seqs.map(unique), df = new Float32Array(C), idf = new Float32Array(C);
  for (const row of rows) for (const c of row) df[c]++;
  for (let c = 1; c < C; c++) if (df[c]) idf[c] = f(Math.log(add(1, div(N, df[c]))));
  function matrix(input, sources) {
    const rr = input.map(unique), norm = new Float32Array(rr.length);
    for (let r = 0; r < rr.length; r++) {
      let mass = 0;
      for (const c of rr[r]) mass = add(mass, idf[c]);
      norm[r] = pow(Math.max(1, mass), -p.fact_len_pow);
    }
    return {rows: rr, norm, sources};
  }
  const windows = [], windowSources = [], paragraphs = [], paragraphSources = [];
  const width = data.constants.WINDOW, radius = data.constants.PAR;
  if (data.constants.ISA_FACTS) throw new Error('ISA_FACTS is unsupported by this model export');
  for (let i = 0; i < N; i++) {
    const seq = seqs[i];
    for (let start = 0; start < Math.max(1, seq.length - width + 1); start++) {
      windows.push(seq.slice(start, start + width)); windowSources.push([i]);
    }
    const neighbors = [];
    for (let j = Math.max(0, i - radius); j < Math.min(N, i + radius + 1); j++)
      if (facts[j].section === facts[i].section) neighbors.push(j);
    paragraphs.push(neighbors.flatMap(j => seqs[j])); paragraphSources.push(neighbors);
  }
  const expansion = Array.from({length: C}, () => new Set());
  for (const [a, b] of pairs) expansion[a].add(b);
  const directions = new Int32Array(C).fill(data.constants.DIRECTIONAL.length);
  data.constants.DIRECTIONAL.forEach((group, d) => {
    for (const word of group) if (cid.has(key(word))) directions[cid.get(key(word))] = d;
  });
  const nd = data.constants.DIRECTIONAL.length;
  const fp = seqs.map(seq => {
    const ds = seq.map(c => directions[c]).filter(d => d < nd), out = new Set();
    for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++)
      if (ds[a] !== ds[b]) out.add(ds[a] * nd + ds[b]);
    return unique(out);
  });
  const tokenConcepts = new Map(Object.entries(data.encoding.corpusTokenIds).map(([w, id]) =>
    [w, id === 1 ? 0 : (cid.get(key(w)) ?? 0)]));
  return {data, facts, cid, idf, p, C, nd, directions, fp, tokenConcepts,
    expansion: expansion.map(s => [...s]),
    F: matrix(rows, rows.map((_, i) => [i])), Fw: matrix(windows, windowSources), Fp: matrix(paragraphs, paragraphSources)};
}

function encode(model, text, length) {
  const tokens = words(text).slice(0, length);
  for (const t of tokens) if (!model.tokenConcepts.has(t))
    throw new Error(`Token ${JSON.stringify(t)} is outside the exported test corpus; export its vocabulary membership before scoring new questions`);
  return {tokens, cs: tokens.map(t => model.tokenConcepts.get(t)),
    known: tokens.map(t => model.data.encoding.corpusTokenIds[t] !== 1)};
}
function expand(model, bag, exclude) {
  const out = new Float32Array(model.C);
  for (let c = 0; c < bag.length; c++) if (bag[c]) for (const t of model.expansion[c])
    if (!bag[t] && !exclude[t]) out[t] = 1;
  return out;
}
function directionPairs(model, encoded) {
  const ds = encoded.cs.map(c => model.directions[c]).filter(d => d < model.nd), pairs = new Set();
  for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++)
    if (ds[a] !== ds[b]) pairs.add(ds[a] * model.nd + ds[b]);
  return {has: new Set(ds), pairs};
}
const hasWord = (encoded, set) => encoded.tokens.some((t, i) => encoded.known[i] && set.has(t));
function directionFactors(model, q, o) {
  const qd = directionPairs(model, q), od = directionPairs(model, o), pairs = new Set();
  if (hasWord(q, QCUE)) {
    for (const pair of qd.pairs) pairs.add(pair);
    for (const a of qd.has) for (const b of od.has) if (a !== b) pairs.add(a * model.nd + b);
  }
  if (hasWord(o, OCUE)) for (const pair of od.pairs) pairs.add(pair);
  return Float32Array.from(model.fp, row => {
    let agree = 0;
    for (const pair of row) {
      if (pairs.has(pair)) agree++;
      if (pairs.has((pair % model.nd) * model.nd + Math.floor(pair / model.nd))) agree--;
    }
    return f(Math.exp(mul(model.p.dir, Math.max(-2, Math.min(2, agree)))));
  });
}
function normalizedDots(matrix, vector) {
  return dotRows(matrix, vector).map((v, i) => mul(v, matrix.norm[i]));
}
function questionNegated(model, q) {
  const k = model.data.constants, wh = new Set(k.WH), late = new Set(k.NEG_LATE),
    cancel = new Set(k.NEG_CANCEL), any = new Set(k.NEG_ANY);
  for (let i = 0; i < q.tokens.length; i++) {
    if (!q.known[i]) continue;
    const token = q.tokens[i];
    if (any.has(token) || (token === 'least' && q.known[i + 1] && ['likely','probably'].includes(q.tokens[i + 1]))) return true;
    if (late.has(token) && !(q.known[i - 1] && cancel.has(q.tokens[i - 1])))
      for (let j = Math.max(0, i - 7); j < i; j++) if (q.known[j] && wh.has(q.tokens[j])) return true;
  }
  return false;
}

function forward(model, question, {explain = false, supportCount = 5} = {}) {
  const {C, idf, p, F, Fw, Fp} = model, mats = [F, Fw, Fp];
  const q = encode(model, question.question, model.data.encoding.questionLength);
  if (question.options.length !== 4) throw new Error('Expected four options');
  const options = question.options.map(t => encode(model, t, model.data.encoding.optionLength));
  const qbag = new Float32Array(C), qpres = new Float32Array(C);
  q.cs.forEach((c, i) => { qbag[c] = Math.max(qbag[c], add(1, i >= q.cs.length - p.late_n ? p.late_boost : 0)); qpres[c] = 1; });
  const qexp = expand(model, qpres, qpres), qw = new Float32Array(C);
  for (let c = 0; c < C; c++) qw[c] = mul(add(qbag[c], mul(p.qisa, qexp[c])), pow(idf[c], p.q_idf_pow));
  const anyopt = new Float32Array(C);
  const optionState = options.map(o => {
    const bag = new Float32Array(C);
    for (const c of o.cs) if (!qpres[c]) bag[c] = 1;
    if (o.cs.length < model.data.encoding.optionLength && !qpres[0]) bag[0] = 1;
    const exp = expand(model, bag, qpres), ow = new Float32Array(C), owe = new Float32Array(C);
    let otot = 0;
    for (let c = 0; c < C; c++) {
      ow[c] = mul(bag[c], idf[c]); owe[c] = mul(exp[c], idf[c]);
      otot = add(otot, ow[c]); anyopt[c] = Math.max(anyopt[c], bag[c]);
    }
    const direct = mats.map(m => dotRows(m, ow)), category = mats.map(m => dotRows(m, owe));
    const link = new Float32Array(C);
    for (let r = 0; r < F.rows.length; r++) {
      const v = pow(mul(direct[0][r], F.norm[r]), 4);
      for (const c of F.rows[r]) link[c] = add(link[c], v);
    }
    for (let c = 0; c < C; c++) link[c] = pow(link[c], 0.25);
    return {direct, category, link, scale: pow(add(otot, 1), p.opt_len_pow),
      gate: mul(p.isa, f(Math.exp(-otot))), direction: directionFactors(model, q, o)};
  });
  for (let c = 0; c < C; c++) {
    const links = optionState.map(o => o.link[c]);
    const mean = div(add(add(add(links[0], links[1]), links[2]), links[3]), 4);
    const spread = f(1 - div(mean, add(Math.max(...links), f(1e-6))));
    qw[c] = mul(qw[c], add(p.disc_floor, mul(f(1 - p.disc_floor), div(spread, f(0.75)))));
  }
  const firstDots = mats.map(m => normalizedDots(m, qw));
  const ti = topk(firstDots[0], 3), fw = new Float32Array(F.rows.length), hop = new Float32Array(C);
  for (const r of ti) fw[r] = div(firstDots[0][r], add(firstDots[0][ti[0]], f(1e-6)));
  for (let r = 0; r < fw.length; r++) if (fw[r]) for (const c of F.rows[r]) hop[c] = add(hop[c], fw[r]);
  let hopMax = 0;
  for (const v of hop) hopMax = Math.max(hopMax, v);
  const secondQ = new Float32Array(C);
  for (let c = 0; c < C; c++) {
    hop[c] = mul(mul(div(hop[c], add(hopMax, f(1e-6))), 1 - qpres[c]), 1 - anyopt[c]);
    secondQ[c] = add(qw[c], mul(mul(p.prf_q, hop[c]), pow(idf[c], p.q_idf_pow)));
  }
  const secondDots = mats.map(m => normalizedDots(m, secondQ));
  const supports = [];
  function scoreWith(qdots, state, pass, records) {
    let total = 0;
    for (const [route, dots, weight] of [['direct', state.direct, 1], ['category', state.category, state.gate]]) {
      const s = qdots[0].map((v, r) => mul(div(mul(v, dots[0][r]), state.scale), state.direction[r]));
      const top = topk(s, 5);
      let remaining = 0;
      for (const r of top.slice(1)) remaining = add(remaining, s[r]);
      const maxima = [0, 0], best = [-1, -1];
      for (let m = 1; m < 3; m++) for (let r = 0; r < qdots[m].length; r++) {
        const v = div(mul(qdots[m][r], dots[m][r]), state.scale);
        if (v > maxima[m - 1]) { maxima[m - 1] = v; best[m - 1] = r; }
      }
      total = add(total, mul(weight, add(add(add(s[top[0]], mul(p.second, remaining)), mul(p.win, maxima[0])), mul(p.par, maxima[1]))));
      if (explain) {
        for (const r of top.slice(0, supportCount)) records.push({pass, route, kind: 'fact', row: r,
          factIds: [model.facts[r].id], texts: [model.facts[r].text], support: s[r], routeWeight: weight});
        for (let m = 1; m < 3; m++) if (best[m - 1] >= 0) {
          const r = best[m - 1], source = mats[m].sources[r];
          records.push({pass, route, kind: m === 1 ? 'window' : 'paragraph', row: r,
            factIds: source.map(i => model.facts[i].id), texts: source.map(i => model.facts[i].text),
            support: maxima[m - 1], routeWeight: weight});
        }
      }
    }
    return total;
  }
  const negated = questionNegated(model, q), absolute = new Set(model.data.constants.ABSOLUTE);
  const scores = optionState.map((state, i) => {
    const records = [];
    let score = scoreWith(firstDots, state, 1, records), coverage = 0;
    for (let c = 0; c < C; c++) coverage = add(coverage, mul(state.link[c], qw[c]));
    score = add(score, mul(p.cov, div(coverage, state.scale)));
    score = add(score, mul(p.prf, scoreWith(secondDots, state, 2, records)));
    score = mul(score, f(1 - mul(p.abs_pen, +hasWord(options[i], absolute))));
    score = mul(score, negated ? -1 : 1);
    score = add(score, mul(f(1e-4), options[i].tokens.length));
    if (!Number.isFinite(score)) throw new Error(`Nonfinite score for ${question.id}`);
    if (explain) supports.push(records);
    return score;
  });
  const answer = scores.indexOf(Math.max(...scores)), tied = Math.max(...scores) === Math.min(...scores);
  return {scores, answer, tied, ...(explain ? {supports, negated, expansionRows: ti.map(i => model.facts[i].id)} : {})};
}

function scoreAll(model, {baselineAnswers = null, explainIndex = null, supportCount = 5} = {}) {
  const questions = model.data.questions;
  if (baselineAnswers && baselineAnswers.length !== questions.length) throw new Error('Baseline answer count differs');
  let right = 0, answered = 0;
  const scores = [], answers = [], changedAnswers = [];
  let explanation = null;
  for (let i = 0; i < questions.length; i++) {
    const result = forward(model, questions[i], {explain: i === explainIndex, supportCount});
    scores.push(result.scores); answers.push(result.answer);
    if (!result.tied) { answered++; if (result.answer === questions[i].answer) right++; }
    if (baselineAnswers && result.answer !== baselineAnswers[i]) changedAnswers.push(i);
    if (i === explainIndex) explanation = {index: i, id: questions[i].id, ...result};
  }
  return {scores, answers, accuracy: right / questions.length + (1 - answered / questions.length) / 4,
    answered: answered / questions.length, changedAnswers, explanation};
}

function rebuildAndScore(data, editedFacts = data.facts, options = {}) {
  const start = performance.now(), model = build(data, editedFacts), built = performance.now();
  const result = scoreAll(model, options);
  return {...result, timings: {buildMs: built - start, scoreMs: performance.now() - built,
    rebuildAndScoreMs: performance.now() - start}};
}

return {build, forward, scoreAll, rebuildAndScore};
})();
__m["fast/scorer.js"] = (() => {
const {words} = __m["textproc.js"];
const {f, add, mul, div, pow, topk} = __m["numeric.js"];
const {build : originalBuild} = __m["wsp_live.js"];

const QCUE = new Set(['into','change','changes','changed','changing','transform','transforms','transformed',
  'transformation','transformations','convert','converts','converted','conversion','becomes','become','turns','turned','from']);
const OCUE = new Set(['to','into','then','from','becomes']);

function build(data, facts = data.facts) {
  const model = originalBuild(data, facts);
  const index = matrix => {
    const postings = Array.from({length: model.C}, () => []);
    matrix.rows.forEach((row, r) => { for (const c of row) postings[c].push(r); });
    return {...matrix, postings: postings.map(rows => Int32Array.from(rows))};
  };
  const pairRows = Array.from({length: model.nd * model.nd}, () => []);
  model.fp.forEach((pairs, r) => { for (const pair of pairs) pairRows[pair].push(r); });
  const directionExp = Float32Array.from([-2, -1, 0, 1, 2], v => f(Math.exp(mul(model.p.dir, v))));
  return {...model, pairRows, directionExp, F: index(model.F), Fw: index(model.Fw), Fp: index(model.Fp),
    idfPower: model.idf.map(v => pow(v, model.p.q_idf_pow))};
}

// Visit concepts in the original row reduction order; only positive zero additions disappear.
function dotRows(matrix, vector) {
  const out = new Float32Array(matrix.rows.length), active = [];
  for (const c of vector.active) {
    const v = vector[c];
    if (v === 0) continue;
    if (!(v > 0) || !Number.isFinite(v)) throw new Error('Sparse dot requires finite nonnegative weights');
    for (const r of matrix.postings[c]) {
      if (out[r] === 0) active.push(r);
      out[r] = add(out[r], v);
    }
  }
  out.active = active;
  return out;
}

function encode(model, text, length) {
  const tokens = words(text).slice(0, length);
  for (const t of tokens) if (!model.tokenConcepts.has(t))
    throw new Error(`Token ${JSON.stringify(t)} is outside the exported test corpus; export its vocabulary membership before scoring new questions`);
  return {tokens, cs: tokens.map(t => model.tokenConcepts.get(t)),
    known: tokens.map(t => model.data.encoding.corpusTokenIds[t] !== 1)};
}
function expand(model, bag, exclude) {
  const out = new Float32Array(model.C);
  const active = new Set();
  for (const c of bag.active) for (const t of model.expansion[c])
    if (!bag[t] && !exclude[t]) { out[t] = 1; active.add(t); }
  out.active = [...active].sort((a, b) => a - b);
  return out;
}
function directionPairs(model, encoded) {
  const ds = encoded.cs.map(c => model.directions[c]).filter(d => d < model.nd), pairs = new Set();
  for (let a = 0; a < ds.length; a++) for (let b = a + 1; b < ds.length; b++)
    if (ds[a] !== ds[b]) pairs.add(ds[a] * model.nd + ds[b]);
  return {has: new Set(ds), pairs};
}
const hasWord = (encoded, set) => encoded.tokens.some((t, i) => encoded.known[i] && set.has(t));
function directionFactors(model, q, o) {
  const qd = directionPairs(model, q), od = directionPairs(model, o), pairs = new Set();
  if (hasWord(q, QCUE)) {
    for (const pair of qd.pairs) pairs.add(pair);
    for (const a of qd.has) for (const b of od.has) if (a !== b) pairs.add(a * model.nd + b);
  }
  if (hasWord(o, OCUE)) for (const pair of od.pairs) pairs.add(pair);
  const result = new Float32Array(model.facts.length).fill(1);
  if (!pairs.size) return result;
  const agrees = new Int32Array(model.facts.length), touched = new Set();
  for (const pair of pairs) {
    for (const r of model.pairRows[pair]) { agrees[r]++; touched.add(r); }
    const reverse = (pair % model.nd) * model.nd + Math.floor(pair / model.nd);
    for (const r of model.pairRows[reverse]) { agrees[r]--; touched.add(r); }
  }
  for (const r of touched) result[r] = model.directionExp[Math.max(-2, Math.min(2, agrees[r])) + 2];
  return result;
}
function normalizedDots(matrix, vector) {
  const dots = dotRows(matrix, vector);
  for (const r of dots.active) dots[r] = mul(dots[r], matrix.norm[r]);
  return dots;
}
function questionNegated(model, q) {
  const k = model.data.constants, wh = new Set(k.WH), late = new Set(k.NEG_LATE),
    cancel = new Set(k.NEG_CANCEL), any = new Set(k.NEG_ANY);
  for (let i = 0; i < q.tokens.length; i++) {
    if (!q.known[i]) continue;
    const token = q.tokens[i];
    if (any.has(token) || (token === 'least' && q.known[i + 1] && ['likely','probably'].includes(q.tokens[i + 1]))) return true;
    if (late.has(token) && !(q.known[i - 1] && cancel.has(q.tokens[i - 1])))
      for (let j = Math.max(0, i - 7); j < i; j++) if (q.known[j] && wh.has(q.tokens[j])) return true;
  }
  return false;
}

function forward(model, question, {explain = false, supportCount = 5} = {}) {
  const {C, idf, p, F, Fw, Fp} = model, mats = [F, Fw, Fp];
  const q = encode(model, question.question, model.data.encoding.questionLength);
  if (question.options.length !== 4) throw new Error('Expected four options');
  const options = question.options.map(t => encode(model, t, model.data.encoding.optionLength));
  const qbag = new Float32Array(C), qpres = new Float32Array(C);
  q.cs.forEach((c, i) => { qbag[c] = Math.max(qbag[c], add(1, i >= q.cs.length - p.late_n ? p.late_boost : 0)); qpres[c] = 1; });
  qpres.active = [...new Set(q.cs)].sort((a, b) => a - b);
  const qexp = expand(model, qpres, qpres), qw = new Float32Array(C);
  qw.active = [...new Set([...qpres.active, ...qexp.active])].sort((a, b) => a - b);
  for (const c of qw.active) qw[c] = mul(add(qbag[c], mul(p.qisa, qexp[c])), model.idfPower[c]);
  const anyopt = new Float32Array(C);
  const optionState = options.map(o => {
    const bag = new Float32Array(C);
    for (const c of o.cs) if (!qpres[c]) bag[c] = 1;
    if (o.cs.length < model.data.encoding.optionLength && !qpres[0]) bag[0] = 1;
    bag.active = [...new Set([...o.cs, 0])].filter(c => bag[c]).sort((a, b) => a - b);
    const exp = expand(model, bag, qpres), ow = new Float32Array(C), owe = new Float32Array(C);
    ow.active = bag.active; owe.active = exp.active;
    let otot = 0;
    for (const c of bag.active) { ow[c] = mul(bag[c], idf[c]); otot = add(otot, ow[c]); anyopt[c] = 1; }
    for (const c of exp.active) owe[c] = mul(exp[c], idf[c]);
    const direct = mats.map(m => dotRows(m, ow)), category = mats.map(m => dotRows(m, owe));
    const link = new Float32Array(C);
    for (const r of direct[0].active.toSorted((a, b) => a - b)) {
      const v = pow(mul(direct[0][r], F.norm[r]), 4);
      for (const c of F.rows[r]) if (p.cov || qw[c]) link[c] = add(link[c], v);
    }
    if (p.cov) {
      for (let c = 0; c < C; c++) if (link[c]) link[c] = pow(link[c], 0.25);
    } else for (const c of qw.active) link[c] = pow(link[c], 0.25);
    return {direct, category, link, scale: pow(add(otot, 1), p.opt_len_pow),
      gate: mul(p.isa, f(Math.exp(-otot))), direction: directionFactors(model, q, o)};
  });
  for (const c of qw.active) {
    const a = optionState[0].link[c], b = optionState[1].link[c],
      d = optionState[2].link[c], e = optionState[3].link[c];
    const mean = div(add(add(add(a, b), d), e), 4);
    const spread = f(1 - div(mean, add(Math.max(a, b, d, e), f(1e-6))));
    qw[c] = mul(qw[c], add(p.disc_floor, mul(f(1 - p.disc_floor), div(spread, f(0.75)))));
  }
  const firstDots = mats.map(m => normalizedDots(m, qw));
  const ti = topk(firstDots[0], 3), fw = new Float32Array(F.rows.length), hop = new Float32Array(C);
  for (const r of ti) fw[r] = div(firstDots[0][r], add(firstDots[0][ti[0]], f(1e-6)));
  const hopActive = new Set();
  for (const r of ti.toSorted((a, b) => a - b)) if (fw[r]) for (const c of F.rows[r]) {
    hop[c] = add(hop[c], fw[r]); hopActive.add(c);
  }
  let hopMax = 0;
  for (const c of hopActive) hopMax = Math.max(hopMax, hop[c]);
  const secondQ = new Float32Array(C);
  secondQ.active = [...new Set([...qw.active, ...hopActive])].sort((a, b) => a - b);
  for (const c of secondQ.active) {
    hop[c] = mul(mul(div(hop[c], add(hopMax, f(1e-6))), 1 - qpres[c]), 1 - anyopt[c]);
    secondQ[c] = add(qw[c], mul(mul(p.prf_q, hop[c]), model.idfPower[c]));
  }
  const secondDots = mats.map(m => normalizedDots(m, secondQ));
  const supports = [];
  function scoreWith(qdots, state, pass, records) {
    let total = 0;
    for (const [route, dots, weight] of [['direct', state.direct, 1], ['category', state.category, state.gate]]) {
      const s = explain ? new Float32Array(qdots[0].length) : null, values = [0, 0, 0, 0, 0];
      for (const r of dots[0].active) {
        const v = mul(div(mul(qdots[0][r], dots[0][r]), state.scale), state.direction[r]);
        if (explain) s[r] = v;
        if (v > values[4]) {
          let i = 4;
          while (i > 0 && v > values[i - 1]) { values[i] = values[i - 1]; i--; }
          values[i] = v;
        }
      }
      const top = explain ? topk(s, 5) : null;
      let remaining = 0;
      for (let i = 1; i < 5; i++) remaining = add(remaining, values[i]);
      const maxima = [0, 0], best = [-1, -1];
      for (let m = 1; m < 3; m++) for (const r of dots[m].active) {
        const v = div(mul(qdots[m][r], dots[m][r]), state.scale);
        if (v > maxima[m - 1] || (v > 0 && v === maxima[m - 1] && r < best[m - 1])) { maxima[m - 1] = v; best[m - 1] = r; }
      }
      total = add(total, mul(weight, add(add(add(values[0], mul(p.second, remaining)), mul(p.win, maxima[0])), mul(p.par, maxima[1]))));
      if (explain) {
        for (const r of top.slice(0, supportCount)) records.push({pass, route, kind: 'fact', row: r,
          factIds: [model.facts[r].id], texts: [model.facts[r].text], support: s[r], routeWeight: weight});
        for (let m = 1; m < 3; m++) if (best[m - 1] >= 0) {
          const r = best[m - 1], source = mats[m].sources[r];
          records.push({pass, route, kind: m === 1 ? 'window' : 'paragraph', row: r,
            factIds: source.map(i => model.facts[i].id), texts: source.map(i => model.facts[i].text),
            support: maxima[m - 1], routeWeight: weight});
        }
      }
    }
    return total;
  }
  const negated = questionNegated(model, q), absolute = new Set(model.data.constants.ABSOLUTE);
  const scores = optionState.map((state, i) => {
    const records = [];
    let score = scoreWith(firstDots, state, 1, records), coverage = 0;
    if (p.cov) for (let c = 0; c < C; c++) coverage = add(coverage, mul(state.link[c], qw[c]));
    score = add(score, mul(p.cov, div(coverage, state.scale)));
    score = add(score, mul(p.prf, scoreWith(secondDots, state, 2, records)));
    score = mul(score, f(1 - mul(p.abs_pen, +hasWord(options[i], absolute))));
    score = mul(score, negated ? -1 : 1);
    score = add(score, mul(f(1e-4), options[i].tokens.length));
    if (!Number.isFinite(score)) throw new Error(`Nonfinite score for ${question.id}`);
    if (explain) supports.push(records);
    return score;
  });
  const answer = scores.indexOf(Math.max(...scores)), tied = Math.max(...scores) === Math.min(...scores);
  return {scores, answer, tied, ...(explain ? {supports, negated, expansionRows: ti.map(i => model.facts[i].id)} : {})};
}


return {build, forward};
})();
__m["fast/engine.js"] = (() => {
const {words, concepts} = __m["textproc.js"];
const {build, forward} = __m["fast/scorer.js"];

function summarize(data, rows, baselineAnswers = null, explanation = null) {
  let right = 0, answered = 0;
  const scores = [], answers = [], changedAnswers = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) throw new Error(`Missing question ${i}`);
    scores.push(row.scores); answers.push(row.answer);
    if (!row.tied) { answered++; if (row.answer === data.questions[i].answer) right++; }
    if (baselineAnswers && row.answer !== baselineAnswers[i]) changedAnswers.push(i);
  }
  return {scores, answers, accuracy: right / rows.length + (1 - answered / rows.length) / 4,
    answered: answered / rows.length, changedAnswers, explanation};
}

function plan(data, previousFacts, facts) {
  const same = previousFacts !== null && JSON.stringify(previousFacts) === JSON.stringify(facts);
  if (same) return {order: [], reused: data.questions.length, priorityCount: 0};
  const previous = new Map((previousFacts ?? []).map(f => [f.id, f]));
  const next = new Map(facts.map(f => [f.id, f]));
  const changed = [...facts.filter(f => !previous.has(f.id) || JSON.stringify(previous.get(f.id)) !== JSON.stringify(f)),
    ...(previousFacts ?? []).filter(f => !next.has(f.id))];
  const key = concepts(data.synonyms, data.stopwords);
  const touched = new Set(changed.flatMap(f => words(f.text).map(key)).filter(Boolean));
  const priority = [], rest = [];
  data.questions.forEach((q, i) => {
    const overlap = [q.question, ...q.options].some(t => words(t).some(w => touched.has(key(w))));
    (overlap ? priority : rest).push(i);
  });
  return {order: [...priority, ...rest], reused: 0, priorityCount: priority.length};
}

function incremental(data, facts, previous = null, {baselineAnswers = null, explainIndex = null} = {}) {
  const start = performance.now(), work = plan(data, previous?.facts ?? null, facts);
  const rows = previous ? previous.rows.slice() : new Array(data.questions.length);
  let model;
  if (work.order.length || explainIndex !== null) model = build(data, facts);
  for (const i of work.order) rows[i] = forward(model, data.questions[i]);
  const explanation = explainIndex === null ? null : {index: explainIndex, id: data.questions[explainIndex].id,
    ...forward(model, data.questions[explainIndex], {explain: true})};
  return {facts: structuredClone(facts), rows, result: summarize(data, rows, baselineAnswers, explanation),
    work, elapsedMs: performance.now() - start};
}

function createService(makeWorker, count) {
  if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error('workers must be an integer from 1 to 8');
  let pool = [], data = null, facts = null, rows = null, baselineAnswers = null, sequence = 0;
  const pending = new Map();
  let fatal = null;
  function fail(error) {
    fatal = error;
    for (const task of pending.values()) task.reject(error);
    pending.clear();
  }
  function startPool() {
    if (pool.length) return;
    pool = Array.from({length: count}, () => {
      const worker = makeWorker();
      worker.onmessage = ({data: reply}) => {
        const task = pending.get(reply.ticket);
        if (!task) { fail(new Error('Unexpected shard reply')); return; }
        pending.delete(reply.ticket);
        if (reply.error) task.reject(Object.assign(new Error(reply.error.message), {name: reply.error.name}));
        else task.resolve(reply);
      };
      worker.onerror = error => fail(new Error(error.message || 'Scoring worker failed'));
      return worker;
    });
  }
  function rpc(worker, request) {
    if (fatal) return Promise.reject(fatal);
    return new Promise((resolve, reject) => {
      const ticket = ++sequence;
      pending.set(ticket, {resolve, reject});
      try { worker.postMessage({...request, ticket}); }
      catch (error) { pending.delete(ticket); reject(error); }
    });
  }
  async function settle(tasks) {
    const results = await Promise.allSettled(tasks);
    const failed = results.find(r => r.status === 'rejected');
    if (failed) throw failed.reason;
  }
  async function handle(request, emit = () => {}) {
    const start = performance.now(), {id, type} = request;
    try {
      if (!['init', 'rebuild', 'score', 'predict'].includes(type)) throw new Error(`Unknown worker message type: ${type}`);
      if (type !== 'init' && !data && !(type === 'predict' && request.data)) throw new Error('Send init with live_data.json first');
      const nextData = type === 'init' ? request.data : type === 'predict' ? (request.data ?? data) : data;
      const nextFacts = type === 'init' ? nextData.facts : type === 'rebuild' ? request.facts : type === 'predict' ? (request.facts ?? facts ?? nextData.facts) : facts;
      if (!Array.isArray(nextFacts)) throw new Error('facts must be a complete array');
      const explainIndex = request.explainIndex ?? null;
      if (explainIndex !== null && (!Number.isInteger(explainIndex) || explainIndex < 0 || explainIndex >= nextData.questions.length))
        throw new Error('explainIndex is outside the test corpus');
      startPool();
      if (type === 'predict') {
        const index = request.index;
        if (!Number.isInteger(index) || index < 0 || index >= nextData.questions.length) throw new Error('index is outside the test corpus');
        await rpc(pool[0], {type: 'prepare', data: nextData, facts: nextFacts});
        const reply = await rpc(pool[0], {type: 'batch', indices: [index], explainIndex: index});
        return {id, type, result: reply.rows[0][1], elapsedMs: performance.now() - start};
      }
      const work = plan(nextData, type === 'init' ? null : facts, nextFacts);
      const nextRows = type === 'init' ? new Array(nextData.questions.length) : rows.slice();
      let completed = work.reused, right = 0, answered = 0, explanation = null;
      if (work.reused) for (let i = 0; i < nextRows.length; i++) {
        if (!nextRows[i].tied) { answered++; if (nextRows[i].answer === nextData.questions[i].answer) right++; }
      }
      const progress = () => {
        if (request.progress) emit({id, type: 'progress', requestType: type,
          progress: {completed, total: nextRows.length, reused: work.reused, priorityCount: work.priorityCount,
            accuracy: completed ? right / completed + (1 - answered / completed) / 4 : null, final: false}});
      };
      progress();
      if (work.order.length) {
        await settle(pool.map(worker => rpc(worker, {type: 'prepare', data: nextData, facts: nextFacts})));
        let offset = 0;
        await settle(pool.map(async worker => {
          while (offset < work.order.length) {
            const indices = work.order.slice(offset, offset + 32); offset += indices.length;
            const reply = await rpc(worker, {type: 'batch', indices, explainIndex});
            for (const [i, row] of reply.rows) {
              nextRows[i] = row;
              if (!row.tied) { answered++; if (row.answer === nextData.questions[i].answer) right++; }
              if (i === explainIndex) explanation = {index: i, id: nextData.questions[i].id, ...row};
            }
            completed += reply.rows.length;
            progress();
          }
        }));
      } else if (explainIndex !== null) {
        await rpc(pool[0], {type: 'prepare', data: nextData, facts: nextFacts});
        const reply = await rpc(pool[0], {type: 'batch', indices: [explainIndex], explainIndex});
        explanation = {index: explainIndex, id: nextData.questions[explainIndex].id, ...reply.rows[0][1]};
      }
      const result = summarize(nextData, nextRows, type === 'init' ? null : baselineAnswers, explanation);
      data = nextData; facts = structuredClone(nextFacts); rows = nextRows;
      if (type === 'init') baselineAnswers = result.answers.slice();
      return {id, type, result, elapsedMs: performance.now() - start,
        work: {rescored: work.order.length, reused: work.reused, priorityCount: work.priorityCount, workers: count}};
    } catch (error) {
      return {id, type, error: {name: error.name, message: error.message, stack: error.stack}};
    }
  }
  let queue = Promise.resolve();
  return {
    handle(request, emit) {
      const operation = queue.then(() => handle(request, emit));
      queue = operation.then(() => undefined);
      return operation;
    },
    async close() {
      fail(new Error('Scoring service closed'));
      await Promise.all(pool.map(worker => worker.terminate()));
      pool = [];
    }
  };
}

return {summarize, plan, incremental, createService};
})();
globalThis.WSP = __m["fast/engine.js"];
})();
