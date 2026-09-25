// ============================================================
// 化学视界 · 主逻辑（经典脚本版；全局：THREE, ELEMENTS, CATEGORIES,
// ELEMENT_STYLE, SUBSTANCES, categoryColor, categoryLabel, getElement,
// substancesForElement, buildAtom, buildNeutron, buildMegaAtom, buildMolecule,
// buildCrystal, buildRepresentativeAtom, disposeModel,
// buildPeriodicTable, updatePeriodicHighlight, buildPtLegend, hexToRgba）
// ============================================================
// 化学视界 · 主逻辑（经典脚本版；全局：THREE, ELEMENTS, CATEGORIES,
// ELEMENT_STYLE, SUBSTANCES, categoryColor, categoryLabel, getElement,
// substancesForElement, buildAtom, buildNeutron, buildMegaAtom, buildMolecule,
// buildCrystal, buildRepresentativeAtom, disposeModel,
// buildPeriodicTable, updatePeriodicHighlight, buildPtLegend, hexToRgba,
// playClick, readText, soundEnabled, setSoundEnabled, stopSpeaking（来自 js/sound.js）
//
// 交互流程：顶栏「元素周期表」→ 点选元素 → 介绍 + 3D 原子
//           → 信息面板「相关物质」→ 化合物介绍 + 3D 结构 → 可返回元素
//           顶栏输入 0 → 自由中子（亚原子粒子彩蛋）
//
// 声音约定：所有"选中/确认"类交互在这里统一补 playClick（sound.js），
// 介绍文字朗读只在 updateInfo 统一分发处挂 readText（setModel 唯一入口，
// 保证 118 元素/197 物质/中子/假想元素一处覆盖且只读一次）。
// ============================================================

// ---------- 渲染器 / 场景 / 相机 ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c1a);
scene.fog = new THREE.Fog(0x0a0c1a, 14, 44);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0.8, 9);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 32;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------- 灯光 ----------
scene.add(new THREE.HemisphereLight(0x8fa3ff, 0x241a3d, 0.7));
scene.add(new THREE.AmbientLight(0x555577, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(6, 10, 8);
scene.add(key);
const rim = new THREE.DirectionalLight(0x7f9fff, 0.8);
rim.position.set(-6, -4, -6);
scene.add(rim);

// ---------- 星空背景 ----------
function makeStars() {
  const n = 600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = randomUnit().multiplyScalar(16 + Math.random() * 20);
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x99aacc,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });
  scene.add(new THREE.Points(geo, mat));
}
function randomUnit() {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  );
}
makeStars();

// ---------- 模型容器与状态 ----------
const modelRoot = new THREE.Group();
scene.add(modelRoot);

let currentModel = null;
let entranceT = 1;

function buildFor(data) {
  if (data.mega) return buildMegaAtom(data);
  if (data.symbol !== undefined) return buildAtom(data);
  if (data.lattice) return buildCrystal(data);
  return buildMolecule(data);
}

function setModel(model, data) {
  if (currentModel) {
    modelRoot.remove(currentModel);
    disposeModel(currentModel);
  }
  currentModel = model;
  modelRoot.add(currentModel);
  fitCamera(); // 先按真实尺寸（scale=1）摆好相机
  currentModel.scale.setScalar(0.001);
  entranceT = 0;
  updateInfo(data);
}

function swapModel(data) {
  setModel(buildFor(data), data);
}

function fitCamera() {
  // 兼容入场动画期间的缩放：按未缩放尺寸计算包围球
  const prevScale = currentModel.scale.x;
  currentModel.scale.setScalar(1);
  const box = new THREE.Box3().setFromObject(currentModel);
  currentModel.scale.setScalar(prevScale);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 0.9);
  const offset = new THREE.Vector3(0.6, 0.5, 2.2).normalize().multiplyScalar(r * 2.6);
  camera.position.copy(sphere.center).add(offset);
  controls.target.copy(sphere.center);
  controls.update();
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

// ---------- 信息面板 ----------
const infoTitle = document.getElementById('infoTitle');
const infoSub = document.getElementById('infoSub');
const infoMeta = document.getElementById('infoMeta');
const infoDesc = document.getElementById('infoDesc');
const infoLegend = document.getElementById('infoLegend');
const infoSubstances = document.getElementById('infoSubstances');
const infoSubLabel = document.getElementById('infoSubLabel');
const navBackBtn = document.getElementById('navBackBtn'); // 顶栏「← 返回」（有浏览历史时显示）

