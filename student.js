/* How Often? 학생 화면 */
(function () {
'use strict';
var HO = window.HO, esc = HO.esc;
var app = document.getElementById('app'), modalEl = document.getElementById('modal');
document.documentElement.classList.add('stu');

var S = {
  screen: 'join', db: null, code: '', sid: '', name: '', offs: [], R: {}, gotMeta: false, seenMe: false, conn: true,
  view: 'list', edit: null, typer: { text: '', shift: false }, warned: false, msg: '', msgCls: '', ideas: true, joinErr: '', busy: false
};

/* ---------- 입장 ---------- */
function joinHTML() {
  var q = (location.search.match(/[?&]r=(\d{4})/) || [])[1] || '', saved = HO.store.get('ho-stu', {});
  return '<div class="stu-join"><section class="card join"><div class="em">📊</div><h1>How Often?</h1><div class="sub">우리 반 설문 조사</div>' +
    '<form id="jf" autocomplete="off"><div class="field"><label for="jc">방 번호</label><input id="jc" class="code-in" inputmode="numeric" maxlength="4" placeholder="0 0 0 0" value="' + esc(q || (S.codeIn || '')) + '"></div>' +
    '<div class="field"><label for="jn">이름 · 번호 <small>(선생님만 봐요)</small></label><input id="jn" type="text" maxlength="20" placeholder="예) 7번 민수" value="' + esc(S.nameIn || saved.name || '') + '"></div>' +
    '<p class="err" id="jerr">' + esc(S.joinErr) + '</p><button class="go" type="submit"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? '들어가는 중…' : '들어가기') + '</button></form></section></div>';
}
function showJoin(err) {
  teardown(); S.screen = 'join'; S.joinErr = err || ''; S.busy = false;
  hideKb(); app.innerHTML = joinHTML();
  var f = document.getElementById('jf'), c = document.getElementById('jc'), n = document.getElementById('jn');
  f.onsubmit = function (e) {
    e.preventDefault();
    var code = c.value.replace(/\D/g, ''), name = n.value.trim();
    S.codeIn = code; S.nameIn = name;
    if (!/^\d{4}$/.test(code)) { document.getElementById('jerr').textContent = '방 번호 4자리를 써 주세요.'; c.focus(); return; }
    if (!name) { document.getElementById('jerr').textContent = '이름이나 번호를 써 주세요.'; n.focus(); return; }
    doJoin(code, name);
  };
  setTimeout(function () { (c.value ? n : c).focus(); }, 50);
}
function doJoin(code, name) {
  S.busy = true; var b = document.querySelector('.join .go'); if (b) { b.disabled = true; b.textContent = '들어가는 중…'; }
  HO.openDB().then(function (db) {
    return HO.W.join(db, code, name).then(function (sid) { enter(db, code, sid, name); });
  }).catch(function (e) {
    showJoin(e && e.msg ? e.msg : '서버와 연결이 불안정해요. 잠시 뒤 다시 해 주세요.');
  });
}

/* ---------- 방 안 ---------- */
function teardown() {
  S.offs.forEach(function (f) { try { f(); } catch (e) {} }); S.offs = [];
  S.gotMeta = false; S.seenMe = false; S.R = {};
}
function enter(db, code, sid, name) {
  teardown();
  S.db = db; S.code = code; S.sid = sid; S.name = name; S.screen = 'room'; S.view = 'list'; S.edit = null; S.typer = { text: '', shift: false }; S.msg = ''; S.busy = false;
  HO.store.set('ho-stu', { code: code, name: name });
  S.offs.push(db.on(HO.path(code, 'meta'), function (v) { S.R.meta = v; S.gotMeta = true; render(); }));
  S.offs.push(db.on(HO.path(code, 'questions'), function (v) { S.R.questions = v; render(); }));
  S.offs.push(db.on(HO.path(code, 'sel'), function (v) { S.R.sel = v; render(); }));
  S.offs.push(db.on(HO.path(code, 'students/' + sid), function (v) {
    if (v) S.seenMe = true; else if (S.seenMe) { S.screen = 'kicked'; }
    render();
  }));
  S.offs.push(db.on(HO.path(code, 'answers/' + sid), function (v) { S.R.answers = v; render(); }));
  S.offs.push(db.onConnection(function (c) { if (S.conn !== c) { S.conn = c; render(); } }));
  render();
}
var raf = 0;
function render() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(); }); }

