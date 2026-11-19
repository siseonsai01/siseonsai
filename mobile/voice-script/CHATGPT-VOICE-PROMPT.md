# ChatGPT에 붙여 넣을 요청문 — 시선사이 모바일 음성 최종본

아래 상자 안의 내용을 **팀 Google 계정이 연결된 ChatGPT 작업 환경**(예전 v13 동화 음성을 만든 곳)에 그대로 붙여 넣으세요.

```
GitHub 저장소 siseonsai01/siseonsai 의 mobile-v1 브랜치에 있는 mobile/ 폴더가 시선사이 모바일판 최종 화면이야.
https://github.com/siseonsai01/siseonsai/tree/mobile-v1/mobile
먼저 mobile/README.md 와 mobile/voice-script/mobile-voice-v1-lines.json 을 읽어 줘.

할 일: lines.json 의 76줄을 한 줄씩 각각 mp3로 만들어서, 음성까지 들어간 모바일 최종본을 완성해 줘.

[목소리 — 가장 중요]
- 시선사이 v13 동화책 음성에 쓴 것과 같은 저장 동화 화자·같은 설정(프로젝트 대본에 지정된 Gemini TTS Leda와 같은 스타일 문구)을 그대로 써. 줄마다 목소리를 새로 고르거나 다른 목소리로 바꾸지 마.
- 그 화자를 쓸 수 없거나 유료 크레딧·추가 결제가 필요하면, 만들기 전에 멈추고 이유만 알려 줘. 다른 목소리로 대신 만들지 마.
- 음높이·속도·음색·음량을 보정해서 흉내 내지 마. 따뜻하고 활기찬 동화 연기, 만 3~6세가 알아듣게 또박또박.
- 아이에게 하는 말(반말)은 다정하고 밝게, 부모님께 하는 말(존댓말: parent-cover, book-adult)은 차분하게.
- 칭찬(praise-child-*)은 정답을 맞힌 느낌이 아니라 '골라 줘서 반가워' 느낌으로.
- 친구 대사(friend-*)는 같은 목소리로, 친구 이름은 또렷하게, 의성어는 살짝 재미있게.
- motion-* 는 각 3~5초 안.
- 무료 하루 한도에 걸리면 그때까지 만든 것을 저장하고, 남은 id 목록을 알려 줘. 부분만 만든 것을 '완료'라고 하지 마.

[파일]
- 파일 이름 = id.mp3 (예: story-0.mp3). lines.json 의 text 만 읽고 앞뒤에 아무것도 붙이지 마.
- 앞뒤 무음 0.2초 이하, 모노 mp3 128kbps 이상.
- 만든 파일을 mobile/assets/voice/ 에 넣어 같은 이름의 기존 파일을 바꿔. 그 밖의 파일은 지우지 마.
- mobile/voice-script/manifest.json 도 만들어: [{"id","file","text","seconds"}] lines.json 순서대로.
- 그다음 mobile 폴더에서 python3 build.py 를 실행해 index.html 과 preview.html 을 다시 만들어.

[검사]
- 76개가 모두 있는지, 각 파일을 다시 받아쓰기 해서 문장이 lines.json 과 한 글자도 다르지 않은지 확인하고 결과를 표로 보여 줘.
- preview.html 을 열어 첫 화면 → 아이 1장까지 음성이 순서대로 나오는지 확인해 줘. 자동 검사와 실제 귀로 들은 검사는 구분해서 말해 줘.

[지켜야 할 것]
- mobile/ 폴더 밖(태블릿판 final/, app/ 등 원본)은 절대 수정하거나 지우지 마.
- main 브랜치에 바로 올리지 말고 mobile-v1 브랜치에만 커밋해. 공개 배포나 외부 제출은 하지 마.
- 끝나면 바뀐 파일 목록과 커밋 주소, 그리고 mobile-voice-v1.zip(mp3 76개 + manifest.json) 다운로드 링크를 줘.
```
