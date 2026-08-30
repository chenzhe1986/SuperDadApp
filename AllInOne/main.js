// main.js —— 应用入口文件
// uni-app 会从这里启动整个应用，一般不需要修改
import App from './App'

// #ifndef VUE3
// ========== Vue2 模式（manifest.json 里 vueVersion 是 2 会走这里；本项目固定 Vue3） ==========
import Vue from 'vue'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
// ========== Vue3 模式（本项目使用） ==========
import { createSSRApp } from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	return {
		app
	}
}
// #endif
