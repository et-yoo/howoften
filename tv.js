/* How Often? 선생님(TV) 화면 */
(function () {
'use strict';
var HO = window.HO, esc = HO.esc;
var app = document.getElementById('app'), modalEl = document.getElementById('modal');
document.documentElement.classList.add('tv');

var DEFAULTS = { per: 2, pick: 20, hint: 'show', textbook: false };
var S = {
  settings: Object.assign({}, DEFAULTS, HO.store.get('ho-tv-settings', {})),
  room: null, R: {}, conn: true, busy: false, err: '', rq: 0, pw: '', slide: null, onYes: null
};
var seen = {};
var ROT = ['-1.2deg', '.8deg', '-.4deg', '1.3deg', '-.9deg', '.3deg'];
var BOTS = [
  ['1 민준', ['play computer games']], ['2 서연', ['read books']], ['3 도윤', ['watch YouTube']],
  ['4 하은', ['brush your teeth', 'play computer games']], ['5 시우', ['eat fast food']], ['6 지우', ['drink water']],
  ['7 예준', ['play soccer', 'read books']], ['8 수아', ['watch YouTube', 'eat vegetables']]
];

/* ---------- 그리기 ---------- */
var raf = 0;
function render() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
function draw() {
  var keep = {};
  ['.notes', '.students', '.overview', '.allans'].forEach(function (s) { var e = app.querySelector(s); if (e) keep[s] = e.scrollTop; });
  if (!S.room) app.innerHTML = setupHTML();
  else {
    var meta = S.R.meta || {}, ph = meta.phase || 'collect', body, foot = '';
    if (ph === 'collect') body = collectHTML();
    else if (ph === 'answer') { body = answerHTML(); foot = '<div class="footbar"><button class="tbtn ghost" data-act="tocollect">◀ 질문 더 고르기</button><div class="mid">늦게 온 학생도 QR로 들어와서 대답할 수 있어요</div><button class="bigbtn" data-act="toresult">③ 결과 보기 ▶</button></div>'; }
    else { body = resultHTML(); foot = resultFoot(); }
    app.innerHTML = '<div class="room">' + topHTML(ph) + '<div class="main">' + body + '</div>' + foot + '</div>';
  }
  Object.keys(keep).forEach(function (s) { var e = app.querySelector(s); if (e) e.scrollTop = keep[s]; });
}

/* ---------- 처음 화면 ---------- */
function setupHTML() {
  var st = S.settings, needPw = !!HO.cfg.teacherPassword, fb = !!(HO.cfg.firebase && HO.cfg.firebase.databaseURL);
  function chips(k, vals, fmt) {
    return vals.map(function (v) { return '<button class="chip' + (st[k] === v ? ' on' : '') + '" data-act="set" data-k="' + k + '" data-v="' + v + '">' + fmt(v) + '</button>'; }).join('');
  }
  return '<div class="center"><section class="card setup">' +
    '<h1><span>📊</span><span>How Often?</span></h1><p class="sub">' + esc(HO.TITLE) + '</p>' +
    '<div class="pills"><button class="pill v" data-act="tutorial">🎓 처음이세요? 튜토리얼</button><button class="pill a" data-act="guide">📖 아이들용 활동 방법 슬라이드</button></div>' +
    (fb ? '' : '<div class="warnbox">⚠️ Firebase 설정(<b>config.js</b>)이 아직 없어요. 지금은 <b>이 컴퓨터의 이 브라우저 안</b>에서만 연결되는 시험 방식이에요. 연습 방은 설정 없이도 돼요.</div>') +
    '<div class="how"><p>① <b>질문 모으기</b> — 학생이 QR로 들어와 <i>How often do you ___?</i> 질문을 써서 내요.</p>' +
    '<p>② <b>대답하기</b> — 선생님이 고른 질문이 하나씩 나오고, <i>I ( ___ ) eat vegetables.</i> 괄호를 써요.</p>' +
    '<p>③ <b>결과</b> — TV에 질문마다 통계와 기타 의견을 보여 줘요. 누가 썼는지는 가려져요.</p></div>' +
    '<div class="grp"><h3>학생 한 명이 낼 질문 수</h3><div class="chips">' + chips('per', [1, 2, 3, 5], function (v) { return v + '개'; }) + '</div></div>' +
    '<div class="grp"><h3>설문에 넣을 질문 수 (선생님이 고르기)</h3><div class="chips">' + chips('pick', [5, 8, 10, 15, 20, 30], function (v) { return v + '개'; }) + '</div></div>' +
    '<div class="grp"><h3>대답할 때 표현 힌트</h3><div class="chips">' + chips('hint', ['none', 'show', 'tap'], function (v) { return { none: '없음', show: '보기만', tap: '눌러서 넣기' }[v]; }) + '</div><p class="note">often · every day · three times a day · five times a week …</p></div>' +
    '<label class="check"><input type="checkbox" data-act="tb"' + (st.textbook ? ' checked' : '') + '><span>교과서 질문 ' + HO.TEXTBOOK.length + '개도 질문 상자에 넣어 두기 <small>(' + esc(HO.TEXTBOOK.slice(0, 2).join(', ')) + ' …)</small></span></label>' +
    (needPw ? '<div class="field"><label for="pw">교사 비밀번호</label><input id="pw" type="password" autocomplete="off" value="' + esc(S.pw) + '"></div>' : '') +
    '<p class="err">' + esc(S.err) + '</p>' +
    '<button class="go" data-act="create"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? '만드는 중…' : '설문 방 만들기 ▶') + '</button>' +
    '<button class="go2" data-act="practice">🎓 가짜 학생 8명과 연습해 보기<small>(수업 전에 혼자 해 보기)</small></button>' +
    '</section></div>';
}

/* ---------- 위쪽 줄 ---------- */
function topHTML(ph) {
  var steps = [['collect', '① 질문 모으기'], ['answer', '② 대답하기'], ['result', '③ 결과']];
  return '<header class="top"><div class="brand"><span class="em">📊</span><span>How Often?</span></div><nav class="steps">' +
    steps.map(function (s, i) { return (i ? '<span class="sep">›</span>' : '') + '<span class="step' + (ph === s[0] ? ' on' : '') + '">' + s[1] + '</span>'; }).join('') + '</nav>' +
    (S.room.practice ? '<span class="badge">🎓 연습 방</span>' : (HO.mode === 'local' ? '<span class="badge warn">시험 방식</span>' : '')) +
    (!S.conn ? '<span class="badge off">연결 끊김 · 다시 붙는 중</span>' : '') +
    '<div class="spacer"></div><button class="tbtn" data-act="guide">📖 활동 방법</button>' +
    '<button class="tbtn" data-act="qr">📱 접속 QR · ' + S.room.code + '</button>' +
    '<button class="tbtn icon" data-act="settings" aria-label="설정">⚙️</button></header>';
}

/* ---------- 1. 질문 모으기 ---------- */
function collectHTML() {
  var R = S.R, meta = R.meta || {}, code = S.room.code;
  var qs = HO.questionList(R), sel = HO.selectedList(R), stu = HO.studentList(R), pick = meta.pick || 20;
  var selMap = {}; sel.forEach(function (s, i) { selMap[s.k] = i + 1; });
  var askers = stu.filter(function (s) { return s.asked > 0; }).length;
  var side = '<aside class="side"><div class="qrcard"><div class="qr">' + HO.qrSVG(HO.studentURL(code)) + '</div>' +
    '<div class="host">' + esc(HO.hostLabel()) + '</div><div class="code">방 번호<b>' + code + '</b></div></div>' +
    '<div class="panel students"><div class="sub">들어온 학생 ' + stu.length + '명 · 질문 낸 학생 ' + askers + '명</div><div class="sch">' +
    (stu.length ? stu.map(function (s) {
      return '<button class="schip" data-act="kick" data-sid="' + esc(s.sid) + '" title="눌러서 내보내기">' + esc(s.name) + (s.asked ? ' <em>✏️' + s.asked + '</em>' : '') + '</button>';
    }).join('') : '<span class="schip none">QR을 찍고 들어오면 여기에 이름이 나와요</span>') + '</div></div></aside>';
  var head = '<div class="qhead"><h2>📘 질문 상자 <b>' + qs.length + '</b> <small>고른 질문 ' + sel.length + ' / ' + pick + '</small></h2><div class="qtools">' +
    '<button class="tbtn" data-act="textbook">📚 교과서 질문</button><button class="tbtn" data-act="addq">＋ 직접 쓰기</button>' +
    '<button class="tbtn ghost" data-act="pickall"' + (qs.length ? '' : ' disabled') + '>모두 고르기</button>' +
    '<button class="tbtn ghost" data-act="clearall"' + (sel.length ? '' : ' disabled') + '>모두 빼기</button></div></div>';
  var notes;
  if (!qs.length) {
    notes = '<div class="empty"><div class="big">✍️</div><h3>학생들이 질문을 쓰고 있어요</h3><div class="q">How often do you ______ ?</div><p>낸 질문은 이름 없이 여기에 쪽지로 붙어요.</p></div>';
  } else {
    notes = '<div class="notes">' + qs.map(function (q, i) {
      var o = selMap[q.k], isNew = !seen[q.k]; seen[q.k] = 1;
      return '<div class="note' + (o ? ' sel' : '') + (isNew ? ' pop' : '') + '" role="button" tabindex="0" data-act="pick" data-k="' + esc(q.k) + '" style="--rot:' + ROT[i % 6] + '">' +
        '<small>How often do you</small><b>' + esc(q.text) + '?</b>' +
        (q.authors.length > 1 ? '<span class="by">👥 ' + q.authors.length + '명</span>' : '') + (o ? '<span class="ord">' + o + '</span>' : '') +
        '<span class="ntools"><button data-act="edit" data-k="' + esc(q.k) + '" title="질문 고치기 (철자 등)" aria-label="질문 고치기">✎</button>' +
        '<button data-act="del" data-k="' + esc(q.k) + '" title="질문 지우기" aria-label="질문 지우기">🗑</button></span></div>';
    }).join('') + '</div>';
  }
  var bar = '<div class="orderbar"><span class="lab">설문 순서</span><span class="hint">' +
    (sel.length ? sel.map(function (s, i) { return (i + 1) + '. ' + esc(s.text); }).join('  ›  ') : '쪽지를 누르면 순서대로 들어가요 · 5~8개쯤이 알맞아요') +
    '</span><button class="bigbtn" data-act="toanswer"' + (sel.length ? '' : ' disabled') + '>② 대답하기 시작 ▶</button></div>';
  return '<div class="collect">' + side + '<section class="qbox">' + head + notes + '</section>' + bar + '</div>';
}

/* ---------- 2. 대답하기 ---------- */
function answerHTML() {
  var R = S.R, sel = HO.selectedList(R), stu = HO.studentList(R), n = stu.length, qks = sel.map(function (s) { return s.k; });
  var doneAll = stu.filter(function (s) { return qks.length && HO.doneCount(R, s.sid, qks) === qks.length; }).length;
  var last = sel.length ? sel[sel.length - 1] : null;
  var head = '<div class="ans-head"><div><h1>✍️ 친구들의 질문에 대답하는 중</h1><div class="sample">' + (last ? HO.blankHTML(last.text, '') : '') + '</div></div>' +
    '<div class="tot">다 한 학생<b><i>' + doneAll + '</i> / ' + n + '</b></div></div>';
  var rows = sel.map(function (s, i) {
    var c = HO.answersFor(R, s.k).length, pct = n ? Math.round(c * 100 / n) : 0;
    return '<div class="qrow"><div class="l"><span class="n">Q' + (i + 1) + '</span><span class="t">' + esc(HO.question(s.text)) + '</span><span class="c">' + c + ' / ' + n + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  }).join('');
  var chips = stu.map(function (s) {
    var d = HO.doneCount(R, s.sid, qks), ok = qks.length && d === qks.length;
    return '<span class="sdone' + (ok ? ' ok' : '') + '">' + (ok ? '✔ ' : '') + esc(s.name) + ' <em>' + d + '/' + qks.length + '</em></span>';
  }).join('');
  return head + '<div class="ans-grid"><div class="panel qrows">' + rows + '</div><div class="panel stu-box"><h3>학생별 (몇 개 했는지만 보여요)</h3><div class="sch">' + (chips || '<span class="sdone">아직 학생이 없어요</span>') + '</div></div></div>';
}

/* ---------- 3. 결과 ---------- */
function barColor(i) { return i === 0 ? '#10b981' : i < 5 ? '#22c55e' : '#84cc16'; }
function resultHTML() {
  var R = S.R, sel = HO.selectedList(R);
  if (!sel.length) return '<div class="empty"><div class="big">🗒️</div><h3>고른 질문이 없어요</h3><p>질문을 먼저 골라 주세요.</p></div>';
  if (S.rq >= sel.length) S.rq = sel.length - 1;
  var rq = S.rq;
  var sub = '<div class="rsub"><button class="tbtn' + (rq === -1 ? '' : ' ghost') + '" data-act="rq" data-i="-1">🗂 한눈에 보기</button><div class="nums">' +
    sel.map(function (s, i) { return '<button class="' + (rq === i ? 'on' : '') + '" data-act="rq" data-i="' + i + '">' + (i + 1) + '</button>'; }).join('') + '</div><div class="spacer"></div>' +
    '<button class="tbtn' + (rq === -2 ? '' : ' ghost') + '" data-act="rq" data-i="-2">💬 모든 대답 보기</button><button class="tbtn ghost" data-act="toanswer2">◀ 대답 더 받기</button></div>';
  if (rq === -1) return sub + overviewHTML(sel);
  if (rq === -2) return sub + allAnswersHTML(sel);
  var q = sel[rq], t = HO.tally(HO.answersFor(R, q.k)), max = t.rows.length ? t.rows[0].n : 0;
  var ties = t.rows.filter(function (r) { return r.n === max; });
  var top = max ? '<div class="top1"><small>🏆 ' + (ties.length > 1 ? '가장 많은 대답 — 공동 1등 (각 ' + max + '명)' : '가장 많은 대답 (' + max + '명)') + '</small>' +
    ties.map(function (r) { return '<div class="s">' + esc(HO.sentence(q.text, r.e)) + '</div>'; }).join('') + '</div>' : '';
  var rowsHTML = t.rows.map(function (r, i) {
    var top1 = r.n === max, w = max ? Math.max(2, Math.round(r.n * 100 / max)) : 0;
    return '<div class="hbar"><div class="e">' + esc(r.e) + '</div><div class="tr"><div class="fill' + (top1 ? ' top' : '') + '" style="width:' + w + '%;' + (top1 ? '' : 'background:' + barColor(i)) + '"></div></div>' +
      '<div class="v">' + r.n + '<small>(' + Math.round(r.n * 100 / t.total) + '%)</small></div></div>';
  }).join('');
  var empty = !t.total ? '<p class="okmsg" style="color:var(--soft);margin:1rem 0">아직 대답이 없어요</p>' : '';
  var other = '<div class="panel other"><h3>💬 기타 의견 <b>' + t.otherN + '</b></h3>' +
    (t.otherN ? '<ul>' + t.other.map(function (o) { return '<li>' + esc(HO.sentence(q.text, o.e)) + (o.n > 1 ? '<small>' + o.n + '명</small>' : '') + '</li>'; }).join('') + '</ul>' :
      '<p class="okmsg">' + (t.total ? '모두 배운 표현으로 대답했어요 👍' : '아직 대답이 없어요') + '</p>') + '</div>';
  return sub + '<div class="rq"><span class="qn">Q' + (rq + 1) + '</span><h1>' + esc(HO.question(q.text)) + '</h1><span class="cnt">대답 ' + t.total + '명</span></div>' +
    '<div class="rgrid"><div class="panel chart">' + top + rowsHTML + empty + '</div>' + other + '</div>';
}
function resultFoot() {
  var sel = HO.selectedList(S.R), rq = S.rq;
  if (rq < 0 || !sel.length) return '';
  return '<div class="nav2"><button class="navb" data-act="rprev"' + (rq <= 0 ? ' disabled' : '') + '>◀ 이전 질문</button>' +
    '<button class="navb" data-act="rnext"' + (rq >= sel.length - 1 ? ' disabled' : '') + '>다음 질문 ▶</button></div>';
}
function overviewHTML(sel) {
  return '<div class="overview">' + sel.map(function (q, i) {
    var t = HO.tally(HO.answersFor(S.R, q.k)), max = t.rows.length ? t.rows[0].n : 0;
    var ties = t.rows.filter(function (r) { return r.n === max; });
    return '<button class="ocard" data-act="rq" data-i="' + i + '"><div class="h"><i>Q' + (i + 1) + '</i><b>' + esc(HO.question(q.text)) + '</b><span>' + t.total + '명</span></div>' +
      (max ? '<div class="tp">🏆 ' + esc(ties.map(function (r) { return r.e; }).join(' · ')) + ' <small>(' + max + '명)</small></div>' +
        '<div class="mini">' + t.rows.slice(0, 4).map(function (r) { return '<div><span class="e">' + esc(r.e) + '</span><span><i style="width:' + Math.round(r.n * 100 / max) + '%;display:block"></i></span><span>' + r.n + '</span></div>'; }).join('') + '</div>' :
        '<div class="none">아직 대답이 없어요</div>') + '</button>';
  }).join('') + '</div>';
}
function allAnswersHTML(sel) {
  var n = HO.studentList(S.R).length;
  return '<div class="allans">' + sel.map(function (q, i) {
    var list = HO.answersFor(S.R, q.k).slice().sort(function (a, b) { return a.e < b.e ? -1 : a.e > b.e ? 1 : 0; });
    return '<div class="panel"><h3><i>Q' + (i + 1) + '</i>' + esc(HO.question(q.text)) + '</h3><small>모든 대답 ' + list.length + '개 (가나다·ABC 순, 이름 없음' + (n > list.length ? ' · ' + (n - list.length) + '명 대답 안 함' : '') + ')</small>' +
      (list.length ? '<ol>' + list.map(function (a) { return '<li' + (a.k ? '' : ' class="oth"') + '>' + esc(HO.sentence(q.text, a.e)) + '</li>'; }).join('') + '</ol>' : '<small>대답 없음</small>') + '</div>';
  }).join('') + '</div>';
}

/* ---------- 창, 안내 ---------- */
function toast(msg) {
  var d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.appendChild(d);
  setTimeout(function () { d.remove(); }, 2400);
}
function openModal(html) { modalEl.innerHTML = '<div class="mback" data-act="mback">' + html + '</div>'; }
function closeModal() { modalEl.innerHTML = ''; S.slide = null; S.onYes = null; }
function confirmBox(text, yes, fn, danger) {
  S.onYes = fn;
  openModal('<div class="mbox" role="dialog" aria-modal="true"><p>' + esc(text) + '</p><div class="row"><button class="mb" data-act="mclose">취소</button><button class="mb ' + (danger ? 'red' : 'pri') + '" data-act="myes">' + esc(yes) + '</button></div></div>');
}
function questionModal(title, k, text, withPick) {
  S.qm = { k: k, withPick: withPick };
  openModal('<div class="mbox" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><div class="pre"><span>How often do you</span></div>' +
    '<input type="text" id="qin" maxlength="60" autocomplete="off" spellcheck="false" value="' + esc(text || '') + '" style="margin-top:.4rem"><p class="errm" id="qerr"></p>' +
    '<div class="row"><button class="mb" data-act="mclose">취소</button>' + (withPick ? '<button class="mb pri" data-act="qsave" data-pick="1">넣고 고르기</button>' : '') +
    '<button class="mb ' + (withPick ? '' : 'pri') + '" data-act="qsave">' + (withPick ? '넣기' : '저장') + '</button></div></div>');
  setTimeout(function () { var i = document.getElementById('qin'); if (i) { i.focus(); i.select(); } }, 30);
}
function settingsModal() {
  var meta = S.R.meta || {};
  function chips(k, vals, fmt) { return vals.map(function (v) { return '<button class="chip' + (meta[k] === v ? ' on' : '') + '" data-act="mset" data-k="' + k + '" data-v="' + v + '">' + fmt(v) + '</button>'; }).join(''); }
  openModal('<div class="mbox" role="dialog" aria-modal="true"><h3>⚙️ 설정 · 방 ' + S.room.code + '</h3>' +
    '<div class="grp" style="margin-top:0"><h3 style="font-size:1rem">학생 한 명이 낼 질문 수</h3><div class="chips">' + chips('per', [1, 2, 3, 5], function (v) { return v + '개'; }) + '</div></div>' +
    '<div class="grp"><h3 style="font-size:1rem">설문에 넣을 질문 수</h3><div class="chips">' + chips('pick', [5, 8, 10, 15, 20, 30], function (v) { return v + '개'; }) + '</div></div>' +
    '<div class="grp"><h3 style="font-size:1rem">대답할 때 표현 힌트</h3><div class="chips">' + chips('hint', ['none', 'show', 'tap'], function (v) { return { none: '없음', show: '보기만', tap: '눌러서 넣기' }[v]; }) + '</div></div>' +
    '<div class="row" style="justify-content:space-between;margin-top:1.4rem"><button class="mb red" data-act="closeroom">방 닫기 (수업 끝)</button><button class="mb" data-act="mclose">닫기</button></div></div>');
}
function qrModal() {
  var code = S.room.code;
  openModal('<div class="qrbig"><div class="qr">' + HO.qrSVG(HO.studentURL(code)) + '</div><div class="host">' + esc(HO.hostLabel()) + '</div><div class="code">방 번호<b>' + code + '</b></div></div>');
}

/* 슬라이드 */
function kidSlides() {
  var code = S.room ? S.room.code : '0000', meta = S.room ? (S.R.meta || {}) : S.settings;
  var per = meta.per || 2, hint = meta.hint || 'show';
  var hintTxt = hint === 'none' ? '오늘은 힌트 없이 써 봐요! 위치는 화면이 알아서 맞춰 줘요.' :
    hint === 'tap' ? '대답할 때 화면 아래에 이 표현들이 보여요. 눌러서 넣을 수도 있어요.' : '대답할 때 화면 아래에 이 표현들이 보여요.';
  function chipsRow(arr, a) { return '<div class="chipsrow' + (a ? ' a' : '') + '">' + arr.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>'; }
  return [
    '<div class="em7">📊</div><div class="big">How Often?</div><p class="lead">우리 반 설문 조사</p><p class="lead"><b>How often do you ~?</b></p>',
    '<h2>이렇게 들어와요</h2><div class="cols">' +
      '<div class="box"><h4>📱 QR을 찍어요</h4><p>태블릿 카메라로 TV의 QR을 찍어요.</p>' + (S.room ? '<div class="qrbox" style="margin-top:.6rem">' + HO.qrSVG(HO.studentURL(code)) + '</div>' : '') + '<p style="margin-top:.5rem">방 번호 <b style="color:var(--amber)">' + code + '</b></p></div>' +
      '<div class="box"><h4>🔢 방 번호</h4><p>QR이 안 되면 <b style="color:var(--amber)">' + esc(HO.hostLabel()) + '</b> 에 들어가서 방 번호 4자리를 써요.</p></div>' +
      '<div class="box"><h4>🙋 이름 · 번호</h4><p>예) 7번 민수 — 누가 어떤 질문·대답을 썼는지는 친구들에게 보이지 않아요.</p></div>' +
      '<div class="box"><h4>⌨️ 화면 키보드</h4><p>질문과 대답은 화면 아래 키보드로 써요.</p></div></div>',
    '<h2>친구들에게 물어볼 질문을 만들어요</h2><p class="lead">빈칸에 영어로 써요. 물음표는 이미 있어요.</p><div class="sent display" style="font-size:2.4rem;background:#fff;color:#0f172a;border-radius:1.2rem;padding:.8rem 1.6rem">How often do you <span style="color:#0d9488;border-bottom:.2rem solid #0d9488;padding:0 1rem">play soccer</span> ?</div>' +
      '<div class="cols"><div class="box"><p>질문은 <b style="color:var(--amber)">' + per + '개</b>까지 낼 수 있어요.</p></div><div class="box"><p>마음이 바뀌면 ✕로 지우고 다시 써요.</p></div>' +
      '<div class="box"><p>낸 질문은 TV에 쪽지로 붙어요. 누가 썼는지 이름은 나오지 않아요.</p></div><div class="box"><p>같은 질문은 하나로 묶여서 몇 명이 냈는지 보여요. 선생님이 쪽지를 골라 설문 순서를 정해요.</p></div></div>',
    '<h2>친구들의 질문에 대답해요</h2><p class="lead">괄호 안에 얼마나 자주 하는지 써요. 화면이 문장으로 바꿔 보여 줘요.</p>' +
      '<div class="display" style="font-size:2.4rem;font-weight:800">I ( <span style="color:var(--amber)">twice a week</span> ) → I play soccer <span style="color:var(--amber)">twice a week</span>.</div>' +
      '<div class="cols"><div class="box"><h4>하는 말 앞에 와요</h4>' + chipsRow(HO.ADV, true) + '</div><div class="box"><h4>문장 끝에 와요</h4>' + chipsRow(HO.PHR) + '</div></div><p class="lead" style="font-size:1.2rem">' + hintTxt + '</p>',
    '<h2>내 속도로 해요</h2><div class="cols"><div class="box"><h4>🔴 빨간 질문</h4><p>아직 대답하지 않은 질문이에요. 눌러서 대답해요. 질문 사이를 오가며 대답을 고칠 수 있어요.</p></div>' +
      '<div class="box"><h4>🆕 처음 보는 표현</h4><p>배운 표현이 아니면 한 번 더 물어봐요. 맞으면 한 번 더 눌러요.</p></div><div class="box"><h4>⏳ 다 하면 기다려요</h4><p>선생님이 TV로 결과를 보여 줘요.</p></div></div>',
    '<h2>결과를 함께 봐요</h2><div class="em7">📊</div><p class="lead">가장 많은 대답과 기타 의견도 함께 봐요.</p><p class="lead"><b>이름은 어디에도 나오지 않아요.</b></p>',
    '<h2>우리의 약속</h2><div class="cols"><div class="box"><h4>솔직하게</h4><p>내가 실제로 얼마나 자주 하는지 써요.</p></div><div class="box"><h4>장난 질문은 그만</h4><p>나쁜 말이나 장난 질문은 선생님이 지워요.</p></div>' +
      '<div class="box"><h4>놀리지 않기</h4><p>친구 대답을 놀리거나 누가 썼는지 찾지 않아요.</p></div><div class="box"><h4>다 하면 기다리기</h4><p>먼저 끝나면 내 대답을 다시 읽어 봐요.</p></div></div>'
  ];
}
function tutorSlides() {
  return [
    '<div class="em7">🎓</div><h2>선생님 튜토리얼</h2><p class="lead">수업 전에 <b>연습 방</b>(가짜 학생 8명)으로 한 번 해 보면 가장 쉬워요.</p>',
    '<h2>① 설문 방 만들기</h2><p class="lead">학생이 낼 질문 수, 설문에 넣을 질문 수, 힌트를 고르고 <b>설문 방 만들기</b>를 눌러요.<br>TV에 <b>접속 QR</b>과 <b>방 번호 4자리</b>가 나와요.</p>',
    '<h2>② 질문 모으기</h2><p class="lead">학생들이 QR로 들어와 질문을 쓰면 <b>쪽지</b>로 붙어요.<br>설문에 넣을 쪽지를 <b>눌러서</b> 순서를 정해요. (5~8개쯤이 알맞아요)<br>✎로 철자를 고치고, 🗑로 지우고, 학생 이름을 누르면 내보낼 수 있어요.</p>',
    '<h2>③ 대답하기</h2><p class="lead"><b>대답하기 시작</b>을 누르면 학생들이 질문마다 괄호를 채워요.<br>진행 막대로 누가 얼마나 했는지 보이고, 늦게 온 학생도 들어올 수 있어요.</p>',
    '<h2>④ 결과 보기</h2><p class="lead"><b>결과 보기</b>에서 질문마다 통계와 기타 의견을 함께 봐요.<br>배우지 않은 표현은 <b>기타 의견</b>에 모여요. 이름은 어디에도 나오지 않아요.<br>수업이 끝나면 ⚙️에서 <b>방 닫기</b>를 눌러요.</p>'
  ];
}
function showSlides(deck, i) {
  var list = deck === 'kid' ? kidSlides() : tutorSlides();
  S.slide = { deck: deck, i: Math.max(0, Math.min(list.length - 1, i || 0)) };
  var cur = S.slide.i, last = cur === list.length - 1;
  modalEl.innerHTML = '<div class="slides"><button class="tbtn sx" data-act="mclose">✕ 닫기</button><div class="sbody">' + list[cur] + '</div>' +
    '<div class="sfoot"><div>' + (cur > 0 ? '<button class="tbtn ghost" data-act="sfirst">처음으로</button>' : '') + '</div><div class="dots">' +
    list.map(function (_, j) { return '<i class="' + (j === cur ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
    '<button class="bigbtn" data-act="' + (last ? 'mclose' : 'snext') + '">' + (last ? '시작하기 ✓' : '다음 ▶') + '</button></div></div>';
}

/* ---------- 방 만들기·들어가기 ---------- */
function fail() { toast('서버와 연결이 불안정해요. 잠시 뒤 다시 해 주세요.'); }
function upd(obj) {
  var r = S.room; if (!r) return Promise.resolve();
  var u = {}; Object.keys(obj).forEach(function (k) { u['rooms/' + r.code + '/' + k] = obj[k]; });
  u['rooms/' + r.code + '/meta/updatedAt'] = HO.now();
  if (!r.practice) u['roomIndex/' + r.code] = HO.now();
  return r.db.update('', u).catch(fail);
}
function findCode(db, tries) {
  if (tries > 30) return Promise.reject(new Error('code'));
  var code = String(1000 + Math.floor(Math.random() * 9000));
  return db.get(HO.path(code, 'meta')).then(function (m) {
    if (m && HO.roomAlive(m)) return findCode(db, tries + 1);
    return (m ? db.remove(HO.path(code, '')) : Promise.resolve()).then(function () { return code; });
  });
}
function cleanupOld(db) {
  db.get('roomIndex').then(function (idx) {
    var u = {}, cut = HO.now() - HO.ROOM_KEEP_MS, n = 0;
    Object.keys(idx || {}).forEach(function (c) { if (idx[c] < cut) { u['rooms/' + c] = null; u['roomIndex/' + c] = null; n++; } });
    if (n) db.update('', u);
  }).catch(function () {});
}
function textbookOps(prefix, existing) {
  var u = {}, now = HO.now();
  HO.TEXTBOOK.forEach(function (v, i) {
    var k = HO.qKey(v);
    if (!existing || !existing[k]) u[prefix + 'questions/' + k] = { text: v, t: now + i, by: 'textbook' };
  });
  return u;
}
function createRoom() {
  var st = S.settings;
  if (HO.cfg.teacherPassword && S.pw !== String(HO.cfg.teacherPassword)) { S.err = '교사 비밀번호가 달라요.'; draw(); return; }
  S.err = ''; S.busy = true; draw();
  HO.openDB().then(function (db) {
    return findCode(db, 0).then(function (code) {
      var now = HO.now(), u = {};
      u['rooms/' + code + '/meta'] = { phase: 'collect', per: st.per, pick: st.pick, hint: st.hint, createdAt: now, updatedAt: now, closed: false };
      u['roomIndex/' + code] = now;
      if (st.textbook) { var tb = textbookOps('rooms/' + code + '/'); Object.keys(tb).forEach(function (k) { u[k] = tb[k]; }); }
      return db.update('', u).then(function () { cleanupOld(db); S.busy = false; enterRoom(db, code, false); });
    });
  }).catch(function () { S.busy = false; S.err = '서버와 연결이 불안정해요. 잠시 뒤 다시 해 주세요.'; draw(); });
}
function enterRoom(db, code, practice) {
  leaveRoom();
  var room = S.room = { db: db, code: code, practice: !!practice, offs: [], timers: [], hb: 0, got: false };
  S.R = {}; S.rq = 0; seen = {};
  room.offs.push(db.on(HO.path(code, ''), function (v) {
    if (S.room !== room) return;
    if (room.got && !v) { leaveRoom(); HO.store.del('ho-tv-room'); draw(); return; }
    S.R = v || {};
    if (!room.got) { room.got = true; HO.questionList(S.R).forEach(function (q) { seen[q.k] = 1; }); }
    render();
  }));
  room.offs.push(db.onConnection(function (c) { if (S.conn !== c) { S.conn = c; render(); } }));
  if (!practice) {
    HO.store.set('ho-tv-room', code);
    room.hb = setInterval(function () { upd({}); }, 4 * 60 * 1000);
  }
  draw();
}
function leaveRoom() {
  var r = S.room; if (!r) return;
  r.offs.forEach(function (f) { try { f(); } catch (e) {} });
  r.timers.forEach(clearTimeout); clearInterval(r.hb); clearInterval(r.bot);
  S.room = null; S.R = {}; S.conn = true;
}
function resume() {
  var c = HO.store.get('ho-tv-room', null);
  if (!c || !/^\d{4}$/.test(String(c))) { draw(); return; }
  HO.openDB().then(function (db) {
    return db.get(HO.path(c, 'meta')).then(function (m) {
      if (HO.roomAlive(m)) enterRoom(db, String(c), false); else { HO.store.del('ho-tv-room'); draw(); }
    });
  }).catch(function () { draw(); });
}

/* ---------- 연습 방 (가짜 학생 8명) ---------- */
var UNKNOWN = ['rarely', 'very often', 'kind of'];
function startPractice() {
  var db = new HO.TinyDB(), code = String(1000 + Math.floor(Math.random() * 9000)), now = HO.now(), st = S.settings, u = {};
  u['rooms/' + code + '/meta'] = { phase: 'collect', per: st.per, pick: st.pick, hint: st.hint, createdAt: now, updatedAt: now, closed: false, practice: true };
  if (st.textbook) { var tb = textbookOps('rooms/' + code + '/'); Object.keys(tb).forEach(function (k) { u[k] = tb[k]; }); }
  db.update('', u);
  enterRoom(db, code, true);
  var room = S.room;
  BOTS.forEach(function (b, i) {
    var sid = HO.sKey(b[0]);
    room.timers.push(setTimeout(function () {
      HO.W.join(db, code, b[0]).then(function () {
        b[1].forEach(function (v, j) {
          room.timers.push(setTimeout(function () { HO.W.submitQuestion(db, code, sid, v); }, 700 + Math.random() * 2600 + j * 1100));
        });
      });
    }, 350 * i));
  });
  room.bot = setInterval(function () {
    var R = S.R, meta = R.meta || {};
    if (meta.phase !== 'answer') return;
    var sel = HO.selectedList(R), A = R.answers || {};
    var cands = BOTS.map(function (b) { return HO.sKey(b[0]); }).filter(function (sid) {
      return R.students && R.students[sid] && sel.some(function (q) { return !(A[sid] && A[sid][q.k]); });
    });
    if (!cands.length) return;
    var sid = cands[Math.floor(Math.random() * cands.length)];
    var q = sel.filter(function (x) { return !(A[sid] && A[sid][x.k]); })[0];
    var known = Math.random() > 0.07, e = known ? HO.EXPR[Math.floor(Math.random() * HO.EXPR.length)] : UNKNOWN[Math.floor(Math.random() * UNKNOWN.length)];
    HO.W.saveAnswer(db, code, sid, q.k, e, known);
  }, 420);
}

/* ---------- 선생님 동작 ---------- */
function togglePick(k) {
  var sel = HO.selectedList(S.R), meta = S.R.meta || {}, o = {};
  if (sel.some(function (s) { return s.k === k; })) { o['sel/' + k] = null; return upd(o); }
  if (sel.length >= (meta.pick || 20)) { toast('설문에는 ' + (meta.pick || 20) + '개까지 넣을 수 있어요.'); return; }
  var max = sel.length ? sel[sel.length - 1].order : 0;
  o['sel/' + k] = max + 1; upd(o);
}
function pickAll() {
  var sel = HO.selectedList(S.R), meta = S.R.meta || {}, lim = meta.pick || 20, have = {}, o = {};
  sel.forEach(function (s) { have[s.k] = 1; });
  var order = sel.length ? sel[sel.length - 1].order : 0, cnt = sel.length, skipped = 0;
  HO.questionList(S.R).forEach(function (q) {
    if (have[q.k]) return;
    if (cnt >= lim) { skipped++; return; }
    o['sel/' + q.k] = ++order; cnt++;
  });
  if (skipped) toast('설문에는 ' + lim + '개까지 넣을 수 있어요.');
  if (Object.keys(o).length) upd(o);
}
function clearAll() { var o = {}; HO.selectedList(S.R).forEach(function (s) { o['sel/' + s.k] = null; }); upd(o); }
function delQuestion(k) {
  var o = {}; o['questions/' + k] = null; o['sel/' + k] = null;
  Object.keys(S.R.answers || {}).forEach(function (sid) { o['answers/' + sid + '/' + k] = null; });
  upd(o);
}
function kick(sid) {
  var o = {}, R = S.R; o['students/' + sid] = null; o['answers/' + sid] = null;
  Object.keys(R.questions || {}).forEach(function (k) {
    var q = R.questions[k]; if (!q || !q.authors || !q.authors[sid]) return;
    var others = Object.keys(q.authors).filter(function (a) { return a !== sid; });
    if (!others.length && !q.by && !(R.sel && R.sel[k] != null)) o['questions/' + k] = null;
    else o['questions/' + k + '/authors/' + sid] = null;   // 겹치는 경로는 Firebase 가 거절해서 둘 중 하나만 써요
  });
  upd(o);
}
function saveQuestion() {
  var inp = document.getElementById('qin'), err = document.getElementById('qerr'), qm = S.qm || {}, pickIt = arguments[0];
  var c = HO.checkVerb(inp.value);
  if (!c.ok) { err.textContent = c.error; return; }
  if (qm.k) {
    var o = {}; o['questions/' + qm.k + '/text'] = c.value; upd(o); closeModal(); return;
  }
  var k = HO.qKey(c.value);
  if (S.R.questions && S.R.questions[k]) { err.textContent = '같은 질문이 이미 있어요.'; return; }
  var u = {}; u['questions/' + k] = { text: c.value, t: HO.now(), by: 'teacher' };
  if (pickIt) {
    var sel = HO.selectedList(S.R), lim = (S.R.meta || {}).pick || 20;
    if (sel.length < lim) u['sel/' + k] = (sel.length ? sel[sel.length - 1].order : 0) + 1;
  }
  upd(u); closeModal();
}

/* ---------- 눌림 처리 ---------- */
document.addEventListener('click', function (e) {
  var t = e.target;
  if (t.classList && t.classList.contains('mback')) { closeModal(); return; }
  var a = t.closest && t.closest('[data-act]'); if (!a) return;
  var act = a.dataset.act, d = a.dataset;
  switch (act) {
    case 'set': var v = d.v; S.settings[d.k] = d.k === 'hint' ? v : +v; HO.store.set('ho-tv-settings', S.settings); draw(); break;
    case 'tb': S.settings.textbook = a.checked; HO.store.set('ho-tv-settings', S.settings); break;
    case 'create': createRoom(); break;
    case 'practice': startPractice(); break;
    case 'guide': showSlides('kid', 0); break;
    case 'tutorial': showSlides('tutor', 0); break;
    case 'snext': showSlides(S.slide.deck, S.slide.i + 1); break;
    case 'sfirst': showSlides(S.slide.deck, 0); break;
    case 'mclose': closeModal(); break;
    case 'myes': var fn = S.onYes; closeModal(); if (fn) fn(); break;
    case 'qr': qrModal(); break;
    case 'settings': settingsModal(); break;
    case 'mset': var o = {}; o['meta/' + d.k] = d.k === 'hint' ? d.v : +d.v; upd(o); setTimeout(settingsModal, 60); break;
    case 'closeroom':
      confirmBox('설문 방을 닫을까요? 학생 화면도 닫혀요.', '방 닫기', function () {
        var r = S.room; if (!r) return;
        var done = r.practice ? Promise.resolve() : upd({ 'meta/closed': true });
        Promise.resolve(done).then(function () { HO.store.del('ho-tv-room'); leaveRoom(); draw(); });
      }, true); break;
    case 'pick': togglePick(d.k); break;
    case 'edit': questionModal('질문 고치기 (철자 등)', d.k, (S.R.questions && S.R.questions[d.k] || {}).text, false); break;
    case 'del': confirmBox('질문을 지울까요?', '지우기', function () { delQuestion(d.k); }, true); break;
    case 'addq': questionModal('선생님 질문 넣기', null, '', true); break;
    case 'qsave': saveQuestion(d.pick === '1'); break;
    case 'textbook': upd(textbookOps('', S.R.questions)); break;
    case 'pickall': pickAll(); break;
    case 'clearall': clearAll(); break;
    case 'kick': confirmBox('학생을 내보낼까요? (설문에 안 넣은 질문과 대답도 지워져요)', '내보내기', function () { kick(d.sid); }, true); break;
    case 'toanswer': upd({ 'meta/phase': 'answer' }); break;
    case 'tocollect': upd({ 'meta/phase': 'collect' }); break;
    case 'toanswer2': upd({ 'meta/phase': 'answer' }); break;
    case 'toresult':
      var sel = HO.selectedList(S.R), stu = HO.studentList(S.R), ks = sel.map(function (s) { return s.k; });
      var left = stu.filter(function (s) { return HO.doneCount(S.R, s.sid, ks) < ks.length; }).length;
      var go = function () { S.rq = 0; upd({ 'meta/phase': 'result' }); };
      if (left) confirmBox('아직 ' + left + '명이 다 하지 않았어요. 결과를 보여 줄까요?', '결과 보기 ▶', go); else go();
      break;
    case 'rq': S.rq = +d.i; draw(); break;
    case 'rprev': if (S.rq > 0) { S.rq--; draw(); } break;
    case 'rnext': S.rq++; draw(); break;
  }
});
document.addEventListener('input', function (e) {
  if (e.target.id === 'pw') S.pw = e.target.value;
});
document.addEventListener('keydown', function (e) {
  var inInput = e.target && (e.target.tagName === 'INPUT');
  if (e.key === 'Escape') { if (modalEl.firstChild) closeModal(); return; }
  if (e.key === 'Enter') {
    if (e.target.id === 'qin') { saveQuestion(false); e.preventDefault(); return; }
    if (e.target.id === 'pw') { createRoom(); return; }
    if (e.target.classList && e.target.classList.contains('note')) { e.target.click(); return; }
  }
  if (inInput) return;
  if (S.slide) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); var n = (S.slide.deck === 'kid' ? kidSlides() : tutorSlides()).length; if (S.slide.i < n - 1) showSlides(S.slide.deck, S.slide.i + 1); }
    else if (e.key === 'ArrowLeft') showSlides(S.slide.deck, S.slide.i - 1);
    return;
  }
  if (S.room && (S.R.meta || {}).phase === 'result' && !modalEl.firstChild) {
    var sel = HO.selectedList(S.R);
    if (e.key === 'ArrowRight' && S.rq < sel.length - 1) { S.rq++; draw(); }
    else if (e.key === 'ArrowLeft' && S.rq > 0) { S.rq--; draw(); }
  }
});

window.HO_TV = { S: S, draw: draw };
resume();
})();
