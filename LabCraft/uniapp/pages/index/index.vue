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
};
</script>

<style>
.wrap {
  width: 100%;
  height: 100vh;
  background-color: #0a0c1a;
}
</style>
