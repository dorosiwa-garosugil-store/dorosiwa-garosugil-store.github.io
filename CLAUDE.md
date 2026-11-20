# DOROSIWA 스토어 허브 (가로수길점 직원용 사이트)

GitHub Pages로 서비스되는 정적 사이트. 주소: https://dorosiwa-garosugil-store.github.io 사장님이 말로 요청하면 Claude가 이 저장소를 직접 수정해 push한다.

## 파일
- index.html : 화면 전체 (수정 시 폰 화면 390px 기준으로 확인)
- data.json  : 매장 데이터. 근무표·조닝·공지 변경은 대부분 이 파일만 고친다. 고친 뒤 "updated"를 오늘 날짜(YYYY.MM.DD)로 바꾼다.
- robots.txt : 검색엔진 차단
- manual/ : 본사 스토어 매뉴얼 25장 (홈 '업무 매뉴얼' → 본사 지침). 캐셔·환불 사진은 manual/cashier-01.jpg 식으로 추가
- admin.json : 관리자 열쇠(암호화) — 손대지 말 것

## data.json 구조
- config: store, hours{open,close}, staff[{name,role}], positions[{name,hue,gray?}], shiftPresets[], absences[], guide(데일리 탭 맨 아래 '조닝 운영 참고'), manuals[{id,title,desc,body?,images[]}](홈 '업무 매뉴얼' 타일 → 목록 → 뷰어. body/images 비면 '준비 중'. 현재: hq 본사 지침, cashier 캐셔·결제 방법, refund 교환·환불), holidays{날짜:이름}, restTypes[]
- months["YYYY-MM"][직원이름][날짜] = "11~20" | "휴" | "요청휴무" | "연차" ...
- daily["YYYY-MM-DD"] = { published: true, assign: { 직원이름: [open시부터 1시간 단위 포지션, 근무 외는 null] } }
- notices = [{ id, title, body, pinned, date: "YYYY-MM-DD", images?: ["manual/01.jpg", ...] }] (images = 자료 보기 뷰어로 보여줄 사진, 저장소에 파일로 올림)
- 공지 읽음 표시는 각 기기 localStorage(dsh_readNotices)에 공지 id로 저장 → 새 공지는 새 id로 만들어야 빨간 점이 뜸

## 화면 업데이트
- index.html을 고치면 index.html의 APP_VER와 data.json의 appVersion을 같은 새 값으로 올린다 → 직원 폰이 옛 화면(캐시)을 쓰고 있으면 자동으로 새로 불러옴.

## 비밀번호
- index.html 의 PASS_HASH = SHA-256(매장 공용 비밀번호). 화면 잠금일 뿐 진짜 보안은 아님 (저장소가 공개).
- 원가·출시 전 제품 등 민감 정보는 올리지 않는다.

## 관리자 모드 (사이트 안에서 직접 수정)
- 관리자는 안희진 매니저(사장님). 설정 탭 → 관리자 로그인(관리자 비밀번호). 로그아웃 누르기 전까지 그 기기에서 유지(만료 없음). 관리자 로그아웃은 앱(매장 공용 비밀번호) 로그인에 영향 없음.
- 원리: 처음 설정 때 GitHub fine-grained 토큰(이 저장소 Contents: Read and write)을 관리자 비밀번호로 AES-GCM 암호화(PBKDF2 600k)해 admin.json에 저장. 로그인 = admin.json 복호화 → 토큰을 그 기기 localStorage에 보관.
- 관리자 모드에서 표 칸 수정 → 하단 '저장' 누르면 GitHub API로 data.json 커밋("사이트에서 수정 (날짜)"). 직원 화면은 Pages 반영 후 1~2분.
- admin.json은 지우거나 손대지 말 것. 토큰이 만료되면 사이트의 "처음 설정 다시 하기"로 재등록.
- Claude가 data.json을 고치기 전에는 항상 git pull로 최신을 받을 것 (사장님이 사이트에서 저장했을 수 있음).