const SUP_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
function toSup(exp) {
  return String(exp).split('').map((d) => SUP_DIGITS[+d]).join('');
}

function fmtNum(n) {
  const s = (typeof n === 'bigint' ? n.toString() : String(n)).replace(/^0+(?=\d)/, '');
  const len = s.length;
  if (len <= 4) return s;
  if (len <= 8) {
    const v = Number(s) / 1e4;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + '万';
  }
  if (len <= 11) {
    const v = Number(s) / 1e8;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + '亿';
  }
  const exp = len - 1;
  let mant = s[0] + (len > 1 ? '.' + s.slice(1, 4) : '');
  mant = mant.replace(/\.?0+$/, '');
  return mant + '×10' + toSup(exp);
}

function makeChip(text, color) {
  const chip = document.createElement('span');
  chip.className = 'cat-chip';
  chip.style.background = hexToRgba(color, 0.16);
  chip.style.borderColor = hexToRgba(color, 0.55);
  chip.style.color = color;
  chip.textContent = text;
  return chip;
}

// 当前视图状态（元素 <-> 物质 双向跳转）
let currentElement = null;   // 最近浏览的元素（用于"相关物质"返回）
let currentSubstance = null; // 最近浏览的物质

// 统一的信息分发：setModel 会调用这里
function updateInfo(data) {
  // 进入元素/物质界面即朗读介绍文字。挂在这里是因为它是 setModel 的
  // 唯一分发点：118 元素、197 物质、0 号中子、假想元素全部走这里，
  // 且每次切换只触发一次（挂 updateInfoElement 的话每次会选择两次）。
  // 首屏启动的自动加载不读——sound.js 内部有手势门控，未交互前静默。
  readText(data.desc || '');
  if (data.composition) updateInfoSubstance(data);
  else updateInfoElement(data);
}

// 0 号"元素"：自由中子（亚原子粒子，不属于周期表 118 元素）
// 放在这里而不是 data.js，因为它不是真实元素，仅由输入 0 触发
const NEUTRON_DATA = {
  isNeutron: true, fake: false, number: 0, name: '中子', symbol: 'n',
  category: '亚原子粒子',
  desc: '中子是比原子更小一级的"亚原子粒子"：不带电，和质子手拉手住在原子核里。' +
    '普通氢原子的原子核只有 1 个质子、没有中子，所以输入 0 就像得到一颗"单独的中子"。' +
    '不过自由中子很不安分，平均约 15 分钟就会衰变成 1 个质子、1 个电子和 1 个反中微子；' +
    '而宇宙中的"中子星"，就是无数中子紧紧挤在一起组成的超级"大原子核"。',
}

