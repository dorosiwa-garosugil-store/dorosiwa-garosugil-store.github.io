/* 도로시와 스토어 허브 · 체크리스트 저장 서버
   이 코드를 새 Apps Script 프로젝트에 붙여넣고 "웹 앱"으로 배포하면 끝입니다. (고칠 곳 없음)
   - 날짜별로 누가 어떤 항목을 체크했는지만 저장합니다. (최근 60일만 보관)
*/
const P = PropertiesService.getScriptProperties();

function doGet(e) {
  try { return out_(read_(e && e.parameter && e.parameter.date)); }
  catch (err) { return out_({ok: false, error: String(err.message || err)}); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const date = date_(b.date), key = 'CK_' + date;
    const id = String(b.id || '');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw Error('항목 오류');
    const d = JSON.parse(P.getProperty(key) || '{}');
    if (b.checked) d[id] = {by: String(b.by || '').slice(0, 20), at: new Date().toISOString()};
    else delete d[id];
    P.setProperty(key, JSON.stringify(d));
    cleanup_();
    return out_({ok: true, date: date, checks: d});
  } catch (err) {
    return out_({ok: false, error: String(err.message || err)});
  } finally {
    lock.releaseLock();
  }
}

function read_(date) { date = date_(date); return {ok: true, date: date, checks: JSON.parse(P.getProperty('CK_' + date) || '{}')}; }
function date_(s) { s = String(s || ''); if (!/^20\d\d-\d\d-\d\d$/.test(s)) throw Error('날짜 오류'); return s; }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function cleanup_() {
  const limit = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  P.getKeys().forEach(function (k) { if (k.indexOf('CK_') === 0 && k.slice(3) < limit) P.deleteProperty(k); });
}
