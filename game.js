const QUESTIONS_PER_ISLAND = 8;
const DEVICE_PROFILE = detectDeviceProfile();
let deviceMode = getInitialDeviceMode();
const BATTLE_CONFIG = {
  desktop: {
    frameInterval: 0,
    maxProjectiles: 14,
    uiInterval: 0,
    playerSpeed: 1.25,
    duelBossShotInterval: null,
    timeBossShotBase: 1050,
    timeBossShotJitter: 780,
    restartAnimations: true
  },
  mobile: {
    frameInterval: 90,
    maxProjectiles: 6,
    uiInterval: 220,
    playerSpeed: 2.6,
    duelBossShotInterval: 2600,
    timeBossShotBase: 3000,
    timeBossShotJitter: 900,
    restartAnimations: false
  }
};
if (!BATTLE_CONFIG[deviceMode]) deviceMode = DEVICE_PROFILE.defaultMode;

const islandOrder = ["multiply", "decimal", "time"];
const rewardTypes = {
  woodSword: { name: "木劍", icon: "assets/generated/item-wood-sword.png", kind: "attack", power: 1 },
  ironSword: { name: "鐵劍", icon: "assets/generated/item-iron-sword.png", kind: "attack", power: 2 },
  starSword: { name: "星光劍", icon: "assets/generated/item-star-sword.png", kind: "attack", power: 3 },
  heart: { name: "生命藥水", icon: "assets/generated/item-heart.png", kind: "heal", power: 2 },
  shield: { name: "守護盾", icon: "assets/generated/item-shield.png", kind: "shield", power: 1 },
  crystal: { name: "力量水晶", icon: "assets/generated/item-crystal.png", kind: "attack", power: 2 }
};

const state = {
  island: "multiply",
  unlockedIslands: ["multiply"],
  clearedIslands: [],
  answered: [],
  correct: 0,
  combo: 0,
  maxCombo: 0,
  retryNeeded: 0,
  tutorialSeen: false,
  bossTauntShown: false,
  bossReadyMessageShown: false,
  rewards: [],
  currentQuestion: null,
  currentEvent: null,
  currentNode: null,
  battle: null,
  flight: null,
  time: null,
  pendingNextIsland: null,
  questionTimer: null,
  introTimer: null,
  introCallback: null,
  introPages: null,
  introPageIndex: 0,
  introNextText: "下一頁",
  introDoneText: "開始"
};

const islands = window.MATH_ISLAND_QUESTIONS;
const islandButtons = [...document.querySelectorAll(".island-card")];
const eventNodes = [...document.querySelectorAll(".map-node[data-event]")];
const currentIsland = document.querySelector("#currentIsland");
const answeredCount = document.querySelector("#answeredCount");
const correctCount = document.querySelector("#correctCount");
const weaponName = document.querySelector("#weaponName");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const bossPreviewBar = document.querySelector("#bossPreviewBar");
const hpPreview = document.querySelector("#hpPreview");
const attackPreview = document.querySelector("#attackPreview");
const comboPreview = document.querySelector("#comboPreview");
const inventoryIcons = document.querySelector("#inventoryIcons");
const soundToggle = document.querySelector("#soundToggle");
const bossButton = document.querySelector("#bossButton");
const bossNode = document.querySelector("#bossNode");
const bossMapIcon = document.querySelector("#bossMapIcon");
const bossTaunt = document.querySelector("#bossTaunt");
const bossTauntName = document.querySelector("#bossTauntName");
const missionLog = document.querySelector("#missionLog");
const hero = document.querySelector("#hero");
const heroImage = document.querySelector("#hero img");
const mapArt = document.querySelector("#mapArt");
const tutorialArrow = document.querySelector("#tutorialArrow");

const introOverlay = document.querySelector("#introOverlay");
const introTitle = document.querySelector("#introTitle");
const introText = document.querySelector("#introText");
const startIntro = document.querySelector("#startIntro");
const skipIntro = document.querySelector("#skipIntro");

const questionModal = document.querySelector("#questionModal");
const questionTitle = document.querySelector("#questionTitle");
const questionText = document.querySelector("#questionText");
const answerArea = document.querySelector("#answerArea");
const numberPad = document.querySelector("#numberPad");
const feedback = document.querySelector("#feedback");
const rewardCard = document.querySelector("#rewardCard");
const rewardIcon = document.querySelector("#rewardIcon");
const rewardName = document.querySelector("#rewardName");
const nextQuestion = document.querySelector("#nextQuestion");
const closeQuestion = document.querySelector("#closeQuestion");

const bossModal = document.querySelector("#bossModal");
const bossCard = document.querySelector(".boss-card");
const bossTitle = document.querySelector("#bossTitle");
const bossName = document.querySelector("#bossName");
const battleArena = document.querySelector("#battleArena");
const arenaPlayer = document.querySelector("#arenaPlayer");
const arenaBoss = document.querySelector("#arenaBoss");
const arenaBossImage = document.querySelector("#arenaBoss img");
const playerHpBar = document.querySelector("#playerHpBar");
const bossHpBar = document.querySelector("#bossHpBar");
const battleStatus = document.querySelector("#battleStatus");
const battleActions = document.querySelector("#battleActions");
const fireButton = document.querySelector("#fireButton");
const moveButtons = [...document.querySelectorAll("[data-move]")];
const endBattle = document.querySelector("#endBattle");
const heldMoves = new Set();
const clearModal = document.querySelector("#clearModal");
const clearText = document.querySelector("#clearText");
const clearNext = document.querySelector("#clearNext");
const flightControls = document.querySelector("#flightControls");
const flightButtons = [...document.querySelectorAll("[data-flight-move]")];
const heldFlightMoves = new Set();
const heldTimeMoves = new Set();
const timeWalkMask = {
  image: null,
  canvas: null,
  context: null,
  ready: false,
  loading: false
};
const originalHeroSrc = heroImage.src;
const originalNodeData = eventNodes.map((node) => ({
  node,
  event: node.dataset.event,
  src: node.querySelector("img")?.getAttribute("src") || ""
}));

const audio = {
  player: null,
  enabled: true,
  currentSrc: "",
  volume: 0.18,
  unlocked: false,
  sfxVolume: 0.48
};

function detectDeviceProfile() {
  const ua = navigator.userAgent || "";
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches || false;
  const iosLike = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && maxTouchPoints > 1);
  const tabletSize = Math.min(window.innerWidth || 0, window.innerHeight || 0) >= 600 && Math.max(window.innerWidth || 0, window.innerHeight || 0) <= 1400;
  const touchLikely = maxTouchPoints > 1 || coarse;
  return {
    iosLike,
    coarse,
    touchLikely,
    tabletSize,
    defaultMode: iosLike || coarse || (touchLikely && tabletSize) ? "mobile" : "desktop"
  };
}

function getBattleConfig() {
  return BATTLE_CONFIG[deviceMode] || BATTLE_CONFIG.desktop;
}

function getInitialDeviceMode() {
  const stored = getStoredDeviceMode();
  if (DEVICE_PROFILE.defaultMode === "desktop") return "desktop";
  return stored || DEVICE_PROFILE.defaultMode;
}

function getStoredDeviceMode() {
  try {
    return localStorage.getItem("mathAdventureDeviceMode");
  } catch {
    return null;
  }
}

function storeDeviceMode(mode) {
  try {
    localStorage.setItem("mathAdventureDeviceMode", mode);
  } catch {
    // File and private-browser modes may block storage; the runtime mode still changes.
  }
}

function isMobileBattleMode() {
  return deviceMode === "mobile";
}

function applyDeviceMode() {
  document.documentElement.classList.toggle("device-mobile", isMobileBattleMode());
  document.documentElement.classList.toggle("device-desktop", !isMobileBattleMode());
  document.documentElement.classList.toggle("low-power-battle", isMobileBattleMode());
  const toggle = createDeviceModeToggle();
  const current = document.querySelector("#deviceModeToggle");
  if (current) current.replaceWith(toggle);
  else document.querySelector(".hud")?.append(toggle);
  updateMapControlVisibility();
}

function createDeviceModeToggle() {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "deviceModeToggle";
  button.className = "device-mode-toggle";
  button.textContent = isMobileBattleMode() ? "平板模式" : "電腦模式";
  button.setAttribute("aria-label", "切換電腦或平板操作模式");
  button.addEventListener("click", () => {
    deviceMode = isMobileBattleMode() ? "desktop" : "mobile";
    storeDeviceMode(deviceMode);
    applyDeviceMode();
    if (state.battle && !state.battle.ended) {
      battleStatus.textContent = isMobileBattleMode()
        ? "已切換平板模式：可在戰鬥場地拖曳移動，點按攻擊。"
        : "已切換電腦模式：可用方向鍵或 WASD 移動，按發射攻擊。";
    }
  });
  return button;
}

const introMessage = "勇者，島上的寶物被怪獸封印了。\n點亮發光的寶箱、橋、石門和村民，回答題目取得武器與寶物。\n第一次每座島答對 8 題後，就會進入決鬥場。\n如果決鬥失敗，回到本關再答對 3 題就能重挑戰。\n打敗 Boss，下一座島才會開啟。";
const decimalIntroMessage = "小數湖的風變強了！\n這一關會變成空中卷軸冒險。\n用滑鼠或手指控制勇者飛行，避開怪物。\n碰到飛來的寶物會直接收下。\n碰到飛來的數學題時，畫面會暫停，答完再繼續飛。";
const timeIntroMessage = "時間塔外的森林庭院藏著發光寶箱。\n用方向鍵、WASD，或平板上的方向鍵移動勇者。\n靠近發光寶箱會自動開啟數學題。";

function resetIsland(islandKey) {
  if (!state.unlockedIslands.includes(islandKey)) {
    missionLog.textContent = "這座島還沒解鎖，先打敗目前島嶼的 Boss。";
    return;
  }

  stopBattleLoop();
  stopFlightMode();
  stopTimeMode();
  closeTransientModals();
  state.island = islandKey;
  if (audio.enabled) startMusic();
  state.answered = [];
  state.correct = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.retryNeeded = 0;
  state.bossTauntShown = false;
  state.bossReadyMessageShown = false;
  state.rewards = [];
  state.currentQuestion = null;
  state.currentEvent = null;
  state.currentNode = null;
  state.battle = null;
  state.pendingNextIsland = null;
  clearTimeout(state.questionTimer);

  eventNodes.forEach((node) => {
    node.classList.remove("visited");
    node.disabled = false;
    node.setAttribute("aria-disabled", "false");
  });
  restoreEventNodes();
  heroImage.src = originalHeroSrc;

  islandButtons.forEach((button) => {
    const unlocked = state.unlockedIslands.includes(button.dataset.island);
    button.classList.toggle("active", button.dataset.island === islandKey);
    button.classList.toggle("locked", !unlocked);
    button.disabled = !unlocked;
  });

  bossMapIcon.src = getBossImage(islands[islandKey].theme);
  hideBossTaunt();
  moveHeroPercent(18, 63);
  missionLog.textContent = `已抵達${islands[islandKey].name}。答題取得裝備，答對 ${getChallengeTarget()} 題後挑戰 Boss。`;
  updateTutorialArrow();
  updateHud();
  if (islandKey === "decimal") {
    showGuideMessage(getIslandGuideMessage("decimal"), "開始飛行", () => startFlightMode());
  } else if (islandKey === "time") {
    showGuideMessage(getIslandGuideMessage("time"), "開始探索", () => startTimeMode());
  }
}

function closeTransientModals() {
  bossModal.classList.add("hidden");
  questionModal.classList.add("hidden");
  clearModal.classList.add("hidden");
  battleActions.classList.add("hidden");
  endBattle.classList.add("hidden");
  rewardCard.classList.add("hidden");
  nextQuestion.classList.add("hidden");
  updateMapControlVisibility();
}

function shouldShowMapControls() {
  const modalOpen = !questionModal.classList.contains("hidden") || !bossModal.classList.contains("hidden") || !clearModal.classList.contains("hidden");
  if (!isMobileBattleMode() || modalOpen) return false;
  if (state.flight?.active && !state.flight.paused) return true;
  if (state.time?.active && !state.time.paused) return true;
  return false;
}

function updateMapControlVisibility() {
  flightControls?.classList.toggle("hidden", !shouldShowMapControls());
}

function getBossImage(theme) {
  return {
    rock: "assets/generated/boss-rock.png",
    lake: "assets/generated/boss-lake.png",
    clock: "assets/generated/boss-clock.png"
  }[theme];
}

function getAbility() {
  const accuracy = state.answered.length ? state.correct / state.answered.length : 0;
  const attackItems = state.rewards.filter((item) => item.kind === "attack");
  const bestAttack = Math.max(1, ...attackItems.map((item) => item.power));
  const crystals = state.rewards.filter((item) => item.id === "crystal").length;
  const hearts = state.rewards.filter((item) => item.id === "heart").length;
  const shields = state.rewards.filter((item) => item.id === "shield").length;
  const weapon = bestAttack >= 3 ? "星光劍" : bestAttack >= 2 ? "鐵劍" : "木劍";
  return {
    weapon,
    hp: 3 + hearts + Math.floor(shields / 2),
    attack: bestAttack + crystals,
    accuracy
  };
}

function updateHud() {
  const ability = getAbility();
  const target = getChallengeTarget();
  const progress = Math.min(1, state.correct / target);
  currentIsland.textContent = islands[state.island].name;
  answeredCount.textContent = `${state.correct} / ${target}`;
  correctCount.textContent = state.correct;
  weaponName.textContent = ability.weapon;
  progressText.textContent = `${Math.round(progress * 100)}%`;
  progressBar.style.width = `${progress * 100}%`;
  bossPreviewBar.style.width = `${Math.max(14, ability.accuracy * 100)}%`;
  hpPreview.textContent = ability.hp;
  attackPreview.textContent = ability.attack;
  comboPreview.textContent = state.combo;
  renderInventory();

  const ready = isBossReady();
  bossButton.disabled = !ready;
  bossButton.textContent = ready ? `挑戰${islands[state.island].boss}` : `答對 ${target} 題挑戰 Boss`;
  bossNode.classList.toggle("locked", !ready);
  if (ready) {
    showBossTauntOnce();
    showBossReadyMessage();
  }
}

