// 학생 출제 문제 저장소.
// SHARE_CONFIG가 비어 있으면 이 기기(브라우저)에만 저장하고, Firestore 설정을 넣으면 모두에게 공유된다.
// 웹 API 키는 공개용(보안은 firestore.rules가 맡는다)
const SHARE_CONFIG = { projectId: 'daeyoung-final-practice', apiKey: 'AIzaSyDQfGLdPvwXmXoO1NTKjzgnUjEk1d7l42E' };

const Share = (() => {
  const LOCAL_KEY = 'fp3_student_problems_v1';
  const COL = 'studentProblems';

  const readLocal = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (e) { return []; } };
  const writeLocal = (list) => { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) {} };

  // Firestore REST 값 변환
  const toFs = (v) => {
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { stringValue: String(v) };
  };
  const fromFs = (f) => {
    if ('stringValue' in f) return f.stringValue;
    if ('integerValue' in f) return Number(f.integerValue);
    if ('doubleValue' in f) return f.doubleValue;
    if ('booleanValue' in f) return f.booleanValue;
    if ('arrayValue' in f) return (f.arrayValue.values || []).map(fromFs);
    if ('timestampValue' in f) return f.timestampValue;
    return null;
  };
  const base = () => `https://firestore.googleapis.com/v1/projects/${SHARE_CONFIG.projectId}/databases/(default)/documents`;
  const key = () => `key=${encodeURIComponent(SHARE_CONFIG.apiKey)}`;

  async function list() {
    if (!SHARE_CONFIG) return readLocal();
    const res = await fetch(`${base()}/${COL}?pageSize=300&${key()}`);
    if (!res.ok) throw new Error('불러오기 실패');
    const data = await res.json();
    return (data.documents || []).map(d => {
      const o = {};
      Object.entries(d.fields || {}).forEach(([k, v]) => { o[k] = fromFs(v); });
      o.id = d.name.split('/').pop();
      return o;
    }).filter(p => !p.hidden);
  }

  async function add(p) {
    const doc = { ...p, created: Date.now(), reports: 0 };
    if (!SHARE_CONFIG) {
      doc.id = 'local-' + doc.created;
      writeLocal([doc, ...readLocal()]);
      return doc;
    }
    const fields = {};
    Object.entries(doc).forEach(([k, v]) => { fields[k] = toFs(v); });
    const res = await fetch(`${base()}/${COL}?${key()}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!res.ok) throw new Error('저장 실패');
    return doc;
  }

  async function report(id) {
    if (!SHARE_CONFIG) {
      writeLocal(readLocal().map(p => p.id === id ? { ...p, reports: (p.reports || 0) + 1 } : p));
      return;
    }
    const name = `projects/${SHARE_CONFIG.projectId}/databases/(default)/documents/${COL}/${id}`;
    const res = await fetch(`${base()}:commit?${key()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [{ transform: { document: name, fieldTransforms: [{ fieldPath: 'reports', increment: { integerValue: '1' } }] } }] })
    });
    if (!res.ok) throw new Error('신고 실패');
  }

  return { list, add, report, shared: !!SHARE_CONFIG };
})();
