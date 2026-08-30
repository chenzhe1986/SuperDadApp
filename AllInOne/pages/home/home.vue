<template>
	<view class="home">
		<!-- 欢迎语区：暖色底、大标题，和三个子应用的儿童风格保持一致 -->
		<view class="home-hero">
			<text class="home-title">爸爸做的超级APP</text>
			<text class="home-sub">三款应用，一个入口 👇</text>
		</view>

		<!-- 应用入口卡片：大圆角 + 果冻按压手感，方便小手指点击 -->
		<view
			class="app-card"
			v-for="app in apps"
			:key="app.url"
			:style="{ background: app.bg }"
			hover-class="app-card-press"
			:hover-stay-time="80"
			@tap="openApp(app)"
		>
			<text class="app-emoji">{{ app.emoji }}</text>
			<view class="app-info">
				<text class="app-name">{{ app.name }}</text>
				<text class="app-desc">{{ app.desc }}</text>
			</view>
			<text class="app-arrow">›</text>
		</view>

		<view class="home-footer">
			<text class="home-footer-text">爸爸做的 · 持续更新中 ❤</text>
		</view>
	</view>
</template>

<script>
	// home.vue —— 合并工程首页：导航到 3 个子应用
	// 【注意】这里跳转的路径必须和 pages.json（sync_all.py 自动生成）里的注册路径一致：
	//   SmartKid 页面挂在 smartkid/ 下，HappyNumber 挂在 happynumber/ 下，
	//   化学视界的 web-view 页挂在 labcraft/ 下。
	export default {
		data() {
			return {
				apps: [
					{
						name: '全能小学霸',
						desc: '语文数学科学…8800+ 题闯关',
						emoji: '📚',
						bg: 'linear-gradient(135deg, #4FA3F7, #7DBBFF)',
						url: '/smartkid/pages/index/index'
					},
					{
						name: '化学视界',
						desc: '3D 看原子、分子和晶体的世界',
						emoji: '⚗️',
						bg: 'linear-gradient(135deg, #0A0C1A, #2A9D8F)',
						url: '/labcraft/pages/index/index'
					},
					{
						name: '快乐数计算器',
						desc: '判断、寻找、展示神奇的快乐数',
						emoji: '🔢',
						bg: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
						url: '/happynumber/pages/index/index'
					}
				]
			}
		},
		methods: {
			openApp(app) {
				uni.navigateTo({
					url: app.url
				})
			}
		}
	}
</script>

<style>
	/* 首页自身风格：奶油米白底（与全局 page 底色一致），卡片用各自应用的代表色 */
	.home {
		min-height: 100vh;
		padding: 40rpx 40rpx 60rpx;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	.home-hero {
		padding: 24rpx 8rpx 48rpx;
		display: flex;
		flex-direction: column;
	}

	.home-title {
		font-size: 52rpx;
		font-weight: bold;
		color: #4A4A68;
	}

	.home-sub {
		margin-top: 12rpx;
		font-size: 30rpx;
		color: #9B9BB4;
	}

	.app-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 36rpx 32rpx;
		border-radius: 36rpx;
		margin-bottom: 32rpx;
		/* 底部厚投影，营造"果冻"立体感（与 SmartKid 按钮同款手法） */
		box-shadow: 0 8rpx 0 rgba(0, 0, 0, 0.12);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	/* 按下时下沉：和 SmartKid 的果冻按钮手感一致 */
	.app-card-press {
		transform: translateY(6rpx) scale(0.98);
		box-shadow: 0 2rpx 0 rgba(0, 0, 0, 0.12);
	}

	.app-emoji {
		font-size: 72rpx;
		margin-right: 28rpx;
	}

	.app-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.app-name {
		font-size: 38rpx;
		font-weight: bold;
		color: #FFFFFF;
	}

	.app-desc {
		margin-top: 8rpx;
		font-size: 26rpx;
		color: rgba(255, 255, 255, 0.9);
	}

	.app-arrow {
		font-size: 48rpx;
		color: rgba(255, 255, 255, 0.85);
		margin-left: 16rpx;
	}

	.home-footer {
		flex: 1;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding-top: 40rpx;
	}

	.home-footer-text {
		font-size: 24rpx;
		color: #C5C5D8;
	}
</style>
