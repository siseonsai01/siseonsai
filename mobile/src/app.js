/* 시선사이 모바일 v1 — 폰 한 대: 아이 5장 → 부모님 5장 → 아이가 알 두 개 깨기 → 가족 결과지
   원본: siseonsai01/siseonsai final/app/src (release 20261114-21). 원본 파일은 바꾸지 않고 복사만 했어요. */
(() => {
'use strict';
const SURVEY_VERSION = 'siseon-mobile-v1.4-20261119';
const SOURCE_RELEASE = '20261114-21';
const STIMULUS = 'shared-room-messy-depth-v1(1·2·3·5장) · book-cover-full-room(4장) · reviewChoiceArt(v13) · 장별 확대·빛 v3';
const STORE_KEY = 'siseon-mobile-v1-state';
const SOUND_KEY = 'siseon-mobile-v1-sound';
const TEST = location.hash === '#test';

/* ---------- 원본 기준 데이터 (app.js 그대로) ---------- */
const characters = {
  PVSD: "각각각 다람쥐", PVSB: "갤러리 고양이", PVMD: "작품왕 강아지", PVMB: "추억전시 펭귄",
  PHSD: "칼각 박스 비버", PHSB: "비밀창고 햄스터", PHMD: "비밀일기 사슴", PHMB: "추억보물상자 아기곰",
  FVSD: "자유로운 사막여우", FVSB: "번개출동 표범", FVMD: "감성아티스트 수달", FVMB: "벼락치기 몽상가 토끼",
  FHSD: "순간포착 고슴도치", FHSB: "블랙홀 판다", FHMD: "마음부자 쿼카", FHMB: "우주대청장 아기물개",
};
const typeDescriptions = {
  PVSD: "물건마다 둘 곳을 미리 정해요. 자주 쓰는 물건은 찾기 쉽게 선반에 나란히 놓고, 다 쓰면 바로 그 자리에 돌려놔요.",
  PVSB: "정리할 날을 정해 두고, 그날 물건을 모아 한꺼번에 정리해요. 자주 쓰는 물건은 꺼내기 쉽게 보이는 곳에 가지런히 놓아요.",
  PVMD: "내 그림과 작품을 놓을 자리를 미리 골라요. 소중한 작품을 꺼내 본 뒤에는 바로 잘 보이는 그 자리에 돌려놔요.",
  PVMB: "정리할 날을 미리 정해요. 그날이 오면 기억하고 싶은 물건을 모아, 작은 전시처럼 보이는 곳에 놓아요.",
  PHSD: "같이 쓰는 물건끼리 넣을 서랍을 미리 정해요. 다 쓴 물건은 잊기 전에 바로 제 서랍에 넣어요.",
  PHSB: "정리할 날과 물건을 담을 상자를 미리 정해요. 그날이 되면 쓰임이 비슷한 물건끼리 모아 한꺼번에 상자에 담아요.",
  PHMD: "좋았던 일이 생각나는 물건을 넣을 보물함을 미리 정해요. 꺼내 본 뒤에는 바로 보물함에 넣어 둬요.",
  PHMB: "편지나 소중한 장난감을 모아 뒀다가, 정해 둔 날에 한꺼번에 추억 상자에 담아요. 꺼내 보면 편지를 받았던 날이 생각나요.",
  FVSD: "물건을 쓰다가 손이 닿기 좋은 자리를 그때그때 찾아요. 다 쓰면 다음에 찾기 쉽게, 보이는 곳에 바로 올려 둬요.",
  FVSB: "정리하고 싶은 때에 물건을 한꺼번에 모아요. 그때 쓰기 편한 자리를 골라, 자주 쓰는 것부터 보이는 곳에 놓아요.",
  FVMD: "좋았던 일이 생각나는 인형이나 그림을 가까이 두어요. 꺼낸 뒤에는 지금 마음에 드는 곳을 골라 바로 잘 보이게 놓아요.",
  FVMB: "다 놀고 나서 정리할 마음이 들면 물건을 한꺼번에 모아요. 그날 마음이 가는 인형이나 작품을 잘 보이는 곳에 놓아요.",
  FHSD: "물건을 다 쓰면 그때 빈 바구니나 서랍을 찾아 바로 넣어요. 다음에 다시 꺼내기 쉬운 곳이면 좋아요.",
  FHSB: "놀이를 다 마치고 정리할 마음이 들면 물건을 한 번에 모아요. 그때 편하게 꺼낼 수 있는 서랍이나 상자에 담아요.",
  FHMD: "좋은 기억이 담긴 물건을 꺼냈다가 다 쓰면 바로 챙겨요. 그때그때 마음에 드는 상자나 서랍을 찾아 쏙 넣어요.",
  FHMB: "정리할 마음이 들면 소중한 물건을 한 번에 모아요. 하나씩 보며 좋았던 일을 떠올리고, 그때 고른 상자에 넣어요.",
};
const codeNames = {F:'놀이의 가능성',P:'물건의 자리',V:'넓은 바닥',H:'책상·작은 자리',M:'놀이할 공간',S:'물건 둘 공간',B:'그 자리에서 이어 놀기',D:'다른 자리로 옮겨 두기'};
const eggFiles = {FHSD:"01_FHSD.html",FHSB:"02_FHSB.html",FHMD:"03_FHMD.html",FHMB:"04_FHMB.html",PVSD:"05_PVSD.html",PVSB:"06_PVSB.html",PVMD:"07_PVMD.html",PVMB:"08_PVMB.html",PHSD:"09_PHSD.html",PHSB:"10_PHSB.html",PHMD:"11_PHMD.html",PHMB:"12_PHMB.html",FVSD:"13_FVSD.html",FVSB:"14_FVSB.html",FVMD:"15_FVMD.html",FVMB:"16_FVMB.html"};
const choiceArt = [["reviewChoiceArt.webp","reviewChoiceArt-2.webp"],["reviewChoiceArt-3.webp","reviewChoiceArt-4.webp"],["reviewChoiceArt-5.webp","reviewChoiceArt-6.webp"],["reviewChoiceArt-7.webp","reviewChoiceArt-8.webp"],["reviewChoiceArt-9.webp","reviewChoiceArt-10.webp"]];

/* 아이 문항·보기는 원본 그대로. 부모 문항은 같은 상황·같은 보기 뜻·같은 판정 축을 지키며 부모님 자신의 생각을 묻도록 바꿨어요.
   scene: 공통 방 그림 한 장을 이야기 장면에 맞춰 비추는 위치(두 사람이 같은 문항에서 같은 장면). */
const Q = [
  { title: "먼저 보인 것", story: ["방을 함께 바라봐요", "두 토끼가 방을 가만히 바라봤어요. 우리 친구도 함께 볼까요?", "두 토끼가 방을 가만히 바라봤어요."],
    child: "이 방을 보니까 뭐가 제일 먼저 보여?",
    adult: "이 방을 보셨을 때, 부모님 눈에 가장 먼저 들어오는 것은 무엇인가요?",
    childOptions: ["바닥에 놓인 물건들", "책상이나 선반 위의 물건들"],
    adultOptions: ["바닥에 놓인 물건들이 먼저 보여요", "책상·선반 위 물건들이 먼저 보여요"],
    scene: { s: 1, x: 50, y: 50, cap: "그림 속 장난감을 콕 눌러도 돼요" } },
  { title: "장난감 생각", slot: 0, codes: ["F", "P"], story: ["장난감을 보며 생각해요", "두 토끼가 장난감을 보며 생각에 잠겼어요."],
    child: "바닥에 있는 장난감을 보니까 어떤 생각이 먼저 나?",
    adult: "바닥에 놓인 장난감을 보면, 부모님은 어떤 생각이 먼저 드세요?",
    childOptions: ["이걸로 무엇을 할 수 있을까?", "이건 원래 어디에 있었을까?"],
    adultOptions: ["이걸로 어떤 놀이를 할 수 있을지", "이 물건이 원래 어디에 있었는지"],
    scene: { s: 1.7, x: 62, y: 70, cap: "바닥의 장난감", bubble: "장난감이 바닥에 잔뜩!" } },
  { title: "만들던 놀이", slot: 3, codes: ["B", "D"], story: ["만들던 놀이를 만났어요", "방에는 만들던 놀이도 남아 있었어요."],
    child: "누가 만들던 게 바닥에 남아 있으면 어떻게 하고 싶어?",
    adult: "누군가 만들던 놀이가 바닥에 그대로 있어요. 부모님이라면 어떻게 하고 싶으세요?",
    childOptions: ["그 자리에 두고 계속 놀기", "다른 곳으로 옮겨 두기"],
    adultOptions: ["그 자리에 두고 이어서 놀게 해요", "다른 곳으로 옮겨 둬요"],
    scene: { s: 1.95, x: 27, y: 66, cap: "만들던 놀이", bubble: "누가 만들던 걸까?" } },
  { title: "놀고 싶은 곳", slot: 1, codes: ["V", "H"], story: ["새 놀이를 시작해요", "이번에는 두 토끼와 새 놀이를 시작해 볼까요?"],
    child: "이 방에서 새로 놀 거면 어디서 놀고 싶어?",
    adult: "이 방에서 새 놀이를 시작한다면, 부모님은 어느 자리를 고르시겠어요?",
    childOptions: ["바닥의 넓은 자리", "책상이나 작은 자리"],
    adultOptions: ["바닥의 넓은 자리", "책상이나 작은 자리"],
    scene: { s: 1.06, x: 50, y: 60, cap: "깨끗한 방", bubble: "어디서 놀아 볼까?", img: 'tidy-room.webp', alt: '장난감이 정리된 토끼들의 방 그림' } },
  { title: "바꾸고 싶은 것", slot: 2, codes: ["M", "S"], story: ["더 즐거운 방을 만들어요", "두 토끼는 이 방에서 더 즐겁게 놀고 싶었어요."],
    child: "이 방에서 딱 하나 바꿀 수 있으면 뭘 바꾸고 싶어?",
    adult: "이 방에서 딱 한 가지만 바꿀 수 있다면, 부모님은 무엇을 바꾸고 싶으세요?",
    childOptions: ["놀이할 자리를 더 만들기", "물건을 놓을 자리를 더 만들기"],
    adultOptions: ["놀이할 자리를 더 만들고 싶어요", "물건 둘 자리를 더 만들고 싶어요"],
    scene: { s: 1.08, x: 55, y: 42, cap: "방 전체", bubble: "뭘 바꾸면 좋을까?" } },
];
const axes = [
  { pair: "F/P", q: 1, title: "장난감 생각 · 2장", F: "이걸로 무엇을 할 수 있을까?", P: "이건 원래 어디에 있었을까?" },
  { pair: "V/H", q: 3, title: "놀고 싶은 곳 · 4장", V: "바닥의 넓은 자리", H: "책상이나 작은 자리" },
  { pair: "M/S", q: 4, title: "바꾸고 싶은 것 · 5장", M: "놀이할 자리를 더 만들기", S: "물건을 놓을 자리를 더 만들기" },
  { pair: "B/D", q: 2, title: "만들던 놀이 · 3장", B: "그 자리에 두고 계속 놀기", D: "다른 곳으로 옮겨 두기" },
];
const roleName = { child: "아이", adult: "부모님" };

/* ---------- 상태 ---------- */
const blankAnswers = () => Q.map(() => ({ choice: null, reason: "", point: null, toy: "" }));
const fresh = () => ({ v: 1, screen: 'home', role: 'child', index: 0, answers: { child: blankAnswers(), adult: blankAnswers() }, eggs: { child: false, adult: false }, eggStage: 'child', startedAt: null, savedId: null, finishedAt: null, test: TEST });
let S = load() || fresh();
if (TEST) S.test = true;
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (!raw) return null; const s = JSON.parse(raw); return s && s.v === 1 ? s : null; } catch { return null; }
}
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch {} }
let soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch {}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const done = (role) => S.answers[role].every((a) => a.choice);
function code(role) {
  const slots = [null, null, null, null];
  Q.forEach((q, i) => { if (q.codes) { const a = S.answers[role][i].choice; slots[q.slot] = a === 'A' ? q.codes[0] : a === 'B' ? q.codes[1] : null; } });
  const c = slots.join('');
  return characters[c] ? c : null;
}
function optionLabel(role, i, choice) {
  const q = Q[i], a = S.answers[role][i];
  if (choice === 'A' || choice === 'B') return q[role + 'Options'][choice === 'A' ? 0 : 1];
  if (choice === 'other') return '다른 곳이 먼저 보여요' + (a.toy ? ` · ${a.toy}` : '');
  return '고르지 않았어요';
}
function meaningLabel(i, choice) {
  const q = Q[i];
  return choice === 'A' ? q.childOptions[0] : choice === 'B' ? q.childOptions[1] : null;
}

/* 받침에 따라 조사를 붙여요 (와/과, 가/이) */
function josa(word, noFinal, withFinal) {
  const ch = word.charCodeAt(word.length - 1);
  const has = ch >= 0xAC00 && ch <= 0xD7A3 && (ch - 0xAC00) % 28 !== 0;
  return word + (has ? withFinal : noFinal);
}

/* ---------- 아이콘 ---------- */
const I = {
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  paw: '<svg class="paw" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="10" ry="8.5" fill="#FFF6EC"/><ellipse cx="20" cy="28" rx="6.2" ry="5" fill="#F4C7B5"/><ellipse cx="9.5" cy="16" rx="4" ry="5" fill="#FFF6EC"/><ellipse cx="16.5" cy="10.5" rx="4" ry="5.2" fill="#FFF6EC"/><ellipse cx="24.5" cy="10.5" rx="4" ry="5.2" fill="#FFF6EC"/><ellipse cx="31" cy="16" rx="4" ry="5" fill="#FFF6EC"/><ellipse cx="16.5" cy="11.5" rx="2" ry="2.4" fill="#F4C7B5"/><ellipse cx="24.5" cy="11.5" rx="2" ry="2.4" fill="#F4C7B5"/></svg>',
  pawDark: '<svg class="paw" viewBox="0 0 40 40" aria-hidden="true"><ellipse cx="20" cy="27" rx="10" ry="8.5" fill="#9A6B43"/><ellipse cx="9.5" cy="16" rx="4" ry="5" fill="#9A6B43"/><ellipse cx="16.5" cy="10.5" rx="4" ry="5.2" fill="#9A6B43"/><ellipse cx="24.5" cy="10.5" rx="4" ry="5.2" fill="#9A6B43"/><ellipse cx="31" cy="16" rx="4" ry="5" fill="#9A6B43"/></svg>',
  pawArrow: '<svg class="paw" viewBox="0 0 44 44" aria-hidden="true"><ellipse cx="22" cy="28.5" rx="11.5" ry="10" fill="#9A6B43"/><ellipse cx="9.5" cy="16.5" rx="4.4" ry="5.6" fill="#9A6B43"/><ellipse cx="17.5" cy="10" rx="4.4" ry="5.8" fill="#9A6B43"/><ellipse cx="26.5" cy="10" rx="4.4" ry="5.8" fill="#9A6B43"/><ellipse cx="34.5" cy="16.5" rx="4.4" ry="5.6" fill="#9A6B43"/><path d="M15.5 28.5h12.5M23.5 23.8l4.8 4.7-4.8 4.7" fill="none" stroke="#FFF6EC" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  heart: '<svg class="heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.1 3.1 4 7 4c2.1 0 3.6 1.1 5 2.8C13.4 5.1 14.9 4 17 4c3.9 0 6.2 4.1 4.6 7.8C19.5 16.4 12 21 12 21z"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8"/></svg>',
};

