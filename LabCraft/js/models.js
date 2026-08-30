// ============================================================
// 化学视界 · 3D 模型渲染（经典脚本版，全局 THREE / ELEMENT_STYLE）
// buildAtom 玻尔原子 / buildNeutron 自由中子（0 号） / buildMegaAtom 假想大原子
// buildMolecule 球棍分子
// buildCrystal 晶体（rock 岩盐 · cscl 氯化铯 · zincblende 闪锌矿·金刚石
//               · metal 金属晶体 bcc/fcc/hcp/sc · graphite 石墨层）
// disposeModel 释放 GPU 资源
// ============================================================

const PROTON_COLOR = 0xff5a5a;
const NEUTRON_COLOR = 0xb8c0cc;
const ELECTRON_COLOR = 0x66ccff;

// ---- 共享发光纹理（径向渐变），用于电子/原子核的光晕 ----
let glowTex = null;
function getGlowTexture() {
  if (glowTex) return glowTex;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.38)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  if (THREE.sRGBEncoding !== undefined) glowTex.encoding = THREE.sRGBEncoding;
  return glowTex;
}

function makeGlowSprite(color, scale) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(scale);
  return sprite;
}

function sphereMesh(color, radius, emissive = 0x000000, emissiveIntensity = 0, segments = 32) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: 0.1,
    emissive,
    emissiveIntensity,
  });
  const segW = segments;
  const segH = Math.max(8, Math.floor(segments * 0.6));
  return new THREE.Mesh(new THREE.SphereGeometry(radius, segW, segH), mat);
}

// 在球面上均匀散布 n 个点（斐波那契球面）
function fibonacciSphere(n, radius) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const denom = Math.max(n - 1, 1);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / denom) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(radius));
  }
  return pts;
}

// 确定性洗牌（LCG），让质子/中子混合更自然
function shuffle(arr, seed = 1) {
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

// ---- 原子（玻尔模型：原子核 + 分层轨道电子） ----
function buildAtom(el) {
  const group = new THREE.Group();
  group.name = 'atom';
  group.userData.kind = 'atom';
  group.userData.shells = [];
  group.userData.nucleus = null;

  const protons = el.number;
  const neutrons = Math.max(0, Math.round(el.mass) - el.number);
  const total = protons + neutrons;

  // 原子核：质子(红)/中子(灰) 各用一个 InstancedMesh，重元素也只需 2 个绘制调用
  const nucleus = new THREE.Group();
  const nucleonRadius = 0.30 + Math.cbrt(total) * 0.06;
  // 单核子（氢-1）直接放中心，避免斐波那契球面把它挪到极点
  const positions = total === 1
    ? [new THREE.Vector3(0, 0, 0)]
    : fibonacciSphere(total, nucleonRadius);
  const parts = [];
  for (let i = 0; i < protons; i++) parts.push(true);
  for (let i = 0; i < neutrons; i++) parts.push(false);
  shuffle(parts, el.number);

  const protonPositions = [];
  const neutronPositions = [];
  parts.forEach((isProton, i) => {
    (isProton ? protonPositions : neutronPositions).push(positions[i]);
  });

  const dummy = new THREE.Object3D();
  const nucleonGeo = new THREE.SphereGeometry(0.13, 12, 8);
  const protonMat = new THREE.MeshStandardMaterial({
    color: PROTON_COLOR, roughness: 0.35, metalness: 0.1,
    emissive: PROTON_COLOR, emissiveIntensity: 0.25,
  });
  const neutronMat = new THREE.MeshStandardMaterial({
    color: NEUTRON_COLOR, roughness: 0.35, metalness: 0.1,
    emissive: NEUTRON_COLOR, emissiveIntensity: 0.25,
  });

  function instancedNucleons(mat, list) {
    const mesh = new THREE.InstancedMesh(nucleonGeo, mat, list.length);
    list.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
  if (protonPositions.length) nucleus.add(instancedNucleons(protonMat, protonPositions));
  if (neutronPositions.length) nucleus.add(instancedNucleons(neutronMat, neutronPositions));
  nucleus.add(makeGlowSprite(0x88aaff, 1.15));
  group.add(nucleus);
  group.userData.nucleus = nucleus;

  // 电子层：每层一个轨道环 + 发光电子点（Points，单次绘制调用）
  el.shells.forEach((count, idx) => {
    const radius = 1.15 + idx * 0.95;
    const shellGroup = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.015, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0x5566aa, transparent: true, opacity: 0.35 }),
    );
    shellGroup.add(ring);

    const electronGroup = new THREE.Group();
    if (count > 0) {
      const epos = new Float32Array(count * 3);
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2;
        epos[j * 3] = Math.cos(angle) * radius;
        epos[j * 3 + 1] = 0;
        epos[j * 3 + 2] = Math.sin(angle) * radius;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(epos, 3));
      const points = new THREE.Points(geo, new THREE.PointsMaterial({
        color: ELECTRON_COLOR,
        map: getGlowTexture(),
        size: 0.22,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      electronGroup.add(points);
    }
    shellGroup.add(electronGroup);

    // 让各层轨道朝不同方向倾斜，形成立体感
    shellGroup.rotation.x = 0.3 + idx * 0.55;
    shellGroup.rotation.z = idx * 0.85;
    group.add(shellGroup);

    group.userData.shells.push({
      group: shellGroup,
      electrons: electronGroup,
      speed: 1.6 / (idx + 1),
    });
  });

  return group;
}

// ---- 0 号"元素"：自由中子（只有一颗中子，没有质子和电子轨道） ----
// 复用 kind='atom' + 空 shells：动画循环里的原子核脉动会自动生效
function buildNeutron() {
  const group = new THREE.Group();
  group.name = 'atom';
  group.userData.kind = 'atom';
  group.userData.shells = [];

  const nucleus = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 20, 14),
    new THREE.MeshStandardMaterial({
      color: NEUTRON_COLOR, roughness: 0.35, metalness: 0.1,
      emissive: NEUTRON_COLOR, emissiveIntensity: 0.3,
    }),
  );
  mesh.add(makeGlowSprite(NEUTRON_COLOR, 1.3));
  nucleus.add(mesh);
  nucleus.add(makeGlowSprite(0x88aaff, 1.15));
  group.add(nucleus);
  group.userData.nucleus = nucleus;
  return group;
}