function getChallengeTarget() {
  return state.retryNeeded || QUESTIONS_PER_ISLAND;
}

function getChallengeGoalText() {
  return state.retryNeeded
    ? `這次只要再答對 ${state.retryNeeded} 題，就能重新挑戰 Boss。`
    : `答對 ${QUESTIONS_PER_ISLAND} 題後，就能挑戰 Boss。`;
}

function getIslandGuideMessage(islandKey) {
  if (islandKey === "decimal") {
    return `${decimalIntroMessage}\n${getChallengeGoalText()}`;
  }
  if (islandKey === "time") {
    return `${timeIntroMessage}\n${getChallengeGoalText()}`;
  }
  return getChallengeGoalText();
}

function isBossReady() {
  return state.correct >= getChallengeTarget();
}

function updateTutorialArrow() {
  const show = state.island === "multiply" && !state.tutorialSeen && state.answered.length === 0;
  tutorialArrow.classList.toggle("hidden", !show);
}

function showBossTauntOnce() {
  if (state.bossTauntShown || !bossTaunt) return;
  state.bossTauntShown = true;
  bossTauntName.textContent = islands[state.island].boss;
  bossTaunt.querySelector("span").textContent = state.retryNeeded ? "再來挑戰我！" : "來找我決鬥！";
  bossTaunt.classList.remove("hidden");
  window.setTimeout(() => bossTaunt.classList.add("hidden"), 5200);
}

function showBossReadyMessage() {
  if (state.bossReadyMessageShown) return;
  state.bossReadyMessageShown = true;
  const bossNameText = islands[state.island].boss;
  missionLog.textContent = state.island === "time"
    ? `已答對 ${getChallengeTarget()} 題，請往庭院上方的 Boss 位置移動，挑戰${bossNameText}。`
    : `已答對 ${getChallengeTarget()} 題，可以去找${bossNameText}決鬥。`;
}

function hideBossTaunt() {
  if (bossTaunt) bossTaunt.classList.add("hidden");
}

function toggleSound() {
  audio.enabled = !audio.enabled;
  if (audio.enabled) {
    audio.unlocked = true;
    startMusic();
  } else {
    audio.unlocked = false;
    stopMusic();
  }
  updateSoundButton();
}

function updateSoundButton() {
  if (!soundToggle) return;
  soundToggle.textContent = audio.enabled ? "🔊" : "🔇";
  soundToggle.classList.toggle("on", audio.enabled);
  soundToggle.setAttribute("aria-label", audio.enabled ? "關閉音樂" : "開啟音樂");
}

function startMusic() {
  if (!audio.enabled) return;
  const src = getMusicSrcForIsland(state.island);
  if (!audio.player) {
    audio.player = new Audio();
    audio.player.loop = true;
    audio.player.preload = "auto";
  }
  if (audio.currentSrc !== src) {
    audio.player.pause();
    audio.player.src = src;
    audio.currentSrc = src;
  }
  audio.player.volume = audio.volume;
  audio.player.play().catch(() => {
    audio.unlocked = false;
    updateSoundButton();
  });
}

function stopMusic() {
  audio.player?.pause();
}

function getMusicSrcForIsland(islandKey) {
  return {
    multiply: "sounds/1.mp3",
    decimal: "sounds/2.mp3",
    time: "sounds/3.mp3"
  }[islandKey] || "sounds/1.mp3";
}

function playSfx(name) {
  if (!audio.enabled) return;
  const src = {
    correct: "sounds/right_ans.mp3",
    wrong: "sounds/wrong_ans.mp3",
    reward: "sounds/get_treasure.mp3",
    shield: "sounds/be_hit.mp3",
    hit: "sounds/be_hit.mp3",
    bossHit: "sounds/boss_be_hit.mp3",
    hammer: "sounds/hammer.mp3",
    time: "sounds/bell.mp3",
    win: "sounds/pass_boss.mp3",
    fireball: "sounds/fireball.mp3",
    fail: "sounds/nopass_boss.mp3",
    open: "sounds/openbox.mp3"
  }[name];
  if (!src) return;
  const effect = new Audio(src);
  effect.volume = audio.sfxVolume;
  effect.play().catch(() => {});
}

function unlockMusicPlayback() {
  if (!audio.enabled || audio.unlocked) return;
  audio.unlocked = true;
  startMusic();
}

function startFlightMode() {
  if (state.island !== "decimal") return;
  stopFlightMode();
  mapArt.classList.add("flight-mode");
  eventNodes.forEach((node) => {
    node.disabled = true;
    node.setAttribute("aria-disabled", "true");
  });
  state.flight = {
    active: true,
    paused: false,
    objects: [],
    frameId: null,
    lastFrame: performance.now(),
    lastSpawn: 0
  };
  moveHeroPercent(18, 50);
  missionLog.textContent = `小數湖飛行中：碰題目答題，答對 ${getChallengeTarget()} 題後挑戰 Boss。`;
  updateMapControlVisibility();
  state.flight.frameId = requestAnimationFrame(runFlightFrame);
}

function stopFlightMode() {
  if (state.flight?.frameId) cancelAnimationFrame(state.flight.frameId);
  clearFlightObjects();
  state.flight = null;
  heldFlightMoves.clear();
  mapArt.classList.remove("flight-mode", "flight-paused");
  updateMapControlVisibility();
}

function startTimeMode() {
  if (state.island !== "time") return;
  stopTimeMode();
  configureTimeNodes();
  loadTimeWalkMask();
  mapArt.classList.add("time-mode");
  heroImage.src = "assets/generated/time-hero-walk.png";
  state.time = {
    active: true,
    paused: false,
    frameId: null,
    lastFrame: performance.now(),
    opening: false
  };
  moveHeroPercent(18, 80);
  missionLog.textContent = `時間庭院探索中：靠近寶箱答題，答對 ${getChallengeTarget()} 題後挑戰 Boss。`;
  updateMapControlVisibility();
  state.time.frameId = requestAnimationFrame(runTimeFrame);
}

function stopTimeMode() {
  if (state.time?.frameId) cancelAnimationFrame(state.time.frameId);
  state.time = null;
  heldTimeMoves.clear();
  mapArt.classList.remove("time-mode");
  updateMapControlVisibility();
}

function pauseTimeMode() {
  if (!state.time) return;
  state.time.paused = true;
  updateMapControlVisibility();
}

function resumeTimeMode() {
  if (!state.time || state.island !== "time") return;
  state.time.paused = false;
  state.time.opening = false;
  state.time.lastFrame = performance.now();
  updateMapControlVisibility();
}

function configureTimeNodes() {
  eventNodes.forEach((node, index) => {
    const img = node.querySelector("img");
    node.dataset.event = "treasure";
    if (img) img.src = "assets/generated/prop-treasure.png";
    node.classList.toggle("time-hidden-node", index >= 8);
    node.disabled = index >= 8;
    node.setAttribute("aria-disabled", index >= 8 ? "true" : "false");
  });
}

function restoreEventNodes() {
  originalNodeData.forEach(({ node, event, src }) => {
    node.dataset.event = event;
    node.classList.remove("time-hidden-node");
    const img = node.querySelector("img");
    if (img && src) img.src = src;
  });
}

function runTimeFrame(now) {
  const time = state.time;
  if (!time || !time.active) return;
  const dt = Math.min(40, now - time.lastFrame) / 16.67;
  time.lastFrame = now;
  if (!time.paused) {
    updateTimeMovement(dt);
    checkTimeChestProximity();
  }
  time.frameId = requestAnimationFrame(runTimeFrame);
}

function updateTimeMovement(dt) {
  if (!heldTimeMoves.size) {
    hero.classList.remove("walking");
    return;
  }
  const pos = getHeroPercent();
  const speed = 0.34 * dt;
  let dx = 0;
  let dy = 0;
  if (heldTimeMoves.has("left")) dx -= 1;
  if (heldTimeMoves.has("right")) dx += 1;
  if (heldTimeMoves.has("up")) dy -= 1;
  if (heldTimeMoves.has("down")) dy += 1;
  if (dx && dy) {
    dx *= 0.707;
    dy *= 0.707;
  }
  const next = getTimeWalkTarget(pos, dx * speed, dy * speed);
  if (!next.moved) {
    hero.classList.remove("walking");
    return;
  }
  hero.style.left = `${next.x}%`;
  hero.style.top = `${next.y}%`;
  hero.classList.add("walking");
  if (dx < -0.05) hero.classList.add("face-left");
  if (dx > 0.05) hero.classList.remove("face-left");
}

function getTimeWalkTarget(pos, moveX, moveY) {
  const direct = {
    x: clamp(pos.x + moveX, 6, 88),
    y: clamp(pos.y + moveY, 15, 91)
  };
  if (isTimeWalkable(direct.x, direct.y)) return { ...direct, moved: true };

  const horizontal = { x: clamp(pos.x + moveX, 6, 88), y: pos.y };
  if (Math.abs(moveX) > 0.01 && isTimeWalkable(horizontal.x, horizontal.y)) {
    return { ...horizontal, moved: true };
  }

  const vertical = { x: pos.x, y: clamp(pos.y + moveY, 15, 91) };
  if (Math.abs(moveY) > 0.01 && isTimeWalkable(vertical.x, vertical.y)) {
    return { ...vertical, moved: true };
  }

  return { ...pos, moved: false };
}

function loadTimeWalkMask() {
  if (timeWalkMask.ready || timeWalkMask.loading) return;
  timeWalkMask.loading = true;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    timeWalkMask.image = image;
    timeWalkMask.canvas = canvas;
    timeWalkMask.context = context;
    timeWalkMask.ready = true;
    timeWalkMask.loading = false;
  };
  image.onerror = () => {
    timeWalkMask.loading = false;
  };
  image.src = "assets/generated/time-garden-map.png";
}

function isTimeWalkable(x, y) {
  if (timeWalkMask.ready && timeWalkMask.context) {
    try {
      return isTimeLandPixel(x, y);
    } catch (error) {
      timeWalkMask.ready = false;
    }
  }
  const zones = [
    { x: 17, y: 67, rx: 15, ry: 16 },
    { x: 29, y: 36, rx: 16, ry: 15 },
    { x: 43, y: 54, rx: 22, ry: 18 },
    { x: 56, y: 73, rx: 22, ry: 14 },
    { x: 67, y: 40, rx: 18, ry: 18 },
    { x: 75, y: 65, rx: 13, ry: 15 },
    { x: 58, y: 24, rx: 14, ry: 11 }
  ];
  return zones.some((zone) => {
    const nx = (x - zone.x) / zone.rx;
    const ny = (y - zone.y) / zone.ry;
    return nx * nx + ny * ny <= 1;
  });
}

function isTimeLandPixel(x, y) {
  const { canvas, context } = timeWalkMask;
  const px = clamp(Math.round((x / 100) * canvas.width), 0, canvas.width - 1);
  const py = clamp(Math.round((y / 100) * canvas.height), 0, canvas.height - 1);
  let landSamples = 0;
  let waterSamples = 0;

  for (let offsetY = -3; offsetY <= 3; offsetY += 3) {
    for (let offsetX = -3; offsetX <= 3; offsetX += 3) {
      const sx = clamp(px + offsetX, 0, canvas.width - 1);
      const sy = clamp(py + offsetY, 0, canvas.height - 1);
      const [r, g, b] = context.getImageData(sx, sy, 1, 1).data;
      if (isWaterColor(r, g, b)) waterSamples += 1;
      else landSamples += 1;
    }
  }

  return landSamples >= 5 && waterSamples <= 3;
}

function isWaterColor(r, g, b) {
  return b > 105 && g > 85 && b > r * 1.55 && g > r * 1.25;
}

function checkTimeChestProximity() {
  if (!state.time || state.time.opening || isBossReady()) return;
  const heroPos = getHeroPercent();
  const target = eventNodes.find((node) => {
    if (node.classList.contains("visited") || node.classList.contains("time-hidden-node")) return false;
    const pos = getNodePercent(node);
    return Math.hypot(pos.x - heroPos.x, pos.y - heroPos.y) < 8.5;
  });
  if (!target) return;
  state.time.opening = true;
  pauseTimeMode();
  state.currentNode = target;
  window.setTimeout(() => openQuestion("treasure"), 220);
}

function getNodePercent(element) {
  const nodeRect = element.getBoundingClientRect();
  const mapRect = mapArt.getBoundingClientRect();
  return {
    x: ((nodeRect.left - mapRect.left + nodeRect.width / 2) / mapRect.width) * 100,
    y: ((nodeRect.top - mapRect.top + nodeRect.height / 2) / mapRect.height) * 100
  };
}

function pauseFlightMode() {
  if (!state.flight) return;
  state.flight.paused = true;
  mapArt.classList.add("flight-paused");
  updateMapControlVisibility();
}

function resumeFlightMode() {
  if (!state.flight || state.island !== "decimal") return;
  state.flight.paused = false;
  mapArt.classList.remove("flight-paused");
  state.flight.lastFrame = performance.now();
  updateMapControlVisibility();
}

function runFlightFrame(now) {
  const flight = state.flight;
  if (!flight || !flight.active) return;
  const dt = Math.min(40, now - flight.lastFrame) / 16.67;
  flight.lastFrame = now;

  if (!flight.paused) {
    updateFlightControlMovement(dt);
    if (now - flight.lastSpawn > 1060) {
      spawnFlightObject();
      flight.lastSpawn = now;
    }
    updateFlightObjects(dt);
  }

  flight.frameId = requestAnimationFrame(runFlightFrame);
}

function updateFlightControlMovement(dt) {
  if (!heldFlightMoves.size) return;
  const pos = getHeroPercent();
  const speed = 0.82 * dt;
  let dx = 0;
  let dy = 0;
  if (heldFlightMoves.has("left")) dx -= 1;
  if (heldFlightMoves.has("right")) dx += 1;
  if (heldFlightMoves.has("up")) dy -= 1;
  if (heldFlightMoves.has("down")) dy += 1;
  if (dx && dy) {
    dx *= 0.707;
    dy *= 0.707;
  }
  hero.style.left = `${clamp(pos.x + dx * speed, 8, 92)}%`;
  hero.style.top = `${clamp(pos.y + dy * speed, 16, 84)}%`;
}