const pawBadge = () => `<span class="paw-badge">${I.pawArrow}<i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i></span>`;

/* ---------- 학습지식 칭찬: 같은 말이 연달아 나오지 않게 골라요 ---------- */
const praise = {
  child: { says: ["참 잘했어요!", "최고야, 끝까지 잘하고 있어!", "네 생각을 알려줘서 고마워!", "우와, 척척 해내는구나!", "생각하는 모습이 멋져!", "좋아, 그렇게 생각했구나!", "잘했어! 다음 장도 같이 넘겨 보자.", "골라 줘서 고마워. 네 생각이 궁금했거든!"],
           sub: ["다른 쪽을 골라도 다 좋아.", "정답은 없어. 네 마음대로 골라도 돼.", "마음이 바뀌면 다시 골라도 돼."],
           stamp: ["참 잘했어요", "최고예요", "멋져요", "잘했어요", "고마워요"] },
  adult: { says: ["답해 주셔서 고마워요.", "부모님의 생각, 잘 들었어요.", "솔직한 생각이 제일 좋은 답이에요.", "잘하고 계세요! 한 장씩 넘겨 볼까요?", "끝까지 함께해 주셔서 고마워요.", "부모님의 시선도 소중한 답이에요."],
           sub: ["아이와 같아도, 달라도 모두 좋아요.", "평소 생각 그대로 고르시면 돼요."],
           stamp: ["고마워요", "좋아요", "감사해요"] },
};
const lastPick = {};
function pick(key, list, allow) { const ok = (allow || list.map((_, i) => i)); let k; do { k = ok[Math.floor(Math.random() * ok.length)]; } while (ok.length > 1 && k === lastPick[key]); lastPick[key] = k; return list[k]; }
/* 장에 맞는 칭찬만 골라요: ‘다음 장도/한 장씩 넘겨’는 마지막 장 전까지, ‘끝까지 함께해 주셔서’는 마지막 장에서만 (아이 칭찬은 녹음 파일 번호와 같은 순서) */
const praiseAllow = {
  child: (last) => last ? [0, 2, 3, 4, 5, 7] : [0, 1, 2, 3, 4, 5, 6, 7],
  adult: (last) => last ? [4] : [0, 1, 2, 3, 5],
};
function cheerHtml(role) {
  const p = praise[role], last = S.index === Q.length - 1;
  return `<img class="mascot" src="assets/rabbit-star-laugh.webp" alt=""><p class="says" style="margin:0">${pick(role + 's', p.says, praiseAllow[role](last))}</p><span class="stamp-ink" aria-hidden="true">${pick(role + 't', p.stamp).replace(' ', '<br>')}</span>`;
}
const reasonAsk = {
  child: ["그게 먼저 보인 이야기를 들려줄래?", "어떤 생각이 났는지 말해 줄래?", "그렇게 하고 싶은 까닭이 있으면 알려 줘!", "거기서 뭘 하고 놀고 싶어?", "바꾸면 어떤 방이 될 것 같아?"],
  adult: ["먼저 눈에 들어온 까닭을 적어 주셔도 좋아요.", "그런 생각이 든 이유가 있다면 남겨 주세요.", "그렇게 하고 싶으신 이유가 있다면 남겨 주세요.", "그 자리를 고르신 이유가 있다면 적어 주세요.", "바꾸고 싶은 까닭을 짧게 남겨 주세요."],
};

/* ---------- 책장 소리 (종이 스치는 소리, 따로 파일 없이 만들어요) ---------- */
let actx = null;
function rustle() {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const sr = actx.sampleRate, at = actx.currentTime + .01;
    const noise = (sec, fn) => { const n = Math.ceil(sr * sec), b = actx.createBuffer(1, n, sr), d = b.getChannelData(0); let seed = 2207; for (let i = 0; i < n; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; d[i] = (seed / 4294967296 * 2 - 1) * fn(i / n); } return b; };
    const out = actx.createGain(); out.gain.value = .9; out.connect(actx.destination);
    const layer = (buf, type, f0, f1, q, gain, start, dur) => {
      const src = actx.createBufferSource(); src.buffer = buf;
      const f = actx.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, start); f.frequency.exponentialRampToValueAtTime(f1, start + dur);
      const g = actx.createGain(); g.gain.value = gain;
      src.connect(f).connect(g).connect(out); src.start(start); src.stop(start + dur + .02);
    };
    // 1) 종이를 손끝으로 들어 올리는 바스락 (작은 알갱이)
    layer(noise(.14, (x) => (Math.random() < .08 ? 1 : .12) * (1 - x)), 'bandpass', 4200, 3000, 1.2, .16, at, .14);
    // 2) 책장이 넘어가며 공기를 가르는 휘익
    layer(noise(.42, (x) => Math.sin(Math.PI * Math.min(1, x * 1.15)) ** 1.6), 'bandpass', 700, 2300, .8, .34, at + .06, .42);
    // 3) 반대편에 내려앉는 탁 (낮고 짧게)
    layer(noise(.09, (x) => (1 - x) ** 3), 'lowpass', 900, 260, .6, .55, at + .46, .09);
  } catch {}
}

/* ---------- 소리 ---------- */
const voice = new Audio();
voice.preload = 'auto';
/* 녹음해 둔 목소리 목록 (build.py가 assets/voice를 보고 채워요). 아직 녹음 전인 새 대사는 조용히 건너뛰어요 */
const VOICES = new Set(/*@VOICE_LIST@*/);
const hasVoice = (f) => VOICES.has(f);
const VOICE_SEC = /*@VOICE_SECONDS@*/;
/* 브라우저는 사람이 한 번 화면을 만지기 전에는 소리를 못 내게 막아요.
   그래서 첫 화면에서 먼저 틀어 보고, 막히면 '어디든 첫 톡'에 바로 이어서 틀어요 */
let audioUnlocked = false, needTouch = false;
function markUnlocked() { if (audioUnlocked) return; audioUnlocked = true; needTouch = false; document.body.classList.remove('need-touch'); }
voice.addEventListener('playing', markUnlocked);
/* 토끼가 말하는 동안 말풍선 앞 토끼가 함께 들썩여요 */
voice.addEventListener('playing', () => document.body.classList.add('voice-on'));
['pause', 'ended', 'error', 'emptied'].forEach((n) => voice.addEventListener(n, () => document.body.classList.remove('voice-on')));
function blocked() { if (audioUnlocked) return; needTouch = true; document.body.classList.add('need-touch'); setTimeout(() => typeof syncTouchChip === 'function' && syncTouchChip(), 0); }
let queue = [], playToken = 0, pending = null;
let eggLoadingOn = false;
function play(list, onDone) {
  stopVoice();
  list = list.filter((it) => hasVoice(it.f));
  if (!soundOn || !list.length) { onDone?.(); return; }
  queue = list.slice();
  const token = ++playToken;
  const next = () => {
    if (token !== playToken) return;
    const item = queue.shift();
    document.querySelectorAll('.choice.speaking').forEach((b) => b.classList.remove('speaking'));
    if (!item) { onDone?.(); return; }
    if (item.mark) { const ch = document.querySelector(`.choice[data-v="${item.mark}"]`); ch?.classList.add('speaking'); if (S.role === 'child') { revealAboveBar(stage.querySelector('.choices')); pointAt(ch); } }
    voice.src = clipSrc(item.f);
    voice.onended = next;
    voice.onerror = next;
    voice.play().catch((err) => { if (token !== playToken) return; queue = []; if (err?.name === 'NotAllowedError') { blocked(); pending = { list, onDone }; } onDone?.(); });
  };
  next();
}
function stopVoice() {
  playToken++; queue = [];
  try { voice.pause(); voice.ontimeupdate = null; } catch {}
  document.querySelectorAll('.choice.speaking').forEach((b) => b.classList.remove('speaking'));
}
function questionVoice(i) {
  return [{ f: 'story-' + i }, { f: 'child-' + i }, ...(i === 0 ? [{ f: 'choices-intro' }] : []), { f: `option-child-${i}-A`, mark: 'A' }, { f: `option-child-${i}-B`, mark: 'B' }, { f: 'choices-ready' }];
}

/* ---------- 손가락 안내: 아이 차례에 누를 곳을 콕콕 가리켜요 ---------- */
const pointerEl = document.createElement('div');
pointerEl.className = 'tap-hand'; pointerEl.setAttribute('aria-hidden', 'true'); pointerEl.hidden = true;
pointerEl.innerHTML = '<span class="ripple"></span><svg viewBox="0 0 64 64"><g stroke="#8A5A36" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" fill="#FFF3E6"><circle cx="39.5" cy="27" r="6"/><circle cx="46.5" cy="31.5" r="5.5"/><ellipse cx="14.5" cy="40" rx="6.5" ry="8.5" transform="rotate(-32 14.5 40)"/><rect x="21.5" y="2.5" width="13" height="32" rx="6.5"/><path d="M16 35c0-6 4-10 10-10h13c7 0 12 4.5 12 11v3c0 8-6 13-14 13h-9c-7 0-12-5-12-12z"/><rect x="17" y="50" width="32" height="12" rx="5.5" fill="#A9C8E8"/></g><path d="M23 26.4h10" stroke="#FFF3E6" stroke-width="3"/><path d="M23.5 51.5v9M29 51.5v9M34.5 51.5v9M40 51.5v9M45 51.5v8" stroke="#FFFDF8" stroke-width="2" opacity=".7"/><ellipse cx="28" cy="8.6" rx="3.4" ry="3.8" fill="#F7B8A8"/><circle cx="29" cy="39.5" r="1.8" fill="#5B3A22"/><circle cx="39" cy="39.5" r="1.8" fill="#5B3A22"/><path d="M31.6 43.4q2.4 2.4 4.8 0" fill="none" stroke="#5B3A22" stroke-width="1.8" stroke-linecap="round"/><circle cx="24.6" cy="44.5" r="3" fill="#F7B8A8" opacity=".85"/><circle cx="43.4" cy="44.5" r="3" fill="#F7B8A8" opacity=".85"/></svg>';
document.body.appendChild(pointerEl);
let pointTarget = null, pointRaf = 0, laterTimer = 0, idleTimer = 0;
function later(fn, ms) { clearTimeout(laterTimer); laterTimer = setTimeout(fn, ms); }
function placePointer() {
  if (!pointTarget || !pointTarget.isConnected) { hidePointer(); return; }
  const r = pointTarget.getBoundingClientRect();
  const barTop = barEl.contains(pointTarget) ? innerHeight : barEl.getBoundingClientRect().top;
  const visible = r.bottom > 40 && r.top < barTop - 20 && r.width > 0;
  pointerEl.hidden = !visible;
  const yk = pointTarget.classList.contains('choice') ? .34 : .55;
  pointerEl.style.transform = `translate(${Math.round(r.left + r.width * .62)}px, ${Math.round(r.top + r.height * yk)}px)`;
  pointRaf = requestAnimationFrame(placePointer);
}
function pointAt(el) {
  if (!el || el.disabled) return;
  cancelAnimationFrame(pointRaf); pointTarget = el; placePointer();
}
function hidePointer() { clearTimeout(laterTimer); clearTimeout(idleTimer); cancelAnimationFrame(pointRaf); pointTarget = null; pointerEl.hidden = true; }
/* 아직 안 골랐으면 두 보기를 번갈아, 골랐으면 다음 장 버튼을 가리켜요 */
function childGuide() {
  if (S.screen !== 'q' || S.role !== 'child') return;
  if (S.answers.child[S.index].choice) { pointAt(barEl.querySelector('[data-act="q-next"]')); return; }
  revealAboveBar(stage.querySelector('.choices'));
  let k = 0;
  const swap = () => { if (S.screen !== 'q' || S.answers.child[S.index].choice) return; pointAt(stage.querySelector(`.choice[data-v="${k % 2 ? 'B' : 'A'}"]`)); k++; idleTimer = setTimeout(swap, 1800); };
  clearTimeout(idleTimer); swap();
}

/* 음성을 폰에 미리 받아 두고(작은 파일 묶음), 장이 바뀌면 받아 둔 것에서 바로 틀어요 */
const clipCache = new Map();
function clipSrc(f) { return clipCache.get(f) || 'assets/voice/' + f + '.mp3'; }
/* 받는 중인 파일은 같은 약속을 돌려줘서, 기다리는 쪽이 끝까지 받을 때까지 기다릴 수 있어요 */
function cacheClip(f) {
  if (clipCache.has(f) || !hasVoice(f)) return Promise.resolve();
  if (cacheClip.busy.has(f)) return cacheClip.busy.get(f);
  const p = fetch('assets/voice/' + f + '.mp3').then((r) => r.ok ? r.blob() : null).then((b) => { if (b && b.size) clipCache.set(f, URL.createObjectURL(b)); }).catch(() => {}).finally(() => cacheClip.busy.delete(f));
  cacheClip.busy.set(f, p);
  return p;
}
cacheClip.busy = new Map();
function warmVoice(i) { if (i < 0 || i >= Q.length) return; questionVoice(i).forEach(({ f }) => cacheClip(f)); }
/* 앞 장부터 차례로 받아요: 1장 → 2장 … 그다음 알·친구 안내 */
async function warmAll() {
  for (let i = 0; i < Q.length; i++) await Promise.all(questionVoice(i).map(({ f }) => cacheClip(f)));
  for (const f of ['handoff-child', 'egg-loading', 'egg-ready', 'egg-more', 'egg-error']) await cacheClip(f);
  /* 그다음 친구·시범·결과지·사진 놀이 음성도 미리 받아 둬요 (처음 재생 때 늦게 시작해 잘리지 않도록) */
  const rest = [...VOICES].filter((f) => !clipCache.has(f)).sort((a, b) => rank(a) - rank(b));
  for (const f of rest) await cacheClip(f);
  function rank(f) { return /^friend-/.test(f) ? 0 : f === 'meet' ? 1 : /^motion-|^mission-done-mobile$/.test(f) ? 2 : f === 'result-child' ? 3 : /^hp-/.test(f) ? 4 : 5; }
}

/* ---------- 말로 적기 (원본 speech-input.js) ---------- */
let rec = null;
const micSupported = () => Boolean(window.SiseonVoiceInput?.supported());
function micStop() { if (rec?.active) rec.stop(); }
async function micSettle() { if (rec) { if (rec.active) rec.stop(); await Promise.race([rec.whenDone(), new Promise((r) => setTimeout(r, 2500))]); } }

