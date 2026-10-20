// history26 백엔드(Apps Script) 연결 — final-test와 같은 웹앱 주소·같은 학번+이름 로그인을 쓴다.
//  · 풀이 기록: ftSubmit/ftLoad (시트 `기말점검_기록`, 세트 'past')
//  · 학생 출제 문제: studentProblems / addStudentProblem / reportStudentProblem (시트 `기출_학생출제`)
const BACKEND = 'https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec';
const PAST_SET = 'past';
const PORTAL_KEY = 'portal_session'; // history26 포털 로그인({sid,name}) — 같은 github.io 출처라 읽을 수 있다
const PROFILE_KEY = 'fp3_profile_v1';

const Share = (() => {
  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let profile = readJSON(PROFILE_KEY); // { sid, name } | null
  if (!profile) {
    const ps = readJSON(PORTAL_KEY);
    if (ps && ps.sid && ps.name && String(ps.sid).length <= 12) { profile = { sid: String(ps.sid), name: String(ps.name) }; writeJSON(PROFILE_KEY, profile); }
  }

  async function call(body, query) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = query
        ? await fetch(BACKEND + '?' + query, { signal: ctl.signal })
        : await fetch(BACKEND, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctl.signal });
      return await r.json();
    } finally { clearTimeout(to); }
  }
  const who = () => ({ studentId: profile.sid, name: profile.name });

  return {
    get profile() { return profile; },
    setProfile(p) { profile = p; if (p) writeJSON(PROFILE_KEY, p); else { try { localStorage.removeItem(PROFILE_KEY); } catch (e) {} } },

    // 학번+이름이 맞는지 서버에 물어보고(불러오기가 곧 확인) 풀이 기록을 돌려준다
    async loadRecords(p) {
      const res = await call({ action: 'ftLoad', studentId: p.sid, name: p.name, set: PAST_SET });
      if (res.result !== 'success') throw new Error(res.message || '불러오기 실패');
      return res.items || [];
    },
    async saveRecords(items) {
      const res = await call({ action: 'ftSubmit', ...who(), items });
      if (res.result !== 'success') throw new Error(res.message || '저장 실패');
    },

    async list() {
      const res = await call(null, 'mode=studentProblems');
      if (res.result !== 'success') throw new Error(res.message || '불러오기 실패');
      return res.rows || [];
    },
    async add(p) {
      const res = await call({ action: 'addStudentProblem', ...who(), ...p });
      if (res.result !== 'success') throw new Error(res.message || '저장 실패');
      return res;
    },
    async report(id) {
      const res = await call({ action: 'reportStudentProblem', ...who(), id });
      if (res.result !== 'success') throw new Error(res.message || '신고 실패');
      return res;
    }
  };
})();
