// ───────── 상태 ─────────
const STORE_KEY = 'fp3_state_v1';
const CHECKLIST_URL = 'https://hyonnie-t.github.io/final-test/';
const LV_TEXT = { 3: '상', 2: '중', 1: '하' };
const CIRCLE = ['①', '②', '③', '④', '⑤'];
const PROB = Object.fromEntries(PROBLEMS.map(p => [p.id, p]));
const topicOf = (id) => TOPICS.find(t => t.id === id);

let S = load();
function load() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) {}
  return { log: s.log || {}, notes: s.notes || {}, studentSolved: s.studentSolved || {}, sy: s.sy || {} };
}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} }

// 문제별 최근 결과
const lastOf = (pid) => { const a = S.log[pid]; return a && a.length ? a[a.length - 1] : null; };
const isWrongOpen = (pid) => S.notes[pid] && !S.notes[pid].solved;
const wrongOpenIds = () => PROBLEMS.filter(p => isWrongOpen(p.id)).map(p => p.id);
const solvedNoteIds = () => PROBLEMS.filter(p => S.notes[p.id] && S.notes[p.id].solved).map(p => p.id);

function record(pid, ok, pick) {
  (S.log[pid] = S.log[pid] || []).push({ t: Date.now(), ok, pick });
  if (!ok) S.notes[pid] = { ...(S.notes[pid] || {}), solved: false, at: Date.now() };
  else if (S.notes[pid]) S.notes[pid].solved = true; // 오답노트에 있던 문제를 다시 맞히면 해결
  save();
  queueSync();
}

// ───────── 공통 ─────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const lvBadge = (lv) => `<span class="lv lv-${lv}"><i class="fa-solid fa-signal text-[8px]"></i>중요도 ${LV_TEXT[lv]}</span>`;
const ansText = (ans) => (Array.isArray(ans) ? ans : [ans]).map(n => CIRCLE[n - 1]).join(', ');
const $view = () => document.getElementById('view');

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 1800);
}

function updateHeader() {
  const done = PROBLEMS.filter(p => lastOf(p.id)).length;
  document.getElementById('hdr-stat').textContent = `${done} / ${PROBLEMS.length} 풀이`;
  document.getElementById('hdr-bar').style.width = `${Math.round(done / PROBLEMS.length * 100)}%`;
  document.getElementById('nav-wrong').classList.toggle('hidden', wrongOpenIds().length === 0);
}

let current = 'home';
function go(view, arg) {
  current = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === view));
  const r = { home: renderHome, topics: renderTopics, notes: renderNotes, analysis: renderAnalysis, student: renderStudent, quiz: renderQuiz, result: renderResult, concept: renderConcept, write: renderWrite, profile: renderProfile }[view];
  r(arg);
  updateHeader();
  window.scrollTo(0, 0);
}

// ───────── 처음 화면 ─────────
function renderHome() {
  const done = PROBLEMS.filter(p => lastOf(p.id));
  const ok = done.filter(p => lastOf(p.id).ok).length;
  const rate = done.length ? Math.round(ok / done.length * 100) : 0;
  const wrongN = wrongOpenIds().length;
  const cnt = (lv) => PROBLEMS.filter(p => p.lv === lv).length;
  $view().innerHTML = `
    <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
      <p class="text-xs text-slate-500">2023~2025 기말고사에서 이번 시험 범위에 맞는 문제 ${PROBLEMS.length}개를 골랐어요.</p>
      <div class="grid grid-cols-3 gap-2 mt-3 text-center">
        <div class="bg-slate-50 rounded-xl py-2"><p class="text-lg font-bold text-indigo-700">${done.length}</p><p class="text-[10px] text-slate-500">푼 문제</p></div>
        <div class="bg-slate-50 rounded-xl py-2"><p class="text-lg font-bold text-emerald-600">${rate}%</p><p class="text-[10px] text-slate-500">최근 정답률</p></div>
        <button onclick="go('notes')" class="bg-rose-50 rounded-xl py-2"><p class="text-lg font-bold text-rose-600">${wrongN}</p><p class="text-[10px] text-rose-500">오답노트</p></button>
      </div>
    </section>

    ${profileCard()}

    <section class="space-y-2">
      <h2 class="text-xs font-bold text-slate-500 px-1"><i class="fa-solid fa-shuffle mr-1"></i>랜덤으로 풀기</h2>
      <div class="grid grid-cols-3 gap-2">
        ${[10, 20, PROBLEMS.length].map(n => `
          <button onclick="startRandom(${n})" class="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-bold shadow-sm">${n === PROBLEMS.length ? '전체' : n + '문제'}<span class="block text-[10px] font-normal text-indigo-200">${n}개 무작위</span></button>`).join('')}
      </div>
      <div class="grid grid-cols-3 gap-2">
        ${[3, 2, 1].map(lv => `
          <button onclick="startLevel(${lv})" class="bg-white border border-slate-200 rounded-xl py-2 text-xs font-bold">${lvBadge(lv)}<span class="block text-[10px] font-normal text-slate-500 mt-1">${cnt(lv)}문제</span></button>`).join('')}
      </div>
      <button onclick="startUnsolved()" class="w-full bg-white border border-slate-200 rounded-xl py-2.5 text-xs font-bold text-slate-700"><i class="fa-regular fa-circle mr-1"></i>아직 안 푼 문제만 (${PROBLEMS.length - done.length})</button>
    </section>

    <section class="space-y-2">
      <h2 class="text-xs font-bold text-slate-500 px-1"><i class="fa-solid fa-layer-group mr-1"></i>주제별로 풀기</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">${topicButtons()}</div>
    </section>

    <section class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed space-y-1">
      <p><b>중요도 상·중·하</b>는 수업에서 강조한 정도를 바탕으로 매긴 <b>공부 우선순위</b>예요. 하라고 해서 안 봐도 되는 건 아니에요!</p>
      <p>문제를 풀면 어떤 지식이 필요한지 알려 주고, 틀린 문제는 <b>오답노트</b>에 모여요. <b>학습 분석</b>에서 무엇부터 공부할지 확인하세요.</p>
    </section>`;
}