/* ---------- 저장소 (Claude 검토 저장소, 기존 태블릿 서버와 분리) ---------- */
let dbP = null, userP = null, dlP = null;
const cap = (name) => (window.claude?.use ? window.claude.use(name).catch(() => null) : Promise.resolve(null));
function db() { return dbP || (dbP = cap('db')); }
function userCap() { return userP || (userP = cap('user')); }
function downloads() { return dlP || (dlP = cap('downloads')); }
let saveState = 'idle';
async function saveRecord() {
  if (S.savedId) { saveState = 'ok'; return; }
  saveState = 'saving'; paintSave();
  const store = await db();
  if (!store) { saveState = 'local'; paintSave(); return; }
  const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pack = (role) => ({ code: code(role), answers: S.answers[role].map((a, i) => ({ q: i + 1, title: Q[i].title, choice: a.choice, label: optionLabel(role, i, a.choice), reason: a.reason.trim(), point: a.point, toy: a.toy || '' })) });
  const record = { surveyVersion: SURVEY_VERSION, sourceRelease: SOURCE_RELEASE, stimulus: STIMULUS, mode: 'one-phone', test: !!S.test, startedAt: S.startedAt, finishedAt: S.finishedAt || new Date().toISOString(), child: pack('child'), adult: pack('adult') };
  try {
    await store.collection('mobileRecords').doc(id).set(record);
    S.savedId = id; persist(); saveState = 'ok';
  } catch (err) { saveState = ['not_granted', 'not_writer', 'forbidden', 'permission_denied'].includes(err?.code) ? 'local' : 'err'; }
  paintSave();
}
function paintSave() {
  const el = document.querySelector('[data-save]');
  if (!el) return;
  const map = {
    idle: ['', ''], saving: ['', '결과를 저장하고 있어요…'],
    ok: ['ok', '우리 가족 결과를 저장했어요.'],
    local: ['', ''],
    err: ['err', '인터넷 연결이 불안정해 저장하지 못했어요. 아래 버튼을 눌러 다시 저장해 주세요.'],
  };
  const [cls, text] = map[saveState] || map.idle;
  el.className = 'save-line ' + cls; el.textContent = text;
  const retry = document.querySelector('[data-act="save-retry"]');
  if (retry) retry.hidden = saveState !== 'err';
}

/* ---------- 화면 ---------- */
const stage = document.getElementById('stage');
const barEl = document.getElementById('bar');
const headEl = document.getElementById('head');
let roomInst = null;

function headHtml() {
  if (S.screen === 'home') return '';
  const role = ['q', 'handoffParent'].includes(S.screen) ? S.role : null;
  return `<button class="logo" type="button" data-act="logo" aria-label="시선사이 첫 화면으로">시선사이</button>
    ${S.screen === 'q' ? `<span class="role-tag ${S.role}">${roleName[S.role]}의 책 · ${S.index + 1}/5</span>` : ''}
    <span class="spacer"></span>
    <button class="icon-btn" type="button" data-act="sound" aria-label="${soundOn ? '소리 끄기' : '소리 켜기'}" aria-pressed="${!soundOn}">${soundOn ? I.speaker : I.mute}</button>`;
}

/* ---------- 선택 비교 그래프 (원본 choicePicture와 같은 축·같은 안쪽/바깥쪽) ----------
   위: 장난감 생각(P 안쪽 / F 바깥쪽) · 오른쪽: 놀고 싶은 곳(V / H) · 아래: 바꾸고 싶은 것(S / M) · 왼쪽: 만들던 놀이(D / B) */
const graphAxes = [
  { slot: 0, q: 1, inner: 'P', outer: 'F' },
  { slot: 1, q: 3, inner: 'V', outer: 'H' },
  { slot: 2, q: 4, inner: 'S', outer: 'M' },
  { slot: 3, q: 2, inner: 'D', outer: 'B' },
];
function choicePicture() {
  const center = [144, 116], dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const pos = (i, r) => dirs[i].map((d, j) => center[j] + d * r);
  const ring = (r) => dirs.map((_, i) => pos(i, r).join(',')).join(' ');
  const pts = {};
  ['adult', 'child'].forEach((role) => { const c = code(role) || ''; pts[role] = graphAxes.map((ax, i) => c[ax.slot] ? pos(i, c[ax.slot] === ax.inner ? 36 : 66) : null); });
  const spokes = dirs.map((_, i) => { const [x, y] = pos(i, 66); return `<line x1="${center[0]}" y1="${center[1]}" x2="${x}" y2="${y}"/>`; }).join('');
  const lines = Object.entries(pts).map(([role, a]) => `<g class="trace ${role}">${a.map((p, i) => { const n = a[(i + 1) % a.length]; return p && n ? `<line x1="${p[0]}" y1="${p[1]}" x2="${n[0]}" y2="${n[1]}"/>` : ''; }).join('')}</g>`).join('');
  const marks = Object.entries(pts).map(([role, a]) => `<g class="marks ${role}">${a.map((p) => !p ? '' : role === 'adult' ? `<rect x="${p[0] - 6}" y="${p[1] - 6}" width="12" height="12" rx="2"/>` : `<circle cx="${p[0]}" cy="${p[1]}" r="4.5"/>`).join('')}</g>`).join('');
  const labels = [[144, 17], [249, 111], [144, 205], [39, 111]];
  const desc = graphAxes.map((ax) => `${Q[ax.q].title}, 아이 ${optionLabel('child', ax.q, S.answers.child[ax.q].choice)}, 부모님 ${optionLabel('adult', ax.q, S.answers.adult[ax.q].choice)}`).join('. ');
  return `<svg class="choice-picture" viewBox="0 0 288 228" role="img" aria-labelledby="cp-t cp-d"><title id="cp-t">아이와 부모님이 고른 네 가지</title><desc id="cp-d">${esc(desc)}</desc>
    <g class="chart-guide"><polygon points="${ring(36)}"/><polygon points="${ring(66)}"/>${spokes}</g>
    <g class="chart-plot">${lines}${marks}</g>
    <g class="chart-labels">${labels.map(([x, y], i) => `<text x="${x}" y="${y}" text-anchor="middle" class="axis-code">${graphAxes[i].inner} / ${graphAxes[i].outer}</text><text x="${x}" y="${y + 15}" text-anchor="middle">${Q[graphAxes[i].q].title}</text>`).join('')}</g>
  </svg>`;
}
function graphSection(label) {
  return `<section class="graph" data-chart-view="both"><span class="sec-label">${label} · 두 사람의 선택 비교</span>
    <div class="chart-key"><span class="child">● 아이</span><span class="adult">□ 부모님</span></div>
    ${choicePicture()}
    <p class="small" style="margin:0;text-align:center">동그라미와 네모가 겹치면 같은 답이에요. 안쪽과 바깥쪽은 서로 다른 보기예요.</p>
    <div class="chart-controls" role="group" aria-label="그래프에서 강조할 답">${[['both', '같이 보기'], ['child', '아이'], ['adult', '부모님']].map(([v, l]) => `<button class="btn-soft" type="button" data-act="chart-view" data-v="${v}" aria-pressed="${v === 'both'}">${l}</button>`).join('')}</div>
    <details><summary>그래프 읽는 법</summary><p class="small" style="margin:0 0 6px">크기나 넓이는 점수나 정리 능력이 아니에요. 실제로 고른 내용은 아래 기록에서 볼 수 있어요.</p><ul class="small" style="margin:0;padding-left:18px">${graphAxes.map((ax) => `<li>${Q[ax.q].title}: 안쪽 ${ax.inner} ${codeNames[ax.inner]} / 바깥쪽 ${ax.outer} ${codeNames[ax.outer]}</li>`).join('')}</ul></details>
  </section>`;
}
/* ---------- 정리 친구 16종의 성격 (이름·정리 모습에 맞춘 색, 말투, 움직임) ---------- */
const personas = {
  PVSD: { color: '#B9772F', move: 'hop',    trait: '딱딱 제자리파',   say: '도토리처럼 딱! 쓰고 나면 바로 제자리에 쏙!' },
  PVSB: { color: '#8A73C2', move: 'sway',   trait: '한 번에 전시파',   say: '정리하는 날엔 한꺼번에~ 예쁘게 줄 세워 볼까냥?' },
  PVMD: { color: '#D99A1E', move: 'wag',    trait: '작품 지킴이',     say: '멍! 내 작품은 내 자리에. 보고 나면 바로 돌려놔!' },
  PVMB: { color: '#3F78B0', move: 'waddle', trait: '추억 전시회',     say: '뒤뚱뒤뚱~ 추억은 모아서 작은 전시회를 열자!' },
  PHSD: { color: '#7E5232', move: 'snap',   trait: '칼각 서랍파',     say: '각 맞춰 서랍에 착! 잊기 전에 바로 넣어야지.' },
  PHSB: { color: '#D98A5B', move: 'puff',   trait: '한가득 창고파',   say: '볼에 가득 모았다가~ 정한 날 창고에 쏙쏙!' },
  PHMD: { color: '#A3678F', move: 'float',  trait: '살금살금 보물함', say: '쉿, 소중한 건 보물함에 살며시 넣어 둘래.' },
  PHMB: { color: '#93642F', move: 'hug',    trait: '꼬옥 추억 상자',  say: '꼬옥 안아 주고, 추억 상자에 한가득 담아 줘!' },
  FVSD: { color: '#D9862F', move: 'twitch', trait: '어디든 휙휙',     say: '손 닿는 데가 최고! 다 쓰면 보이는 곳에 휙~' },
  FVSB: { color: '#C29A0E', move: 'dash',   trait: '번개 출동',       say: '정리 출동! 번개처럼 슝— 한 번에 끝낼게!' },
  FVMD: { color: '#2E9483', move: 'swirl',  trait: '기분 따라 꾸미기', say: '오늘 기분엔 여기가 딱이야~ 예쁘게 보이게 퐁당!' },
  FVMB: { color: '#D9708D', move: 'bighop', trait: '실컷 놀고 깡총',  say: '놀 만큼 실컷 놀고! 마음이 오면 한 번에 깡총!' },
  FHSD: { color: '#8A6A45', move: 'curl',   trait: '순간 포착',       say: '다 썼다! 바로 그 순간, 바구니에 콕!' },
  FHSB: { color: '#4E4E4E', move: 'roll',   trait: '한 번에 쓰읍',    say: '다 놀았으면~ 블랙홀처럼 한 번에 쓰으읍!' },
  FHMD: { color: '#CF7E4C', move: 'bounce', trait: '마음 챙김',       say: '히히, 소중한 건 바로 챙겨서 쏙! 마음이 따뜻해.' },
  FHMB: { color: '#4C83B3', move: 'flip',   trait: '우주 대청소',     say: '우주 대청소 시작! 하나씩 보며 추억 여행~ 끼룩!' },
};
const pv = (c) => personas[c] || { color: '#7A4F2A', move: 'hop', trait: '', say: '' };
/* 16종 그림은 가로세로 비율이 제각각이라 같은 폭이면 크기가 달라 보여요(예: 넓은 토끼 귀 vs 길쭉한 햄스터).
   그림의 실제 칠해진 면적이 비슷하게 보이도록 폭을 맞춰요 (egg/a/hog_*.png 알파 면적으로 계산, 원본 그림은 그대로) */
const palFit = {"FHMB": 97, "FHMD": 89, "FHSB": 86, "FHSD": 92, "FVMB": 97, "FVMD": 93, "FVSB": 86, "FVSD": 86, "PHMB": 92, "PHMD": 100, "PHSB": 79, "PHSD": 93, "PVMB": 93, "PVMD": 92, "PVSB": 91, "PVSD": 95};
function friendFigure(c, extra = '') {
  const p = pv(c);
  return `<figure class="pal m-${p.move} ${extra}" style="--pc:${p.color}"><img src="egg/a/hog_${c}.png" alt="${esc(characters[c])}" style="width:${palFit[c] || 100}%"></figure>`;
}

/* ---------- 정리 시범 (원본 mission-motion 엔진 그대로) ----------
   아이와 부모님이 처음으로 다르게 고른 곳(원본 순서 F/P → V/H → M/S → B/D)의 정리 방법을, 아이의 정리 친구가 보여 줘요. */
const habitOrder = [['P', 'F'], ['V', 'H'], ['S', 'M'], ['D', 'B']];
function missionPlan() {
  const c = code('child') || '', p = code('adult') || '';
  const k = [0, 1, 2, 3].find((s) => c[s] && p[s] && c[s] !== p[s]);
  if (k === undefined) return { pattern: 4, childIndex: 0 };
  return { pattern: k, childIndex: habitOrder[k].indexOf(c[k]) };
}
const motionVoiceCaptions = {"이제 집으로 가서 가족이 정리를 해 볼 차례예요!":{"scene":"mission-done","seconds":3.344},"장난감 셋 중에 공의 자리를 먼저 정해요.":{"scene":"motion-0-0","seconds":3.312},"나머지 둘도 하나씩 들고 자리를 찾아요.":{"scene":"motion-0-1","seconds":3.099},"상자 앞에 붙일 블록 그림을 하나 골라요.":{"scene":"motion-1-0","seconds":2.968},"블록을 상자에 넣고 그림 표시를 붙여요.":{"scene":"motion-1-1","seconds":2.725},"매일 쓰는 크레파스는 꺼내기 쉬운 선반에 놓아요.":{"scene":"motion-2-0","seconds":3.458},"소중한 별은 보물상자에 쏙 넣어요.":{"scene":"motion-2-1","seconds":4.973},"길 위의 공과 자동차를 바구니로 옮겨 길을 비워요.":{"scene":"motion-3-0","seconds":4.843},"블록 작품은 부수지 않고 옆 안전한 자리에 둬요.":{"scene":"motion-3-1","seconds":4.419},"작품은 시계가 알려 줄 때 나중에 같이 정리해요.":{"scene":"motion-3-2","seconds":5.346},"자동차의 자리를 함께 골라요.":{"scene":"motion-4-0","seconds":3.527},"손이 닿는 낮은 곳에 두면 내일도 꺼낼 수 있어요.":{"scene":"motion-4-1","seconds":4.822}};
/* 원본 표지 음성: 마지막 문장(‘…시작 버튼을 눌러 줘’)은 버튼 이름이 달라 그 앞에서 멈춰요 */
const introLines = {
  /* v15 표지 음성(16.33초): 자막 시작은 실제 쉼 위치(4.88·10.0·13.5초 말소리 시작)에 맞췄어요 */
  child: { f: 'cover', orig: 16.33, stop: 16.4, caps: [[0, '안녕, 우리 친구! 여기는 토끼들의 방이야.'], [4.8, '우리 친구와 부모님이 좋아하는 걸 서로 알아보는 그림 놀이야!'], [9.9, '어떤 걸 선택해도 맞고 틀리는 건 없어.'], [13.4, '재미로 우리 집 정리 친구를 만나 보자!']] },
  adult: { f: 'parent-cover', orig: 18.768, stop: 16.35, caps: [[0, '부모님, 반갑습니다!'], [2.286, '아이와 같은 방을 서로의 눈으로 살펴보는 그림 놀이예요.'], [6.646, '다섯 질문에 각자 답하며 서로의 생각을 알아보세요.'], [10.766, '정답은 없어요.'], [12.566, '재미로 정리 친구를 만나고 함께할 정리 놀이를 찾아봐요.']] },
};
function playIntro(who) {
  const L0 = introLines[who]; if (!L0 || !soundOn || !hasVoice(L0.f)) return;
  /* 새로 녹음한 소개 파일이면(길이가 다르면) 끝까지 듣고, 자막은 글자 수 비율로 나눠 맞춰요 */
  const dur = VOICE_SEC[L0.f];
  let L = L0;
  if (dur && Math.abs(dur - L0.orig) > 0.05) {
    const total = L0.caps.reduce((n, c) => n + c[1].length, 0); let acc = 0;
    L = { ...L0, stop: Infinity, caps: L0.caps.map((c) => { const at = (acc / total) * dur; acc += c[1].length; return [at, c[1]]; }) };
  }
  stopVoice();
  const token = ++playToken, cap = stage.querySelector('[data-intro-cap]');
  voice.src = clipSrc(L.f); voice.onended = null; voice.onerror = null;
  voice.ontimeupdate = () => {
    if (token !== playToken) { voice.ontimeupdate = null; return; }
    if (voice.currentTime >= L.stop) { voice.pause(); voice.ontimeupdate = null; return; }
    if (cap) { let line = L.caps[0][1]; for (const [s, txt] of L.caps) if (voice.currentTime >= s) line = txt; if (cap.textContent !== line) cap.textContent = line; }
  };
  voice.play().catch((err) => { if (token === playToken && err?.name === 'NotAllowedError') { blocked(); pending = { intro: who }; } });
}
let missionInst = null;
/* 원본 엔진의 마지막 자막('이제 집으로 가서…')은 태블릿 현장용이라, 집에서 쓰는 모바일에 맞는 말로 바꿔 보여 줘요 (엔진 파일은 그대로) */
const MOBILE_DONE = '우리도 지금 같이 정리해 볼까?';
function swapDoneLine() {
  const cap = stage.querySelector('#mission-motion .smm-caption');
  if (cap && /집으로 가서/.test(cap.textContent)) cap.textContent = MOBILE_DONE;
}
let missionMountToken = 0;
async function mountMission() {
  const host = stage.querySelector('#mission-motion');
  const c = code('child');
  if (!host || !c || !window.SiseonMission) return;
  const plan = missionPlan();
  /* 시범은 정해진 시간마다 장면이 넘어가요. 음성을 다 받기 전에 시작하면 첫 재생에서 말이 잘려서, 먼저 받아 둬요 */
  const token = ++missionMountToken;
  const clips = [...new Set(Object.values(motionVoiceCaptions).map((v) => v.scene === 'mission-done' ? 'mission-done-mobile' : v.scene))].filter((f) => f.startsWith('motion-' + plan.pattern + '-') || f === 'mission-done-mobile');
  if (soundOn && clips.some((f) => !clipCache.has(f))) {
    const wait = document.createElement('p'); wait.className = 'mission-wait'; wait.setAttribute('role', 'status'); wait.textContent = '정리 친구가 시범을 준비하고 있어요…';
    host.appendChild(wait);
    await Promise.race([Promise.all(clips.map(cacheClip)), new Promise((r) => setTimeout(r, 15000))]);
    wait.remove();
    if (token !== missionMountToken || S.screen !== 'mission' || !host.isConnected) return;
  }
  try {
    missionInst = window.SiseonMission.create(host, {
      code: c, name: characters[c], imageSrc: `assets/mission/mission_${c}.webp`,
      pattern: plan.pattern, childIndex: plan.childIndex, reducedMotion: reduced(),
      soundAllowed: () => soundOn && !document.hidden,
      captionDurations: Object.fromEntries(Object.entries(motionVoiceCaptions).map(([t, v]) => [t, VOICE_SEC[v.scene === 'mission-done' ? 'mission-done-mobile' : v.scene] || v.seconds])),
      onStageChanged: (text) => { const clip = motionVoiceCaptions[text]; if (clip && clip.scene !== 'mission-done' && soundOn && !document.hidden) play([{ f: clip.scene }]); if (clip?.scene === 'mission-done') { swapDoneLine(); if (soundOn && !document.hidden) play([{ f: 'mission-done-mobile' }]); } if (clip?.scene === 'mission-done') { const b = barEl.querySelector('[data-act="to-result"]'); b?.classList.add('ready'); later(() => pointAt(b), 1500); } },
    });
    missionInst.play();
    const cap = host.querySelector('.smm-caption');
    if (cap) new MutationObserver(() => { if (/집으로 가서/.test(cap.textContent)) cap.textContent = MOBILE_DONE; }).observe(cap, { childList: true, characterData: true, subtree: true });
    /* 원본 엔진의 ‘1단계 · 아이 차례 / 부모님 차례’ 표시는 태블릿에서 가족이 번갈아 하던 순서라 모바일 시범에서는 헷갈려요.
       엔진은 그대로 두고, 정리 친구가 보여 주는 시범이라는 것과 ‘누가 해 볼 일’인지로 바꿔 보여 줘요 */
    const chip = host.querySelector('.smm-step');
    const fixChip = () => {
      const m = /^(\d)단계 · (아이|부모님) 차례$/.exec(chip.textContent);
      const want = m ? `${m[1]} · ${m[2] === '아이' ? '우리 친구가 해 볼 일' : '부모님이 도와줄 일'}` : chip.textContent === '시범 보기' ? '정리 친구의 시범' : chip.textContent;
      if (want !== chip.textContent) chip.textContent = want;
    };
    if (chip) { fixChip(); new MutationObserver(fixChip).observe(chip, { childList: true, characterData: true, subtree: true }); }
  } catch { missionInst = null; }
}
function destroyMission() { try { missionInst?.destroy(); } catch {} missionInst = null; }

