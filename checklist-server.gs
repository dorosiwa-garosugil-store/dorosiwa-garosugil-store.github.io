/* 도로시와 스토어 허브 · 저장 서버 (체크리스트 + 매장 기록)
   이 코드를 새 Apps Script 프로젝트에 통째로 붙여넣고 "웹 앱"으로 배포하면 끝입니다. (고칠 곳 없음)
   - 체크리스트·한가할 때 할 일: 날짜별로 누가 어떤 항목을 언제 체크했는지 저장 (사이트 화면은 최근 60일)
     + 모든 체크·해제 기록을 구글 시트 '체크 기록' 탭에 계속 남김
   - 해야 할 일: 할 일마다 완료 체크(누가·언제)와 직원 댓글 저장 (계속 보관)
   - 매장 기록: 유동인구·외국인 고객 기록을 구글 시트 "도로시와 가로수길점 매장 기록"에 저장 (계속 보관)
     시트는 처음 기록할 때 내 구글 드라이브에 자동으로 만들어집니다.
*/
const P = PropertiesService.getScriptProperties();
const T_HEAD = ['날짜', '요일', '매장 밖 유동인구', '1층 인입', '2층 인입', '날씨', '기온', '메모', '작성자', '수정 시각'];
const F_HEAD = ['ID', '날짜', '방문 시간', '국적', '관심 제품', '동선', '구매 제품', '기타 사항', '추가 사항', '작성자', '작성 시각'];
const F_KEYS = ['id', 'date', 'time', 'nat', 'interest', 'route', 'bought', 'etc', 'extra', 'by', 'at'];
const WD = ['일', '월', '화', '수', '목', '금', '토'];

function doGet(e) {
  try {
    const q = (e && e.parameter) || {};
    if (q.history) return out_(history_());
    if (q.log) return out_({ok: true, log: dayLog_(date_(q.log))});
    if (q.todos) return out_(todos_());
    if (q.logs) return out_(rangeLog_(date_(q.from), date_(q.to)));
    return out_(read_(q.date));
  }
  catch (err) { return out_({ok: false, error: String(err.message || err)}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.kind === 'traffic') return out_(saveTraffic_(b));
    if (b.kind === 'foreign') return out_(saveForeign_(b));
    if (b.kind === 'todo') return out_(saveTodo_(b));
    const date = date_(b.date), key = 'CK_' + date;
    const id = String(b.id || '');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw Error('항목 오류');
    const d = JSON.parse(P.getProperty(key) || '{}');
    if (b.checked) d[id] = {by: s_(b.by, 20), at: new Date().toISOString(), t: s_(b.t, 60)};
    else delete d[id];
    P.setProperty(key, JSON.stringify(d));
    cleanup_();
    try { logCheck_(date, b); } catch (e) {}
    return out_({ok: true, date: date, checks: d});
  } catch (err) {
    return out_({ok: false, error: String(err.message || err)});
  } finally {
    lock.releaseLock();
  }
}

/* ── 체크리스트 ── */
function read_(date) { date = date_(date); return {ok: true, date: date, checks: JSON.parse(P.getProperty('CK_' + date) || '{}')}; }
function history_() {
  const days = {};
  P.getKeys().forEach(function (k) { if (k.indexOf('CK_') === 0) days[k.slice(3)] = JSON.parse(P.getProperty(k) || '{}'); });
  return {ok: true, days: days};
}
function cleanup_() {
  const limit = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  P.getKeys().forEach(function (k) { if (k.indexOf('CK_') === 0 && k.slice(3) < limit) P.deleteProperty(k); });
}

/* ── 해야 할 일 (완료 체크 · 댓글) ── */
function todos_() {
  const t = {};
  P.getKeys().forEach(function (k) { if (k.indexOf('TD_') === 0) t[k.slice(3)] = JSON.parse(P.getProperty(k) || '{}'); });
  return {ok: true, todos: t};
}
function saveTodo_(b) {
  const id = String(b.id || '');
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw Error('항목 오류');
  const key = 'TD_' + id, d = JSON.parse(P.getProperty(key) || '{}');
  d.comments = d.comments || [];
  const now = new Date().toISOString();
  if (b.op === 'done') d.done = {by: s_(b.by, 20), at: now};
  else if (b.op === 'undone') delete d.done;
  else if (b.op === 'comment') { const text = s_(b.text, 1000).trim(); if (!text) throw Error('내용 없음'); d.comments.push({id: Utilities.getUuid().slice(0, 8), by: s_(b.by, 20), at: now, text: text}); }
  else if (b.op === 'delc') d.comments = d.comments.filter(function (c) { return c.id !== String(b.cid); });
  else if (b.op === 'clear') { P.deleteProperty(key); return todos_(); }
  else throw Error('동작 오류');
  P.setProperty(key, JSON.stringify(d));
  return todos_();
}

