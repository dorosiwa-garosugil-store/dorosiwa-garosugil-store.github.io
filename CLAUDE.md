# DOROSIWA 스토어 허브 (가로수길점 직원용 사이트)

GitHub Pages로 서비스되는 정적 사이트. 사장님이 말로 요청하면 Claude가 이 저장소를 직접 수정해 push한다.

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
