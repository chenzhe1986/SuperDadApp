# 全能小学霸 · uni-app 打包指南

本项目是 HBuilderX 工程结构（无需 npm、无需命令行构建），全部操作在
[HBuilderX](https://www.dcloud.io/hbuilderx.html) 中完成。

## 一、环境准备

1. 下载安装 **HBuilderX**（选「App 开发版」，自带 App 运行/打包插件）。
2. 注册一个 **DCloud 账号**（云打包、生成 appid 都需要），并在 HBuilderX 中登录
   （菜单：工具 → 登录）。
3. 打包微信小程序另需安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。

## 二、导入项目

1. HBuilderX 菜单：**文件 → 导入 → 从本地目录导入**，选择本项目文件夹 `SmartKid`。
2. 若提示申请 appid，点「是」自动生成（`manifest.json` → 基础配置 → uni-app 应用标识 AppID）。
   已有 appid 则不要改动。

## 三、真机调试（可选但推荐）

1. 安卓手机开启「开发者选项 → USB 调试」，用数据线连接电脑。
2. HBuilderX 菜单：**运行 → 运行到手机或模拟器 → 运行到 Android App 基座**，选择你的手机。
3. 首次运行会在手机上安装调试基座，等待编译完成后自动启动 App。

## 四、打包安卓 App（云打包）

1. HBuilderX 菜单：**发行 → 原生 App-云打包**。
2. 弹窗中确认：
   - Android 包名（如 `com.xxx.smartkid`，一经发布不要更改）；
   - 证书：测试阶段选**「使用公共测试证书」**；正式上架建议打自有证书（可用 DCloud
     免费生成的证书或 Android Studio 生成 keystore）;
   - 渠道/广告模块：无需求一律**不勾选**。
3. 点击「打包」，等待云端打包完成（几分钟），按返回链接下载 APK，安装到手机即可。

## 五、发布微信小程序

1. HBuilderX 菜单：**发行 → 小程序-微信**，填写小程序名称，点击「发行」。
2. 编译完成后会自动生成 `unpackage/dist/build/mp-weixin` 目录。
3. 用微信开发者工具「导入项目」打开该目录（AppID 填你的小程序 AppID）。
4. 在微信开发者工具中点击「上传」，然后到
   [微信公众平台](https://mp.weixin.qq.com) 提交审核，审核通过后发布。
5. 小程序需在公众平台配置**合法请求域名**（本题库为本地内置数据，通常无需额外配置）。

## 六、版本更新

- 发新版前在 `manifest.json` 中递增：
  - `versionName`（如 `1.0.1`，给用户看的版本号）；
  - `versionCode`（如 `101`，每次发布必须比上次大）。
- 微信小程序更新只需重新上传并在公众平台发布新版本。

## 常见问题

- **提示缺少 Android 证书**：选「使用公共测试证书」。
- **打包失败提示未登录**：确认 HBuilderX 已登录 DCloud 账号。
- **真机运行找不到设备**：检查 USB 调试是否开启、是否信任了电脑，必要时重启 HBuilderX。
- **小程序打开白屏**：确认微信开发者工具导入的目录是 `unpackage/dist/build/mp-weixin`，
  而不是项目根目录。
