#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 3 个子项目同步进 AllInOne 合并工程（"全家桶" APK 的唯一代码来源）。

用法：修改任意子项目代码后，在仓库根目录运行：
    python sync_all.py

脚本做 5 件事（全部可重复执行，先清空再拷贝，不会产生残留）：
1. SmartKid:  pages/data/utils -> AllInOne/smartkid/，static -> AllInOne/static/smartkid/；
   拷贝副本里的 "/static/..." 绝对路径改写为 "/static/smartkid/..."（静态资源分桶）。
2. HappyNumber: pages/styles -> AllInOne/happynumber/；并给 child-friendly.css 副本
   追加 page 背景/字体规则——原项目里这条规则在其 App.vue 全局样式里，
   合并工程的全局 page 固定用 SmartKid 底色，所以改为随其每个页面加载时覆盖。
3. LabCraft: 先调用 LabCraft/sync_uniapp.py 刷新网页副本，再拷贝 hybrid/html
   与 web-view 页面到 AllInOne（hybrid/html 必须在合并工程根目录，web-view 才能加载）。
4. uni.scss: 从 SmartKid 拷贝（sk-* 设计变量，被 AllInOne/App.vue 的全局样式引用）。
5. 重新生成 AllInOne/pages.json：首页排第一；每个子应用的 globalStyle 合并进
   它自己每个页面的 style（保留各自导航栏配色）。

【手工维护、脚本不碰的文件】AllInOne/manifest.json、AllInOne/App.vue、
AllInOne/pages/home/home.vue。子项目 App.vue/manifest 的改动需要手动同步。
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
ALL = REPO / "AllInOne"

APP_NAME = "爸爸做的超级APP"

# 给 child-friendly.css 副本追加的 page 规则（原项目写在 HappyNumber/App.vue）
HN_PAGE_CSS = """

/* ==== 以下由 sync_all.py 自动追加（勿手改） ====
   原项目里 page 背景/字体写在 HappyNumber/App.vue 全局样式；
   合并工程 AllInOne 的全局 page 用的是 SmartKid 底色，
   所以让 HappyNumber 自己的 page 规则随本文件在每个页面生效（覆盖全局值）。 */
page {
  background: linear-gradient(135deg, var(--child-background), #E0F7FA);
  font-family: 'Comic Sans MS', '幼圆', '微软雅黑', sans-serif;
  min-height: 100vh;
}
"""

# AllInOne 首页（合并工程的入口页面）
HOME_PAGE = {
    "path": "pages/home/home",
    "style": {
        "navigationBarTitleText": APP_NAME,
        "navigationBarBackgroundColor": "#FFF9EF",
        "navigationBarTextStyle": "black",
        "backgroundColor": "#FFF9EF",
    },
}

# 化学视界的 web-view 页面。横屏不在这里配置——页面级 pageOrientation
# 真机实测不生效（2026-08），改为由页面自身用 plus.screen.lockOrientation
# 动态锁定：进入锁横屏、返回首页恢复竖屏，见 LabCraft/uniapp/pages/index/index.vue。
LABCRAFT_PAGE = {
    "path": "labcraft/pages/index/index",
    "style": {
        "navigationStyle": "custom",
        "app-plus": {
            "bounce": "none",
            "titleNView": False,
        },
    },
}

ALL_GLOBAL_STYLE = {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": APP_NAME,
    "navigationBarBackgroundColor": "#FFF9EF",
    "backgroundColor": "#FFF9EF",
}


def count_files(root: Path) -> int:
    return sum(1 for p in root.rglob("*") if p.is_file())


def sync_dir(src: Path, dst: Path, transform=None) -> int:
    """清空 dst 后把 src 整体拷贝过去；transform 为文本文件的改写函数。返回文件数。"""
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    n = 0
    for f in dst.rglob("*"):
        if not f.is_file():
            continue
        n += 1
        if transform and f.suffix in {".vue", ".js", ".json", ".css"}:
            f.write_text(transform(f.read_text(encoding="utf-8")), encoding="utf-8")
    return n


def rewrite_for_allinone(app: str):
    """生成拷贝副本的文本改写函数（app 为 'smartkid' / 'happynumber'）。

    子项目代码进合并工程后有两类"老路径"必须改写，否则运行时静默失效：
    1. /static/... 静态资源 → /static/<app>/...（资源分桶）；
    2. '/pages/...' 内部跳转（uni.navigateTo / <navigator url>）→
       '/<app>/pages/...'（页面在合并工程里注册的路径都带应用前缀），
       真机实测漏掉这条会导致子应用内部按钮全部"点了没反应"（2026-08）。"""
    def transform(text: str) -> str:
        text = text.replace("/static/", f"/static/{app}/")
        text = text.replace("static/sounds/", f"static/{app}/sounds/")  # 注释文字同步修正
        text = text.replace("'/pages/", f"'/{app}/pages/")
        text = text.replace('"/pages/', f'"/{app}/pages/')
        text = text.replace("`/pages/", f"`/{app}/pages/")  # 模板字符串（happy-range 在用）
        return text
    return transform