function spawnFlightObject() {
  if (!state.flight || isBossReady()) return;
  const roll = Math.random();
  const kind = roll < 0.48 ? "question" : roll < 0.76 ? "reward" : "monster";
  const el = document.createElement("button");
  el.type = "button";
  el.className = `flight-object ${kind}`;
  el.setAttribute("aria-label", kind === "question" ? "數學題" : kind === "reward" ? "寶物" : "怪物");
  if (kind === "question") el.innerHTML = `<img src="assets/generated/flight-question-scroll.png" alt="">`;
  if (kind === "reward") el.innerHTML = `<img src="${randomRewardIcon()}" alt="">`;
  if (kind === "monster") el.innerHTML = `<img src="assets/generated/boss-lake.png" alt="">`;
  const obj = {
    kind,
    el,
    x: 108,
    y: 18 + Math.random() * 66,
    speed: kind === "monster" ? 0.45 + Math.random() * 0.2 : 0.34 + Math.random() * 0.18,
    radius: kind === "monster" ? 5.8 : 4.8
  };
  el.style.left = `${obj.x}%`;
  el.style.top = `${obj.y}%`;
  mapArt.append(el);
  state.flight.objects.push(obj);
}

function randomRewardIcon() {
  const ids = ["woodSword", "ironSword", "heart", "shield", "crystal", "starSword"];
  return rewardTypes[ids[Math.floor(Math.random() * ids.length)]].icon;
}

function updateFlightObjects(dt) {
  const flight = state.flight;
  if (isBossReady()) {
    clearFlightObjects();
    flight.objects = [];
    bossNode.disabled = false;
    bossNode.setAttribute("aria-disabled", "false");
    missionLog.textContent = `小數湖已答對 ${getChallengeTarget()} 題，可以挑戰${islands[state.island].boss}。`;
    return;
  }
  const heroPos = getHeroPercent();
  flight.objects.forEach((obj) => {
    obj.x -= obj.speed * dt;
    obj.el.style.left = `${obj.x}%`;
    if (Math.hypot(obj.x - heroPos.x, obj.y - heroPos.y) < obj.radius + 5) {
      handleFlightCollision(obj);
      obj.dead = true;
    }
  });
  flight.objects = flight.objects.filter((obj) => {
    const alive = !obj.dead && obj.x > -10;
    if (!alive) obj.el.remove();
    return alive;
  });
}

function handleFlightCollision(obj) {
  if (obj.kind === "question") {
    pauseFlightMode();
    openQuestion("question");
    return;
  }
  if (obj.kind === "reward") {
    const reward = grantReward();
    playSfx("reward");
    missionLog.textContent = `空中取得 ${reward.name}！`;
    updateHud();
    return;
  }
  if (consumeMonsterShield()) {
    playSfx("shield");
    missionLog.textContent = "寶物擋住怪物了！少一個寶物，但答對數不會減少。";
    showFlightWarning("寶物擋住了！", "消耗 1 個寶物");
    hero.classList.add("hit");
    window.setTimeout(() => hero.classList.remove("hit"), 360);
    return;
  }
  state.flight.monsterHits = (state.flight.monsterHits || 0) + 1;
  if (state.flight.monsterHits >= 2) {
    playSfx("hit");
    state.flight.monsterHits = 0;
    state.correct = Math.max(0, state.correct - 1);
    missionLog.textContent = "連續撞到 2 隻怪物，少 1 題答對數。";
    showFlightWarning("被怪物干擾！", "答對數 -1");
    updateHud();
  } else {
    playSfx("hit");
    missionLog.textContent = "小心！再撞到 1 隻怪物會少 1 題答對數。";
    showFlightWarning("撞到怪物！", "再撞一次會扣答對數");
  }
  state.combo = 0;
  hero.classList.add("hit");
  window.setTimeout(() => hero.classList.remove("hit"), 360);
}

function consumeMonsterShield() {
  if (!state.rewards.length) return false;
  state.rewards.pop();
  updateHud();
  return true;
}

function showFlightWarning(title, detail) {
  let alert = mapArt.querySelector(".flight-alert");
  if (!alert) {
    alert = document.createElement("div");
    alert.className = "flight-alert";
    mapArt.append(alert);
  }
  alert.innerHTML = `<b>${title}</b><span>${detail}</span>`;
  alert.classList.remove("show");
  mapArt.classList.remove("flight-hit");
  void alert.offsetWidth;
  alert.classList.add("show");
  mapArt.classList.add("flight-hit");
  window.setTimeout(() => {
    alert.classList.remove("show");
    mapArt.classList.remove("flight-hit");
  }, 1050);
}

function clearFlightObjects() {
  mapArt.querySelectorAll(".flight-object").forEach((el) => el.remove());
  mapArt.querySelectorAll(".flight-alert").forEach((el) => el.remove());
  mapArt.classList.remove("flight-hit");
}

function getHeroPercent() {
  return {
    x: parseFloat(hero.style.left) || 18,
    y: parseFloat(hero.style.top) || 50
  };
}

function renderInventory() {
  const counts = state.rewards.reduce((result, item) => {
    result[item.id] = (result[item.id] || 0) + 1;
    return result;
  }, {});
  inventoryIcons.innerHTML = "";

  Object.entries(counts).forEach(([id, count]) => {
    const item = rewardTypes[id];
    const chip = document.createElement("div");
    chip.className = "inventory-chip";
    chip.title = `${item.name} x ${count}`;
    chip.innerHTML = `<img src="${item.icon}" alt=""><b>${count}</b>`;
    inventoryIcons.append(chip);
  });
}

function moveHeroPercent(x, y) {
  hero.style.left = `${x}%`;
  hero.style.top = `${y}%`;
  hero.classList.add("moving");
  window.setTimeout(() => hero.classList.remove("moving"), 560);
}

function moveHeroToElement(element) {
  const { x, y } = getNodePercent(element);
  moveHeroPercent(x, y);
}

function pickQuestion() {
  if (Math.random() < 0.12) return makeRandomQuestion(state.island);
  const pool = islands[state.island].questions.filter(isPlayableQuestion);
  const unused = pool.map((question, index) => ({ question, index })).filter((item) => !state.answered.includes(item.index));
  const picked = !unused.length
    ? { question: pool[Math.floor(Math.random() * pool.length)], index: -1 }
    : unused[Math.floor(Math.random() * unused.length)];
  return normalizeQuestionForPlay({ ...picked.question, __sourceIndex: picked.index });
}

function isPlayableQuestion(question) {
  const prompt = String(question.prompt);
  const unplayablePatterns = [
    /下表/,
    /下圖/,
    /看表/,
    /時刻表/,
    /現在是\(\s*\)時\(\s*\)分，還差\(\s*\)分鐘/,
    /現在是\(\s*\)時\(\s*\)分，\d+分鐘前是\(\s*\)時\(\s*\)分/,
    /現在是上午，上一班公車/,
    /電影就要開演了，電影開演的時刻/,
    /爸爸到達張伯伯家剛好是10時50分/
  ];
  return !unplayablePatterns.some((pattern) => pattern.test(prompt));
}

function choiceQuestion(prompt, answer, wrongs, explain) {
  return { type: "choice", prompt, choices: [...wrongs, answer].sort(() => Math.random() - 0.5), answer, explain };
}

function normalizeQuestionForPlay(question) {
  if (question.type !== "fill") return question;
  const reading = normalizeReadingQuestion(question);
  if (reading) return reading;
  const comparison = normalizeComparisonSymbolQuestion(question);
  if (comparison) return comparison;
  const yesNo = normalizeYesNoQuestion(question);
  if (yesNo) return yesNo;
  const divisionRemainder = normalizeDivisionRemainderQuestion(question);
  if (divisionRemainder) return divisionRemainder;
  const labeled = normalizeLabeledOptionQuestion(question);
  if (labeled) return labeled;
  const multipleAnswer = normalizeMultipleAnswerQuestion(question);
  if (multipleAnswer) return multipleAnswer;
  if (isSingleAlternativeQuestion(question)) {
    const accepted = getAcceptedAnswers(question);
    if (accepted.length >= 2 && accepted.length <= 4) {
      return {
        ...question,
        type: "choice",
        answer: accepted[0],
        acceptedAnswers: accepted,
        choices: buildAlternativeChoices(accepted).sort(() => Math.random() - 0.5)
      };
    }
  }
  if (!shouldUseChoiceForTextAnswer(question)) return question;
  const answer = String(question.answer).trim();
  const choices = buildTextChoices(question, answer);
  if (choices.length < 2) return question;
  return {
    ...question,
    type: "choice",
    answer,
    choices: [...new Set([answer, ...choices])].slice(0, 4).sort(() => Math.random() - 0.5)
  };
}

function normalizeReadingQuestion(question) {
  const prompt = String(question.prompt);
  if (!/正確讀法/.test(prompt)) return null;
  const answer = String(question.answer).trim();
  const choices = buildReadingChoices(answer);
  return {
    ...question,
    type: "choice",
    answer,
    choices: choices.sort(() => Math.random() - 0.5)
  };
}

function buildReadingChoices(answer) {
  const digits = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const choices = [answer];
  digits.forEach((digit) => {
    const candidate = answer.replace(/[一二三四五六七八九]$/, digit);
    if (!choices.includes(candidate) && choices.length < 4) choices.push(candidate);
  });
  return choices;
}

function normalizeComparisonSymbolQuestion(question) {
  if (!/填入[＞><＜=＝]/.test(String(question.prompt))) return null;
  const answer = normalizeComparisonSymbol(question.answer);
  if (!answer) return null;
  return {
    ...question,
    type: "choice",
    answer,
    choices: ["＞", "＜", "＝"],
    explain: `答案是 ${answer}。`
  };
}

function normalizeComparisonSymbol(value) {
  const text = String(value).replace(/[\uFF0C,\u3001\s]/g, "");
  if (/[＞>]/.test(text)) return "＞";
  if (/[＜<]/.test(text)) return "＜";
  if (/[=＝]/.test(text)) return "＝";
  return "";
}

function normalizeYesNoQuestion(question) {
  const prompt = String(question.prompt);
  if (!/[嗎?？]/.test(prompt)) return null;
  const answer = String(question.answer).trim();
  const yesAnswers = ["是", "可以", "一樣久", "會", "有"];
  const noAnswers = ["不是", "不可以", "不一樣久", "不會", "沒有"];
  if (![...yesAnswers, ...noAnswers].includes(answer)) return null;
  const choices = answer.includes("一樣久")
    ? ["一樣久", "不一樣久"]
    : yesAnswers.includes(answer) ? [answer, "不是"] : ["是", answer];
  return {
    ...question,
    type: "choice",
    answer,
    choices: [...new Set(choices)],
    explain: question.explain || `答案是 ${answer}。`
  };
}

function normalizeDivisionRemainderQuestion(question) {
  const prompt = String(question.prompt);
  const match = prompt.match(/根據算式，填填看。(\d+)÷(\d+)＝(\d+)…(\d+)\1－\4＝\(\s*\)×\(\s*\)/);
  if (!match) return null;
  const [, dividend, divisor, quotient, remainder] = match;
  return {
    ...question,
    prompt: `根據算式，填填看。\n${dividend}÷${divisor}＝${quotient}…${remainder}\n${dividend}－${remainder}＝( ) × ( )`,
    answer: [divisor, quotient],
    anyOrderAnswers: [divisor, quotient],
    explain: `詳解：把餘數 ${remainder} 扣掉，${dividend}－${remainder}＝${Number(dividend) - Number(remainder)}，也就是 ${divisor}×${quotient}。兩格可填 ${divisor}、${quotient}，順序可互換。`
  };
}

function normalizeMultipleAnswerQuestion(question) {
  const prompt = String(question.prompt);
  if (!/有哪些/.test(prompt)) return null;
  const answers = getAcceptedAnswers(question);
  if (answers.length < 2) return null;
  return {
    ...question,
    answer: answers[0],
    suffix: "",
    anyOrderAnswers: answers,
    explain: question.explain || `答案是 ${answers.join("、")}。`
  };
}

function normalizeLabeledOptionQuestion(question) {
  const prompt = String(question.prompt);
  if (!/哪些可能/.test(prompt) || !/[甲乙丙丁]：/.test(prompt)) return null;
  const answer = String(question.answer).trim();
  const options = [...new Set([answer, ...buildLabeledAnswerChoices(prompt, answer)])].slice(0, 4);
  if (options.length < 2) return null;
  return {
    ...question,
    type: "choice",
    answer,
    acceptedAnswers: [answer],
    choices: options.sort(() => Math.random() - 0.5),
    explain: question.explain || `答案是 ${answer}。`
  };
}

function buildLabeledAnswerChoices(prompt, answer) {
  const labels = [...prompt.matchAll(/([甲乙丙丁])：/g)].map((match) => match[1]);
  const choices = [];
  labels.forEach((label) => {
    if (label !== answer) choices.push(label);
  });
  for (let i = 0; i < labels.length; i += 1) {
    for (let j = i + 1; j < labels.length; j += 1) {
      const pair = `${labels[i]}、${labels[j]}`;
      if (pair !== answer) choices.push(pair);
    }
  }
  return choices;
}

function buildAlternativeChoices(accepted) {
  const choices = [...new Set(accepted.map(String))];
  for (let digit = 0; choices.length < 4 && digit <= 9; digit += 1) {
    const value = String(digit);
    if (!choices.includes(value)) choices.push(value);
  }
  return choices.slice(0, 4);
}

function shouldUseChoiceForTextAnswer(question) {
  const answer = String(question.answer).trim();
  return /[\u4e00-\u9fff]/.test(answer) && /誰|哪一|哪個|哪一個|哪一班|比較多|比較大|比較久|比較長|最多|最少|最大|最小/.test(question.prompt);
}

