const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const selectScreen = document.getElementById("selectScreen");
const modeScreen = document.getElementById("modeScreen");
const gameScreen = document.getElementById("gameScreen");
const startButton = document.getElementById("startButton");
const modeStartButton = document.getElementById("modeStartButton");
const modeBackButton = document.getElementById("modeBackButton");
const standardModeButton = document.getElementById("standardModeButton");
const endlessModeButton = document.getElementById("endlessModeButton");
const tutorialModeButton = document.getElementById("tutorialModeButton");
const titleButton = document.getElementById("titleButton");
const messageLayer = document.getElementById("messageLayer");
const messageTitle = document.getElementById("messageTitle");
const messageBody = document.getElementById("messageBody");
const resultIcon = document.getElementById("resultIcon");
const resultName = document.getElementById("resultName");
const resultStats = document.getElementById("resultStats");
const waveBadge = document.getElementById("waveBadge");
const lifeText = document.getElementById("lifeText");
const scoreText = document.getElementById("scoreText");
const shotText = document.getElementById("shotText");
const skillText = document.getElementById("skillText");
const statList = document.getElementById("statList");
const selectName = document.getElementById("selectName");
const selectDescription = document.getElementById("selectDescription");
const selectSubDescription = document.getElementById("selectSubDescription");
const selectRole = document.getElementById("selectRole");
const selectStatList = document.getElementById("selectStatList");
const selectCritical = document.getElementById("selectCritical");
const selectSkillList = document.getElementById("selectSkillList");
const selectArt = document.getElementById("selectArt");
const portraitArt = document.getElementById("portraitArt");
const characterName = document.getElementById("characterName");
const characterType = document.getElementById("characterType");
const skillDescription = document.getElementById("skillDescription");
const characterOptions = document.querySelectorAll(".character-option");

const W = canvas.width;
const H = canvas.height;
const WIND_BLADE_RADIUS = 62;
const MEW_LASER_RADIUS = 32;
let audioCtx = null;
let masterGain = null;
const soundCooldowns = {};

function ensureAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioCtx = new AudioContextClass();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.28;
  masterGain.connect(audioCtx.destination);
}

function playSound(name) {
  ensureAudio();
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;
  const cooldown = {
    wall: 0.035,
    block: 0.035,
    paddle: 0.045,
    destroy: 0.03,
    explosion: 0.08,
    laser: 0.09,
    charge: 0.18
  }[name] || 0;
  if (soundCooldowns[name] && now - soundCooldowns[name] < cooldown) return;
  soundCooldowns[name] = now;

  if (name === "wall") playTone(620, 0.045, "triangle", 0.12, 0, 0.55);
  if (name === "block") playTone(420, 0.055, "square", 0.1, 0, 0.45);
  if (name === "paddle") {
    playTone(260, 0.055, "sine", 0.16, 0, 0.45);
    playTone(520, 0.075, "triangle", 0.08, 0.015, 0.55);
  }
  if (name === "destroy") {
    playTone(760, 0.08, "triangle", 0.12, 0, 0.5);
    playNoise(0.08, 0.09, 0, "highpass", 900);
  }
  if (name === "explosion") {
    playTone(110, 0.2, "sawtooth", 0.16, 0, 0.18);
    playNoise(0.28, 0.22, 0, "lowpass", 900);
  }
  if (name === "laser") {
    playTone(880, 0.09, "sawtooth", 0.09, 0, 1.45);
    playTone(1320, 0.12, "triangle", 0.08, 0.015, 1.25);
  }
  if (name === "charge") {
    playTone(330, 0.22, "sine", 0.11, 0, 1.9);
    playTone(660, 0.18, "triangle", 0.08, 0.05, 1.7);
  }
}

function playTone(freq, duration, type, volume, delay = 0, endRatio = 1) {
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * endRatio), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function playNoise(duration, volume, delay = 0, filterType = "bandpass", frequency = 700) {
  const t = audioCtx.currentTime + delay;
  const sampleRate = audioCtx.sampleRate;
  const buffer = audioCtx.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();
  filter.type = filterType;
  filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(t);
}

const character = {
  name: "彩",
  stars: {
    LIFE: 1,
    ATTACK: 5,
    WIDE: 1,
    SPEED: 5,
    "CT補正": 5,
    GUIDE: 2
  },
  critType: "side"
};

const starText = value => "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);

const statScaling = {
  life: [0, 1.1, 1.2, 1.3, 1.4, 1.5],
  attack: [0, 100, 150, 200, 250, 300],
  wide: [0, 0.8, 0.9, 1.0, 1.1, 1.2],
  speed: [0, 0.6, 0.8, 1.0, 1.25, 1.5],
  cooldown: [0, 1.0, 1.2, 1.5, 1.75, 2.0]
};

const stats = {
  maxLife: Math.ceil(8 * statScaling.life[character.stars.LIFE]),
  attack: statScaling.attack[character.stars.ATTACK],
  paddleWidth: 132 * statScaling.wide[character.stars.WIDE],
  paddleSpeed: 560 * statScaling.speed[character.stars.SPEED],
  cooldownMultiplier: statScaling.cooldown[character.stars["CT補正"]],
  guide: character.stars.GUIDE
};

const roster = {
  aya: {
    id: "aya",
    name: "彩",
    type: "ATTACKER",
    image: "assets/aya.png",
    description: "黒い炎を操る高火力キャラ。ピンチ時にバンパー全体がクリティカル判定になります。",
    stars: { LIFE: 1, ATTACK: 5, WIDE: 1, SPEED: 5, "CT補正": 5, GUIDE: 2 },
    critTypes: ["side"],
    skills: [
      ["パッシブ", "ブロックが下3分の1に到達している間、バンパー全体がクリティカル判定になり、CT短縮速度がさらに2倍。"],
      ["クリティカル", "ブロックに当たると広範囲に爆発し、ATTACKの150%ダメージ。"],
      ["スペシャル", "バンパーを中心に円を描く炎弾を発射。"]
    ]
  },
  mew: {
    id: "mew",
    name: "ミュー",
    type: "ALL ROUNDER",
    image: "assets/mew.png",
    description: "電撃・風・水を使い分ける万能型。長いガイドと複合クリティカルが強みです。",
    stars: { LIFE: 3, ATTACK: 3, WIDE: 2, SPEED: 4, "CT補正": 3, GUIDE: 5 },
    critTypes: ["center", "corner"],
    skills: [
      ["パッシブ", "WAVE中にクリティカルを10回発動するとLIFEが1回復。"],
      ["中央クリティカル", "電撃で判定拡大・高速化・貫通。上の壁に当たると解除。"],
      ["角クリティカル", "風の刃で周囲にATTACKの50%ダメージ。左右の壁をすり抜け、バンパーに触れると解除。"],
      ["スペシャル", "画面上の全ボールからマウス位置へ水レーザーを放つ。"]
    ]
  },
  hitomi: {
    id: "hitomi",
    name: "ひとみ",
    type: "DIFENDER",
    image: "assets/hitomi.png",
    description: "冷気で時間を遅らせる耐久型。広いバンパーと氷壁でボールを守ります。",
    stars: { LIFE: 5, ATTACK: 2, WIDE: 5, SPEED: 1, "CT陬懈ｭ｣": 1, GUIDE: 3 },
    critTypes: ["center"],
    skills: [
      ["パッシブ", "ボールを落とした時、バンパー下に一度だけ反射する氷壁を設置。1WAVE中3回まで。"],
      ["中央クリティカル", "ボールをバンパーに保持し、再クリックで同時発射。保持発射弾は次にバンパーへ触れるまでATTACK3倍。"],
      ["スペシャル", "5秒間時間を凍結し、ブロックの進行を停止。"]
    ]
  },
  seina: {
    id: "seina",
    name: "星奈",
    type: "TRICK STAR",
    image: "assets/seina.png",
    description: "重力とロックオンで確実に当てるトリッキーなキャラ。反射するほどボールが育ちます。",
    stars: { LIFE: 2, ATTACK: 2, WIDE: 2, SPEED: 2, "CT補正": 4, GUIDE: 1 },
    critTypes: ["corner"],
    skills: [
      ["パッシブ", "バンパー反射ごとにボールの威力と速度が少し上昇。最大5回。"],
      ["クリティカル", "近いブロック2つをロックオンし、ボールが強く吸い寄せられる。"],
      ["スペシャル", "5秒間、マウス位置にブラックホールを発生させ、発射済みボールを吸い寄せる。"]
    ]
  }
};

const selectDetails = {
  aya: {
    name: "彩",
    role: "ATTACKER",
    description: "黒い炎を操り、爆発での範囲攻撃を得意とするアタッカー。",
    subDescription: "ピンチ時はバンパー全体がクリティカルに！",
    critical: "クリティカル判定 横",
    stats: { LIFE: 1, ATTACK: 5, WIDE: 1, SPEED: 5, "CT補正": 5, GUIDE: 2 },
    skills: [
      ["パッシブ", "ピンチ時、バンパー全体がクリティカル＆CTの短縮速度がさらに加速。"],
      ["チャージショット", "ブロックをすり抜け、壁に跳ね返るたびに爆発するボールを発射する。このボールは壁で乱反射する。"],
      ["クリティカルスキル(横)", "ブロックに当たると爆発し広範囲にダメージ。"],
      ["スペシャルスキル", "たくさんの壁に触れるほど強力になる炎弾を発射する。ブロックかバンパーに触れると爆発を起こす。"]
    ]
  },
  mew: {
    name: "ミュー",
    role: "ALL ROUNDER",
    description: "バランスのいいステータスと2つのクリティカルを持つ万能型。",
    subDescription: "状況に応じて変幻自在にスキルを使い分けよう！",
    critical: "クリティカル判定 中央＆角",
    stats: { LIFE: 3, ATTACK: 3, WIDE: 2, SPEED: 4, "CT補正": 3, GUIDE: 5 },
    skills: [
      ["パッシブ", "WAVE中にクリティカルを10回発動するとLIFEが1回復する。"],
      ["チャージショット", "触れた壁やバンパーにマーカーを設置するボールを射出する。上下左右4つの面にマーカーの設置が成功すると画面全体に光の魔法で追撃。"],
      ["クリティカルスキル(中央)", "ボールに貫通効果を付与して上方向に攻撃。さらに最大5本の雷撃がランダムな縦列に追撃。"],
      ["クリティカルスキル(角)", "ボールの周囲に風の刃による攻撃判定を付与する。左右の壁をすり抜けて反対側から出現する。"],
      ["スペシャルスキル", "バンパーと画面上の発射済みのボールからマウスポインタの座標目掛けて貫通する水のレーザーで攻撃。"]
    ]
  },
  hitomi: {
    name: "ひとみ",
    role: "DEFENDER",
    description: "広いバンパーと氷壁でボールを守る耐久型。",
    subDescription: "スペシャルスキルで時間をも凍てつかせる。",
    critical: "クリティカル判定 中央",
    stats: { LIFE: 5, ATTACK: 2, WIDE: 5, SPEED: 1, "CT補正": 1, GUIDE: 3 },
    skills: [
      ["パッシブ1", "ボールを発射した時、バンパーの下に氷壁を設置する。氷壁は一度だけボールを反射する。"],
      ["パッシブ2", "ボールが2つ以上発射された状態の時、ボールが壁に反射するたびに極小ダメージの雪の結晶を3方向に拡散する。"],
      ["チャージショット", "マウスポインタの位置にボールを閉じ込める結界を設置する。チャージショットしたボールは結界に入ると2つに分裂する。"],
      ["クリティカルスキル(中央)", "ボールをバンパーで停止させ、再度発射できる状態にする。"],
      ["スペシャルスキル", "時間を凍結させて10秒の間、ブロックの進行を停止させる。"]
    ]
  },
  seina: {
    name: "星奈",
    role: "TRICK STAR",
    description: "重力とロックオンでボールの軌道を変えるトリッキーなキャラ。",
    subDescription: "バンパーで反射するほどボールが強化！",
    critical: "クリティカル判定 角",
    stats: { LIFE: 2, ATTACK: 2, WIDE: 2, SPEED: 2, "CT補正": 4, GUIDE: 1 },
    skills: [
      ["パッシブ1", "バンパーにボールが反射するたび、そのボールの威力と速度がアップする(最大Lv5)。"],
      ["パッシブ2", "Lv5状態のボールをクリティカルした時、ロックオンするブロックの数が+1。さらに、クリティカル中のボールは貫通効果を得る。"],
      ["チャージショット", "チャージショットされたボールは3秒間隔でボールから最も近いブロック一つをロックオン状態にする。この効果は1回のチャージショットで5回まで発動する。"],
      ["クリティカルスキル(角)", "バンパーに近い2つのブロックをロックオンする。ボールはロックオン状態のブロックに強く吸い寄せられるように軌道を曲げる。"],
      ["スペシャルスキル", "マウスポインタの位置に5秒間継続するブラックホールを発生させる。ブラックホールはすべてのボールを引き寄せる。"]
    ]
  }
};

