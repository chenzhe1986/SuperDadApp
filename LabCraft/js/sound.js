// ============================================================
// 化学视界 · 声音与朗读（经典脚本版；全局：playClick, readText,
// soundEnabled, setSoundEnabled, stopSpeaking）
//
// 两个能力均为零资源（不引入任何音频文件/第三方库）：
// 1. playClick(kind)  用 Web Audio 合成短促音效：
//    'pick' = 高音"嗒"（选中元素/物质）；'pop' = 低音"哒"（弹窗/按钮）。
// 2. readText(text, force)  朗读中文介绍文字。发音通道按环境分层：
//    - App 内：plus.android 反射直接调安卓系统 TextToSpeech（系统 TTS 引擎）。
//      踩坑结论（详见 AGENTS.md 已知问题）：官方 5+ Speech 模块没有朗读
//      API（plus.speech.startSpeaking 在安卓上不存在）；App WebView 里
//      speechSynthesis 也整包不存在（小米澎湃 OS 实测）。所以 App 内唯一
//      可靠路径就是直调系统引擎。
//    - 浏览器：回退 Web Speech API（speechSynthesis）。
//    最终能不能出声，取决于系统是装了中文语音引擎/语音包。
//
// 两个"为什么"（别删）：
// - 手势门控：启动时 main.js 会自动选中氢原子并弹开周期表，若不设
//   门控，这些"非用户操作"就会发音；同时浏览器自动播放策略要求
//   AudioContext 必须在用户手势后才能 resume，speechSynthesis 也要先有交互。
//   因此首次 pointerdown / keydown 之前，音效与朗读一律跳过。
// - 总开关持久化：localStorage 键 labcraft_sound（默认开），App 重进
//   后保持用户偏好；静音时立刻停掉所有通道的朗读。
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
    stopSpeaking(); // 静音时立即停掉所有通道的朗读（含还在排队的）
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

// ---------- 点击念效（WebAudio 现场合成，零资源） ----------
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

// ---------- App 内朗读：plus.android 反射直调安卓系统 TextToSpeech ----------
// 踩坑结论见 AGENTS.md「已知问题」：官方 5+ Speech 模块没有朗读 API
// （plus.speech.startSpeaking 在安卓上不存在）、App WebView 里
// speechSynthesis 整个不存在，所以 App 内唯一可靠路径是直调系统引擎。
// TextToSpeech 初始化是异步的：onInit(status===0) 表示成功，就绪前排队的
// 朗读会在回调里补发。
let androidTts = null;          // android.speech.tts.TextToSpeech 实例
let androidTtsReady = false;    // onInit(status===0) 后为 true
let androidTtsInited = false;   // 是否已尝试初始化（避免重复构造）
const androidSpeakQueue = [];   // 初始化完成前积压的朗读文本
let ttsCls = null;              // importClass 后的 TextToSpeech 类（取常量）
let speakBundle = null;         // speak() 的参数 Bundle（不传 null，避免反射转换出错）
let ttsSeq = 0;                 // utteranceId 自增

function initAndroidTts() {
  try {
    if (androidTtsInited || !(window.plus && plus.android)) return;
    androidTtsInited = true;
    const main = plus.android.runtimeMainActivity();
    ttsCls = plus.android.importClass('android.speech.tts.TextToSpeech');
    const LocaleCls = plus.android.importClass('java.util.Locale');
    const BundleCls = plus.android.importClass('android.os.Bundle');
    speakBundle = new BundleCls();
    const OnInitListener = plus.android.implements('android.speech.tts.TextToSpeech$OnInitListener', {
      onInit: function (status) { // 0 = SUCCESS
        androidTtsReady = (status === 0);
        if (androidTtsReady) {
          // 设定中文（朗读中文内容必需），失败或缺少语音包也只是小声不发声
          try { plus.android.invoke(androidTts, 'setLanguage', LocaleCls.SIMPLIFIED_CHINESE); } catch (e) { /* 忽略 */ }
        } else {
          console.log('[TTS] 系统引擎初始化失败(status=' + status + ')，手机未装语音引擎/语音包');
        }
        // 补发积压的朗读（引擎失败时静默丢弃）
        while (androidSpeakQueue.length) {
          const t = androidSpeakQueue.shift();
          if (androidTtsReady) doAndroidSpeak(t);
        }
      },
    });
    androidTts = new ttsCls(main, OnInitListener);
  } catch (e) {
    console.log('[TTS] initAndroidTts 异常: ' + (e && e.message));
  }
}

