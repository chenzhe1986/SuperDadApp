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
js/sound.js           声音与朗读（零资源）：WebAudio 合成点击音效 + 朗读总开关（App 内 plus.speech 优先，Web 回落 speechSynthesis）
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
   - 没有侧栏列表；入口 = 顶栏「元素周期表」（首屏自动打开）→ 点元素 → 信息面板「相关物质」→ 物质；
     返回统一走顶栏「← 返回」（元素/物质/中子页都有，2026-09 起取代了信息面板里的
     `infoBack` 按钮，删除时信息面板的 `infoBack` DOM/JS 已一并清理，勿再引入第二套返回）；
     周期表弹窗**没有 ✕ 关闭按钮**（2026-09 需求），退出口只有：点选元素 / 点遮罩 /
     Esc / 系统返回键；
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
     Android WebView 里 env(safe-area-inset-top) 常为 0，勿删该注入逻辑）；
   - 输入 0 显示**自由中子**（亚原子粒子彩蛋，2026-08 新增）：模型由
     `buildNeutron()` 生成（kind='atom' + 空 shells，自动复用原子核脉动动画），
     信息卡走 `updateInfoElement` 的 `isNeutron` 分支；中子不是周期表元素，
     不参与周期表高亮和"相关物质"，输入 119 及以上仍是假想元素外推演示。
7. **相机与入场动画**：`setModel` 先 `fitCamera()`（按 scale=1 算包围球）再缩放到 0.001 播放入场。
   不要把顺序换回去（会导致相机贴脸）。`fitCamera` 内部对 scale 做了归一，改动需保持该行为。
8. **uniapp 工程文件**：manifest.json / pages.json 被 HBuilderX 可视化编辑器管理，格式有严格约定，
   修改时保守一点；`uniapp/unpackage/` 是编译产物，已 gitignore。
9. **声音与朗读（2026-09 新增，见 js/sound.js）**：
   - 零资源实现：点击音效 = WebAudio 现场合成（`playClick('pick'|'pop')`）；
   - 朗读分两层：**App 内朗读用 plus.android 反射直调安卓系统 TextToSpeech**
     （官方 5+ Speech 模块没有朗读 API——`plus.speech.startSpeaking` 在安卓上
     实际不存在，别用它；由 sound.js 的 `tryNativeSpeak` 实现，不依赖 WebView）；
     浏览器环境没有 plus 时自动回落 Web Speech API `speechSynthesis`
     （`readText(text, force)`）。无需为朗读勾选任何 manifest 模块；
   - 挂点约定：选中类点击（周期表格子/物质 chip/输入跳转/返回）统一在 `selectElement` 与
     `showSubstance` 里响音效；朗读只在 `updateInfo`（setModel 的唯一分发点）挂 `readText(data.desc)`，
     **不要**挂在 `updateInfoElement`（每次选择会被调两遍，会重复读）；
   - sound.js 有手势门控：首次 pointerdown/keydown 之前发声与朗读一律静默——
     首屏自动弹开的周期表不会误发音，也满足浏览器自动播放策略（首屏不预选任何元素，
     见第 10 条）；
   - 顶栏「声音」按钮是总开关，状态持久化在 localStorage（键 `labcraft_sound`），静音时会
     立即停掉所有通道的朗读；信息面板右上角喇叭是"重读"按钮（force 重读，跳过 4 秒去重）；
   - **朗读的"停"与"切"（2026-09 踩坑）**：
     - `stopSpeaking()` 是全局停读入口：打开周期表（openPeriodic）、X/遮罩/Esc 关闭时调用，
       **不要**塞进 `closePeriodic()` 本体——点格子选元素时 onPick 先 selectElement（已安排
       新朗读）再 closePeriodic，在那停读会把新朗读一并掐掉；
     - 安卓 TTS 对"stop() 后立刻 speak()"有竞态：新朗读会被吞掉，表现为旧介绍读不完、
       停不下来（小米真机复现）。sound.js 的 doAndroidSpeak 用 120ms 去抖合并解决——
       快速连点多个元素只读最后一个，且 stop→speak 错峰；**这个时间别调小**；
     - QUEUE_FLUSH 常量 = 0（AOSP 源码确认），运行时优先取类常量、失败兜底 0，
       队列模式错乱也会导致"新文本排队等旧文本"。

10. **系统返回键 = 网页内层层返回（2026-09 新增）**：
   - 网页维护浏览历史栈（main.js 的 `navStack` / `navPush` / `webNavigateBack`）：
     元素/物质/中子/假想元素入栈；**周期表是"根"，不入栈**；连续浏览同一内容自动去重。
     - **首屏=元素周期表（2026-09 改）**：启动不预选任何元素，事件驱动打开周期表弹窗
     （main.js 启动段只有 `resetInfoPanel()` + `openPeriodic()`；**没有** `selectElement(ELEMENTS[0])`，
     曾经默认摆氢会造成"关闭周期表后首屏停在氢"的观感）。`resetInfoPanel()` 是信息面板
     空状态占位（引导文案、隐藏"相关物质"等未选中区块），选中元素后 updateInfo 整体覆盖；
