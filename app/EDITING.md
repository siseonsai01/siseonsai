# 시선사이 앱 편집 안내

`app/index.html`은 **완성본**입니다. 이미지·음성·영상이 전부 글자(base64)로 들어 있어 15MB나 되기 때문에, 사람이든 AI든 직접 열어 고치기 어렵습니다.
**화면을 고칠 때는 `app/src/` 안의 파일만 고치고, 완성본은 빌드로 다시 만듭니다.**

## 폴더 구성

| 파일 | 내용 | 크기 |
|---|---|---|
| `app/src/index.html` | 페이지 뼈대 (head, 폰트, `styles.css`·`app.js` 연결) | 약 2KB |
| `app/src/styles.css` | 모든 디자인(CSS) | 약 57KB |
| `app/src/app.js` | 모든 화면과 동작(JavaScript) | 약 124KB |
| `app/src/assets/` | 그림(.webp), 나레이션(.mp3), 오프닝 영상(.mp4) 133개 | 약 12MB |
| `app/build.py` | `src/`를 합쳐 `app/index.html` 한 파일로 만드는 스크립트 | |

## 고치는 순서

1. `app/src/styles.css` 또는 `app/src/app.js`를 고칩니다. (`app/index.html`은 직접 고치지 않습니다.)
2. 확인: `app/src/index.html`을 브라우저로 바로 열면 고친 화면이 그대로 보입니다.
   - 결과 이미지 저장·인쇄처럼 캔버스를 쓰는 기능은 파일을 바로 열면 브라우저 보안 때문에 막힐 수 있습니다. 그때는 `python -m http.server`를 `app/src`에서 실행하고 `http://localhost:8000`으로 여세요. 완성본에서는 문제없습니다.
3. 완성본 만들기: 저장소 맨 위 폴더에서 `python app/build.py` → `app/index.html`이 새로 만들어집니다.
   - GitHub에 `app/src/` 변경을 올리면 GitHub Actions가 자동으로 빌드해서 `app/index.html`을 갱신합니다 (`.github/workflows/build-app.yml`).

## 그림·소리 바꾸기

- 같은 이름의 파일로 `app/src/assets/`의 파일을 덮어쓰면 됩니다. (예: 표지 그림 `cover-art.webp`)
- 새 파일을 추가할 때는 `assets/`에 넣고, 코드에서 `"assets/새파일이름.webp"`처럼 부르면 빌드할 때 자동으로 한 파일 안에 들어갑니다.
- 파일 이름은 영문·숫자·`-`·`_`만 쓰고, 확장자는 webp, png, jpg, svg, gif, mp3, mp4 중 하나여야 합니다.

## 어디를 고치면 되나 (app.js)

함수 이름으로 검색하세요.

| 화면·기능 | 찾을 이름 |
|---|---|
| 첫 화면(표지) 문구·버튼 | `function hero()` |
| 첫 화면 전체 구성 | `function home()` |
| 나레이션 재생·정지 | `function narrate(`, `function stopNarration(` |
| 나레이션 음성 목록 | `const offlineVoice` |
| 첫 화면 오프닝 모션(토끼 이야기 듣기) | `function startCoverMotion(`, `COVER_MOTION_LEAD` |
| 오프닝 자막 문장·시간 | `const coverCaptions` (나레이션 기준 초) |
| 표지 그림 드래그·움직임 | `function queueCoverMotion(`, `function wireSceneMotion(` |
| 놀이 방법 연습(폭죽 장면) | `function openPractice(`, `function startFinale(` |
| 질문 문항·보기 | `const reviewQuestions`, `function reviewQuiz(` |
| 결과 화면 | `function report(` |
| 화면 전환 | `const screens`, `function show(` |

## 어디를 고치면 되나 (styles.css)

- 첫 화면 레이아웃: `.hero-stage`, `.hero-inner`, `.hero-copy`, `.cover-art`
- 오프닝 모션 영상(그림 자리에서만 재생): `.cover-motion-video`
- 오프닝 자막(제목 아래 설명 글 자리): `.hero-text.is-caption`, `.caption-in`
- 같은 선택자가 여러 번 나옵니다. **파일 아래쪽에 있는 규칙이 이깁니다.** 표지 디자인은 `/* The same sunlit playroom, from cover to family record. */` 주석 아래가 현재 적용 중인 부분입니다.
- 휴대폰 화면은 `@media (max-width: 680px)` 안에 있습니다.

## 지켜 주세요

- `styles.css`와 `app.js`는 `<style>`, `<script>` 태그 없이 내용만 들어 있습니다. 태그를 추가하지 마세요.
- `app/src/index.html`의 `<link rel="stylesheet" href="styles.css" data-inline>`와 `<script src="app.js" data-inline></script>` 두 줄은 빌드가 찾는 표시이니 그대로 두세요.
- 움직임을 넣을 때는 `motionAllowed()`로 '동작 줄이기' 설정을 확인하는 기존 방식을 따르세요.