let selectedCharacterId = "aya";
let selectedGameMode = "standard";
const modeButtons = [standardModeButton, endlessModeButton].filter(Boolean);
if (tutorialModeButton) modeButtons.push(tutorialModeButton);

const keys = new Set();
let pointer = { x: W / 2, y: H / 2 };
let lastTime = 0;
let game = null;
let leftPressStarted = 0;
let suppressNextClick = false;
let barrierId = 0;

function createGame() {
  return {
    mode: "playing",
    gameMode: selectedGameMode,
    wave: 1,
    life: stats.maxLife,
    paddle: {
      x: W / 2,
      y: H - 58,
      w: stats.paddleWidth,
      h: 18
    },
    balls: [],
    particles: [],
    ripples: [],
    lasers: [],
    items: [],
    mewSpecialBursts: [],
    hitomiBarriers: [],
    heldBalls: [],
    catchWall: null,
    hitomiLowerWall: null,
    blackHole: null,
    blocks: [],
    cooldown: 0,
    cooldownBase: 1.4,
    skillUsed: false,
    skillHold: 0,
    criticalCount: 0,
    catchWallUses: 0,
    freezeTime: 0,
    rightHeld: false,
    enteringWave: false,
    scrollCarry: 0,
    tutorialPhase: 0,
    score: 0,
    waveScore: 0,
    destroyedBlocks: 0,
    combo: 0,
    chain: 0,
    globalHitsSincePaddle: 0,
    maxCombo: 0,
    maxHits: 0,
    maxChain: 0,
    fullComboCount: 0,
    lastDestroyTime: -Infinity,
    waveDropped: false,
    time: 0,
    shake: 0
  };
}

function buildWave(wave) {
  if (game.gameMode === "tutorial") {
    buildTutorialWave(wave);
    return;
  }
  if (game.gameMode === "endless") {
    buildEndlessWave(wave);
    return;
  }

  const cols = 10;
  const rows = Math.min(4 + wave, 8);
  const gap = 8;
  const margin = 34;
  const bw = (W - margin * 2 - gap * (cols - 1)) / cols;
  const bh = 34;
  const blockCount = [0, 25, 30, 35, 40, 45][wave] || 45;
  const entryOffset = rows * (bh + gap) + 96;
  game.blocks = [];
  game.enteringWave = true;
  game.scrollCarry = 0;

  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) cells.push({ row, col });
  }
  cells
    .sort(() => Math.random() - 0.5)
    .slice(0, blockCount)
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .forEach(({ row, col }) => {
      const hp = Math.ceil((stats.attack * (0.72 + wave * 0.18 + row * 0.09)) / 50) * 50;
      const targetY = 42 + row * (bh + gap);
      game.blocks.push({
        x: margin + col * (bw + gap),
        y: targetY - entryOffset,
        targetY,
        w: bw,
        h: bh,
        hp,
        maxHp: hp
      });
    });
}

function buildTutorialWave(wave) {
  const gap = 8;
  const bw = 72;
  const bh = 34;
  const startX = W / 2 - (bw * 4 + gap * 3) / 2;
  const startY = H * 0.66 + 28;
  game.blocks = [];
  game.enteringWave = false;
  game.scrollCarry = 0;
  game.tutorialPhase = 0;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const x = startX + col * (bw + gap);
      const y = startY + row * (bh + gap);
      game.blocks.push({
        x,
        y,
        baseX: x,
        baseY: y,
        w: bw,
        h: bh,
        hp: 100,
        maxHp: 100,
        tutorialBlock: true
      });
    }
  }
}

function buildEndlessWave(wave) {
  const cols = 10;
  const rows = Math.min(3 + Math.floor(wave * 0.65), 14);
  const gap = 8;
  const margin = 34;
  const bw = (W - margin * 2 - gap * (cols - 1)) / cols;
  const bh = 34;
  const density = Math.min(0.35 + wave * 0.035, 0.92);
  const minFill = Math.max(3, Math.ceil(cols * Math.max(0.3, density - 0.16)));
  const maxFill = Math.min(cols, Math.ceil(cols * density));
  game.blocks = [];
  game.enteringWave = false;
  game.scrollCarry = 0;

  for (let row = 0; row < rows; row++) {
    const fillCount = randomInt(minFill, maxFill);
    const rowCols = Array.from({ length: cols }, (_, index) => index)
      .sort(() => Math.random() - 0.5)
      .slice(0, fillCount)
      .sort((a, b) => a - b);

    for (const col of rowCols) {
      const hp = Math.ceil((stats.attack * (0.8 + wave * 0.22 + row * 0.1)) / 50) * 50;
      const y = row === 0 ? 42 : -bh - gap - (row - 1) * (bh + gap);
      game.blocks.push({
        x: margin + col * (bw + gap),
        y,
        w: bw,
        h: bh,
        hp,
        maxHp: hp
      });
    }
  }

  assignEndlessSpecialBlocks(wave);
}

function assignEndlessSpecialBlocks(wave) {
  const candidates = game.blocks.slice().sort(() => Math.random() - 0.5);
  const take = () => candidates.shift();

  const steelCount = Math.floor(wave / 2);
  for (let i = 0; i < steelCount; i++) {
    const block = take();
    if (!block) break;
    block.steel = true;
    block.hp = Infinity;
    block.maxHp = Infinity;
  }

  for (let i = 0; i < 2; i++) {
    const block = take();
    if (!block) break;
    block.bomb = true;
  }

  const heartBlock = take();
  if (heartBlock) heartBlock.heart = true;
}

function renderStats() {
  if (!statList) return;
  statList.innerHTML = "";
  Object.entries(character.stars).forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `<span>${displayStatLabel(label)}</span><span class="stars">${formatStars(value)}</span>`;
    statList.appendChild(row);
  });
}

function computeStatsFor(source) {
  return {
    maxLife: Math.ceil(8 * statScaling.life[source.stars.LIFE]),
    attack: statScaling.attack[source.stars.ATTACK],
    paddleWidth: 132 * statScaling.wide[source.stars.WIDE],
    paddleSpeed: 560 * statScaling.speed[source.stars.SPEED],
    cooldownMultiplier: statScaling.cooldown[source.stars["CT補正"]],
    guide: source.stars.GUIDE
  };
}

function applyCharacter(id) {
  selectedCharacterId = id;
  const source = roster[id];
  if (id === "hitomi") {
    source.skills[0] = [
      "\u30d1\u30c3\u30b7\u30d61",
      "\u30dc\u30fc\u30eb\u3092\u30b7\u30e7\u30c3\u30c8\u3057\u305f\u6642\u3001\u30dc\u30fc\u30eb\u30921\u56de\u53cd\u5c04\u3059\u308b\u4e0b\u58c1\u3092\u8a2d\u7f6e\u3002\u30af\u30ea\u30c6\u30a3\u30ab\u30eb\u30b9\u30ad\u30eb\u3067\u518d\u767a\u5c04\u3057\u305f\u969b\u306b\u3082\u540c\u69d8\u306b\u4e0b\u58c1\u3092\u5c55\u958b\u3002"
    ];
  }
  if (id === "hitomi" && !source.skills.some(([title]) => title === "パッシブ2")) {
    source.skills.splice(1, 0, ["パッシブ2", "ボールが画面上に2つ以上ある時、壁反射で3方向に雪の結晶を発射。"]);
  }
  if (id === "seina" && !source.skills.some(([title]) => title === "\u30d1\u30c3\u30b7\u30d62")) {
    source.skills.splice(1, 0, [
      "\u30d1\u30c3\u30b7\u30d62",
      "\u30d1\u30c3\u30b7\u30d61\u3067\u6700\u5927\u307e\u3067\u5f37\u5316\u3057\u305f\u30dc\u30fc\u30eb\u3092\u30af\u30ea\u30c6\u30a3\u30ab\u30eb\u3059\u308b\u3068\u3001\u30ed\u30c3\u30af\u30aa\u30f3\u6570+1\u3002\u3055\u3089\u306b\u305d\u306e\u30dc\u30fc\u30eb\u306f\u30ed\u30c3\u30af\u30aa\u30f3\u4e2d\u3001\u30d6\u30ed\u30c3\u30af\u3092\u8cab\u901a\u3002"
    ]);
  }
  Object.assign(character, source, { stars: { ...source.stars }, critTypes: [...source.critTypes] });
  Object.assign(stats, computeStatsFor(source));
  if (!stats.cooldownMultiplier) {
    const cooldownStars = Object.entries(source.stars).find(([label]) => label.startsWith("CT"))?.[1] ?? 1;
    stats.cooldownMultiplier = statScaling.cooldown[cooldownStars];
  }
  renderCharacterUi();
  renderStats();
}

function renderCharacterUi() {
  const selectInfo = selectDetails[character.id];
  selectName.textContent = selectInfo.name;
  selectRole.textContent = selectInfo.role;
  selectDescription.textContent = selectInfo.description;
  selectSubDescription.textContent = selectInfo.subDescription;
  renderSelectStats(selectInfo);
  selectCritical.textContent = selectInfo.critical;
  renderSelectSkills(selectInfo);
  selectArt.src = character.image;
  portraitArt.src = characterIconPath(character.id);
  characterName.textContent = selectInfo.name;
  characterType.textContent = character.type;
  skillDescription.innerHTML = selectInfo.skills
    .map(([title, body]) => `<div class="play-skill-item"><b>${title}</b><span>${body}</span></div>`)
    .join("");
  characterOptions.forEach(button => {
    button.classList.toggle("active", button.dataset.character === selectedCharacterId);
  });
}

function renderSelectStats(selectInfo) {
  selectStatList.innerHTML = "";
  Object.entries(selectInfo.stats).forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "select-stat-row";
    row.innerHTML = `<span>${label}</span><span class="stars">${formatStars(value)}</span>`;
    selectStatList.appendChild(row);
  });
}

function renderSelectSkills(selectInfo) {
  selectSkillList.innerHTML = selectInfo.skills
    .map(([title, body]) => `<div class="select-skill-item"><b>${title}</b><span>${body}</span></div>`)
    .join("");
}

function characterIconPath(id) {
  return `assets/icons/${id}-icon.png`;
}