function topicButtons() {
  return TOPICS.map(t => {
    const ps = PROBLEMS.filter(p => p.topic === t.id);
    if (!ps.length) return '';
    const done = ps.filter(p => lastOf(p.id)).length;
    return `<button onclick="startTopic('${t.id}')" class="bg-white border border-slate-200 rounded-xl p-2.5 text-left hover:border-indigo-300">
      <span class="text-[10px] font-bold ${t.era === '고려' ? 'text-teal-600' : 'text-indigo-600'}">${t.era}</span>
      <p class="text-xs font-bold text-slate-800 leading-snug">${t.name}</p>
      <p class="text-[10px] text-slate-400 mt-0.5">${done}/${ps.length} 풀이 · ${t.page}</p>
    </button>`;
  }).join('');
}

function renderTopics() {
  $view().innerHTML = `
    <h2 class="text-sm font-bold text-slate-700 px-1">주제를 골라 풀어 보세요</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">${topicButtons()}</div>
    <div class="bg-white border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
      <p class="font-bold mb-1"><i class="fa-solid fa-list-check mr-1 text-indigo-600"></i>교과서 내용부터 정리하고 싶다면</p>
      <a href="${CHECKLIST_URL}" target="_blank" class="text-indigo-600 font-bold underline">기말고사 질문 체크리스트 열기 →</a>
    </div>`;
}

// ───────── 풀이 세션 ─────────
let Q = null; // { title, items: [{kind:'base'|'student', id, data}], idx, results: [{id, ok, pick}], picks: [], checked }

function startSession(title, ids) {
  if (!ids.length) { toast('풀 문제가 없어요'); return; }
  Q = { title, items: ids.map(id => ({ kind: 'base', id, data: PROB[id] })), idx: 0, results: [], picks: [], checked: false };
  go('quiz');
}
function startRandom(n) { startSession(n === PROBLEMS.length ? '전체 랜덤' : `랜덤 ${n}문제`, shuffle(PROBLEMS.map(p => p.id)).slice(0, n)); }
function startLevel(lv) { startSession(`중요도 ${LV_TEXT[lv]} 문제`, shuffle(PROBLEMS.filter(p => p.lv === lv).map(p => p.id))); }
function startUnsolved() { startSession('안 푼 문제', shuffle(PROBLEMS.filter(p => !lastOf(p.id)).map(p => p.id))); }
function startTopic(tid) { startSession(topicOf(tid).name, PROBLEMS.filter(p => p.topic === tid).map(p => p.id)); }
function startWrong() { startSession('오답 다시 풀기', shuffle(wrongOpenIds())); }
function startConcept(cid) { startSession(CONCEPTS[cid].name, PROBLEMS.filter(p => p.c.includes(cid)).map(p => p.id)); }
function startOne(pid) { startSession('한 문제 다시 풀기', [pid]); }

function questionHTML(p, student) {
  const box = p.box ? `<div class="qbox">${student ? esc(p.box).replace(/\n/g, '<br>') : p.box}</div>` : '';
  const bogi = p.bogi ? `<div class="qbox"><p class="text-center text-[11px] font-bold text-slate-500 mb-1">&lt;보기&gt;</p>${p.bogi.map(b => `<p>${b}</p>`).join('')}</div>` : '';
  const q = student ? esc(p.q) : p.q;
  return `<p class="qtext text-sm font-bold leading-relaxed text-slate-900">${q}${p.pts ? ` <span class="text-xs font-normal text-slate-400">(${p.pts}점)</span>` : ''}</p>${box}${bogi}`;
}

function renderQuiz() {
  const it = Q.items[Q.idx];
  const p = it.data;
  const student = it.kind === 'student';
  const multi = Array.isArray(p.ans);
  const ansArr = multi ? p.ans : [p.ans];
  const need = ansArr.length;

  const choiceCls = (i) => {
    const n = i + 1;
    if (!Q.checked) return Q.picks.includes(n) ? 'picked' : '';
    if (ansArr.includes(n)) return 'right';
    if (Q.picks.includes(n)) return 'wrong';
    return '';
  };

  const head = student
    ? `<span class="student-tag"><i class="fa-solid fa-user-pen"></i>학생 출제 · ${esc(p.nick || '익명')}</span>`
    : `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${p.src} ${p.no}번</span>`;

  let after = '';
  if (Q.checked) {
    const ok = Q.results[Q.results.length - 1].ok;
    const concepts = (p.c || []).filter(c => CONCEPTS[c]);
    after = `
      <div class="rounded-xl p-3 ${ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}">
        <p class="text-sm font-bold ${ok ? 'text-emerald-700' : 'text-rose-700'}"><i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1"></i>${ok ? '정답!' : '아쉬워요'} <span class="font-normal text-xs">정답 ${ansText(p.ans)}</span></p>
        <p class="text-xs leading-relaxed text-slate-700 mt-1.5">${student ? esc(p.exp || '해설이 없어요.') : p.exp}</p>
        ${!ok && !student ? '<p class="text-[10px] text-rose-500 mt-1.5"><i class="fa-solid fa-book-bookmark mr-1"></i>오답노트에 담았어요</p>' : ''}
      </div>
      ${concepts.length ? `
      <div class="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
        <p class="text-[11px] font-bold text-slate-500"><i class="fa-solid fa-brain mr-1 text-indigo-500"></i>이 문제를 풀려면 알아야 할 것</p>
        ${concepts.map(cid => conceptMini(cid)).join('')}
      </div>` : ''}
      ${student ? `<button onclick="reportStudent('${p.id}')" class="text-[11px] text-slate-500 underline"><i class="fa-solid fa-flag mr-1"></i>문제에 오류가 있어요 (신고)</button>` : ''}
      <button onclick="nextQ()" class="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl">${Q.idx + 1 < Q.items.length ? '다음 문제 →' : '결과 보기'}</button>`;
  } else {
    after = `<button onclick="checkQ()" ${Q.picks.length === need ? '' : 'disabled'} class="w-full py-3 font-bold text-sm rounded-xl ${Q.picks.length === need ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}">${multi ? `답 ${need}개를 고르고 확인` : '정답 확인'}</button>`;
  }

  $view().innerHTML = `
    <div class="flex items-center justify-between text-[11px] text-slate-500">
      <button onclick="quitQuiz()" class="font-bold"><i class="fa-solid fa-xmark mr-1"></i>그만 풀기</button>
      <span><b class="text-indigo-700">${esc(Q.title)}</b> · ${Q.idx + 1} / ${Q.items.length}</span>
    </div>
    <div class="w-full bg-slate-200 rounded-full h-1.5"><div class="bg-indigo-500 h-full rounded-full" style="width:${(Q.idx + (Q.checked ? 1 : 0)) / Q.items.length * 100}%"></div></div>
    <article class="bg-white rounded-2xl p-4 md:p-6 border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-3 md:items-start">
      <div class="flex flex-wrap gap-1.5 items-center md:col-span-2">${head}${lvBadge(p.lv)}<span class="text-[10px] text-slate-400">${topicOf(p.topic) ? topicOf(p.topic).name : ''}</span></div>
      ${student ? '<p class="md:col-span-2 text-[10px] text-violet-600 bg-violet-50 rounded-lg px-2 py-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i>학생이 만든 문제라 오류가 있을 수 있어요. 교과서와 꼭 비교해 보세요.</p>' : ''}
      <div class="space-y-3">${questionHTML(p, student)}</div>
      <div class="space-y-2">
        ${p.ch.map((c, i) => `<button class="choice ${choiceCls(i)}" ${Q.checked ? 'disabled' : ''} onclick="pickQ(${i + 1})"><span class="num">${i + 1}</span><span>${student ? esc(c) : c === CIRCLE[i] ? '' : c}</span></button>`).join('')}
      </div>
    </article>
    ${after}`;
}

