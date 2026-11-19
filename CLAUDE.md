# DOROSIWA 스토어 허브 (가로수길점 직원용 사이트)

GitHub Pages로 서비스되는 정적 사이트. 주소: https://dorosiwa-garosugil-store.github.io 사장님이 말로 요청하면 Claude가 이 저장소를 직접 수정해 push한다.

## 파일
- index.html : 화면 전체 (수정 시 폰 화면 390px 기준으로 확인)
- data.json  : 매장 데이터. 근무표·조닝·공지 변경은 대부분 이 파일만 고친다. 고친 뒤 "updated"를 오늘 날짜(YYYY.MM.DD)로 바꾼다.
- robots.txt : 검색엔진 차단

## data.json 구조
- config: store, hours{open,close}, staff[{name,role}], positions[{name,hue,gray?}], shiftPresets[], absences[], guide
- months["YYYY-MM"][직원이름][날짜] = "11~20" | "휴" | "요청휴무" | "연차" ...
- daily["YYYY-MM-DD"] = { published: true, assign: { 직원이름: [open시부터 1시간 단위 포지션, 근무 외는 null] } }
- notices = [{ id, title, body, pinned, date: "YYYY-MM-DD" }]

## 비밀번호
- index.html 의 PASS_HASH = SHA-256(매장 공용 비밀번호). 화면 잠금일 뿐 진짜 보안은 아님 (저장소가 공개).
- 원가·출시 전 제품 등 민감 정보는 올리지 않는다.

## 관리자 모드 (사이트 안에서 직접 수정)
- 관리자는 안희진 매니저(사장님). 사이트 하단 '관리자' → GitHub fine-grained 토큰(이 저장소 Contents: Read and write) 붙여넣기 → 그 폰 localStorage에만 저장.
- 관리자 모드에서 표 칸 수정 → 하단 '저장' 누르면 GitHub API로 data.json을 커밋("사이트에서 수정 (날짜)"). 직원 화면은 Pages 반영 후 1~2분.
- Claude가 data.json을 고치기 전에는 항상 최신을 pull 할 것 (사장님이 사이트에서 저장했을 수 있음).
