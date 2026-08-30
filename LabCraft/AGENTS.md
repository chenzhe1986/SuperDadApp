# AGENTS.md · 化学视界项目说明（供 AI 助手与协作者阅读）

## 项目是什么

「化学视界」：一个展示元素原子结构（3D 玻尔模型）与物质分子/晶体结构的科普网页，
覆盖全部 118 号元素 + 197 种物质（单质全覆盖 + 化合物/矿物）。
同一套网页代码既在浏览器运行，也被 uni-app 工程以 web-view 打包成安卓 App。

## 技术形态（重要）

- **零构建纯静态网页**：原生 JS 经典脚本 + Three.js r147 UMD 本地化（`js/lib/`）。
  没有 npm、没有打包器、没有 ES Module——**这是刻意为之，不要引入**。
- **为什么必须是经典脚本**：App 内网页放在 Android WebView 的 file:// 环境加载，
  ES Module 跨文件 import 会被 CORS 拦截直接黑屏；经典脚本无此限制。
- **为什么 three.js 锁定 r147**：r148 起删除了 `examples/js`（UMD 版 OrbitControls），
  r160 起删除了 `build/three.min.js`（UMD 主库）。r147 是"经典脚本全家桶"的最后版本。
  相关 API 差异：本工程用 `renderer.outputEncoding = THREE.sRGBEncoding`（r152+ 才改名 outputColorSpace）。

## 文件结构

```
index.html            入口页面（顶栏输入框 + 周期表按钮 + 周期表弹窗 + 信息面板）
css/style.css         全部样式（含周期表弹窗、横屏/窄屏响应式）
js/data.js            118 个元素数据：名称/质量/shells/分类/周期族/电子排布式/详细介绍 + 分类配色 + tablePos
js/substances.js      197 种物质：分子/离子簇（atoms+bonds）+ 晶体（lattice 规格）+ 元素→物质索引
js/models.js          3D 渲染：buildAtom 玻尔原子 / buildMolecule 球棍 / buildCrystal 晶体 / buildMegaAtom 假想大原子
js/periodic.js        周期表弹窗组件（18 列布局，镧系锕系第 9/10 行）
js/main.js            主逻辑：场景/相机/交互流程/信息面板/输入框
js/lib/               three.min.js + OrbitControls.js（r147 UMD，本地化，勿升级）
tools/validate.js     数据一致性校验脚本（node 运行）
sync_uniapp.py        把根目录网页同步进 uniapp/hybrid/html（打包进 App 的副本）
uniapp/               HBuilderX 工程（Vue3 + web-view 壳，横屏，完全离线）
README-UniApp.md      安卓打包步骤说明
```

## 必须遵守的约定

1. **改了根目录网页（index.html / css / js）后，必须运行 `python sync_uniapp.py`**
   把副本同步到 `uniapp/hybrid/html/`。该目录是 App 实际加载的内容，不要直接手改。
   该副本**不入 git 仓库**（见仓库根 `.gitignore`），克隆后打包前必须先跑一次本脚本，
   否则 web-view 加载不到网页会白屏。
2. **保持经典脚本**：所有 js 文件不得出现 `import` / `export`；全局靠脚本加载顺序
   （three → OrbitControls → data → substances → models → periodic → main）共享。
3. **数据改动后必须跑校验**：`node tools/validate.js`。它会检查：
   118 个元素无缺漏、每元素 shells 求和 = 原子序数、周期表坐标唯一、
   电子排布式电子总数正确、物质 atoms/bonds 索引合法、每个元素至少有单质。
4. **元素数据规范**（js/data.js）：
   - `shells` 用**真实电子层排布**（含 Cr 2,8,13,1、Cu 2,8,18,1、Pd 2,8,18,18、镧系/锕系例外等），不要用构造原理近似；
   - 人造元素质量写 `[98]` 形式（最稳定/最常见同位素）；
   - 电子排布式与构造原理不同的元素在 `CONFIG_SUFFIX_OVERRIDES` 手工登记；
   - 元素中文名含生僻字（𬬻𬭊𬭳𬭛𬭶鿏𫟼𬬭鿔鿭𫓧镆𫟷鿬鿫），文件必须保持 UTF-8 无 BOM。