/* ── 매장 기록 (구글 시트) ── */
function book_() {
  const id = P.getProperty('LOG_SHEET');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('도로시와 가로수길점 매장 기록');
  const t = ss.getSheets()[0]; t.setName('유동인구'); setup_(t, T_HEAD, 'A:B');
  setup_(ss.insertSheet('외국인 고객'), F_HEAD, 'A:K');
  P.setProperty('LOG_SHEET', ss.getId());
  return ss;
}
const C_HEAD = ['날짜', '시각', '구분', '항목', '체크/해제', '직원'];
function logCheck_(date, b) {
  const ss = book_(); let sh = ss.getSheetByName('체크 기록');
  if (!sh) { sh = ss.insertSheet('체크 기록'); setup_(sh, C_HEAD, 'A:F'); }
  sh.appendRow([date, Utilities.formatDate(new Date(), 'Asia/Seoul', 'HH:mm:ss'), s_(b.g, 20), s_(b.t, 60), b.checked ? '체크' : '해제', s_(b.by, 20)]);
}
function setup_(sh, head, textCols) {
  sh.getRange(textCols).setNumberFormat('@');
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f1f1ef');
  sh.setFrozenRows(1);
}
function rows_(name) {
  const sh = book_().getSheetByName(name), v = sh.getDataRange().getValues();
  return {sh: sh, rows: v.slice(1)};
}
function tObj_(r) { return {date: d_(r[0]), out: num_(r[2]), in1: num_(r[3]), in2: num_(r[4]), weather: String(r[5] || ''), temp: String(r[6] || ''), memo: String(r[7] || ''), by: String(r[8] || ''), at: String(r[9] || '')}; }
function fObj_(r) { const o = {}; F_KEYS.forEach(function (k, i) { o[k] = k === 'date' ? d_(r[i]) : k === 'time' ? t_(r[i]) : k === 'at' && r[i] instanceof Date ? r[i].toISOString() : String(r[i] == null ? '' : r[i]); }); return o; }
function dayLog_(date) {
  const t = rows_('유동인구').rows.filter(function (r) { return d_(r[0]) === date; })[0];
  const f = rows_('외국인 고객').rows.filter(function (r) { return d_(r[1]) === date; }).map(fObj_);
  f.sort(function (a, b) { return a.time.localeCompare(b.time); });
  return {date: date, traffic: t ? tObj_(t) : null, foreign: f};
}
function rangeLog_(from, to) {
  const ss = book_(), inR = function (d) { d = d_(d); return d >= from && d <= to; };
  const traffic = rows_('유동인구').rows.filter(function (r) { return inR(r[0]); }).map(tObj_).sort(function (a, b) { return a.date.localeCompare(b.date); });
  const foreign = rows_('외국인 고객').rows.filter(function (r) { return inR(r[1]); }).map(fObj_).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  return {ok: true, from: from, to: to, traffic: traffic, foreign: foreign, sheetUrl: ss.getUrl()};
}
function saveTraffic_(b) {
  const date = date_(b.date), x = rows_('유동인구');
  const row = [date, WD[new Date(date + 'T12:00:00Z').getUTCDay()], numIn_(b.out), numIn_(b.in1), numIn_(b.in2), s_(b.weather, 10), s_(b.temp, 10), s_(b.memo, 300), s_(b.by, 20), new Date().toISOString()];
  const i = x.rows.findIndex(function (r) { return d_(r[0]) === date; });
  if (i >= 0) x.sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
  else x.sh.appendRow(row);
  return {ok: true, log: dayLog_(date)};
}
function saveForeign_(b) {
  const date = date_(b.date), x = rows_('외국인 고객');
  const i = b.id ? x.rows.findIndex(function (r) { return String(r[0]) === String(b.id); }) : -1;
  if (b.op === 'del') { if (i >= 0) x.sh.deleteRow(i + 2); return {ok: true, log: dayLog_(date)}; }
  const row = [b.id && i >= 0 ? String(b.id) : Utilities.getUuid().slice(0, 8), date, s_(b.time, 5), s_(b.nat, 60), s_(b.interest, 300), s_(b.route, 300), s_(b.bought, 300), s_(b.etc, 500), s_(b.extra, 500), s_(b.by, 20), i >= 0 ? String(x.rows[i][10]) : new Date().toISOString()];
  if (i >= 0) x.sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
  else x.sh.appendRow(row);
  return {ok: true, log: dayLog_(date)};
}

/* ── 공통 ── */
function d_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd') : String(v == null ? '' : v).trim(); }
function t_(v) { return v instanceof Date ? Utilities.formatDate(v, 'Asia/Seoul', 'HH:mm') : String(v == null ? '' : v).trim(); }
function s_(v, n) { return String(v == null ? '' : v).slice(0, n); }
function num_(v) { return v === '' || v == null ? '' : Number(v); }
function numIn_(v) { v = String(v == null ? '' : v).trim(); return /^\d{1,6}$/.test(v) ? Number(v) : ''; }
function date_(s) { s = String(s || ''); if (!/^20\d\d-\d\d-\d\d$/.test(s)) throw Error('날짜 오류'); return s; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
