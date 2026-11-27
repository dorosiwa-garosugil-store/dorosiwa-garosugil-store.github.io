# DOROSIWA 스토어 허브 (가로수길점 직원용 사이트)

GitHub Pages로 서비스되는 정적 사이트. 주소: https://dorosiwa-garosugil-store.github.io 사장님이 말로 요청하면 Claude가 이 저장소를 직접 수정해 push한다.

## 파일
- index.html : 화면 전체 (수정 시 폰 화면 390px 기준으로 확인)
- data.json  : 매장 데이터. 근무표·조닝·공지 변경은 대부분 이 파일만 고친다. 고친 뒤 "updated"를 오늘 날짜(YYYY.MM.DD)로 바꾼다.
- robots.txt : 검색엔진 차단
- manual/ : 본사 스토어 매뉴얼 25장 (홈 '업무 매뉴얼' → 본사 지침). 캐셔·환불 사진은 manual/cashier-01.jpg 식으로 추가
- stock-qty.json : 재고 수량 기준 (다울포스 '상품별 현재고 목록' 엑셀 → {asof, src, items:[{b 바코드, q 수량, pid?(products.json id) 또는 name, c 컬러, s 사이즈}]}). 원가·판매가는 넣지 않음. 새 엑셀을 받으면 이 파일을 다시 만들고 asof를 엑셀 시각으로 → 그 이전 직원 수정은 무시됨. 직원 수정은 서버 '재고 수량' 시트(asof 이후 것만 반영), 수정 기록은 '재고 수정 기록' 시트(90일). 화면: 재고 위치(컬러 칩 누르면 수정, 확인 창), 0 품절 빨강 / 1~3 부족 주황, 품절·부족만 보기, 관리자 '수량 수정 기록' · '현재 재고 엑셀로 받기'(qtExport: 최종 수량만 CSV, 제품명·컬러·사이즈·바코드·수량)
- 영수증 차감 (판매 재고 → '🧾 영수증으로 재고 차감'): 사진 → 서버 OCR(Apps Script Drive API 고급 서비스 필요, 임시 문서 만들고 바로 삭제) → 13자리 바코드·수량 인식(rcParse, 영수증 번호 R… 제외) → 직원 확인 후 qtybatch로 한 번에 차감, 기록 메모 '영수증 R…'. 같은 영수증 번호는 서버 '영수증 차감' 시트로 중복 방지. 수량 음수면 반품(더하기). 바코드 직접 입력도 가능
- products.json + products/ : 홈 '판매 제품' 화면 데이터 ({categories[{id,name}], items[{id,cat,name,colors[],sizes[],images[]}]}). 사진은 products/p01-1.jpg 식. 사이트 관리자 저장은 data.json만 건드리므로 제품은 Claude가 이 파일을 직접 고친다 (APP_VER 갱신 불필요). 원가·출시 전 제품은 넣지 않는다
- products.json items[].info (직원 상품 교육 자료에서 옮김): {code, display 진열 위치, price{list 소비자가, store 매장 정가, p10, p20, max}, types{둥근|벌어진|처진|퍼진|종모양|비대칭|AA·A: 1 또는 0.5(◐)}, feat[], line 같은 라인 하의, note, typenote, sales 세일즈 포인트(매니저가 멘트 주면 채움, 비면 '준비 중')}. 판매 제품 카드 누르면 상세(pdetail). 판매 제품은 상품 안내서 PDF(사진·렉 정보 있던 자료)에 있는 50종 + 카테고리 tmh(TAKE ME HOME 균일가, 교육 자료 10쪽 중 포스 재고(11/24)에 있는 21개: info.tier 15000/9900/5000, price.list, price.max, types_text, d.tmhNote). 파자마·써모터치는 교육 자료(9쪽) 아직 없음
- admin.json : 관리자 열쇠(암호화) — 손대지 말 것
- checklist-server.gs : 저장 서버(Google Apps Script) 원본 — 체크리스트(스크립트 속성, 60일) + 매장 기록(구글 시트 '도로시와 가로수길점 매장 기록' 자동 생성: 유동인구·외국인 고객 탭, 계속 보관). 사장님 구글 계정에 웹앱으로 배포, 주소는 data.json config.checkUrl. 이 파일을 고치면 사장님이 Apps Script에 다시 붙여넣고 '배포 관리 → 새 버전'을 해야 함
- 매장 기록 화면(홈 '매장 기록'): 유동인구(매장 밖·1층 인입·2층 인입, 팀 단위 하루 합계 + 날씨·기온·메모) / 외국인 고객(방문 시간·국적·관심 제품·동선·구매 제품·기타·추가) / 기간 정리(대표님 보고용 텍스트 복사, 구글 시트 열기). 모두 작성·열람 가능. checkUrl 비면 기기별 임시 저장(localStorage dsh_log_t, dsh_log_f)

