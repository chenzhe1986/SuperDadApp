# AGENTS.md · SuperDadApp 仓库说明（供 AI 助手与协作者阅读）

## 仓库是什么

本仓库是 3 个互不依赖的 uni-app 安卓小项目的合集根目录。每个子目录是一个独立的
HBuilderX 工程，可单独打包成 APK：

| 目录 | 应用 | 简介 | 项目级文档 |
|---|---|---|---|
| `SmartKid/` | 全能小学霸 | 中小学生知识答题闯关 APP（四~初三约 6000 题） | `SmartKid/AGENTS.md` |
| `LabCraft/` | 化学视界 | 元素/分子/晶体 3D 科普（纯静态网页 + uni-app web-view 壳） | `LabCraft/AGENTS.md` |
| `HappyNumber/` | 快乐数计算器 | 快乐数判断 / 范围计算 / 过程展示 | `HappyNumber/AGENTS.md` |
| `AllInOne/` | 爸爸做的超级APP | **合并工程**：首页导航到上述 3 个应用的"全家桶" | `AllInOne/AGENTS.md` |

## 合并工程（AllInOne）与同步流程

- 3 个子项目保持独立、可单独打包；`AllInOne/` 的代码**全部由脚本从子项目同步**。
- **改了任何子项目代码后，必须在仓库根目录运行 `python sync_all.py`**，
  再打开 AllInOne 打包，否则全家桶里是旧代码。
- AllInOne 里的生成物（`smartkid/`、`happynumber/`、`labcraft/`、`hybrid/html/`、
  `static/smartkid/`、`pages.json`、`uni.scss`）**不要手改**；
  手工维护的只有 `manifest.json`、`App.vue`、`pages/home/home.vue`
  （细节见 `AllInOne/AGENTS.md`）。

## 技术形态（通用）

- 所有工程均为 **HBuilderX 项目结构**：无 npm、无 `package.json`、无构建步骤，
  用 HBuilderX 打开即可运行/打包。**不要引入 npm 依赖或打包器**。
- 打包目标：安卓 App（SmartKid 另支持微信小程序），详见各自打包指南。

## 必须遵守的约定

1. **修改代码要适当加注释（中文）**。尤其是说明"为什么这样改"（背景、意图、
   边界情况），方便后续维护；但不要给每行都加无意义注释。
2. **每次处理完成后，如有新的注意点（新发现的问题、易错点、需求带来的新约定等），
   要及时补充到本 AGENTS.md 中**，方便后续会话复用，避免重复踩坑。
3. 动某个子项目的代码前，先读它的 `AGENTS.md`；子项目专属约定以子项目文档为准。
4. 不要手改任何工程的 `unpackage/`（编译产物），以及 `LabCraft/uniapp/hybrid/html/`
   （同步副本，用 `LabCraft/sync_uniapp.py` 生成）。
5. 打包入口与总览见根目录 `打包指南.md`。
6. **git 单仓库管理**：全仓库只有根目录一份 `.gitignore`（2026-08 起子项目内的
   `.git` 与 `.gitignore` 已移除）；不要在子项目内重新 `git init` 或新建 `.gitignore`。
   **同步生成的副本/生成物一律不入库**（`LabCraft/uniapp/hybrid/html/`、
   `AllInOne/hybrid/html/`、AllInOne 各生成目录与 `pages.json`、`uni.scss`），
   保持仓库最简；克隆后打包前必须先跑同步脚本（见根 `.gitignore` 底部注释）。

## 已踩过的坑（复用经验）

- **CSS 网格 + aspect-ratio 的"传递最小尺寸"陷阱**（化学视界周期表踩过）：
  网格项设置了 `aspect-ratio` 时，其自动最小尺寸会把"内容高度按比例折算出的
  最小宽度"当作 `1fr` 轨道下限——内容越高格子越宽，列数一多就横向溢出。
  修复是给网格项显式 `min-width: 0` 并收紧行高；排查手段是对比
  `scrollWidth` 与 `clientWidth`、再量单元格实际宽度是否远超等分值。
- **Android WebView 里 `env(safe-area-inset-top)` 常返回 0**，沉浸式页面会顶到
  状态栏图标下面。App 内（含 uni-app web-view 加载的本地网页，plus 可用）用
  `plus.navigator.getStatusbarHeight()` 取真实高度注入 CSS 变量做避让，
  浏览器环境回退 `env()`。化学视界的 `--statusbar-h` 即此实现。

- **子应用内部跳转路径在合并工程会静默失效**：子项目里的
  `uni.navigateTo({ url: '/pages/...' })`、`<navigator url="/pages/...">`、
  反引号模板字符串 `` url: `/pages/...` ``，在 AllInOne 里因页面注册路径带
  应用前缀而找不到目标，表现为"点了没反应"且无报错弹窗。sync_all.py 已统一把
  三种引号形式的 `'/pages/` 改写为 `'/{app}/pages/`；新增子项目页面无需手改，
  跑同步即可，但改写只认这三字面量前缀，其余写法（如拼接变量前半段）要自查。
- **Git Bash（MSYS）下 grep 搜以 `/` 开头的模式会被路径转换吞掉**：如
  `grep "/static/"` 会被改写成 Git 安装目录下的路径，搜索结果静默为空，
  容易误判"代码里没有这种引用"。解决办法：模式不要以 `/` 开头（如搜 `static/`），
  或设置 `MSYS_NO_PATHCONV=1`。
- **uni-app 工程间合并的约束**（本次合并 AllInOne 时确认）：
  - 相对导入深度：子项目页面整体下移一层放进子目录（如 `smartkid/pages/...`），
    内部 `../../utils/...` 相对路径保持有效，代码零改动；
  - 静态资源：`/static/` 绝对路径引用必须由同步脚本改写分桶
    （`/static/smartkid/...`），否则会 404；
  - Vue 版本：合并工程必须统一 Vue 版本（AllInOne 用 Vue3；
    HappyNumber 源码为 Vue2/Vue3 兼容写法，无需改动即可编译）；
  - App 端每个 vue 页面是独立 webview，页面间样式互不污染，跨页污染只可能
    来自 `App.vue` 全局样式——合并全局样式时注意类名冲突与 `page` 规则覆盖；
  - **页面级 `pageOrientation`（pages.json 的页面 style）真机实测不生效**（2026-08，
    真机竖屏机器无任何旋转）。App 内需要动态横竖屏时，用 5+ API：
    页面 `onLoad` 里 `plus.screen.lockOrientation('landscape')`、`onUnload` 里
    `lockOrientation('portrait-primary')` 恢复（化学视界页面即此实现）；
    另外 Web 的 `screen.orientation.lock` 在 App 的 WebView 里不可用，
    网页内的横屏按钮无法控制 uni-app 页面方向，不要依赖。
