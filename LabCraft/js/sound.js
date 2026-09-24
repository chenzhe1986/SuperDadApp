// ============================================================
// 化学视界 · 声音与朗读（经典脚本版；全局：playClick, readText,
// soundEnabled, setSoundEnabled）
//
// 两个能力均为零资源（不引入任何音频文件/第三方库）：
// 1. playClick(kind)  用 Web Audio 现场合成短促音效：
//    'pick' = 高音"嗒"（选中元素/物质）；'pop' = 低音"哒"（弹窗/按钮）。
// 2. readText(text, force)  用 Web Speech API 朗读中文介绍文字。
//    浏览器与 App 的 Android WebView（Chromium）都原生支持，
//    无需改 manifest、无需勾选模块；但能否出声依赖系统已装的中文
//    TTS 引擎（华为/小米等主流机型自带，个别精简 ROM 没有——
//    此时静默跳过，不影响其余功能）。
//
// 两个"为什么"（别删）：
// - 手势门控：启动时 main.js 会自动选中氢原子并弹开周期表，若不设
//   门控，这些"非用户操作"就会发声/读卡；同时浏览器自动播放策略
//   要求 AudioContext 在用户手势后才能 resume、speechSynthesis 也要
//   先有交互。因此首次 pointerdown / keydown 之前，音效与朗读一律跳过。
// - 总开关持久化：localStorage 键 labcraft_sound（默认开），App 重进
//   后保持用户偏好；静音时同步 cancel 掉正在进行的朗读。
// ============================================================

// ---------- 总开关 ----------
const SOUND_KEY = 'labcraft_sound';
let soundEnabled = true;
try {
  soundEnabled = localStorage.getItem(SOUND_KEY) !== 'off';
} catch (e) { /* 存储不可用（隐私模式等）时保持默认开 */ }

function setSoundEnabled(on) {
  soundEnabled = !!on;
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch (e) { /* 存不上就算了，不影响本次会话 */ }
  if (!on) {
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
  }
}

// ---------- 手势门控 + AudioContext ----------
let userGesture = false;
let audioCtx = null;

function markActivated() {
  if (userGesture) return;
  userGesture = true;
  // 手势到来后立即解锁音频（部分环境 Context 初始为 suspended）
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(function () {});
  }
}
document.addEventListener('pointerdown', markActivated, { passive: true, once: true });
document.addEventListener('keydown', markActivated, { passive: true, once: true });

// ---------- 点击音效（WebAudio 现场合成，零资源） ----------
function playClick(kind) {
  if (!soundEnabled || !userGesture) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
    const ctx = audioCtx;
    const t = ctx.currentTime;
    const isPick = kind === 'pick';
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // pick：880→1320Hz 短促上滑"嗒"（选中确认）；pop：340→240Hz 低频"哒"（弹窗/按钮）
    osc.type = isPick ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isPick ? 880 : 340, t);
    osc.frequency.exponentialRampToValueAtTime(isPick ? 1320 : 240, t + 0.06);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(isPick ? 0.22 : 0.14, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (isPick ? 0.09 : 0.12));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  } catch (e) { /* 音频不可用时静默忽略，不影响交互 */ }
}

// ---------- 语音朗读（Web Speech API） ----------
let zhVoice = null;
function pickZhVoice() {
  try {
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.filter(function (v) { return /^zh/i.test(v.lang || ''); });
    zhVoice = zh.find(function (v) { return /^zh[-_]?cn/i.test(v.lang || ''); }) || zh[0] || null;
  } catch (e) { zhVoice = null; }
}
if ('speechSynthesis' in window) {
  pickZhVoice(); // 语音列表是异步加载的，个别环境首次为空，靠事件补取
  window.speechSynthesis.onvoiceschanged = pickZhVoice;
}

let lastSpokenText = '';
let lastSpokenAt = 0;

function readText(text, force) {
  if (!soundEnabled || !userGesture || !text) return;
  if (!('speechSynthesis' in window)) return;
  // 同一文案短时间不重读（防快速往返时无谓重播）；"重读"按钮用 force 强制
  const now = Date.now();
  if (!force && text === lastSpokenText && now - lastSpokenAt < 4000) return;
  try {
    window.speechSynthesis.cancel(); // 先打断上一条，快速切换时即刻响应新内容
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'zh-CN';
    u.rate = 1.0;
    if (zhVoice) u.voice = zhVoice;
    window.speechSynthesis.speak(u);
    lastSpokenText = text;
    lastSpokenAt = now;
  } catch (e) { /* 系统没有可用 TTS 引擎时的静默降级 */ }
}