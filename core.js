/* How Often? 공통 코드: 도우미, 데이터 저장소(Firebase / 이 브라우저), QR, 문장 만들기, 통계 */
(function () {
'use strict';
var CFG = window.HO_CONFIG || {};
var HO = window.HO = { cfg: CFG };

/* ---------- 내용 ---------- */
HO.ADV_ALL = ['always', 'usually', 'often', 'sometimes', 'never'];     // 문장 가운데(하는 말 앞)에 오는 표현 (배운 표현으로 쳐요)
HO.ADV = (CFG.hintAdverbs && CFG.hintAdverbs.length) ? CFG.hintAdverbs.slice() : HO.ADV_ALL.slice();   // 힌트로 보여 줄 것
HO.PHR = (CFG.hintPhrases && CFG.hintPhrases.length) ? CFG.hintPhrases.slice() :                         // 문장 끝에 오는 표현 (힌트)
  ['every day', 'once a day', 'twice a day', 'three times a day', 'four times a day', 'five times a day',
   'once a week', 'twice a week', 'three times a week', 'four times a week', 'five times a week', 'twice a year'];
HO.EXPR = HO.ADV.concat(HO.PHR);
/* once / twice / three~ten times  +  a day / week / month / year  은 모두 배운 표현이에요 (예: six times a day, twice a year) */
var TIMES_RE = /^(once|twice|(three|four|five|six|seven|eight|nine|ten) times) a (day|week|month|year)$/;
HO.isKnown = function (e) { return HO.ADV_ALL.indexOf(e) >= 0 || e === 'every day' || HO.PHR.indexOf(e) >= 0 || TIMES_RE.test(e); };
HO.IDEAS = (CFG.ideaQuestions && CFG.ideaQuestions.length) ? CFG.ideaQuestions.slice() :
  ['brush your teeth', 'wash your hands', 'exercise', 'eat breakfast', 'eat fast food', 'eat vegetables',
   'play badminton', 'play computer games', 'watch YouTube', 'read books', 'take a shower', 'go to bed late'];
HO.TEXTBOOK = (CFG.textbookQuestions && CFG.textbookQuestions.length) ? CFG.textbookQuestions.slice() :
  ['brush your teeth', 'wash your hands', 'exercise', 'eat breakfast', 'eat fast food', 'eat vegetables', 'play badminton', 'brush your hair'];
HO.TITLE = CFG.title || '우리 반 설문 조사 · 6학년 10단원 How often do you ~?';

/* ---------- 도우미 ---------- */
HO.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
HO.now = function () { return Date.now(); };
HO.store = {
  get: function (k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};
HO.hasKorean = function (s) { return /[ㄱ-ㆎ가-힣]/.test(s); };

/* 질문: "How often do you ___ ?" 의 빈칸 */
HO.checkVerb = function (raw) {
  var t = String(raw || '').trim().replace(/\s+/g, ' ');
  if (HO.hasKorean(t)) return { ok: false, error: '영어로 써 주세요.' };
  t = t.replace(/^how often do you\s+/i, '').replace(/[?.!\s]+$/, '');
  if (!t) return { ok: false, error: '낱말을 써 주세요. (예: drink water)' };
  if (!/^[A-Za-z][A-Za-z0-9' ,-]*$/.test(t)) return { ok: false, error: '영어 낱말로만 써 주세요.' };
  if (t.length > 50) return { ok: false, error: '조금 짧게 써 주세요. (50자까지)' };
  if (!/[a-z]{2}/i.test(t)) return { ok: false, error: '낱말을 써 주세요. (예: drink water)' };
  if (!/^I\b/.test(t)) t = t.charAt(0).toLowerCase() + t.slice(1);
  return { ok: true, value: t };
};
/* 대답: I ( ___ ) eat vegetables. 의 괄호 */
HO.checkExpr = function (raw) {
  var t = String(raw || '').trim().replace(/\s+/g, ' ');
  if (HO.hasKorean(t)) return { ok: false, error: '영어로 써 주세요.' };
  t = t.replace(/[.!?\s]+$/, '');
  if (!t) return { ok: false, error: '얼마나 자주 하는지 써 주세요.' };
  if (/^[0-9]/.test(t)) return { ok: false, error: '숫자 말고 글자로 써 주세요. (예: four times a week)' };
  if (!/^[A-Za-z][A-Za-z0-9' ,-]*$/.test(t)) return { ok: false, error: '영어 낱말로만 써 주세요.' };
  if (t.length > 40) return { ok: false, error: '조금 짧게 써 주세요. (40자까지)' };
  t = t.toLowerCase();
  return { ok: true, value: t, known: HO.isKnown(t) };
};
HO.exprPos = function (e) {
  if (HO.ADV_ALL.indexOf(e) >= 0) return 'pre';
  if (e === 'every day' || HO.PHR.indexOf(e) >= 0 || TIMES_RE.test(e)) return 'post';
  return String(e).indexOf(' ') < 0 ? 'pre' : 'post';
};
HO.myVerb = function (v) {
  return String(v).replace(/\byourself\b/gi, 'myself').replace(/\byours\b/gi, 'mine').replace(/\byour\b/gi, 'my');
};
HO.sentence = function (verb, expr) {
  var v = HO.myVerb(verb);
  return HO.exprPos(expr) === 'pre' ? 'I ' + expr + ' ' + v + '.' : 'I ' + v + ' ' + expr + '.';
};
/* 괄호가 들어간 문장 미리보기 (HTML) */
HO.blankHTML = function (verb, expr) {
  var v = HO.esc(HO.myVerb(verb)), e = expr ? HO.esc(expr) : 'how often?';
  var cls = expr ? 'fill' : 'ph', box = '<span class="paren">( <b class="' + cls + '">' + e + '</b> )</span>';
  var pos = expr ? HO.exprPos(expr) : 'pre';
  return pos === 'pre' ? 'I ' + box + ' ' + v + '.' : 'I ' + v + ' ' + box + '.';
};
HO.qKey = function (v) { return 'q_' + String(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60); };
HO.sKey = function (name) {
  var n = String(name || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[.$#\[\]\/\u0000-\u001f]/g, '').slice(0, 20);
  return n ? 's_' + n : '';
};
HO.question = function (verb) { return 'How often do you ' + verb + '?'; };

/* ---------- 작은 데이터 저장소 (연습 방, 시험용) ---------- */
function clean(v) {
  if (v == null) return null;
  if (typeof v !== 'object') return v;
  var out = {}, n = 0;
  Object.keys(v).forEach(function (k) { var c = clean(v[k]); if (c != null) { out[k] = c; n++; } });
  return n ? out : null;
}
function clone(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }
function split(p) { return String(p || '').split('/').filter(Boolean); }
function join(a, b) { return String(a || '').replace(/\/+$/, '') + '/' + b; }

function TinyDB(chan) {
  var self = this;
  this.root = {}; this.ls = []; this.id = Math.random().toString(36).slice(2);
  if (chan && typeof BroadcastChannel !== 'undefined') {
    this.bc = new BroadcastChannel(chan);
    this.bc.onmessage = function (e) {
      var m = e.data || {};
      if (m.from === self.id) return;
      if (m.t === 'hello') self.bc.postMessage({ from: self.id, t: 'state', to: m.from, root: self.root });
      else if (m.t === 'state' && m.to === self.id) { self.root = m.root || {}; self.fire(); if (self.gotState) self.gotState(); }
      else if (m.t === 'ops') self.apply(m.ops, true);
    };
    this.ready = new Promise(function (res) { self.gotState = res; setTimeout(res, 250); });
    this.bc.postMessage({ from: this.id, t: 'hello' });
  }
}
TinyDB.prototype.getVal = function (path) {
  var n = this.root, k = split(path);
  for (var i = 0; i < k.length; i++) { if (n == null || typeof n !== 'object') return null; n = n[k[i]]; }
  return n === undefined ? null : n;
};
TinyDB.prototype.setVal = function (path, val) {
  var k = split(path); val = clean(val);
  if (!k.length) { this.root = val || {}; return; }
  var n = this.root, stack = [];
  for (var i = 0; i < k.length - 1; i++) {
    if (n[k[i]] == null || typeof n[k[i]] !== 'object') { if (val == null) return; n[k[i]] = {}; }
    stack.push([n, k[i]]); n = n[k[i]];
  }
  var last = k[k.length - 1];
  if (val == null) delete n[last]; else n[last] = clone(val);
  for (var j = stack.length - 1; j >= 0; j--) {
    var o = stack[j][0][stack[j][1]];
    if (o && typeof o === 'object' && !Object.keys(o).length) delete stack[j][0][stack[j][1]]; else break;
  }
};
TinyDB.prototype.apply = function (ops, remote) {
  var self = this;
  ops.forEach(function (op) { self.setVal(op[0], op[1]); });
  if (!remote && this.bc) this.bc.postMessage({ from: this.id, t: 'ops', ops: ops });
  this.fire();
};
TinyDB.prototype.fire = function () {
  var self = this;
  this.ls.slice().forEach(function (l) {
    if (l.dead) return;
    var v = self.getVal(l.path), s = JSON.stringify(v);
    if (s !== l.last) { l.last = s; try { l.cb(clone(v)); } catch (e) { if (window.console) console.error(e); } }
  });
};
TinyDB.prototype.get = function (path) { return Promise.resolve(clone(this.getVal(path))); };
TinyDB.prototype.set = function (path, val) { this.apply([[path, val]]); return Promise.resolve(); };
TinyDB.prototype.remove = function (path) { this.apply([[path, null]]); return Promise.resolve(); };
TinyDB.prototype.update = function (path, obj) {
  this.apply(Object.keys(obj).map(function (k) { return [join(path, k), obj[k]]; })); return Promise.resolve();
};
TinyDB.prototype.on = function (path, cb) {
  var self = this, l = { path: path, cb: cb, last: undefined, dead: false };
  this.ls.push(l);
  setTimeout(function () { if (!l.dead) { var v = self.getVal(path); l.last = JSON.stringify(v); cb(clone(v)); } }, 0);
  return function () { l.dead = true; self.ls = self.ls.filter(function (x) { return x !== l; }); };
};
TinyDB.prototype.onConnection = function (cb) { setTimeout(function () { cb(true); }, 0); return function () {}; };
HO.TinyDB = TinyDB;

/* ---------- Firebase 실시간 DB ---------- */
function FirebaseDB(fb) {
  this.d = fb.database();
}
FirebaseDB.prototype.ref = function (path) { return path ? this.d.ref(String(path).replace(/^\/+/, '')) : this.d.ref(); };
FirebaseDB.prototype.get = function (path) { return this.ref(path).once('value').then(function (s) { return s.val(); }); };
FirebaseDB.prototype.set = function (path, val) { return this.ref(path).set(val == null ? null : val); };
FirebaseDB.prototype.remove = function (path) { return this.ref(path).remove(); };
FirebaseDB.prototype.update = function (path, obj) {
  var o = {}; Object.keys(obj).forEach(function (k) { o[k] = obj[k] == null ? null : obj[k]; });
  return this.ref(path).update(o);
};
FirebaseDB.prototype.on = function (path, cb) {
  var r = this.ref(path), h = r.on('value', function (s) { cb(s.val()); });
  return function () { r.off('value', h); };
};
FirebaseDB.prototype.onConnection = function (cb) {
  var r = this.d.ref('.info/connected'), h = r.on('value', function (s) { cb(!!s.val()); });
  return function () { r.off('value', h); };
};
HO.FirebaseDB = FirebaseDB;

HO.loadScript = function (src) {
  return new Promise(function (res, rej) {
    var s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = function () { rej(new Error('load ' + src)); };
    document.head.appendChild(s);
  });
};
var FB_VER = '10.14.1';
/* 진짜 방에 쓰는 저장소. Firebase 주소가 없으면 이 브라우저 안에서만 연결되는 시험 방식이에요 */
HO.openDB = function () {
  if (HO.dbPromise) return HO.dbPromise;
  var f = CFG.firebase;
  if (f && f.databaseURL) {
    HO.dbPromise = HO.loadScript('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app-compat.js')
      .then(function () { return HO.loadScript('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-database-compat.js'); })
      .then(function () {
        if (!window.firebase.apps.length) window.firebase.initializeApp(f);
        HO.mode = 'firebase'; HO.db = new FirebaseDB(window.firebase); return HO.db;
      });
  } else {
    HO.mode = 'local'; HO.db = new TinyDB('ho-local'); HO.dbPromise = (HO.db.ready || Promise.resolve()).then(function () { return HO.db; });
  }
  HO.dbPromise.catch(function () { HO.dbPromise = null; });
  return HO.dbPromise;
};

/* ---------- 방 주소 ---------- */
HO.base = function () {
  var p = location.pathname.replace(/\/index\.html$/, '/');
  if (/\/tv\/?$/.test(p)) p = p.replace(/tv\/?$/, '');
  return location.origin + p;
};
HO.studentURL = function (code) { return HO.base() + '?r=' + code; };
HO.hostLabel = function () { return (location.host + HO.base().slice(location.origin.length)).replace(/\/$/, ''); };

HO.qrSVG = function (text) {
  var q = window.qrcode(0, 'M'); q.addData(text); q.make();
  var n = q.getModuleCount(), d = '';
  for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
  return '<svg viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" shape-rendering="crispEdges" role="img" aria-label="접속 QR"><path d="' + d + '" fill="#0b1026"/></svg>';
};

/* ---------- 방 데이터 읽기 ---------- */
HO.path = function (code, rest) { return 'rooms/' + code + (rest ? '/' + rest : ''); };
HO.questionList = function (R) {
  var Q = (R && R.questions) || {};
  return Object.keys(Q).map(function (k) {
    var q = Q[k] || {};
    return { k: k, text: q.text || '', t: q.t || 0, authors: Object.keys(q.authors || {}), by: q.by || '' };
  }).filter(function (q) { return q.text; }).sort(function (a, b) { return a.t - b.t || (a.k < b.k ? -1 : 1); });
};
HO.selectedList = function (R) {
  var S = (R && R.sel) || {}, Q = (R && R.questions) || {};
  return Object.keys(S).filter(function (k) { return Q[k] && Q[k].text; })
    .map(function (k) { return { k: k, order: S[k], text: Q[k].text }; })
    .sort(function (a, b) { return a.order - b.order; });
};
HO.studentList = function (R) {
  var S = (R && R.students) || {}, Q = (R && R.questions) || {};
  return Object.keys(S).map(function (sid) {
    var n = 0;
    Object.keys(Q).forEach(function (k) { if (Q[k] && Q[k].authors && Q[k].authors[sid]) n++; });
    return { sid: sid, name: S[sid].name || '', t: S[sid].t || 0, asked: n };
  }).sort(function (a, b) { return a.t - b.t || (a.sid < b.sid ? -1 : 1); });
};
HO.answersFor = function (R, qk) {
  var out = [], A = (R && R.answers) || {}, S = (R && R.students) || {};
  Object.keys(S).forEach(function (sid) {
    var a = A[sid] && A[sid][qk];
    if (a && a.e) out.push({ sid: sid, e: a.e, k: !!a.k });
  });
  return out;
};
HO.tally = function (list) {
  function count(arr) {
    var m = {};
    arr.forEach(function (a) { m[a.e] = (m[a.e] || 0) + 1; });
    return Object.keys(m).map(function (e) { return { e: e, n: m[e] }; })
      .sort(function (x, y) { return y.n - x.n || (x.e < y.e ? -1 : 1); });
  }
  var known = list.filter(function (a) { return a.k; }), other = list.filter(function (a) { return !a.k; });
  return { total: list.length, rows: count(known), other: count(other), otherN: other.length };
};
HO.doneCount = function (R, sid, qks) {
  var A = (R && R.answers && R.answers[sid]) || {}, n = 0;
  qks.forEach(function (k) { if (A[k] && A[k].e) n++; });
  return n;
};

/* ---------- 방에 쓰기 (학생 화면과 연습용 가짜 학생이 함께 써요) ---------- */
HO.W = {
  join: function (db, code, name) {
    var sid = HO.sKey(name);
    if (!sid) return Promise.reject({ msg: '이름이나 번호를 써 주세요.' });
    return db.get(HO.path(code, 'meta')).then(function (m) {
      if (!m) throw { msg: '방 번호를 다시 확인해 주세요.' };
      if (!HO.roomAlive(m)) throw { msg: '설문 방이 닫혔어요. 새 방 번호로 들어와 주세요.' };
      return db.get(HO.path(code, 'students/' + sid)).then(function (ex) {
        var rec = { name: String(name).trim().replace(/\s+/g, ' ').slice(0, 20), t: (ex && ex.t) ? ex.t : HO.now() };
        return db.set(HO.path(code, 'students/' + sid), rec).then(function () { return sid; });
      });
    });
  },
  submitQuestion: function (db, code, sid, verb) {
    var k = HO.qKey(verb), base = HO.path(code, 'questions/' + k);
    return db.get(base).then(function (q) {
      var u = {};
      if (!q || !q.text) { u[base + '/text'] = verb; u[base + '/t'] = HO.now(); }
      u[base + '/authors/' + sid] = true;
      return db.update('', u).then(function () { return k; });
    });
  },
  removeMine: function (db, code, sid, k) {
    var base = HO.path(code, 'questions/' + k);
    return db.get(base).then(function (q) {
      if (!q) return;
      var others = Object.keys(q.authors || {}).filter(function (a) { return a !== sid; }), u = {};
      if (!others.length && !q.by) { u[base] = null; u[HO.path(code, 'sel/' + k)] = null; }
      else u[base + '/authors/' + sid] = null;   // 겹치는 경로를 한 번에 쓰면 Firebase 가 거절해서 둘 중 하나만 써요
      return db.update('', u);
    });
  },
  saveAnswer: function (db, code, sid, k, expr, known) {
    return db.set(HO.path(code, 'answers/' + sid + '/' + k), { e: expr, k: known ? 1 : 0, t: HO.now() });
  }
};

/* ---------- 방 열기·닫기 확인 ---------- */
HO.ROOM_STALE_MS = 6 * 60 * 60 * 1000;   // 6시간 동안 선생님 화면이 움직이지 않으면 닫힌 방으로 봐요
HO.ROOM_KEEP_MS = 2 * 24 * 60 * 60 * 1000; // 이틀 지난 방은 새 방을 만들 때 지워요
HO.roomAlive = function (meta) {
  return !!meta && !meta.closed && (HO.now() - (meta.updatedAt || 0) < HO.ROOM_STALE_MS);
};

})();