function conceptMini(cid) {
  const c = CONCEPTS[cid];
  return `<details class="group bg-slate-50 rounded-lg px-2.5 py-2">
    <summary class="text-xs font-bold text-slate-800 cursor-pointer list-none flex justify-between items-center">${c.name}<i class="fa-solid fa-chevron-down text-[9px] text-slate-400 group-open:rotate-180 transition-transform"></i></summary>
    <p class="text-[11px] text-slate-600 leading-relaxed mt-1.5">${c.sum}</p>
    <button onclick="go('concept','${cid}')" class="text-[10px] font-bold text-indigo-600 mt-1">자세히 · 관련 문제 →</button>
  </details>`;
}

function pickQ(n) {
  const p = Q.items[Q.idx].data;
  const need = Array.isArray(p.ans) ? p.ans.length : 1;
  if (need === 1) Q.picks = [n];
  else if (Q.picks.includes(n)) Q.picks = Q.picks.filter(x => x !== n);
  else if (Q.picks.length < need) Q.picks = [...Q.picks, n];
  renderQuiz();
}

function checkQ() {
  const it = Q.items[Q.idx];
  const ansArr = Array.isArray(it.data.ans) ? it.data.ans : [it.data.ans];
  const ok = ansArr.length === Q.picks.length && ansArr.every(a => Q.picks.includes(a));
  Q.results.push({ id: it.id, kind: it.kind, ok, pick: Q.picks.slice() });
  if (it.kind === 'base') record(it.id, ok, Q.picks.slice());
  else { S.studentSolved[it.id] = ok; save(); }
  Q.checked = true;
  renderQuiz();
  updateHeader();
}

function nextQ() {
  if (Q.idx + 1 >= Q.items.length) { go('result'); return; }
  Q.idx++; Q.picks = []; Q.checked = false;
  renderQuiz(); window.scrollTo(0, 0);
}

function quitQuiz() {
  if (Q.results.length) go('result'); else go('home');
}

// ───────── 결과 + 학습 안내 ─────────
let lastWrong = [];
function renderResult() {
  const rs = Q.results;
  const ok = rs.filter(r => r.ok).length;
  const base = rs.filter(r => r.kind === 'base');
  // 틀린 문제의 개념을 모아 우선순위(틀린 횟수 × 강조 정도)로 정렬
  const score = {};
  base.filter(r => !r.ok).forEach(r => PROB[r.id].c.forEach(cid => { score[cid] = (score[cid] || 0) + CONCEPTS[cid].w; }));
  const weak = Object.keys(score).sort((a, b) => score[b] - score[a]);
  lastWrong = base.filter(r => !r.ok).map(r => r.id);

  $view().innerHTML = `
    <section class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm text-center space-y-1">
      <p class="text-xs text-slate-500">${esc(Q.title)} 결과</p>
      <p class="text-3xl font-bold text-indigo-700">${ok} <span class="text-base text-slate-400">/ ${rs.length}</span></p>
      <p class="text-xs text-slate-600">${ok === rs.length ? '모두 맞혔어요! 다른 주제도 도전해 보세요.' : `틀린 ${rs.length - ok}문제는 오답노트에 모아 두었어요.`}</p>
    </section>

    <section class="bg-white rounded-2xl p-3 border border-slate-200 space-y-1.5">
      <p class="text-[11px] font-bold text-slate-500 px-1">문제별 결과</p>
      ${rs.map((r, i) => {
        const p = r.kind === 'base' ? PROB[r.id] : Q.items[i].data;
        return `<div class="flex items-center gap-2 text-xs px-1">
          <i class="fa-solid ${r.ok ? 'fa-circle-check text-emerald-500' : 'fa-circle-xmark text-rose-500'}"></i>
          <span class="flex-1 truncate">${r.kind === 'base' ? `${p.src.replace(' 기말', '')} ${p.no}번` : '학생 출제'} · ${(p.q || '').replace(/<[^>]+>/g, '')}</span>
          ${lvBadge(p.lv)}
        </div>`;
      }).join('')}
    </section>

    ${weak.length ? `
    <section class="space-y-2">
      <h2 class="text-sm font-bold text-slate-700 px-1"><i class="fa-solid fa-route mr-1 text-indigo-600"></i>이 순서로 공부해 보세요</h2>
      <div class="grid md:grid-cols-2 gap-3 items-start">${weak.map((cid, i) => studyCard(cid, i + 1)).join('')}</div>
    </section>` : ''}

    <div class="grid grid-cols-2 gap-2">
      ${rs.some(r => !r.ok && r.kind === 'base') ? `<button onclick="startSession('방금 틀린 문제', lastWrong)" class="py-3 bg-rose-500 text-white font-bold text-xs rounded-xl">틀린 문제 다시 풀기</button>` : ''}
      <button onclick="go('home')" class="py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl ${rs.some(r => !r.ok && r.kind === 'base') ? '' : 'col-span-2'}">처음으로</button>
    </div>`;
}

