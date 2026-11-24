# DOROSIWA 스토어 허브 (가로수길점 직원용 사이트)

GitHub Pages로 서비스되는 정적 사이트. 주소: https://dorosiwa-garosugil-store.github.io 사장님이 말로 요청하면 Claude가 이 저장소를 직접 수정해 push한다.

## 파일
- index.html : 화면 전체 (수정 시 폰 화면 390px 기준으로 확인)
- data.json  : 매장 데이터. 근무표·조닝·공지 변경은 대부분 이 파일만 고친다. 고친 뒤 "updated"를 오늘 날짜(YYYY.MM.DD)로 바꾼다.
- robots.txt : 검색엔진 차단
- manual/ : 본사 스토어 매뉴얼 25장 (홈 '업무 매뉴얼' → 본사 지침). 캐셔·환불 사진은 manual/cashier-01.jpg 식으로 추가
- stock-qty.json : 재고 수량 기준 (다울포스 '상품별 현재고 목록' 엑셀 → {asof, src, items:[{b 바코드, q 수량, pid?(products.json id) 또는 name, c 컬러, s 사이즈}]}). 원가·판매가는 넣지 않음. 새 엑셀을 받으면 이 파일을 다시 만들고 asof를 엑셀 시각으로 → 그 이전 직원 수정은 무시됨. 직원 수정은 서버 '재고 수량' 시트(asof 이후 것만 반영), 수정 기록은 '재고 수정 기록' 시트(90일). 화면: 재고 위치(컬러 칩 누르면 수정, 확인 창), 0 품절 빨강 / 1~3 부족 주황, 품절·부족만 보기, 관리자 '수량 수정 기록'
- products.json + products/ : 홈 '판매 제품' 화면 데이터 ({categories[{id,name}], items[{id,cat,name,colors[],sizes[],images[]}]}). 사진은 products/p01-1.jpg 식. 사이트 관리자 저장은 data.json만 건드리므로 제품은 Claude가 이 파일을 직접 고친다 (APP_VER 갱신 불필요). 원가·출시 전 제품은 넣지 않는다
- admin.json : 관리자 열쇠(암호화) — 손대지 말 것
- checklist-server.gs : 저장 서버(Google Apps Script) 원본 — 체크리스트(스크립트 속성, 60일) + 매장 기록(구글 시트 '도로시와 가로수길점 매장 기록' 자동 생성: 유동인구·외국인 고객 탭, 계속 보관). 사장님 구글 계정에 웹앱으로 배포, 주소는 data.json config.checkUrl. 이 파일을 고치면 사장님이 Apps Script에 다시 붙여넣고 '배포 관리 → 새 버전'을 해야 함
- 매장 기록 화면(홈 '매장 기록'): 유동인구(매장 밖·1층 인입·2층 인입, 팀 단위 하루 합계 + 날씨·기온·메모) / 외국인 고객(방문 시간·국적·관심 제품·동선·구매 제품·기타·추가) / 기간 정리(대표님 보고용 텍스트 복사, 구글 시트 열기). 모두 작성·열람 가능. checkUrl 비면 기기별 임시 저장(localStorage dsh_log_t, dsh_log_f)

## data.json 구조
- config: store, hours{open,close}, staff[{name,role}], positions[{name,hue,gray?}], shiftPresets[], absences[], guide(데일리 탭 맨 아래 '조닝 운영 참고'), manuals[{id,title,desc,body?,images[]}](홈 '업무 매뉴얼' 타일 → 목록 → 뷰어. body/images 비면 '준비 중'. 현재: hq 본사 지침, fitting 브라·팬티 응대 가이드(body 서식), cashier 캐셔·결제 방법(POS 키 설명 + manual/cashier-01~04.jpg 번호 표시 사진, 원본 사진 위에 번호·색 박스를 그려 만듦), refund 교환·환불. body에 '## '줄이 있으면 서식 적용: ## 접는 섹션 / @img 경로(본문 중간 사진) / ### 소제목 / "멘트(말풍선) / - 설명 / ✕ 하지 말 것 / ! 빨간 강조 / * 팁 / Q. 질문), holidays{날짜:이름}, restTypes[], checklist{open|close:[{title:'1층'|'2층', items:[{id,text,note?} 또는 {head:'청소'}(카드 안 작은 제목, 체크 안 됨)]}]} — 1층·2층은 모든 항목을 따로 체크 (id는 영문·숫자·-만, 바꾸면 기존 기록과 연결이 끊김 — 기록에는 항목 이름 t도 함께 저장됨). 관리자: 체크리스트 화면 '체크 기록 보기'에서 날짜별 누가·언제 확인 (서버 60일 보관), checkUrl
- 먼슬리 관리자 오른쪽 고정 칸: 근무 / 휴무(restTypes 중 대체휴무 제외: 휴·요청휴무) / 필요(주말 수) / 차이 / 대체(쓴 '대체휴무'(또는 '대휴') 수 / 평일 공휴일 수). 직원 화면은 근무 / 휴무(대체휴무 포함)
- config.monthStaff = {"YYYY-MM": [{name,role}]} : 달마다 직원 명단 (먼슬리·데일리 표는 그 달 명단으로 그림). 없는 달은 config.staff(가장 최근 명단) 사용. 사이트 '직원 관리'는 보고 있는 달 명단만 바꿈(이름 변경은 전체 기록에 반영). 직원을 빼도 months/daily 기록은 지우지 않음
- config.idle = [{id:'idle-…', text}] : 해야 할 일 화면 위 '한가할 때 할 일' (접힘, 매일 리셋, 체크는 체크리스트와 같은 서버 저장 CK_날짜에 함께 들어감, 관리자 체크 기록에도 표시). 모든 체크·해제는 서버가 구글 시트 '체크 기록' 탭에 영구 기록
- todos = [{id, date, title, body}] : 해야 할 일 목록 (화면 정렬: 미완료 먼저 날짜 빠른 순, 완료는 맨 아래. 관리자만 작성 — 사이트에서 '+ 할 일 작성' 또는 Claude가 직접). 각 할 일의 완료 체크(누가·언제)와 직원 댓글은 서버 TD_<id>에 저장(계속 보관). 새 할 일·새 댓글은 빨간 점 (각 폰 localStorage dsh_todoSeen {id: 본 댓글 수}) — 새 할 일은 새 id로
- stock = [{id, pid(products.json id), loc('SG1-03-05' 또는 'SG1-09-02(03)'), size, colors[], qty?}] : 홈 '재고 위치' 화면 (제품별 / 위치별 랙 순서, 검색). 처음 데이터는 상품 안내서 PDF(2026-11-13) 로케이션 159줄. 관리자만 수정(줄 누르기, + 위치 추가, 칸 통째로 이동) → 사이트 저장으로 data.json에 들어감. 판매 제품 카드에 '위치' 줄로도 표시. 수량(qty)은 다울포스 연동(API 확인 중) 후 채울 예정. 물류팀장님이 만든 garosu-store.pages.dev 로케이션 사이트를 대체하는 용도
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