5. **物质数据规范**（js/substances.js）：
   - 分子用 `atoms`（pos 单位约 Å 的显示坐标）+ `bonds`（第三位是键级 1/2/3）；
   - 晶体用 `lattice` 规格：`rock`（岩盐双元素）/ `cscl` / `zincblende`（含金刚石）/ `graphite` /
     `metal`（struct: bcc/fcc/hcp/sc）。晶格连线阈值见 models.js `buildCrystal`（格点间距 a 的倍数，别乱调）；
   - 每个元素必须有单质（`composition` 长度 1）；`composition` 必须与 atoms 中的元素一致。
6. **交互流程是产品决策，不要"顺手"改回**：
   - 没有侧栏列表；入口 = 顶栏「元素周期表」（首屏自动打开）→ 点元素 → 信息面板「相关物质」→ 物质 → 「← 返回元素」；
   - 输入 >118 的数字显示**假想元素外推演示**（2n² 规律），这是保留的彩蛋功能；
   - App 为**横屏**（uniapp/manifest.json 的 `app-plus.screenOrientation`）；
     页面进入时还会用 `plus.screen.lockOrientation('landscape')` 动态锁定、
     `onUnload` 恢复竖屏——独立打包时与 manifest 叠加无害；AllInOne（全家桶，
     manifest 锁竖屏）依赖该动态锁定才能横屏，勿删（见 uniapp/pages/index/index.vue）；
   - **布局是产品决策，改样式时保持**（2026-08 调整）：
     元素/物质详情为左右分屏——左侧 3D（约 2/3）、右侧信息栏（约 1/3，宽度
     `--info-w`），旋转/复位按钮横排放在左 3D 区下方居中；
     周期表弹窗为 18 列流体网格，宽度自动贴合面板、只允许上下滚动；
     **`.pt-cell` 的 `min-width: 0` 是关键，勿删**——网格项的自动最小尺寸会把
     "内容高度经 aspect-ratio 折算出的最小宽"当成 1fr 轨道下限，删掉后 18 列
     总宽超出面板且横向已禁止滚动，右侧整列显示不出来（真机踩过）；
     横屏矮视口（App 主形态）下顶栏**悬浮**在 3D 区上方（absolute + 透明背景 +
     pointer-events 穿透，品牌隐藏、控件靠右），不占用纵向空间；
     状态栏避让靠 main.js 注入的 `--statusbar-h`（plus API 取真实高度，
     Android WebView 里 env(safe-area-inset-top) 常为 0，勿删该注入逻辑）。
7. **相机与入场动画**：`setModel` 先 `fitCamera()`（按 scale=1 算包围球）再缩放到 0.001 播放入场。
   不要把顺序换回去（会导致相机贴脸）。`fitCamera` 内部对 scale 做了归一，改动需保持该行为。
8. **uniapp 工程文件**：manifest.json / pages.json 被 HBuilderX 可视化编辑器管理，格式有严格约定，
   修改时保守一点；`uniapp/unpackage/` 是编译产物，已 gitignore。

## 常用命令

```bash
# 本地预览（其实双击 index.html 也能跑，经典脚本无跨域问题）
python -m http.server 8019 --bind 0.0.0.0   # 局域网手机可用 http://<电脑IP>:8019 访问

# 数据校验（改 data.js / substances.js 后必跑）
node tools/validate.js

# 网页改动同步进 App 工程（打包前必跑）
python sync_uniapp.py
```

## 已知问题 / 边界

- 金属晶格小簇是"示意"（约 27~63 个原子的截断簇），不是完整晶体；各单质的真实结构类型写在描述文字里。
- 离子对（如 KNO₃、BaSO₄）画的是一个离子对/配位单元，不是整块晶体。
- 假想元素渲染（>118 输入）走 mega/外推路径，上限画 200 个示意环。
- 部分安卓 WebView 若不支持 CSS `color-mix()`，周期表格子会退化为统一底色（有 @supports 兜底，属可接受降级）。