function updateInfoElement(el) {
  // 中子（0 号）走专门的信息卡：没有电子层/相关物质，也不参与周期表高亮
  if (el.isNeutron) {
    currentElement = null;
    infoTitle.textContent = '0 · 中子（' + el.symbol + '）';
    infoSub.innerHTML = '';
    infoSub.appendChild(makeChip(el.category, '#37d0c9'));
    infoMeta.textContent = '质量 ≈ 1u（与质子相当）· 不带电 · 自由状态平均寿命约 15 分钟';
    infoDesc.textContent = el.desc;
    infoLegend.innerHTML = '';
    infoSubLabel.style.display = 'none';
    infoSubstances.innerHTML = '';
    updatePeriodicHighlight(-1);
    return;
  }
  currentElement = el.fake ? null : el;
  infoTitle.textContent = el.fake
    ? '第 ' + fmtNum(el.number) + ' 号"元素"？（假想）'
    : el.number + ' · ' + el.name + '（' + el.symbol + '）';
  infoSub.innerHTML = '';
  infoSub.appendChild(makeChip(el.category, el.fake ? '#ff8787' : categoryColor(el.catKey)));
  if (el.en) {
    const en = document.createElement('span');
    en.className = 'en-name';
    en.textContent = el.en;
    infoSub.appendChild(en);
  }

  if (el.fake) {
    const layerCount = el.mega ? el.shellCount : el.shells.length;
    const outer = el.mega ? el.outerElectrons : el.shells[el.shells.length - 1];
    infoMeta.textContent = '原子序数 ' + fmtNum(el.number) + ' · 电子层 ' + fmtNum(layerCount) +
      ' 层 · 最外层 ' + fmtNum(outer) + ' 个电子';
    infoDesc.textContent = el.desc;
    infoLegend.innerHTML = '';
    infoSubLabel.style.display = 'none';
    infoSubstances.innerHTML = '';
  } else {
    const groupText = el.group ? '第 ' + el.group + ' 族' : categoryLabel(el.catKey);
    infoMeta.textContent = '相对原子质量 ' + el.massLabel + ' · 第 ' + el.period + ' 周期 ' + groupText +
      ' · 电子排布 ' + el.config;
    infoDesc.textContent = el.desc;

    // 电子层分布图例
    infoLegend.innerHTML = '';
    const layerItem = document.createElement('span');
    layerItem.className = 'legend-item';
    layerItem.innerHTML = '<b class="layer-text">电子层</b>' + el.shells.join(' · ');
    infoLegend.appendChild(layerItem);

    // 相关物质
    const related = substancesForElement(el.symbol);
    infoSubLabel.style.display = related.length ? '' : 'none';
    infoSubstances.innerHTML = '';
    related.forEach(function (sub) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sub-chip';
      // 单质用青色、化合物用紫色，便于区分
      const color = sub.composition.length > 1 ? '#7c8cff' : '#37d0c9';
      chip.style.background = hexToRgba(color, 0.12);
      chip.style.borderColor = hexToRgba(color, 0.45);
      chip.innerHTML = '<b>' + sub.name + '</b><i>' + (sub.formula || sub.cat) + '</i>';
      chip.title = sub.cat + ' · ' + sub.desc;
      chip.addEventListener('click', function () { showSubstance(sub); });
      infoSubstances.appendChild(chip);
    });
  }
  updatePeriodicHighlight(el.fake ? -1 : el.number);
}

function updateInfoSubstance(sub) {
  currentSubstance = sub;
  infoTitle.textContent = sub.name;
  infoSub.innerHTML = '';
  infoSub.appendChild(makeChip(sub.cat, '#37d0c9'));
  if (sub.formula) {
    const f = document.createElement('span');
    f.className = 'en-name';
    f.textContent = sub.formula;
    infoSub.appendChild(f);
  }

  const names = sub.composition.map(function (s) { return ELEMENT_STYLE[s].name; }).join('、');
  infoMeta.textContent = sub.cat + ' · 由 ' + names + ' 组成';
  infoDesc.textContent = sub.desc;

  infoLegend.innerHTML = '';
  sub.composition.forEach(function (s) {
    const st = ELEMENT_STYLE[s];
    const item = document.createElement('span');
    item.className = 'legend-item';
    const dot = document.createElement('i');
    dot.className = 'legend-dot';
    dot.style.background = '#' + st.color.toString(16).padStart(6, '0');
    const label = document.createElement('span');
    label.textContent = st.name;
    item.appendChild(dot);
    item.appendChild(label);
    infoLegend.appendChild(item);
  });

  infoSubLabel.style.display = 'none';
  infoSubstances.innerHTML = '';
  updatePeriodicHighlight(-1);
}

// ---------- 选中元素 / 物质 ----------
function selectElement(el, skipNav) {
  if (!el) return;
  // 选中确认音：周期表格子、输入框跳转、相关物质 chip、「返回元素」
  // 全都汇聚到这两个函数，这里是音效的唯一挂点（启动自动加载时
  // sound.js 的手势门控会自动跳过，不会误响）。
  if (!skipNav) navPush(el); // 浏览历史：skipNav 用于非用户跳转（启动/回显），不入栈
  playClick('pick');
  updateInfoElement(el);
  swapModel(el);
}

function showSubstance(sub) {
  playClick('pick');
  navPush(sub); // 浏览历史（相关物质 chip 点击后入栈，供返回键回退）
  updateInfoSubstance(sub);
  swapModel(sub);
}

navBackBtn.addEventListener('click', function () {
  // 顶栏「← 返回」与系统返回键同一语义：回退一层浏览历史
  playClick('pick');
  webNavigateBack();
});

