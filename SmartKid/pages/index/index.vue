<template>
	<!--
		首页 —— APP的"大门"
		功能：选择年级 → 开始闯关；查看错题本；音效开关
	-->
	<view class="page">
		<!-- 顶部状态栏占位（自定义导航栏时需要，避免内容顶到刘海屏） -->
		<view :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 右上角：音效开关 -->
		<view class="sound-toggle" @tap="toggleSound">
			<text class="sound-icon">{{ soundOn ? '🔊' : '🔇' }}</text>
		</view>

		<!-- ============ 头部：LOGO 与标语 ============ -->
		<view class="header">
			<!-- 会上下漂浮的吉祥物（纯emoji实现，零图片资源） -->
			<view class="mascot">🦉</view>
			<view class="app-title">全能小学霸</view>
			<view class="app-slogan">每天闯一关，知识装满罐 🍬</view>
		</view>

		<!-- ============ 数据看板：最高分 / 闯关次数 / 待复习错题 ============ -->
		<view class="stats-row">
			<view class="stat-card">
				<text class="stat-num">{{ bestScore }}</text>
				<text class="stat-label">🏆 最高分</text>
			</view>
			<view class="stat-card">
				<text class="stat-num">{{ playCount }}</text>
				<text class="stat-label">🚩 闯关次数</text>
			</view>
			<view class="stat-card" @tap="goWrongBook">
				<text class="stat-num">{{ wrongCount }}</text>
				<text class="stat-label">📕 待复习</text>
			</view>
		</view>

		<!-- ============ 年级选择区 ============ -->
		<view class="section-title">🎒 选择年级</view>
		<view class="grade-grid">
			<view
				v-for="g in grades"
				:key="g.value"
				class="grade-card"
				:class="{ active: g.value === selectedGrade, disabled: !g.enabled }"
				@tap="chooseGrade(g)"
			>
				<text class="grade-icon">{{ g.icon }}</text>
				<text class="grade-name">{{ g.label }}</text>
				<!-- 未上线的年级显示“敬请期待”角标 -->
				<text v-if="!g.enabled" class="grade-soon">敬请期待</text>
			</view>
		</view>

		<!-- ============ 底部按钮区 ============ -->
		<view class="btn-area">
			<view class="sk-btn start-btn" hover-class="sk-btn-hover" @tap="startQuiz">
				🚀 开始闯关
			</view>
			<view class="sk-btn sk-btn-orange" hover-class="sk-btn-hover" @tap="goWrongBook">
				📕 我的错题本
			</view>
		</view>

		<view class="footer" @tap="openReward">— 全能小学霸 v1.0 · 快乐学习每一天 —</view>

		<!-- 赏赏作者入口 -->
		<view class="reward-entry" @tap="openReward">
			<text>❤️ 赏赏作者</text>
		</view>

		<!-- ============ 赏赏作者弹窗 ============ -->
		<view v-if="showReward" class="reward-mask" @tap="closeReward">
			<!-- @tap.stop 防止点击弹窗内部时误关闭 -->
			<view class="reward-card" @tap.stop>
				<view class="reward-close" @tap="closeReward">✕</view>
				<view class="reward-title">❤️ 赏赏作者</view>
				<view class="reward-desc">这个APP是爸爸为孩子一点点做出来的～
					如果它帮到了你，欢迎请作者喝杯奶茶 🥤</view>
				<!-- 支付宝收钱码 -->
				<image class="reward-qr" src="/static/reward-qr.jpg" mode="widthFix" @tap="previewQr"></image>
				<view class="reward-qr-tip">支付宝扫一扫（点图可放大）</view>
				<!-- 联系邮箱 -->
				<view class="reward-mail" @tap="copyMail">
					<text class="reward-mail-label">✉️ 联系邮箱（点击复制）</text>
					<text class="reward-mail-addr">{{ authorMail }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	// 引入题库服务和本地存储工具（详细说明见 utils 目录下的文件注释）
	import { GRADES, hasBank } from '../../utils/questionBank.js'
	import { getBestScore, getPlayCount, getWrongBook, isSoundOn, setSoundOn } from '../../utils/storage.js'
	import { playClick } from '../../utils/sound.js'

	export default {
		data() {
			return {
				statusBarHeight: 20, // 状态栏高度，onLoad 里动态获取
				grades: GRADES,      // 年级列表（含"敬请期待"的年级）
				selectedGrade: 4,    // 当前选中的年级，默认四年级
				bestScore: 0,        // 最高分
				playCount: 0,        // 累计闯关次数
				wrongCount: 0,       // 错题本里的题目数量
				soundOn: true,       // 音效开关状态
				showReward: false,   // 是否显示“赏赏作者”弹窗
				authorMail: 'chenzhe1986@126.com' // 作者联系邮箱
			}
		},
		onLoad() {
			// 获取手机状态栏高度，让内容避开刘海/挖孔屏
			const info = uni.getSystemInfoSync()
			this.statusBarHeight = info.statusBarHeight || 20
		},
		// 每次回到首页都刷新数据（比如刚闯完关回来，最高分可能变了）
		onShow() {
			this.bestScore = getBestScore(this.selectedGrade)
			this.playCount = getPlayCount()
			this.wrongCount = getWrongBook().length
			this.soundOn = isSoundOn()
		},
		methods: {
			/** 点击年级卡片 */
			chooseGrade(g) {
				playClick()
				if (!g.enabled) {
					// 未上线的年级给个友好提示
					uni.showToast({ title: g.label + '题库正在准备中~', icon: 'none' })
					return
				}
				this.selectedGrade = g.value
				this.bestScore = getBestScore(g.value)
			},
			/** 点击"开始闯关" */
			startQuiz() {
				playClick()
				if (!hasBank(this.selectedGrade)) {
					uni.showToast({ title: '这个年级的题库还没上线哦', icon: 'none' })
					return
				}
				// 跳转到答题页，把年级传过去
				uni.navigateTo({
					url: '/pages/quiz/quiz?grade=' + this.selectedGrade
				})
			},
			/** 打开错题本 */
			goWrongBook() {
				playClick()
				uni.navigateTo({ url: '/pages/wrongbook/wrongbook' })
			},
			/** 切换音效开关 */
			toggleSound() {
				this.soundOn = !this.soundOn
				setSoundOn(this.soundOn)
				if (this.soundOn) playClick() // 打开时播一声让孩子知道生效了
			},
			/** 打开“赏赏作者”弹窗 */
			openReward() {
				playClick()
				this.showReward = true
			},
			/** 关闭“赏赏作者”弹窗 */
			closeReward() {
				this.showReward = false
			},
			/** 复制作者邮箱到剪贴板 */
			copyMail() {
				uni.setClipboardData({
					data: this.authorMail,
					success: () => {
						uni.showToast({ title: '邮箱已复制~', icon: 'success' })
					}
				})
			},
			/** 点击二维码放大预览 */
			previewQr() {
				uni.previewImage({ urls: ['/static/reward-qr.jpg'] })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		padding: 0 40rpx 60rpx;
		box-sizing: border-box;
		/* 从淡蓝到奶油白的柔和渐变背景 */
		background: linear-gradient(180deg, #E8F4FF 0%, $sk-bg 45%);
	}

	/* 右上角音效开关 */
	.sound-toggle {
		position: absolute;
		top: 80rpx;
		right: 40rpx;
		width: 88rpx;
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 50%;
		box-shadow: 0 4rpx 12rpx rgba(120, 100, 60, 0.12);
		z-index: 10;
	}
	.sound-icon {
		font-size: 44rpx;
	}

	/* ---------- 头部 ---------- */
	.header {
		text-align: center;
		padding: 40rpx 0 30rpx;
	}
	.mascot {
		font-size: 120rpx;
		line-height: 1.3;
		/* 上下漂浮动画，让首页更有生气（动画定义在 App.vue） */
		animation: sk-float 2.6s ease-in-out infinite;
	}
	.app-title {
		font-size: 64rpx;
		font-weight: bold;
		color: $sk-text-main;
		letter-spacing: 6rpx;
		margin-top: 10rpx;
		/* 文字下方垫一条黄色"荧光笔"效果 */
		text-shadow: 0 4rpx 0 rgba(255, 209, 102, 0.6);
	}
	.app-slogan {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		margin-top: 16rpx;
	}

	/* ---------- 数据看板 ---------- */
	.stats-row {
		display: flex;
		gap: 20rpx;
		margin: 20rpx 0 40rpx;
	}
	.stat-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: $sk-card-bg;
		border-radius: $sk-radius-lg;
		padding: 24rpx 0;
		box-shadow: 0 6rpx 20rpx rgba(120, 100, 60, 0.08);
	}
	.stat-num {
		font-size: 48rpx;
		font-weight: bold;
		color: $sk-primary;
	}
	.stat-label {
		font-size: $sk-font-xs;
		color: $sk-text-sub;
		margin-top: 8rpx;
	}

	/* ---------- 年级选择 ---------- */
	.section-title {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-text-main;
		margin-bottom: 24rpx;
	}
	.grade-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
	}
	.grade-card {
		position: relative;
		width: calc((100% - 40rpx) / 3); /* 一行3个 */
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: $sk-card-bg;
		border: 4rpx solid transparent;
		border-radius: $sk-radius-md;
		padding: 26rpx 0 20rpx;
		box-shadow: 0 6rpx 16rpx rgba(120, 100, 60, 0.06);
		transition: transform 0.15s ease, border-color 0.15s ease;
	}
	/* 选中的年级：蓝色描边 + 轻微放大 */
	.grade-card.active {
		border-color: $sk-primary;
		background: #F0F8FF;
		transform: scale(1.05);
	}
	/* 未上线的年级：整体变淡 */
	.grade-card.disabled {
		opacity: 0.55;
	}
	.grade-icon {
		font-size: 52rpx;
	}
	.grade-name {
		font-size: $sk-font-base;
		font-weight: bold;
		color: $sk-text-main;
		margin-top: 8rpx;
	}
	.grade-soon {
		font-size: $sk-font-xs;
		color: $sk-secondary;
		margin-top: 4rpx;
	}

	/* ---------- 底部按钮 ---------- */
	.btn-area {
		margin-top: 56rpx;
		display: flex;
		flex-direction: column;
		gap: 28rpx;
	}
	.start-btn {
		font-size: 44rpx;
		height: 120rpx;
		letter-spacing: 4rpx;
	}

	.footer {
		text-align: center;
		font-size: $sk-font-xs;
		color: $sk-text-light;
		margin-top: 60rpx;
	}

	/* ---------- 赏赏作者 ---------- */
	.reward-entry {
		margin: 24rpx auto 0;
		width: fit-content;
		padding: 12rpx 36rpx;
		font-size: $sk-font-sm;
		color: $sk-danger;
		background: rgba(255, 128, 128, 0.12);
		border-radius: $sk-radius-pill;
	}
	/* 遮罩层 */
	.reward-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.reward-card {
		position: relative;
		width: 560rpx;
		background: $sk-card-bg;
		border-radius: $sk-radius-lg;
		padding: 48rpx 40rpx 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.2);
		animation: sk-pop 0.35s ease;
	}
	.reward-close {
		position: absolute;
		top: 20rpx;
		right: 28rpx;
		font-size: 40rpx;
		color: $sk-text-light;
	}
	.reward-title {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-text-main;
	}
	.reward-desc {
		margin-top: 16rpx;
		font-size: $sk-font-sm;
		line-height: 1.6;
		color: $sk-text-sub;
		text-align: center;
	}
	.reward-qr {
		width: 360rpx;
		margin-top: 28rpx;
		border-radius: $sk-radius-md;
	}
	.reward-qr-tip {
		margin-top: 12rpx;
		font-size: $sk-font-xs;
		color: $sk-text-sub;
	}
	.reward-mail {
		margin-top: 28rpx;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20rpx 0;
		background: $sk-bg;
		border-radius: $sk-radius-md;
	}
	.reward-mail-label {
		font-size: $sk-font-xs;
		color: $sk-text-sub;
	}
	.reward-mail-addr {
		margin-top: 8rpx;
		font-size: $sk-font-base;
		font-weight: bold;
		color: $sk-primary;
	}
</style>
