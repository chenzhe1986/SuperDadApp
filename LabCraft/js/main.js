// ============================================================
// 化学视界 · 主逻辑（经典脚本版；全局：THREE, ELEMENTS, CATEGORIES,
// ELEMENT_STYLE, SUBSTANCES, categoryColor, categoryLabel, getElement,
// substancesForElement, buildAtom, buildMegaAtom, buildMolecule,
// buildCrystal, buildRepresentativeAtom, disposeModel,
// buildPeriodicTable, updatePeriodicHighlight, buildPtLegend, hexToRgba）
//
// 交互流程：顶栏「元素周期表」→ 点选元素 → 介绍 + 3D 原子
//           → 信息面板「相关物质」→ 化合物介绍 + 3D 结构 → 可返回元素
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
const infoBack = document.getElementById('infoBack');

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
  if (data.composition) updateInfoSubstance(data);
  else updateInfoElement(data);
}

function updateInfoElement(el) {
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
  infoBack.classList.add('hidden');
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
  if (currentElement && sub.composition.indexOf(currentElement.symbol) >= 0) {
    infoBack.textContent = '← 返回 ' + currentElement.name + '（' + currentElement.symbol + '）';
    infoBack.classList.remove('hidden');
  } else {
    infoBack.classList.add('hidden');
  }
  updatePeriodicHighlight(-1);
}

// ---------- 选中元素 / 物质 ----------
function selectElement(el) {
  if (!el) return;
  updateInfoElement(el);
  swapModel(el);
}

function showSubstance(sub) {
  updateInfoSubstance(sub);
  swapModel(sub);
}

infoBack.addEventListener('click', function () {
  if (currentElement) selectElement(currentElement);
});

// ---------- 舞台悬浮按钮 ----------
const autoRotateBtn = document.getElementById('autoRotate');
const resetViewBtn = document.getElementById('resetView');

autoRotateBtn.addEventListener('click', function () {
  controls.autoRotate = !controls.autoRotate;
  autoRotateBtn.classList.toggle('active', controls.autoRotate);
});

resetViewBtn.addEventListener('click', function () {
  fitCamera();
});

// ---------- 元素周期表弹窗 ----------
const ptModal = document.getElementById('ptModal');
const ptGrid = document.getElementById('ptGrid');
const ptLegend = document.getElementById('ptLegend');
const ptClose = document.getElementById('ptClose');
const ptBackdrop = document.getElementById('ptBackdrop');

buildPeriodicTable(ptGrid, function (el) {
  selectElement(el);
  closePeriodic();
});
buildPtLegend(ptLegend);

function openPeriodic() {
  ptModal.classList.add('open');
}
function closePeriodic() {
  ptModal.classList.remove('open');
}
document.getElementById('periodicBtn').addEventListener('click', openPeriodic);
ptClose.addEventListener('click', closePeriodic);
ptBackdrop.addEventListener('click', closePeriodic);
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closePeriodic();
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
  const raw = zInput.value.trim();
  if (!raw) { showHint('请输入原子序数（1~118 为真实元素）'); return; }
  if (!/^\d+$/.test(raw)) { showHint('请输入正整数'); return; }
  const cleaned = raw.replace(/^0+/, '') || '0';
  if (cleaned === '0') { showHint('请输入 1 以上的数字'); return; }
  const Z = BigInt(cleaned);
  showCustomAtom(Z);
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
if (window.plus) {
  applyStatusbarInset();
} else {
  document.addEventListener('plusready', applyStatusbarInset, false);
}

// ---------- 启动 ----------
resize();
selectElement(ELEMENTS[0]); // 背景先摆一个氢原子
openPeriodic();             // 首屏直接打开周期表，引导选择
animate();
