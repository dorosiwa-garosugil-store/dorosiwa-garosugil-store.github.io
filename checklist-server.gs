/* 도로시와 스토어 허브 · 저장 서버 (체크리스트 + 매장 기록)
   이 코드를 새 Apps Script 프로젝트에 통째로 붙여넣고 "웹 앱"으로 배포하면 끝입니다. (고칠 곳 없음)
   - 체크리스트·한가할 때 할 일: 날짜별로 누가 어떤 항목을 언제 체크했는지 저장 (사이트 화면은 최근 60일)
     + 모든 체크·해제 기록을 구글 시트 '체크 기록' 탭에 계속 남김
   - 해야 할 일: 할 일마다 완료 체크(누가·언제)와 직원 댓글 저장 (계속 보관)
   - 영수증 차감: 영수증 사진 글자 인식(구글 드라이브 OCR — Apps Script 왼쪽 '서비스'에서 Drive API 추가 필요) → 확인 후 여러 상품 한 번에 차감, 같은 영수증 두 번 차감 방지
   - 재고 수량: 직원이 고친 수량을 시트 '재고 수량' 탭에, 수정 기록(누가·언제·이전→변경)을 '재고 수정 기록' 탭에 저장 (기록은 90일 보관)
   - 도난·불량: 직원 신고(날짜·유형·DP/판매·제품·컬러·사이즈·수량·메모)와 관리자 최종 확인을 시트 '도난·불량' 탭에 저장 (계속 보관)
   - DP 재고·DP 제외: 전 직원이 등록·수정·삭제·제외 (시트 'DP 재고'·'DP 제외' 탭, 수정 기록은 'DP 수정 기록' 탭, 계속 보관)
   - 체험단 방문 명단: 본사 공유 시트(링크)를 읽어 방문 예약에 자동 표시 (전화번호·건강 정보는 보내지 않음, 5분 캐시)
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
    if (q.qty) return out_(qtyAll_());
    if (q.qtylog) return out_(qtyLog_());
    if (q.loss) return out_(lossAll_());
    if (q.dp) return out_(dpAll_());
    if (q.visits) return out_(visits_(String(q.visits)));
    if (q.logs) return out_(rangeLog_(date_(q.from), date_(q.to)));
    return out_(read_(q.date));
  }
  catch (err) { return out_({ok: false, error: String(err.message || err)}); }
}

function doPost(e) {
  try {
    const raw = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (raw.kind === 'ocr') return out_(ocr_(raw));
  } catch (err) { return out_({ok: false, error: String(err.message || err)}); }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.kind === 'traffic') return out_(saveTraffic_(b));
    if (b.kind === 'foreign') return out_(saveForeign_(b));
    if (b.kind === 'todo') return out_(saveTodo_(b));
    if (b.kind === 'qty') return out_(saveQty_(b));
    if (b.kind === 'qtybatch') return out_(saveQtyBatch_(b));
    if (b.kind === 'loss') return out_(saveLoss_(b));
    if (b.kind === 'dp') return out_(saveDp_(b));
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

/* ── 재고 수량 (직원 수정 · 90일 기록) ── */
const Q_HEAD = ['바코드', '수량', '직원', '수정 시각', '상품', '컬러-사이즈'];
const QL_HEAD = ['시각', 'ISO', '직원', '바코드', '상품', '컬러-사이즈', '이전', '변경', '메모'];
function sheet_(name, head, textCols) {
  const ss = book_(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); setup_(sh, head, textCols); }
  return sh;
}
function qtyAll_() {
  const v = sheet_('재고 수량', Q_HEAD, 'A:D').getDataRange().getValues().slice(1), q = {};
  v.forEach(function (r) { if (r[0] !== '') q[String(r[0])] = {qty: Number(r[1]), by: String(r[2] || ''), at: r[3] instanceof Date ? r[3].toISOString() : String(r[3] || '')}; });
  return {ok: true, q: q};
}
function ocr_(b) {
  if (typeof Drive === 'undefined') throw Error('DRIVE_API_OFF');
  const blob = Utilities.newBlob(Utilities.base64Decode(String(b.image || '')), String(b.mime || 'image/jpeg'), 'receipt.jpg');
  const f = Drive.Files.create({name: 'receipt-ocr-tmp', mimeType: 'application/vnd.google-apps.document'}, blob, {ocrLanguage: 'ko'});
  let text = '';
  try { text = DocumentApp.openById(f.id).getBody().getText(); } finally { try { Drive.Files.remove(f.id); } catch (e) {} }
  return {ok: true, text: text};
}
function saveQtyBatch_(b) {
  const rc = s_(b.receipt, 40).trim(), items = (b.items || []).slice(0, 60);
  if (!items.length) throw Error('상품 없음');
  const rs = sheet_('영수증 차감', ['영수증 번호', '시각', '직원', '상품 수'], 'A:B');
  if (rc) { const n = rs.getLastRow(); if (n > 1 && rs.getRange(2, 1, n - 1, 1).getValues().some(function (r) { return String(r[0]) === rc; })) throw Error('USED_RECEIPT'); }
  const sh = sheet_('재고 수량', Q_HEAD, 'A:D'), v = sh.getDataRange().getValues(), idx = {};
  v.forEach(function (r, k) { if (k > 0) idx[String(r[0])] = k; });
  const now = new Date(), iso = now.toISOString(), ts = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'), add = [], logs = [];
  items.forEach(function (it) {
    const bc = String(it.barcode || ''), qty = Number(it.qty);
    if (!/^[0-9A-Za-z-]{4,30}$/.test(bc) || !isFinite(qty) || Math.abs(qty) > 99999 || Math.floor(qty) !== qty) return;
    const row = [bc, qty, s_(b.by, 20), iso, s_(it.name, 80), s_(it.spec, 40)];
    if (idx[bc] != null) sh.getRange(idx[bc] + 1, 1, 1, 6).setValues([row]); else add.push(row);
    logs.push([ts, iso, s_(b.by, 20), bc, s_(it.name, 80), s_(it.spec, 40), it.prev === '' || it.prev == null ? '' : Number(it.prev), qty, s_(b.memo, 60)]);
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 6).setValues(add);
  const lg = sheet_('재고 수정 기록', QL_HEAD, 'A:B');
  if (logs.length) lg.getRange(lg.getLastRow() + 1, 1, logs.length, 9).setValues(logs);
  qtyCleanup_(lg);
  rs.appendRow([rc || '(번호 없음)', ts, s_(b.by, 20), items.length]);
  return qtyAll_();
}
function saveQty_(b, inBatch) {
  const bc = String(b.barcode || '');
  if (!/^[0-9A-Za-z-]{4,30}$/.test(bc)) throw Error('바코드 오류');
  const qty = Number(b.qty);
  if (!isFinite(qty) || Math.abs(qty) > 99999 || Math.floor(qty) !== qty) throw Error('수량 오류');
  const sh = sheet_('재고 수량', Q_HEAD, 'A:D'), v = sh.getDataRange().getValues();
  const now = new Date(), row = [bc, qty, s_(b.by, 20), now.toISOString(), s_(b.name, 80), s_(b.spec, 40)];
  const i = v.findIndex(function (r, k) { return k > 0 && String(r[0]) === bc; });
  if (i > 0) sh.getRange(i + 1, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
  const lg = sheet_('재고 수정 기록', QL_HEAD, 'A:B');
  lg.appendRow([Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'), now.toISOString(), s_(b.by, 20), bc, s_(b.name, 80), s_(b.spec, 40), b.prev === '' || b.prev == null ? '' : Number(b.prev), qty, s_(b.memo, 60)]);
  if (inBatch) return;
  qtyCleanup_(lg);
  return qtyAll_();
}
function qtyCleanup_(lg) {
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  if (P.getProperty('QTY_CLEAN') === today) return;
  P.setProperty('QTY_CLEAN', today);
  const limit = new Date(Date.now() - 90 * 864e5).toISOString(), n = lg.getLastRow();
  if (n < 2) return;
  const iso = lg.getRange(2, 2, n - 1, 1).getValues();
  let k = 0; while (k < iso.length && String(iso[k][0]) < limit) k++;
  if (k > 0) lg.deleteRows(2, k);
}
function qtyLog_() {
  const v = sheet_('재고 수정 기록', QL_HEAD, 'A:B').getDataRange().getValues().slice(1);
  return {ok: true, log: v.map(function (r) { return {t: String(r[0]), at: String(r[1]), by: String(r[2]), b: String(r[3]), name: String(r[4]), spec: String(r[5]), prev: r[6], qty: r[7], memo: String(r[8] || '')}; }).reverse().slice(0, 2000)};
}

/* ── 매장 기록 (구글 시트) ── */
let BOOK_ = null;
function book_() {
  if (BOOK_) return BOOK_;
  const id = P.getProperty('LOG_SHEET');
  if (id) { try { return (BOOK_ = SpreadsheetApp.openById(id)); } catch (e) {} }
  const ss = SpreadsheetApp.create('도로시와 가로수길점 매장 기록');
  const t = ss.getSheets()[0]; t.setName('유동인구'); setup_(t, T_HEAD, 'A:B');
  setup_(ss.insertSheet('외국인 고객'), F_HEAD, 'A:K');
  P.setProperty('LOG_SHEET', ss.getId());
  return (BOOK_ = ss);
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

/* 권한 확인용: 편집기에서 이 함수(authorize)를 골라 ▷ 실행 → 승인 창에서 허용 */
function authorize() {
  const r = Drive.Files.list({pageSize: 1});
  Logger.log('드라이브 권한 OK (' + ((r.files || []).length) + ')');
  Logger.log('문서 권한 OK: ' + typeof DocumentApp.openById);
}

/* ── 도난 · 불량 (시트 '도난·불량' 탭, 계속 보관) ── */
const L_HEAD = ['ID', '날짜', '유형', '구분', '제품', '컬러', '사이즈', '수량', '메모', '신고자', '신고 시각', '최종 확인', '확인 시각', 'pid'];
function lossSheet_() { return sheet_('도난·불량', L_HEAD, 'A:N'); }
function lossObj_(r) { return {id: String(r[0]), date: d_(r[1]), type: String(r[2]), src: String(r[3]), name: String(r[4]), color: String(r[5]), size: String(r[6]), qty: Number(r[7]) || 1, memo: String(r[8] || ''), by: String(r[9] || ''), at: r[10] instanceof Date ? r[10].toISOString() : String(r[10] || ''), okBy: String(r[11] || ''), okAt: r[12] instanceof Date ? r[12].toISOString() : String(r[12] || ''), pid: String(r[13] || '')}; }
function lossAll_() {
  const v = lossSheet_().getDataRange().getValues().slice(1).filter(function (r) { return r[0] !== ''; });
  return {ok: true, loss: v.map(lossObj_)};
}
function saveLoss_(b) {
  const sh = lossSheet_(), v = sh.getDataRange().getValues();
  const find = function (id) { return v.findIndex(function (r, k) { return k > 0 && String(r[0]) === String(id); }); };
  if (b.act === 'add') {
    const qty = Number(b.qty);
    if (!b.name || !isFinite(qty) || qty < 1 || qty > 9999) throw Error('입력 오류');
    sh.appendRow(['L' + Date.now().toString(36), date_(b.date), s_(b.type, 10), s_(b.src, 10), s_(b.name, 80), s_(b.color, 30), s_(b.size, 30), qty, s_(b.memo, 300), s_(b.by, 20), new Date().toISOString(), '', '', s_(b.pid, 10)]);
  } else if (b.act === 'ok' || b.act === 'unok') {
    const i = find(b.id); if (i < 1) throw Error('없는 기록');
    sh.getRange(i + 1, 12, 1, 2).setValues([b.act === 'ok' ? [s_(b.by, 20), new Date().toISOString()] : ['', '']]);
  } else if (b.act === 'del') {
    const i = find(b.id); if (i < 1) throw Error('없는 기록');
    sh.deleteRow(i + 1);
  } else throw Error('알 수 없는 요청');
  return lossAll_();
}

/* ── DP 재고 · DP 제외 (시트 'DP 재고' · 'DP 제외' · 'DP 수정 기록', 전 직원 수정) ── */
const DP_KEYS = ['id', 'fl', 'zone', 'pid', 'name', 'color', 'size', 'qty', 'tag', 'by', 'at'];
const DO_KEYS = ['id', 'date', 'pid', 'name', 'color', 'size', 'qty', 'status', 'from', 'doneDate', 'by', 'at'];
const DP_HEAD = ['ID', '층', '구역', 'pid', '제품', '컬러', '사이즈', '수량', '표시', '수정자', '수정 시각'];
const DO_HEAD = ['ID', '제외일', 'pid', '제품', '컬러', '사이즈', '수량', '상태', '빠진 위치', '반품 완료일', '수정자', '수정 시각'];
const DL_HEAD = ['시각', '직원', '작업', '내용'];
function dpObj_(keys, r) { const o = {}; keys.forEach(function (k, i) { const v = r[i]; o[k] = k === 'qty' ? (Number(v) || 0) : (v instanceof Date ? (k === 'at' ? v.toISOString() : d_(v)) : String(v == null ? '' : v)); }); return o; }
function dpRead_() {
  const a = sheet_('DP 재고', DP_HEAD, 'A:K').getDataRange().getValues().slice(1).filter(function (r) { return r[0] !== ''; }).map(function (r) { return dpObj_(DP_KEYS, r); });
  const o = sheet_('DP 제외', DO_HEAD, 'A:L').getDataRange().getValues().slice(1).filter(function (r) { return r[0] !== ''; }).map(function (r) { return dpObj_(DO_KEYS, r); });
  return {dp: a, dpOut: o};
}
function dpAll_() { const x = dpRead_(); return {ok: true, dp: x.dp, dpOut: x.dpOut, seeded: P.getProperty('DP_SEEDED') === '1', batches: JSON.parse(P.getProperty('DP_BATCHES') || '[]')}; }
function dpRow_(keys, o, by) { return keys.map(function (k) { return k === 'by' ? s_(by, 20) : k === 'at' ? new Date().toISOString() : k === 'qty' ? Math.max(0, Math.round(Number(o.qty) || 0)) : s_(o[k], 80); }); }
function dpFind_(sh, id) { const v = sh.getDataRange().getValues(); for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return {i: i + 1, r: v[i]}; return null; }
function dpLog_(by, act, txt) { sheet_('DP 수정 기록', DL_HEAD, 'A:D').appendRow([Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'), s_(by, 20), act, s_(txt, 300)]); }
function dpDesc_(o) { return [o.name, o.color, o.size].filter(String).join(' ') + ' ' + o.qty + '개'; }
function saveDp_(b) {
  const sa = sheet_('DP 재고', DP_HEAD, 'A:K'), so = sheet_('DP 제외', DO_HEAD, 'A:L'), by = b.by || '';
  if (b.act === 'seed') {
    if (P.getProperty('DP_SEEDED') === '1') return dpAll_();
    (b.dp || []).forEach(function (o) { sa.appendRow(dpRow_(DP_KEYS, o, o.by || '')); });
    (b.dpOut || []).forEach(function (o) { so.appendRow(dpRow_(DO_KEYS, o, o.by || '')); });
    P.setProperty('DP_SEEDED', '1');
    return dpAll_();
  }
  if (b.act === 'batch') {   // Claude가 사이트 파일(dp-pending.json)에 준비한 변경 묶음 — 한 번만 반영
    const done = JSON.parse(P.getProperty('DP_BATCHES') || '[]');
    if (!b.bid || done.indexOf(b.bid) >= 0) return dpAll_();
    (b.ops || []).forEach(function (op) { try { saveDp_(Object.assign({}, op, {by: s_(by, 12) + '(Claude 준비)'})); } catch (e) {} });
    done.push(b.bid); P.setProperty('DP_BATCHES', JSON.stringify(done.slice(-200)));
    return dpAll_();
  }
  const it = b.item || {};
  if (b.act === 'add') {
    if (!it.id || !it.name) throw Error('입력 오류');
    sa.appendRow(dpRow_(DP_KEYS, it, by)); dpLog_(by, '등록', dpDesc_(it) + ' · ' + (b.where || ''));
  } else if (b.act === 'edit') {
    const f = dpFind_(sa, it.id); if (!f) throw Error('없는 DP예요 · 새로고침해 주세요');
    const old = dpObj_(DP_KEYS, f.r);
    sa.getRange(f.i, 1, 1, DP_KEYS.length).setValues([dpRow_(DP_KEYS, it, by)]);
    dpLog_(by, '수정', dpDesc_(old) + ' → ' + dpDesc_(it));
  } else if (b.act === 'del') {
    const f = dpFind_(sa, b.id); if (!f) throw Error('없는 DP예요 · 새로고침해 주세요');
    dpLog_(by, '삭제', dpDesc_(dpObj_(DP_KEYS, f.r))); sa.deleteRow(f.i);
  } else if (b.act === 'out') {
    const f = dpFind_(sa, b.id); if (!f) throw Error('없는 DP예요 · 새로고침해 주세요');
    const o = dpObj_(DP_KEYS, f.r), q = Math.min(o.qty, Math.max(1, Math.round(Number(b.qty) || 1)));
    const rec = {id: s_(b.oid, 30) || 'o' + Date.now().toString(36), date: date_(b.date), pid: o.pid, name: o.name, color: o.color, size: o.size, qty: q, status: s_(b.status || 'wait', 10), from: s_(b.from, 40), doneDate: ''};
    so.appendRow(dpRow_(DO_KEYS, rec, by));
    if (q >= o.qty) sa.deleteRow(f.i); else sa.getRange(f.i, 8, 1, 4).setValues([[o.qty - q, o.tag, s_(by, 20), new Date().toISOString()]]);
    dpLog_(by, 'DP 제외', dpDesc_(rec) + ' · ' + rec.status);
  } else if (b.act === 'ostat') {
    const f = dpFind_(so, b.id); if (!f) throw Error('없는 기록이에요');
    const o = dpObj_(DO_KEYS, f.r); o.status = s_(b.status, 10); if (o.status === 'done' && !o.doneDate) o.doneDate = date_(b.date);
    so.getRange(f.i, 1, 1, DO_KEYS.length).setValues([dpRow_(DO_KEYS, o, by)]); dpLog_(by, '반품 상태', dpDesc_(o) + ' → ' + o.status);
  } else if (b.act === 'odel') {
    const f = dpFind_(so, b.id); if (!f) throw Error('없는 기록이에요');
    dpLog_(by, '제외 기록 삭제', dpDesc_(dpObj_(DO_KEYS, f.r))); so.deleteRow(f.i);
  } else throw Error('알 수 없는 요청');
  return b.lite ? {ok: true} : dpAll_();
}

/* ── 체험단 방문 명단 (본사 공유 시트 읽기 전용) ── */
function visits_(sid) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(sid)) throw Error('시트 주소 오류');
  const cache = CacheService.getScriptCache(), ck = 'VIS_' + sid, hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  const v = SpreadsheetApp.openById(sid).getSheets()[0].getDataRange().getValues();
  let hr = -1; for (let i = 0; i < Math.min(v.length, 6); i++) if (v[i].some(function (c) { return String(c).replace(/\s/g, '') === '방문일자'; })) { hr = i; break; }
  if (hr < 0) throw Error('명단 형식을 못 찾았어요');
  const H = v[hr].map(function (c) { return String(c).replace(/\s/g, ''); });
  const col = function (name) { return H.indexOf(name); };
  const C = {date: col('방문일자'), time: col('방문시간'), name: col('이름'), plat: col('플랫폼'), ch: col('채널'), mode: col('진행방식'), handle: col('활동명'), gift: col('지급품목'), opt: col('옵션'), n: col('수량'), size: col('기존사이즈'), ko: col('한국어가능여부'), note: col('비고')};
  const g = function (r, k) { return C[k] < 0 ? '' : r[C[k]]; };
  const now = new Date(), y = now.getFullYear(), m0 = now.getMonth() + 1, out = [];
  v.slice(hr + 1).forEach(function (r) {
    let d = g(r, 'date'), t = g(r, 'time'), ds = '';
    if (d instanceof Date) ds = Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd');
    else { const mm = String(d).match(/(\d{1,2})\s*[\/.월-]\s*(\d{1,2})/); if (mm) { const mo = +mm[1], yy = mo < m0 - 3 ? y + 1 : y; ds = yy + '-' + ('0' + mo).slice(-2) + '-' + ('0' + mm[2]).slice(-2); } }
    if (!ds) return;
    let ts = t instanceof Date ? Utilities.formatDate(t, 'Asia/Seoul', 'HH:mm') : String(t || '').trim();
    const tm = ts.match(/^(\d{1,2}):(\d{2})/); if (tm) ts = ('0' + tm[1]).slice(-2) + ':' + tm[2];
    const str = function (k) { return String(g(r, k) == null ? '' : g(r, k)).trim(); };
    out.push({date: ds, time: ts, name: str('name'), handle: str('handle'), plat: str('plat'), ch: str('ch'), mode: str('mode'),
      gift: [str('gift'), str('opt'), str('n') && str('n') !== '-' ? str('n') + '개' : ''].filter(function (x) { return x && x !== '-'; }).join(' '),
      size: str('size') === '-' ? '' : str('size'), ko: str('ko'), note: str('note')});
  });
  const res = {ok: true, visits: out, at: new Date().toISOString()};
  cache.put(ck, JSON.stringify(res), 300);
  return res;
}