function mine() {
  var Q = S.R.questions || {}, sel = S.R.sel || {};
  return Object.keys(Q).filter(function (k) { return Q[k] && Q[k].text && Q[k].authors && Q[k].authors[S.sid]; })
    .map(function (k) { return { k: k, text: Q[k].text, t: Q[k].t || 0, picked: sel[k] != null }; })
    .sort(function (a, b) { return a.t - b.t; });
}
function myAnswers() { return S.R.answers || {}; }

function topHTML() {
  return '<header class="top"><div class="brand"><span class="em">📊</span><span>How Often?</span></div><span class="me">방 ' + S.code + ' · ' + esc(S.name) + '</span>' +
    (!S.conn ? '<span class="badge off">연결 끊김 · 다시 붙는 중</span>' : '') + '<div class="spacer"></div><button class="tbtn ghost" data-act="leave">나가기</button></header>';
}
function draw() {
  if (S.screen === 'join') return;
  var meta = S.R.meta;
  if (S.screen === 'kicked') return endScreen('👋', '선생님이 방에서 내보냈어요.', '처음 화면으로');
  if (S.gotMeta && (!meta || meta.closed)) return endScreen('👋', meta ? '설문 방이 닫혔어요. 고마워요! 👋' : '설문 방이 닫혔어요. 새 방 번호로 들어와 주세요.', '처음 화면으로', true);
  if (!S.gotMeta) { app.innerHTML = '<div class="stu">' + topHTML() + '<div class="sbody2 nokb"><div class="wait"><div class="big">⏳</div><p>방에 연결하는 중…</p></div></div></div>'; hideKb(); return; }
  var ph = meta.phase || 'collect', body = '', kb = null;
  if (ph === 'collect') { var r = collectBody(meta); body = r.html; kb = r.kb; }
  else if (ph === 'answer') {
    if (S.view === 'edit' && S.edit) { var e = editBody(meta); body = e.html; kb = e.kb; } else { S.view = 'list'; body = listBody(); }
  } else {
    S.view = 'list';
    body = '<div class="wait"><div class="big">📺</div><h2><span class="tv">TV</span>를 보세요!</h2><p>우리 반 대답을 모아서 보여 줘요. 누가 썼는지는 안 나와요.</p></div>';
  }
  app.innerHTML = '<div class="stu">' + topHTML() + '<div class="sbody2' + (kb ? '' : ' nokb') + '" id="body">' + body + '</div></div>';
  if (kb) showKb(kb); else hideKb();
  updTyper();
}
function endScreen(em, text, btn, clear) {
  hideKb(); HO.store.del('ho-stu'); teardown();
  app.innerHTML = '<div class="stu-join"><section class="card join"><div class="em" style="border:0;background:none;font-size:3.4rem">' + em + '</div><h1 style="font-size:1.35rem;margin-top:.6rem">' + esc(text) + '</h1><button class="go" data-act="home">' + btn + '</button></section></div>';
}

