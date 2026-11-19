# 모바일 한 대 설문을 운영 사이트에 붙이기 (배포 안내)

운영 사이트 `https://siseonsai-family-book.buoyantfig.chatgpt.site`에 모바일판을 `/mobile/`로 올리고, 답을 같은 설문 서버에 모읍니다.
**태블릿 현장·가족 기록, 고정 태블릿 주소, 진행자 주소는 바꾸지 않습니다.** 모바일 답은 새 표 `mobile_records`에만 들어갑니다.

## 바뀐 파일

| 파일 | 내용 |
| --- | --- |
| `final/drizzle/0002_mobile_records.sql` (+ `meta/_journal.json`) | 새 표 `mobile_records(id, data, created)`. 기존 표는 그대로 |
| `final/worker/index.js` | `/mobile/` 화면 제공, `POST/GET /api/mobile-records`, `/manage-mobile/<진행자 키>` 바로가기. 기존 경로·함수는 그대로 |
| `final/build_cloud.py` | `mobile/preview.html`·`collect.html`·`assets/`·`egg/`를 `dist/client/mobile/`에 함께 실음 |
| `final/tests/mobile-records.mjs` | 서버 검사 35개 |
| `mobile/src/app.js` → `mobile/preview.html` | `/mobile/`에서 열리면 결과지 화면에서 답을 서버로 보냄(실패 시 다시 보내기, 같은 기록 번호로 한 번만 저장) |
| `mobile/collect.html` | 진행자용 ‘모인 답’ 화면과 엑셀용 CSV 내려받기 |

## 배포 순서

1. `cd mobile && python3 build.py` (모바일 화면을 바꿨다면)
2. `cd final && node tests/backend.mjs && node tests/mobile-records.mjs`
3. 데이터베이스에 `0002_mobile_records.sql`을 적용합니다. 요청 처리 중에는 표를 만들지 않으므로 **배포 전에 꼭 적용**해야 합니다.
4. `python3 build_cloud.py` → `dist/` 배포
5. 확인
   - `/mobile/` 열기 → 끝까지 진행 → 결과지에 “우리 가족 답을 잘 보냈어요.”
   - 시험 기록은 주소 끝에 `#test`를 붙여 `/mobile/#test`로 엽니다. 시험 기록으로 표시되고, CSV에서는 기본으로 빠집니다.
   - 진행자: `/manage-mobile/<기존 진행자 키 64자리>` → 모인 가족 수, CSV 내려받기

## 보내는 자료

- 아이·부모님 각자의 5장 선택(A/B/1장 ‘다른 곳’), 보기 문구, 남긴 말(180자까지), 1장 위치·장난감, 유형 코드·정리 친구 이름, 시작·마침 시각, 시험 여부
- 이름·연락처·사진·녹음은 보내지 않습니다. 결과지 사진은 그 휴대폰에만 남습니다.
- 자동 삭제는 없습니다(태블릿 가족 기록과 같은 방침).

## 보호 장치

- 같은 사이트에서 보낸 요청만 받습니다(다른 사이트 origin 거절).
- 한 주소에서 1분에 20번까지(기존 `attempts` 제한 재사용). 요청 크기 40KB 이하.
- 형식이 맞지 않거나 두 사람 답을 다 마치지 않은 기록은 거절합니다.
- 목록 조회는 기존 진행자 전용 키(현장의 operatorHash)로만 됩니다. 참가자 주소로는 볼 수 없습니다.

## 아직 정하지 않은 것

- 설문 참여 동의 안내 문구와 위치
- 도메인(co.kr) 연결 여부: 연결해도 `/mobile/` 경로와 자료는 그대로입니다.