function studyCard(cid, order) {
  const c = CONCEPTS[cid];
  const t = topicOf(c.topic);
  return `<div class="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
    <div class="flex items-start gap-2">
      ${order ? `<span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${order}</span>` : ''}
      <div class="flex-1">
        <p class="text-sm font-bold text-slate-800">${c.name}</p>
        <p class="text-[10px] text-slate-400">${t.era} · ${t.name} · ${t.page}</p>
      </div>
    </div>
    <p class="text-xs text-slate-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg p-2">${c.sum}</p>
    ${c.ck.length ? `<div class="text-[11px] text-slate-600 space-y-0.5">
      <p class="font-bold text-slate-500"><i class="fa-solid fa-list-check mr-1"></i>체크리스트로 스스로 답해 보기</p>
      ${c.ck.map(n => `<p>· ${CHECKLIST[n]}</p>`).join('')}
    </div>` : ''}
    <div class="flex gap-2">
      <button onclick="startConcept('${cid}')" class="flex-1 py-2 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded-lg">관련 기출 풀기 (${PROBLEMS.filter(p => p.c.includes(cid)).length})</button>
      <a href="${CHECKLIST_URL}" target="_blank" class="flex-1 py-2 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-lg text-center">체크리스트 열기</a>
    </div>
  </div>`;
}

function renderConcept(cid) {
  const ps = PROBLEMS.filter(p => p.c.includes(cid));
  $view().innerHTML = `
    <button onclick="go('analysis')" class="text-[11px] font-bold text-slate-500"><i class="fa-solid fa-arrow-left mr-1"></i>학습 분석으로</button>
    ${studyCard(cid, 0)}
    <section class="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
      <p class="text-[11px] font-bold text-slate-500">이 지식이 필요한 기출</p>
      ${ps.map(p => problemRow(p)).join('')}
    </section>`;
}

function problemRow(p) {
  const l = lastOf(p.id);
  const icon = !l ? 'fa-regular fa-circle text-slate-300' : l.ok ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-circle-xmark text-rose-500';
  return `<button onclick="startOne('${p.id}')" class="w-full flex items-center gap-2 text-xs text-left py-1">
    <i class="${icon}"></i>
    <span class="flex-1 truncate">${p.src.replace(' 기말', '')} ${p.no}번 · ${p.q.replace(/<[^>]+>/g, '')}</span>
    ${lvBadge(p.lv)}
  </button>`;
}

// ───────── 오답노트 ─────────
const REASONS = ['개념을 몰랐어요', '헷갈렸어요', '문제를 잘못 읽었어요', '찍었어요'];

function renderNotes() {
  const open = wrongOpenIds();
  const solved = solvedNoteIds();
  $view().innerHTML = `
    <div class="flex items-center justify-between px-1">
      <h2 class="text-sm font-bold text-slate-700"><i class="fa-solid fa-book-bookmark mr-1 text-rose-500"></i>오답노트 (${open.length})</h2>
      ${open.length ? `<button onclick="startWrong()" class="text-xs font-bold bg-rose-500 text-white px-3 py-1.5 rounded-full">모두 다시 풀기</button>` : ''}
    </div>
    ${open.length ? '' : `<div class="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-2">
      <i class="fa-solid fa-circle-check text-4xl text-emerald-400"></i>
      <p class="text-xs font-bold text-slate-600">남은 오답이 없어요!</p>
      <p class="text-[11px]">문제를 풀다 틀리면 여기에 모여요. 다시 맞히면 '해결'로 옮겨져요.</p></div>`}
    <div class="grid md:grid-cols-2 gap-3 items-start">${open.map(pid => noteCard(pid)).join('')}</div>
    ${solved.length ? `<details class="bg-white rounded-xl border border-slate-200 p-3">
      <summary class="text-xs font-bold text-emerald-700 cursor-pointer"><i class="fa-solid fa-check mr-1"></i>다시 풀어서 해결한 문제 (${solved.length})</summary>
      <div class="mt-2 space-y-1">${solved.map(pid => problemRow(PROB[pid])).join('')}</div>
    </details>` : ''}`;
}