// ---------- 浏览历史栈（系统返回键按浏览顺序分层退回） ----------
// 产品需求（2026-09）：按手机系统返回键时，按"周期表（根）→元素→物质"的
// 浏览顺序逐层回退；退到元素周期表后再按返回键，才真正离开网页
// （AllInOne 里回到首页）。实现：
// - navStack 只记录元素/物质/中子/假想元素等内容视图（周期表是"根"不入栈）；
// - 【App 怎么知道"该回退还是该退出"】网页每次开合周期表/进出视图，都把当前
//   是否处在根写进 plus.storage（键 BACK_STATE_KEY：'1'=已在根、'0'=还有历史）。
//   壳页面的 onBackPress 是同步执行的、拿不到 evalJS 的返回值，所以必须用这种
//   "网页随时写、壳页面随时读"的共享存储，由壳页面来决定走哪条路。
//   （2026-09-24 之前是"返回键按下时网页再打标记/发消息"的异步协议，链路一断
//    返回键就被壳页面整个吞掉——三合一里出现过按返回键完全回不到首页的情况。）
// - 回退恢复视图直接 swapModel（信息面板/高亮/入场动画/朗读一次到位），
//   不要走 selectElement/showSubstance，避免再次入栈和重复的动作音。
const BACK_STATE_KEY = 'labcraft_back_root'; // 与壳页面（uniapp/pages/index/index.vue）约定的状态键
// 状态序号键：每次写状态自增 1。壳页面 evalJS 通知网页回退是"单向广播"，
// 它拿不到执行结果，只能对比两次按键之间这个序号有没有变化，来判断网页侧
// 回退是否真的执行了（序号不变 = 网页侧失灵 → 壳页面放行退出，绝不困住用户）。
const BACK_SEQ_KEY = 'labcraft_back_seq'; // 与壳页面约定的序号键，两边字面量必须一致
let navStack = [];
let navLast = null; // 最近展示的对象：连续浏览同一内容时不重复入栈

// "根" = 周期表打开且没有任何浏览历史。此时按返回键应离开网页回上一页；
// 其余情况（在看某个元素/物质，或周期表收起后落在内容上）都还能在网页内回退。
function isNavRoot() {
  return ptModal.classList.contains('open') && navStack.length === 0;
}

// 把"当前是否在根"写进 plus.storage 供壳页面同步读取。
// 浏览器里没有 plus.storage（本就不存在 App 的返回键联动），跳过即可。
function writeBackState() {
  try {
    if (window.plus && plus.storage) {
      plus.storage.setItem(BACK_STATE_KEY, isNavRoot() ? '1' : '0');
      // 同步自增序号（见 BACK_SEQ_KEY 处的说明），壳页面靠它验证网页侧是否存活
      var seq = parseInt(plus.storage.getItem(BACK_SEQ_KEY)) || 0;
      plus.storage.setItem(BACK_SEQ_KEY, String(seq + 1));
    }
  } catch (e) { /* 存储不可用时网页照常运行，最多失去分层回退 */ }
}

// 顶栏「← 返回」按钮：浏览历史非空（已进入元素/物质等内容视图）时才显示；
// 空态/周期表根状态下隐藏（没有内容可回退，返回键语义=退出，按钮无意义）
function syncNavBack() {
  navBackBtn.hidden = navStack.length === 0;
}

function navPush(data) {
  if (!data || navLast === data) return;
  navLast = data;
  navStack.push(data);
  syncNavBack(); // 有历史了 → 显示「返回」
  writeBackState(); // 离开"根" → 同步给 App
}

function webNavigateBack() {
  if (ptModal.classList.contains('open')) {
    // 周期表打开时：堆栈还有内容 → 收起弹窗回到刚才的内容；
    // 已是"根"（首屏周期表且没浏览过内容）→ 什么都不做，退出由 App 壳页面负责
    // （它读到 '1' 就知道该关掉本页了）
    if (navStack.length > 0) closePeriodic();
    else writeBackState();
    return;
  }
  // 弹出栈顶（就是当前展示的视图，可能是元素/物质/中子/假想），
  // 然后展示"新的栈顶"：这才是历史意义的"上一层"。
  // 陷阱：曾用 swapModel(被弹出的那项)，结果按返回键第一下原地重放当前页，
  // 按两次才真正回退一层（此前浏览器实测抓到的 off-by-one）。
  navStack.pop();
  const prev = navStack.length ? navStack[navStack.length - 1] : null;
  if (prev) {
    navLast = prev;
    swapModel(prev);
  } else {
    navLast = null;
    openPeriodic(); // 栈空且没开周期表 → 回到根（元素周期表）
  }
  syncNavBack(); // 「返回」随历史栈内容显隐
  writeBackState(); // 可能已回到根，同步给 App
}
window.__webSystemBack = webNavigateBack;

