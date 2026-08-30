<template>
	<!--
		结果页 —— 闯关结束后的成绩单
		功能：得分统计 / 星级评价 / 分科目正确率 / 再来一局 / 查看错题
	-->
	<view class="page">
		<view :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 顶部漂浮的彩带装饰（纯CSS动画） -->
		<view class="confetti">
			<text v-for="(c, i) in confettiIcons" :key="i" class="confetti-item"
				:style="{ left: (i * 12 + 4) + '%', animationDelay: (i * 0.25) + 's' }">{{ c }}</text>
		</view>

		<!-- ============ 成绩卡 ============ -->
		<view class="sk-card result-card">
			<!-- 称号：根据正确率给不同的荣誉称号 -->
			<view class="rank-icon">{{ rankInfo.icon }}</view>
			<view class="rank-title">{{ rankInfo.title }}</view>
			<view class="rank-words">{{ rankInfo.words }}</view>

			<!-- 星级：满分3颗星 -->
			<view class="stars">
				<text v-for="n in 3" :key="n" class="star" :class="{ lit: n <= rankInfo.stars }"
					:style="{ animationDelay: (n * 0.3) + 's' }">★</text>
			</view>

			<!-- 大分数 -->
			<view class="score-big">{{ result.score }}<text class="score-unit">分</text></view>
			<view class="new-record" v-if="result.newRecord">🎊 打破历史纪录！</view>

			<!-- 三项小统计 -->
			<view class="mini-stats">
				<view class="mini-item">
					<text class="mini-num">{{ result.correctCount }}/{{ result.total }}</text>
					<text class="mini-label">答对题数</text>
				</view>
				<view class="mini-item">
					<text class="mini-num">{{ accuracy }}%</text>
					<text class="mini-label">正确率</text>
				</view>
				<view class="mini-item">
					<text class="mini-num">x{{ result.maxCombo }}</text>
					<text class="mini-label">最高连对</text>
				</view>
			</view>
		</view>

		<!-- ============ 分科目战报 ============ -->
		<view class="sk-card subject-card" v-if="subjectList.length">
			<view class="card-title">📊 各科战报</view>
			<view class="subj-row" v-for="s in subjectList" :key="s.name">
				<view class="subj-name" :style="{ color: subjColor(s.name) }">
					{{ subjIcon(s.name) }} {{ s.name }}
				</view>
				<!-- 正确率进度条 -->
				<view class="subj-track">
					<view class="subj-fill" :style="{ width: s.percent + '%', backgroundColor: subjColor(s.name) }"></view>
				</view>
				<view class="subj-num">{{ s.right }}/{{ s.total }}</view>
			</view>
		</view>

		<!-- ============ 按钮区 ============ -->
		<view class="btn-area">
			<view class="sk-btn" hover-class="sk-btn-hover" @tap="playAgain">🔁 再来一局</view>
			<view class="sk-btn sk-btn-orange" hover-class="sk-btn-hover" @tap="goWrongBook">📕 查看错题本</view>
			<view class="back-home" @tap="goHome">🏠 返回首页</view>
		</view>
	</view>
</template>