- 壳页面（uniapp/pages/index/index.vue 的 `onBackPress`）按**同步读到的状态**决定
     走哪条路（2026-09-24 重设计，取代了之前"按下返回键再让网页打标记/发消息"
     的异步双通道协议——那条链路（evalJS → postMessage/标题 → 轮询 →
     navigateBack）任一环断掉，壳页面 return true 又把返回键吞了，三合一实测
     出现"在周期表上按返回键回不到首页"）：
     ① 网页每开合周期表/进出视图，都把"是否在根"写进 plus.storage，键
        `labcraft_back_root`（BACK_STATE_KEY，网页写、壳页读，两边字面量一致别改）：
        '1'=已在根（周期表打开且无浏览历史）、'0'=网页内还能回退一层；
     ② 壳页 onBackPress 同步读该键：'0' → evalJS 调 `window.__webSystemBack()`
        让网页回退一格（swapModel 恢复），吞掉本次返回键；'1' 或读不到
        （网页没加载完/存储不可用）→ 关页退出。**读不到一律放行退出，
        宁可少一层回退也不能把用户困在页面里**；
     ③ **退出必须三层兜底（2026-09-25 真机加固，勿简化回 uni.navigateBack 单发）**：
        onBackPress return true 吞键后，紧跟调用（哪怕放进 setTimeout）的
        navigateBack 会被 uni 页面栈静默忽略，三合一真机表现为"返回键毫无反应、
        被困在页面"。壳页 realExit 现为：navigateBack（带 fail 回调）→ 500ms 后
        本页还活着（真退成时定时器随页面销毁根本不会跑）就重试一次 → 再 400ms
        仍没退成就 plus 原生 webview.close() 直接关页；独立单页仍走
        plus.runtime.quit()。**恢复竖屏要在 realExit 一开始就做**（restorePortrait）：
        原生 close 路径不触发 onUnload，plus.screen 又是 App 全局锁，只靠 onUnload
        恢复会让横屏残留到首页和其他子应用（2026-09-25 真机复现）；AllInOne 首页
        home.vue 的 onShow 还有一份强制竖屏兜底。
        **restorePortrait 里严禁 window.plus 判断**（2026-09-25 第三轮真机根因）：
        app-service（v8）上下文没有 window，`window.plus` 抛 ReferenceError 被
        catch 吞掉，三个恢复点曾因此全部静默失效。判断用裸 plus + typeof；恢复
        手段按 unlockOrientation → lock('portrait') → lock('portrait-primary') →
        反射 Activity.setRequestedOrientation(1) 四层兜底。
     ④ **网页侧回退失灵检测**：网页每写一次状态还会自增序号（键
        `labcraft_back_seq`，与 BACK_STATE_KEY 一样两边字面量一致别改）；壳页
        再次按返回键时若序号没变 = evalJS 根本没生效（网页侧回退断了），
        同样放行退出，防止"通知一个没反应的网页"把用户困住；
     ⑤ 壳页拿到的 webview 原生对象**不能放进 data**（Vue 响应式 Proxy 包住
        原生对象后 evalJS 等调用可能整个失效），现取现用、不做缓存。
   - 新增内容视图入口必须调 `navPush`（selectElement / showSubstance /
     showCustomAtom 已挂好）；**回退恢复一律用 swapModel，不要重走 select/show**，
     否则会重复入栈、重复响音效；
   - **回退实现 = 先 pop 栈顶、再 swap 新栈顶**（webNavigateBack）。曾误写成
     swap 被弹出的那项，导致"按第一次返回键原地重放当前页、要按两次才上一层"
     （浏览器冒烟测试抓到的 off-by-one），已修正，别改回去；
   - 顶栏「← 返回」按钮（#navBackBtn）与系统返回键同语义：`navStack` 非空时显示、
     根/空态隐藏，显隐统一由 `syncNavBack()` 维护（navPush / webNavigateBack 已挂）；
     新建内容视图入口时若涉及"返回可用性"，记得同步它；
   - 该返回键联动仅 App 生效（依赖壳页面 onBackPress）；浏览器里的浏览器返回键
     不做 history 联动，属预期。

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
- 朗读（speechSynthesis / 安卓 TTS）最终能不能出声取决于系统是否装了中文 TTS 引擎/语音包：
  华为/小米等主流机型自带，个别精简 ROM 没有时只会听到音效、朗读静默（已 try/catch 兜底，
  无不良影响）。
- **小米 MIUI / 澎湃 OS 的朗读坑（2026-09 真机+诊断证实，重要）**：
  1. App 的 WebView 里 `speechSynthesis` **整个不存在**（诊断浮层实测"不存在"），
     所以"浏览器能读、App 内 Web Speech 方案必无声"；
  2. 官方 5+ Speech 模块只有语音识别，`plus.speech.startSpeaking` 在安卓上不存在
     （undefined），**别再给朗读用 plus.speech**；
  3. 现行解法：plus.android 反射直调 `android.speech.tts.TextToSpeech`（sound.js 的
     `initAndroidTts`/`doAndroidSpeak`），走系统"文字转语音"引擎，与 WebView 无关；
     引擎初始化异步（onInit 回调，0=成功），就绪前朗读排队，失败/超时会在诊断浮层
     说明原因（如缺中文语音包 → 系统设置 → 文字转语音 → 下载）。
  4. 2026-09-24 小米 15 Pro（澎湃 OS 4 Beta）真机验证出声成功；当时的临时诊断浮层
     已随问题解决一并移除（连点"重读"按钮弹状态那套），后续排查可看 HBuilderX
     控制台的 `[TTS]` console.log（sound.js 关键路径保留少量日志）。