function noteCard(pid) {
  const p = PROB[pid];
  const n = S.notes[pid] || {};
  const wrongPicks = (S.log[pid] || []).filter(x => !x.ok).slice(-1)[0];
  return `<article class="bg-white rounded-2xl p-3.5 border border-slate-200 space-y-2">
    <div class="flex flex-wrap gap-1.5 items-center">
      <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${p.src} ${p.no}번</span>${lvBadge(p.lv)}
      <span class="text-[10px] text-rose-500 ml-auto">틀린 횟수 ${(S.log[pid] || []).filter(x => !x.ok).length}</span>
    </div>
    <details>
      <summary class="text-xs font-bold text-slate-800 cursor-pointer leading-relaxed">${p.q}</summary>
      <div class="mt-2 space-y-2 text-xs">
        ${p.box ? `<div class="qbox">${p.box}</div>` : ''}
        ${p.bogi ? `<div class="qbox">${p.bogi.map(b => `<p>${b}</p>`).join('')}</div>` : ''}
        ${p.ch.map((c, i) => `<p class="${(Array.isArray(p.ans) ? p.ans : [p.ans]).includes(i + 1) ? 'text-emerald-700 font-bold' : wrongPicks && wrongPicks.pick.includes(i + 1) ? 'text-rose-600 line-through' : 'text-slate-600'}">${CIRCLE[i]} ${c === CIRCLE[i] ? '' : c}</p>`).join('')}
        <p class="bg-emerald-50 rounded-lg p-2 leading-relaxed">${p.exp}</p>
        <div class="space-y-1">${p.c.map(cid => conceptMini(cid)).join('')}</div>
      </div>
    </details>
    <div class="flex flex-wrap gap-1">
      ${REASONS.map(r => `<button onclick="setReason('${pid}', '${r}')" class="chip ${n.reason === r ? 'on' : ''}">${r}</button>`).join('')}
    </div>
    <textarea onchange="setMemo('${pid}', this.value)" rows="2" placeholder="나만의 메모 (예: 사헌부=감찰, 사간원=간쟁 헷갈림)" class="w-full border border-slate-200 rounded-lg p-2 text-xs">${esc(n.memo || '')}</textarea>
    <button onclick="startOne('${pid}')" class="w-full py-2 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg">이 문제 다시 풀기</button>
  </article>`;
}
function setReason(pid, r) { S.notes[pid].reason = S.notes[pid].reason === r ? '' : r; save(); renderNotes(); }
function setMemo(pid, v) { S.notes[pid].memo = v; save(); toast('메모를 저장했어요'); }

// ───────── 학습 분석 ─────────
function conceptStats() {
  // 각 개념: 관련 문제의 최근 결과로 계산
  return Object.keys(CONCEPTS).map(cid => {
    const ps = PROBLEMS.filter(p => p.c.includes(cid));
    const tried = ps.filter(p => lastOf(p.id));
    const ok = tried.filter(p => lastOf(p.id).ok).length;
    return { cid, total: ps.length, tried: tried.length, ok, wrong: tried.length - ok };
  }).filter(x => x.total);
}

function renderAnalysis() {
  const stats = conceptStats();
  const triedAny = stats.some(s => s.tried);
  const weak = stats.filter(s => s.wrong).sort((a, b) => (b.wrong * CONCEPTS[b.cid].w) - (a.wrong * CONCEPTS[a.cid].w) || (a.ok / a.tried) - (b.ok / b.tried));
  const untried = stats.filter(s => !s.tried).sort((a, b) => CONCEPTS[b.cid].w - CONCEPTS[a.cid].w);
  const good = stats.filter(s => s.tried && !s.wrong);

  const topicBars = TOPICS.map(t => {
    const ps = PROBLEMS.filter(p => p.topic === t.id);
    const tried = ps.filter(p => lastOf(p.id));
    const ok = tried.filter(p => lastOf(p.id).ok).length;
    const rate = tried.length ? Math.round(ok / tried.length * 100) : null;
    return `<div class="space-y-0.5">
      <div class="flex justify-between text-[11px]"><span class="font-bold text-slate-700">${t.name}</span><span class="text-slate-500">${rate === null ? '아직 안 풂' : `${rate}% (${ok}/${tried.length})`}</span></div>
      <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full rounded-full ${rate === null ? '' : rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-rose-500'}" style="width:${rate || 0}%"></div></div>
    </div>`;
  }).join('');

  $view().innerHTML = `
    <section class="bg-white rounded-2xl p-4 border border-slate-200 space-y-2.5">
      <h2 class="text-sm font-bold text-slate-700"><i class="fa-solid fa-chart-simple mr-1 text-indigo-600"></i>주제별 정답률</h2>
      ${topicBars}
    </section>

    ${!triedAny ? `<div class="bg-white rounded-2xl p-6 text-center border border-slate-200 text-xs text-slate-500">문제를 풀면 어떤 지식이 부족한지 분석해 드려요.<br><button onclick="startRandom(10)" class="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold rounded-full">10문제 풀어 보기</button></div>` : ''}

    ${weak.length ? `<section class="space-y-2">
      <h2 class="text-sm font-bold text-slate-700 px-1"><i class="fa-solid fa-route mr-1 text-rose-500"></i>먼저 다시 공부할 것</h2>
      <div class="grid md:grid-cols-2 gap-3 items-start">${weak.map((s, i) => `<div class="relative">${studyCard(s.cid, i + 1)}<span class="absolute top-3 right-3 text-[10px] font-bold text-rose-500">관련 문제 ${s.wrong}개 틀림</span></div>`).join('')}</div>
    </section>` : ''}

    ${untried.length && triedAny ? `<section class="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
      <p class="text-[11px] font-bold text-slate-500"><i class="fa-regular fa-circle mr-1"></i>아직 확인 안 한 지식 — 관련 문제를 풀어 보세요</p>
      <div class="flex flex-wrap gap-1.5">${untried.map(s => `<button onclick="startConcept('${s.cid}')" class="chip">${CONCEPTS[s.cid].name}</button>`).join('')}</div>
    </section>` : ''}

    ${good.length ? `<section class="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
      <p class="text-[11px] font-bold text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i>잘 알고 있는 지식</p>
      <div class="flex flex-wrap gap-1.5">${good.map(s => `<button onclick="go('concept','${s.cid}')" class="chip">${CONCEPTS[s.cid].name}</button>`).join('')}</div>
    </section>` : ''}

    ${triedAny ? `<button onclick="resetAll()" class="w-full text-[11px] text-slate-400 underline py-2">풀이 기록 모두 지우기</button>` : ''}`;
}