function buildTextChoices(question, answer) {
  const prompt = String(question.prompt);
  if (/宥希|詠安/.test(prompt)) return ["宥希", "詠安", "一樣多", "無法比較"];
  if (/甲班|乙班/.test(prompt)) return ["甲", "乙", "一樣多", "無法比較"];
  if (/上班|下班/.test(prompt)) return ["上班", "下班", "一樣多", "無法比較"];
  const names = [...prompt.matchAll(/[\u4e00-\u9fff]{2,4}(?=喝了|花了|：|班|和)/g)].map((match) => match[0]);
  return [...new Set([answer, ...names, "一樣多", "無法比較"])];
}

function makeRandomQuestion(islandKey) {
  if (islandKey === "multiply") return makeMultiplyQuestion();
  if (islandKey === "decimal") return makeDecimalQuestion();
  return makeTimeQuestion();
}

function makeMultiplyQuestion() {
  const mode = Math.floor(Math.random() * 3);
  if (mode === 0) {
    const a = 4 + Math.floor(Math.random() * 9);
    const b = 3 + Math.floor(Math.random() * 9);
    const ans = a * b;
    return choiceQuestion(`${a} 盒鉛筆，每盒 ${b} 枝，共有幾枝？`, `${ans} 枝`, [`${ans + b} 枝`, `${ans - b} 枝`, `${a + b} 枝`], `${a} × ${b} = ${ans}。`);
  }
  if (mode === 1) {
    const b = 3 + Math.floor(Math.random() * 9);
    const ans = 4 + Math.floor(Math.random() * 12);
    const total = b * ans;
    return { type: "fill", prompt: `${total} 顆糖果，每 ${b} 顆裝一袋，可以裝幾袋？`, answer: `${ans}`, suffix: "袋", explain: `${total} ÷ ${b} = ${ans}。` };
  }
  const people = 3 + Math.floor(Math.random() * 7);
  const each = 5 + Math.floor(Math.random() * 9);
  const total = people * each;
  return choiceQuestion(`${total} 張貼紙平分給 ${people} 人，每人幾張？`, `${each} 張`, [`${each + 1} 張`, `${each + 2} 張`, `${Math.max(1, each - 1)} 張`], `${total} ÷ ${people} = ${each}。`);
}

function makeDecimalQuestion() {
  const mode = Math.floor(Math.random() * 4);
  const oneDecimal = (n) => (Math.round(n * 10) / 10).toString();
  const cleanDecimal = (n) => (Math.round(n * 1000) / 1000).toString().replace(/\.0+$/, "");
  if (mode === 0) {
    const a = (10 + Math.floor(Math.random() * 70)) / 10;
    const b = (5 + Math.floor(Math.random() * 30)) / 10;
    const ans = oneDecimal(a + b);
    return choiceQuestion(`${a} + ${b} = ?`, ans, [oneDecimal(a + b + 0.1), oneDecimal(a + b - 0.2), oneDecimal(a + b + 1)], `${a} + ${b} = ${ans}。`);
  }
  if (mode === 1) {
    const b = (5 + Math.floor(Math.random() * 25)) / 10;
    const ans = (5 + Math.floor(Math.random() * 45)) / 10;
    const a = oneDecimal(ans + b);
    return { type: "fill", prompt: `${a} - ${b} = ?`, answer: oneDecimal(Number(a) - b), explain: `${a} - ${b} = ${oneDecimal(Number(a) - b)}。` };
  }
  if (mode === 2) {
    const a = [0.25, 0.5, 1.5, 2.5][Math.floor(Math.random() * 4)];
    const b = 2 + Math.floor(Math.random() * 4);
    const ans = cleanDecimal(a * b);
    return { type: "fill", prompt: `${a} × ${b} = ?`, answer: ans, explain: `${a} × ${b} = ${ans}。` };
  }
  const values = [Math.random(), Math.random(), Math.random(), Math.random()].map((v) => (Math.round(v * 100) / 100).toFixed(2));
  const answer = values.slice().sort((a, b) => Number(b) - Number(a))[0];
  return choiceQuestion("哪一個小數最大？", answer, values.filter((v) => v !== answer).slice(0, 3), `比較整數位、十分位、百分位，最大的是 ${answer}。`);
}

function makeTimeQuestion() {
  const mode = Math.floor(Math.random() * 3);
  const hour = 7 + Math.floor(Math.random() * 5);
  const minute = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50][Math.floor(Math.random() * 11)];
  const add = [20, 25, 30, 35, 40, 45, 50, 60, 75][Math.floor(Math.random() * 9)];
  const total = hour * 60 + minute + add;
  const endHour = Math.floor(total / 60);
  const endMinute = total % 60;
  const end = `${endHour}:${String(endMinute).padStart(2, "0")}`;
  if (mode === 0) {
    return { type: "fill", prompt: `${hour}:${String(minute).padStart(2, "0")} 再過 ${add} 分，是幾點？請輸入 ${end} 這種格式。`, answer: end, explain: `把 ${add} 分加上去，得到 ${end}。` };
  }
  if (mode === 1) {
    return choiceQuestion(`從 ${hour}:${String(minute).padStart(2, "0")} 到 ${end}，經過多久？`, `${add} 分`, [`${add - 5} 分`, `${add + 5} 分`, `${add + 10} 分`], `結束時間減開始時間，經過 ${add} 分。`);
  }
  const h = 1 + Math.floor(Math.random() * 3);
  const m = [5, 10, 15, 20, 25, 30, 40, 45, 50][Math.floor(Math.random() * 9)];
  return { type: "fill", prompt: `${h} 小時 ${m} 分 = 幾分鐘？`, answer: `${h * 60 + m}`, suffix: "分鐘", explain: `${h} 小時是 ${h * 60} 分，再加 ${m} 分。` };
}

function eventLabel(eventName) {
  return { treasure: "寶箱", bridge: "橋", door: "門", npc: "NPC", question: "飛行題" }[eventName] || "挑戰";
}

function openQuestion(eventName) {
  if (isBossReady()) {
    missionLog.textContent = `已答對 ${getChallengeTarget()} 題，可以挑戰${islands[state.island].boss}。`;
    return;
  }

  playSfx("open");
  const question = pickQuestion();
  state.currentQuestion = question;
  state.currentEvent = eventName;
  questionTitle.textContent = `${islands[state.island].name} - ${eventLabel(eventName)}`;
  questionText.textContent = formatPrompt(question.prompt);
  feedback.textContent = "";
  feedback.className = "feedback";
  rewardCard.classList.add("hidden");
  nextQuestion.classList.add("hidden");
  renderAnswerControls(question, answerArea, numberPad, handleExploreAnswer);
  questionModal.classList.remove("hidden");
  updateMapControlVisibility();
}

function markCurrentNodeVisited() {
  if (!state.currentNode) return;
  state.currentNode.classList.add("visited");
  state.currentNode.disabled = true;
  state.currentNode.setAttribute("aria-disabled", "true");
  state.currentNode = null;
}

function normalizeAnswer(value) {
  return String(value).trim().replace(/[\uFF0C\u3001]/g, ",").replace(/\s+/g, "").replace("：", ":");
}

function formatPrompt(prompt) {
  return splitJoinedEquations(String(prompt))
    .replace(/(上面\d+個算式)/g, "\n$1")
    .replace(/(想想看，)/g, "\n$1")
    .replace(/；/g, "；\n")
    .replace(/。(?=\S)/g, "。\n")
    .replace(/\)(?=\d+(?:\.\d+)?[×÷+\-])/g, ")\n")
    .replace(/([？?。])(?=\S)/g, "$1\n")
    .replace(/([，,])(?=\S)/g, "$1\n");
}

function splitJoinedEquations(prompt) {
  let text = prompt
    .replace(/＝□(?=\d+[×÷+\-])/g, "＝□\n")
    .replace(/＝■(?=\d+[×÷+\-])/g, "＝■\n")
    .replace(/(÷■＝5)(?=5×■)/g, "$1\n")
    .replace(/([×÷+\-]\(\s*\)＝\d+(?:\.\d+)?)(?=\d+(?:\.\d+)?[×÷+\-])/g, "$1\n")
    .replace(/(＝□)(?=上面)/g, "$1\n");
  const expressionPattern = /(\d+(?:\.\d+)?)([×÷+\-])(\d+(?:\.\d+)?)＝/g;
  let guard = 0;

  while (guard < 20) {
    guard += 1;
    let insertAt = -1;
    let match;
    expressionPattern.lastIndex = 0;
    while ((match = expressionPattern.exec(text))) {
      const [expr, leftText, op, rightText] = match;
      const left = Number(leftText);
      const right = Number(rightText);
      let value = null;
      if (op === "×") value = left * right;
      if (op === "÷" && right !== 0) value = left / right;
      if (op === "+") value = left + right;
      if (op === "-") value = left - right;
      if (value === null || !Number.isFinite(value)) continue;

      const valueText = Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
      const start = match.index + expr.length;
      const afterValue = start + valueText.length;
      if (
        text.slice(start).startsWith(valueText) &&
        /^\d+(?:\.\d+)?[×÷+\-]/.test(text.slice(afterValue))
      ) {
        insertAt = afterValue;
        break;
      }
    }
    if (insertAt < 0) break;
    text = `${text.slice(0, insertAt)}\n${text.slice(insertAt)}`;
  }

  return text;
}

function getExpectedAnswers(question) {
  if (Array.isArray(question.anyOrderAnswers)) return question.anyOrderAnswers.map(String);
  if (Array.isArray(question.answer)) return question.answer.map(String);
  const answers = String(question.answer).includes("\uFF0C") || String(question.answer).includes(",")
    ? String(question.answer).split(/[\uFF0C,]/).map((item) => item.trim()).filter(Boolean)
    : [String(question.answer)];
  if (question.suffix && /^\s*\//.test(String(question.suffix))) {
    const suffixParts = String(question.suffix).split(/[\uFF0C,\u3001、,]/).map((item) => item.trim()).filter(Boolean);
    if (suffixParts.length) {
      answers[0] = `${answers[0]}${suffixParts[0]}`;
      answers.push(...suffixParts.slice(1));
    }
  } else if (question.suffix && /^[\uFF0C,\u3001、]/.test(String(question.suffix))) {
    const extra = String(question.suffix).replace(/^[\uFF0C,\u3001、]\s*/, "").trim();
    if (extra) answers.push(...extra.split(/[\uFF0C,\u3001、]/).map((item) => item.trim()).filter(Boolean));
  } else if (question.suffix && /[\uFF0C,\u3001、]/.test(String(question.suffix))) {
    const parts = String(question.suffix).split(/[\uFF0C,\u3001、]/).map((item) => item.trim()).filter(Boolean);
    if (parts.length) {
      answers[0] = `${answers[0]}${parts[0]}`;
      answers.push(...parts.slice(1));
    }
  }
  return answers;
}

function isSingleAlternativeQuestion(question) {
  const prompt = String(question.prompt);
  return /可能是多少/.test(prompt) && !/不可能/.test(prompt);
}

function splitAnswerOptions(value) {
  return String(value).split(/[\uFF0C,\u3001、]/).map((item) => item.trim()).filter(Boolean);
}

function getAcceptedAnswers(question) {
  const answers = splitAnswerOptions(question.answer);
  if (question.suffix && /^[\uFF0C,\u3001、]/.test(String(question.suffix))) {
    answers.push(...splitAnswerOptions(question.suffix));
  }
  return answers;
}

function isCorrectAnswer(value, question) {
  if (Array.isArray(question.anyOrderAnswers)) {
    const expected = question.anyOrderAnswers.map(normalizeAnswer).sort();
    const given = (Array.isArray(value) ? value : String(value).split(/[\uFF0C,\u3001\s]+/))
      .filter(Boolean)
      .map(normalizeAnswer)
      .sort();
    return expected.length === given.length && expected.every((answer, index) => answersMatch(given[index], answer));
  }
  if (Array.isArray(question.acceptedAnswers)) {
    const accepted = question.acceptedAnswers.map(normalizeAnswer);
    return accepted.some((answer) => answersMatch(value, answer));
  }
  if (isSingleAlternativeQuestion(question)) {
    const accepted = getAcceptedAnswers(question).map(normalizeAnswer);
    return accepted.some((answer) => answersMatch(value, answer));
  }
  if (question.type === "choice") {
    if (isComputedDurationAnswer(value, question)) return true;
    const accepted = [question.answer, ...(Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [])]
      .flat()
      .map(String);
    return accepted.some((answer) => answersMatch(value, answer));
  }
  const expected = getExpectedAnswers(question).map(normalizeAnswer);
  if (expected.length === 1) {
    return expected.some((answer) => answersMatch(value, answer));
  }
  const given = Array.isArray(value)
    ? value.map(normalizeAnswer)
    : String(value).split(/[\uFF0C,\u3001\s]+/).filter(Boolean).map(normalizeAnswer);
  if (expected.length !== given.length) return false;
  if (isEquivalentMeridiemTimeAnswer(question, given, expected)) return true;
  return expected.every((answer, index) => answersMatch(given[index], answer));
}

