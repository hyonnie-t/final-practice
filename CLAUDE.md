# final-practice — 기출 오답노트

기말 대비 복습 웹앱(정적 파일). 학생이 기출을 풀고 오답노트를 만들고, 서술형(단답)을 직접 출제한다.
배포: https://hyonnie-t.github.io/final-practice/ (GitHub Pages).

## 구조
- `index.html` / `app.js` / `data.js`(문항) / `share.js`(백엔드 연결) / `style.css`(`.wrap`이 폭 3단계 견본) / `cover.webp`·`og-cover.jpg`(표지·공유 그림)
- `share.js`가 부르는 백엔드: 풀이 기록 `ftSubmit`/`ftLoad`(시트 `기말점검_기록`, 세트 `past`), 학생 출제 `GET mode=studentProblems`(목록)·`addStudentProblem`(올리기)·`reportStudentProblem`(신고) — 시트 `기출_학생출제`, 공개 목록엔 별명만
- 서술형 자동 채점: 채점 요소(누가·언제·무엇을·왜·결과) + 인정 낱말

## 규칙
- 저장은 `history26_backend`에 붙인다. final-test와 같은 «기출 앱 공용» 세트 구조(`ftSubmit`/`ftLoad`)를 쓰고, Firebase를 새로 만들지 않는다. 백엔드 변경은 `git fetch origin main` 후 최신 `code.gs`를 본다.
- 태블릿 대응이 기본이다: 폭 3단계, 문제+선택지 2열, 768px 이상에서 글자 한 단계 키우기. 768x1024와 1180x820에서 확인.
- 스크립트·CSS에 캐시 버전(`?v=`)을 붙이지 않는다: 기말 전 짧게 쓰는 앱이라 GitHub Pages 기본 캐시(약 10분)로 충분하다고 보고 그대로 둔다(2026-11-12 점검 R24). 수업 직전에 고치면 학생에게 새로고침을 안내한다.
- 디자인 톤은 final-test와 통일(베이지 배경, 굵은 제목). 포털 테스트 계정은 자동 입력된다.
- 푸시는 작업 브랜치에만, PR 병합은 클로드가 한다(효니 확인 2026-10-25·11-09: 검증→PR→`gh pr merge`→배포 확인). 수정·배포 뒤에는 배포 주소를 내장 브라우저로 직접 열어 확인한다.