function formatStars(value) {
  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

function displayStatLabel(label) {
  return label.startsWith("CT") ? "CT補正" : label;
}

function formatStars(value) {
  return "\u2605".repeat(value) + "\u2606".repeat(5 - value);
}

function displayStatLabel(label) {
  return label.startsWith("CT") ? "CT\u88dc\u6b63" : label;
}

function startGame() {
  ensureAudio();
  game = createGame();
  buildWave(1);
  selectScreen.classList.add("hidden");
  modeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  messageLayer.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function showModeSelect() {
  ensureAudio();
  selectGameMode(selectedGameMode);
  selectScreen.classList.add("hidden");
  modeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
  messageLayer.classList.add("hidden");
}

function showCharacterSelect() {
  modeScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  selectScreen.classList.remove("hidden");
}

function selectGameMode(mode) {
  selectedGameMode = mode;
  modeButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

function restartGame() {
  ensureAudio();
  game = createGame();
  buildWave(1);
  messageLayer.classList.add("hidden");
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function fireBall(charged = false) {
  if (!game || game.mode !== "playing") return;
  if (game.gameMode === "tutorial") game.life = stats.maxLife;
  if (character.id === "hitomi" && game.heldBalls.length > 0) {
    releaseHeldBalls();
    return;
  }
  if (!hasLoadedBall()) return;
  const chargeShot = charged && canUseChargeShot();
  const origin = loadedBallPosition();
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const speed = 430;

  const ball = {
    x: origin.x,
    y: origin.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    r: 7,
    damage: stats.attack,
    explosive: false,
    pierce: false,
    hitsSincePaddle: 0,
    trail: []
  };

  if (chargeShot) {
    applyChargeShot(ball);
    ball.chargeShotType = character.id;
    playSound("charge");
  }

  game.balls.push(ball);
  game.life -= chargeShot ? 2 : 1;
  if (game.gameMode === "tutorial") game.life = stats.maxLife;
  game.cooldown = game.cooldownBase;
  deployHitomiLowerWall();
}

function releaseHeldBalls() {
  const origin = loadedBallPosition();
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const baseAngle = Math.atan2(dy, dx);
  const count = game.heldBalls.length;
  const speed = 430;

  game.heldBalls.splice(0).forEach((held, index) => {
    const offset = (index - (count - 1) / 2) * 0.13;
    const angle = Math.min(baseAngle + offset, -0.18);
    game.balls.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 7,
      damage: stats.attack * 3,
      boosted: true,
      explosive: false,
      pierce: false,
      hitsSincePaddle: 0,
      trail: []
    });
  });
  deployHitomiLowerWall();
  burst(origin.x, origin.y, "#b7f8ff", 24);
}

function fireSpecial() {
  if (game.skillUsed) return;
  if (character.id === "mew") {
    fireMewSpecial();
    return;
  }
  if (character.id === "hitomi") {
    game.skillUsed = true;
    game.freezeTime = 10;
    burst(W / 2, H / 2, "#b7f8ff", 80);
    return;
  }
  if (character.id === "seina") {
    game.skillUsed = true;
    game.blackHole = { x: pointer.x, y: pointer.y, life: 5 };
    burst(pointer.x, pointer.y, "#b34dff", 70);
    return;
  }
  fireAyaSpecial();
}

function fireAyaSpecial() {
  game.skillUsed = true;
  const origin = loadedBallPosition();
  let dx = pointer.x - origin.x;
  let dy = pointer.y - origin.y;
  if (Math.hypot(dx, dy) < 1) {
    dx = 0;
    dy = -1;
  }
  const len = Math.max(1, Math.hypot(dx, dy));
  const speed = 430;
  game.balls.push({
    x: origin.x,
    y: origin.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    r: 7,
    damage: stats.attack * 0.6,
    explosive: false,
    pierce: true,
    trail: [],
    special: true,
    ayaFlameSpecial: true,
    touchedWalls: new Set()
  });
  burst(origin.x, origin.y, "#ff7a22", 30);
}

function fireMewSpecial() {
  game.skillUsed = true;
  const sources = game.balls
    .filter(ball => !ball.special && !ball.snowflake)
    .map(ball => ({ type: "ball", ball }));
  sources.push({ type: "paddle" });

  game.mewSpecialBursts = [
    { delay: 0.1, damage: 0.2 },
    { delay: 0.2, damage: 0.2 },
    { delay: 0.3, damage: 0.2 },
    { delay: 0.7, damage: 0.4 }
  ].map(pulse => ({
    ...pulse,
    targetX: pointer.x,
    targetY: pointer.y,
    sources
  }));
  burst(pointer.x, pointer.y, "#5fefff", 30);
}

function loop(now) {
  if (!game) return;
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (game.mode === "playing") {
    update(dt);
  }
  draw();
  updateHud();

  if (game.mode === "playing") requestAnimationFrame(loop);
}

function update(dt) {
  game.time += dt;
  game.freezeTime = Math.max(0, game.freezeTime - dt);
  const paddle = game.paddle;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) paddle.x -= stats.paddleSpeed * dt;
  if (keys.has("ArrowRight") || keys.has("KeyD")) paddle.x += stats.paddleSpeed * dt;
  paddle.x = clamp(paddle.x, paddle.w / 2 + 12, W - paddle.w / 2 - 12);

  const danger = character.id === "aya" && isDangerActive();
  const ctBoost = stats.cooldownMultiplier * (danger ? 2 : 1);
  game.cooldown = Math.max(0, game.cooldown - dt * ctBoost);

  if (game.rightHeld && !game.skillUsed) {
    game.skillHold += dt;
    if (game.skillHold > 0.42) fireSpecial();
  }

  if (game.gameMode === "tutorial") {
    updateTutorialMode(dt);
  } else if (game.freezeTime <= 0) {
    scrollBlocks(dt);
  }
  updateBalls(dt);
  updateParticles(dt);
  updateRipples(dt);
  updateLasers(dt);
  updateItems(dt);
  updateMewSpecialBursts(dt);
  updateHitomiBarriers(dt);
  updateBlackHole(dt);
  updateTutorialResources();

  if (isWaveCleared()) nextWave();
  if (game.blocks.some(block => block.y + block.h >= game.paddle.y - 4)) {
    endGame("GAME OVER", "ブロックがバンパーラインに到達しました。");
  }
  if (game.life <= 0 && game.balls.length === 0 && game.heldBalls.length === 0) {
    endGame("GAME OVER", "すべての弾を撃ち切った状態でボールを落としました。");
  }
}

function scrollBlocks(dt) {
  if (game.enteringWave) {
    const entrySpeed = game.gameMode === "endless" ? 250 + game.wave * 28 : 220 + game.wave * 16;
    let settled = true;

    game.blocks.forEach(block => {
      if (block.y < block.targetY) {
        block.y = Math.min(block.targetY, block.y + entrySpeed * dt);
      }
      if (block.y < block.targetY) settled = false;
    });

    if (settled) {
      game.enteringWave = false;
      game.blocks.forEach(block => delete block.targetY);
    }
    return;
  }

  const speed = game.gameMode === "endless" ? 5.4 + game.wave * 0.95 : 4.5 + game.wave * 0.55;
  game.scrollCarry += speed * dt;
  if (game.scrollCarry < 1) return;
  const move = Math.floor(game.scrollCarry);
  game.scrollCarry -= move;
  game.blocks.forEach(block => block.y += move);
}

function updateTutorialMode(dt) {
  game.life = stats.maxLife;
  if (game.freezeTime > 0) return;
  game.tutorialPhase += dt;
  const offset = Math.sin(game.tutorialPhase * 1.35) * 82;
  game.blocks.forEach(block => {
    if (!block.tutorialBlock) return;
    block.x = block.baseX + offset;
    block.y = block.baseY;
  });
}

function updateTutorialResources() {
  if (game.gameMode !== "tutorial") return;
  game.life = stats.maxLife;
  if (!game.skillUsed) return;

  const activeSpecialBall = game.balls.some(ball => ball.special || ball.ayaFlameSpecial);
  const activeEffect =
    activeSpecialBall ||
    game.mewSpecialBursts.length > 0 ||
    game.freezeTime > 0 ||
    !!game.blackHole;
  if (!activeEffect && !game.rightHeld) {
    game.skillUsed = false;
    game.skillHold = 0;
  }
}

function updateBalls(dt) {
  for (let i = game.balls.length - 1; i >= 0; i--) {
    const ball = game.balls[i];
    if (ball.hitomiChargeGlow) ball.hitomiChargeGlow = Math.max(0, ball.hitomiChargeGlow - dt);
    updateSeinaChargeShot(ball, dt);
    applySeinaForces(ball, dt);
    if (ball.ayaFlameSpecial) {
      updateAyaFlameSpecial(ball, dt);
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
    } else if (ball.special) {
      const centerX = game.paddle.x;
      const centerY = game.paddle.y;
      const previousAngle = ball.orbitAngle;
      ball.orbitAngle += ball.orbitSpeed * dt;
      ball.orbitTurns += Math.abs(ball.orbitAngle - previousAngle) / (Math.PI * 2);
      ball.x = centerX + Math.cos(ball.orbitAngle) * ball.orbitRadius;
      ball.y = centerY + Math.sin(ball.orbitAngle) * ball.orbitRadius;
      ball.vx = -Math.sin(ball.orbitAngle) * ball.orbitRadius * ball.orbitSpeed;
      ball.vy = Math.cos(ball.orbitAngle) * ball.orbitRadius * ball.orbitSpeed;
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
    }

    collideHitomiBarriers(ball);

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 8) ball.trail.shift();

    if (ball.ayaFlameSpecial && ball.y > H + ball.r) {
      game.balls.splice(i, 1);
      continue;
    }

    if (ball.special && !ball.ayaFlameSpecial && ball.orbitTurns >= 3) {
      game.balls.splice(i, 1);
      continue;
    }

    if (ball.ayaFlameSpecial) {
      handleAyaFlameWallBounce(ball);
    } else if (!ball.special && ball.wind) {
      if (ball.x < -ball.r) {
        ball.x = ball.r;
        handleMewChargeMarker(ball, "left");
        ball.x = W + ball.r;
      }
      if (ball.x > W + ball.r) {
        ball.x = W - ball.r;
        handleMewChargeMarker(ball, "right");
        ball.x = -ball.r;
      }
    } else if (!ball.special) {
      if (ball.snowflake && (ball.x < ball.r || ball.x > W - ball.r || ball.y < ball.r)) {
        game.balls.splice(i, 1);
        continue;
      }
      if (ball.x < ball.r) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
        playSound("wall");
        nudgeSideWallReflection(ball, "left");
        countAyaCriticalBounce(ball);
        handleAyaChargeWall(ball, "left");
        handleMewChargeMarker(ball, "left");
        registerElectricWallHit(ball);
        spawnSnowflakes(ball, "left");
      }
      if (ball.x > W - ball.r) {
        ball.x = W - ball.r;
        ball.vx = -Math.abs(ball.vx);
        playSound("wall");
        nudgeSideWallReflection(ball, "right");
        countAyaCriticalBounce(ball);
        handleAyaChargeWall(ball, "right");
        handleMewChargeMarker(ball, "right");
        registerElectricWallHit(ball);
        spawnSnowflakes(ball, "right");
      }
    }
    if (!ball.special && ball.y < ball.r) {
      ball.y = ball.r;
      const incomingVx = ball.vx;
      const incomingVy = ball.vy;
      ball.vy = Math.abs(ball.vy);
      playSound("wall");
      nudgeRandomReflection(ball);
      if (ball.electric) {
        dropMewElectricLightning(ball);
        clearElectric(ball);
        restoreReflectedAngleSpeed(ball, incomingVx, incomingVy);
      }
      handleAyaChargeWall(ball, "top");
      countAyaCriticalBounce(ball);
      handleMewChargeMarker(ball, "top");
      spawnSnowflakes(ball, "top");
    }

    if (ball.ayaFlameSpecial && collideAyaFlamePaddle(ball, i)) continue;
    if (!ball.special && !ball.snowflake) collidePaddle(ball);
    if (ball.captured) {
      game.balls.splice(i, 1);
      continue;
    }
    collideBlocks(ball, i);
    if (ball.wind) applyWindBlade(ball);
    if (tryHitomiLowerWall(ball)) continue;

    if (!ball.special && ball.y > H + 36) {
      if (ball.snowflake) {
        game.balls.splice(i, 1);
        continue;
      }
      if (handleAyaChargeBottom(ball)) continue;
      if (handleMewChargeMiss(ball)) continue;
      registerElectricWallHit(ball);
      registerBallDrop(ball);
      game.balls.splice(i, 1);
    }
  }
}

function collidePaddle(ball) {
  const p = game.paddle;
  const topHit = ball.vy > 0 &&
    ball.x > p.x - p.w / 2 - ball.r &&
    ball.x < p.x + p.w / 2 + ball.r &&
    ball.y + ball.r > p.y - p.h / 2 &&
    ball.y - ball.r < p.y + p.h / 2;

  if (!topHit) return;

  const criticalType = getCriticalType(ball);
  const offset = (ball.x - p.x) / (p.w / 2);
  const speed = Math.max(360, Math.hypot(ball.vx, ball.vy));
  const hadWind = ball.wind;

  ball.y = p.y - p.h / 2 - ball.r;
  ball.vx = offset * speed * 0.72;
  ball.vy = -Math.sqrt(Math.max(9000, speed * speed - ball.vx * ball.vx));
  playSound("paddle");
  ball.hitsSincePaddle = 0;
  game.globalHitsSincePaddle = 0;
  boostAyaChargeOnPaddle(ball);
  nudgeCenterPaddleReflection(ball, offset);
  resetAyaCriticalBounce(ball);
  applySeinaPassive(ball);
  if (hadWind) clearWind(ball);
  if (ball.boosted) {
    ball.boosted = false;
    ball.damage = stats.attack;
  }
  handleMewChargeMarker(ball, "paddle");

  if (criticalType) triggerCriticalSkill(ball, criticalType);
}

function collideBlocks(ball, ballIndex) {
  for (let i = game.blocks.length - 1; i >= 0; i--) {
    const block = game.blocks[i];
    if (!circleRect(ball, block)) continue;

    if (ball.ayaFlameSpecial) {
      triggerAyaFlameExplosion(ball, ballIndex, block.x + block.w / 2, block.y + block.h / 2);
      return;
    }
    if (ball.special && !registerSpecialHit(ball, block)) continue;
    if (ball.ayaChargeActive) return;

    if (block.bomb && !block.bombTriggered && !ball.stealth) {
      addBlockScore(ball);
      triggerBombBlock(block, ball);
      return;
    }

    const criticalExplosion = !ball.special && ball.explosive;
    const hitX = block.x + block.w / 2;
    const hitY = block.y + block.h / 2;
    playSound("block");
    damageBlock(block, ball.damage, ball.x, ball.y, ball);
    if (ball.snowflake) {
      game.balls.splice(ballIndex, 1);
      return;
    }
    if (criticalExplosion) {
      const radius = ayaCriticalExplosionRadius(ball);
      explode(hitX, hitY, stats.attack * 1.5, radius, ball);
      addRipple(hitX, hitY, radius, "#ff2344");
      ball.explosive = false;
      ball.ayaCriticalBounces = 0;
      game.shake = 0.14;
    }
    if (block.bomb) triggerBombBlock(block);

    if (!ball.pierce) {
      const overlapX = Math.min(Math.abs(ball.x - block.x), Math.abs(ball.x - (block.x + block.w)));
      const overlapY = Math.min(Math.abs(ball.y - block.y), Math.abs(ball.y - (block.y + block.h)));
      if (overlapX < overlapY) ball.vx *= -1;
      else ball.vy *= -1;
    }
    return;
  }
}