function isComputedDurationAnswer(value, question) {
  const prompt = String(question.prompt);
  if (!/經過多久/.test(prompt)) return false;
  const match = prompt.match(/(\d{1,2})\s*:\s*(\d{2})[\s\S]*?(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) return false;
  const [, startHourText, startMinuteText, endHourText, endMinuteText] = match;
  const start = Number(startHourText) * 60 + Number(startMinuteText);
  let end = Number(endHourText) * 60 + Number(endMinuteText);
  if (end < start) end += 24 * 60;
  const duration = end - start;
  const givenNumber = extractNumericAnswer(value);
  return givenNumber !== null && Number(givenNumber) === duration;
}

function isEquivalentMeridiemTimeAnswer(question, given, expected) {
  if (!/下午/.test(String(question.prompt)) || expected.length !== 2 || given.length !== 2) return false;
  if (!isPlainNumber(given[0]) || !isPlainNumber(given[1]) || !isPlainNumber(expected[0]) || !isPlainNumber(expected[1])) return false;
  const givenHour = Number(given[0]);
  const givenMinute = Number(given[1]);
  const expectedHour = Number(expected[0]);
  const expectedMinute = Number(expected[1]);
  const expected24Hour = expectedHour === 12 ? 12 : expectedHour + 12;
  return givenMinute === expectedMinute && (givenHour === expectedHour || givenHour === expected24Hour);
}

function answersMatch(given, expected) {
  const normalizedGiven = normalizeAnswer(given);
  const normalizedExpected = normalizeAnswer(expected);
  if (normalizedGiven === normalizedExpected) return true;
  if (isPlainNumber(normalizedGiven) && isPlainNumber(normalizedExpected)) {
    return Number(normalizedGiven) === Number(normalizedExpected);
  }
  const givenNumber = extractNumericAnswer(normalizedGiven);
  const expectedNumber = extractNumericAnswer(normalizedExpected);
  if (givenNumber !== null && expectedNumber !== null) {
    return Number(givenNumber) === Number(expectedNumber);
  }
  return false;
}

function isPlainNumber(value) {
  return /^-?\d+(?:\.\d+)?$/.test(String(value));
}

function extractNumericAnswer(value) {
  const text = normalizeAnswer(value)
    .replace(/[()（）]/g, "")
    .replace(/答案是/g, "");
  const match = text.match(/^-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const rest = text.slice(match[0].length);
  if (!rest) return match[0];
  return /^[\u4e00-\u9fff]+$/.test(rest) ? match[0] : null;
}

function grantReward() {
  const roll = Math.random();
  let id = "woodSword";
  if (state.correct >= 6 && roll < 0.34) id = "starSword";
  else if (state.correct >= 3 && roll < 0.48) id = "ironSword";
  else if (roll < 0.64) id = "heart";
  else if (roll < 0.82) id = "shield";
  else if (roll < 0.94) id = "crystal";

  const reward = { id, ...rewardTypes[id] };
  state.rewards.push(reward);
  rewardIcon.src = reward.icon;
  rewardName.textContent = reward.name;
  rewardCard.classList.remove("hidden");
  return reward;
}

function handleExploreAnswer(value) {
  const question = state.currentQuestion;
  const correct = isCorrectAnswer(value, question);
  const index = Number.isInteger(question.__sourceIndex) ? question.__sourceIndex : islands[state.island].questions.indexOf(question);
  state.answered.push(index >= 0 ? index : `random-${Date.now()}-${Math.random()}`);
  markCurrentNodeVisited();
  state.tutorialSeen = true;
  updateTutorialArrow();

  if (correct) {
    state.correct += 1;
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const reward = grantReward();
    playSfx("correct");
    playSfx("reward");
    feedback.textContent = `答對了！獲得 ${reward.name}，決鬥場可以使用。`;
    feedback.classList.add("good");
  } else {
    state.combo = 0;
    playSfx("wrong");
    feedback.textContent = `沒有拿到寶物。${question.explain}`;
    feedback.classList.add("bad");
  }

  refreshExplorationNodesIfNeeded();
  answerArea.querySelectorAll("button, input").forEach((el) => (el.disabled = true));
  numberPad.querySelectorAll("button").forEach((el) => (el.disabled = true));
  nextQuestion.classList.remove("hidden");
  updateHud();
}

function refreshExplorationNodesIfNeeded() {
  if (state.flight?.active || isBossReady()) return;
  const available = eventNodes.some((node) => !node.classList.contains("visited") && !node.classList.contains("time-hidden-node"));
  const hasEnoughAttemptsForRefresh = state.answered.length >= getChallengeTarget();
  if (available && !hasEnoughAttemptsForRefresh) return;
  eventNodes.forEach((node) => {
    if (node.classList.contains("time-hidden-node")) return;
    node.classList.remove("visited");
    node.disabled = false;
    node.setAttribute("aria-disabled", "false");
  });
  missionLog.textContent = `還需要答對 ${getChallengeTarget() - state.correct} 題，新的目標又亮起來了。`;
}

function renderAnswerControls(question, target, padTarget, callback) {
  target.innerHTML = "";
  padTarget.innerHTML = "";
  padTarget.classList.add("hidden");

  if (question.type === "choice") {
    [...question.choices].sort(() => Math.random() - 0.5).forEach((choice) => {
      const button = document.createElement("button");
      button.className = "answer-button";
      button.textContent = choice;
      button.addEventListener("click", () => callback(choice));
      target.append(button);
    });
    return;
  }

  const row = document.createElement("div");
  row.className = "fill-row";
  const isAlternative = isSingleAlternativeQuestion(question);
  const expectedAnswers = isAlternative ? [getAcceptedAnswers(question)[0] || ""] : getExpectedAnswers(question);
  const inputs = expectedAnswers.map((_, index) => {
    const input = document.createElement("input");
    input.inputMode = expectedAnswers.some((answer) => String(answer).includes("/")) ? "text" : "decimal";
    input.autocomplete = "off";
    input.placeholder = isAlternative ? "輸入其中一個答案" : (expectedAnswers.length > 1 ? `第 ${index + 1} 格答案` : (question.suffix ? `輸入答案（${question.suffix}）` : "輸入答案"));
    return input;
  });
  const submit = document.createElement("button");
  submit.className = "primary";
  submit.textContent = "送出";
  submit.addEventListener("click", () => {
    const values = inputs.map((input) => input.value);
    if (values.every(Boolean)) callback(expectedAnswers.length > 1 ? values : values[0]);
  });
  inputs.forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const values = inputs.map((item) => item.value);
        if (values.every(Boolean)) callback(expectedAnswers.length > 1 ? values : values[0]);
      }
    });
    row.append(input);
  });
  row.append(submit);
  target.append(row);

  let activeInput = inputs[0];
  inputs.forEach((input) => input.addEventListener("focus", () => {
    activeInput = input;
  }));

  ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", ":", "/", "清除"].forEach((key) => {
    const keyButton = document.createElement("button");
    keyButton.textContent = key;
    keyButton.addEventListener("click", () => {
      activeInput.value = key === "清除" ? "" : activeInput.value + key;
      activeInput.focus();
    });
    padTarget.append(keyButton);
  });
  padTarget.classList.remove("hidden");
  window.setTimeout(() => inputs[0].focus(), 50);
}

function startBossBattle() {
  const target = getChallengeTarget();
  if (!isBossReady()) {
    missionLog.textContent = `還需要答對 ${target - state.correct} 題才能挑戰 Boss。`;
    return;
  }

  stopFlightMode();
  pauseTimeMode();
  showBossGuidePages(() => beginBossBattle());
}

function beginBossBattle() {
  stopFlightMode();
  if (state.island === "decimal") {
    startWhackBossBattle();
    return;
  }
  if (state.island === "time") {
    startTimeBossBattle();
    return;
  }
  const ability = getAbility();
  const bossMaxHp = 38 + islandOrder.indexOf(state.island) * 14;
  state.battle = {
    playerHp: ability.hp,
    playerMaxHp: ability.hp,
    bossHp: bossMaxHp,
    bossMaxHp,
    ended: false,
    player: { x: 18, y: 72, radius: 5 },
    boss: { x: 78, y: 30, radius: 8 },
    projectiles: [],
    touchTarget: null,
    lastUiUpdate: 0,
    lastRenderedPlayerHp: -1,
    lastRenderedBossHp: -1,
    lastShot: 0,
    lastBossShot: 0,
    nextMobileBossAttack: 0,
    lastHit: 0,
    attackPower: ability.attack,
    bossDamage: getBossDamage(),
    waitingToStart: true,
    frameId: null,
    lastFrame: performance.now()
  };

  if (bossTitle) bossTitle.textContent = `${ability.weapon} 對決 ${islands[state.island].boss}`;
  bossName.textContent = islands[state.island].boss;
  arenaPlayer.querySelector("img").src = "assets/generated/hero.png";
  arenaBossImage.src = getBossImage(islands[state.island].theme);
  arenaBoss.classList.remove("defeated", "hit");
  arenaBoss.style.opacity = "";
  battleStatus.textContent = "先看完說明，按確認後開始。";
  endBattle.classList.add("hidden");
  battleActions.classList.add("hidden");
  battleActions.classList.remove("time-actions", "duel-actions", "whack-actions");
  bossModal.classList.remove("hidden");
  clearArenaProjectiles();
  battleActions.classList.add("duel-actions");
  bossCard?.classList.add("duel-boss-layout");
  showDuelInstruction(ability.weapon);
  updateBattleBars();
  renderBattlePositions();
}

function showBossGuidePages(callback) {
  const pages = getBossGuidePages(state.island);
  showGuidePages(pages, "下一頁", "開始決鬥", callback);
}

function getBossGuidePages(islandKey) {
  if (islandKey === "multiply") {
    return [
      "長老：乘除島的岩獸守在火山路口。\n牠把乘除符號刻在身上，靠近時會用巨石與火球阻擋勇者。",
      "闖關方式：用方向鍵、WASD，或平板方向鍵移動。\n按空白鍵或「發射」使用武器攻擊岩獸，邊打邊閃避火球。",
      "提醒：你答題取得的寶物會先幫你擋 Boss 攻擊。\n寶物用完後，才會開始扣血。"
    ];
  }
  if (islandKey === "decimal") {
    return [
      "長老：小數水靈很狡猾，最喜歡躲在洞裡偷襲。\n牠會突然冒出來，又立刻沉回水中。",
      "闖關方式：滑鼠移動或手指滑動控制槌子。\n看到 Boss 冒出洞口，就點一下或按空白鍵揮槌。",
      "提醒：Boss 有時會丟火球。\n你答題得到的寶物會先抵擋火球，寶物用完才扣血。"
    ];
  }
  return [
    "長老：時鐘守衛最怕時間快轉。\n只要時間被撥得太快，牠就會急速衰老、失去力量。",
    "闖關方式：在六座時鐘塔之間移動。\n靠近發光鐘塔後，按空白鍵、Enter、或直接點塔，撥快 2 小時。",
    "提醒：每座鐘塔撥過會變灰，要等 5 秒才能再用。\n總共快轉 24 小時就能讓 Boss 衰老消失。",
    "Boss 會追你並丟火球。\n答題得到的寶物會先抵擋攻擊，寶物用完才扣血。"
  ];
}

function showDuelInstruction(weapon) {
  const instruction = document.createElement("div");
  instruction.className = "battle-instruction";
  instruction.innerHTML = `
    <section>
      <h3>Boss 決鬥</h3>
      <p>電腦：用方向鍵或 WASD 移動，按空白鍵發射 ${weapon}。</p>
      <p>平板：用方向鍵移動，按「發射」攻擊。</p>
      <p>閃避 Boss 和火球，命中 Boss 會把牠擊退。</p>
      <button type="button" class="primary">確認開始</button>
    </section>
  `;
  instruction.querySelector("button").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startDuelRound();
  });
  battleArena.append(instruction);
}

function startDuelRound() {
  const battle = state.battle;
  if (!battle || battle.mode === "whack") return;
  battle.waitingToStart = false;
  battle.lastFrame = performance.now();
  battle.nextMobileBossAttack = performance.now() + 2600;
  battleArena.querySelector(".battle-instruction")?.remove();
  battleActions.classList.remove("time-actions", "whack-actions");
  battleActions.classList.add("duel-actions");
  battleActions.classList.remove("hidden");
  battleStatus.textContent = `開始決鬥！移動閃避攻擊，按「發射」攻擊 Boss。`;
  battle.frameId = requestAnimationFrame(runBattleFrame);
}

function startWhackBossBattle() {
  const ability = getAbility();
  const bossMaxHp = 54;
  state.battle = {
    mode: "whack",
    playerHp: ability.hp + 2,
    playerMaxHp: ability.hp + 2,
    bossHp: bossMaxHp,
    bossMaxHp,
    ended: false,
    activeHole: -1,
    bossVisible: false,
    waitingToStart: true,
    hammer: { x: 50, y: 70 },
    popStartedAt: 0,
    hideAt: 0,
    nextPopAt: Number.POSITIVE_INFINITY,
    attackAt: 0,
    attackPower: ability.attack,
    bossDamage: 1,
    lastUiUpdate: 0,
    lastRenderedPlayerHp: -1,
    lastRenderedBossHp: -1,
    frameId: null,
    lastFrame: performance.now()
  };

  if (bossTitle) bossTitle.textContent = `槌子決鬥 ${islands[state.island].boss}`;
  bossName.textContent = islands[state.island].boss;
  arenaBossImage.src = getBossImage(islands[state.island].theme);
  arenaBoss.classList.remove("defeated", "hit");
  arenaBoss.style.opacity = "";
  battleStatus.textContent = "先看完說明，按確認後開始。";
  endBattle.classList.add("hidden");
  battleActions.classList.add("hidden");
  battleActions.classList.remove("time-actions", "duel-actions", "whack-actions");
  bossCard?.classList.remove("time-boss-layout", "duel-boss-layout");
  bossCard?.classList.add("whack-boss-layout");
  bossModal.classList.remove("hidden");
  setupWhackArena();
  updateBattleBars();
  state.battle.frameId = requestAnimationFrame(runBattleFrame);
}

function startTimeBossBattle() {
  stopTimeMode();
  const ability = getAbility();
  state.battle = {
    mode: "timeRitual",
    playerHp: ability.hp + 3,
    playerMaxHp: ability.hp + 3,
    bossHp: 24,
    bossMaxHp: 24,
    ended: false,
    player: { x: 50, y: 76, radius: 4.6 },
    boss: { x: 50, y: 35, radius: 7.2 },
    projectiles: [],
    touchTarget: null,
    towerEls: [],
    lastUiUpdate: 0,
    lastRenderedPlayerHp: -1,
    lastRenderedBossHp: -1,
    towers: createTimeTowerState(),
    acceleratedHours: 0,
    nearestTower: null,
    lastBossShot: 0,
    nextMobileBossAttack: 0,
    lastHit: 0,
    bossDamage: 1,
    waitingToStart: true,
    frameId: null,
    lastFrame: performance.now()
  };

  if (bossTitle) bossTitle.textContent = `快轉時間 對決 ${islands[state.island].boss}`;
  bossName.textContent = islands[state.island].boss;
  arenaBossImage.src = getTimeBossAgeImage(0);
  arenaBoss.classList.remove("defeated", "hit");
  arenaBoss.style.opacity = "";
  battleStatus.textContent = "先看完說明，按確認後開始。";
  endBattle.classList.add("hidden");
  battleActions.classList.add("hidden");
  battleActions.classList.remove("duel-actions", "whack-actions");
  battleActions.classList.add("time-actions");
  bossCard?.classList.remove("duel-boss-layout", "whack-boss-layout");
  bossCard?.classList.add("time-boss-layout");
  bossModal.classList.remove("hidden");
  setupTimeBossArena();
  updateBattleBars();
  renderBattlePositions();
  state.battle.frameId = requestAnimationFrame(runBattleFrame);
}