function resetAll() {
  if (!confirm('풀이 기록과 오답노트를 모두 지울까요? 되돌릴 수 없어요.')) return;
  S = { log: {}, notes: {}, studentSolved: {}, sy: {} }; save(); go('home');
}

// ───────── 내 정보 · 서버 동기화 ─────────
// 풀이 기록은 history26 백엔드(기말점검_기록, 세트 past)에 문항별 최근 결과만 올린다. 오답노트 메모·이유는 이 기기에만 있다.
let syncState = 'local'; // local | pending | ok | err
let syncTimer = null, syncing = false;
const SYNC_TEXT = { local: '이 기기에만 저장돼요', pending: '☁️ 저장 중…', ok: '☁️ 선생님께 저장됨', err: '⚠️ 저장 실패 · 자동으로 다시 시도해요' };
function setSync(st) {
  syncState = st;
  const el = document.getElementById('sync-st');
  if (el) el.textContent = SYNC_TEXT[st] || '';
}
const pendingIds = () => PROBLEMS.filter(p => lastOf(p.id) && lastOf(p.id).t > (S.sy[p.id] || 0)).map(p => p.id);
function queueSync() {
  if (!Share.profile) return;
  setSync('pending');
  clearTimeout(syncTimer); syncTimer = setTimeout(flushSync, 1200);
}
async function flushSync() {
  if (!Share.profile || syncing) return;
  const ids = pendingIds();
  if (!ids.length) { setSync('ok'); return; }
  syncing = true;
  try {
    const batch = ids.slice(0, 100);
    const items = batch.map(id => { const l = lastOf(id); return { set: PAST_SET, qid: id, know: l.ok ? 'know' : 'unknown', ans: l.pick.join(','), self: '', sub: true, ts: l.t }; });
    await Share.saveRecords(items);
    batch.forEach(id => { S.sy[id] = lastOf(id).t; });
    save();
    syncing = false;
    if (pendingIds().length) return flushSync();
    setSync('ok');
  } catch (err) {
    syncing = false; setSync('err');
    clearTimeout(syncTimer); syncTimer = setTimeout(flushSync, 60000);
  }
}
window.addEventListener('online', () => { if (pendingIds().length) queueSync(); });

// 서버 기록을 합친다(문항마다 더 새로운 쪽이 이김)
function mergeRecords(items) {
  items.forEach(it => {
    const p = it.set === PAST_SET && PROB[it.qid];
    if (!p) return;
    const ts = it.ts || 0;
    if (lastOf(p.id) && lastOf(p.id).t >= ts) { S.sy[p.id] = Math.max(S.sy[p.id] || 0, ts); return; }
    const ok = it.know === 'know';
    (S.log[p.id] = S.log[p.id] || []).push({ t: ts, ok, pick: String(it.ans || '').split(',').map(Number).filter(Boolean) });
    S.log[p.id].sort((a, b) => a.t - b.t);
    if (!ok) S.notes[p.id] = { ...(S.notes[p.id] || {}), solved: false, at: ts };
    else if (S.notes[p.id]) S.notes[p.id].solved = true;
    S.sy[p.id] = ts;
  });
  save();
}

function profileCard() {
  const p = Share.profile;
  return p
    ? `<section class="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between text-[11px]">
        <span class="font-bold text-slate-700">👤 ${esc(p.sid)} ${esc(p.name)}</span>
        <span id="sync-st" class="text-slate-500">${SYNC_TEXT[syncState]}</span>
        <button onclick="go('profile')" class="text-indigo-600 font-bold">바꾸기</button>
      </section>`
    : `<button onclick="go('profile')" class="w-full text-left bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 text-[11px] text-violet-900 leading-relaxed">
        <b>👤 내 정보 입력하기</b> — 풀이 기록이 선생님께 저장되고, 다른 기기에서도 이어 풀 수 있고, 친구들 문제 올리기에도 참여할 수 있어요. (입력 안 해도 풀기는 돼요)
      </button>`;
}

function renderProfile() {
  const p = Share.profile;
  $view().innerHTML = `
    <button onclick="go('home')" class="text-[11px] font-bold text-slate-500"><i class="fa-solid fa-arrow-left mr-1"></i>처음으로</button>
    <form id="pform" onsubmit="submitProfile(event)" class="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 text-xs" autocomplete="off">
      <h2 class="text-sm font-bold text-slate-800">👤 내 정보</h2>
      <p class="text-slate-500 leading-relaxed">입력하면 내 풀이 기록이 선생님만 볼 수 있는 서버에 저장되고 다른 기기에서도 이어 할 수 있어요. 공개된 곳에는 올라가지 않아요.</p>
      <label class="block space-y-1"><span class="font-bold text-slate-600">학번</span>
        <input type="text" name="sid" inputmode="numeric" maxlength="12" required value="${p ? esc(p.sid) : ''}" class="w-full border border-slate-300 rounded-lg p-2" placeholder="예: 30101"></label>
      <label class="block space-y-1"><span class="font-bold text-slate-600">이름</span>
        <input type="text" name="name" maxlength="20" required value="${p ? esc(p.name) : ''}" class="w-full border border-slate-300 rounded-lg p-2" placeholder="예: 홍길동"></label>
      <p id="perr" class="text-rose-600" role="alert"></p>
      <button class="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl">저장하고 불러오기</button>
      ${p ? '<button type="button" onclick="logoutProfile()" class="w-full py-2 text-[11px] text-slate-500 underline">이 기기에서 내 정보 지우기</button>' : ''}
    </form>`;
}

