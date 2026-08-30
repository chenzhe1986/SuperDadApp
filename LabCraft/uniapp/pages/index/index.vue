<template>
  <view class="wrap">
    <!-- 打包在应用内的离线页面：hybrid/html 目录会随 App 一起打包 -->
    <web-view src="/hybrid/html/index.html"></web-view>
  </view>
</template>

<script>
export default {
  data() {
    return {};
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
    // 恢复竖屏，与 AllInOne manifest 的 portrait-primary 一致（返回首页是竖屏）
    plus.screen.lockOrientation('portrait-primary');
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
