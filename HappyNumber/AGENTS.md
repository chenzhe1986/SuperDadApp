# AGENTS.md · 快乐数计算器项目说明（供 AI 助手与协作者阅读）

## 项目是什么

「快乐数计算器」：一个小而美的数学趣味工具 APP，围绕**快乐数**（Happy Number）提供
三个功能——判断某个数是不是快乐数、计算一段范围内的所有快乐数、展示某个数的
完整计算过程（迭代链，并标出循环/重复项）。目标平台是**安卓 App**，界面采用
儿童友好的风格。

> 快乐数定义：把一个数各位数字的平方和不断迭代，最终收敛到 1 则为快乐数；
> 若进入循环（永远到不了 1）则不是。例如 19 → 1²+9²=82 → 68 → 100 → 1，是快乐数。

## 技术形态（重要）

- **HBuilderX 项目结构，无需 npm**：本项目不是 npm/CLI 工程，没有 `package.json`、
  没有构建步骤，直接用 HBuilderX 打开即可运行。**不要引入 npm 依赖或打包器**。
- uni-app（Vue2/Vue3 兼容写法，现有代码为选项式 `export default { data, methods }`），
  页面为 `.vue` 单文件组件，逻辑全部内联在各页面里，没有抽公共 util——
  项目很小，保持简单即可，不必过度抽象。

## 文件结构

```
manifest.json          uni-app 应用配置（appid: __UNI__203429D、版本号、安卓权限等）
pages.json             页面路由与导航栏配置（新增页面必须在这里注册）
App.vue                应用入口（全局生命周期）
main.js                应用启动入口
styles/
  child-friendly.css   儿童友好风格公共样式（CSS 变量 --child-primary/--child-success/
                       --child-error、child-card、child-chip 等），各页面通过
                       @import 引入
pages/
  index/index.vue            首页：三个功能入口
  happy-check/...            判断快乐数（输入一个数，返回是/否）
  happy-range/...            范围内快乐数计算（输入区间，列出所有快乐数）
  happy-detail/...           快乐数详情（展示迭代过程，循环项标红 repeat）
unpackage/             HBuilderX 编译产物（勿手改、勿提交）
```

## 必须遵守的约定

1. **新增页面**：在 `pages/` 下建目录 + `.vue`，并同步在 `pages.json` 的 `pages` 数组注册，否则无法跳转。
2. **快乐数核心算法**（`getSumOfSquares` + `calculateProcess`，见 `pages/happy-detail/happy-detail.vue`）：
   - 用 `Set` 记录已出现的数来检测循环，**不要**用快慢指针等别的写法替换，保持
     各页面行为一致；
   - `process` 数组保存完整迭代链用于展示，重复（进入循环）的项加 `repeat` class 标红。
3. **样式**：统一使用 `styles/child-friendly.css` 的 CSS 变量与公共类
   （`child-card`、`child-chip`、`child-title` 等），不要在页面里硬编码颜色，
   保持儿童友好的明亮风格（渐变结果卡：成功绿系、失败红系）。
4. **页面间传参**：通过 URL query（`onLoad(options)`，如 `options.number`），数字参数
   记得 `parseInt`。
5. **范围计算注意性能**：大区间逐数迭代可能卡顿，改动 `happy-range` 时留意
   计算量与界面响应（必要时可加提示或分批计算，但不要无故重写现有逻辑）。
6. **不要手改** `unpackage/`（编译产物）。
7. **中文注释**：代码保持详细中文注释风格，方便非专业开发者阅读。

## 打包发布

打包步骤见 `uni-app打包指南.md`；要点：HBuilderX 打开本项目，调试用
「运行到手机或模拟器」，发布用菜单「发行」→「原生 App-云打包」（需 DCloud 账号）。
发布前在 `manifest.json` 递增 `versionName` / `versionCode`。
