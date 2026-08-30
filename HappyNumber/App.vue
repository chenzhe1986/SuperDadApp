<script>
export default {
  onLaunch: function() {
    console.log('App Launch')
  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  }
}
</script>

<style>
/* 每个页面公共css */
@import "./styles/child-friendly.css";

/* 全局样式 */
page {
  background: linear-gradient(135deg, var(--child-background), #E0F7FA);
  font-family: 'Comic Sans MS', '幼圆', '微软雅黑', sans-serif;
  min-height: 100vh;
}
</style>