// QUEUE_FLUSH 队列常量（AOSP 源码：FLUSH=0 / ADD=1）：清空当前队列、直接读最新。
// 运行时优先从类上取，取不到时用兜底常量，避免反射字段缺失导致队列模式错乱
function ttsFlushMode() {
  try {
    const v = ttsCls && ttsCls.QUEUE_FLUSH;
    if (typeof v === 'number') return v;
  } catch (e) { /* 取不到就走兜底值 */ }
  return 0;
}

let speakTimer = null;   // stop→speak 的错峰定时器
let pendingText = null;  // 待朗读的最新文本（快速连点击合并，只读最后一条）

// 立即停止一切正在进行的朗读（对外：切页/弹窗/静音时调用）
function stopSpeaking() {
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
  try { if (window.plus && plus.speech) plus.speech.stop(); } catch (e) { /* 忽略 */ }
  clearTimeout(speakTimer);
  speakTimer = null;
  pendingText = null;
  androidSpeakQueue.length = 0;
  try { if (androidTts) plus.android.invoke(androidTts, 'stop'); } catch (e) { /* 忽略 */ }
}

// 安卓朗读：先 stop 再 speak。切成 120ms 去抖执行，两个原因（别改小）：
// 1) 安卓引擎对"stop() 后立刻 speak()"存在竞态：新朗读会被吞掉，表现为
//    旧介绍一直读不完、停不下来（小米澎湃 OS 真机问题）；
// 2) 快速连点多个元素时只朗读最后一次，避免炸出一串旧文本。
function doAndroidSpeak(text) {
  pendingText = text;
  if (speakTimer) return true; // 已有定时器在等，只需更新最新文本
  speakTimer = setTimeout(function () {
    speakTimer = null;
    const t = pendingText;
    pendingText = null;
    if (t === null) return;
    try {
      plus.android.invoke(androidTts, 'stop');
      // speak(文本, QUEUE_FLUSH, Bundle参数, utteranceId)，队列常量见 ttsFlushMode
      plus.android.invoke(androidTts, 'speak', t, ttsFlushMode(), speakBundle, 'tts' + (++ttsSeq));
    } catch (e) {
      console.log('[TTS] speak 异常: ' + (e && e.message));
    }
  }, 120);
  return true;
}

function tryNativeSpeak(text) {
  if (!(window.plus && plus.android)) return false;
  try {
    if (!androidTts) initAndroidTts();
    if (!androidTts) return false;
    if (!androidTtsReady) {
      androidSpeakQueue.push(text); // 初始化没完成先排队
      return true;
    }
    return doAndroidSpeak(text);
  } catch (e) {
    console.log('[TTS] tryNativeSpeak 异常: ' + (e && e.message));
    return false;
  }
}

// ---------- 浏览器朗读兜底（Web Speech API） ----------
let zhVoice = null;
function pickZhVoice() {
  try {
    const voices = window.speechSynthesis.getVoices();
    const zh = voices.filter(function (v) { return /^zh/i.test(v.lang || ''); });
    zhVoice = zh.find(function (v) { return /^zh[-_]?cn/i.test(v.lang || ''); }) || zh[0] || null;
  } catch (e) { zhVoice = null; }
}
// 语音列表是异步加载的（个别环境首次为空），加载完用事件再取一次
if ('speechSynthesis' in window) {
  pickZhVoice();
  window.speechSynthesis.onvoiceschanged = pickZhVoice;
}

function speakWeb(text) {
  try {
    window.speechSynthesis.cancel(); // 先打断上一条
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = 'zh-CN';
    u.rate = 1.0;
    if (zhVoice) u.voice = zhVoice;
    window.speechSynthesis.speak(u);
  } catch (e) { /* 系统没有可用 TTS 引擎时的静默降级 */ }
}

// ---------- readText：统一朗读入口 ----------
let lastSpokenText = '';
let lastSpokenAt = 0;

function readText(text, force) {
  // force 用于"重读"按钮：跳过 4 秒去重；自动朗读（进入元素/物质页）不带 force
  if (!soundEnabled || !userGesture || !text) return;
  if (!force && text === lastSpokenText && Date.now() - lastSpokenAt < 4000) return;
  lastSpokenText = text;
  lastSpokenAt = Date.now();
  if (tryNativeSpeak(text)) return;                    // App 内：系统 TTS
  if (!('speechSynthesis' in window)) return;          // 浏览器以外无可用通道
  speakWeb(text);
}