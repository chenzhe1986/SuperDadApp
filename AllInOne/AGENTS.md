# AGENTS.md · 爸爸做的超级APP（合并工程）说明（供 AI 助手与协作者阅读）

## 项目是什么

「爸爸做的超级APP」：把仓库里 3 个子应用（全能小学霸 / 化学视界 / 快乐数计算器）
合并成一个 HBuilderX uni-app（Vue3）工程，新增首页导航到三者，打出"全家桶" APK。
3 个子项目本身保持独立，仍可各自单独打包（见仓库根 `AGENTS.md` / `打包指南.md`）。

## 目录结构

```
manifest.json              应用配置（应用名"爸爸做的超级APP"；appid 留空，
                           HBuilderX 首次打开/云打包时提示生成）【手工维护】
App.vue                    合并后的全局生命周期 + 全局样式【手工维护】
main.js
uni.scss                   来自 SmartKid 的 sk-* 设计变量【sync_all.py 自动同步】
pages.json                 【sync_all.py 自动生成，勿手改】首页排第一
pages/home/home.vue        首页：3 张应用卡片导航【手工维护】
smartkid/                  SmartKid 的 pages/data/utils 拷贝（层级与原项目一致）
happynumber/               HappyNumber 的 pages/styles 拷贝
labcraft/pages/index/      化学视界 web-view 页（加载 /hybrid/html/index.html）
hybrid/html/               化学视界网页副本（必须在工程根目录）
static/smartkid/           SmartKid 静态资源（音效、二维码等）
```

## 同步机制（核心，务必理解）

**任何子项目的代码改动，都要在仓库根目录跑一次 `python sync_all.py` 再打包本工程。**

**生成物不入库**：上表除 `manifest.json`、`App.vue`、`main.js`、`pages/home/home.vue`
外的内容全部由脚本生成、已被根 `.gitignore` 忽略——克隆（或首次拿到代码）后
**必须先跑 `python sync_all.py`**，否则 HBuilderX 里缺 pages.json/uni.scss/页面，无法编译。

脚本行为（可重复执行）：
1. 清空后重拷 SmartKid 的 `pages/data/utils` 到 `smartkid/`、`static` 到
   `static/smartkid/`，并把副本里的 `/static/...` 绝对路径改写为
   `/static/smartkid/...`（静态资源分桶，避免三应用资源冲突）；
2. 重拷 HappyNumber 的 `pages/styles` 到 `happynumber/`，并给
   `child-friendly.css` 副本追加 `page` 背景/字体规则（原规则在其 App.vue，
   合并工程全局 page 固定用 SmartKid 底色，故改为随页面覆盖）；
3. 调用 `LabCraft/sync_uniapp.py` 后，拷贝网页副本与 web-view 页面；
4. 从 SmartKid 拷贝 `uni.scss`；
5. 重新生成 `pages.json`（子应用 globalStyle 会合并进各自页面 style，
   保留各自导航栏配色；化学视界的横屏由页面内 plus API 动态控制，不在此配置）。

### 手工维护清单（脚本不碰，改子项目后需手动同步的点）

- `manifest.json`：独立于子项目，只管合并工程自己的版本号/图标/权限。
- `App.vue`：全局样式取自 **SmartKid/App.vue**——SmartKid 全局样式改动后要手动同步过来。
- `pages/home/home.vue`：新增子应用入口时，卡片 `url` 必须与重新生成的
  `pages.json` 路径一致。

## 必须遵守的约定

1. **不要手改**生成目录：`smartkid/`、`happynumber/`、`labcraft/`、`hybrid/html/`、
   `static/smartkid/`、`pages.json`、`uni.scss`——下次同步会被覆盖。
   要改就去改对应子项目，然后跑 `python sync_all.py`。
2. **不要手改** `unpackage/`（编译产物）。
3. Vue 统一为 **Vue3**：HappyNumber 源码是 Vue2/Vue3 兼容写法，可直接编译；
   在此工程新增代码请遵循 Vue3。
4. **化学视界的横屏**由其页面内的 `plus.screen.lockOrientation` 动态实现
   （进入锁横屏、返回恢复竖屏，源头在 `LabCraft/uniapp/pages/index/index.vue`，
   随 sync 同步过来）。页面级 `pageOrientation` 已实测无效，勿再加回 pages.json；
   网页内"全屏并锁定横屏"按钮在 App 内无效属正常（浏览器专用）。
5. 页面样式互不干扰的原理：App 端每个 vue 页面独立 webview，跨页污染只可能来自
   `App.vue` 全局样式——往全局加类名时注意不要与 `child-*`、`sk-*`、`home` 系冲突。

## 打包

见 `uni-app打包指南.md`（同样是 HBuilderX 云打包流程，需要新的 appid 与应用图标）。