// ---------- 声音开关 + 重读按钮 ----------
// 声音总开关（js/sound.js 提供状态，持久化在 localStorage）：
// 点击切换后同步按钮图标与 aria 状态；开启时给一声反馈便于确认
const soundToggleBtn = document.getElementById('soundToggle');
function syncSoundToggle() {
  soundToggleBtn.classList.toggle('muted', !soundEnabled);
  soundToggleBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
}
syncSoundToggle();
soundToggleBtn.addEventListener('click', function () {
  setSoundEnabled(!soundEnabled);
  syncSoundToggle();
  if (soundEnabled) playClick('pick');
});

// 信息面板重读按钮：自动朗读被打断/想再听一遍时，强制重读当前介绍
const readSpeakBtn = document.getElementById('readSpeakBtn');
readSpeakBtn.addEventListener('click', function () {
  playClick('pick');
  readText(infoDesc.textContent, true);
});

// ---------- 舞台悬浮按钮 ----------
const autoRotateBtn = document.getElementById('autoRotate');
const resetViewBtn = document.getElementById('resetView');

autoRotateBtn.addEventListener('click', function () {
  playClick('pop');
  controls.autoRotate = !controls.autoRotate;
  autoRotateBtn.classList.toggle('active', controls.autoRotate);
});

resetViewBtn.addEventListener('click', function () {
  playClick('pop');
  fitCamera();
});

// ---------- 元素周期表弹窗 ----------
const ptModal = document.getElementById('ptModal');
const ptGrid = document.getElementById('ptGrid');
const ptLegend = document.getElementById('ptLegend');
// ptClose 已删除（2026-09 按需求去掉周期表的 ✕ 关闭按钮）
const ptBackdrop = document.getElementById('ptBackdrop');

buildPeriodicTable(ptGrid, function (el) {
  selectElement(el);
  closePeriodic();
});
buildPtLegend(ptLegend);

function openPeriodic() {
  // 打开周期表时立即停掉正在读的界面介绍，避免旧内容继续读
  stopSpeaking();
  playClick('pop');
  ptModal.classList.add('open');
  writeBackState(); // 周期表打开 → 多半回到"根"，同步给 App 判断返回键该不该关页
}
function closePeriodic() {
  // 注意：这里不能 stopSpeaking()！点格子选元素时 onPick 会先
  // selectElement（已经安排新朗读）再调 closePeriodic，若在此停读
  // 会把刚刚安排的新元素朗读一并掐掉。停读只放在主动关闭的
  // 触发处（遮罩/Esc）和 openPeriodic 里。
  // 关闭音同样不放在这里（会与选中音叠加成"哒哒"），由各触发点负责。
  ptModal.classList.remove('open');
  writeBackState(); // 周期表收起 → 不再是纯"根"状态，返回键应回退内容而非关页
}
document.getElementById('periodicBtn').addEventListener('click', openPeriodic);
// ✕ 已去掉（2026-09 需求），周期表退出口 = 点选元素 / 点遮罩 / Esc / 系统返回键
ptBackdrop.addEventListener('click', function () { stopSpeaking(); playClick('pop'); closePeriodic(); });
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { stopSpeaking(); playClick('pop'); closePeriodic(); }
});

// ---------- 自定义元素输入 ----------
const zInput = document.getElementById('zInput');
const zGo = document.getElementById('zGo');
const inputHint = document.getElementById('inputHint');

// 构造原理（Aufbau）：按 (n+l, n) 顺序填充，用于假想外推
function aufbauShells(z) {
  const shells = [];
  let remaining = z;
  const subshells = [];
  for (let n = 1; n <= 7; n++) {
    for (let l = 0; l < n; l++) {
      subshells.push({ n, l, cap: 2 * (2 * l + 1) });
    }
  }
  subshells.sort((a, b) => (a.n + a.l) - (b.n + b.l) || a.n - b.n);
  for (const ss of subshells) {
    if (remaining <= 0) break;
    const take = Math.min(ss.cap, remaining);
    shells[ss.n - 1] = (shells[ss.n - 1] || 0) + take;
    remaining -= take;
  }
  while (shells.length && shells[shells.length - 1] === 0) shells.pop();
  return shells;
}

