// 数据校验脚本：node tools/validate.js
// 校验 data.js + substances.js 的完整性与一致性
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const dataJs = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
const substJs = fs.readFileSync(path.join(ROOT, 'js/substances.js'), 'utf8');

let errors = [];
let warns = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warns.push(msg); }

const sandbox = { console, Math, Set, Map, JSON };
vm.createContext(sandbox);
vm.runInContext(dataJs + '\n' + substJs + '\nthis.__x = { ELEMENTS, ELEMENT_STYLE, CATEGORIES, SUBSTANCES, SUBSTANCE_INDEX, tablePos, buildConfig };', sandbox);
const { ELEMENTS, ELEMENT_STYLE, CATEGORIES, SUBSTANCES, SUBSTANCE_INDEX, tablePos, buildConfig } = sandbox.__x;

// ---------- 1. 元素完整性 ----------
if (ELEMENTS.length !== 118) err(`元素总数 ${ELEMENTS.length} ≠ 118`);
const zSet = new Set(ELEMENTS.map(e => e.number));
for (let z = 1; z <= 118; z++) {
  if (!zSet.has(z)) err(`缺少 ${z} 号元素`);
}
// 唯一性
const seenZ = {};
ELEMENTS.forEach(e => {
  if (seenZ[e.number]) err(`原子序数重复: ${e.number}`);
  seenZ[e.number] = true;
});

// ---------- 2. 电子层求和 = 原子序数 ----------
ELEMENTS.forEach(e => {
  const sum = e.shells.reduce((a, b) => a + b, 0);
  if (sum !== e.number) err(`${e.symbol}(${e.name}) shells 求和 ${sum} ≠ ${e.number}`);
  if (e.shells.some(n => !Number.isInteger(n) || n <= 0)) err(`${e.symbol} shells 含非法值`);
  if (e.shells.length > 7) err(`${e.symbol} 电子层数 ${e.shells.length} > 7`);
});

// ---------- 3. 周期表坐标唯一 ----------
const posSeen = {};
ELEMENTS.forEach(e => {
  const key = e.pos.join(',');
  if (posSeen[key]) err(`周期表坐标冲突: ${e.symbol} 与 ${posSeen[key]} 均在 (${key})`);
  posSeen[key] = e.symbol;
  const [r, c] = e.pos;
  if (r < 1 || r > 10 || c < 1 || c > 18) err(`${e.symbol} 坐标越界 (${key})`);
  if (r >= 9 && (c < 3 || c > 17)) err(`${e.symbol} 镧系/锕系列号异常 (${key})`);
});

// ---------- 4. 分类与样式 ----------
const catKeys = new Set(Object.keys(CATEGORIES));
ELEMENTS.forEach(e => {
  if (!catKeys.has(e.catKey)) err(`${e.symbol} 分类键 ${e.catKey} 未定义`);
  const st = ELEMENT_STYLE[e.symbol];
  if (!st) err(`${e.symbol} 缺少 ELEMENT_STYLE`);
  else {
    if (typeof st.color !== 'number') err(`${e.symbol} 颜色非数字`);
    if (!(st.radius > 0)) err(`${e.symbol} 半径非法`);
    if (st.name !== e.name) err(`${e.symbol} 样式表名称 "${st.name}" ≠ "${e.name}"`);
  }
  if (!e.desc || e.desc.length < 60) warn(`${e.symbol} 介绍偏短 (${e.desc ? e.desc.length : 0} 字)`);
  if (!e.en) err(`${e.symbol} 缺少英文名`);
  if (!e.config || e.config.length < 2) err(`${e.symbol} 电子排布式缺失`);
  if (!e.massLabel) err(`${e.symbol} 缺少质量标注`);
});

