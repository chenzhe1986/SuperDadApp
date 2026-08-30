# AGENTS.md · 全能小学霸项目说明（供 AI 助手与协作者阅读）

## 项目是什么

「全能小学霸」：一个面向中小学生（内置小学一年级至初三共 9 个年级、约 8900 题）的知识问答闯关 APP。
涵盖语文、数学、英语、科学、历史、地理、生活安全与综合常识，寓教于乐。
使用 **uni-app（Vue3）** 开发，可打包成 **安卓 App** 或 **微信小程序**。

## 技术形态（重要）

- **HBuilderX 项目结构，无需 npm**：本项目不是 npm/CLI 工程，没有 `package.json`、
  没有构建步骤，直接用 HBuilderX 打开即可运行。**不要引入 npm 依赖或打包器**。
- Vue3 组合式/选项式均可（现有代码为选项式 `export default { data, methods }`），
  页面为 `.vue` 单文件组件。
- 代码带有**详细中文注释**，目标读者是非专业开发者，修改时请保持注释风格。

## 文件结构

```
manifest.json         uni-app 应用配置（appid、版本号、图标、各平台配置）
pages.json            页面路由与导航栏配置（新增页面必须在这里注册）
App.vue               应用入口（全局生命周期、全局样式）
main.js               应用启动入口
uni.scss              uni-app 全局 SCSS 变量
data/                 题库（grade1~grade9.json，共约 8900 题）
                      低年级（1~3）由 scripts/generate-bank-g123.js 生成，
                      高年级（4~9）由 scripts/generate-bank.js 追加
pages/
  index/index.vue     首页：选年级、进入闯关、错题本入口
  quiz/quiz.vue       答题页：20 题随机抽题、20 秒倒计时、动画音效反馈
  result/result.vue   结果页：得分、正确率、用时统计
  wrongbook/...       错题本
utils/
  questionBank.js     题库服务：注册题库 + 随机抽题算法（科目/难度分布、先易后难）
  storage.js?         本地存储（成绩、错题本、音效开关等设置）
docs/UI设计规范.md     马卡龙糖果色、大字号、大圆角果冻质感的儿童友好 UI 规范
scripts/              开发维护用 Node 脚本（生题/校验题库），需要 Node.js，
                      不参与 App 打包运行
static/               图标、音效等静态资源
unpackage/            HBuilderX 编译产物（勿手改、勿提交）
```

## 必须遵守的约定

1. **新增页面**：在 `pages/` 下建目录 + `.vue`，并同步在 `pages.json` 的 `pages` 数组注册，否则无法跳转。
2. **题库格式**：`data/gradeN.json`，修改或新增题目后请运行 `scripts/` 下的校验脚本
   （`node scripts/validate.js`，需 Node.js）确认题库格式合法。题库更新不得破坏随机抽题的科目/难度分布逻辑。
   - 高年级（4~9）扩充用 `scripts/generate-bank.js`（只追加、不改已有题）；
   - 低年级（1~3）用 `scripts/generate-bank-g123.js` **整体重建** grade1~3.json
     （口算/乘法口诀/拼音/古诗等由程序生成保证答案正确，常识条目为人工校对池；
     注意：重建会丢弃对这三个文件的手工修改，手工改题请直接改生成器里的池子）。
3. **儿童友好 UI**：改样式前先读 `docs/UI设计规范.md`（马卡龙糖果色、加大字号、
   大圆角果冻质感）；不要引入暗黑系或成人化视觉风格。
4. **音效**：音量控制在 60%，必须有全局静音开关，改动播放逻辑时保持该行为。
5. **本地存储 key**：错题本、成绩、设置等使用 `uni.setStorageSync`，新增/改名 key 时
   全局搜索确认无冲突。
6. **不要手改** `unpackage/`（编译产物）。
7. **兼容目标**：安卓 App + 微信小程序，使用的 API 请确认两端均支持
   （条件编译用 `#ifdef`），避免使用仅 H5 可用的特性。

## 打包发布

打包步骤见 `docs/uni-app打包指南.md`；要点：HBuilderX 打开本项目，
运行调试用「运行到手机/模拟器」，发布用菜单「发行」→「原生 App-云打包」（安卓）
或「发行」→「小程序-微信」（微信小程序，需微信开发者工具上传）。需 DCloud 账号。