/* 1. 질문 만들기 */
function collectBody(meta) {
  var per = meta.per || 2, my = mine(), full = my.length >= per;
  var html = '<h2 class="stitle">친구들에게 물어볼 질문을 만들어요</h2><p class="sdesc">빈칸에 영어로 써요. 물음표는 이미 있어요. 질문은 <b>' + per + '개</b>까지 낼 수 있어요.</p>';
  if (full) html += '<div class="full"><b>질문을 다 냈어요!</b><p>선생님이 질문을 고르면 대답하는 시간이 시작돼요. 바꾸고 싶으면 ✕로 지우고 다시 써요.</p></div>';
  else {
    html += '<div class="tline"><span class="pre">How often do you</span><span class="tf" id="tf"></span><span class="q">?</span></div>' +
      '<div class="msg ' + S.msgCls + '" id="msg">' + esc(S.msg) + '</div>' +
      '<div class="ideas"><button class="tg" data-act="ideas">' + (S.ideas ? '💡 아이디어 접기' : '💡 생각이 안 나면?') + '</button>' +
      (S.ideas ? '<div class="chips">' + HO.IDEAS.map(function (v) { return '<button class="chip" data-act="idea" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  html += '<div class="mine"><h3>내가 낸 질문 <b>' + my.length + '/' + per + '</b></h3>' + (my.length ? my.map(function (q) {
    return '<div class="mq"><span>' + esc(HO.question(q.text)) + '</span>' + (q.picked ? '<em class="tag">선생님이 골랐어요</em>' : '<button class="x" data-act="rmq" data-k="' + esc(q.k) + '" aria-label="지우기">✕</button>') + '</div>';
  }).join('') : '<p class="sdesc" style="margin:0">아직 낸 질문이 없어요.</p>') + '</div>';
  return { html: html, kb: full ? null : { mode: 'q' } };
}

/* 2. 대답하기: 목록 */
function selList() { return HO.selectedList(S.R); }
function listBody() {
  var sel = selList(), A = myAnswers(), left = sel.filter(function (q) { return !(A[q.k] && A[q.k].e); }).length;
  if (!sel.length) return '<div class="wait"><div class="big">⏳</div><h2>질문을 기다려요</h2><p>선생님이 질문을 고르고 있어요.</p></div>';
  var html = '<h2 class="stitle">친구들의 질문에 대답해요' + (left ? '<span class="left">' + left + '개 남았어요</span>' : '') + '</h2>';
  html += left ? '<p class="sdesc">빨간 질문을 눌러서 대답해요.</p>' :
    '<div class="alldone"><b>다 했어요! Good job!</b><p>친구들이 끝나면 선생님이 TV로 결과를 보여 줘요. 고치고 싶으면 눌러요.</p></div>';
  html += '<div class="alist">' + sel.map(function (q, i) {
    var a = A[q.k], done = a && a.e;
    return '<button class="acard ' + (done ? 'done' : 'todo') + '" data-act="open" data-k="' + esc(q.k) + '"><div class="n"><i>' + (i + 1) + '번</i><b>' + esc(HO.question(q.text)) + '</b></div>' +
      '<div class="a">' + (done ? esc(HO.sentence(q.text, a.e)) : '아직 안 했어요 ✏️') + '</div></button>';
  }).join('') + '</div>';
  return html;
}

/* 2. 대답하기: 쓰기 */
function editBody(meta) {
  var sel = selList(), idx = -1;
  sel.forEach(function (q, i) { if (q.k === S.edit.k) idx = i; });
  if (idx < 0) { S.view = 'list'; S.edit = null; return { html: listBody(), kb: null }; }
  var q = sel[idx], hint = meta.hint || 'show', tap = hint === 'tap';
  function chips(arr, a) { return arr.map(function (e) { return tap ? '<button class="h' + (a ? ' a' : '') + '" data-act="hint" data-v="' + esc(e) + '">' + esc(e) + '</button>' : '<span class="h' + (a ? ' a' : '') + '">' + esc(e) + '</span>'; }).join(''); }
  var hints = hint === 'none' ? '<div class="hints"><p>오늘은 힌트 없이 써 봐요! 위치는 화면이 알아서 맞춰 줘요.</p></div>' :
    '<div class="hints"><h4>이런 표현을 써요</h4><div class="g"><em>하는 말 앞에 와요</em>' + chips(HO.ADV, true) + '</div><div class="g"><em>문장 끝에 와요</em>' + chips(HO.PHR) + '</div>' +
    '<p>' + (tap ? '표현을 눌러서 넣거나, 아래 자판으로 직접 써도 돼요.' : '표현을 보고 아래 자판으로 써 봐요.') + '</p></div>';
  var hasA = !!(myAnswers()[q.k] && myAnswers()[q.k].e), same = hasA && myAnswers()[q.k].e === S.typer.text.trim().toLowerCase();
  var html = '<div class="ed"><div class="acts" style="margin:0 0 .4rem"><button class="sbtn ghost" data-act="tolist" style="padding:.5rem 1rem;font-size:.95rem">◀ 목록</button></div>' +
    '<div class="qbig"><span class="qn">' + (idx + 1) + '번 질문</span><br>' + esc(HO.question(q.text)) + '</div>' +
    '<div class="sent" id="sent"></div><div class="msg ' + S.msgCls + '" id="msg">' + esc(S.msg) + '</div>' + hints +
    '<div class="acts"><button class="sbtn ghost" data-act="skip">' + (same ? '그대로 두고 다음 ▶' : hasA ? '건너뛰기 ▶' : '건너뛰기 ▶') + '</button></div></div>';
  return { html: html, kb: { mode: 'a' } };
}

/* ---------- 쓰는 칸 ---------- */
function updTyper() {
  var t = S.typer.text, tf = document.getElementById('tf'), sent = document.getElementById('sent');
  if (tf) tf.innerHTML = (t ? esc(t) : '<span class="ph">play soccer</span>') + '<span class="caret"></span>';
  if (sent && S.edit) {
    var q = selList().filter(function (x) { return x.k === S.edit.k; })[0];
    if (q) {
      var ex = t.trim().toLowerCase(), v = esc(HO.myVerb(q.text));
      var inner = t ? '<b class="fill">' + esc(t) + '</b><span class="caret2"></span>' : '<b class="ph">how often?</b><span class="caret2"></span>';
      var box = '<span class="paren">( ' + inner + ' )</span>';
      var pos = ex ? HO.exprPos(ex) : 'pre';
      sent.innerHTML = pos === 'pre' ? 'I ' + box + ' ' + v + '.' : 'I ' + v + ' ' + box + '.';
    }
  }
}
function setMsg(text, cls) {
  S.msg = text; S.msgCls = cls || '';
  var m = document.getElementById('msg'); if (m) { m.textContent = text; m.className = 'msg ' + (cls || ''); }
}
function changed() { S.warned = false; if (S.msgCls === 'bad') setMsg('', ''); refreshEnter(); updTyper(); }

/* ---------- 화면 키보드 ---------- */
var kbSig = '';
var ROWS = ['qwertyuiop', 'asdfghjkl'];
function kbHTML(mode) {
  function key(c) { return '<button class="k" data-key="' + c + '">' + c + '</button>'; }
  return '<div class="in"><div class="r">' + ROWS[0].split('').map(key).join('') + '</div><div class="r">' + ROWS[1].split('').map(key).join('') + '</div>' +
    '<div class="r"><button class="k fn" data-key="shift" id="kshift" aria-label="대문자">⇧</button>' + 'zxcvbnm'.split('').map(key).join('') + '<button class="k fn" data-key="back" aria-label="지우기">⌫</button></div>' +
    '<div class="r"><button class="k" data-key="&#39;">\'</button><button class="k" data-key=",">,</button><button class="k" data-key="-">-</button>' +
    '<button class="k sp" data-key="space">띄어쓰기</button><button class="k enter" data-key="enter" id="kenter"></button></div></div>';
}
function showKb(k) {
  var el = document.getElementById('kb');
  if (!el) { el = document.createElement('div'); el.id = 'kb'; el.className = 'kb'; document.body.appendChild(el); }
  var sig = k.mode;
  if (kbSig !== sig || !el.firstChild) { el.innerHTML = kbHTML(k.mode); kbSig = sig; }
  el.hidden = false; refreshEnter();
}
function hideKb() { var el = document.getElementById('kb'); if (el) el.hidden = true; }
function refreshEnter() {
  var b = document.getElementById('kenter'), kb = document.getElementById('kb'); if (!b || !kb || kb.hidden) return;
  var mode = kbSig;
  b.textContent = mode === 'q' ? '보내기 ✓' : (S.warned ? '그래도 내기 ✓' : '다 했어요 ✓');
  b.classList.toggle('warn', !!S.warned);
  kb.classList.toggle('shift', !!S.typer.shift);
  var s = document.getElementById('kshift'); if (s) s.classList.toggle('on', !!S.typer.shift);
}
function maxLen() { return kbSig === 'q' ? 50 : 40; }
function type(ch) {
  var T = S.typer;
  if (T.text.length >= maxLen()) { setMsg(kbSig === 'q' ? '조금 짧게 써 주세요. (50자까지)' : '조금 짧게 써 주세요. (40자까지)', 'bad'); return; }
  if (T.shift) { ch = ch.toUpperCase(); T.shift = false; }
  T.text += ch; changed();
}
function press(key) {
  var T = S.typer;
  if (key === 'shift') { T.shift = !T.shift; refreshEnter(); return; }
  if (key === 'back') { T.text = T.text.slice(0, -1); changed(); return; }
  if (key === 'space') { if (T.text && !/ $/.test(T.text)) type(' '); return; }
  if (key === 'enter') { return kbSig === 'q' ? submitQ() : submitA(); }
  type(key);
}
function submitQ() {
  var meta = S.R.meta || {}, per = meta.per || 2, c = HO.checkVerb(S.typer.text);
  if (!c.ok) { setMsg(c.error, 'bad'); return; }
  var my = mine();
  if (my.length >= per) { setMsg('질문은 ' + per + '개까지 낼 수 있어요.', 'bad'); return; }
  if (my.some(function (q) { return q.k === HO.qKey(c.value); })) { setMsg('이미 낸 질문이에요.', 'bad'); return; }
  HO.W.submitQuestion(S.db, S.code, S.sid, c.value).then(function () {
    S.typer.text = ''; S.typer.shift = false;
    updTyper(); setMsg(my.length + 1 < per ? '보냈어요! 하나 더 쓸 수 있어요.' : '', 'ok');
    if (my.length + 1 >= per) { S.msg = ''; }
  }).catch(function () { setMsg('서버와 연결이 불안정해요. 잠시 뒤 다시 해 주세요.', 'bad'); });
}
function submitA() {
  if (!S.edit) return;
  var c = HO.checkExpr(S.typer.text);
  if (!c.ok) { setMsg(c.error, 'bad'); return; }
  if (!c.known && !S.warned) { S.warned = true; setMsg('배운 표현이 아니에요. 그래도 맞으면 한 번 더 눌러요.', 'bad'); refreshEnter(); return; }
  var k = S.edit.k;
  HO.W.saveAnswer(S.db, S.code, S.sid, k, c.value, c.known).then(function () { goNext(k); })
    .catch(function () { setMsg('서버와 연결이 불안정해요. 잠시 뒤 다시 해 주세요.', 'bad'); });
}
function openEdit(k) {
  var a = myAnswers()[k];
  S.view = 'edit'; S.edit = { k: k }; S.typer = { text: a && a.e ? a.e : '', shift: false }; S.warned = false; S.msg = ''; S.msgCls = '';
  draw(); window.scrollTo(0, 0);
}
function goNext(k) {
  var sel = selList(), A = Object.assign({}, myAnswers()), i = -1;
  sel.forEach(function (q, j) { if (q.k === k) i = j; });
  var order = sel.slice(i + 1).concat(sel.slice(0, i)), next = null;
  for (var j = 0; j < order.length; j++) { if (!(A[order[j].k] && A[order[j].k].e) && order[j].k !== k) { next = order[j]; break; } }
  if (next) openEdit(next.k); else { S.view = 'list'; S.edit = null; S.typer.text = ''; draw(); window.scrollTo(0, 0); }
}

/* ---------- 눌림 처리 ---------- */
function confirmLeave() {
  modalEl.innerHTML = '<div class="mback"><div class="mbox" role="dialog" aria-modal="true"><p>방에서 나갈까요? 같은 이름으로 다시 들어오면 쓴 것이 그대로 있어요.</p><div class="row"><button class="mb" data-act="mclose">취소</button><button class="mb red" data-act="leaveyes">나가기</button></div></div></div>';
}
document.addEventListener('click', function (e) {
  var kb = e.target.closest && e.target.closest('#kb');
  if (kb) { var kk = e.target.closest('[data-key]'); if (kk) press(kk.dataset.key); return; }
  var a = e.target.closest && e.target.closest('[data-act]'); if (!a) return;
  var d = a.dataset;
  switch (d.act) {
    case 'leave': confirmLeave(); break;
    case 'mclose': modalEl.innerHTML = ''; break;
    case 'leaveyes': modalEl.innerHTML = ''; HO.store.del('ho-stu'); S.codeIn = ''; showJoin(''); break;
    case 'home': S.codeIn = ''; history.replaceState(null, '', location.pathname); showJoin(''); break;
    case 'ideas': S.ideas = !S.ideas; draw(); break;
    case 'idea': S.typer.text = d.v; S.typer.shift = false; setMsg('', ''); changed(); break;
    case 'rmq': HO.W.removeMine(S.db, S.code, S.sid, d.k); break;
    case 'open': openEdit(d.k); break;
    case 'tolist': S.view = 'list'; S.edit = null; S.typer.text = ''; draw(); break;
    case 'hint': S.typer.text = d.v; S.typer.shift = false; S.warned = false; setMsg('', ''); refreshEnter(); updTyper(); break;
    case 'skip':
      if (S.edit) { var k = S.edit.k; goNext(k); }
      break;
  }
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && modalEl.firstChild) { modalEl.innerHTML = ''; return; }
  var kb = document.getElementById('kb');
  if (!kb || kb.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  var k = e.key;
  if (k === 'Enter') { e.preventDefault(); press('enter'); }
  else if (k === 'Backspace') { e.preventDefault(); press('back'); }
  else if (k === ' ') { e.preventDefault(); press('space'); }
  else if (k.length === 1) {
    if (HO.hasKorean(k)) { setMsg('영어로 써 주세요.', 'bad'); return; }
    if (/[A-Za-z0-9',\-]/.test(k)) { e.preventDefault(); S.typer.shift = false; type(k); }
  } else if (k === 'Process' || k === 'HangulMode') { setMsg('영어로 써 주세요.', 'bad'); }
});

window.HO_STU = { S: S };

/* 시작: 지난번 들어갔던 방이 있으면 바로 이어서 */
(function start() {
  var saved = HO.store.get('ho-stu', null), q = (location.search.match(/[?&]r=(\d{4})/) || [])[1];
  if (saved && saved.code && saved.name && (!q || q === saved.code)) {
    S.busy = true; app.innerHTML = '<div class="stu-join"><div class="wait"><div class="big">⏳</div><p>방에 연결하는 중…</p></div></div>';
    HO.openDB().then(function (db) { return HO.W.join(db, saved.code, saved.name).then(function (sid) { enter(db, saved.code, sid, saved.name); }); })
      .catch(function () { HO.store.del('ho-stu'); showJoin(''); });
  } else showJoin('');
})();
})();
