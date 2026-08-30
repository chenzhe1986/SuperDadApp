#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把根目录网页同步到 uni-app 工程的 hybrid/html（打包进 App 的离线页面）。

用法：python sync_uniapp.py
在修改 index.html / css / js 之后运行一次即可。
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT
DST = ROOT / "uniapp" / "hybrid" / "html"

FILES = ["index.html"]
DIRS = ["css", "js"]


def main():
    DST.mkdir(parents=True, exist_ok=True)
    for f in FILES:
        shutil.copy2(SRC / f, DST / f)
        print(f"复制 {f}")
    for d in DIRS:
        src = SRC / d
        dst = DST / d
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        print(f"复制目录 {d}/ ({sum(1 for _ in dst.rglob('*') if _.is_file())} 个文件)")
    print(f"\n完成：网页已同步到 {DST}")


if __name__ == "__main__":
    main()
