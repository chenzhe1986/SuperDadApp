# 爸爸做的超级APP（AllInOne 合并工程）· 打包指南

本项目是 HBuilderX 工程结构（无需 npm、无需命令行构建），全部操作在
[HBuilderX](https://www.dcloud.io/hbuilderx.html) 中完成。

## 一、环境准备

1. 下载安装 **HBuilderX**（App 开发版），登录 **DCloud 账号**（云打包需要）。
2. 本机已安装 Python 3（仅在需要重新同步子项目时用，见下文"日常维护流程"）。

## 二、首次导入

1. **必须先在仓库根目录运行同步**（生成物不入 git 仓库，首次拿到代码时
   `AllInOne/` 里只有 manifest/App.vue/main.js/home 首页等手工文件，不跑脚本无法编译）：
   ```
   python sync_all.py
   ```
2. HBuilderX 菜单：**文件 → 导入 → 从本地目录导入**，选择 `AllInOne` 文件夹。
3. 首次打开会提示申请 appid（manifest.json 中 appid 留空），点「是」自动生成。
   生成后不要再改动。
4. 应用图标：在 HBuilderX 中打开 `manifest.json` → App图标配置，上传 1024x1024
   图标自动生成全套尺寸（可先沿用 SmartKid 的 `static/smartkid/logo.png`）。

## 三、真机调试

1. 安卓手机开启「开发者选项 → USB 调试」，数据线连接电脑。
2. 菜单：**运行 → 运行到手机或模拟器 → 运行到 Android App 基座**。
3. 重点验证：
   - 首页 3 张卡片能正确进入 3 个子应用；
   - 全能小学霸：答题、音效（音效文件在 `static/smartkid/sounds/`）；
   - 化学视界：进入后应自动转为横屏、返回首页自动转回竖屏（页面内
     `plus.screen.lockOrientation` 实现）；网页正常加载、可旋转 3D 模型；
   - 快乐数计算器：页面背景应为浅色渐变（不是奶油米白，若是说明样式覆盖失效）。

## 四、云打包 APK

1. 菜单：**发行 → 原生 App-云打包**。
2. 确认 Android 包名、证书（测试选「使用公共测试证书」），渠道/广告模块不勾选。
3. 打包完成后按返回链接下载 APK 安装。

## 五、日常维护流程（重要）

改了任何子项目（SmartKid / LabCraft / HappyNumber）的代码后：

1. 在仓库根目录运行 `python sync_all.py`，把子项目代码同步进本工程；
2. 再用 HBuilderX 打开 AllInOne 重新运行/打包。

各子项目单独打包的流程不变，详见仓库根目录 `打包指南.md`。

## 六、版本更新

发版前在 `manifest.json` 递增：

- `versionName`（用户可见版本号，如 `1.0.1`）；
- `versionCode`（每次发布必须比上次大，当前 `100`）。

## 常见问题

- **提示缺少 Android 证书**：选「使用公共测试证书」。
- **云打包失败提示未登录**：确认 HBuilderX 已登录 DCloud 账号。
- **首页卡片点击无反应**：检查 `pages/home/home.vue` 里的 `url` 与 `pages.json`
  注册路径是否一致（`pages.json` 由 `sync_all.py` 生成）。
- **化学视界页面白屏**：确认 `hybrid/html/index.html` 存在（由 `sync_all.py`
  从 LabCraft 同步；也可单独先跑 `python LabCraft/sync_uniapp.py` 排查）。