/* ---------- 화면 (글은 꼭 필요한 것만) ---------- */
function homeHtml() {
  return `<div class="page no-head home">
    <div class="cover">${coverMedia('햇살이 드는 방에서 아이 토끼는 기차로 놀고, 부모 토끼는 그림책을 보는 움직이는 그림')}</div>
    <div class="cover-body">
      <h1 class="title">시선사이<br><span class="blue">같은 방, 다른 시선</span></h1>
      <div class="intro-rabbit"><span class="rabbit-tap"><img src="assets/rabbit-star.webp" alt=""><i class="ripple" aria-hidden="true"></i></span><p class="speech" data-intro-cap>안녕, 우리 친구! 여기는 토끼들의 방이야.</p></div>
      <button class="btn-soft listen-intro" type="button" data-act="intro-listen">${I.speaker}<span>토끼 이야기 듣기</span></button>
      ${S.startedAt && !S.finishedAt ? '<p class="note"><b>하던 곳부터 이어서 할 수 있어요.</b></p>' : ''}
      ${S.test ? '<span class="test-badge">테스트 모드</span>' : ''}
      <p class="small">재미로 보는 시선 놀이예요. 심리검사가 아니에요.</p>
    </div>
  </div>`;
}
function homeBar() {
  if (S.finishedAt) return `<div class="bar-row"><button class="btn-main" type="button" data-act="open-result">${I.check} 우리 가족 결과지 보기</button></div>
    <button class="btn-text" type="button" data-act="ask-new">새 가족으로 처음부터</button>`;
  if (S.startedAt) return `<div class="bar-row"><button class="btn-main" type="button" data-act="resume">${I.camera} 방사진 놀이 이어서 하기</button></div>
    <button class="btn-text" type="button" data-act="ask-new">처음부터 다시 하기</button>`;
  return `<div class="bar-row"><button class="btn-main" type="button" data-act="start">${I.camera} 방사진 놀이 시작</button></div>`;
}

/* 표지 그림: 원본 ‘책 표지’ 움직이는 그림(book-cover-full-motion) — 방 전체가 화면을 채워요 */
function coverMedia(alt) {
  const poster = 'assets/book-cover-poster.jpg';
  return reduced() ? `<img class="art" src="${poster}" alt="${alt}">`
    : `<video class="art" src="assets/book-cover-full-motion.mp4" poster="${poster}" muted playsinline autoplay preload="auto" disablepictureinpicture aria-label="${alt}"></video>`;
}
/* 아이의 책 · 부모님의 책 표지 (원본 역할별 책 표지와 같은 그림) */
function bookHtml(role) {
  return `<div class="page ${role}"><div class="center book-start">
    <div class="book ${role}">
      <div class="book-art">${coverMedia(role === 'child' ? '아이의 책 표지: 두 토끼가 놀이방에 있는 그림' : '부모님의 책 표지: 두 토끼가 놀이방에 있는 그림')}</div>
      <span class="book-plate"><span class="book-title">${roleName[role]}의 책</span><span class="book-sub">같은 방, 다른 시선</span></span>
    </div>
    ${role === 'child'
      ? '<p class="lead">그림 <b>다섯 장</b>을 보고<br>마음에 드는 걸 <b>콕</b> 골라 봐!</p>'
      : '<p class="lead">아이 답은 끝날 때까지 보이지 않아요.<br><b>부모님 생각</b>대로 골라 주세요.</p>'}
  </div></div>`;
}
const childBookBar = () => `<div class="bar-row"><button class="paw-back" type="button" data-act="guide-back"><span class="paw-badge">${I.pawArrow}</span><span>안내</span></button><button class="paw-next" type="button" data-act="open-child"><span class="label">책 펼치기</span>${pawBadge()}</button></div>`;
function guideHtml() {
  return `<div class="page">
    <div class="stack">
      <h1 class="h2">이 놀이는요</h1>
      <p class="purpose">아이는 <b>“더 놀고 싶은 마음”</b>을, 부모님은 <b>“정리하고 싶은 마음”</b>을 가지고 있어요. 같은 방을 보고 서로의 마음을 알아보고, 함께할 정리를 찾아요.</p>
      <button class="btn-soft listen-intro" type="button" data-act="intro-listen" data-who="adult">${I.speaker}<span>부모님 안내 듣기</span></button>
      <h2 class="h2" style="font-size:24px;margin-top:6px">폰 한 대로 이렇게 해요</h2>
      <ol class="steps">
        <li><span class="n">1</span><p><b>아이가 5장</b> 골라요</p></li>
        <li><span class="n adult">2</span><p><b>부모님이 5장</b> 골라요</p></li>
        <li><span class="n egg">3</span><p>아이가 <b>알 두 개</b>를 깨요</p></li>
        <li><span class="n done">4</span><p>정리 친구의 <b>시범</b>과 <b>결과지</b>를 봐요</p></li>
      </ol>
      <p class="small">정답은 없어요. 고른 답과 적은 말만 저장하고, 목소리는 녹음하지 않아요.</p>
    </div>
  </div>`;
}
const guideBar = () => `<div class="bar-row"><button class="paw-back" type="button" data-act="home"><span class="paw-badge">${I.pawArrow}</span><span>처음</span></button><button class="paw-next" type="button" data-act="open-child-book"><span class="label">아이의 책으로</span>${pawBadge()}</button></div>`;