function damageBlock(block, amount, x, y, sourceBall = null) {
  if (block.steel) {
    burst(x, y, "#b9c2cc", 8);
    return;
  }

  if (sourceBall) {
    sourceBall.hitsSincePaddle = (sourceBall.hitsSincePaddle || 0) + 1;
    game.maxHits = Math.max(game.maxHits, sourceBall.hitsSincePaddle);
  } else {
    game.globalHitsSincePaddle = (game.globalHitsSincePaddle || 0) + 1;
    game.maxHits = Math.max(game.maxHits, game.globalHitsSincePaddle);
  }
  block.hp -= amount;
  burst(x, y, block.hp <= 0 ? "#ffdd55" : "#ff3955", block.hp <= 0 ? 18 : 8);
  if (block.hp <= 0) {
    playSound("destroy");
    if (block.bomb) {
      addBlockScore(sourceBall);
      triggerBombBlock(block, sourceBall);
      return;
    }
    addBlockScore(sourceBall);
    game.destroyedBlocks += 1;
    if (block.heart) dropHeartItems(block);
    game.blocks = game.blocks.filter(item => item !== block);
  }
}

function addBlockScore(sourceBall = null) {
  game.combo += 1;
  game.chain = game.time - game.lastDestroyTime <= 0.05 ? game.chain + 1 : 0;
  game.lastDestroyTime = game.time;
  game.maxCombo = Math.max(game.maxCombo, game.combo);
  game.maxChain = Math.max(game.maxChain, game.chain);

  const comboMultiplier = Math.min(game.combo, 5);
  const hits = sourceBall?.hitsSincePaddle ?? game.globalHitsSincePaddle ?? 0;
  const hitsMultiplier = 1 + Math.min(hits, 50) * 0.005;
  const chainMultiplier = 1 + Math.min(game.chain, 5) * 0.04;
  const points = Math.round(100 * comboMultiplier * hitsMultiplier * chainMultiplier);

  game.score += points;
  game.waveScore += points;
}

function registerBallDrop(ball) {
  if (ball.special || ball.snowflake) return;
  game.combo = 0;
  game.chain = 0;
  game.lastDestroyTime = -Infinity;
  game.waveDropped = true;
}

function updateAyaFlameSpecial(ball, dt) {
  const speed = Math.max(1, Math.hypot(ball.vx, ball.vy));
  const acceleration = ayaFlameDamage(ball) * 2.4;
  ball.vx += (ball.vx / speed) * acceleration * dt;
  ball.vy += (ball.vy / speed) * acceleration * dt;
  ball.r = ayaFlameBallRadius(ball);
}

function handleAyaFlameWallBounce(ball) {
  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.vx = Math.abs(ball.vx);
    playSound("wall");
    ball.touchedWalls.add("left");
    burst(ball.x, ball.y, "#ff7a22", 10);
  }
  if (ball.x > W - ball.r) {
    ball.x = W - ball.r;
    ball.vx = -Math.abs(ball.vx);
    playSound("wall");
    ball.touchedWalls.add("right");
    burst(ball.x, ball.y, "#ff7a22", 10);
  }
  if (ball.y < ball.r) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
    playSound("wall");
    nudgeRandomReflection(ball);
    ball.touchedWalls.add("top");
    burst(ball.x, ball.y, "#ff7a22", 10);
  }
  ball.damage = ayaFlameDamage(ball);
  ball.r = ayaFlameBallRadius(ball);
}

function collideAyaFlamePaddle(ball, ballIndex) {
  const p = game.paddle;
  const hit =
    ball.vy > 0 &&
    ball.x > p.x - p.w / 2 - ball.r &&
    ball.x < p.x + p.w / 2 + ball.r &&
    ball.y + ball.r > p.y - p.h / 2 &&
    ball.y - ball.r < p.y + p.h / 2;
  if (!hit) return false;

  triggerAyaFlameExplosion(ball, ballIndex, ball.x, p.y - p.h / 2);
  return true;
}

function triggerAyaFlameExplosion(ball, ballIndex, x, y) {
  const radius = ayaFlameRadius(ball);
  explode(x, y, ayaFlameDamage(ball), radius, ball);
  addAyaFlameExplosionRipple(x, y, radius, ayaFlameLevel(ball));
  game.shake = Math.max(game.shake, 0.2);
  game.balls.splice(ballIndex, 1);
}

function addAyaFlameExplosionRipple(x, y, radius, level) {
  addRipple(x, y, radius, "#ff7a22");
  if (level >= 1) game.ripples.push({ x, y, radius: radius * 0.72, color: "#ff2344", life: 0.36, maxLife: 0.36 });
  if (level >= 2) game.ripples.push({ x, y, radius: radius * 1.12, color: "#ffd35a", life: 0.48, maxLife: 0.48 });
  if (level >= 3) game.ripples.push({ x, y, radius: radius * 1.28, color: "#ffffff", life: 0.52, maxLife: 0.52 });
}

function ayaFlameLevel(ball) {
  return clamp(ball.touchedWalls?.size || 0, 0, 3);
}

function ayaFlameDamage(ball) {
  return stats.attack * [0.6, 1.2, 2, 3][ayaFlameLevel(ball)];
}

function ayaFlameBallRadius(ball) {
  return [7, 10, 13, 16][ayaFlameLevel(ball)];
}

function ayaFlameRadius(ball) {
  const blockWidth = game.blocks[0]?.w || 64;
  return [34, blockWidth, blockWidth * 2, W / 4 * 1.25][ayaFlameLevel(ball)];
}

function triggerBombBlock(block, sourceBall = null) {
  if (block.bombTriggered) return;
  block.bombTriggered = true;
  const x = block.x + block.w / 2;
  const y = block.y + block.h / 2;
  const radius = 150;
  game.blocks = game.blocks.filter(item => item !== block);
  game.destroyedBlocks += 1;
  explode(x, y, stats.attack * 2, radius, sourceBall);
  addRipple(x, y, radius, "#ff7a22");
  game.shake = Math.max(game.shake, 0.18);
}

function explode(x, y, damage, radius, sourceBall = null) {
  playSound("explosion");
  burst(x, y, "#ff102e", 38);
  game.blocks.slice().forEach(block => {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (Math.hypot(cx - x, cy - y) <= radius) damageBlock(block, damage, cx, cy, sourceBall);
  });
}

function canUseChargeShot() {
  return (character.id === "aya" || character.id === "mew" || character.id === "hitomi" || character.id === "seina") && game.life >= 2;
}

function applyChargeShot(ball) {
  if (character.id === "aya") applyAyaChargeShot(ball);
  if (character.id === "mew") applyMewChargeShot(ball);
  if (character.id === "hitomi") applyHitomiChargeShot(ball);
  if (character.id === "seina") applySeinaChargeShot(ball);
}

function handleAyaChargeBottom(ball) {
  if (!ball.ayaChargeActive) return false;
  ball.y = H - ball.r;
  ball.vy = -Math.abs(ball.vy);
  handleAyaChargeWall(ball, "bottom");
  return true;
}

function handleAyaChargeWall(ball, wall) {
  if (!ball.ayaChargeActive) return;

  playSound("wall");
  const radius = 180 * (ball.ayaChargeRadiusMultiplier || 1);
  explode(ball.x, ball.y, stats.attack, radius, ball);
  addRipple(ball.x, ball.y, radius, "#ff2344");
  ball.ayaChargeHits += 1;
  if (ball.ayaChargeHits % 2 === 1) randomizeAyaChargeReflection(ball);
  if (ball.ayaChargeHits >= 10) clearAyaCharge(ball);
}

function countAyaCriticalBounce(ball) {
  if (!ball.explosive || ball.ayaChargeActive) return;
  ball.ayaCriticalBounces = Math.min(5, (ball.ayaCriticalBounces || 0) + 1);
}

function resetAyaCriticalBounce(ball) {
  if (ball.explosive) ball.ayaCriticalBounces = 0;
}

function ayaCriticalExplosionRadius(ball) {
  const base = 112;
  return base * (1 + clamp((ball.ayaCriticalBounces || 0) / 5, 0, 1));
}

function randomizeAyaChargeReflection(ball) {
  const speed = Math.max(320, Math.hypot(ball.vx, ball.vy));
  const additions = [0, Math.PI / 4, Math.PI * 3 / 4];
  const angle = Math.atan2(ball.vy, ball.vx) + additions[randomInt(0, additions.length - 1)];
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
}

function clearAyaCharge(ball) {
  const speed = Math.max(1, Math.hypot(ball.vx, ball.vy));
  ball.ayaChargeActive = false;
  ball.stealth = false;
  ball.pierce = false;
  ball.r = 7;
  ball.damage = stats.attack;
  ball.ayaChargeRadiusMultiplier = 1;
  ball.vx = (ball.vx / speed) * 430;
  ball.vy = (ball.vy / speed) * 430;
  burst(ball.x, ball.y, "#ffffff", 18);
}

function applyAyaChargeShot(ball) {
  ball.ayaChargeActive = true;
  ball.ayaChargeHits = 0;
  ball.ayaChargeRadiusMultiplier = 1;
  ball.stealth = true;
  ball.damage = stats.attack;
  ball.pierce = true;
  ball.r = 8;
  ball.vx *= 3;
  ball.vy *= 3;
  burst(ball.x, ball.y, "#ff2344", 26);
}

function boostAyaChargeOnPaddle(ball) {
  if (!ball.ayaChargeActive) return;
  ball.ayaChargeRadiusMultiplier = 1.25;
  burst(ball.x, ball.y, "#ff2344", 16);
}

function applyMewChargeShot(ball) {
  ball.mewChargeActive = true;
  ball.mewChargeHits = 0;
  ball.mewMarkers = {};
  burst(ball.x, ball.y, "#dffcff", 26);
}

function handleMewChargeMarker(ball, marker) {
  if (!ball.mewChargeActive) return;
  if (marker !== "paddle") ball.mewChargeHits += 1;

  if (!ball.mewMarkers[marker]) {
    ball.mewMarkers[marker] = { x: ball.x, y: ball.y };
    burst(ball.x, ball.y, "#f5fbff", 18);
  }

  if (Object.keys(ball.mewMarkers).length >= 4) {
    triggerMewChargeMagic(ball);
    clearMewCharge(ball);
    return;
  }

  if (ball.mewChargeHits >= 10) clearMewCharge(ball);
}

function handleMewChargeMiss(ball) {
  if (!ball.mewChargeActive) return false;
  clearMewCharge(ball);
  return false;
}

function triggerMewChargeMagic(ball) {
  const markers = Object.values(ball.mewMarkers);
  const left = Math.min(...markers.map(point => point.x));
  const right = Math.max(...markers.map(point => point.x));
  const top = Math.min(...markers.map(point => point.y));
  const bottom = Math.max(...markers.map(point => point.y));

  game.lasers.push({ x1: left, y1: top, x2: right, y2: top, radius: 18, color: "#dffcff", core: "#ffffff", life: 0.34 });
  game.lasers.push({ x1: right, y1: top, x2: right, y2: bottom, radius: 18, color: "#dffcff", core: "#ffffff", life: 0.34 });
  game.lasers.push({ x1: right, y1: bottom, x2: left, y2: bottom, radius: 18, color: "#dffcff", core: "#ffffff", life: 0.34 });
  game.lasers.push({ x1: left, y1: bottom, x2: left, y2: top, radius: 18, color: "#dffcff", core: "#ffffff", life: 0.34 });
  game.blocks.slice().forEach(block => {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
      damageBlock(block, stats.attack * 0.75, cx, cy, ball);
    }
  });
  burst((left + right) / 2, (top + bottom) / 2, "#dffcff", 70);
}

function clearMewCharge(ball) {
  ball.mewChargeActive = false;
  ball.mewMarkers = null;
  ball.mewChargeHits = 0;
}

function applyHitomiChargeShot(ball) {
  const radius = 138;
  ball.hitomiChargeGlow = 5;
  game.hitomiBarriers.push({
    id: ++barrierId,
    x: clamp(pointer.x, radius + 12, W - radius - 12),
    y: clamp(pointer.y, radius + 12, H - radius - 110),
    r: radius,
    life: 5
  });
  burst(pointer.x, pointer.y, "#b7f8ff", 34);
}

function updateHitomiBarriers(dt) {
  for (let i = game.hitomiBarriers.length - 1; i >= 0; i--) {
    const barrier = game.hitomiBarriers[i];
    barrier.life -= dt;
    if (barrier.life <= 0) {
      game.hitomiBarriers.splice(i, 1);
      burst(barrier.x, barrier.y, "#dffcff", 16);
    }
  }
}