function createTimeTowerState() {
  return [
    { x: 12, y: 43, readyAt: 0 },
    { x: 30, y: 26, readyAt: 0 },
    { x: 66, y: 24, readyAt: 0 },
    { x: 86, y: 41, readyAt: 0 },
    { x: 28, y: 72, readyAt: 0 },
    { x: 70, y: 72, readyAt: 0 }
  ];
}

function setupTimeBossArena() {
  clearArenaProjectiles();
  battleArena.classList.add("time-boss-mode");
  battleActions.classList.add("time-actions");
  bossCard?.classList.add("time-boss-layout");
  battleArena.querySelector(".arena-hint").textContent = "靠近發光時鐘塔，按空白鍵或點塔撥快時間。";
  arenaPlayer.querySelector("img").src = "assets/generated/time-hero-walk.png";

  const meter = document.createElement("div");
  meter.className = "time-ritual-meter";
  meter.id = "timeRitualMeter";
  meter.innerHTML = `
    <b>時間快轉</b>
    <span id="timeRitualText">0 / 24 小時</span>
    <i><em id="timeRitualBar"></em></i>
  `;

  const towerLayer = document.createElement("div");
  towerLayer.className = "time-tower-layer";
  state.battle.towers.forEach((tower, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-tower";
    button.dataset.tower = String(index);
    button.setAttribute("aria-label", `第 ${index + 1} 座時鐘塔`);
    button.style.left = `${tower.x}%`;
    button.style.top = `${tower.y}%`;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      accelerateTimeTower(index);
    });
    towerLayer.append(button);
  });
  state.battle.towerEls = [...towerLayer.querySelectorAll(".time-tower")];

  const instruction = document.createElement("div");
  instruction.className = "battle-instruction time-boss-instruction";
  instruction.innerHTML = `
    <section>
      <h3>時間塔決鬥</h3>
      <div class="time-rules">
        <b>目標：快轉 24 小時</b>
        <span>靠近發光鐘塔，按空白鍵／Enter／點塔撥快 2 小時。</span>
        <span>鐘塔變灰要等 5 秒。Boss 會追你並丟火球。</span>
        <span>寶物會先擋火球，用完才扣血。</span>
      </div>
      <button type="button" class="primary">確認開始</button>
    </section>
  `;
  instruction.querySelector("button").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startTimeBossRound();
  });

  battleArena.append(towerLayer);
  battleArena.append(meter);
  battleArena.append(instruction);
  fireButton.textContent = "撥快時間";
  updateTimeRitualUi();
}

function startTimeBossRound() {
  const battle = state.battle;
  if (!battle || battle.mode !== "timeRitual") return;
  battle.waitingToStart = false;
  battle.lastFrame = performance.now();
  battle.lastBossShot = performance.now() + 650;
  battle.nextMobileBossAttack = performance.now() + 2800;
  battleArena.querySelector(".battle-instruction")?.remove();
  battleActions.classList.remove("duel-actions", "whack-actions");
  battleActions.classList.add("time-actions");
  battleActions.classList.remove("hidden");
  battleStatus.textContent = "靠近時鐘塔並撥快時間，累積 24 小時讓 Boss 衰老。";
}

function runBattleFrame(now) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  const config = getBattleConfig();
  if (config.frameInterval && battle.lastFrame && now - battle.lastFrame < config.frameInterval) {
    battle.frameId = requestAnimationFrame(runBattleFrame);
    return;
  }
  const dt = Math.min(50, now - battle.lastFrame) / 16.67;
  battle.lastFrame = now;
  if (battle.mode === "whack") {
    updateWhackBattle(now);
    updateBattleBars(now);
    battle.frameId = requestAnimationFrame(runBattleFrame);
    return;
  }
  if (battle.mode === "timeRitual") {
    if (isMobileBattleMode()) {
      updateMobileTimeBossBattle(now);
      updateBattleBars(now);
      updateTimeRitualUi(now);
      battle.frameId = requestAnimationFrame(runBattleFrame);
      return;
    }
    updateTimeBossBattle(dt, now);
    updateProjectiles(dt);
    renderBattlePositions();
    updateBattleBars(now);
    updateTimeRitualUi(now);
    battle.frameId = requestAnimationFrame(runBattleFrame);
    return;
  }
  if (isMobileBattleMode()) {
    updateMobileDuelBattle(now);
    updateBattleBars(now);
    battle.frameId = requestAnimationFrame(runBattleFrame);
    return;
  }
  updatePlayerMovement(dt);
  updateBossMovement(dt, now);
  updateProjectiles(dt);
  renderBattlePositions();
  updateBattleBars(now);
  battle.frameId = requestAnimationFrame(runBattleFrame);
}

function setupWhackArena() {
  clearArenaProjectiles();
  battleArena.classList.add("whack-mode");
  battleActions.classList.add("whack-actions");
  bossCard?.classList.add("whack-boss-layout");
  const hammer = document.createElement("div");
  hammer.className = "whack-cursor";
  hammer.id = "whackCursor";
  const instruction = document.createElement("div");
  instruction.className = "whack-instruction";
  instruction.innerHTML = `
    <section>
      <h3>槌子決鬥</h3>
      <p>滑鼠移動或手指滑動，槌子會跟著移動。</p>
      <p>看到 Boss 從洞裡冒出來，就點一下或按空白鍵揮槌。</p>
      <p>Boss 有時會丟火球，血量歸零就要回去再答對 3 題。</p>
      <button type="button" class="primary">確認開始</button>
    </section>
  `;
  instruction.querySelector("button").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startWhackRound();
  });
  const grid = document.createElement("div");
  grid.className = "whack-grid";
  for (let index = 0; index < 9; index += 1) {
    const hole = document.createElement("button");
    hole.type = "button";
    hole.className = "whack-hole";
    hole.dataset.hole = String(index);
    hole.setAttribute("aria-label", `第 ${index + 1} 個洞`);
    hole.innerHTML = `
      <span class="hole-shadow"></span>
      <span class="hole-boss"><img src="${getBossImage(islands[state.island].theme)}" alt=""></span>
      <span class="hammer-hit"></span>
    `;
    grid.append(hole);
  }
  battleArena.append(grid);
  battleArena.append(hammer);
  battleArena.append(instruction);
  updateWhackHammerPosition(50, 72);
}

function updateWhackBattle(now) {
  const battle = state.battle;
  if (battle.waitingToStart) return;
  if (!battle.bossVisible && now >= battle.nextPopAt) {
    showWhackBoss(now);
  }
  if (battle.bossVisible && now >= battle.attackAt) {
    throwWhackFireball();
    battle.attackAt = Number.POSITIVE_INFINITY;
  }
  if (battle.bossVisible && now >= battle.hideAt) {
    hideWhackBoss();
    battle.nextPopAt = now + 360 + Math.random() * 520;
  }
}

function startWhackRound() {
  const battle = state.battle;
  if (!battle || battle.mode !== "whack") return;
  battle.waitingToStart = false;
  battle.nextPopAt = performance.now() + 520;
  battleArena.querySelector(".whack-instruction")?.remove();
  battleStatus.textContent = "移動槌子，看到 Boss 冒出來就點擊揮槌。";
}

function updateMobileDuelBattle(now) {
  const battle = state.battle;
  if (battle.waitingToStart) return;
  const dt = Math.min(40, now - battle.lastFrame) / 16.67;
  updatePlayerMovement(dt);
  updateBossMovement(dt, now);
  updateProjectiles(dt);
  renderBattlePositions();
}

function updateMobileTimeBossBattle(now) {
  const battle = state.battle;
  if (battle.waitingToStart) return;
  const dt = Math.min(40, now - battle.lastFrame) / 16.67;
  updatePlayerMovement(dt);
  updateTimeBossMovement(dt, now);
  updateNearestTimeTower(now);
  if (now - battle.lastBossShot > 3000 + Math.random() * 900) {
    shootBossFireball();
    battle.lastBossShot = now;
  }
  updateProjectiles(dt);
  renderBattlePositions();
}

function updateTimeBossBattle(dt, now) {
  const battle = state.battle;
  if (battle.waitingToStart) return;
  updatePlayerMovement(dt);
  updateTimeBossMovement(dt, now);
  updateNearestTimeTower(now);
  const config = getBattleConfig();
  const shotInterval = config.timeBossShotBase + Math.random() * config.timeBossShotJitter;
  if (now - battle.lastBossShot > shotInterval) {
    shootBossFireball();
    battle.lastBossShot = now;
  }
}

function updateTimeBossMovement(dt, now) {
  const battle = state.battle;
  const dx = battle.player.x - battle.boss.x;
  const dy = battle.player.y - battle.boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 0.34 * dt;
  battle.boss.x = clamp(battle.boss.x + (dx / dist) * speed, 10, 90);
  battle.boss.y = clamp(battle.boss.y + (dy / dist) * speed, 16, 86);

  if (dist < battle.player.radius + battle.boss.radius && now - battle.lastHit > 900) {
    hurtPlayer(1);
    knockBackPlayer(dx, dy, 6);
    battle.lastHit = now;
  }
}

function updateNearestTimeTower(now = performance.now()) {
  const battle = state.battle;
  if (!battle || battle.mode !== "timeRitual") return;
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  battle.towers.forEach((tower, index) => {
    const distanceToTower = Math.hypot(tower.x - battle.player.x, tower.y - battle.player.y);
    if (distanceToTower < nearestDistance) {
      nearestDistance = distanceToTower;
      nearest = index;
    }
  });
  battle.nearestTower = nearestDistance <= 9.5 ? nearest : null;

  (battle.towerEls || []).forEach((towerEl) => {
    const index = Number(towerEl.dataset.tower);
    const cooling = now < battle.towers[index].readyAt;
    towerEl.classList.toggle("near", battle.nearestTower === index && !cooling);
    towerEl.classList.toggle("cooling", cooling);
  });
}

function accelerateNearestTimeTower() {
  const battle = state.battle;
  if (!battle || battle.mode !== "timeRitual") return;
  updateNearestTimeTower();
  if (isMobileBattleMode() && battle.nearestTower === null) {
    const now = performance.now();
    const index = battle.towers.findIndex((tower) => now >= tower.readyAt);
    if (index >= 0) {
      accelerateTimeTower(index);
      return;
    }
    battleStatus.textContent = "時鐘塔還在冷卻，等它重新發光再點。";
    return;
  }
  if (!isMobileBattleMode() && battle.nearestTower === null) {
    battleStatus.textContent = "請先靠近發光的時鐘塔，再撥快時間。";
    return;
  }
  accelerateTimeTower(battle.nearestTower);
}

function accelerateTimeTower(index) {
  const battle = state.battle;
  if (!battle || battle.mode !== "timeRitual" || battle.ended || battle.waitingToStart) return;
  const tower = battle.towers[index];
  const now = performance.now();
  const distanceToTower = Math.hypot(tower.x - battle.player.x, tower.y - battle.player.y);
  if (!isMobileBattleMode() && distanceToTower > 12) {
    battleStatus.textContent = "離時鐘塔太遠了，靠近一點才能撥動。";
    return;
  }
  if (now < tower.readyAt) {
    battleStatus.textContent = "這座時鐘塔剛撥過，等它重新發光再使用。";
    return;
  }
  tower.readyAt = now + 5000;
  battle.acceleratedHours = Math.min(24, battle.acceleratedHours + 2);
  playSfx("time");
  battle.bossHp = Math.max(0, 24 - battle.acceleratedHours);
  showTimePulse(tower.x, tower.y);
  setTimeBossAge();
  updateTimeRitualUi(now);
  battleStatus.textContent = `時鐘塔快轉 2 小時，已累積 ${battle.acceleratedHours} / 24 小時。`;
  if (battle.acceleratedHours >= 24) {
    battleStatus.textContent = "時間快轉完成，Boss 急速衰老了！";
    finishBattle(true);
  }
}

function showTimePulse(x, y) {
  const pulse = document.createElement("div");
  pulse.className = "time-pulse";
  pulse.style.left = `${x}%`;
  pulse.style.top = `${y}%`;
  battleArena.append(pulse);
  window.setTimeout(() => pulse.remove(), 720);
}

function setTimeBossAge() {
  const battle = state.battle;
  const stage = Math.min(3, Math.floor(battle.acceleratedHours / 8));
  arenaBossImage.src = getTimeBossAgeImage(stage);
  arenaBoss.classList.remove("aging");
  if (getBattleConfig().restartAnimations) void arenaBoss.offsetWidth;
  arenaBoss.classList.add("aging");
}

function getTimeBossAgeImage(stage) {
  return `assets/generated/time-boss-age-${clamp(stage, 0, 3)}.png`;
}

function showTimeVictoryFireworks() {
  battleArena.querySelector(".time-victory")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "time-victory";
  overlay.innerHTML = `
    <div class="arena-fireworks" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </div>
    <section>
      <h3>恭喜過關！</h3>
      <p>時間快轉完成，Boss 已經衰老消失。</p>
    </section>
  `;
  battleArena.append(overlay);
}