async function submitProfile(e) {
  e.preventDefault();
  const f = e.target;
  const np = { sid: f.sid.value.trim(), name: f.name.value.trim() };
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = '확인 중…';
  document.getElementById('perr').textContent = '';
  try {
    const items = await Share.loadRecords(np);
    Share.setProfile(np);
    S.sy = {}; // 이 기기의 기록은 전부 다시 올린다(서버가 더 새로우면 서버 것을 받음)
    mergeRecords(items);
    save(); toast('불러왔어요'); go('home'); flushSync();
  } catch (err) {
    document.getElementById('perr').textContent = err instanceof TypeError || err.name === 'AbortError'
      ? '서버에 연결하지 못했어요. 네트워크를 확인해 주세요. (이 기기에서는 계속 쓸 수 있어요)'
      : '학번과 이름을 확인해 주세요.';
    btn.disabled = false; btn.textContent = '저장하고 불러오기';
  }
}

function logoutProfile() {
  if (!confirm('이 기기에서 내 정보를 지울까요?\n(서버에 저장된 기록은 그대로 있고, 이 기기의 풀이 기록도 남아요.)')) return;
  Share.setProfile(null); S.sy = {}; save(); setSync('local'); go('home');
}

// ───────── 학생 출제 ─────────
const studentLevel = (cids) => {
  const ws = cids.map(c => CONCEPTS[c] ? CONCEPTS[c].w : 1);
  const avg = ws.reduce((a, b) => a + b, 0) / (ws.length || 1);
  return avg >= 2.6 ? 3 : avg >= 1.8 ? 2 : 1;
};
let studentList = [];
let studentFilter = 'all';

async function renderStudent() {
  $view().innerHTML = `
    <div class="flex items-center justify-between px-1">
      <h2 class="text-sm font-bold text-slate-700"><i class="fa-solid fa-pen-nib mr-1 text-violet-600"></i>학생 출제 문제</h2>
      <button onclick="go('write')" class="text-xs font-bold bg-violet-600 text-white px-3 py-1.5 rounded-full"><i class="fa-solid fa-plus mr-1"></i>문제 만들기</button>
    </div>
    <p class="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl p-2.5 leading-relaxed">
      <i class="fa-solid fa-triangle-exclamation mr-1"></i>친구들이 직접 만든 문제예요. <b>오류가 있을 수 있으니</b> 교과서와 비교하며 풀고, 이상하면 신고해 주세요.
      ${Share.profile ? '' : '<br><b>문제를 올리거나 신고하려면 \'내 정보\'(학번·이름)가 필요해요.</b> 풀어 보기만 하는 건 입력 없이 돼요.'}
    </p>
    <div id="slist" class="space-y-2"><p class="text-center text-xs text-slate-400 py-6"><i class="fa-solid fa-spinner fa-spin mr-1"></i>불러오는 중…</p></div>`;
  try { studentList = await Share.list(); } catch (e) { document.getElementById('slist').innerHTML = '<p class="text-center text-xs text-rose-500 py-6">문제를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.<br><span class="text-slate-400">(인터넷이 느리면 몇 초 걸릴 수 있어요)</span></p>'; return; }
  drawStudentList();
}

function drawStudentList() {
  const el = document.getElementById('slist');
  if (!el) return;
  let list = studentList.slice().sort((a, b) => ((a.reports || 0) >= 3) - ((b.reports || 0) >= 3) || b.created - a.created);
  if (studentFilter !== 'all') list = list.filter(p => p.topic === studentFilter);
  const chips = `<div class="flex gap-1.5 overflow-x-auto pb-1">${[{ id: 'all', name: '전체' }, ...TOPICS].map(t => `<button onclick="studentFilter='${t.id}';drawStudentList()" class="chip ${studentFilter === t.id ? 'on' : ''}">${t.name}</button>`).join('')}</div>`;
  if (!list.length) { el.innerHTML = chips + '<div class="bg-white rounded-2xl p-8 text-center border border-slate-200 text-xs text-slate-500">아직 문제가 없어요. 첫 문제를 만들어 보세요!</div>'; return; }
  el.innerHTML = chips + (list.length > 1 ? `<button onclick="startStudent()" class="w-full py-2.5 text-xs font-bold bg-violet-100 text-violet-700 rounded-xl">보이는 문제 모두 풀기 (${list.length})</button>` : '') +
    list.map(p => {
      const solved = p.id in S.studentSolved;
      const flagged = (p.reports || 0) >= 3;
      return `<button onclick="startStudent('${p.id}')" class="w-full text-left bg-white rounded-xl border ${flagged ? 'border-amber-300 opacity-70' : 'border-slate-200'} p-3 space-y-1">
        <div class="flex flex-wrap gap-1.5 items-center">
          <span class="student-tag"><i class="fa-solid fa-user-pen"></i>학생 출제 · ${esc(p.nick || '익명')}</span>${lvBadge(p.lv)}
          ${solved ? `<i class="fa-solid ${S.studentSolved[p.id] ? 'fa-circle-check text-emerald-500' : 'fa-circle-xmark text-rose-500'} ml-auto"></i>` : ''}
        </div>
        <p class="text-xs font-bold text-slate-800 leading-relaxed">${esc(p.q)}</p>
        <p class="text-[10px] text-slate-400">${topicOf(p.topic) ? topicOf(p.topic).name : ''}${p.reports ? ` · 오류 신고 ${p.reports}건${flagged ? ' (선생님 확인 필요)' : ''}` : ''}</p>
      </button>`;
    }).join('');
}

function startStudent(id) {
  let list = studentFilter === 'all' ? studentList : studentList.filter(p => p.topic === studentFilter);
  if (id) list = list.filter(p => p.id === id);
  if (!list.length) return;
  Q = { title: '학생 출제 문제', items: shuffle(list).map(p => ({ kind: 'student', id: p.id, data: p })), idx: 0, results: [], picks: [], checked: false };
  go('quiz');
}

async function reportStudent(id) {
  if (!Share.profile) { toast('신고하려면 먼저 \'내 정보\'를 입력해 주세요'); go('profile'); return; }
  if (!confirm('이 문제에 오류가 있다고 신고할까요?')) return;
  try {
    const r = await Share.report(id);
    toast(r.duplicate ? '이미 신고한 문제예요' : '신고했어요. 고마워요!');
  } catch (e) { toast(e instanceof TypeError || e.name === 'AbortError' ? '서버에 연결하지 못했어요' : e.message); }
}