function collideHitomiBarriers(ball) {
  if (!game.hitomiBarriers.length || ball.special || ball.snowflake) return;
  if (!ball.hitomiBarrierInside) ball.hitomiBarrierInside = new Set();

  game.hitomiBarriers.forEach(barrier => {
    const dx = ball.x - barrier.x;
    const dy = ball.y - barrier.y;
    const distance = Math.hypot(dx, dy);

    if (!ball.hitomiBarrierInside.has(barrier.id)) {
      if (distance <= barrier.r - ball.r) {
        ball.hitomiBarrierInside.add(barrier.id);
        splitHitomiChargeBall(ball, barrier);
      }
      return;
    }

    const hexLimit = (barrier.r - ball.r) * Math.cos(Math.PI / 6);
    let bestDot = -Infinity;
    let bestNormal = { x: 1, y: 0 };

    for (let side = 0; side < 6; side++) {
      const angle = side * Math.PI / 3;
      const normal = { x: Math.cos(angle), y: Math.sin(angle) };
      const dot = dx * normal.x + dy * normal.y;
      if (dot > bestDot) {
        bestDot = dot;
        bestNormal = normal;
      }
    }

    if (bestDot <= hexLimit) return;

    const over = bestDot - hexLimit;
    ball.x -= bestNormal.x * over;
    ball.y -= bestNormal.y * over;
    const velocityDot = ball.vx * bestNormal.x + ball.vy * bestNormal.y;
    if (velocityDot > 0) {
      ball.vx -= 2 * velocityDot * bestNormal.x;
      ball.vy -= 2 * velocityDot * bestNormal.y;
    }
    spawnBarrierSnowflakes(ball, bestNormal);
    burst(ball.x, ball.y, "#dffcff", 8);
  });
}

function splitHitomiChargeBall(ball, barrier) {
  if (ball.chargeShotType !== "hitomi" || ball.hitomiChargeSplit) return;
  ball.hitomiChargeSplit = true;

  const speed = Math.max(360, Math.hypot(ball.vx, ball.vy));
  const baseAngle = Math.atan2(ball.vy, ball.vx);
  const leftAngle = baseAngle - 0.22;
  const rightAngle = baseAngle + 0.22;
  ball.vx = Math.cos(leftAngle) * speed;
  ball.vy = Math.sin(leftAngle) * speed;
  game.balls.push({
    x: ball.x,
    y: ball.y,
    vx: Math.cos(rightAngle) * speed,
    vy: Math.sin(rightAngle) * speed,
    r: ball.r,
    damage: ball.damage,
    explosive: false,
    pierce: false,
    trail: [],
    chargeShotType: "hitomi",
    hitomiChargeGlow: Math.max(0, barrier.life),
    hitomiChargeSplit: true,
    hitomiBarrierInside: new Set([barrier.id])
  });
  burst(ball.x, ball.y, "#dffcff", 28);
}

function getCriticalType(ball) {
  const p = game.paddle;
  const local = ball.x - (p.x - p.w / 2);
  const sideZone = p.w * 0.1;
  const centerZone = p.w * 0.2;
  const centerStart = p.w * 0.5 - centerZone / 2;
  const centerEnd = p.w * 0.5 + centerZone / 2;

  if (character.id === "aya" && isDangerActive()) return "side";
  if (character.critTypes.includes("center") && local >= centerStart && local <= centerEnd) return "center";
  if (character.critTypes.includes("corner") && (local <= sideZone || local >= p.w - sideZone)) return "corner";
  if (character.critTypes.includes("side") && (local <= sideZone || local >= p.w - sideZone)) return "side";
  return null;
}

function triggerCriticalSkill(ball, type) {
  if (character.id === "hitomi" && type === "center") {
    game.heldBalls.push({ damage: stats.attack * 3 });
    ball.captured = true;
    burst(ball.x, ball.y, "#b7f8ff", 22);
    return;
  }

  if (character.id === "mew") {
    game.criticalCount += 1;
    while (game.criticalCount >= 10) {
      game.criticalCount -= 10;
      game.life = Math.min(stats.maxLife, game.life + 1);
      burst(game.paddle.x, game.paddle.y - 16, "#65ffcf", 22);
    }

    if (type === "center") {
      applyElectric(ball);
    } else if (type === "corner") {
      applyWind(ball);
    }
    return;
  }

  if (character.id === "seina") {
    applySeinaLockOn(ball);
    burst(ball.x, ball.y, "#d760ff", 18);
    return;
  }

  ball.explosive = true;
  ball.ayaCriticalBounces = 0;
  burst(ball.x, ball.y, "#ff2344", 16);
}

function applyElectric(ball) {
  clearWind(ball);
  ball.electric = true;
  ball.pierce = true;
  ball.r = 10;
  ball.damage = stats.attack;
  const len = Math.max(1, Math.hypot(ball.vx, ball.vy));
  const speed = 1900;
  ball.vx = (ball.vx / len) * speed;
  ball.vy = (ball.vy / len) * speed;
  ball.electricTargetPoint = null;
  ball.electricWallHits = 0;
  burst(ball.x, ball.y, "#ffe45c", 18);
}

function clearElectric(ball, resetVelocity = false) {
  ball.electric = false;
  ball.pierce = false;
  ball.r = 7;
  ball.damage = stats.attack;
  ball.electricTargetPoint = null;
  ball.electricWallHits = 0;
  if (resetVelocity) {
    ball.vx = 0;
    ball.vy = 430;
  }
  burst(ball.x, ball.y, "#ffe45c", 10);
}

function registerElectricWallHit(ball) {
  if (!ball.electric) return;
  ball.electricWallHits = (ball.electricWallHits || 0) + 1;
  if (ball.electricWallHits >= 3) {
    clearElectric(ball);
  }
}

function dropMewElectricLightning(sourceBall = null) {
  if (character.id !== "mew" || game.blocks.length === 0) return;
  playSound("laser");

  const targets = game.blocks
    .slice()
    .filter(block => !block.steel)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);

  targets.forEach(target => {
    const x = target.x + target.w / 2;
    const radius = target.w / 2 + 10;
    game.lasers.push({
      x1: x,
      y1: 0,
      x2: x,
      y2: H,
      radius: 15,
      color: "#ffe45c",
      core: "#ffffff",
      life: 0.28
    });

    game.blocks.slice().forEach(block => {
      const cx = block.x + block.w / 2;
      if (Math.abs(cx - x) <= radius) {
        damageBlock(block, stats.attack * 0.5, cx, block.y + block.h / 2, sourceBall);
      }
    });
    burst(x, target.y + target.h / 2, "#ffe45c", 18);
  });
}

function restoreReflectedAngleSpeed(ball, incomingVx, incomingVy) {
  const len = Math.max(1, Math.hypot(incomingVx, incomingVy));
  const speed = 430;
  ball.vx = (incomingVx / len) * speed;
  ball.vy = (Math.abs(incomingVy) / len) * speed;
}

function applyWind(ball) {
  clearElectric(ball);
  ball.wind = true;
  ball.windHits = new Map();
  burst(ball.x, ball.y, "#b8fff4", 18);
}

function clearWind(ball) {
  ball.wind = false;
  ball.windHits = null;
  burst(ball.x, ball.y, "#b8fff4", 10);
}

function applyWindBlade(ball) {
  game.blocks.slice().forEach(block => {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (!circleRect({ x: ball.x, y: ball.y, r: WIND_BLADE_RADIUS }, block)) return;

    const lastHit = ball.windHits?.get(block) ?? -999;
    if (game.time - lastHit < 0.22) return;
    ball.windHits.set(block, game.time);
    damageBlock(block, stats.attack * 0.35, cx, cy, ball);
    burst(cx, cy, "#bbfff4", 6);
  });
}

function applySeinaPassive(ball) {
  if (character.id !== "seina" || ball.snowflake || ball.special) return;
  const before = ball.gravityStacks || 0;
  const after = Math.min(5, before + 1);
  if (after === before) return;

  ball.gravityStacks = after;
  ball.damage = stats.attack * (1 + after * 0.2);
  const beforeSpeed = 1 + before * 0.1;
  const afterSpeed = 1 + after * 0.1;
  const speedRatio = afterSpeed / beforeSpeed;
  ball.vx *= speedRatio;
  ball.vy *= speedRatio;
  burst(ball.x, ball.y, "#d760ff", 10);
}

function applySeinaLockOn(ball) {
  const origin = game.paddle;
  const boostedCritical = (ball.gravityStacks || 0) >= 5;
  const lockCount = boostedCritical ? 3 : 2;
  const targets = game.blocks
    .slice()
    .filter(block => !block.steel)
    .sort((a, b) => blockDistance(a, origin.x, origin.y) - blockDistance(b, origin.x, origin.y))
    .slice(0, lockCount);
  if (targets.length === 0) return;

  ball.lockOn = {
    primary: targets[0],
    secondary: targets.slice(1),
    hits: 0
  };

  if (boostedCritical) {
    ball.seinaCriticalPierce = true;
    ball.pierce = true;
  }
}

function applySeinaChargeShot(ball) {
  ball.seinaChargeActive = true;
  ball.seinaChargeTimer = 1;
  ball.seinaChargeUses = 0;
  burst(ball.x, ball.y, "#d760ff", 24);
}

function updateSeinaChargeShot(ball, dt) {
  if (!ball.seinaChargeActive || ball.special || ball.snowflake) return;
  ball.seinaChargeTimer -= dt;
  if (ball.seinaChargeTimer > 0) return;

  if (applySeinaNearestLockOn(ball)) {
    ball.seinaChargeUses += 1;
    burst(ball.x, ball.y, "#d760ff", 16);
  }

  if (ball.seinaChargeUses >= 5) {
    ball.seinaChargeActive = false;
    ball.seinaChargeTimer = 0;
    return;
  }

  ball.seinaChargeTimer += 1;
}

function applySeinaNearestLockOn(ball) {
  const target = game.blocks
    .slice()
    .filter(block => !block.steel)
    .filter(block => !isSeinaLockedBlock(ball, block))
    .sort((a, b) => blockDistance(a, ball.x, ball.y) - blockDistance(b, ball.x, ball.y))[0];
  if (!target) return false;

  if (!ball.lockOn || !game.blocks.includes(ball.lockOn.primary)) {
    ball.lockOn = {
      primary: target,
      secondary: [],
      hits: 0
    };
    return true;
  }

  const secondary = normalizeSeinaSecondary(ball).filter(block => game.blocks.includes(block));
  if (secondary.length >= 5) return false;
  secondary.push(target);
  ball.lockOn.secondary = secondary.slice(0, 5);
  return true;
}

function applySeinaForces(ball, dt) {
  if (ball.snowflake) return;
  if (game.blackHole) {
    pullBallToward(ball, game.blackHole.x, game.blackHole.y, 980 * dt);
    steerBallToward(ball, game.blackHole.x, game.blackHole.y, 2.6 * dt);
  }

  if (!ball.lockOn) return;
  refreshSeinaLock(ball);
  if (!ball.lockOn) return;

  const target = ball.lockOn.primary;
  steerBallToward(ball, target.x + target.w / 2, target.y + target.h / 2, 10 * dt);
}

function refreshSeinaLock(ball) {
  if (!ball.lockOn) return;
  const primaryAlive = game.blocks.includes(ball.lockOn.primary);
  const secondary = normalizeSeinaSecondary(ball).filter(block => game.blocks.includes(block));
  ball.lockOn.secondary = secondary;

  if (!primaryAlive && secondary.length > 0) {
    ball.lockOn.primary = secondary.shift();
    ball.lockOn.secondary = secondary;
  } else if (!primaryAlive && secondary.length === 0) {
    ball.lockOn = null;
    clearSeinaCriticalPierce(ball);
  }
}

function isSeinaLockedBlock(ball, block) {
  return ball.lockOn && (ball.lockOn.primary === block || normalizeSeinaSecondary(ball).includes(block));
}

function normalizeSeinaSecondary(ball) {
  if (!ball.lockOn) return [];
  if (Array.isArray(ball.lockOn.secondary)) return ball.lockOn.secondary;
  return ball.lockOn.secondary ? [ball.lockOn.secondary] : [];
}

function clearSeinaCriticalPierce(ball) {
  if (!ball.seinaCriticalPierce) return;
  ball.seinaCriticalPierce = false;
  ball.pierce = false;
}

function pullBallToward(ball, x, y, amount) {
  const dx = x - ball.x;
  const dy = y - ball.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  ball.vx += (dx / len) * amount;
  ball.vy += (dy / len) * amount;
}

function steerBallToward(ball, x, y, strength) {
  const dx = x - ball.x;
  const dy = y - ball.y;
  const targetLen = Math.max(1, Math.hypot(dx, dy));
  const speed = clamp(Math.hypot(ball.vx, ball.vy), 340, 760);
  const blend = clamp(strength, 0, 1);
  const currentX = ball.vx / Math.max(1, Math.hypot(ball.vx, ball.vy));
  const currentY = ball.vy / Math.max(1, Math.hypot(ball.vx, ball.vy));
  const targetX = dx / targetLen;
  const targetY = dy / targetLen;
  const nx = currentX * (1 - blend) + targetX * blend;
  const ny = currentY * (1 - blend) + targetY * blend;
  const nLen = Math.hypot(nx, ny) || 1;
  ball.vx = (nx / nLen) * speed;
  ball.vy = (ny / nLen) * speed;
}