function updateTimeRitualUi(now = performance.now()) {
  const battle = state.battle;
  if (!battle || battle.mode !== "timeRitual") return;
  const text = battleArena.querySelector("#timeRitualText");
  const bar = battleArena.querySelector("#timeRitualBar");
  if (text) text.textContent = `${battle.acceleratedHours} / 24 小時`;
  if (bar) bar.style.width = `${(battle.acceleratedHours / 24) * 100}%`;
  updateNearestTimeTower(now);
}

function showWhackBoss(now) {
  const battle = state.battle;
  const holes = [...battleArena.querySelectorAll(".whack-hole")];
  holes.forEach((hole) => hole.classList.remove("active", "hit"));
  battle.activeHole = Math.floor(Math.random() * holes.length);
  battle.bossVisible = true;
  battle.popStartedAt = now;
  battle.hideAt = now + Math.max(940, 1450 - state.correct * 22);
  battle.attackAt = Math.random() < 0.34 ? now + 560 + Math.random() * 470 : Number.POSITIVE_INFINITY;
  holes[battle.activeHole]?.classList.add("active");
}

function hideWhackBoss() {
  const battle = state.battle;
  battleArena.querySelectorAll(".whack-hole").forEach((hole) => hole.classList.remove("active", "hit", "boss-struck"));
  battle.bossVisible = false;
  battle.activeHole = -1;
}

function whackHole(index) {
  const battle = state.battle;
  if (!battle || battle.mode !== "whack" || battle.ended || battle.waitingToStart) return;
  swingWhackHammer();
  const hole = battleArena.querySelector(`.whack-hole[data-hole="${index}"]`);
  hole?.classList.remove("hit");
  if (getBattleConfig().restartAnimations) void hole?.offsetWidth;
  hole?.classList.add("hit");
  if (!battle.bossVisible || battle.activeHole !== index) {
    battleStatus.textContent = "敲空了，等 Boss 冒出來再打！";
    return;
  }
  battle.bossVisible = false;
  battle.bossHp = Math.max(0, battle.bossHp - battle.attackPower);
  battleStatus.textContent = `敲中 Boss！造成 ${battle.attackPower} 點傷害。`;
  playSfx("bossHit");
  hole?.classList.add("boss-struck");
  if (battle.bossHp <= 0) {
    finishBattle(true);
    return;
  }
  window.setTimeout(() => {
    hideWhackBoss();
    battle.nextPopAt = performance.now() + 320 + Math.random() * 420;
  }, 260);
}

function whackActiveHole() {
  const battle = state.battle;
  if (!battle || battle.mode !== "whack" || battle.ended || battle.waitingToStart) return;
  if (battle.bossVisible && battle.activeHole >= 0) {
    whackHole(battle.activeHole);
    return;
  }
  swingWhackHammer();
  battleArena.classList.remove("whack-empty");
  if (getBattleConfig().restartAnimations) void battleArena.offsetWidth;
  battleArena.classList.add("whack-empty");
  battleStatus.textContent = "Boss 還沒冒出來，等牠出現再揮槌！";
}

function swingWhackHammer() {
  const hammer = battleArena.querySelector("#whackCursor");
  if (!hammer) return;
  playSfx("hammer");
  hammer.classList.remove("swing");
  if (getBattleConfig().restartAnimations) void hammer.offsetWidth;
  hammer.classList.add("swing");
}

function updateWhackHammerPosition(x, y) {
  const battle = state.battle;
  if (!battle || battle.mode !== "whack") return;
  battle.hammer.x = clamp(x, 4, 96);
  battle.hammer.y = clamp(y, 10, 94);
  const hammer = battleArena.querySelector("#whackCursor");
  if (!hammer) return;
  hammer.style.left = `${battle.hammer.x}%`;
  hammer.style.top = `${battle.hammer.y}%`;
}

function updateWhackHammerFromPointer(event) {
  if (!state.battle || state.battle.mode !== "whack") return;
  const rect = battleArena.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  updateWhackHammerPosition(x, y);
}

battleArena.addEventListener("pointermove", updateWhackHammerFromPointer);
battleArena.addEventListener("pointerdown", (event) => {
  if (!state.battle || state.battle.mode !== "whack") return;
  if (event.target.closest(".whack-instruction")) return;
  event.preventDefault();
  event.stopPropagation();
  updateWhackHammerFromPointer(event);
  const hole = event.target.closest(".whack-hole");
  if (hole) whackHole(Number(hole.dataset.hole));
  else whackActiveHole();
});

battleArena.addEventListener("pointerdown", (event) => {
  const battle = state.battle;
  if (!battle || battle.ended || battle.waitingToStart || battle.mode === "whack") return;
  if (event.target.closest(".battle-instruction, .time-tower, button")) return;
  event.preventDefault();
  setBattleTouchTarget(event);
  battleArena.setPointerCapture?.(event.pointerId);
});

battleArena.addEventListener("pointermove", (event) => {
  const battle = state.battle;
  if (!battle || battle.ended || battle.waitingToStart || battle.mode === "whack") return;
  if (!(event.buttons & 1) && event.pointerType !== "touch") return;
  event.preventDefault();
  setBattleTouchTarget(event);
});

battleArena.addEventListener("pointerup", clearBattleTouchTarget);
battleArena.addEventListener("pointercancel", clearBattleTouchTarget);

function setBattleTouchTarget(event) {
  const battle = state.battle;
  if (!battle) return;
  const rect = battleArena.getBoundingClientRect();
  battle.touchTarget = {
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 16, 88)
  };
}

function clearBattleTouchTarget() {
  if (state.battle) state.battle.touchTarget = null;
}

function throwWhackFireball() {
  const battle = state.battle;
  if (!battle || battle.mode !== "whack" || battle.ended || !battle.bossVisible) return;
  const active = battleArena.querySelector(".whack-hole.active");
  if (!active) return;
  playSfx("fireball");
  const arenaRect = battleArena.getBoundingClientRect();
  const rect = active.getBoundingClientRect();
  const fireball = document.createElement("div");
  fireball.className = "whack-fireball";
  fireball.style.left = `${rect.left - arenaRect.left + rect.width / 2}px`;
  fireball.style.top = `${rect.top - arenaRect.top + rect.height / 2}px`;
  battleArena.append(fireball);
  window.setTimeout(() => {
    fireball.remove();
    if (!battle.ended) hurtPlayer(battle.bossDamage);
  }, 520);
}

function updatePlayerMovement(dt) {
  const battle = state.battle;
  const speed = getBattleConfig().playerSpeed * dt;
  let dx = 0;
  let dy = 0;
  if (heldMoves.has("left")) dx -= 1;
  if (heldMoves.has("right")) dx += 1;
  if (heldMoves.has("up")) dy -= 1;
  if (heldMoves.has("down")) dy += 1;
  if (battle.touchTarget) {
    const targetDx = battle.touchTarget.x - battle.player.x;
    const targetDy = battle.touchTarget.y - battle.player.y;
    const targetDist = Math.hypot(targetDx, targetDy);
    if (targetDist > 1.2) {
      dx += targetDx / targetDist;
      dy += targetDy / targetDist;
    }
  }
  if (dx && dy) {
    const mag = Math.hypot(dx, dy) || 1;
    dx /= mag;
    dy /= mag;
  }
  battle.player.x = clamp(battle.player.x + dx * speed, 8, 92);
  battle.player.y = clamp(battle.player.y + dy * speed, 16, 88);
}

function updateBossMovement(dt, now) {
  const battle = state.battle;
  const dx = battle.player.x - battle.boss.x;
  const dy = battle.player.y - battle.boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = getBossSpeed() * dt;
  battle.boss.x += (dx / dist) * speed;
  battle.boss.y += (dy / dist) * speed;

  if (dist < battle.player.radius + battle.boss.radius && now - battle.lastHit > 760) {
    hurtPlayer(battle.bossDamage);
    knockBackPlayer(dx, dy, 7);
    battle.lastHit = now;
  }

  const config = getBattleConfig();
  const bossShotInterval = config.duelBossShotInterval || Math.max(480, 820 - islandOrder.indexOf(state.island) * 130);
  if (now - battle.lastBossShot > bossShotInterval) {
    shootBossFireball();
    battle.lastBossShot = now;
  }
}

function updateProjectiles(dt) {
  const battle = state.battle;
  battle.projectiles.forEach((shot) => {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    positionBattleElement(shot.el, shot.x, shot.y);

    if (shot.owner === "player" && distance(shot, battle.boss) < battle.boss.radius + shot.radius) {
      hitBoss(shot.power, shot.vx, shot.vy);
      shot.life = 0;
    }
    if (shot.owner === "boss" && distance(shot, battle.player) < battle.player.radius + shot.radius) {
      hurtPlayer(shot.power);
      shot.life = 0;
    }
  });

  battle.projectiles = battle.projectiles.filter((shot) => {
    const alive = shot.life > 0 && shot.x > -8 && shot.x < 108 && shot.y > -8 && shot.y < 108;
    if (!alive) shot.el.remove();
    return alive;
  });
}

function playerShoot() {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  const now = performance.now();
  if (now - battle.lastShot < 360) return;
  playSfx("fireball");
  battle.lastShot = now;
  const dx = battle.boss.x - battle.player.x;
  const dy = battle.boss.y - battle.player.y;
  const dist = Math.hypot(dx, dy) || 1;
  createProjectile({
    owner: "player",
    className: "player-shot",
    x: battle.player.x,
    y: battle.player.y,
    vx: (dx / dist) * 2.45,
    vy: (dy / dist) * 2.45,
    power: battle.attackPower + (state.maxCombo >= 3 ? 1 : 0),
    radius: 2.2,
    life: 95
  });
}

function shootBossFireball() {
  const battle = state.battle;
  playSfx("fireball");
  const dx = battle.player.x - battle.boss.x;
  const dy = battle.player.y - battle.boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  createProjectile({
    owner: "boss",
    className: "boss-shot",
    x: battle.boss.x,
    y: battle.boss.y,
    vx: (dx / dist) * (1.55 + islandOrder.indexOf(state.island) * 0.12),
    vy: (dy / dist) * (1.55 + islandOrder.indexOf(state.island) * 0.12),
    power: battle.bossDamage,
    radius: 2.8,
    life: 140
  });
}

function createProjectile(projectileConfig) {
  const battle = state.battle;
  const battleConfig = getBattleConfig();
  if (!battle || battleConfig.maxProjectiles <= 0) return;
  if (!battle || battle.projectiles.length >= battleConfig.maxProjectiles) {
    const old = battle?.projectiles.shift();
    old?.el.remove();
  }
  const el = document.createElement("div");
  el.className = `projectile ${projectileConfig.className}`;
  positionBattleElement(el, projectileConfig.x, projectileConfig.y);
  battleArena.append(el);
  state.battle.projectiles.push({ ...projectileConfig, el });
}

function hitBoss(power, vx, vy) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  battle.bossHp = Math.max(0, battle.bossHp - power);
  const push = 1.1 + power * 0.42;
  const mag = Math.hypot(vx, vy) || 1;
  battle.boss.x = clamp(battle.boss.x + (vx / mag) * push, 8, 92);
  battle.boss.y = clamp(battle.boss.y + (vy / mag) * push, 16, 88);
  battleStatus.textContent = `命中 Boss，造成 ${power} 點傷害並擊退。`;
  playSfx("bossHit");
  flashEntity(arenaBoss);
  if (battle.bossHp <= 0) finishBattle(true);
}

function hurtPlayer(power) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  const blockedByItem = consumeBattleTreasure();
  if (blockedByItem) {
    battleStatus.textContent = `${blockedByItem.name} 擋住了 Boss 攻擊，背包少 1 個寶物。`;
    playSfx("shield");
    if (battle.mode === "whack") {
      battleArena.classList.remove("whack-damaged");
      if (getBattleConfig().restartAnimations) void battleArena.offsetWidth;
      battleArena.classList.add("whack-damaged");
    } else {
      flashEntity(arenaPlayer);
    }
    return;
  }
  battle.playerHp = Math.max(0, battle.playerHp - power);
  playSfx("hit");
  battleStatus.textContent = `被火球打中了，失去 ${power} 點血量。`;
  if (battle.mode === "whack") {
    battleArena.classList.remove("whack-damaged");
    if (getBattleConfig().restartAnimations) void battleArena.offsetWidth;
    battleArena.classList.add("whack-damaged");
  } else {
    flashEntity(arenaPlayer);
  }
  if (battle.playerHp <= 0) finishBattle(false);
}

function consumeBattleTreasure() {
  if (!state.rewards.length) return null;
  const item = state.rewards.pop();
  renderInventory();
  updateHud();
  return item;
}

function knockBackPlayer(dx, dy, force) {
  const battle = state.battle;
  const mag = Math.hypot(dx, dy) || 1;
  battle.player.x = clamp(battle.player.x + (dx / mag) * force, 8, 92);
  battle.player.y = clamp(battle.player.y + (dy / mag) * force, 16, 88);
}

function renderBattlePositions() {
  const battle = state.battle;
  positionBattleElement(arenaPlayer, battle.player.x, battle.player.y);
  positionBattleElement(arenaBoss, battle.boss.x, battle.boss.y);
}

function positionBattleElement(el, x, y) {
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  el.style.transform = "translate3d(-50%, -50%, 0)";
}

function clearArenaProjectiles() {
  battleArena.querySelectorAll(".projectile, .whack-grid, .whack-fireball, .whack-cursor, .whack-instruction, .battle-instruction, .time-tower-layer, .time-ritual-meter, .time-pulse, .time-victory").forEach((el) => el.remove());
  battleArena.classList.remove("whack-mode", "whack-damaged", "whack-empty", "time-boss-mode");
  battleActions.classList.remove("time-actions", "duel-actions", "whack-actions");
  bossCard?.classList.remove("time-boss-layout", "duel-boss-layout", "whack-boss-layout");
  battleArena.querySelector(".arena-hint").textContent = "移動並發射武器，別讓 Boss 靠近。";
  fireButton.textContent = "發射";
}