<script>
	import { subjectColor, subjectIcon } from '../../utils/questionBank.js'
	import { playClick, playWin } from '../../utils/sound.js'

	export default {
		data() {
			return {
				statusBarHeight: 20,
				confettiIcons: ['🎉', '⭐', '🎈', '✨', '🎊', '🌟', '🎁', '💫'],
				// 本次闯关成绩（从本地存储读取，答题页结束时写入）
				result: {
					mode: 'normal',
					grade: 4,
					score: 0,
					total: 20,
					correctCount: 0,
					maxCombo: 0,
					newRecord: false,
					subjectStat: {}
				}
			}
		},
		computed: {
			/** 正确率（百分比整数） */
			accuracy() {
				if (!this.result.total) return 0
				return Math.round((this.result.correctCount / this.result.total) * 100)
			},
			/**
			 * 根据正确率评定称号与星星
			 * 90%+ 三星"超级小学霸"；70%+ 两星；50%+ 一星；否则零星鼓励
			 */
			rankInfo() {
				const acc = this.accuracy
				if (acc >= 90) return { stars: 3, icon: '🏆', title: '超级小学霸', words: '哇！你简直是知识小宇宙！' }
				if (acc >= 70) return { stars: 2, icon: '🥈', title: '优秀小达人', words: '很棒哦，离学霸只差一步啦！' }
				if (acc >= 50) return { stars: 1, icon: '🥉', title: '进步小勇士', words: '不错不错，继续闯关会更强！' }
				return { stars: 0, icon: '🌱', title: '潜力小种子', words: '万丈高楼平地起，去错题本复习一下吧！' }
			},
			/** 把分科目统计对象转成数组，方便列表渲染 */
			subjectList() {
				const stat = this.result.subjectStat || {}
				return Object.keys(stat).map(name => ({
					name,
					right: stat[name].right,
					total: stat[name].total,
					percent: stat[name].total ? Math.round((stat[name].right / stat[name].total) * 100) : 0
				}))
			}
		},
		onLoad() {
			const info = uni.getSystemInfoSync()
			this.statusBarHeight = info.statusBarHeight || 20
			// 读取答题页写入的成绩数据
			const saved = uni.getStorageSync('sk_last_result')
			if (saved) this.result = saved
			// 播放胜利音效
			playWin()
		},
		methods: {
			subjColor: subjectColor,
			subjIcon: subjectIcon,
			/** 再来一局：带着同样的年级/模式重新进答题页 */
			playAgain() {
				playClick()
				uni.redirectTo({
					url: '/pages/quiz/quiz?grade=' + this.result.grade + '&mode=' + this.result.mode
				})
			},
			goWrongBook() {
				playClick()
				uni.navigateTo({ url: '/pages/wrongbook/wrongbook' })
			},
			/** 回首页：reLaunch 清空页面栈，防止页面越叠越多 */
			goHome() {
				playClick()
				uni.reLaunch({ url: '/pages/index/index' })
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		padding: 0 40rpx 60rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #FFF3D6 0%, $sk-bg 45%);
		position: relative;
		overflow: hidden;
	}

	/* ---------- 彩带装饰 ---------- */
	.confetti {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 300rpx;
		pointer-events: none; /* 不挡点击 */
	}
	.confetti-item {
		position: absolute;
		top: -10rpx;
		font-size: 40rpx;
		animation: confetti-fall 3s ease-in infinite;
		opacity: 0;
	}
	@keyframes confetti-fall {
		0%   { transform: translateY(-40rpx) rotate(0deg); opacity: 0; }
		15%  { opacity: 1; }
		100% { transform: translateY(360rpx) rotate(300deg); opacity: 0; }
	}

	/* ---------- 成绩卡 ---------- */
	.result-card {
		margin-top: 90rpx;
		text-align: center;
		padding: 48rpx 32rpx;
	}
	.rank-icon {
		font-size: 110rpx;
		animation: sk-pop 0.5s ease;
	}
	.rank-title {
		font-size: $sk-font-xl;
		font-weight: bold;
		color: $sk-text-main;
		margin-top: 12rpx;
	}
	.rank-words {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		margin-top: 10rpx;
	}

	/* 星级 */
	.stars {
		margin-top: 20rpx;
	}
	.star {
		font-size: 64rpx;
		color: #E8E2D4; /* 未点亮的灰星 */
		margin: 0 8rpx;
	}
	.star.lit {
		color: #FFC53D; /* 点亮的金星 */
		animation: sk-pop 0.5s ease backwards; /* 依次弹出 */
	}

	.score-big {
		font-size: 120rpx;
		font-weight: bold;
		color: $sk-secondary;
		margin-top: 8rpx;
		line-height: 1.2;
	}
	.score-unit {
		font-size: $sk-font-md;
		color: $sk-text-sub;
		margin-left: 8rpx;
	}
	.new-record {
		font-size: $sk-font-sm;
		color: #FF7A00;
		font-weight: bold;
		animation: sk-heartbeat 1s ease-in-out infinite;
	}

	/* 三项小统计 */
	.mini-stats {
		display: flex;
		margin-top: 36rpx;
		border-top: 2rpx dashed #EFE9DC;
		padding-top: 28rpx;
	}
	.mini-item {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.mini-num {
		font-size: 40rpx;
		font-weight: bold;
		color: $sk-primary;
	}
	.mini-label {
		font-size: $sk-font-xs;
		color: $sk-text-sub;
		margin-top: 6rpx;
	}

	/* ---------- 分科目战报 ---------- */
	.subject-card {
		margin-top: 32rpx;
	}
	.card-title {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-text-main;
		margin-bottom: 24rpx;
	}
	.subj-row {
		display: flex;
		align-items: center;
		gap: 18rpx;
		margin-bottom: 20rpx;
	}
	.subj-name {
		width: 150rpx;
		font-size: $sk-font-sm;
		font-weight: bold;
		flex-shrink: 0;
	}
	.subj-track {
		flex: 1;
		height: 18rpx;
		background: #F1EDE3;
		border-radius: 9rpx;
		overflow: hidden;
	}
	.subj-fill {
		height: 100%;
		border-radius: 9rpx;
		transition: width 0.8s ease;
	}
	.subj-num {
		width: 80rpx;
		text-align: right;
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		flex-shrink: 0;
	}

	/* ---------- 按钮区 ---------- */
	.btn-area {
		margin-top: 44rpx;
		display: flex;
		flex-direction: column;
		gap: 26rpx;
	}
	.back-home {
		text-align: center;
		font-size: $sk-font-base;
		color: $sk-text-sub;
		padding: 16rpx;
	}
</style>