def load_pages(proj_dir: Path) -> dict:
    return json.loads((proj_dir / "pages.json").read_text(encoding="utf-8"))


def merge_sub_pages(sub_pages: dict, prefix: str) -> list:
    """把子应用 pages.json 的页面搬进合并工程：路径加前缀，
    并把子应用 globalStyle 先合进每个页面的 style（页面自己的 style 优先），
    这样各子应用在合并工程里仍保留自己的导航栏配色。"""
    sub_global = sub_pages.get("globalStyle", {})
    merged = []
    for page in sub_pages["pages"]:
        style = {**sub_global, **page.get("style", {})}
        merged.append({"path": f"{prefix}/{page['path']}", "style": style})
    return merged


def sync_smartkid() -> int:
    src = REPO / "SmartKid"
    t = rewrite_for_allinone("smartkid")
    total = 0
    total += sync_dir(src / "pages", ALL / "smartkid" / "pages", t)
    total += sync_dir(src / "data", ALL / "smartkid" / "data")
    total += sync_dir(src / "utils", ALL / "smartkid" / "utils", t)
    total += sync_dir(src / "static", ALL / "static" / "smartkid")
    shutil.copy2(src / "uni.scss", ALL / "uni.scss")
    print(f"[SmartKid] 页面/题库/工具/静态资源已同步，共 {total} 个文件"
          f"（/static/ 与 /pages/ 路径已改写，uni.scss 已更新）")
    return total


def sync_happynumber() -> int:
    src = REPO / "HappyNumber"
    t = rewrite_for_allinone("happynumber")
    total = sync_dir(src / "pages", ALL / "happynumber" / "pages", t)
    total += sync_dir(src / "styles", ALL / "happynumber" / "styles")
    css = ALL / "happynumber" / "styles" / "child-friendly.css"
    css.write_text(css.read_text(encoding="utf-8") + HN_PAGE_CSS, encoding="utf-8")
    print(f"[HappyNumber] 页面/样式已同步，共 {total} 个文件（child-friendly.css 已追加 page 规则）")
    return total


def sync_labcraft() -> int:
    # 先刷新 LabCraft 自己的网页副本（它负责把根目录网页拷进 uniapp/hybrid/html）
    subprocess.run([sys.executable, str(REPO / "LabCraft" / "sync_uniapp.py")],
                   check=True, cwd=str(REPO / "LabCraft"))
    total = sync_dir(REPO / "LabCraft" / "uniapp" / "hybrid" / "html", ALL / "hybrid" / "html")
    page_src = REPO / "LabCraft" / "uniapp" / "pages" / "index" / "index.vue"
    page_dst = ALL / "labcraft" / "pages" / "index" / "index.vue"
    page_dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(page_src, page_dst)
    total += 1
    print(f"[LabCraft] 网页副本 + web-view 页面已同步，共 {total} 个文件")
    return total


def generate_pages_json() -> None:
    sk_pages = merge_sub_pages(load_pages(REPO / "SmartKid"), "smartkid")
    hn_pages = merge_sub_pages(load_pages(REPO / "HappyNumber"), "happynumber")
    pages = [dict(HOME_PAGE)] + sk_pages + hn_pages + [dict(LABCRAFT_PAGE)]

    # 校验：pages.json 里注册的每个路径都必须有对应的 .vue 文件，防止路径写错
    missing = [p["path"] for p in pages if not (ALL / f"{p['path']}.vue").is_file()]
    if missing:
        raise SystemExit(f"错误：以下注册页面缺少 .vue 文件：{missing}")

    doc = {"pages": pages, "globalStyle": ALL_GLOBAL_STYLE}
    out = ALL / "pages.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[pages.json] 已重新生成：共 {len(pages)} 个页面"
          f"（首页 1 + SmartKid {len(sk_pages)} + HappyNumber {len(hn_pages)} + 化学视界 1）")


def main():
    if not (REPO / "AllInOne" / "manifest.json").is_file():
        raise SystemExit("错误：未找到 AllInOne 工程，请在仓库根目录运行本脚本。")

    sync_smartkid()
    sync_happynumber()
    sync_labcraft()
    generate_pages_json()
    print("\n✅ 同步完成。下一步：用 HBuilderX 打开 AllInOne 运行/云打包"
          "（详见 AllInOne/打包指南.md）")


if __name__ == "__main__":
    main()