const conceptOpts = (tid) => Object.entries(CONCEPTS).filter(([, c]) => c.topic === tid)
  .map(([cid, c]) => `<label class="flex items-start gap-2 text-xs py-0.5"><input type="checkbox" name="wc" value="${cid}" class="mt-0.5"> ${c.name}</label>`).join('');
function fillConcepts(tid) { document.getElementById('wconcepts').innerHTML = conceptOpts(tid); }

function renderWrite() {
  if (!Share.profile) {
    $view().innerHTML = `<button onclick="go('student')" class="text-[11px] font-bold text-slate-500"><i class="fa-solid fa-arrow-left mr-1"></i>학생 출제 목록으로</button>
      <div class="bg-white rounded-2xl p-6 border border-slate-200 text-center space-y-3"><p class="text-sm font-bold text-slate-800">문제를 올리려면 내 정보가 필요해요</p>
      <p class="text-xs text-slate-500">학번·이름은 선생님만 볼 수 있고, 다른 친구들에게는 별명만 보여요.</p>
      <button onclick="go('profile')" class="px-5 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-xl">내 정보 입력하기</button></div>`;
    return;
  }
  $view().innerHTML = `
    <button onclick="go('student')" class="text-[11px] font-bold text-slate-500"><i class="fa-solid fa-arrow-left mr-1"></i>학생 출제 목록으로</button>
    <form id="wform" onsubmit="submitWrite(event)" class="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
      <h2 class="text-sm font-bold text-slate-800"><i class="fa-solid fa-pen-nib mr-1 text-violet-600"></i>내가 만드는 기말 대비 문제</h2>
      <label class="block space-y-1"><span class="font-bold text-slate-600">별명 <span class="font-normal text-slate-400">(실명·학번은 쓰지 마세요)</span></span>
        <input type="text" name="nick" maxlength="12" required class="w-full border border-slate-300 rounded-lg p-2" placeholder="예: 역사왕"></label>
      <label class="block space-y-1"><span class="font-bold text-slate-600">주제</span>
        <select name="topic" required onchange="fillConcepts(this.value)" class="w-full border border-slate-300 rounded-lg p-2">
          ${TOPICS.map(t => `<option value="${t.id}">${t.era} · ${t.name}</option>`).join('')}
        </select></label>
      <div class="space-y-1"><span class="font-bold text-slate-600">이 문제를 풀려면 알아야 할 지식 <span class="font-normal text-slate-400">(1개 이상)</span></span>
        <div id="wconcepts" class="bg-slate-50 rounded-lg p-2">${conceptOpts(TOPICS[0].id)}</div></div>
      <label class="block space-y-1"><span class="font-bold text-slate-600">발문</span>
        <input type="text" name="q" maxlength="120" required class="w-full border border-slate-300 rounded-lg p-2" placeholder="예: 다음 정책을 펼친 국왕으로 옳은 것은?"></label>
      <label class="block space-y-1"><span class="font-bold text-slate-600">자료 <span class="font-normal text-slate-400">(선택)</span></span>
        <textarea name="box" rows="3" maxlength="400" class="w-full border border-slate-300 rounded-lg p-2" placeholder="문제에 넣을 자료나 사료"></textarea></label>
      <div class="space-y-1.5"><span class="font-bold text-slate-600">선택지 (정답에 체크)</span>
        ${[1, 2, 3, 4, 5].map(n => `<div class="flex items-center gap-2"><input type="radio" name="ans" value="${n}" required><span class="font-bold text-slate-500">${n}</span><input type="text" name="ch${n}" maxlength="80" required class="flex-1 border border-slate-300 rounded-lg p-1.5"></div>`).join('')}
      </div>
      <label class="block space-y-1"><span class="font-bold text-slate-600">해설</span>
        <textarea name="exp" rows="3" maxlength="400" required class="w-full border border-slate-300 rounded-lg p-2" placeholder="왜 그 답이 맞는지, 다른 선택지는 왜 틀린지"></textarea></label>
      <p class="text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2">올린 문제는 '학생 출제' 표시와 함께 모든 친구에게 공유돼요(선생님은 작성자를 볼 수 있어요). 한 사람이 10개까지 올릴 수 있어요. 중요도는 고른 지식을 바탕으로 자동으로 매겨져요. 한 번 올리면 고칠 수 없으니 교과서로 한 번 더 확인하세요.</p>
      <button class="w-full py-3 bg-violet-600 text-white font-bold text-sm rounded-xl">문제 올리기</button>
    </form>`;
}

async function submitWrite(e) {
  e.preventDefault();
  const f = e.target;
  const cids = [...f.querySelectorAll('input[name=wc]:checked')].map(x => x.value);
  if (!cids.length) { toast('알아야 할 지식을 1개 이상 골라 주세요'); return; }
  const p = {
    nick: f.nick.value.trim(), topic: f.topic.value, c: cids, lv: studentLevel(cids),
    q: f.q.value.trim(), box: f.box.value.trim(), ch: [1, 2, 3, 4, 5].map(n => f['ch' + n].value.trim()),
    ans: Number(f.ans.value), exp: f.exp.value.trim()
  };
  const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = '올리는 중…';
  try { await Share.add(p); toast('문제를 올렸어요!'); go('student'); }
  catch (err) { toast(err instanceof TypeError || err.name === 'AbortError' ? '서버에 연결하지 못했어요. 다시 시도해 주세요' : err.message); btn.disabled = false; btn.textContent = '문제 올리기'; }
}

if (Share.profile) {
  setSync('pending');
  Share.loadRecords(Share.profile)
    .then(items => { mergeRecords(items); if (current === 'home') go('home'); return flushSync(); })
    .catch(() => setSync('err'));
}
go('home');