function stopBattleLoop() {
  if (state.battle?.frameId) cancelAnimationFrame(state.battle.frameId);
  if (state.battle) state.battle.ended = true;
  clearArenaProjectiles();
  heldMoves.clear();
  arenaBoss.classList.remove("defeated", "hit", "aging");
  arenaPlayer.classList.remove("hit");
  arenaBoss.style.opacity = "";
  battleActions.classList.add("hidden");
  endBattle.classList.add("hidden");
}

function flashEntity(el) {
  el.classList.remove("hit");
  if (getBattleConfig().restartAnimations) void el.offsetWidth;
  el.classList.add("hit");
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBossDamage() {
  const stage = islandOrder.indexOf(state.island);
  return stage === 0 ? 0.5 : 1 + stage;
}

function getBossSpeed() {
  const stage = islandOrder.indexOf(state.island);
  return stage === 0 ? 0.28 : 0.5 + stage * 0.13;
}

function finishBattle(win) {
  const battle = state.battle;
  if (!battle || battle.ended) return;
  battle.ended = true;
  heldMoves.clear();
  battle.touchTarget = null;
  if (battle.frameId) cancelAnimationFrame(battle.frameId);
  const battleMode = battle.mode || "duel";
  if (battle.mode === "whack") {
    battleArena.querySelectorAll(".whack-fireball").forEach((el) => el.remove());
  } else if (battle.mode !== "timeRitual") {
    clearArenaProjectiles();
  } else {
    battleArena.querySelectorAll(".projectile").forEach((el) => el.remove());
    battleArena.querySelectorAll(".time-tower").forEach((el) => {
      el.disabled = true;
      el.classList.add("cooling");
    });
  }
  battleActions.classList.add("hidden");
  if (win) {
    playSfx("win");
    const next = getNextIsland();
    state.pendingNextIsland = next;
    if (battleMode === "whack") {
      const active = battleArena.querySelector(".whack-hole.active") || battleArena.querySelector(".whack-hole");
      active?.classList.add("defeated");
    } else if (battleMode === "timeRitual") {
      showTimeVictoryFireworks();
      arenaBoss.classList.add("defeated");
    } else {
      arenaBoss.classList.add("defeated");
    }
    battleStatus.textContent = `${islands[state.island].boss} 被毀滅了！`;
    unlockNextIsland();
    window.setTimeout(() => {
      bossModal.classList.add("hidden");
      clearArenaProjectiles();
      state.battle = null;
      showClearModal(next);
    }, battleMode === "timeRitual" ? 2300 : 1050);
  } else {
    playSfx("fail");
    state.retryNeeded = 3;
    state.bossTauntShown = false;
    state.bossReadyMessageShown = false;
    state.answered = [];
    state.correct = 0;
    state.combo = 0;
    prepareRetryNodes();
    updateHud();
    battleStatus.textContent = "挑戰失敗，回到本關再答對 3 題，就能重新挑戰 Boss。";
    window.setTimeout(() => {
      bossModal.classList.add("hidden");
      clearArenaProjectiles();
      if (state.island === "decimal") {
        showGuideMessage(getIslandGuideMessage("decimal"), "繼續飛行", () => startFlightMode());
      } else if (state.island === "time") {
        showGuideMessage(getIslandGuideMessage("time"), "回到森林庭院", () => startTimeMode());
      } else {
        missionLog.textContent = `挑戰失敗。再答對 3 題即可重新挑戰${islands[state.island].boss}。`;
      }
    }, 950);
  }
  updateBattleBars();
}

function showClearModal(next) {
  clearText.textContent = next
    ? `${islands[state.island].boss} 已被毀滅，${islands[next].name}已開啟。`
    : "最後的 Boss 已被毀滅，三座島都通關了！";
  clearNext.textContent = next ? "前往下一關" : "回到冒險島";
  clearModal.classList.remove("hidden");
}

function prepareRetryNodes() {
  eventNodes.slice(0, 4).forEach((node) => {
    node.classList.remove("visited");
    node.disabled = false;
    node.setAttribute("aria-disabled", "false");
  });
  bossNode.classList.add("locked");
}

function getNextIsland() {
  return islandOrder[islandOrder.indexOf(state.island) + 1] || null;
}

function unlockNextIsland() {
  if (!state.clearedIslands.includes(state.island)) state.clearedIslands.push(state.island);
  const next = islandOrder[islandOrder.indexOf(state.island) + 1];
  if (next && !state.unlockedIslands.includes(next)) state.unlockedIslands.push(next);
  islandButtons.forEach((button) => {
    const unlocked = state.unlockedIslands.includes(button.dataset.island);
    button.disabled = !unlocked;
    button.classList.toggle("locked", !unlocked);
  });
}

function updateBattleBars(now = performance.now()) {
  const battle = state.battle;
  if (!battle) return;
  const config = getBattleConfig();
  if (config.uiInterval && now - (battle.lastUiUpdate || 0) < config.uiInterval) return;
  battle.lastUiUpdate = now;
  if (battle.lastRenderedPlayerHp !== battle.playerHp) {
    playerHpBar.style.width = `${(battle.playerHp / battle.playerMaxHp) * 100}%`;
    battle.lastRenderedPlayerHp = battle.playerHp;
  }
  if (battle.lastRenderedBossHp !== battle.bossHp) {
    bossHpBar.style.width = `${(battle.bossHp / battle.bossMaxHp) * 100}%`;
    battle.lastRenderedBossHp = battle.bossHp;
  }
}

mapArt.addEventListener("click", (event) => {
  if (state.flight?.active || state.time?.active) return;
  if (event.target.closest(".map-node")) return;
  const rect = mapArt.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  moveHeroPercent(x, y);
  missionLog.textContent = "角色已移動。尋找發光的目標答題取得裝備。";
});

mapArt.addEventListener("pointermove", (event) => {
  if (!state.flight?.active || state.flight.paused) return;
  const rect = mapArt.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  moveHeroPercent(clamp(x, 8, 92), clamp(y, 16, 84));
});

eventNodes.forEach((node) => {
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.flight?.active) return;
    if (state.time?.active) {
      missionLog.textContent = "請用方向鍵移動角色靠近寶箱開啟題目。";
      return;
    }
    if (node.classList.contains("visited")) {
      missionLog.textContent = "這個地點已經挑戰過了，去找其他發光的目標。";
      return;
    }
    clearTimeout(state.questionTimer);
    state.currentNode = node;
    moveHeroToElement(node);
    missionLog.textContent = `正在前往${eventLabel(node.dataset.event)}...`;
    state.questionTimer = window.setTimeout(() => openQuestion(node.dataset.event), 560);
  });
});

bossNode.addEventListener("click", (event) => {
  event.stopPropagation();
  if (state.flight?.active && !isBossReady()) return;
  if (state.time?.active && !isBossReady()) return;
  clearTimeout(state.questionTimer);
  moveHeroToElement(bossNode);
  state.questionTimer = window.setTimeout(startBossBattle, 560);
});

islandButtons.forEach((button) => button.addEventListener("click", () => resetIsland(button.dataset.island)));
soundToggle?.addEventListener("click", toggleSound);
window.addEventListener("pointerdown", unlockMusicPlayback, { once: true });
window.addEventListener("keydown", unlockMusicPlayback, { once: true });
window.addEventListener("dblclick", (event) => {
  if (isMobileBattleMode()) event.preventDefault();
}, { passive: false });
document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
document.addEventListener("gesturechange", (event) => event.preventDefault(), { passive: false });
document.addEventListener("touchstart", (event) => {
  if (isMobileBattleMode() && event.touches && event.touches.length > 1) event.preventDefault();
}, { passive: false });
let lastTouchEndAt = 0;
document.addEventListener("touchend", (event) => {
  if (!isMobileBattleMode()) return;
  const now = Date.now();
  if (now - lastTouchEndAt < 420) event.preventDefault();
  lastTouchEndAt = now;
}, { passive: false });
bossButton.addEventListener("click", () => {
  moveHeroToElement(bossNode);
  window.setTimeout(startBossBattle, 560);
});
nextQuestion.addEventListener("click", () => {
  questionModal.classList.add("hidden");
  resumeFlightMode();
  resumeTimeMode();
  updateMapControlVisibility();
});
closeQuestion.addEventListener("click", () => {
  questionModal.classList.add("hidden");
  resumeFlightMode();
  resumeTimeMode();
  updateMapControlVisibility();
});
endBattle.addEventListener("click", () => {
  stopBattleLoop();
  bossModal.classList.add("hidden");
  updateMapControlVisibility();
});

clearNext.addEventListener("click", () => {
  const next = state.pendingNextIsland;
  clearModal.classList.add("hidden");
  updateMapControlVisibility();
  state.pendingNextIsland = null;
  if (next) {
    resetIsland(next);
    missionLog.textContent = `已進入${islands[next].name}。繼續答題收集裝備，準備下一場 Boss 戰。`;
  } else {
    missionLog.textContent = "三座島都通關了！";
  }
});

let lastBattleActionPointerAt = 0;

function useBattleActionButton() {
  if (state.battle?.mode === "timeRitual") accelerateNearestTimeTower();
  else playerShoot();
}

fireButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  lastBattleActionPointerAt = performance.now();
  useBattleActionButton();
});
fireButton.addEventListener("click", () => {
  if (performance.now() - lastBattleActionPointerAt < 450) return;
  useBattleActionButton();
});
moveButtons.forEach((button) => {
  const dir = button.dataset.move;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (isMobileBattleMode()) nudgeBattlePlayer(dir);
    heldMoves.add(dir);
    button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener("pointerup", () => heldMoves.delete(dir));
  button.addEventListener("pointercancel", () => heldMoves.delete(dir));
  button.addEventListener("pointerleave", () => heldMoves.delete(dir));
});

function nudgeBattlePlayer(dir) {
  const battle = state.battle;
  if (!battle || battle.ended || battle.mode === "whack") return;
  const step = battle.mode === "timeRitual" ? 7 : 9;
  if (dir === "left") battle.player.x = clamp(battle.player.x - step, 8, 92);
  if (dir === "right") battle.player.x = clamp(battle.player.x + step, 8, 92);
  if (dir === "up") battle.player.y = clamp(battle.player.y - step, 16, 88);
  if (dir === "down") battle.player.y = clamp(battle.player.y + step, 16, 88);
  battle.touchTarget = null;
  renderBattlePositions();
}

flightButtons.forEach((button) => {
  const dir = button.dataset.flightMove;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state.time?.active && !state.time.paused) heldTimeMoves.add(dir);
    else heldFlightMoves.add(dir);
    button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener("pointerup", () => {
    heldFlightMoves.delete(dir);
    heldTimeMoves.delete(dir);
  });
  button.addEventListener("pointercancel", () => {
    heldFlightMoves.delete(dir);
    heldTimeMoves.delete(dir);
  });
  button.addEventListener("pointerleave", () => {
    heldFlightMoves.delete(dir);
    heldTimeMoves.delete(dir);
  });
});

window.addEventListener("keydown", (event) => {
  const keyMap = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  if (keyMap[event.key]) {
    if (state.time?.active && !state.time.paused) heldTimeMoves.add(keyMap[event.key]);
    else if (state.flight?.active && !state.flight.paused) heldFlightMoves.add(keyMap[event.key]);
    else heldMoves.add(keyMap[event.key]);
    event.preventDefault();
  }
  if (event.key === " " && state.battle && !state.battle.ended) {
    if (state.battle.mode === "whack") whackActiveHole();
    else if (state.battle.mode === "timeRitual") accelerateNearestTimeTower();
    else playerShoot();
    event.preventDefault();
  }
  if (event.key === "Enter" && state.battle?.mode === "timeRitual" && !state.battle.ended) {
    accelerateNearestTimeTower();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  const keyMap = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
  if (keyMap[event.key]) heldMoves.delete(keyMap[event.key]);
  if (keyMap[event.key]) heldFlightMoves.delete(keyMap[event.key]);
  if (keyMap[event.key]) heldTimeMoves.delete(keyMap[event.key]);
});

function finishIntro(skipAll = false) {
  clearTimeout(state.introTimer);
  if (!skipAll && Array.isArray(state.introPages) && state.introPageIndex < state.introPages.length - 1) {
    state.introPageIndex += 1;
    typeIntroPage();
    return;
  }
  introOverlay.classList.add("hidden");
  state.introPages = null;
  state.introPageIndex = 0;
  if (typeof state.introCallback === "function") {
    const callback = state.introCallback;
    state.introCallback = null;
    callback();
  }
}

function runIntro() {
  showGuideMessage(introMessage, "開始冒險");
}

function showGuideMessage(message, buttonText = "開始冒險", callback = null) {
  clearTimeout(state.introTimer);
  state.introCallback = callback;
  state.introPages = null;
  state.introPageIndex = 0;
  introTitle.textContent = "冒險任務";
  introOverlay.classList.remove("hidden");
  typeIntroText(message, buttonText);
}

function showGuidePages(pages, nextText = "下一頁", doneText = "開始", callback = null) {
  clearTimeout(state.introTimer);
  state.introCallback = callback;
  state.introPages = pages;
  state.introPageIndex = 0;
  state.introNextText = nextText;
  state.introDoneText = doneText;
  introTitle.textContent = "長老提醒";
  introOverlay.classList.remove("hidden");
  typeIntroPage();
}

function typeIntroPage() {
  const pages = state.introPages || [];
  const isLast = state.introPageIndex >= pages.length - 1;
  typeIntroText(pages[state.introPageIndex] || "", isLast ? state.introDoneText : state.introNextText);
}

function typeIntroText(message, buttonText) {
  let index = 0;
  introText.textContent = "";
  startIntro.disabled = true;
  startIntro.textContent = "說明中...";

  function tick() {
    introText.textContent = message.slice(0, index);
    index += 1;
    if (index <= message.length) {
      state.introTimer = window.setTimeout(tick, message[index - 2] === "\n" ? 260 : 34);
      return;
    }
    startIntro.disabled = false;
    startIntro.textContent = buttonText;
  }

  tick();
}

startIntro.addEventListener("click", () => finishIntro(false));
skipIntro.addEventListener("click", () => finishIntro(true));

applyDeviceMode();
resetIsland("multiply");
runIntro();
updateSoundButton();
startMusic();
