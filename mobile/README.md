# 시선사이 모바일 v1.5 (검토용 최종본)

만 3~6세 아이와 부모님이 **휴대폰 한 대**로 하는 「시선사이 — 같은 방, 다른 시선」 모바일판입니다.
태블릿판(`final/`, `app/`)과 원본 파일은 **건드리지 않았고**, 이 `mobile/` 폴더에만 따로 있습니다.

- 설문 버전: `siseon-mobile-v1.4-20261119`
- 검토 링크(Claude 아티팩트): https://claude.ai/artifact/Ajtrv4dwf2nC3DSggKVCpa (비공개, 소유자만 열람)
- v1.5 변경: 표지·장 안내 문구, 16종 친구 크기 맞춤, 말풍선 토끼 움직임, 안내 4단계 묶음, 첫 화면·부모님 차례·결과지·사진 놀이 손가락 안내, 결과지 보는 순서 1~5
- 재녹음·새 음성 5줄 요청문: `voice-script/RERECORD-v1.5.md`
- v1.5 추가: 결과지 맨 위 ‘같은 방, 다른 시선’ 비교, 장에 맞는 칭찬, 성격 표시 기울기 제거, 알 준비 중 안내 음성 자리(egg-loading)

## 흐름

첫 화면(움직이는 표지 + 토끼 소개 음성) → 부모님 안내 → **아이의 책** 표지 → 아이 5장 → 아이 알 생김
→ **부모님의 책** 표지 → 부모님 5장 → 아이가 알 두 개 깨기 → 두 친구 만남 → 정리 친구 시범 → 가족 결과지 → (선택) 우리 집 사진 놀이

## 파일

| 경로 | 내용 |
|---|---|
| `src/index.src.html`, `src/app.js`, `src/app.css` | 모바일 화면 원본 (여기를 고칩니다) |
| `room-motion.*`, `room-hotspots.js`, `mission-motion.*`, `speech-input.js` | 태블릿 원본 엔진을 **그대로 복사** (수정 금지) |
| `egg/` | 원본 알깨기 16종 (그대로 복사) |
| `assets/` | 그림·움직이는 표지·글꼴·음성 (`assets/voice/*.mp3`) |
| `build.py` | 위 파일을 한 장짜리 `index.html`과 로컬 확인용 `preview.html`로 묶습니다 |
| `voice-script/` | 전체 음성 대본과 ChatGPT 음성 생성 요청문 |

## 빌드와 확인

```bash
cd mobile
python3 build.py              # index.html, preview.html 생성 (ffprobe가 있으면 소개 음성 길이도 읽음)
python3 -m http.server 8765   # 브라우저에서 http://localhost:8765/preview.html
```

## 음성 넣는 법

1. `voice-script/mobile-voice-v1-lines.json`의 76줄을 **같은 저장 동화 화자**로 만들고, 파일 이름을 `id.mp3`로 합니다.
2. `assets/voice/`에 넣습니다. 같은 이름의 기존 파일은 새 파일로 바뀝니다.
3. `python3 build.py`를 다시 실행합니다. 앱은 `assets/voice/`에 실제로 있는 파일만 재생하므로, 아직 없는 대사는 조용히 건너뜁니다.
4. 첫 화면·안내 화면 소개(`cover`, `parent-cover`)는 길이가 바뀌면 자막을 글자 수 비율로 자동으로 다시 나눕니다.

자세한 요청문: `voice-script/CHATGPT-VOICE-PROMPT.md`

## 지켜야 할 것

- 태블릿 화면, 원본 파일, 현장·모바일 조사 기록과 결과는 수정하거나 삭제하지 않습니다.
- 다른 사람이 작업한 결과를 덮어쓰지 않습니다. 이 작업은 `mobile-v1` 브랜치의 `mobile/` 폴더에만 있습니다.
- 유료 크레딧 사용, 공개 배포, 외부 제출, 파일 삭제는 실행 전에 소유자 승인을 받습니다.
- 공통 그림 문항(첫눈에 보인 것, 보기, F/P·B/D·V/H·M/S 축)은 바꾸지 않습니다. 개인 사진 놀이는 공통 그림 설문과 분리되어 있고 사진은 휴대폰 밖으로 나가지 않습니다.
- 검증은 자동 브라우저 검사와 실제 기기 검사를 구분해서 보고합니다.