// 2n² 壳层外推（用于 119 号及以上的假想元素）
function n2ShellsArray(z) {
  const shells = [];
  let remaining = z;
  let n = 1;
  while (remaining > 0n) {
    const cap = 2n * BigInt(n) * BigInt(n);
    const take = remaining < cap ? remaining : cap;
    shells.push(Number(take));
    remaining -= take;
    n++;
  }
  return shells;
}

function sum2n2(N) {
  return (N * (N + 1n) * (2n * N + 1n)) / 3n;
}

function n2ShellInfo(Z) {
  let lo = 1n;
  let hi = 1n;
  while (sum2n2(hi) < Z) hi *= 2n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1n;
    if (sum2n2(mid) >= Z) hi = mid;
    else lo = mid + 1n;
  }
  return { shellCount: lo, outerElectrons: Z - sum2n2(lo - 1n) };
}

function buildRingList(N, maxRings) {
  const rings = [];
  if (N <= BigInt(maxRings)) {
    const n = Number(N);
    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 0 : i / (n - 1);
      rings.push({ t, bright: t });
    }
  } else {
    for (let i = 0; i < maxRings; i++) {
      const t = maxRings <= 1 ? 0 : i / (maxRings - 1);
      rings.push({ t, bright: t });
    }
  }
  return rings;
}

function fakeDesc() {
  return '已知元素只到 118 号（鿫）。你输入的序数超出了这个范围，属于"假想元素"：' +
    '以下结构按 2n² 电子壳层规律外推绘制，仅供想象与娱乐。';
}

function showCustomAtom(Z) {
  if (Z === 0n) { // 0 号：中子（只有一颗中子的"原子"）
    navPush(NEUTRON_DATA); // 浏览历史：返回键可从"中子"退回上一屏
    setModel(buildNeutron(), NEUTRON_DATA);
    return;
  }
  const el = Z <= 118n ? getElement(Number(Z)) : null;
  if (el) {
    selectElement(el);
    return;
  }
  const big = Z > 2000n;
  if (big) {
    const info = n2ShellInfo(Z);
    const rings = buildRingList(info.shellCount, 200);
    const data = {
      symbol: 'X', fake: true, name: '假想元素', number: Z, mega: true,
      shellCount: info.shellCount, outerElectrons: info.outerElectrons,
      shells: [], category: '假想元素', catKey: 'fake', desc: fakeDesc(),
    };
    navPush(data); // 浏览历史（假想元素也可返回）
    setModel(buildRepresentativeAtom(rings, 1.0), data);
  } else {
    const zNum = Number(Z);
    const shells = n2ShellsArray(Z);
    const mass = (Z * 5n) / 2n; // 约 2.5×Z（中子数外推）
    const data = {
      symbol: 'X', fake: true, name: '假想元素', number: Z, shells,
      mass: Number(mass), massLabel: '~' + fmtNum(Number(mass)),
      category: '假想元素', catKey: 'fake', desc: fakeDesc(),
      config: '按 2n² 规律外推', period: '—', group: '—',
    };
    navPush(data); // 浏览历史（假想元素也可返回）
    setModel(buildAtom({ number: zNum, mass: Number(mass), shells }), data);
  }
}

let hintTimer = null;
function showHint(text) {
  inputHint.textContent = text;
  inputHint.classList.add('show');
  zInput.classList.remove('shake');
  void zInput.offsetWidth; // 重置动画
  zInput.classList.add('shake');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function () { inputHint.classList.remove('show'); }, 2600);
}

function handleCustomInput() {
  playClick('pop');
  const raw = zInput.value.trim();
  if (!raw) { showHint('请输入原子序数：1~118 为真实元素，0 是中子'); return; }
  if (!/^\d+$/.test(raw)) { showHint('请输入正整数'); return; }
  // 0 也合法（中子），交给 showCustomAtom 分流；001 这类前导零会被归一成 0
  const cleaned = raw.replace(/^0+/, '') || '0';
  showCustomAtom(BigInt(cleaned));
  zInput.blur();
}

zGo.addEventListener('click', handleCustomInput);
zInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') handleCustomInput();
});