// ---- 超大假想元素（示意）：亿级核子/电子无法逐个渲染，改为结构示意 ----
function computeShells(electronCount) {
  const shells = [];
  let remaining = electronCount;
  let n = 1;
  while (remaining > 0) {
    const cap = 2 * n * n;
    const take = Math.min(cap, remaining);
    shells.push(take);
    remaining -= take;
    n++;
  }
  return shells;
}

function buildMegaAtom(el) {
  const shells = computeShells(el.number);
  const n = shells.length;
  const max = shells[n - 1];
  const rings = shells.map((count, i) => ({
    t: n <= 1 ? 0 : i / (n - 1),
    bright: Math.sqrt(count / max),
  }));
  return buildRepresentativeAtom(rings, 1.0);
}

// ---- 通用结构示意渲染器：给定环列表（t 归一化半径、bright 亮度）构建原子 ----
function buildRepresentativeAtom(rings, nucleusRadius = 1.0) {
  const group = new THREE.Group();
  group.name = 'representativeAtom';
  group.userData.kind = 'mega';
  group.userData.nucleus = null;
  group.userData.rings = null;

  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(nucleusRadius, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffb0b0, roughness: 0.4, metalness: 0.1,
      emissive: 0xff5a5a, emissiveIntensity: 0.8, fog: false,
    }),
  );
  nucleus.add(makeGlowSprite(0xff8a8a, nucleusRadius * 3));
  group.add(nucleus);
  group.userData.nucleus = nucleus;

  const innerR = 1.45;
  const outerR = 11;
  const count = rings.length;
  const ringGeo = new THREE.TorusGeometry(1, 0.008, 6, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x66ccff, transparent: true, opacity: 0.55, fog: false,
  });
  const inst = new THREE.InstancedMesh(ringGeo, ringMat, count);

  const dummy = new THREE.Object3D();
  const colDim = new THREE.Color(0x66ccff);
  const colBright = new THREE.Color(0xffffff);
  rings.forEach((r, i) => {
    const radius = innerR + r.t * (outerR - innerR);
    dummy.position.set(0, 0, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(radius);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, colDim.clone().lerp(colBright, r.bright));
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  inst.rotation.set(0.85, 0.3, 0.4);
  group.add(inst);
  group.userData.rings = inst;

  return group;
}

// ---- 分子（球棍模型） ----
function buildMolecule(sub) {
  const group = new THREE.Group();
  group.name = 'molecule';
  group.userData.kind = 'molecule';
  group.userData.atoms = [];
  group.userData.bonds = [];
  group.userData.breathePhase = Math.random() * Math.PI * 2;

  // 内层用于旋转/呼吸，外层用于入场缩放，互不干扰
  const spin = new THREE.Group();
  group.add(spin);
  group.userData.spin = spin;

  const atomMeshes = [];
  sub.atoms.forEach((a) => {
    const st = ELEMENT_STYLE[a.element];
    const m = sphereMesh(st.color, st.radius * 0.82);
    m.position.set(...a.pos);
    m.userData.basePos = new THREE.Vector3(...a.pos);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.jitterAxis = randomUnit();
    spin.add(m);
    group.userData.atoms.push(m);
    atomMeshes.push(m);
  });

  sub.bonds.forEach((b) => {
    const i = b[0];
    const j = b[1];
    const order = b[2] || 1;
    const from = atomMeshes[i].position;
    const to = atomMeshes[j].position;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    const axis = dir.clone().normalize();

    // 多键时沿垂直方向平行偏移，形成双键/三键
    let perp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(axis.dot(perp)) > 0.9) perp = new THREE.Vector3(1, 0, 0);
    const side = new THREE.Vector3().crossVectors(axis, perp).normalize();

    const offsets = [];
    if (order === 1) {
      offsets.push(0);
    } else {
      const gap = 0.09;
      for (let k = 0; k < order; k++) offsets.push((k - (order - 1) / 2) * gap);
    }

    offsets.forEach((off) => {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, len, 16),
        new THREE.MeshStandardMaterial({ color: 0xd5d5e0, roughness: 0.4, metalness: 0.3 }),
      );
      cyl.position.copy(mid).addScaledVector(side, off);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      spin.add(cyl);
      group.userData.bonds.push(cyl);
    });
  });

  return group;
}