function blockDistance(block, x, y) {
  return Math.hypot(block.x + block.w / 2 - x, block.y + block.h / 2 - y);
}

function nudgeCenterPaddleReflection(ball, offset) {
  if (Math.abs(offset) > 0.05) return;
  nudgeRandomReflection(ball);
}

function nudgeRandomReflection(ball) {
  const roll = Math.random();
  if (roll >= 0.5) return;
  rotateBallVelocity(ball, roll < 0.25 ? Math.PI / 180 : -Math.PI / 180);
}

function nudgeSideWallReflection(ball, side) {
  if (ball.snowflake) return;
  rotateBallVelocity(ball, side === "left" ? Math.PI / 180 : -Math.PI / 180);
}

function rotateBallVelocity(ball, angleOffset) {
  const speed = Math.max(1, Math.hypot(ball.vx, ball.vy));
  const angle = Math.atan2(ball.vy, ball.vx) + angleOffset;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
}

function deployHitomiLowerWall() {
  if (character.id !== "hitomi") return;
  game.hitomiLowerWall = {
    x: 18,
    y: H - 16,
    w: W - 36,
    h: 8
  };
  burst(W / 2, H - 16, "#b7f8ff", 22);
}

function tryHitomiLowerWall(ball) {
  const wall = game.hitomiLowerWall;
  if (!wall || ball.special || ball.snowflake || ball.vy <= 0) return false;
  if (ball.x + ball.r < wall.x || ball.x - ball.r > wall.x + wall.w) return false;
  if (ball.y + ball.r < wall.y || ball.y - ball.r > wall.y + wall.h) return false;

  ball.y = wall.y - ball.r - 1;
  ball.vy = -Math.max(340, Math.abs(ball.vy));
  playSound("paddle");
  burst(ball.x, ball.y, "#b7f8ff", 18);
  game.hitomiLowerWall = null;
  return true;
}

function tryHitomiCatchWall(ball) {
  if (character.id !== "hitomi" || game.catchWallUses >= 3) return false;

  const p = game.paddle;
  game.catchWallUses += 1;
  game.catchWall = {
    x: clamp(p.x - p.w * 0.7, 12, W - p.w * 1.4 - 12),
    y: p.y + 46,
    w: p.w * 1.4,
    h: 10
  };
  ball.x = clamp(ball.x, game.catchWall.x + ball.r, game.catchWall.x + game.catchWall.w - ball.r);
  ball.y = game.catchWall.y - ball.r - 1;
  ball.vy = -Math.max(340, Math.abs(ball.vy));
  burst(ball.x, ball.y, "#b7f8ff", 26);
  game.catchWall = null;
  return true;
}

function spawnSnowflakes(ball, wall) {
  if (character.id !== "hitomi" || ball.snowflake || activeFieldBallCount() < 2) return;

  const angles = {
    top: [Math.PI / 2, Math.PI / 4, Math.PI * 3 / 4],
    left: [0, -Math.PI / 4, Math.PI / 4],
    right: [Math.PI, Math.PI * 5 / 4, Math.PI * 3 / 4]
  }[wall];

  if (!angles) return;
  spawnSnowflakesAtAngles(ball, angles);
}

function spawnBarrierSnowflakes(ball, normal) {
  if (character.id !== "hitomi" || ball.snowflake || activeFieldBallCount() < 2) return;
  const baseAngle = Math.atan2(-normal.y, -normal.x);
  spawnSnowflakesAtAngles(ball, [baseAngle, baseAngle - Math.PI / 4, baseAngle + Math.PI / 4]);
}

function spawnSnowflakesAtAngles(ball, angles) {
  angles.forEach(angle => {
    game.balls.push({
      x: ball.x,
      y: ball.y,
      vx: Math.cos(angle) * 330,
      vy: Math.sin(angle) * 330,
      r: 4,
      damage: stats.attack * 0.1,
      explosive: false,
      pierce: true,
      snowflake: true,
      trail: []
    });
  });
  burst(ball.x, ball.y, "#dffcff", 12);
}

function activeFieldBallCount() {
  return game.balls.filter(ball => !ball.special && !ball.snowflake).length;
}

function updateParticles(dt) {
  game.shake = Math.max(0, game.shake - dt);
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    if (p.life <= 0) game.particles.splice(i, 1);
  }
}

function addRipple(x, y, radius, color) {
  game.ripples.push({ x, y, radius, color, life: 0.42, maxLife: 0.42 });
  game.ripples.push({ x, y, radius: radius * 0.68, color: "#111111", life: 0.34, maxLife: 0.34 });
}

function updateRipples(dt) {
  for (let i = game.ripples.length - 1; i >= 0; i--) {
    game.ripples[i].life -= dt;
    if (game.ripples[i].life <= 0) game.ripples.splice(i, 1);
  }
}

function updateLasers(dt) {
  for (let i = game.lasers.length - 1; i >= 0; i--) {
    game.lasers[i].life -= dt;
    if (game.lasers[i].life <= 0) game.lasers.splice(i, 1);
  }
}

function dropHeartItems(block) {
  if (game.gameMode !== "endless") return;
  const lowLife = game.life <= stats.maxLife * 0.25;
  const count = lowLife ? 3 : 1;
  const cx = block.x + block.w / 2;
  const cy = block.y + block.h / 2;
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 18;
    game.items.push({
      type: "heart",
      x: cx + offset,
      y: cy,
      vy: 86 + i * 16,
      r: 12
    });
  }
  burst(cx, cy, "#ff6f9d", 20);
}

function updateItems(dt) {
  const p = game.paddle;
  for (let i = game.items.length - 1; i >= 0; i--) {
    const item = game.items[i];
    item.y += item.vy * dt;
    item.vy += 24 * dt;

    const caught =
      item.x > p.x - p.w / 2 - item.r &&
      item.x < p.x + p.w / 2 + item.r &&
      item.y + item.r > p.y - p.h / 2 &&
      item.y - item.r < p.y + p.h / 2;
    if (caught) {
      game.life = Math.min(stats.maxLife, game.life + Math.ceil(stats.maxLife * 0.2));
      burst(item.x, item.y, "#ff8ab2", 24);
      game.items.splice(i, 1);
      continue;
    }

    if (item.y > H + 40) game.items.splice(i, 1);
  }
}

function updateMewSpecialBursts(dt) {
  for (let i = game.mewSpecialBursts.length - 1; i >= 0; i--) {
    const pulse = game.mewSpecialBursts[i];
    pulse.delay -= dt;
    if (pulse.delay > 0) continue;
    fireMewLaserPulse(pulse);
    game.mewSpecialBursts.splice(i, 1);
  }
}

function fireMewLaserPulse(pulse) {
  playSound("laser");
  pulse.sources.forEach(source => {
    const origin = mewSpecialOrigin(source);
    if (!origin) return;

    let dx = pulse.targetX - origin.x;
    let dy = pulse.targetY - origin.y;
    if (Math.hypot(dx, dy) < 1) {
      dx = 0;
      dy = -1;
    }
    const len = Math.max(1, Math.hypot(dx, dy));
    const x2 = origin.x + (dx / len) * Math.max(W, H) * 1.5;
    const y2 = origin.y + (dy / len) * Math.max(W, H) * 1.5;
    const radius = pulse.damage >= 0.5 ? MEW_LASER_RADIUS + 8 : MEW_LASER_RADIUS;
    game.lasers.push({
      x1: origin.x,
      y1: origin.y,
      x2,
      y2,
      radius,
      color: pulse.damage >= 0.5 ? "#9fffff" : "#75efff",
      core: "#ffffff",
      life: 0.24
    });
    game.blocks.slice().forEach(block => {
      if (thickLineIntersectsRect(origin.x, origin.y, x2, y2, radius, block)) {
        damageBlock(block, stats.attack * pulse.damage, block.x + block.w / 2, block.y + block.h / 2, source.ball || null);
      }
    });
    burst(origin.x, origin.y, "#4ee9ff", pulse.damage >= 0.5 ? 22 : 14);
  });
  burst(pulse.targetX, pulse.targetY, pulse.damage >= 0.5 ? "#dffcff" : "#5fefff", pulse.damage >= 0.5 ? 34 : 18);
}

function mewSpecialOrigin(source) {
  if (source.type === "paddle") {
    return { x: game.paddle.x, y: game.paddle.y - game.paddle.h / 2 };
  }
  if (source.type === "ball" && game.balls.includes(source.ball)) {
    return { x: source.ball.x, y: source.ball.y };
  }
  return null;
}

function updateBlackHole(dt) {
  if (!game.blackHole) return;
  game.blackHole.life -= dt;
  if (game.blackHole.life <= 0) game.blackHole = null;
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 40 + Math.random() * 170;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: 2 + Math.random() * 4,
      color,
      life: 0.24 + Math.random() * 0.46
    });
  }
}

function nextWave() {
  const endlessRecovery = game.gameMode === "endless" ? remainingEndlessRecoveryBalls() : 0;
  finalizeWaveScore();
  if (game.gameMode === "tutorial" && game.wave >= 5) {
    endGame("TUTORIAL CLEAR", "操作説明を完了しました。");
    return;
  }
  if (game.gameMode === "standard" && game.wave >= 5) {
    endGame("STANDARD CLEAR", `5WAVE突破！ SCORE ${formatNumber(game.score)}`);
    return;
  }

  game.wave += 1;
  if (game.gameMode === "standard") {
    game.life = Math.min(stats.maxLife, game.life + Math.ceil(stats.maxLife / 2));
  } else if (endlessRecovery > 0) {
    game.life = Math.min(stats.maxLife, game.life + endlessRecovery);
    burst(game.paddle.x, game.paddle.y - 18, "#ff8ab2", 18 + endlessRecovery * 4);
  } else if (game.gameMode === "tutorial") {
    game.life = stats.maxLife;
  }
  game.cooldown = 0;
  game.skillUsed = false;
  game.balls = [];
  game.ripples = [];
  game.lasers = [];
  game.items = [];
  game.mewSpecialBursts = [];
  game.hitomiBarriers = [];
  game.heldBalls = [];
  game.catchWall = null;
  game.hitomiLowerWall = null;
  game.blackHole = null;
  game.criticalCount = 0;
  game.catchWallUses = 0;
  game.freezeTime = 0;
  game.waveScore = 0;
  game.combo = 0;
  game.chain = 0;
  game.globalHitsSincePaddle = 0;
  game.lastDestroyTime = -Infinity;
  game.waveDropped = false;
  buildWave(game.wave);
  burst(W / 2, H / 2, "#17d6ff", 80);
}

function remainingEndlessRecoveryBalls() {
  return game.balls.filter(ball => !ball.special && !ball.snowflake).length + game.heldBalls.length;
}

function finalizeWaveScore() {
  if (game.gameMode !== "standard" || game.waveDropped || game.waveScore <= 0) return;
  const fullComboBonus = Math.round(game.waveScore * 0.3);
  game.score += fullComboBonus;
  game.fullComboCount += 1;
  burst(W / 2, H / 2, "#ffd35a", 70);
}

function isWaveCleared() {
  if (!game.blocks.length) return true;
  if (game.gameMode !== "endless") return false;
  if (game.blocks.some(block => !block.steel)) return false;
  game.blocks = [];
  return true;
}

function endGame(title, body) {
  game.mode = "ended";
  messageTitle.textContent = title;
  messageBody.textContent = body;
  renderResultStats();
  messageLayer.classList.remove("hidden");
}

