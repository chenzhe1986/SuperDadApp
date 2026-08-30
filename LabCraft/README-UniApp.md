# 化学视界 · uni-app 安卓打包指南

`uniapp/` 目录是一个完整、可直接编译的 uni-app（Vue3）工程：以 web-view 加载打包在
应用内的离线网页（`hybrid/html/`），Three.js 与全部数据均为本地文件，**安装后完全离线可用**。
应用默认**横屏**显示（`manifest.json → app-plus.screenOrientation`），如需改竖屏删除该行即可。

## 一、环境准备

1. 下载安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)（标准版即可，首次运行到 App 时会提示安装"App 运行/打包"插件，点击安装）。
2. 安卓手机开启"开发者选项 → USB 调试"（真机运行用）；不接手机也可以直接云打包。

## 二、导入工程

1. **首次拿到代码（克隆仓库）后先同步网页副本**：副本 `uniapp/hybrid/html/`
   不入 git 仓库，需在本目录（`LabCraft/`）运行一次 `python sync_uniapp.py` 生成，
   否则 App 里加载不到网页。
2. HBuilderX 菜单：**文件 → 导入 → 从本地目录导入**，选择本目录（`LabCraft/uniapp`）。
3. 导入后左侧项目列表出现"化学视界"。首次打开若提示申请 appid，点"是"自动生成（云端打包需要）。

## 三、真机运行（推荐先做）

1. 手机用数据线连接电脑，首次连接手机上弹出的"允许 USB 调试"点允许。
2. HBuilderX 菜单：**运行 → 运行到手机或模拟器 → 运行到 Android App 基座**，选择你的手机。
3. 等待自动安装 HBuilder 基座并启动应用，即可横屏看到完整功能。

## 四、云打包生成 APK

1. HBuilderX 菜单：**发行 → 原生 App-云打包**。
2. 勾选 Android，包名保持默认或自定义（如 `com.xxx.chemvision`）。
3. 证书：没有自己的证书就选 **使用公共测试证书**（够日常使用；要上架应用商店需自备证书）。
4. 点击"打包"，等待云端打包完成（几分钟），按返回的链接下载 APK，安装到手机即可。
5. 应用图标：manifest.json 可视化界面 → **App 图标配置**，上传一张 1024×1024 图片自动生成全部尺寸。

## 五、修改网页后如何同步

App 内页面是根目录网页的副本。改动 `index.html / css/ / js/` 之后，在项目根目录执行：

```bash
python sync_uniapp.py
```

即可把网页同步到 `uniapp/hybrid/html/`，然后重新运行或打包。

## 六、目录结构

```
LabCraft/
├── index.html, css/, js/     ← 网页版源文件（浏览器直接打开，或 python -m http.server）
├── tools/validate.js         ← 数据校验脚本（node tools/validate.js）
├── sync_uniapp.py            ← 网页 → App 离线页面 的同步脚本
└── uniapp/                   ← HBuilderX 工程根目录（导入这个文件夹）
    ├── manifest.json         ← 应用名/横屏/权限等配置
    ├── pages.json            ← 页面与导航栏配置（已隐藏导航栏，全屏沉浸）
    ├── App.vue / main.js     ← uni-app 入口（Vue3）
    ├── pages/index/index.vue ← 唯一页面：web-view 加载离线网页
    ├── hybrid/html/          ← 打包进 App 的完整网页副本（勿手改，用 sync 脚本同步）
    └── static/               ← 放应用图标等静态资源（可选）
```

## 常见问题

- **运行时报"未配置 appid"**：打开 manifest.json 可视化界面，点击"重新获取 uni-app appid"。
- **打包时提示缺少 Android 证书**：选择"使用公共测试证书"。
- **想改回竖屏**：删除 manifest.json 中 `screenOrientation` 一行，重新打包。
- **网页在电脑浏览器里怎么看**：直接双击 `index.html` 即可离线打开；或项目根目录运行 `python -m http.server 8000` 后访问 `http://127.0.0.1:8000`。