function qHtml() {
  const role = S.role, i = S.index, q = Q[i], a = S.answers[role][i];
  const sc = q.scene;
  const opts = q[role + 'Options'];
  const open = !!a.reason || S.reasonOpen === `${role}${i}`;
  return `<div class="page ${role}">
    <div class="stack">
      <p class="story"><b>${q.story[0]}</b></p>
      <div class="q-line"><h1 class="question" tabindex="-1">${esc(q[role])}</h1>${role === 'child' ? `<button class="icon-btn listen" type="button" data-act="listen" aria-label="다시 듣기">${I.speaker}</button>` : ''}</div>
      ${role === 'adult' && i === 0 ? '<p class="adult-note">아이 답을 맞히지 말고, 부모님 생각을 골라 주세요.</p>' : ''}
      ${sc.bubble ? `<div class="guide-line" aria-hidden="true"><img src="assets/rabbit-star.webp" alt=""><span>${sc.bubble}</span></div>` : ''}
      <figure class="scene l${i}" style="margin:0" ${i === 0 ? '' : 'data-act="scene-tap"'}>
        ${i === 0 ? '<div class="room-host" data-room></div>' : ''}
        <img class="art enter" src="assets/${sc.img || 'shared-room.webp'}" alt="${sc.alt || '아이와 부모님이 함께 보는 공통 방 그림'}" style="--o:${sc.x}% ${sc.y}%;--s0:${(sc.s * .86).toFixed(2)};--s1:${sc.s};transform-origin:${sc.x}% ${sc.y}%;transform:scale(${sc.s})" draggable="false">
        <span class="light" aria-hidden="true"></span>
        ${i === 0 && a.point ? `<span class="pin" style="left:${a.point.x}%;top:${a.point.y}%"></span>` : ''}
      </figure>
      ${i === 0 ? `<p class="other-pick" data-other ${a.choice === 'other' ? 'hidden' : ''}>그림 속 장난감을 눌러도 돼요</p>` : ''}
      <div class="choices" role="group" aria-label="답 고르기">
        ${['A', 'B'].map((v, k) => `<button class="choice" type="button" data-act="choose" data-v="${v}" aria-pressed="${a.choice === v}">
          <span class="stamp">${I.check}</span>
          <span class="artbox"><img class="art" src="assets/${choiceArt[i][k]}" alt="" draggable="false"></span><strong>${esc(opts[k])}</strong></button>`).join('')}
        ${i === 0 && a.choice === 'other' ? otherCardHtml(a) : ''}
      </div>
      <div data-follow ${a.choice ? '' : 'hidden'}>
        <div class="stack">
          <div class="cheer" data-cheer>${a.choice ? cheerHtml(role) : ''}</div>
          <button class="btn-text reason-toggle" type="button" data-act="reason-open" ${open ? 'hidden' : ''}>${role === 'child' ? '+ 아이가 한 말 적기' : '+ 이유 적기'} <span class="opt">(선택)</span></button>
          <div class="reason" data-reason ${open ? '' : 'hidden'}>
            <label for="reason">${reasonAsk[role][i]}</label>
            ${role === 'adult' && micSupported() ? `<div class="mic-row"><button class="btn-soft mic" type="button" data-act="mic" aria-pressed="false">${I.mic}<span>말로 적기</span></button><span class="mic-status" role="status"></span></div>` : ''}
            <textarea id="reason" name="reason" maxlength="180" rows="2" placeholder="${role === 'child' ? '아이가 한 말 그대로' : '짧게 적어 주세요'}">${esc(a.reason)}</textarea>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}
function qBar() {
  const a = S.answers[S.role][S.index];
  const last = S.index === Q.length - 1;
  const backLabel = S.index === 0 ? '표지' : '이전';
  return `<div class="bar-row"><button class="paw-back" type="button" data-act="q-back" aria-label="${backLabel} 쪽으로"><span class="paw-badge">${I.pawArrow}</span><span>${backLabel}</span></button>
    <button class="paw-next" type="button" data-act="q-next" ${a.choice ? '' : 'disabled'}><span class="label">${last ? '내 책 마치기' : '다음 장'}</span>${pawBadge()}</button></div>
    <p class="bar-hint" data-hint>${a.choice ? '' : (S.role === 'child' ? '아래 작은 그림 두 개 중 하나를 골라 줘' : '아래 작은 그림 두 개 중 하나를 골라 주세요')}</p>`;
}

function childDoneHtml() {
  return `<div class="page"><div class="center">
    <h1 class="h2">와! 네 알이 생겼어!</h1>
    <img class="egg-wobble" src="egg/a/egg.png" alt="흔들리는 작은 알">
    <p class="lead">엄마·아빠 차례가 끝나면 <b>같이 깨 보자!</b></p>
  </div></div>`;
}
const childDoneBar = () => `<div class="bar-row"><button class="paw-back" type="button" data-act="child-review"><span class="paw-badge">${I.pawArrow}</span><span>이전</span></button><button class="paw-next" type="button" data-act="to-parent"><span class="label">부모님께 폰 건네기</span>${pawBadge()}</button></div>`;

function handoffParentHtml() { return bookHtml('adult'); }
const handoffParentBar = () => `<div class="bar-row"><button class="paw-next" type="button" data-act="open-adult"><span class="label">책 펼치기</span>${pawBadge()}</button></div><p class="bar-hint">부모님이 직접 눌러 주세요</p>`;

function handoffChildHtml() {
  return `<div class="page"><div class="center">
    <h1 class="h2">아이에게 폰을 돌려주세요</h1>
    <div class="egg-pair">
      <figure><img class="egg-wobble" src="egg/a/egg.png" alt=""><span class="role-tag child">내 알</span></figure>
      <figure><img class="egg-wobble" src="egg/a/egg.png" alt=""><span class="role-tag adult">부모님 알</span></figure>
    </div>
    <p class="lead">알 두 개를 <b>톡톡</b> 깨 볼까?</p>
  </div></div>`;
}
const handoffChildBar = () => `<div class="bar-row"><button class="paw-next" type="button" data-act="to-egg"><span class="label">알 깨러 가기</span>${pawBadge()}</button></div>`;

function eggHtml() {
  const role = S.eggStage, c = code(role), p = pv(c);
  if (S.eggs[role]) {
    return `<div class="page"><div class="center friend-reveal" style="--pc:${p.color}">
      <span class="role-tag ${role}">${role === 'child' ? '내 알' : '부모님 알'}에서 나왔어요</span>
      <div class="reveal-wrap">${friendFigure(c, 'big')}<span class="trait">${p.trait}</span></div>
      <h1 class="h2 pal-name" tabindex="-1">${esc(characters[c])}</h1>
      <p class="speech">“${p.say}”</p>
    </div></div>`;
  }
  return `<div class="page"><div class="stack">
    <h1 class="h2">${role === 'child' ? '내 알을 톡톡 두드려 봐!' : '이번엔 부모님 알이야, 톡톡!'}</h1>
    <iframe class="egg-frame" id="egg-frame" title="${roleName[role]} 알을 두드려 친구 만나기" src="egg/${eggFiles[c]}?embedded=1&sound=${soundOn ? 'on' : 'off'}" allow="autoplay"></iframe>
    <p class="egg-status" data-egg-status role="status">알을 준비하고 있어요…</p>
  </div></div>`;
}
function eggBar() {
  const role = S.eggStage;
  if (S.eggs[role]) return `<div class="bar-row"><button class="paw-next" type="button" data-act="egg-next"><span class="label">${role === 'child' ? '부모님 알 깨기' : '두 친구 만나기'}</span>${pawBadge()}</button></div>`;
  return `<p class="bar-hint" data-skip-wait>알을 톡톡 두드리면 친구가 나와요</p><button class="btn-text" type="button" data-act="egg-skip" hidden>알 깨기가 안 되면 친구 바로 만나기</button>`;
}

function meetHtml() {
  const c = code('child'), p = code('adult');
  return `<div class="page"><div class="center">
    <div class="meet" aria-hidden="true"><div class="l">${friendFigure(c)}</div><div class="r">${friendFigure(p)}</div>${I.heart}</div>
    <h1 class="h2" tabindex="-1">${esc(josa(characters[c], '와', '과'))}<br>${esc(josa(characters[p], '가', '이'))} 만났어요!</h1>
    <div class="duo">
      <p class="speech small-speech" style="--pc:${pv(c).color}"><span class="role-tag child">아이 친구</span>“${pv(c).say}”</p>
      <p class="speech small-speech" style="--pc:${pv(p).color}"><span class="role-tag adult">부모님 친구</span>“${pv(p).say}”</p>
    </div>
  </div></div>`;
}
const meetBar = () => `<div class="bar-row"><button class="paw-next" type="button" data-act="to-mission"><span class="label">정리 시범 보기</span>${pawBadge()}</button></div>`;

function missionHtml() {
  const c = code('child');
  return `<div class="page"><div class="stack">
    <h1 class="h2" tabindex="-1">${esc(josa(characters[c], '가', '이'))} 정리하는 법을 보여 줄게!</h1>
    <div id="mission-motion" class="mission-host"></div>
  </div></div>`;
}
const missionBar = () => `<div class="bar-row"><button class="paw-back" type="button" data-act="mission-replay"><span class="paw-badge">${I.pawArrow}</span><span>다시</span></button><button class="paw-next" type="button" data-act="to-result"><span class="label">우리 가족 결과지</span>${pawBadge()}</button></div>`;

/* 부모님께: 아이가 실제로 고른 답에서 '더 놀고 싶은 마음'을 읽어 드려요 */
function forParent() {
  const c = code('child') || '';
  const lines = [];
  if (c[3] === 'B') lines.push('만들던 놀이를 <b>그대로 두고 또 놀고</b> 싶어 했어요. 치우기 전에 “어디까지 하고 정리할까?” 물어봐 주세요.');
  if (c[0] === 'F') lines.push('장난감을 보면 <b>“이걸로 뭘 하지?”</b>부터 떠올려요. 정리도 놀이처럼 시작해 보세요.');
  if (c[2] === 'M') lines.push('방에 <b>놀 자리</b>가 더 있었으면 해요. 놀 공간을 남겨 두는 정리를 같이 찾아봐요.');
  if (c[1] === 'V') lines.push('<b>넓은 바닥</b>에서 놀고 싶어 해요. 바닥 한쪽을 “놀이 자리”로 정해 줘도 좋아요.');
  if (!lines.length) lines.push('장난감을 <b>제자리에 두는 것</b>을 먼저 생각했어요. 정리하는 마음을 칭찬해 주세요.');
  return lines.slice(0, 2);
}
let photoUrl = null;
/* 같은 방, 다른 시선: 장마다 아이와 부모님이 고른 그림을 나란히. 다르게 본 장을 크게 보여 줘요 */
function gapSection() {
  const plan = missionPlan(), missionQ = [1, 3, 4, 2][plan.pattern];
  const art = (i, ch) => ch === 'A' || ch === 'B' ? `assets/${choiceArt[i][ch === 'A' ? 0 : 1]}` : 'assets/shared-room.webp';
  const side = (role, i) => { const ch = S.answers[role][i].choice; return `<figure class="gap-pick ${role}"><span class="who">${roleName[role]}</span><img src="${art(i, ch)}" alt=""><figcaption>${esc(meaningLabel(i, ch) || optionLabel(role, i, ch))}</figcaption></figure>`; };
  const rows = Q.map((q, i) => {
    const same = S.answers.child[i].choice === S.answers.adult[i].choice;
    return `<li class="gap-row ${same ? 'same' : 'diff'}"><div class="gap-q"><b>${i + 1}장</b> ${esc(q.title)}<span class="gap-tag">${same ? '같은 걸 골랐어요' : '서로 다르게 봤어요'}</span>${!same && i === missionQ ? '<span class="gap-tag mission">정리 시범</span>' : ''}</div>
      <div class="gap-pair">${side('child', i)}<span class="gap-vs" aria-hidden="true">${same ? '=' : '≠'}</span>${side('adult', i)}</div></li>`;
  }).join('');
  return `<section class="gap"><span class="sec-label">같은 방, 다른 시선</span><h2 class="msg-title">우리는 이렇게 다르게 봤어요</h2><ol class="gap-list">${rows}</ol>
    <p class="small" style="margin:0">다르게 본 곳이 서로를 알아 가는 시작이에요. 어느 쪽도 틀리지 않았어요.</p></section>`;
}
function resultHtml() {
  const c = code('child'), p = code('adult');
  const same = Q.filter((_, i) => S.answers.child[i].choice && S.answers.child[i].choice === S.answers.adult[i].choice).length;
  const card = (role, cc) => `<div class="friend" style="--pc:${pv(cc).color}"><span class="role-tag ${role}">${roleName[role]}</span>${friendFigure(cc)}<strong>${esc(characters[cc])}</strong><span class="trait">${pv(cc).trait}</span></div>`;
  const qa = Q.map((q, i) => {
    const ca = S.answers.child[i], aa = S.answers.adult[i];
    const line = (role, a) => `<div class="ans"><span class="r ${role === 'child' ? 'c' : 'a'}">${roleName[role]}</span><span>${esc(optionLabel(role, i, a.choice))}${a.reason.trim() ? `<q>${esc(a.reason.trim())}</q>` : ''}</span></div>`;
    return `<div class="qa"><h3>${i + 1}. ${q.title}${ca.choice && ca.choice === aa.choice ? ' <span class="same">같아요</span>' : ''}</h3>${line('child', ca)}${line('adult', aa)}</div>`;
  }).join('');
  const axisRows = axes.map((ax) => { const [x, y] = ax.pair.split('/'); return `<li><b>${x}</b> ${codeNames[x]} · <b>${y}</b> ${codeNames[y]} <span class="small">(${ax.title})</span></li>`; }).join('');
  return `<div class="page"><div class="report">
    <div class="stack" style="gap:4px"><h1 class="title" tabindex="-1">우리 가족<br><span class="blue">정리 이야기</span></h1><p class="lead">같은 방을 보고도 <b class="gap-num">${Q.length - same}장</b>에서 서로 다르게 봤어요.</p>${S.test ? '<span class="test-badge">테스트 모드</span>' : ''}</div>
    ${gapSection()}
    <section><span class="sec-label">우리 가족 정리 친구</span><div class="friends">${card('child', c)}${card('adult', p)}</div></section>
    <section class="msg parent-msg"><span class="sec-label">부모님께</span><h2 class="msg-title">아이의 “더 놀고 싶은 마음”</h2>${forParent().map((l) => `<p>${l}</p>`).join('')}</section>
    <section class="msg child-msg" style="--pc:${pv(c).color}"><span class="sec-label">아이에게 들려주기</span><div class="msg-row">${friendFigure(c, 'mini')}<p class="speech">“다 놀고 제자리에 두면, 내일 또 금방 찾을 수 있어!”</p></div><button class="btn-soft" type="button" data-act="to-mission">정리 시범 다시 보기</button></section>
    <section class="photo-cta"><img class="cta-rabbit" src="assets/rabbit-star-laugh.webp" alt="">
      <span class="sec-label">이제 진짜 우리 집에서!</span>
      <h2 class="msg-title">우리 집 사진 놀이</h2>
      <p>오늘 본 그림은 토끼네 방이었어요. 이번엔 <b>우리 집 사진</b>으로 아이와 번갈아 콕콕 짚어 봐요.</p>
      <ul class="cta-steps"><li><b>1</b> 먼저 보인 곳</li><li><b>2</b> 놀고 싶은 곳</li><li><b>3</b> 바꾸고 싶은 곳</li></ul>
      <p class="small">세 번만 짚으면 끝! 아이가 고른 <b>놀 자리</b>를 알면 오늘 정리를 어디서 시작할지 같이 정할 수 있어요. 사진은 이 폰에서만 보여요.</p>
      <button class="btn-photo" type="button" data-act="open-photo">${I.camera}<span>우리 집 사진으로 해 보기</span></button></section>
    ${graphSection('함께 보기')}
    <details class="card"><summary>고른 답과 남긴 말 보기</summary>${qa}<p class="small" style="margin:8px 0 0">네 글자 뜻</p><ul class="small axis-list">${axisRows}</ul></details>
    <section class="save-box"><span class="sec-label">결과지 간직하기</span>
      <div class="bar-row"><button class="btn-soft" type="button" data-act="save-image" style="flex:1">${I.photo} 결과지 사진으로 저장</button></div>
      <button class="btn-soft" type="button" data-act="save-pdf">인쇄용 PDF (A4) 받기</button>
      <p class="small" data-sheet-status role="status" style="margin:0"></p>
    </section>
    <p class="save-line" data-save role="status"></p><button class="btn-soft" type="button" data-act="save-retry" hidden>다시 저장하기</button>
    <div data-owner hidden class="stack"><button class="btn-soft" type="button" data-act="export">진행자 · 모바일 기록 내려받기 (CSV)</button><p class="small" data-export-status role="status" style="margin:0"></p></div>
    <p class="small">재미로 보는 시선 놀이예요. 심리검사가 아니에요.</p>
  </div></div>`;
}
const resultBar = () => `<div class="bar-row"><button class="btn-soft" type="button" data-act="logo" style="flex:1">첫 화면</button><button class="btn-soft" type="button" data-act="ask-new" style="flex:1">새 가족 시작</button></div>`;


/* ---------- 우리 집 사진 놀이 (설문 결과와 따로: 점수·유형 없음, 사진과 짚은 곳은 이 폰에만) ---------- */
const hpSteps = [
  { key: 'look',   n: 1, name: '먼저 보인 곳', child: '어디가 제일 먼저 보여?',   adult: '부모님 눈에는 어디가 먼저 보이세요?' },
  { key: 'play',   n: 2, name: '놀고 싶은 곳', child: '어디서 놀고 싶어?',         adult: '아이가 놀 자리로 어디가 좋을까요?' },
  { key: 'change', n: 3, name: '바꾸고 싶은 곳', child: '뭘 바꾸면 좋을까?',       adult: '어디부터 정리하고 싶으세요?' },
];
const hpFresh = () => ({ step: 0, turn: 'child', pins: { look: {}, play: {}, change: {} } });
function hp() { if (!S.hp) S.hp = hpFresh(); return S.hp; }
const near = (a, b) => a && b && Math.hypot(a.x - b.x, a.y - b.y) < 12;
function pinHtml(role, pt, label) { return pt ? `<span class="hp-pin ${role}" style="left:${pt.x}%;top:${pt.y}%">${label ?? ''}</span>` : ''; }
function photoHtml() {
  const h = hp();
  if (!photoUrl || h.step === 0) {
    return `<div class="page"><div class="stack">
      <h1 class="h2" tabindex="-1">우리 집 사진 놀이</h1>
      <p class="lead">장난감이 있는 우리 집 사진을 골라 주세요.</p>
      <div class="photo-box">
        <label class="photo-label" for="home-photo">${I.photo}<span>사진 고르기</span></label>
        <input id="home-photo" type="file" accept="image/*">
      </div>
      <p class="small">사진은 이 폰 화면에서만 보여요. 저장하거나 보내지 않아요.</p>
    </div></div>`;
  }
  if (h.step > hpSteps.length) {
    const c = code('child'), p = pv(c), P = h.pins;
    const legend = hpSteps.map((s) => `<li><b>${s.n}</b> ${s.name}${near(P[s.key].child, P[s.key].adult) ? ' <span class="same">같은 곳</span>' : ''}</li>`).join('');
    return `<div class="page"><div class="stack">
      <h1 class="h2" tabindex="-1">우리가 짚은 곳</h1>
      <div class="hp-photo"><img src="${photoUrl}" alt="우리 집 사진">${hpSteps.map((s) => pinHtml('child', P[s.key].child, s.n) + pinHtml('adult', P[s.key].adult, s.n)).join('')}</div>
      <div class="chart-key"><span class="child">● 아이</span><span class="adult">□ 부모님</span></div>
      <ul class="hp-legend">${legend}</ul>
      <section class="msg child-msg" style="--pc:${p.color}"><span class="sec-label">오늘의 약속</span>
        <div class="msg-row">${friendFigure(c, 'mini')}<p class="speech">“아이가 짚은 <span class="dot c">2</span> 놀 자리는 남겨 두고, <span class="dot c">3</span>부터 같이 정리해 볼까?”</p></div>
      </section>
    </div></div>`;
  }
  const s = hpSteps[h.step - 1], role = h.turn, pt = h.pins[s.key][role];
  return `<div class="page ${role}"><div class="stack">
    <div class="q-top"><span class="role-tag ${role}">${roleName[role]} 차례 · ${s.n}/3</span></div>
    <h1 class="question" tabindex="-1">${s[role]}</h1>
    <div class="hp-photo" data-act="photo-tap"><img src="${photoUrl}" alt="우리 집 사진" draggable="false">${pinHtml(role, pt, s.n)}</div>
    <p class="other-pick">${pt ? '다시 누르면 옮길 수 있어요' : '사진에서 콕 짚어요'}</p>
  </div></div>`;
}
function photoBar() {
  const h = hp();
  if (!photoUrl || h.step === 0) return `<div class="bar-row"><button class="btn-soft" type="button" data-act="to-result" style="flex:1">결과지로 돌아가기</button></div>`;
  if (h.step > hpSteps.length) return `<div class="bar-row"><button class="btn-soft" type="button" data-act="photo-again" style="flex:1">다른 사진으로</button><button class="btn-main" type="button" data-act="to-result" style="flex:1.4">결과지로</button></div>`;
  const s = hpSteps[h.step - 1], has = !!h.pins[s.key][h.turn];
  const last = h.turn === 'adult' && h.step === hpSteps.length;
  return `<div class="bar-row"><button class="paw-back" type="button" data-act="photo-back"><span class="paw-badge">${I.pawArrow}</span><span>이전</span></button>
    <button class="paw-next" type="button" data-act="photo-next" ${has ? '' : 'disabled'}><span class="label">${h.turn === 'child' ? '부모님 차례' : last ? '모아 보기' : '다음'}</span>${pawBadge()}</button></div>`;
}

const views = {
  home: [homeHtml, homeBar], guide: [guideHtml, guideBar], childBook: [() => bookHtml('child'), childBookBar], q: [qHtml, qBar], childDone: [childDoneHtml, childDoneBar],
  handoffParent: [handoffParentHtml, handoffParentBar], handoffChild: [handoffChildHtml, handoffChildBar],
  egg: [eggHtml, eggBar], meet: [meetHtml, meetBar], mission: [missionHtml, missionBar], result: [resultHtml, resultBar], photo: [photoHtml, photoBar],
};

let shownScreen = null, renderedAt = 0;
/* 아래 고정 바의 실제 높이만큼 페이지 아래를 비워, 마지막 버튼이 바에 가리지 않게 해요 */
function syncBarSpace() { const h = barEl.getBoundingClientRect().height; if (h) document.documentElement.style.setProperty('--bar-real', Math.ceil(h) + 'px'); }
addEventListener('resize', () => requestAnimationFrame(syncBarSpace));
function makeLeaf(dir) {
  const oldPage = stage.firstElementChild;
  if (!oldPage || reduced() || !(window.CSS && 'registerProperty' in CSS)) return null;
  const leaf = document.createElement('div');
  leaf.className = 'leaf roll ' + (dir === 'back' ? 'back' : 'next') + (shownScreen === 'home' ? ' from-home' : '');
  // 비스듬한 접힘선의 기울기: 화면 폭의 18%만큼 위가 앞서요
  const top = shownScreen === 'home' ? 0 : headEl.getBoundingClientRect().bottom;
  const ang = Math.atan((innerWidth * .18) / Math.max(1, innerHeight - top)) * 180 / Math.PI;
  leaf.style.setProperty('--ang', (dir === 'back' ? -ang : ang).toFixed(2) + 'deg');
  leaf.setAttribute('aria-hidden', 'true');
  const copy = oldPage.cloneNode(true);
  copy.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  copy.querySelectorAll('iframe, canvas, video').forEach((el) => { const ph = document.createElement('div'); ph.style.cssText = `width:${el.offsetWidth || 300}px;height:${el.offsetHeight || 200}px;max-width:100%;border-radius:22px;background:#efe3cf`; el.replaceWith(ph); });
  copy.classList.remove('settle');
  copy.style.marginTop = -(window.scrollY || 0) + 'px';
  const front = document.createElement('div'); front.className = 'leaf-face front'; front.appendChild(copy);
  const fold = document.createElement('div'); fold.className = 'leaf-fold';
  leaf.append(front, fold);
  return leaf;
}
function render(dir = 'next', opts = {}) {
  const animate = !opts.still && dir;
  const leaf = animate ? makeLeaf(dir) : null;
  destroyRoom(); destroyMission(); hidePointer();
  micStop(); rec = null;
  document.body.classList.remove('typing');
  const [pageFn, barFn] = views[S.screen] || views.home;
  headEl.innerHTML = headHtml();
  headEl.hidden = S.screen === 'home';
  stage.innerHTML = pageFn();
  barEl.innerHTML = `<div class="bar-in">${barFn()}</div>`;
  if (!opts.keepScroll) window.scrollTo(0, 0);
  if (animate) {
    stage.firstElementChild.classList.add('settle');
    if (leaf) {
      const shade = document.createElement('div');
      shade.className = 'turn-shade' + (dir === 'back' ? ' back' : '');
      document.body.append(shade, leaf);
      rustle();
      setTimeout(() => { leaf.remove(); shade.remove(); }, 1000);
    }
  }
  shownScreen = S.screen;
  renderedAt = performance.now();
  syncBarSpace();
  setTimeout(() => (stage.querySelector('h1[tabindex]') || stage.querySelector('h1'))?.focus?.({ preventScroll: true }), 60);
  persist();
  afterRender();
}
/* 화면이 열리면 바로 들려줄 말 (아이가 글을 못 읽어도 따라올 수 있게). 아직 녹음 전인 줄은 건너뛰어요 */
let homeSpoke = false, spokenKey = '';
const screenVoice = {
  childBook: () => ['book-child'],
  handoffParent: () => ['book-adult'],
  childDone: () => ['child-done'],
  handoffChild: () => ['handoff-child'],
  meet: () => ['meet'],
  result: () => ['result-child'],
  photo: () => { const h = S.hp; if (!photoUrl || !h || h.step === 0) return ['hp-pick']; if (h.step > hpSteps.length) return ['hp-promise']; return h.turn === 'child' ? ['hp-' + hpSteps[h.step - 1].key] : null; },
};
const touchChip = document.createElement('button');
touchChip.type = 'button'; touchChip.className = 'touch-chip'; touchChip.hidden = true;
touchChip.innerHTML = `${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3Z"/><path d="M16 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12"/></svg>'}<span>화면을 톡! 누르면 토끼가 말해요</span>`;
document.body.appendChild(touchChip);
function syncTouchChip() { touchChip.hidden = !(needTouch && soundOn && pending); }
/* 첫 톡(손을 뗄 때 = 브라우저가 소리를 허락하는 순간)에 막혔던 말을 바로 이어서 틀어요.
   버튼을 눌렀다면 그 버튼이 여는 화면의 말이 나오니 따로 틀지 않아요 */