// ============================================================
// 晶体渲染器（支持多种晶格类型）
// ============================================================
function crystalRadius(sym, factor, min, max) {
  const st = ELEMENT_STYLE[sym];
  const r = (st ? st.radius : 0.5) * factor;
  return Math.min(max, Math.max(min, r));
}

// 收集点与最近邻连线（dist <= threshold 的点对）
function buildLatticeGroup(points, bondThreshold) {
  const group = new THREE.Group();
  group.name = 'crystal';
  group.userData.kind = 'crystal';

  points.forEach((p) => {
    const m = sphereMesh(p.color, p.radius, p.color, 0.08);
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    group.add(m);
  });

  if (bondThreshold > 0) {
    const positions = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].pos[0] - points[j].pos[0];
        const dy = points[i].pos[1] - points[j].pos[1];
        const dz = points[i].pos[2] - points[j].pos[2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= bondThreshold) {
          positions.push(...points[i].pos, ...points[j].pos);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    group.add(new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.4 }),
    ));
  }
  return group;
}

function buildCrystal(sub) {
  const spec = sub.lattice;
  const a = spec.a || 1.0;
  const pts = [];
  const add = (sym, x, y, z) => {
    const st = ELEMENT_STYLE[sym] || ELEMENT_STYLE.C;
    pts.push({ pos: [x * a, y * a, z * a], color: st.color, radius: 0.4, sym });
  };

  if (spec.type === 'rock') {
    // 岩盐型：两元素在立方格点上交替（棋盘格）
    const A = spec.elements[0], B = spec.elements[1];
    const rA = crystalRadius(A, 0.55, 0.3, 0.5);
    const rB = crystalRadius(B, 0.55, 0.3, 0.5);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const sym = (x + y + z) % 2 === 0 ? A : B;
      add(sym, x, y, z);
      pts[pts.length - 1].radius = (x + y + z) % 2 === 0 ? rA : rB;
    }
    // 最近邻即相邻格点（间距 a）
    return buildLatticeGroup(pts, 1.05 * a);
  }

  if (spec.type === 'cscl') {
    // 氯化铯型：角上一种元素，体心另一种
    const A = spec.elements[0], B = spec.elements[1];
    const rA = crystalRadius(A, 0.55, 0.3, 0.5);
    const rB = crystalRadius(B, 0.55, 0.3, 0.5);
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      add(A, x, y, z);
      pts[pts.length - 1].radius = rA;
    }
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) for (let z = -1; z <= 0; z++) {
      add(B, x + 0.5, y + 0.5, z + 0.5);
      pts[pts.length - 1].radius = rB;
    }
    return buildLatticeGroup(pts, 0.92 * a);
  }

  if (spec.type === 'zincblende') {
    // 闪锌矿型 / 金刚石型：两个面心立方子格沿对角错开 1/4
    const A = spec.elements[0], B = spec.elements[1] || A;
    const rA = crystalRadius(A, 0.4, 0.26, 0.42);
    const rB = crystalRadius(B, 0.4, 0.26, 0.42);
    const base = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) base.push([x, y, z]);
    // 面心：(±1, ±0.5, ±0.5) 及其轮换
    [-1, 1].forEach(function (s) {
      [-0.5, 0.5].forEach(function (h1) {
        [-0.5, 0.5].forEach(function (h2) {
          base.push([s, h1, h2], [h1, s, h2], [h1, h2, s]);
        });
      });
    });
    const seen = new Set();
    const push = (sym, x, y, z, r) => {
      const key = sym + ':' + x + ',' + y + ',' + z;
      if (seen.has(key)) return;
      seen.add(key);
      add(sym, x, y, z);
      pts[pts.length - 1].radius = r;
    };
    base.forEach((p) => {
      if (Math.abs(p[0]) <= 1 && Math.abs(p[1]) <= 1 && Math.abs(p[2]) <= 1) push(A, p[0], p[1], p[2], rA);
      push(B, p[0] + 0.25, p[1] + 0.25, p[2] + 0.25, rB);
    });
    return buildLatticeGroup(pts, 0.52 * a);
  }

  if (spec.type === 'graphite') {
    // 石墨层：六边形蜂窝网 + 层间范德华（无线连接）
    const r = crystalRadius('C', 0.62, 0.26, 0.42);
    const layers = spec.layers || 2;
    const gap = 2.1;
    const cells = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) cells.push([i + j / 2, (j * Math.sqrt(3)) / 2]);
    for (let l = 0; l < layers; l++) {
      const z = (l - (layers - 1) / 2) * gap;
      cells.forEach((c) => {
        add('C', c[0], c[1], z);
        pts[pts.length - 1].radius = r;
        add('C', c[0] + 0.5, c[1] + 0.289, z);
        pts[pts.length - 1].radius = r;
      });
    }
    return buildLatticeGroup(pts, 0.68 * a);
  }

  // 金属晶体（bcc / fcc / hcp / sc）
  const sym = spec.element;
  const st = ELEMENT_STYLE[sym] || ELEMENT_STYLE.C;
  const r = Math.min(0.5, Math.max(0.3, st.radius * 0.48));
  const struct = spec.struct || 'bcc';
  const seen = new Set();
  const push = (x, y, z) => {
    const key = x + ',' + y + ',' + z;
    if (seen.has(key)) return;
    seen.add(key);
    add(sym, x, y, z);
    pts[pts.length - 1].radius = r;
  };
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) push(x, y, z);

  if (struct === 'sc') {
    return buildLatticeGroup(pts, 1.05 * a);
  }
  if (struct === 'bcc') {
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) for (let z = -1; z <= 0; z++) push(x + 0.5, y + 0.5, z + 0.5);
    return buildLatticeGroup(pts, 0.9 * a);
  }
  if (struct === 'fcc') {
    for (let x = -1; x <= 0; x++) for (let y = -1; y <= 0; y++) for (let z = -1; z <= 1; z++) {
      push(x + 0.5, y + 0.5, z);
      push(x + 0.5, z, y + 0.5);
      push(z, x + 0.5, y + 0.5);
    }
    return buildLatticeGroup(pts, 0.76 * a);
  }
  // hcp：两层密排六方（B 层错位在 A 层三角面重心上方）
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const x = i + j / 2, y = (j * Math.sqrt(3)) / 2;
      if (Math.hypot(x, y) <= 2.05) {
        push(x, y, -0.41);
        push(x + 0.5, y + 0.2887, 0.41);
      }
    }
  }
  return buildLatticeGroup(pts, 1.05 * a);
}

// ---- 销毁模型，释放 GPU 资源 ----
function disposeModel(obj) {
  obj.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