## data.json 구조
- config: store, hours{open,close}, staff[{name,role}], positions[{name,hue,gray?}], shiftPresets[], absences[], guide(데일리 탭 맨 아래 '조닝 운영 참고'), manuals[{id,title,desc,body?,images[]}](홈 '업무 매뉴얼' 타일 → 목록 → 뷰어. body/images 비면 '준비 중'. 현재: hq 본사 지침, fitting 브라·팬티 응대 가이드(body 서식), influencer 인플루언서 체험단 응대 가이드(본사 PDF 11/26 수정본 → body, 원본 manual/influencer-guide.pdf 링크를 맨 위·마지막 섹션에, 마지막 섹션에 담당자 전화·명단 시트 링크 — 사장님 요청으로 넣음), cashier 캐셔·결제 방법(POS 키 설명 + manual/cashier-01~04.jpg 번호 표시 사진, 원본 사진 위에 번호·색 박스를 그려 만듦), refund 교환·환불(기준 + 교환 처리·차액 결제, manual/refund-01~06.jpg POS 화면에 번호 박스), restock 재입고 문의 응대(대체 상품 추천 멘트 → 연락처 받아 매니저 전달 → 할 일 '입고 연락'). 매뉴얼 빨간 점(11/27): 기기별 localStorage dsh_readManuals에 id@ed 저장, 홈 '업무 매뉴얼' 타일 숫자 + 목록 점, 열면 사라짐. 처음 한 번은 ed 없는 매뉴얼을 읽음 처리 → Claude가 매뉴얼을 새로 넣거나 고치면 그 매뉴얼에 ed(새 값)를 꼭 넣을 것. body에 '## '줄이 있으면 서식 적용: ## 접는 섹션 / @img 경로(본문 중간 사진) / ### 소제목 / "멘트(말풍선) / - 설명 / ✕ 하지 말 것 / ! 빨간 강조 / * 팁 / Q. 질문 / [글자](https://… · tel:010… · manual/파일) 링크), holidays{날짜:이름}, restTypes[], checklist{open|close:[{title:'1층'|'2층', items:[{id,text,note?} 또는 {head:'청소'}(카드 안 작은 제목, 체크 안 됨)]}]} — 1층·2층은 모든 항목을 따로 체크 (id는 영문·숫자·-만, 바꾸면 기존 기록과 연결이 끊김 — 기록에는 항목 이름 t도 함께 저장됨). 관리자: 체크리스트 화면 '체크 기록 보기'에서 날짜별 누가·언제 확인 (서버 60일 보관), checkUrl
- 데일리 배치 경고(warnHtml: 층별 인원·2층 캐셔·미배정·휴게)는 관리자만, 편집 중 + 편집 전('조닝 수정하기' 아래)에도 표시
- 먼슬리 관리자 오른쪽 고정 칸: 근무 / 휴무(restTypes 중 대체휴무 제외: 휴·요청휴무) / 필요(주말 수) / 차이 / 대체(쓴 '대체휴무'(또는 '대휴') 수 / 평일 공휴일 수). 직원 화면은 근무 / 휴무(대체휴무 포함)
- config.monthStaff = {"YYYY-MM": [{name,role}]} : 달마다 직원 명단 (먼슬리·데일리 표는 그 달 명단으로 그림). 없는 달은 config.staff(가장 최근 명단) 사용. 사이트 '직원 관리'는 보고 있는 달 명단만 바꿈(이름 변경은 전체 기록에 반영). 직원을 빼도 months/daily 기록은 지우지 않음
- config.idle = [{id:'idle-…', text}] : 해야 할 일 화면 위 '한가할 때 할 일' (접힘, 매일 리셋, 체크는 체크리스트와 같은 서버 저장 CK_날짜에 함께 들어감, 관리자 체크 기록에도 표시). 모든 체크·해제는 서버가 구글 시트 '체크 기록' 탭에 영구 기록
- todos = [{id, date, title, body}] : 해야 할 일 목록 (화면 정렬: 미완료 먼저 날짜 빠른 순, 완료는 맨 아래. 관리자만 작성 — 사이트에서 '+ 할 일 작성' 또는 Claude가 직접). 각 할 일의 완료 체크(누가·언제)와 직원 댓글은 서버 TD_<id>에 저장(계속 보관). 빨간 점(11/26~): 날짜가 오늘 이하인데 완료 체크 안 된 할 일은 계속 빨간 점(홈 타일 숫자), 완료 체크하면 사라짐. 미래 날짜 할 일은 그날 전까진 점 없음. 그 외 새 댓글·수정(ed)은 본 적 있는 할 일에만 점 (localStorage dsh_todoSeen)
- stock = [{id, pid(products.json id), loc('SG1-03-05' 또는 'SG1-09-02(03)'), size, colors[], qty?}] : 홈 '재고 위치' 화면 (제품별 / 위치별 랙 순서, 검색). 처음 데이터는 상품 안내서 PDF(2026-11-13) 로케이션 159줄. 관리자만 수정(줄 누르기, + 위치 추가, 칸 통째로 이동) → 사이트 저장으로 data.json에 들어감. 판매 제품 카드에 '위치' 줄로도 표시. 수량(qty)은 다울포스 연동(API 확인 중) 후 채울 예정. 물류팀장님이 만든 garosu-store.pages.dev 로케이션 사이트를 대체하는 용도
- config.vmd = {updated, floors:[{id:'1f'|'2f', name, all[전체 사진], zones:[{id, n 번호, name, short 지도 라벨, sub, kind wall|rack|table|deco|fit|cash, x,y,w,h (SVG 340×470, 캐셔에서 바라본 방향: 아래=캐셔, 위=길가 쇼윈도, 왼쪽=유리창·입구, 오른쪽=브라 벽), photo[], desc(- 줄 / ! 강조), check(확인 필요 문구), line[{pid?,name,color,tag?}](걸린 순서, tag 있으면 번호 없이 '맨 위 토르소' 식 표시), dir(기본 '왼쪽부터'), pids[], cats[]}]}] : 홈 'VMD' 매장 지도. 사진은 vmd/1f-01.jpg 식. 구역 누르면 사진·설명·제품(상세로 이동, 뒤로 = 매장 지도). 진열 바뀌면 Claude가 수정. 층마다 hint(지도 위 방향 안내). 2층(11/25 사장님 스케치 기준): ㄱ자 평면(SVG 외곽선 vmMap 2f 분기), 위=창가, 오른쪽=입구, 구역 10개 + 피팅룸·캐셔(번호 없음, DP 제외), 테이블 VP 아래 가로 벽(행거 8번이 붙음), 피팅룸 옆 통로·바구니 2개·마네킹 5번, 제품은 아직 없음, 사진 vmd/2f-*.jpg(영상 캡처 + 월①)
- dp = [{id, fl:'1f'|'2f', zone(config.vmd 구역 id), pid?, name, color, size, qty, tag?}] : 홈 'DP · 로스 관리' → DP 재고 탭 (매장에 걸린 DP 전체, 판매 재고와 별도). 11/25부터 서버 시트 'DP 재고'가 원본(전 직원이 등록·수정·삭제·DP 제외, 바로 저장, 'DP 수정 기록' 탭에 누가·언제). 처음 한 번 data.json dp/dpOut으로 서버에 seed(DP_SEEDED) → 이후 data.json dp/dpOut은 사이트 저장 때 덮이는 사본일 뿐, Claude가 DP를 고칠 때는 dp-pending.json {batches:[{bid(새 고유값), note, ops:[{act:add|edit|del|out|ostat|odel, item?/id?/qty?/status?/date?/from?}]}]} 을 올림(이미 반영된 bid는 그대로 둬도 됨) → DP 화면에 '🤖 Claude가 준비한 변경 n건 · 반영하기' 버튼 → 누르면 서버 act:'batch'로 한 번만 반영(DP_BATCHES에 bid 기록). edit은 item 전체(id 포함)를 보냄. VMD 구역 화면의 '걸린 순서'는 이 목록을 그대로 보여줌(dp 없으면 zone.line). 처음 1층 63줄은 VMD 사진 기준 컬러당 1개·사이즈 미입력 → 매장에서 세서 채움. 2층은 준비 중
- 따로 보관 (DP · 로스 관리 → '따로 보관' 탭): 판매 재고와 별도로 관리하는 보관 재고. 서버 DP 목록에 fl:'keep', zone=구분('대표님 보관'|'증정용'|'가챠 증정'|직접 입력)으로 저장 (서버 변경 없음, DP 합계·VMD엔 안 섞임). 전 직원 추가·수량 수정(−/+)·삭제. 11/26 저녁 정리(bid 'sort-1126'): 대표님 보관·증정용·가챠 증정 전부 삭제(헤리티지 L 브라운·그레이 각 4는 판매 재고로 +4), 구분은 'DP 중복 보관'·'DP 보관'. dp-pending 묶음에 qty:[{b 바코드, d 더할 수}] + qtyMemo를 넣으면 반영 때 판매 재고 수량도 같이 바뀜(영수증 번호 'C-bid'로 한 번만). 제외·반품에 새 기록을 넣을 땐 add(fl:'1f') 후 바로 out(oid, from='불량 · 사유' 또는 'DP 반품 · …') — from은 화면에 '구분·메모'로 표시
- dpOut = [{id, date, pid?, name, color, size, qty, status wait 반품 대기|hold 보류·창고 보관|done 반품 완료, from 빠진 위치, doneDate?}] : DP 제외·반품 탭 (서버 시트 'DP 제외', 전 직원 상태 변경). DP 재고 줄 → 'DP 제외' 로 이동. 반품 대기 목록 텍스트 복사·엑셀
- 도난·불량 : 서버 시트 '도난·불량' 탭(checklist-server.gs kind:'loss' add/ok/unok/del, GET ?loss=1). 전 직원 신고(날짜·도난/불량·DP/판매·제품·컬러·사이즈·수량·메모), 관리자 최종 확인(확인 시 DP 상품이면 DP 재고에서 빼기 제안), 관리자 '처리 메모'(act:'note', 시트 O열, 카드·보고·엑셀에 표시), 본사 보고(기간 요약 텍스트·엑셀). 홈 타일 빨간 숫자 = 확인 대기(관리자만)
- consults = [{id, date, time, who, people?, memo, kind(consult 컨설팅|visit 체험단 매장 방문형|infc 체험단 컨설팅형|interview 면접(사장님 요청으로 이름 전체)|etc), plat(포포몬|브랜더진|샤오홍슈), gift 증정품}] : 홈 '방문 예약' (관리자만 작성, 직원은 보기만. 위에 체험단 명단 시트(config.visitSheet)·응대 가이드 버튼, 체험단 카드엔 가이드 링크). 오늘 예약은 홈 요약 카드와 타일 빨간 숫자로 표시, 지난 예약은 접어 둠. 고객은 '성 + 님' 정도만 (공개 저장소)
- 체험단 명단 자동 연동(11/26): 서버 GET ?visits=<시트ID>(config.visitSheet에서 ID 추출)로 본사 공유 시트 첫 탭을 읽음('방문 일자' 헤더 줄 기준, 전화번호·가슴성형 여부·링크는 서버가 안 보냄, 5분 캐시). 방문 예약 목록 = data.json consults + 시트 일정(같은 날짜·시간이면 data.json 쪽만 표시, 시트 일정엔 '명단 시트' 표시·수정 불가). 진행 방식에 '컨설팅'이 있으면 kind consult. 데일리 표시 때 csOverlay: 컨설팅 예약 시작 시간 칸에 config.consultBy(기본 안희진) '컨설팅' 자동 표시(이미 컨설팅·미팅이면 그대로, 관리자가 편집 시작하면 그 값으로 저장됨)
- months["YYYY-MM"][직원이름][날짜] = "11~20" | "11~20!"(끝에 ! = 필수 출근, 진한 색 칩, shiftPresets에 있음) | "휴" | "요청휴무" | "연차" ...
- daily["YYYY-MM-DD"] = { published: true, assign: { 직원이름: [open시부터 1시간 단위 포지션, 근무 외는 null] } }
- notices = [{ id, title, body, pinned, date: "YYYY-MM-DD", images?: ["manual/01.jpg", ...] }] (images = 자료 보기 뷰어로 보여줄 사진, 저장소에 파일로 올림)
- 공지 읽음 표시는 각 기기 localStorage(dsh_readNotices)에 공지 id(수정된 공지는 id@ed)로 저장 → 새 공지는 새 id로 만들어야 빨간 점이 뜸. 공지·할 일을 수정하면 ed(수정 표시, 아무 새 값)를 바꿔야 다시 빨간 점 + '수정됨' (사이트 수정은 자동, Claude가 내용 고칠 때도 ed를 새 값으로)

## 속도 (11/25)
- 서버 저장은 화면 먼저 반영(낙관적 업데이트) 후 뒤에서 전송: DP(dpPost local, 서버 lite 응답), 재고 수량 수정, 영수증 차감(qtybatch는 서버에서 한 번 읽고 한 번 쓰기), 도난·불량 신고. 실패하면 되돌리고 알림. 재고 수정 기록 90일 정리는 하루 1번(QTY_CLEAN). 영수증 사진은 1500px 흑백으로 줄여서 OCR

## 화면 업데이트
- index.html을 고치면 index.html의 APP_VER와 data.json의 appVersion을 같은 새 값으로 올린다 → 직원 폰이 옛 화면(캐시)을 쓰고 있으면 자동으로 새로 불러옴.

## 비밀번호
- index.html 의 PASS_HASH = SHA-256(매장 공용 비밀번호). 화면 잠금일 뿐 진짜 보안은 아님 (저장소가 공개).
- 원가·출시 전 제품 등 민감 정보는 올리지 않는다.

## 관리자 모드 (사이트 안에서 직접 수정)
- 관리자는 안희진 매니저(사장님). 설정 탭 → 관리자 로그인(관리자 비밀번호). 로그아웃 누르기 전까지 그 기기에서 유지(만료 없음). 관리자 로그아웃은 앱(매장 공용 비밀번호) 로그인에 영향 없음.
- 원리: 처음 설정 때 GitHub fine-grained 토큰(이 저장소 Contents: Read and write)을 관리자 비밀번호로 AES-GCM 암호화(PBKDF2 600k)해 admin.json에 저장. 로그인 = admin.json 복호화 → 토큰을 그 기기 localStorage에 보관.
- 관리자 모드에서 표 칸 수정 → 하단 '저장' 누르면 GitHub API로 data.json 커밋("사이트에서 수정 (날짜)"). 직원 화면은 Pages 반영 후 1~2분.
- 사이트 저장은 3방향 합치기(11/27, m3): 불러온 때(S.base) 이후 관리자가 바꾼 부분만 최신 data.json에 얹음 → 그 사이 Claude가 넣은 할 일·예약 등이 지워지지 않음 (id 있는 목록은 id별, 객체는 키별, 같은 곳을 둘 다 바꾸면 관리자 쪽 우선)
- admin.json은 지우거나 손대지 말 것. 토큰이 만료되면 사이트의 "처음 설정 다시 하기"로 재등록.
- Claude가 data.json을 고치기 전에는 항상 git pull로 최신을 받을 것 (사장님이 사이트에서 저장했을 수 있음).