function firstTouch(e) {
  if (audioUnlocked || !needTouch) return;
  const p = pending; pending = null; needTouch = false; document.body.classList.remove('need-touch'); syncTouchChip();
  if (!p || !soundOn) return;
  const onControl = e.target.closest?.('[data-act]:not(.touch-chip):not([data-act="scene-tap"]), [data-ask], input, textarea, label, a, iframe');
  if (onControl) return;
  if (p.intro) playIntro(p.intro); else play(p.list, p.onDone);
}
['pointerup', 'touchend', 'keydown'].forEach((n) => document.addEventListener(n, firstTouch, { capture: true, passive: true }));
function afterRender() {
  hidePointer();
  if (S.screen === 'q') {
    if (S.index === 0) requestAnimationFrame(() => setTimeout(mountRoom, 0));   // 음성을 먼저 틀고, 무거운 입체 방은 그다음에
    setupMic();
    if (S.role === 'child') warmVoice(S.index + 1);
    if (S.role === 'child' && !S.answers.child[S.index].choice) play(questionVoice(S.index), childGuide);
    else { stopVoice(); if (S.role === 'child') later(childGuide, 1200); }
  }
  const say = S.screen === 'q' ? null : screenVoice[S.screen]?.() || null;
  const key = S.screen === 'q' ? '' : S.screen + ':' + (say || []).join(',');
  if (key && key !== spokenKey) { stopVoice(); if (say) play(say.map((f) => ({ f }))); }
  spokenKey = key;
  if (S.screen === 'home' && !homeSpoke) { homeSpoke = true; playIntro('child'); }
  if (S.screen === 'guide') playIntro('adult');
  if (S.screen === 'photo' && photoUrl && S.hp && S.hp.step >= 1 && S.hp.step <= hpSteps.length && S.hp.turn === 'child' && !S.hp.pins[hpSteps[S.hp.step - 1].key].child) later(() => pointAt(stage.querySelector('.hp-photo')), 1200);
  if (['childBook', 'childDone', 'handoffChild', 'meet', 'guide', 'handoffParent'].includes(S.screen) || (S.screen === 'egg' && S.eggs[S.eggStage])) later(() => pointAt(barEl.querySelector('.paw-next')), 2000);
  if (S.screen === 'home') later(() => pointAt(barEl.querySelector('.btn-main')), 2200);
  if (S.screen === 'result') later(() => pointAt(stage.querySelector('[data-act="open-photo"]')), 2500);
  if (S.screen === 'photo' && photoUrl && S.hp && S.hp.step > hpSteps.length) later(() => pointAt(barEl.querySelector('[data-act="to-result"]')), 2500);
  if (S.screen === 'photo' && photoUrl && S.hp && S.hp.step >= 1 && S.hp.step <= hpSteps.length && S.hp.turn === 'adult' && !S.hp.pins[hpSteps[S.hp.step - 1].key].adult) later(() => pointAt(stage.querySelector('.hp-photo')), 1200);
  if (S.screen === 'q' && S.role === 'adult' && S.answers.adult[S.index].choice) later(() => pointAt(barEl.querySelector('[data-act="q-next"]')), 1200);
  const v = stage.querySelector('.cover video, .book-art video');
  if (v) { v.play?.().catch(() => {}); }
  if (S.screen === 'egg' && !S.eggs[S.eggStage]) { watchEgg(); if (soundOn && hasVoice('egg-loading')) { eggLoadingOn = true; play([{ f: 'egg-loading' }], () => { eggLoadingOn = false; }); } }
  if (S.screen === 'mission') mountMission();
  if (S.screen === 'egg' && S.eggs[S.eggStage] && soundOn) play([{ f: 'friend-' + code(S.eggStage) }]);
  syncTouchChip();
  if (S.screen === 'result') { paintSave(); saveRecord(); }
}

/* ---------- 공통 방 그림 (1장: 원본 입체방 엔진 그대로) ---------- */
function mountRoom() {
  const host = stage.querySelector('[data-room]');
  if (!host || !window.SiseonRoom || !window.SISEON_ROOM_HOTSPOTS) return;
  const role = S.role;
  try {
    roomInst = window.SiseonRoom.create(host, {
      imageSrc: 'assets/shared-room.webp', hotspots: window.SISEON_ROOM_HOTSPOTS,
      respondent: role === 'adult' ? 'parent' : 'child', intro: false, sound: soundOn, soundButton: false,
      soundAllowed: () => soundOn,
      onReady: () => { host.parentElement.querySelector(':scope > img')?.style.setProperty('opacity', '0'); },
      onFrame: (inst) => {
        const a = S.answers[role][0], pin = host.parentElement.querySelector('.pin');
        if (!a.point || !pin || !inst.toScreen) return;
        const pos = inst.toScreen(a.point.x / 100 * inst.W, a.point.y / 100 * inst.H);
        pin.style.left = pos.x / inst.cssW * 100 + '%'; pin.style.top = pos.y / inst.cssH * 100 + '%';
      },
      onSelect: (sel) => {
        if (S.screen !== 'q' || S.index !== 0 || S.role !== role) return;
        const a = S.answers[role][0];
        const point = { x: sel.imageX / 1536 * 100, y: sel.imageY / 1024 * 100 };
        // 듣는 중에 그림을 만져도 목소리를 끊지 않고, 답으로 정하기 전에 먼저 물어봐요
        askOther(role, sel.toyLabel || '', point, a.choice === 'A' || a.choice === 'B');
      },
    });
  } catch { roomInst = null; }
}
function destroyRoom() { try { roomInst?.destroy(); } catch {} roomInst = null; }

/* 그림을 이미 골랐는데 방 그림을 또 누르면, 답을 몰래 바꾸지 않고 먼저 물어봐요 */
function askOther(role, toy, point, hadPick) {
  stage.querySelector('[data-ask-other]')?.remove();
  const box = document.createElement('div');
  box.className = 'ask-other'; box.setAttribute('data-ask-other', ''); box.setAttribute('role', 'group');
  const name = toy || (role === 'child' ? '이거' : '이곳');
  box.innerHTML = `<p>${role === 'child' ? `<b>${esc(josa(name, '가', '이'))}</b> 제일 먼저 보였어?` : `<b>${esc(name)}</b>, 이게 가장 먼저 보이셨나요?`}</p>
    <div class="bar-row"><button class="btn-soft" type="button" data-ask="keep">${role === 'child' ? (hadPick ? '아니, 아까 고른 거' : '아니, 그냥 눌러 봤어') : (hadPick ? '아니요, 고른 그대로' : '아니요, 그냥 눌러 봤어요')}</button><button class="btn-soft" type="button" data-ask="yes">${role === 'child' ? '응, 이게 먼저야' : '네, 이걸로 할게요'}</button></div>`;
  stage.querySelector('.scene')?.after(box);
  hidePointer();
  if (role === 'child' && voice.paused) play([{ f: 'ask-other' }]);
  [80, 400].forEach((ms) => setTimeout(() => revealAboveBar(box, true), ms));
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]'); if (!b) return;
    if (b.dataset.ask === 'yes') { S.answers[role][0].toy = toy; choose('other', point); }
    box.remove();
    if (b.dataset.ask !== 'yes' && role === 'child') later(childGuide, 600);
  });
}

/* 요소가 아래 고정 바에 가리지 않도록, 바 위로 다 보일 만큼 내려 줘요 */
function revealAboveBar(el, instant = false) {
  if (!el || !el.isConnected) return;
  const r = el.getBoundingClientRect(), barTop = document.body.classList.contains('typing') ? innerHeight : barEl.getBoundingClientRect().top;
  const over = r.bottom - (barTop - 12);
  if (over > 0) window.scrollBy({ top: Math.min(over, Math.max(0, r.top - 70)), behavior: instant || reduced() ? 'auto' : 'smooth' });
}
/* 2~5장: 장마다 크게 비춘 그림에서 누른 곳을 원본 그림 좌표로 바꿔, 원본 장난감 영역(room-hotspots)과 맞춰 봐요 */
function hitToy(ix, iy) {
  const H = window.SISEON_ROOM_HOTSPOTS; if (!H) return null;
  let best = null, bestArea = Infinity;
  for (const toy of H.toys) for (const sh of toy.shapes) {
    let hit = false, area = Infinity;
    if (sh.rect) { const [x, y, w, h] = sh.rect; hit = ix >= x && ix <= x + w && iy >= y && iy <= y + h; area = w * h; }
    else if (sh.ellipse) { const [cx, cy, rx, ry] = sh.ellipse; hit = ((ix - cx) / rx) ** 2 + ((iy - cy) / ry) ** 2 <= 1; area = Math.PI * rx * ry; }
    else if (sh.poly) { const P = sh.poly; let inside = false, a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > iy) !== (yj > iy) && ix < (xj - xi) * (iy - yi) / (yj - yi) + xi) inside = !inside; a += (xj + xi) * (yj - yi); } hit = inside; area = Math.abs(a / 2); }
    if (hit && area < bestArea) { best = toy; bestArea = area; }
  }
  return best;
}
let exploreTimer = 0;
function exploreScene(fig, e) {
  const img = fig.querySelector(':scope > img.art'); if (!img) return;
  const r = fig.getBoundingClientRect(), sc = Q[S.index].scene;
  const px = e.clientX - r.left, py = e.clientY - r.top;
  const ox = sc.x / 100 * r.width, oy = sc.y / 100 * r.height;
  const ux = ox + (px - ox) / sc.s, uy = oy + (py - oy) / sc.s;
  const H = window.SISEON_ROOM_HOTSPOTS;
  if (sc.img) { pointToChoices(false); return; }   // 장난감 위치 자료는 공통 방 그림에만 있어요
  const toy = hitToy(ux / r.width * H.imageWidth, uy / r.height * H.imageHeight);
  fig.querySelectorAll('.toy-pop').forEach((n) => n.remove());
  if (!toy) { pointToChoices(false); return; }
  const pop = document.createElement('span');
  pop.className = 'toy-pop'; pop.style.left = (px / r.width * 100) + '%'; pop.style.top = (py / r.height * 100) + '%';
  pop.innerHTML = `<i></i><b>${esc(toy.label)}</b>`;
  if (px / r.width > .62) pop.classList.add('flip');
  fig.appendChild(pop);
  boop();
  clearTimeout(exploreTimer); exploreTimer = setTimeout(() => pop.remove(), 1700);
}
/* 장난감을 눌렀을 때 작은 '퐁' 소리 */
function boop() {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(520, at); o.frequency.exponentialRampToValueAtTime(880, at + .09);
    g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.12, at + .015); g.gain.exponentialRampToValueAtTime(.0001, at + .22);
    o.connect(g).connect(actx.destination); o.start(at); o.stop(at + .24);
  } catch {}
}
/* 2~5장 큰 그림을 누르면, 아래 두 그림에서 고르도록 알려 줘요 */
let pointTimer = 0;
function pointToChoices(scroll = true) {
  const box = stage.querySelector('.choices'); if (!box) return;
  let tip = stage.querySelector('[data-scene-tip]');
  if (!tip) { tip = document.createElement('p'); tip.className = 'scene-tip'; tip.setAttribute('data-scene-tip', ''); tip.setAttribute('role', 'status'); box.before(tip); }
  tip.textContent = S.role === 'child' ? '아래 작은 그림 두 개 중에서 골라 줘!' : '아래 작은 그림 두 개 중에서 골라 주세요';
  box.classList.remove('nudge'); void box.offsetWidth; box.classList.add('nudge');
  if (scroll) revealAboveBar(box);
  if (S.role === 'child') { if (soundOn && voice.paused) play([{ f: hasVoice('scene-tip') ? 'scene-tip' : 'choices-ready' }], childGuide); else childGuide(); }
  /* 안내 글자는 안내 음성이 끝날 때까지 보여요 (scene-tip 음성 길이 + 0.4초, 최소 2.6초) */
  clearTimeout(pointTimer); pointTimer = setTimeout(() => { tip.remove(); box.classList.remove('nudge'); }, Math.max(2600, Math.round(((VOICE_SEC['scene-tip'] || 0) + 0.4) * 1000)));
}