// 电子排布式粗校验：从字符串提取的电子数之和 = 原子序数
ELEMENTS.forEach(e => {
  const core = e.config.match(/\[(He|Ne|Ar|Kr|Xe|Rn)\]/);
  const coreZ = core ? { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 }[core[1]] : 0;
  let sum = coreZ;
  const re = /[spdf]([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;
  const supMap = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  let m;
  while ((m = re.exec(e.config)) !== null) {
    sum += m[1].split('').map(c => supMap[c]).reduce((a, b) => a * 10 + b, 0);
  }
  if (sum !== e.number) err(`${e.symbol} 电子排布式 ${e.config} 电子总数 ${sum} ≠ ${e.number}`);
});

// ---------- 5. 物质库 ----------
const knownTypes = new Set(['rock', 'cscl', 'zincblende', 'graphite', 'metal']);
const nameSeen = {};
let molecular = 0, latticeN = 0;
SUBSTANCES.forEach(s => {
  if (nameSeen[s.name]) err(`物质名称重复: ${s.name}`);
  nameSeen[s.name] = true;
  if (!s.desc || s.desc.length < 25) warn(`物质 ${s.name} 介绍偏短`);
  if (!s.cat) err(`物质 ${s.name} 缺少分类`);
  if (!Array.isArray(s.composition) || s.composition.length === 0) {
    err(`物质 ${s.name} 缺少 composition`);
  } else {
    s.composition.forEach(sym => {
      if (!ELEMENT_STYLE[sym]) err(`物质 ${s.name} 引用未知元素 ${sym}`);
    });
  }
  if (s.lattice) {
    latticeN++;
    const spec = s.lattice;
    if (!knownTypes.has(spec.type)) err(`物质 ${s.name} 未知晶格类型 ${spec.type}`);
    if (spec.type === 'metal' && !ELEMENT_STYLE[spec.element]) err(`物质 ${s.name} metal 缺少 element`);
    if ((spec.type === 'rock' || spec.type === 'cscl' || spec.type === 'zincblende') &&
        (!Array.isArray(spec.elements) || spec.elements.length !== 2)) {
      err(`物质 ${s.name} 晶格缺少双元素数组`);
    }
  } else if (s.atoms) {
    molecular++;
    if (!Array.isArray(s.atoms) || s.atoms.length === 0) err(`物质 ${s.name} atoms 为空`);
    else {
      s.atoms.forEach((a, i) => {
        if (!ELEMENT_STYLE[a.element]) err(`物质 ${s.name} 原子#${i} 未知元素 ${a.element}`);
        if (!Array.isArray(a.pos) || a.pos.length !== 3 || a.pos.some(v => typeof v !== 'number' || isNaN(v))) {
          err(`物质 ${s.name} 原子#${i} 坐标非法`);
        }
      });
      (s.bonds || []).forEach((b, i) => {
        if (b[0] >= s.atoms.length || b[1] >= s.atoms.length || b[0] < 0 || b[1] < 0) {
          err(`物质 ${s.name} 键#${i} 索引越界 [${b}]`);
        }
        if (b[0] === b[1]) err(`物质 ${s.name} 键#${i} 自键`);
        if (b[2] !== undefined && ![1, 2, 3].includes(b[2])) err(`物质 ${s.name} 键#${i} 键级非法`);
      });
      // composition 与 atoms 一致性
      const atomSyms = new Set(s.atoms.map(a => a.element));
      s.composition.forEach(sym => {
        if (!atomSyms.has(sym)) err(`物质 ${s.name} composition 含 ${sym} 但 atoms 中没有`);
      });
      s.atoms.forEach(a => {
        if (!s.composition.includes(a.element)) err(`物质 ${s.name} atoms 含 ${a.element} 但 composition 未声明`);
      });
    }
  } else {
    err(`物质 ${s.name} 既无 atoms 也无 lattice`);
  }
});

// ---------- 6. 全元素物质覆盖 ----------
for (let z = 1; z <= 118; z++) {
  const el = ELEMENTS.find(e => e.number === z);
  const subs = SUBSTANCE_INDEX[el.symbol] || [];
  if (subs.length === 0) err(`${el.symbol}(${el.name}) 没有任何物质`);
  const hasSimple = subs.some(s => s.composition.length === 1);
  if (!hasSimple) err(`${el.symbol} 缺少单质`);
}

// ---------- 汇总 ----------
console.log('=== 元素数据 ===');
console.log(`元素: ${ELEMENTS.length} 个 | 分类: ${Object.keys(CATEGORIES).length} 类`);
console.log(`物质: ${SUBSTANCES.length} 种（分子/离子簇 ${molecular} + 晶体 ${latticeN}）`);
const catCount = {};
ELEMENTS.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + 1; });
console.log('分类分布:', Object.entries(catCount).map(([k, v]) => `${k}:${v}`).join(' '));
const substCat = {};
SUBSTANCES.forEach(s => { substCat[s.cat] = (substCat[s.cat] || 0) + 1; });
console.log('物质分类:', Object.entries(substCat).map(([k, v]) => `${k}:${v}`).join(' '));

if (warns.length) {
  console.log('\n=== 警告 (' + warns.length + ') ===');
  warns.forEach(w => console.log('  ⚠ ' + w));
}
if (errors.length) {
  console.log('\n=== 错误 (' + errors.length + ') ===');
  errors.forEach(e => console.log('  ✗ ' + e));
  process.exit(1);
} else {
  console.log('\n✓ 全部校验通过');
}