function renderResultStats() {
  const selectInfo = selectDetails[character.id];
  resultIcon.src = characterIconPath(character.id);
  resultName.textContent = selectInfo.name;
  if (game.gameMode === "tutorial") {
    resultStats.innerHTML = [
      ["完了WAVE", game.wave],
      ["操作練習", "CLEAR"]
    ].map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
    return;
  }

  const rows = game.gameMode === "endless"
    ? [
        ["到達WAVE", game.wave],
        ["破壊したブロック", formatNumber(game.destroyedBlocks)]
      ]
    : [
        ["獲得スコア", formatNumber(game.score)],
        ["最大COMBO", game.maxCombo],
        ["FULL COMBO", game.fullComboCount],
        ["最大HITS", game.maxHits],
        ["最大CHAIN", game.maxChain]
      ];

  resultStats.innerHTML = rows
    .map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`)
    .join("");
}

function returnToTitle() {
  game = null;
  messageLayer.classList.add("hidden");
  gameScreen.classList.add("hidden");
  modeScreen.classList.add("hidden");
  selectScreen.classList.remove("hidden");
  applyCharacter(selectedCharacterId);
}

function draw() {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (game?.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
  }
  drawBackground();
  if (game) {
    drawGuide();
    drawBlocks();
    drawPaddle();
    drawBlackHole();
    drawHitomiBarriers();
    drawHitomiLowerWall();
    drawBalls();
    drawItems();
    drawLasers();
    drawRipples();
    drawParticles();
    drawFreezeFilter();
    drawTopHud();
    drawTutorialDialog();
  }
  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#10051a");
  grad.addColorStop(0.58, "#18070d");
  grad.addColorStop(1, "#050509");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 38, 64, 0.16)";
  ctx.fillRect(0, H * 0.66, W, 2);
}

function drawGuide() {
  if (stats.guide < 2 || (!hasLoadedBall() && game.heldBalls.length === 0)) return;
  const origin = loadedBallPosition();
  const dx = pointer.x - origin.x;
  const dy = pointer.y - origin.y;
  const len = Math.max(1, Math.hypot(dx, dy));

  ctx.strokeStyle = "rgba(23, 214, 255, 0.74)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  const points = buildGuidePath(origin.x, origin.y, dx / len, dy / len);
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBlocks() {
  game.blocks.forEach(block => {
    const ratio = block.steel ? 1 : clamp(block.hp / block.maxHp, 0, 1);
    const colors = block.steel
      ? { light: "rgba(196, 205, 214, 0.98)", dark: "rgba(83, 94, 108, 0.98)" }
      : blockHpColors(block.hp);
    const grad = ctx.createLinearGradient(block.x, block.y, block.x + block.w, block.y + block.h);
    grad.addColorStop(0, colors.light);
    grad.addColorStop(1, colors.dark);
    roundRect(block.x, block.y, block.w, block.h, 6, grad);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(block.x + 1, block.y + 1, block.w - 2, block.h - 2);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(block.x + 8, block.y + block.h - 8, (block.w - 16) * ratio, 4);
    drawBombBlockMarker(block);
    drawHeartBlockMarker(block);
    drawSteelBlockMarker(block);
    drawLockOnMarker(block);
  });
}

function drawItems() {
  game.items.forEach(item => {
    if (item.type !== "heart") return;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ff6f9d";
    ctx.fillStyle = "#ff5d91";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-18, -2, -10, -18, 0, -8);
    ctx.bezierCurveTo(10, -18, 18, -2, 0, 10);
    ctx.fill();
    ctx.restore();
  });
}

function drawBombBlockMarker(block) {
  if (!block.bomb) return;

  const cx = block.x + block.w / 2;
  const cy = block.y + block.h / 2;
  ctx.save();
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#ff7a22";
  ctx.strokeStyle = "#ff7a22";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(block.w, block.h) * 0.34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 14px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", cx, cy);
  ctx.restore();
}

function drawHeartBlockMarker(block) {
  if (!block.heart) return;

  const cx = block.x + block.w / 2;
  const cy = block.y + block.h / 2;
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#ff6f9d";
  ctx.fillStyle = "#fff";
  ctx.font = "900 15px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("H", cx, cy);
  ctx.restore();
}

function drawSteelBlockMarker(block) {
  if (!block.steel) return;

  const cx = block.x + block.w / 2;
  const cy = block.y + block.h / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 13, cy - 8);
  ctx.lineTo(cx + 13, cy - 8);
  ctx.moveTo(cx - 13, cy);
  ctx.lineTo(cx + 13, cy);
  ctx.moveTo(cx - 13, cy + 8);
  ctx.lineTo(cx + 13, cy + 8);
  ctx.stroke();
  ctx.restore();
}

function drawLockOnMarker(block) {
  const state = getBlockLockState(block);
  if (!state) return;

  const cx = block.x + block.w / 2;
  const cy = block.y + block.h / 2;
  const r = state === "primary" ? 19 : 15;

  ctx.save();
  ctx.strokeStyle = state === "primary" ? "#ff3048" : "#ffd84a";
  ctx.lineWidth = state === "primary" ? 3 : 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r - 7, cy);
  ctx.lineTo(cx - r + 5, cy);
  ctx.moveTo(cx + r - 5, cy);
  ctx.lineTo(cx + r + 7, cy);
  ctx.moveTo(cx, cy - r - 7);
  ctx.lineTo(cx, cy - r + 5);
  ctx.moveTo(cx, cy + r - 5);
  ctx.lineTo(cx, cy + r + 7);
  ctx.stroke();
  ctx.restore();
}

function getBlockLockState(block) {
  for (const ball of game.balls) {
    if (!ball.lockOn) continue;
    if (ball.lockOn.primary === block) return "primary";
    if (normalizeSeinaSecondary(ball).includes(block)) return "secondary";
  }
  return null;
}

function drawPaddle() {
  const p = game.paddle;
  const x = p.x - p.w / 2;
  const y = p.y - p.h / 2;

  roundRect(x, y, p.w, p.h, 8, "#f6f9ff");
  roundRect(x + 4, y + 4, p.w - 8, p.h - 8, 6, "#171a25");
  drawCriticalZones(x, y, p.w);
  drawPaddleMeters(x, y, p.w, p.h);
}

function drawCriticalZones(x, y, width) {
  if (character.id === "aya" && isDangerActive()) {
    ctx.fillStyle = "rgba(255, 35, 68, 0.95)";
    ctx.fillRect(x, y - 4, width, 6);
    return;
  }

  if (character.critTypes.includes("side") || character.critTypes.includes("corner")) {
    ctx.fillStyle = character.id === "mew" ? "rgba(184, 255, 244, 0.95)" : "rgba(255, 35, 68, 0.95)";
    ctx.fillRect(x, y - 4, width * 0.1, 6);
    ctx.fillRect(x + width * 0.9, y - 4, width * 0.1, 6);
  }

  if (character.critTypes.includes("center")) {
    ctx.fillStyle = "rgba(255, 228, 92, 0.95)";
    ctx.fillRect(x + width * 0.4, y - 4, width * 0.2, 6);
  }
}

function drawHitomiBarriers() {
  if (!game.hitomiBarriers.length) return;

  game.hitomiBarriers.forEach(barrier => {
    const ratio = clamp(barrier.life / 5, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.22 + ratio * 0.18;
    ctx.fillStyle = "#b7f8ff";
    ctx.beginPath();
    ctx.arc(barrier.x, barrier.y, barrier.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#eaffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(barrier.x, barrier.y, barrier.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#77e7ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 6 + i * Math.PI / 3;
      const x = barrier.x + Math.cos(angle) * barrier.r * 0.88;
      const y = barrier.y + Math.sin(angle) * barrier.r * 0.88;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });
}

function drawHitomiLowerWall() {
  const wall = game.hitomiLowerWall;
  if (!wall) return;

  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#b7f8ff";
  roundRect(wall.x, wall.y, wall.w, wall.h, 4, "rgba(183,248,255,0.88)");
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#b7f8ff";
  ctx.fillRect(wall.x, wall.y - 18, wall.w, 18);
  ctx.restore();
}

function drawBalls() {
  if (game.heldBalls.length > 0) {
    const base = loadedBallPosition();
    game.heldBalls.forEach((_, index) => {
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#b7f8ff";
      ctx.fillStyle = "#dffcff";
      ctx.beginPath();
      ctx.arc(base.x + (index - (game.heldBalls.length - 1) / 2) * 18, base.y - index * 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  if (hasLoadedBall()) {
    const ball = loadedBallPosition();
    ctx.shadowBlur = 14;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    drawChargeHoldGauge(ball);
  }

  drawMewChargeMarkers();

  game.balls.forEach(ball => {
    const chargeGlow = chargeBallGlow(ball);
    const flameGlow = ayaFlameGlowColor(ball);
    if (ball.snowflake) ctx.globalAlpha = 0.42;
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      ctx.globalAlpha = ball.snowflake ? (i / ball.trail.length * 0.18) : (i / ball.trail.length * (chargeGlow || flameGlow ? 0.76 : 0.45));
      ctx.fillStyle = chargeGlow || flameGlow || (ball.ayaChargeActive ? "#ff2344" : ball.snowflake ? "#dffcff" : ball.special ? "#ff7a22" : ball.electric ? "#ffe45c" : ball.wind ? "#b8fff4" : ball.pierce ? "#17d6ff" : ball.explosive ? "#ff263d" : "#fff");
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (chargeGlow || flameGlow ? 1.1 : 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = ball.snowflake ? 0.42 : 1;
    ctx.shadowBlur = flameGlow ? 24 + ayaFlameLevel(ball) * 10 : chargeGlow ? 28 : ball.explosive || ball.pierce ? 18 : 10;
    ctx.shadowColor = flameGlow || chargeGlow || (ball.ayaChargeActive ? "#ff2344" : ball.snowflake ? "#dffcff" : ball.special ? "#ff7a22" : ball.electric ? "#ffe45c" : ball.wind ? "#b8fff4" : ball.explosive ? "#ff263d" : ball.pierce ? "#17d6ff" : "#ffffff");
    ctx.fillStyle = flameGlow ? "#fff2b5" : chargeGlow ? "#ffffff" : ball.ayaChargeActive ? "rgba(255,35,68,0.62)" : ball.snowflake ? "#f4ffff" : ball.special ? "#ffb12a" : ball.electric ? "#fff27a" : ball.wind ? "#d9fff9" : ball.explosive ? "#ff263d" : ball.pierce ? "#9cf4ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    if (flameGlow) drawAyaFlameGlow(ball, flameGlow);
    if (chargeGlow) drawChargeBallEffect(ball, chargeGlow);
    drawSeinaStackEffect(ball);
    if (ball.wind) {
      ctx.strokeStyle = "rgba(184,255,244,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, WIND_BLADE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });
}

function drawChargeHoldGauge(ball) {
  if (!leftPressStarted || !canUseChargeShot()) return;

  const held = performance.now() - leftPressStarted;
  const ratio = clamp(held / 420, 0, 1);
  const color = chargeColor(character.id);

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 15, -Math.PI / 2, Math.PI * 1.5);
  ctx.stroke();

  ctx.shadowBlur = ratio >= 1 ? 18 : 8;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
  ctx.stroke();

  if (ratio >= 1) {
    ctx.globalAlpha = 0.28 + Math.sin(game.time * 16) * 0.08;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function chargeBallGlow(ball) {
  if (ball.ayaChargeActive) return chargeColor("aya");
  if (ball.mewChargeActive) return chargeColor("mew");
  if (ball.seinaChargeActive) return chargeColor("seina");
  if (ball.hitomiChargeGlow > 0) return chargeColor("hitomi");
  return null;
}

function chargeColor(id) {
  if (id === "aya") return "#ff2344";
  if (id === "mew") return "#dffcff";
  if (id === "hitomi") return "#b7f8ff";
  if (id === "seina") return "#d760ff";
  return "#ffffff";
}

function drawChargeBallEffect(ball, color) {
  ctx.save();
  const pulse = 1 + Math.sin(game.time * 18) * 0.08;
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 22;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 2.25 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 2.8 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ayaFlameGlowColor(ball) {
  if (!ball.ayaFlameSpecial) return null;
  return ["#ff7a22", "#ff2344", "#ffd35a", "#ffffff"][ayaFlameLevel(ball)];
}

function drawAyaFlameGlow(ball, color) {
  const level = ayaFlameLevel(ball);
  const pulse = 1 + Math.sin(game.time * (14 + level * 4)) * 0.08;
  const radius = ball.r * (1.8 + level * 0.45) * pulse;

  ctx.save();
  ctx.globalAlpha = 0.28 + level * 0.1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3 + level;
  ctx.shadowBlur = 24 + level * 10;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < level; i++) {
    const angle = game.time * (3 + i) + i * Math.PI * 2 / 3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ball.x + Math.cos(angle) * radius, ball.y + Math.sin(angle) * radius, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSeinaStackEffect(ball) {
  const stacks = ball.gravityStacks || 0;
  if (stacks <= 0) return;

  ctx.save();
  const maxed = stacks >= 5;
  const radius = ball.r + 6 + stacks * 1.8;
  ctx.globalAlpha = maxed ? 0.9 : 0.55 + stacks * 0.06;
  ctx.shadowBlur = maxed ? 22 : 10 + stacks * 2;
  ctx.shadowColor = "#d760ff";
  ctx.strokeStyle = maxed ? "#ffeb7a" : "#d760ff";
  ctx.lineWidth = maxed ? 3 : 2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < stacks; i++) {
    const angle = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    ctx.fillStyle = maxed ? "#ffeb7a" : "#d760ff";
    ctx.beginPath();
    ctx.arc(ball.x + Math.cos(angle) * radius, ball.y + Math.sin(angle) * radius, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 10px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(stacks), ball.x, ball.y - radius - 9);
  ctx.restore();
}

function drawMewChargeMarkers() {
  game.balls.forEach(ball => {
    if (!ball.mewChargeActive || !ball.mewMarkers) return;

    const points = Object.values(ball.mewMarkers);
    if (points.length >= 2) {
      ctx.save();
      ctx.strokeStyle = "rgba(223,252,255,0.52)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
      ctx.restore();
    }

    Object.entries(ball.mewMarkers).forEach(([marker, point]) => {
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#dffcff";
      ctx.fillStyle = marker === "paddle" ? "#ffe45c" : "#dffcff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    });
  });
}

function drawFreezeFilter() {
  if (game.freezeTime <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#b7f8ff";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  for (let y = 18; y < H; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y - 28);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLasers() {
  game.lasers.forEach(laser => {
    const alpha = clamp(laser.life / 0.24, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = laser.color || "#75efff";
    ctx.lineWidth = laser.radius * 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(laser.x1, laser.y1);
    ctx.lineTo(laser.x2, laser.y2);
    ctx.stroke();
    ctx.strokeStyle = laser.core || "#ffffff";
    ctx.lineWidth = Math.max(3, laser.radius * 0.34);
    ctx.stroke();
    ctx.lineCap = "butt";
  });
  ctx.globalAlpha = 1;
}

function drawBlackHole() {
  if (!game.blackHole) return;
  const pulse = 1 + Math.sin(game.time * 10) * 0.08;
  ctx.save();
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = "#d760ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(game.blackHole.x, game.blackHole.y, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#05010c";
  ctx.beginPath();
  ctx.arc(game.blackHole.x, game.blackHole.y, 22 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  game.particles.forEach(p => {
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawRipples() {
  game.ripples.forEach(ripple => {
    const progress = 1 - ripple.life / ripple.maxLife;
    const radius = ripple.radius * progress;
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.78;
    ctx.strokeStyle = ripple.color;
    ctx.shadowBlur = 22;
    ctx.shadowColor = ripple.color;
    ctx.lineWidth = 5 * (1 - progress) + 2;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = (1 - progress) * 0.16;
    ctx.fillStyle = ripple.color;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, radius * 0.96, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawTopHud() {
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(0, 0, W, 34);
  ctx.fillStyle = "#fff";
  ctx.font = "700 15px Segoe UI, sans-serif";
  ctx.fillText(`WAVE ${game.wave}`, 18, 22);
  ctx.fillText(`LIFE ${game.life}/${stats.maxLife}`, 118, 22);
  if (game.gameMode === "endless") {
    ctx.fillText(`BROKEN ${formatNumber(game.destroyedBlocks)}`, 238, 22);
  } else {
    ctx.fillText(`SCORE ${formatNumber(game.score)}`, 238, 22);
  }
  ctx.fillText(`COMBO ${game.combo}`, 400, 22);
  if (game.freezeTime > 0) {
    ctx.fillStyle = "#b7f8ff";
    ctx.fillText(`FREEZE ${game.freezeTime.toFixed(1)}s`, 540, 22);
  }
  if (game.blackHole) {
    ctx.fillStyle = "#e6b5ff";
    ctx.fillText(`BLACK HOLE ${game.blackHole.life.toFixed(1)}s`, 540, 22);
  }
}

function drawTutorialDialog() {
  if (!game || game.gameMode !== "tutorial") return;
  const messages = [
    "",
    "キーボードの左右で移動、左クリックでLIFEを1消費してボールを発射！",
    "左クリック長押し後に離すとLIFEを2消費のチャージショット！",
    "バンパーの色の違う位置でボールを跳ね返すとクリティカルスキルが発動！",
    "右クリック長押しでWAVE中一度の大技、スペシャルスキル！",
    "キャラごとに異なる個性を活かしてクリアを目指そう！"
  ];
  const text = messages[game.wave] || messages[5];
  const x = 58;
  const y = 48;
  const w = W - 116;
  const h = 62;

  ctx.save();
  roundRect(x, y, w, h, 8, "rgba(8, 12, 22, 0.68)");
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = "#17d6ff";
  ctx.font = "900 13px Segoe UI, sans-serif";
  ctx.fillText(`TUTORIAL WAVE ${game.wave}`, x + 16, y + 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px Segoe UI, sans-serif";
  ctx.fillText(text, x + 16, y + 47);
  ctx.restore();
}

function updateHud() {
  if (!game) return;
  waveBadge.textContent = `WAVE ${game.wave}`;
  lifeText.textContent = `${game.life} / ${stats.maxLife}`;
  scoreText.textContent = game.gameMode === "endless" ? `${formatNumber(game.destroyedBlocks)} BREAK` : formatNumber(game.score);
  if (shotText) shotText.textContent = game.cooldown <= 0 ? "" : `${game.cooldown.toFixed(1)}s`;
  if (skillText) skillText.textContent = game.skillUsed ? "USED" : game.rightHeld ? "CHARGE" : "";
}

function circleRect(circle, rect) {
  const cx = clamp(circle.x, rect.x, rect.x + rect.w);
  const cy = clamp(circle.y, rect.y, rect.y + rect.h);
  return Math.hypot(circle.x - cx, circle.y - cy) <= circle.r;
}

function lineIntersectsRect(x1, y1, x2, y2, rect) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1]
  ];

  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }

    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }

  return true;
}

function buildGuidePath(x, y, vx, vy) {
  if (stats.guide === 2) {
    return [{ x, y }, { x: x + vx * 120, y: y + vy * 120 }];
  }

  const maxBounces = stats.guide >= 5 ? 2 : stats.guide >= 4 ? 1 : 0;
  const points = [{ x, y }];
  let px = x;
  let py = y;
  let dx = vx;
  let dy = vy;

  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    const hit = findGuideHit(px, py, dx, dy);
    points.push({ x: hit.x, y: hit.y });
    if (!hit.reflect || bounce === maxBounces) break;

    px = hit.x + hit.nx * 0.8;
    py = hit.y + hit.ny * 0.8;
    if (hit.axis === "x") dx *= -1;
    else dy *= -1;
  }

  return points;
}

function findGuideHit(x, y, vx, vy) {
  const maxDistance = 1800;
  let best = { t: maxDistance, x: x + vx * maxDistance, y: y + vy * maxDistance, reflect: false };

  if (vx < 0) best = chooseGuideHit(best, { t: (0 - x) / vx, axis: "x", nx: 1, ny: 0, reflect: true }, x, y, vx, vy);
  if (vx > 0) best = chooseGuideHit(best, { t: (W - x) / vx, axis: "x", nx: -1, ny: 0, reflect: true }, x, y, vx, vy);
  if (vy < 0) best = chooseGuideHit(best, { t: (0 - y) / vy, axis: "y", nx: 0, ny: 1, reflect: true }, x, y, vx, vy);
  if (vy > 0) best = chooseGuideHit(best, { t: (H - y) / vy, axis: "y", nx: 0, ny: -1, reflect: false }, x, y, vx, vy);

  game.blocks.forEach(block => {
    const hit = rayRectHit(x, y, vx, vy, block);
    if (hit && hit.t < best.t) {
      best = { ...hit, reflect: true };
    }
  });

  return best;
}

function chooseGuideHit(best, candidate, x, y, vx, vy) {
  if (candidate.t <= 0 || candidate.t >= best.t) return best;
  return {
    ...candidate,
    x: x + vx * candidate.t,
    y: y + vy * candidate.t
  };
}

function rayRectHit(x, y, vx, vy, rect) {
  const tx1 = vx === 0 ? -Infinity : (rect.x - x) / vx;
  const tx2 = vx === 0 ? Infinity : (rect.x + rect.w - x) / vx;
  const ty1 = vy === 0 ? -Infinity : (rect.y - y) / vy;
  const ty2 = vy === 0 ? Infinity : (rect.y + rect.h - y) / vy;
  const tMin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
  const tMax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
  if (tMax < 0 || tMin <= 0 || tMin > tMax) return null;

  const hitX = x + vx * tMin;
  const hitY = y + vy * tMin;
  const nearX = Math.min(Math.abs(hitX - rect.x), Math.abs(hitX - (rect.x + rect.w)));
  const nearY = Math.min(Math.abs(hitY - rect.y), Math.abs(hitY - (rect.y + rect.h)));
  const axis = nearX < nearY ? "x" : "y";
  return {
    t: tMin,
    x: hitX,
    y: hitY,
    axis,
    nx: axis === "x" ? (hitX < rect.x + rect.w / 2 ? -1 : 1) : 0,
    ny: axis === "y" ? (hitY < rect.y + rect.h / 2 ? -1 : 1) : 0
  };
}

function thickLineIntersectsRect(x1, y1, x2, y2, radius, rect) {
  const expanded = {
    x: rect.x - radius,
    y: rect.y - radius,
    w: rect.w + radius * 2,
    h: rect.h + radius * 2
  };
  if (!lineIntersectsRect(x1, y1, x2, y2, expanded)) return false;

  if (lineIntersectsRect(x1, y1, x2, y2, rect)) return true;
  return distancePointToSegment(rect.x, rect.y, x1, y1, x2, y2) <= radius ||
    distancePointToSegment(rect.x + rect.w, rect.y, x1, y1, x2, y2) <= radius ||
    distancePointToSegment(rect.x + rect.w, rect.y + rect.h, x1, y1, x2, y2) <= radius ||
    distancePointToSegment(rect.x, rect.y + rect.h, x1, y1, x2, y2) <= radius;
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function roundRect(x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function roundStrokeRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function isDangerActive() {
  return game.blocks.some(block => block.y + block.h > H * 0.66);
}

function registerSpecialHit(ball, block) {
  const count = ball.hitCounts.get(block) || 0;
  if (count >= 3) return false;
  ball.hitCounts.set(block, count + 1);
  return true;
}

function hasLoadedBall() {
  return game && game.mode === "playing" && game.life > 0 && game.cooldown <= 0 && game.heldBalls.length === 0;
}

function loadedBallPosition() {
  return {
    x: game.paddle.x,
    y: game.paddle.y - game.paddle.h / 2 - 8
  };
}

function drawPaddleMeters(x, y, w, h) {
  const ctRatio = hasLoadedBall() ? 1 : 1 - clamp(game.cooldown / game.cooldownBase, 0, 1);
  const barX = x;
  const barY = y + h + 10;
  const barH = 7;

  roundRect(barX, barY, w, barH, 4, "rgba(255,255,255,0.18)");
  roundRect(barX, barY, w * ctRatio, barH, 4, hasLoadedBall() ? "#ffffff" : "#17d6ff");

  const ammoY = barY + 20;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  if (game.life >= 5) {
    ctx.beginPath();
    ctx.arc(barX + 9, ammoY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "700 13px Segoe UI, sans-serif";
    ctx.fillText(`x${game.life}`, barX + 20, ammoY + 4);
    return;
  }

  for (let i = 0; i < game.life; i++) {
    ctx.beginPath();
    ctx.arc(barX + 7 + i * 15, ammoY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function blockHpColors(hp) {
  if (hp <= 100) {
    return { light: "rgba(255, 76, 76, 0.98)", dark: "rgba(158, 18, 42, 0.98)" };
  }
  if (hp <= 250) {
    return { light: "rgba(255, 220, 70, 0.98)", dark: "rgba(197, 123, 17, 0.98)" };
  }
  if (hp <= 500) {
    return { light: "rgba(91, 236, 122, 0.98)", dark: "rgba(20, 139, 82, 0.98)" };
  }
  return { light: "rgba(77, 173, 255, 0.98)", dark: "rgba(29, 66, 190, 0.98)" };
}

window.addEventListener("keydown", event => {
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    ensureAudio();
    fireBall();
  }
});

window.addEventListener("keyup", event => keys.delete(event.code));

canvas.addEventListener("mousemove", event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) * (canvas.width / rect.width);
  pointer.y = (event.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener("click", event => {
  if (suppressNextClick) {
    suppressNextClick = false;
    event.preventDefault();
    return;
  }
  ensureAudio();
  fireBall();
});
canvas.addEventListener("contextmenu", event => event.preventDefault());
canvas.addEventListener("mousedown", event => {
  if (event.button === 0 && game && game.mode === "playing") {
    ensureAudio();
    leftPressStarted = performance.now();
  }
  if (event.button === 2 && game && game.mode === "playing") {
    ensureAudio();
    game.rightHeld = true;
    game.skillHold = 0;
  }
});
window.addEventListener("mouseup", event => {
  if (event.button === 0 && game && game.mode === "playing" && leftPressStarted) {
    const held = performance.now() - leftPressStarted;
    leftPressStarted = 0;
    if (held >= 420 && canUseChargeShot()) {
      suppressNextClick = true;
      fireBall(true);
    }
  }
  if (event.button === 2 && game) {
    game.rightHeld = false;
    game.skillHold = 0;
  }
});

startButton.addEventListener("click", showModeSelect);
modeButtons.forEach(button => {
  button.addEventListener("click", () => selectGameMode(button.dataset.mode));
});
modeStartButton.addEventListener("click", () => {
  startGame();
});
modeBackButton.addEventListener("click", showCharacterSelect);
titleButton.addEventListener("click", returnToTitle);
characterOptions.forEach(button => {
  button.addEventListener("click", () => applyCharacter(button.dataset.character));
});
applyCharacter("aya");