// ---------- 尺寸自适应 ----------
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- 动画循环 ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (currentModel) {
    // 入场缩放
    if (entranceT < 1) {
      entranceT = Math.min(1, entranceT + dt * 2.6);
      currentModel.scale.setScalar(easeOutCubic(entranceT));
    }

    const ud = currentModel.userData;
    if (ud.kind === 'atom') {
      ud.shells.forEach((sh) => {
        sh.electrons.rotation.y += sh.speed * dt;
      });
      if (ud.nucleus) {
        ud.nucleus.scale.setScalar(1 + Math.sin(t * 3) * 0.035);
      }
    } else if (ud.kind === 'molecule') {
      const spin = ud.spin;
      const breathe = 1 + Math.sin(t * 1.6 + ud.breathePhase) * 0.025;
      spin.scale.setScalar(breathe);
      ud.atoms.forEach((m) => {
        const j = Math.sin(t * 2.2 + m.userData.phase) * 0.03;
        m.position.copy(m.userData.basePos).addScaledVector(m.userData.jitterAxis, j);
      });
    } else if (ud.kind === 'crystal') {
      // 晶体随镜头自动旋转即可，此处无额外动画
    } else if (ud.kind === 'mega') {
      if (ud.nucleus) ud.nucleus.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// ---------- 竖屏提醒：一键全屏并锁定横屏（安卓浏览器支持；App 内已锁横屏不会弹出） ----------
const rotateTip = document.getElementById('rotateTip');
document.getElementById('rotateFull').addEventListener('click', function () {
  var el = document.documentElement;
  var done = function () {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {
        // 锁定失败（个别浏览器限制），提示手动旋转
        rotateTip.querySelector('p').textContent = '请手动旋转手机到横屏';
      });
    }
  };
  if (el.requestFullscreen) {
    el.requestFullscreen().then(done).catch(done);
  } else {
    done();
  }
});
document.getElementById('rotateSkip').addEventListener('click', function () {
  rotateTip.classList.add('dismissed');
});

// ---------- App 内状态栏避让 ----------
// 【为什么】App 的 webview 是全屏沉浸式的，页面顶到状态栏图标下面；
// 而 Android WebView 里 env(safe-area-inset-top) 常返回 0，CSS 无法避让。
// 所以在 web-view 页面里用 5+ API 取真实状态栏高度，注入为 CSS 变量
// --statusbar-h，供顶栏/周期表弹窗/信息栏的 padding-top 引用；
// 浏览器里没有 plus，自动走 env() 回退，互不影响。
function applyStatusbarInset() {
  try {
    if (window.plus && plus.navigator) {
      var h = plus.navigator.getStatusbarHeight();
      if (h > 0) {
        document.documentElement.style.setProperty('--statusbar-h', h + 'px');
      }
    }
  } catch (e) { /* 取不到就保持 env() 回退，不影响功能 */ }
}
// plus 可能比本脚本晚注入（Web 容器差异）：两条路都写一次返回状态，
// 保证 App 壳页面读到的 BACK_STATE_KEY 一定是最新的
if (window.plus) {
  applyStatusbarInset();
  writeBackState();
} else {
  document.addEventListener('plusready', applyStatusbarInset, false);
  document.addEventListener('plusready', writeBackState, false);
}

// 信息面板"空状态"：任何元素/物质都未选中时的初始占位。
// 首屏就是周期表，3D 场景留空；用户点选后 updateInfo 会整体覆盖这些内容，
// 各字段的空态只与占位文案相关，不参与后续逻辑。
function resetInfoPanel() {
  currentElement = null;
  currentSubstance = null;
  infoTitle.textContent = '从元素周期表开始探索';
  infoSub.innerHTML = '';
  infoMeta.textContent = '点击周期表中的任意元素，查看介绍与 3D 原子结构；' +
    '也可以在上方输入框输入原子序数（输入 0 为自由中子）快速跳转';
  infoDesc.textContent = '';
  infoLegend.innerHTML = '';
  infoSubLabel.style.display = 'none';
  infoSubstances.innerHTML = '';
  updatePeriodicHighlight(-1);
}

// ---------- 启动 ----------
resize();
// 【首屏=元素周期表】不加载氢原子：3D 场景保持"未选择"空状态，
// 页面以全屏周期表作为起始界面；用户点选元素后才出现 3D 模型。
// （原先启动默认摆氢，关闭周期表后首屏停在氢元素上，与需求不符）
resetInfoPanel(); // 空状态占位（选中元素后 updateInfo 覆盖为真实内容）
syncNavBack();    // 刚启动：没有任何浏览历史，「返回」按钮保持隐藏
openPeriodic();   // 首屏显示元素周期表
animate();
