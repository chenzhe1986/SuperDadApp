<template>
  <view class="wrap">
    <!-- 打包在应用内的离线页面：hybrid/html 目录会随 App 一起打包 -->
    <web-view src="/hybrid/html/index.html"></web-view>
  </view>
</template>

<script>
// 与网页（LabCraft/js/main.js）约定的返回状态键：网页写、本页读，两边必须一致。
// '1' = 网页已在"根"（周期表打开且无浏览历史），'0' = 网页内还能回退一层。
const BACK_STATE_KEY = 'labcraft_back_root';
// 状态序号键：网页每写一次状态就自增 1（见 main.js 的 writeBackState）。
// 本页用它验证"让网页回退"的指令有没有真的被执行——evalJS 是单向广播，
// 拿不到执行结果，只能靠两次按键之间序号有没有变化来判断网页侧是否存活。
const BACK_SEQ_KEY = 'labcraft_back_seq';

export default {
  data() {
    return {
      exiting: false, // 已发起退出，避免连按返回键重复导航
      unloaded: false, // 页面已真实卸载（onUnload 置位）：兜底定时器看到它就不再关页面
      lastBackSeq: null, // 上一次"要求网页回退"时读到的状态序号
    };
  },
  // 【为什么动态锁横屏】独立打包时 manifest 本身就是横屏，这里的锁定是无害重复；
  // 但合并工程 AllInOne 的 manifest 锁的是竖屏（全家桶整体竖屏），而化学视界网页
  // 必须横屏。页面级 pageOrientation 经真机实测不生效（2026-08），因此改用 5+ API：
  // 进入本页锁横屏，离开本页（onUnload，返回首页）恢复竖屏。
  // 注意：网页里的"建议横屏观看"提示层由 CSS 媒体查询驱动（orientation: portrait
  // 时显示），WebView 真转到横屏后会自动消失；它那个"全屏并锁定横屏"按钮走的是
  // 浏览器 API（screen.orientation.lock），在 App 内的 WebView 里无效，属正常现象。
  // #ifdef APP-PLUS
  onLoad() {
    plus.screen.lockOrientation('landscape');
  },
  onUnload() {
    this.unloaded = true; // 页面真的关掉了，后面所有兜底定时器一律让位
    this.restorePortrait(); // 正常 navigateBack 关页走这里恢复竖屏（原生 close 路径走不到）
  },
  // 【为什么拦截系统返回键】网页有自己的浏览历史（元素 → 物质 → 元素周期表），
  // 产品需求：按系统返回键时按"周期表 → 元素 → 物质"的反序逐层回退，
  // 退到根（周期表 + 无浏览历史）后再按返回键才真正离开网页回到上一页
  // （AllInOne 里是首页）。
  // 【怎么判断"到根了"】网页每开合一次周期表/进出一次视图，就把状态写进
  // plus.storage（键 BACK_STATE_KEY：'1'=已在根，'0'=网页内还能回退），
  // 本页读这个值是**同步**的，因此可以当场决定走哪条路：
  //   ① '0' → evalJS 通知网页回退一格，吞掉本次返回键；
  //   ② '1' 或读不到（网页还没加载、plus.storage 不可用）→ 关页退出。
  // 【为什么退出不能只靠 uni.navigateBack】（2026-09-25 真机加固）：
  // onBackPress return true 吞掉按键之后，紧跟其后（哪怕放进 setTimeout）调用的
  // uni.navigateBack 会被 uni 页面栈静默忽略——三合一真机实测表现为"按返回键
  // 毫无反应、完全被困在页面里"。所以 realExit 里是三层兜底，见其方法注释。
  onBackPress() {
    const state = this.readBackState(); // '1' / '0' / ''（未知）
    if (state !== '0') {
      // 已在根，或状态未知（网页没跑起来/存储不可用）——都按"退出"处理，
      // 宁可少这样一层回退，也绝不能让用户出不去
      this.realExit();
      return true;
    }
    const seq = this.readBackSeq();
    // 上一次也要求网页回退、但状态序号没变 → evalJS 根本没生效（网页侧回退
    // 链路断了，比如 webview 没加载完/执行环境异常）。这是网页侧失灵唯一
    // 可靠的信号，此时必须放行退出，否则返回键永远在"通知一个没反应的网页"。
    if (this.lastBackSeq !== null && this.lastBackSeq === seq) {
      this.lastBackSeq = null;
      this.realExit();
      return true;
    }
    this.lastBackSeq = seq;
    const wv = this.getInnerWebview();
    if (!wv) {
      this.realExit();
      return true;
    }
    try {
      wv.evalJS('window.__webSystemBack && window.__webSystemBack()');
    } catch (e) {
      // evalJS 失败（如网页还没加载完），不拦截，走默认行为避免把返回键吞掉
      return false;
    }
    return true; // 网页内回退一格：不让系统再关一次页面
  },
  methods: {
    // 网页所在 webview（web-view 组件的实例是页面 webview 的第一个子 webview）。
    // 注意：这个原生对象**不能**放进 data —— Vue 的响应式 Proxy 包住原生对象后，
    // 调 evalJS 等原生方法可能整个失效（返回键"没反应"的元凶之一）。
    // 所以每次现取，不做缓存。
    getInnerWebview() {
      try {
        const page = this.$scope && this.$scope.$getAppWebview && this.$scope.$getAppWebview();
        return page ? page.children()[0] : null;
      } catch (e) {
        return null;
      }
    },
    // 读网页写的返回状态；读不到一律返回 ''（由调用方按"未知=放行退出"处理）
    readBackState() {
      try {
        return (plus.storage.getItem(BACK_STATE_KEY) || '').trim();
      } catch (e) {
        return '';
      }
    },
    // 读网页维护的状态序号；读不到返回 null（调用方会跳过"网页失灵"判定）
    readBackSeq() {
      try {
        const v = parseInt(plus.storage.getItem(BACK_SEQ_KEY));
        return isNaN(v) ? null : v;
      } catch (e) {
        return null;
      }
    },
    // 退出本页 —— 三层兜底（2026-09-25 加固，三合一真机"返回键卡死"的修复）：
    //   ① 正常路径 uni.navigateBack（带 fail 回调，明确失败立刻转 ③）；
    //   ② 500ms 后本页若还活着 → 重试一次 navigateBack。之所以能拿"本页还活着"
    //      当判据：真退成时本页 webview 连同 JS 上下文一起销毁，这个定时器根本
    //      不会执行；定时器能跑就说明 navigateBack 被页面栈静默忽略了。此时
    //      返回键处理流程早已结束，重试大概率能成；
    //   ③ 再 400ms 后仍没退成 → 不再依赖 uni 页面栈，直接原生 close 本页
    //      webview（这就是 navigateBack 的底层动作，必定生效）。
    realExit() {
      if (this.exiting) return; // 连按返回键只退一次
      this.exiting = true;
      // 【为什么在退出一开始就恢复竖屏】退出可能由最底层"原生 webview.close()"
      // 兜底完成——那条路不经过 uni 页面栈，onUnload 不会触发，若只靠 onUnload
      // 恢复竖屏，横屏锁会残留到首页甚至其他子应用（plus.screen 锁的是整个
      // App 的方向，2026-09-25 三合一真机复现过）。趁本页 JS 还活着先恢复；
      // onUnload 里那份保留，作正常 navigateBack 路径的兜底。
      this.restorePortrait();
      setTimeout(() => {
        try {
          const pages = getCurrentPages();
          if (pages.length > 1) {
            uni.navigateBack({
              delta: 1,
              fail: () => this.nativeClose(), // uni 明确报失败 → 直接原生关闭
            });
            // 兜底验证 + 重试（见方法注释）
            setTimeout(() => {
              if (this.unloaded) return;
              try {
                uni.navigateBack({ delta: 1, fail: () => this.nativeClose() });
              } catch (e) {
                this.nativeClose();
              }
              setTimeout(() => this.nativeClose(), 400);
            }, 500);
          } else if (typeof plus !== 'undefined' && plus.runtime) {
            // 独立打包只有本页（单页应用），navigateBack 无效，直接退出 App。
            // 同样用裸 plus 判断（app-service 里没有 window，见 restorePortrait 注释）
            plus.runtime.quit();
          } else {
            this.nativeClose();
          }
        } catch (e) {
          this.nativeClose();
        }
        // 极端情况下若所有层都没退成，放开标记，让用户再按返回键还能重试
        setTimeout(() => { this.exiting = false; }, 1200);
      }, 0);
    },
    // 绕过 uni 页面栈、直接原生关闭本页 webview（等价于 navigateBack 的底层动作）。
    // webview 原生对象不能放进 data（响应式 Proxy 会弄坏原生方法调用），现取现用。
    nativeClose() {
      if (this.unloaded) return;
      try {
        const page = this.$scope && this.$scope.$getAppWebview && this.$scope.$getAppWebview();
        // 裸 plus 判断（app-service 里没有 window，见 restorePortrait 注释）
        const wv = page || (typeof plus !== 'undefined' && plus.webview ? plus.webview.currentWebview() : null);
        if (wv) wv.close();
      } catch (e) { /* 忽略 */ }
    },
    // 恢复竖屏（与 AllInOne manifest 的 portrait-primary 一致）。
    // plus.screen.lockOrientation 锁的是整个 App 的方向，离开本页必须解除，
    // 否则横屏会"传染"给首页和其他子应用。
    // 【为什么不能用 window.plus 判断】（2026-09-25 第三轮真机修复的根因）：
    // App 端本页代码跑在 app-service（v8）上下文里，**没有 window 全局**，
    // `window.plus` 直接抛 ReferenceError、被 try/catch 吞掉——之前三个恢复点
    // 全部静默失效，横屏才残留到首页。App 端判断 plus 一律用裸标识符 + typeof
    // （只有 web-view 里的网页才是真实浏览器环境，那里才用 window.plus）。
    // 四层手段层层兜底，确保竖屏一定恢复：
    restorePortrait() {
      if (typeof plus === 'undefined' || !plus.screen) return;
      // ① 解除动态锁：运行时回到 manifest 声明的方向（AllInOne 为竖屏）
      try { plus.screen.unlockOrientation && plus.screen.unlockOrientation(); } catch (e) { /* 忽略 */ }
      // ② 显式锁回竖屏：个别 ROM/5+ 版本不认 'portrait-primary'，先锁 'portrait' 再锁正向
      try { plus.screen.lockOrientation('portrait'); } catch (e) { /* 忽略 */ }
      try { plus.screen.lockOrientation('portrait-primary'); } catch (e) { /* 忽略 */ }
      // ③ 终极兜底：反射直调安卓 Activity API（1 = SCREEN_ORIENTATION_PORTRAIT，
      //    纯 binder 调用、线程无关；5+ 的 lockOrientation 底层也是它）
      try {
        const main = plus.android && plus.android.runtimeMainActivity();
        if (main) {
          plus.android.importClass(main);
          main.setRequestedOrientation(1);
        }
      } catch (e) { /* 忽略 */ }
    },
  },

  // #endif
};
</script>

<style>
.wrap {
  width: 100%;
  height: 100vh;
  background-color: #0a0c1a;
}
</style>