/* 1장에서 방 그림 속 장난감을 답으로 고르면, 다른 장처럼 ‘고른 카드’로 또렷하게 보여 줘요 (보기 두 개는 그대로) */
function otherCardHtml(a) {
  const pt = a.point || { x: 50, y: 50 };
  return `<button class="choice other-card" type="button" data-act="other-card" data-v="other" aria-pressed="true">
    <span class="stamp">${I.check}</span>
    <span class="artbox"><span class="crop" style="background-position:${pt.x.toFixed(1)}% ${pt.y.toFixed(1)}%"></span><i class="crop-pin" aria-hidden="true"></i></span>
    <strong><small>그림에서 직접 골랐어요</small>${esc(a.toy || '그림 속 한 곳')}</strong></button>`;
}
/* ---------- 고르기 ---------- */
function choose(v, point = null) {
  const a = S.answers[S.role][S.index];
  const changed = a.choice !== v;
  a.choice = v;
  if (v !== 'other') { a.point = null; a.toy = ''; } else a.point = point;
  if (!S.startedAt) S.startedAt = new Date().toISOString();
  persist();
  stopVoice();
  stage.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  const fig = stage.querySelector('.scene');
  let pin = fig?.querySelector('.pin');
  if (v === 'other' && point && fig) { if (!pin) { pin = document.createElement('span'); pin.className = 'pin'; fig.appendChild(pin); } pin.style.left = point.x + '%'; pin.style.top = point.y + '%'; }
  else pin?.remove();
  const other = stage.querySelector('[data-other]');
  if (other) other.hidden = v === 'other';
  stage.querySelector('.other-card')?.remove();
  if (v === 'other') { const box = stage.querySelector('.choices'); box?.insertAdjacentHTML('beforeend', otherCardHtml(a)); setTimeout(() => revealAboveBar(box?.querySelector('.other-card')), 60); }
  const follow = stage.querySelector('[data-follow]');
  if (follow) {
    const wasHidden = follow.hidden; follow.hidden = false;
    if (changed) { const ch = follow.querySelector('[data-cheer]'); if (ch) ch.innerHTML = cheerHtml(S.role); if (S.role === 'child') play([{ f: 'praise-child-' + lastPick.childs }]); }
    if (wasHidden) setTimeout(() => revealAboveBar(follow.querySelector('[data-cheer]')), 80);
  }
  const next = barEl.querySelector('[data-act="q-next"]'); if (next) next.disabled = false;
  hidePointer(); if (S.role === 'child') later(childGuide, 1100); else later(() => pointAt(next), 900);
  const hint = barEl.querySelector('[data-hint]'); if (hint) { hint.textContent = ''; hint.className = 'bar-hint'; }
}

function setupMic() {
  const btn = stage.querySelector('[data-act="mic"]');
  if (!btn || !micSupported()) return;
  const status = stage.querySelector('.mic-status');
  const ta = stage.querySelector('#reason');
  rec = window.SiseonVoiceInput.create({
    status: (t) => { if (status) status.textContent = t; },
    text: (t) => { if (ta) { ta.value = t; S.answers[S.role][S.index].reason = t; persist(); } },
    end: () => { btn.setAttribute('aria-pressed', 'false'); btn.querySelector('span').textContent = '말로 적기'; },
  });
}

/* ---------- 이동 ---------- */
function go(screen, dir = 'next', extra = {}) { stopVoice(); Object.assign(S, { screen }, extra); render(dir); }
async function qNext() {
  const a = S.answers[S.role][S.index];
  if (!a.choice) { const hint = barEl.querySelector('[data-hint]'); if (hint) { hint.textContent = S.role === 'child' ? '아래 작은 그림 두 개 중 하나를 골라 줘' : '아래 작은 그림 두 개 중 하나를 골라 주세요'; hint.className = 'bar-hint err'; } return; }
  if (rec?.active) await micSettle();
  const ta = stage.querySelector('#reason'); if (ta) a.reason = ta.value;
  persist();
  if (S.index < Q.length - 1) { S.index++; render('next'); return; }
  if (S.role === 'child') go('childDone');
  else { S.finishedAt = S.finishedAt || null; go('handoffChild'); }
}
async function qBack() {
  if (rec?.active) await micSettle();
  const ta = stage.querySelector('#reason'); if (ta) S.answers[S.role][S.index].reason = ta.value;
  if (S.index > 0) { S.index--; render('back'); return; }
  if (S.role === 'child') go('childBook', 'back'); else go('handoffParent', 'back');
}
function resume() {
  if (!S.startedAt) return go('guide');
  if (S.resumeScreen && S.resumeScreen !== 'home') { S.screen = S.resumeScreen; delete S.resumeScreen; return render('next'); }
  if (!done('child')) { const i = S.answers.child.findIndex((a) => !a.choice); return go(i === 0 ? 'childBook' : 'q', 'next', { role: 'child', index: Math.max(0, i) }); }
  if (!done('adult')) { const i = S.answers.adult.findIndex((a) => !a.choice); return go(i === 0 ? 'handoffParent' : 'q', 'next', { role: 'adult', index: Math.max(0, i) }); }
  if (!S.eggs.child || !S.eggs.adult) return go('handoffChild');
  return go('result');
}

/* ---------- 알깨기 ---------- */
let eggTimer = 0, skipTimer = 0, eggSpoke = false;
function showSkip() { const b = barEl.querySelector('[data-act="egg-skip"]'); if (b) { b.hidden = false; barEl.querySelector('[data-skip-wait]')?.remove(); } }
function watchEgg() {
  clearTimeout(eggTimer); clearTimeout(skipTimer); eggSpoke = false;
  skipTimer = setTimeout(showSkip, 9000);
  eggTimer = setTimeout(() => { const st = stage.querySelector('[data-egg-status]'); if (st) st.textContent = '그림이 늦게 열리고 있어요. 아래 버튼으로 친구를 바로 만나도 돼요.'; showSkip(); }, 15000);
}
function hatched(role) {
  clearTimeout(eggTimer); clearTimeout(skipTimer);
  S.eggs[role] = true; persist();
  render('next', { still: false });
}
addEventListener('message', (e) => {
  const frame = document.getElementById('egg-frame');
  if (!frame || e.source !== frame.contentWindow || S.screen !== 'egg') return;
  const d = e.data || {};
  if (d.code !== code(S.eggStage)) return;
  if (d.type === 'siseon-egg-guide') {
    const st = stage.querySelector('[data-egg-status]');
    if (st && d.stage === 'ready') { clearTimeout(eggTimer); st.textContent = '알을 톡톡 눌러 봐!'; if (!eggSpoke) { eggSpoke = true; /* ‘친구를 만나러 가요’ 안내가 아직 나오는 중이면 끊지 않고 끝난 뒤에 이어요 */ if (eggLoadingOn && !voice.paused) queue.push({ f: 'egg-ready' }); else play([{ f: 'egg-ready' }]); } }
    if (st && d.stage === 'more') play([{ f: 'egg-more' }]);
    if (st && d.stage === 'error') { st.textContent = '그림을 불러오지 못했어요. 아래 버튼으로 친구를 바로 만나요.'; showSkip(); play([{ f: 'egg-error' }]); }
    return;
  }
  if (d.type === 'siseon-egg-hatched') setTimeout(() => hatched(S.eggStage), 1400);
});

/* ---------- 시트 ---------- */
function sheet({ title, body, yes, no, onYes }) {
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t"><h2 id="sheet-t">${title}</h2><p>${body}</p><button class="btn-main" type="button" data-s="yes">${yes}</button><button class="btn-soft" type="button" data-s="no">${no}</button></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('[data-s="no"]')) close();
    if (e.target.closest('[data-s="yes"]')) { close(); onYes(); }
  });
  back.querySelector('[data-s="no"]').focus();
}


/* ---------- 결과지 사진·인쇄용 PDF (원본처럼 A4 크기 그림으로 그려요) ---------- */
function loadImg(src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
async function renderSheet() {
  const W = 1240, H = 1754, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  try { await document.fonts.ready; } catch {}
  const body = getComputedStyle(document.body).fontFamily, title = '"Hippie", ' + body;
  const c = code('child'), p = code('adult');
  const [ci, pi, rb] = await Promise.all([loadImg(`egg/a/hog_${c}.png`), loadImg(`egg/a/hog_${p}.png`), loadImg('assets/rabbit-star.webp')]);
  const rect = (x, y, w, h, fill, r = 0, stroke) => { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
  const write = (text, x, y, width, size = 24, weight = 500, color = '#2A2622', face = body, align = 'left') => {
    ctx.font = `${weight} ${size}px ${face}`; ctx.fillStyle = color; ctx.textBaseline = 'top'; ctx.textAlign = align;
    let row = '', yy = y; const lh = size * 1.5;
    for (const ch of String(text ?? '')) { if (ch === '\n') { ctx.fillText(row, x, yy); row = ''; yy += lh; continue; } if (row && !/[.,!?)\]”’…·]/.test(ch) && ctx.measureText(row + ch).width > width) { ctx.fillText(row, x, yy); yy += lh; row = ch.trimStart(); } else row += ch; }
    if (row) ctx.fillText(row, x, yy); ctx.textAlign = 'left'; return yy + lh;
  };
  const fit = (im, x, y, w, h) => { if (!im) return; const s = Math.min(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s; ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); };
  const plain = (html) => html.replace(/<[^>]+>/g, '');
  rect(0, 0, W, H, '#FBF4E8');
  // 머리
  write('시선사이 · 같은 방, 다른 시선', 80, 70, 800, 24, 700, '#5E5348');
  const date = new Date(S.finishedAt || Date.now()).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  write((S.test ? '테스트 · ' : '') + date, W - 80, 72, 400, 22, 500, '#5E5348', body, 'right');
  write('우리 가족 정리 이야기', 80, 112, 1080, 64, 400, '#2E5B92', title);
  const same = Q.filter((_, i) => S.answers.child[i].choice && S.answers.child[i].choice === S.answers.adult[i].choice).length;
  write(`다섯 장 중 ${same}장이 같았어요. 다른 답도 다 좋아요.`, 80, 205, 1080, 26, 500, '#5E5348');
  // 두 친구
  [['child', c, ci, 80], ['adult', p, pi, 640]].forEach(([role, cc, im, x]) => {
    const pc = pv(cc).color;
    rect(x, 260, 520, 300, '#FFFDF8', 28, '#E4D6BF');
    ctx.save(); ctx.globalAlpha = .18; rect(x + 30, 290, 220, 220, pc, 110); ctx.restore();
    fit(im, x + 30, 285, 220, 240);
    write(role === 'child' ? '아이의 정리 친구' : '부모님의 정리 친구', x + 270, 300, 230, 22, 700, role === 'child' ? '#2E5B92' : '#7A4F2A');
    const end = write(characters[cc], x + 270, 335, 230, 34, 400, pc, title);
    rect(x + 270, end + 6, Math.min(230, 24 + pv(cc).trait.length * 22), 38, pc, 19);
    write(pv(cc).trait, x + 284, end + 12, 220, 21, 700, '#FFFFFF');
    write(cc, x + 270, end + 60, 230, 22, 700, '#5E5348');
  });
  // 그래프 (원본과 같은 네 갈래·안쪽/바깥쪽)
  rect(80, 590, 520, 470, '#FFFDF8', 28, '#E4D6BF');
  write('두 사람의 선택 비교', 110, 612, 460, 24, 700);
  const cx = 340, cy = 850, r1 = 62, r2 = 124, dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const pos = (i, r) => [cx + dirs[i][0] * r, cy + dirs[i][1] * r];
  ctx.strokeStyle = '#CDBBA0'; ctx.lineWidth = 2;
  [r1, r2].forEach((r) => { ctx.beginPath(); dirs.forEach((_, i) => { const [x, y] = pos(i, r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); });
  ctx.setLineDash([5, 5]); dirs.forEach((_, i) => { const [x, y] = pos(i, r2); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }); ctx.setLineDash([]);
  const pts = (cc) => graphAxes.map((ax, i) => pos(i, cc[ax.slot] === ax.inner ? r1 : r2));
  [['adult', '#7A4F2A', [9, 6]], ['child', '#2E5B92', []]].forEach(([role, col, dash]) => {
    const P = pts(role === 'child' ? c : p); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash(dash); ctx.beginPath(); P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    P.forEach(([x, y]) => { ctx.beginPath(); if (role === 'child') { ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); } else { ctx.rect(x - 11, y - 11, 22, 22); ctx.fillStyle = '#FFFDF8'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke(); } });
  });
  const labelAt = [[cx, cy - r2 - 60], [cx + r2 + 16, cy - 74], [cx, cy + r2 + 14], [cx - r2 - 16, cy - 74]];
  graphAxes.forEach((ax, i) => { const [x, y] = labelAt[i], al = i === 1 ? 'left' : i === 3 ? 'right' : 'center'; write(`${ax.inner} / ${ax.outer}`, x, y, 200, 22, 700, '#3D6152', body, al); write(Q[ax.q].title, x, y + 28, 200, 19, 500, '#2A2622', body, al); });
  write('● 아이   □ 부모님', 570, 616, 300, 20, 700, '#5E5348', body, 'right');
  // 부모님께 · 아이에게
  rect(640, 590, 520, 470, '#F2E6D6', 28);
  write('부모님께', 670, 612, 460, 22, 700, '#7A4F2A');
  let y = write('아이의 “더 놀고 싶은 마음”', 670, 645, 460, 34, 400, '#2A2622', title);
  forParent().forEach((l) => { y = write('· ' + plain(l), 670, y + 6, 460, 23, 500); });
  rect(80, 1090, 1080, 150, '#FFFDF8', 28, '#E4D6BF');
  fit(rb, 100, 1100, 120, 130);
  write('아이에게', 240, 1112, 900, 22, 700, '#2E5B92');
  write(`${characters[c]}: “다 놀고 제자리에 두면, 내일 또 금방 찾을 수 있어!”`, 240, 1148, 900, 27, 600);
  // 다섯 장
  write('같은 방, 두 사람의 선택', 80, 1270, 1080, 26, 700);
  rect(80, 1312, 1080, 46, '#2E5B92', 12);
  write('장', 104, 1322, 200, 21, 700, '#FFFFFF'); write('아이', 330, 1322, 380, 21, 700, '#FFFFFF'); write('부모님', 750, 1322, 380, 21, 700, '#FFFFFF');
  Q.forEach((q, i) => {
    const yy = 1358 + i * 62; rect(80, yy, 1080, 62, i % 2 ? '#F6EEE2' : '#FFFDF8');
    write(`${i + 1}. ${q.title}`, 104, yy + 8, 210, 21, 700);
    ['child', 'adult'].forEach((role, k) => { const a = S.answers[role][i]; const x = k ? 750 : 330; write(optionLabel(role, i, a.choice), x, yy + 6, 390, 20, 600); if (a.reason.trim()) write('“' + a.reason.trim().slice(0, 40) + '”', x, yy + 34, 390, 17, 500, '#5E5348'); });
  });
  write('재미로 보는 시선 놀이예요. 검증된 심리검사가 아니며, 성격이나 능력을 판단하지 않아요.', 80, 1690, 1080, 19, 500, '#8A7D70');
  return cv;
}
async function sheetPdf(jpeg, width, height) {
  // 원본 printPdf와 같은 방식: A4 한 장 가운데에 실제 크기(폭 190mm)로 넣어요
  const image = new Uint8Array(await jpeg.arrayBuffer()); const enc = new TextEncoder(); const chunks = [], offsets = [0]; let length = 0;
  const add = (d) => { const b = typeof d === 'string' ? enc.encode(d) : d; chunks.push(b); length += b.length; };
  const object = (...parts) => { offsets.push(length); add((offsets.length - 1) + ' 0 obj\n'); parts.forEach(add); add('\nendobj\n'); };
  const pw = 210 * 72 / 25.4, ph = 297 * 72 / 25.4, w = 190 * 72 / 25.4, h = w * height / width;
  const place = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${((pw - w) / 2).toFixed(2)} ${((ph - h) / 2).toFixed(2)} cm /J Do Q\n`;
  add('%PDF-1.6\n'); add(new Uint8Array([37, 226, 227, 207, 211, 10]));
  object('<< /Type /Catalog /Pages 2 0 R /ViewerPreferences << /PrintScaling /None >> >>');
  object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /J 4 0 R >> >> /Contents 5 0 R >>`);
  object(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`, image, '\nendstream');
  object(`<< /Length ${place.length} >>\nstream\n`, place, 'endstream');
  const xref = length; add(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`); offsets.slice(1).forEach((o) => add(`${String(o).padStart(10, '0')} 00000 n \n`));
  add(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
async function saveSheet(kind) {
  const st = stage.querySelector('[data-sheet-status]'); const say = (m) => { if (st) st.textContent = m; };
  say('결과지를 만들고 있어요…');
  try {
    const cv = await renderSheet();
    const jpg = await new Promise((res, rej) => cv.toBlob((b) => b ? res(b) : rej(new Error('jpg')), 'image/jpeg', .93));
    const data = kind === 'pdf' ? await sheetPdf(jpg, cv.width, cv.height) : jpg;
    const filename = kind === 'pdf' ? 'siseonsai-result-A4.pdf' : 'siseonsai-result.jpg';
    const dl = await downloads();
    if (dl) {
      try { await dl.save({ filename, data }); say(kind === 'pdf' ? 'PDF를 받았어요. 파일 앱에서 열어 인쇄할 수 있어요.' : '결과지 사진을 저장했어요.'); return; }
      catch (err) { if (err?.code === 'declined') { say('저장을 취소했어요.'); return; } }
    }
    /* 이 링크에서 파일 받기가 허락되지 않은 휴대폰: 결과지 사진을 크게 띄워 길게 눌러 저장하게 해요 */
    await showSheetPreview(jpg, kind);
    say(kind === 'pdf' ? '이 화면에서는 PDF를 바로 받을 수 없어요. 결과지 사진을 길게 눌러 저장해 주세요.' : '결과지 사진을 길게 눌러 사진첩에 저장해 주세요.');
  } catch (err) { say('결과지를 만들지 못했어요. 다시 눌러 주세요.'); }
}
async function showSheetPreview(jpg, kind) {
  const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(jpg); });
  document.querySelector('.sheet-preview')?.remove();
  const box = document.createElement('div');
  box.className = 'sheet-preview'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', '결과지 사진 저장');
  box.innerHTML = `<div class="sp-card"><p class="sp-tip"><b>사진을 길게 눌러</b> ‘사진에 저장’ 또는 ‘이미지 저장’을 골라 주세요.${kind === 'pdf' ? '<br><span>저장한 사진으로 인쇄할 수 있어요.</span>' : ''}</p>
    <img src="${url}" alt="우리 가족 결과지 사진"><button class="btn-main" type="button" data-sp-close><span class="label">닫기</span></button></div>`;
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('[data-sp-close]')) box.remove(); });
  document.body.appendChild(box);
  box.querySelector('[data-sp-close]').focus({ preventScroll: true });
}

/* ---------- 진행자 내보내기 ---------- */
async function showOwnerTools() {
  const u = await userCap();
  const can = u ? await Promise.resolve(u.canEdit?.()).catch(() => false) : false;
  const box = stage.querySelector('[data-owner]');
  if (box) box.hidden = !can;
}
async function exportCsv() {
  const st = stage.querySelector('[data-export-status]');
  const store = await db(), dl = await downloads();
  if (!store || !dl) { if (st) st.textContent = '이 화면에서는 내려받기를 쓸 수 없어요.'; return; }
  try {
    const snap = await store.collection('mobileRecords').get();
    const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const head = ['기록ID', '조사버전', '원본릴리스', '자극(그림)', '진행방식', '테스트여부', '시작', '마침', '역할', '유형', '정리친구'];
    Q.forEach((q, i) => head.push(`${i + 1}장 선택(${q.title})`, `${i + 1}장 보기`, `${i + 1}장 남긴말`));
    head.push('1장 위치 x%', '1장 위치 y%', '1장 장난감');
    const rows = [head];
    snap.docs.forEach((d) => {
      const r = d.data() || {};
      ['child', 'adult'].forEach((role) => {
        const p = r[role] || {}; const ans = p.answers || [];
        const row = [d.id, r.surveyVersion, r.sourceRelease, r.stimulus, r.mode, r.test ? '테스트' : '', r.startedAt, r.finishedAt, roleName[role], p.code, characters[p.code] || ''];
        ans.forEach((a) => row.push(a.choice, a.label, a.reason));
        const first = ans[0] || {};
        row.push(first.point ? first.point.x.toFixed(1) : '', first.point ? first.point.y.toFixed(1) : '', first.toy || '');
        rows.push(row);
      });
    });
    const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    await dl.save({ filename: `시선사이_모바일기록_${SURVEY_VERSION}_${stamp}.csv`, data: new Blob([csv], { type: 'text/csv' }) });
    if (st) st.textContent = `${snap.size}가족 기록을 내려받았어요.`;
  } catch (err) { if (st) st.textContent = err?.code === 'declined' ? '내려받기를 취소했어요.' : '내려받지 못했어요. 잠시 뒤 다시 눌러 주세요.'; }
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const act = t.dataset.act;
  // 화면이 막 바뀐 직후의 두 번째 톡은 무시해요 (아이가 연달아 눌러 다음 화면까지 넘어가지 않게)
  if (act !== 'sound' && act !== 'choose' && performance.now() - renderedAt < 700) return;
  switch (act) {
    case 'start': S = fresh(); S.startedAt = new Date().toISOString(); go('guide'); break;
    case 'resume': resume(); break;
    case 'open-result': go('result'); break;
    case 'home': go('home', 'back'); break;
    case 'open-child-book': go('childBook'); break;
    case 'guide-back': go('guide', 'back'); break;
    case 'open-child': go('q', 'next', { role: 'child', index: 0 }); break;
    case 'choose': choose(t.dataset.v); break;
    case 'other-card': stage.querySelector('.scene')?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); break;
    case 'scene-tap': exploreScene(t, e); break;
    case 'listen': play(questionVoice(S.index)); break;
    case 'q-next': qNext(); break;
    case 'q-back': qBack(); break;
    case 'child-review': go('q', 'back', { role: 'child', index: Q.length - 1 }); break;
    case 'to-parent': go('handoffParent'); break;
    case 'open-adult': go('q', 'next', { role: 'adult', index: 0 }); break;
    case 'to-egg': go('egg', 'next', { eggStage: S.eggs.child ? 'adult' : 'child' }); break;
    case 'egg-skip': hatched(S.eggStage); break;
    case 'egg-next':
      if (S.eggStage === 'child') go('egg', 'next', { eggStage: 'adult' });
      else { S.finishedAt = S.finishedAt || new Date().toISOString(); go('meet'); }
      break;
    case 'to-result': S.finishedAt = S.finishedAt || new Date().toISOString(); go('result'); break;
    case 'save-retry': S.savedId = null; saveRecord(); break;
    case 'export': exportCsv(); break;
    case 'save-image': saveSheet('jpg'); break;
    case 'save-pdf': saveSheet('pdf'); break;
    case 'intro-listen': if (!soundOn) { soundOn = true; try { localStorage.setItem(SOUND_KEY, 'on'); } catch {} } playIntro(t.dataset.who === 'adult' ? 'adult' : 'child'); break;
    case 'to-mission': stopVoice(); go('mission'); break;
    case 'mission-replay': stopVoice(); destroyMission(); mountMission(); break;
    case 'reason-open': {
      S.reasonOpen = S.role + S.index;
      const box = stage.querySelector('[data-reason]'); if (box) box.hidden = false; t.hidden = true;
      const ta = stage.querySelector('#reason'); if (ta) { ta.focus(); }
      break;
    }
    case 'chart-view': { const g = t.closest('.graph'); g.dataset.chartView = t.dataset.v; g.querySelectorAll('[data-act="chart-view"]').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); break; }
    case 'open-photo': S.hp = hpFresh(); if (photoUrl) S.hp.step = 1; go('photo'); break;
    case 'photo-again': if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; S.hp = hpFresh(); go('photo', 'back'); break;
    case 'photo-tap': {
      const img = t.querySelector('img'); if (!img) break;
      const r = img.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) break;
      const h = hp(), s = hpSteps[h.step - 1];
      h.pins[s.key][h.turn] = { x: +x.toFixed(1), y: +y.toFixed(1) }; persist();
      render(null, { still: true, keepScroll: true });
      later(() => pointAt(barEl.querySelector('[data-act="photo-next"]')), 900);
      break;
    }
    case 'photo-next': {
      const h = hp();
      if (h.turn === 'child') h.turn = 'adult'; else { h.turn = 'child'; h.step++; }
      render('next'); break;
    }
    case 'photo-back': {
      const h = hp();
      if (h.turn === 'adult') h.turn = 'child'; else if (h.step > 1) { h.step--; h.turn = 'adult'; } else { go('result', 'back'); break; }
      render('back'); break;
    }
    case 'sound':
      soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch {}
      if (!soundOn) stopVoice();
      try { roomInst?.setSound?.(soundOn, false); } catch {}
      headEl.innerHTML = headHtml();
      document.getElementById('egg-frame')?.contentWindow?.postMessage({ type: 'siseon-egg-controls', sound: soundOn, paused: false, narrating: false }, location.origin);
      break;
    case 'logo':
      if (S.screen === 'result' || !S.startedAt) { go('home', 'back'); break; }
      sheet({ title: '첫 화면으로 갈까요?', body: '지금까지 고른 답은 이 휴대폰에 그대로 남아 있어요. 첫 화면에서 ‘이어서 하기’를 누르면 같은 곳부터 다시 열려요.', yes: '첫 화면으로 가기', no: '계속하기', onYes: async () => { await micSettle(); const ta = stage.querySelector('#reason'); if (ta && S.screen === 'q') S.answers[S.role][S.index].reason = ta.value; persist(); S.resumeScreen = S.screen; S.screen = 'home'; render('back'); } });
      break;
    case 'ask-new':
      sheet({ title: '새 가족으로 시작할까요?', body: S.savedId ? '지금 결과는 모바일 검토 기록에 저장되어 있어요. 이 휴대폰의 답만 비우고 처음 화면으로 가요.' : '아직 저장되지 않은 답이 이 휴대폰에서 지워져요. 지우고 새로 시작할까요?', yes: '새 가족 시작', no: '그대로 두기', onYes: () => { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = null; S = fresh(); persist(); render('back'); } });
      break;
    case 'mic': {
      if (!rec) return;
      if (rec.active) { rec.stop(); return; }
      stopVoice();
      const ta = stage.querySelector('#reason');
      if (rec.start(ta?.value || '')) { t.setAttribute('aria-pressed', 'true'); t.querySelector('span').textContent = '마치기'; }
      break;
    }
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'reason' && S.screen === 'q') {
    if (e.isTrusted && rec?.active) rec.cancel();
    S.answers[S.role][S.index].reason = e.target.value; persist();
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'home-photo') {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(f);
    S.hp = hpFresh(); S.hp.step = 1; persist();
    render('next');
  }
});
document.addEventListener('focusin', (e) => {
  if (e.target.matches?.('textarea, input[type=text]')) {
    document.body.classList.add('typing');
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }), 250);
  }
});
document.addEventListener('focusout', (e) => {
  if (e.target.matches?.('textarea, input[type=text]')) setTimeout(() => { if (!document.activeElement?.matches?.('textarea, input[type=text]')) document.body.classList.remove('typing'); }, 150);
});
document.addEventListener('pointerdown', (e) => { const b = e.target.closest('.btn-main, .btn-soft, .btn-photo, .paw-next, .paw-back'); if (b && !b.disabled) b.classList.add('pressed'); }, { passive: true });
['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => document.addEventListener(n, () => document.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed')), { passive: true }));
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopVoice(); missionInst?.pause(); persist(); } else if (S.screen === 'mission') missionInst?.play(); });
addEventListener('pagehide', () => { persist(); destroyRoom(); destroyMission(); });

/* ---------- 글꼴: 제목 히피체 (SIL OFL 1.1, © AI올컷). 본문은 Noto Sans KR ---------- */
(async () => {
  try {
    const buf = await (await fetch('assets/fonts/hippie.woff2')).arrayBuffer();
    const face = new FontFace('Hippie', buf);
    await face.load(); document.fonts.add(face);
  } catch {}
})();

/* ---------- 시작: 새로고침하면 멈춘 곳에서 이어요 ---------- */
render(null, { still: true });
setTimeout(() => { warmAll(); }, 700);
})();
