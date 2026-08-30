<template>
	<!--
		错题本页 —— 复习神器
		功能：查看所有答错的题 / 点击展开看答案和解析 /
		      标记"已掌握"移出错题本 / 一键错题重练
	-->
	<view class="page">
		<view :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ============ 顶部栏 ============ -->
		<view class="top-bar">
			<view class="back-btn" @tap="goBack">←</view>
			<view class="page-title">📕 我的错题本</view>
			<view class="clear-btn" v-if="list.length" @tap="confirmClear">清空</view>
			<view class="clear-btn placeholder" v-else></view>
		</view>

		<!-- ============ 空状态 ============ -->
		<view class="empty" v-if="list.length === 0">
			<view class="empty-icon">🎉</view>
			<view class="empty-title">错题本空空如也</view>
			<view class="empty-words">太厉害啦，一道错题都没有！\n继续闯关保持记录吧~</view>
			<view class="sk-btn empty-btn" hover-class="sk-btn-hover" @tap="goBack">去闯关</view>
		</view>

		<!-- ============ 错题列表 ============ -->
		<view v-else>
			<!-- 统计条 + 重练按钮 -->
			<view class="summary-row">
				<text class="summary-text">共 {{ list.length }} 道错题等你消灭</text>
				<view class="retry-btn" @tap="retrain">⚔️ 错题重练</view>
			</view>

			<view
				v-for="item in list"
				:key="item.id"
				class="sk-card wrong-card"
				@tap="toggleExpand(item.id)"
			>
				<!-- 标签行 -->
				<view class="tag-row">
					<view class="subject-tag" :style="{ backgroundColor: subjColor(item.subject) }">
						{{ subjIcon(item.subject) }} {{ item.subject }}
					</view>
					<text class="wrong-times">错了{{ item.wrongCount }}次</text>
					<text class="expand-arrow">{{ expandedId === item.id ? '▲' : '▼' }}</text>
				</view>

				<!-- 题干 -->
				<view class="q-text">{{ item.question }}</view>

				<!-- 展开区域：选项 + 正确答案 + 解析 -->
				<view class="detail" v-if="expandedId === item.id">
					<view
						v-for="(opt, idx) in item.options"
						:key="idx"
						class="detail-opt"
						:class="{ 'is-answer': idx === item.answer }"
					>
						<text>{{ letters[idx] }}. {{ opt }}</text>
						<text v-if="idx === item.answer" class="answer-mark">✓ 正确答案</text>
					</view>
					<view class="explain">💡 {{ item.explanation }}</view>
					<!-- 已掌握按钮：把这题从错题本移除 -->
					<view class="master-btn" @tap.stop="masterIt(item)">✅ 我已掌握，移出错题本</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { subjectColor, subjectIcon } from '../../utils/questionBank.js'
	import { getWrongBook, removeWrong, clearWrongBook } from '../../utils/storage.js'
	import { playClick, playCorrect } from '../../utils/sound.js'

	export default {
		data() {
			return {
				statusBarHeight: 20,
				list: [],          // 错题列表
				expandedId: '',    // 当前展开详情的题目id（空字符串表示都收起）
				letters: ['A', 'B', 'C', 'D']
			}
		},
		onLoad() {
			const info = uni.getSystemInfoSync()
			this.statusBarHeight = info.statusBarHeight || 20
		},
		// 每次进入页面都重新读取（错题重练后有些题可能被消灭了）
		onShow() {
			this.list = getWrongBook()
		},
		methods: {
			subjColor: subjectColor,
			subjIcon: subjectIcon,
			goBack() {
				playClick()
				// 如果错题本是第一个页面（比如从结果页 redirectTo 过来），返回失败就回首页
				uni.navigateBack({
					fail: () => uni.reLaunch({ url: '/pages/index/index' })
				})
			},
			/** 点击卡片：展开/收起详情 */
			toggleExpand(id) {
				playClick()
				this.expandedId = this.expandedId === id ? '' : id
			},
			/** 标记已掌握：从错题本移除这道题 */
			masterIt(item) {
				playCorrect()
				removeWrong(item.id)
				this.list = getWrongBook()
				uni.showToast({ title: '真棒！又消灭一道错题', icon: 'none' })
			},
			/** 错题重练：进入答题页的 wrong 模式 */
			retrain() {
				playClick()
				uni.navigateTo({ url: '/pages/quiz/quiz?mode=wrong' })
			},
			/** 清空错题本（弹窗二次确认，防误触） */
			confirmClear() {
				uni.showModal({
					title: '清空错题本？',
					content: '清空后就找不回这些错题咯，确定吗？',
					confirmText: '清空',
					cancelText: '再想想',
					success: (res) => {
						if (res.confirm) {
							clearWrongBook()
							this.list = []
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page {
		min-height: 100vh;
		padding: 0 36rpx 60rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #FFE9E9 0%, $sk-bg 40%);
	}

	/* ---------- 顶部栏 ---------- */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0 28rpx;
	}
	.back-btn {
		width: 72rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		font-size: 40rpx;
		color: $sk-text-main;
		box-shadow: 0 4rpx 10rpx rgba(120, 100, 60, 0.1);
	}
	.page-title {
		font-size: $sk-font-xl;
		font-weight: bold;
		color: $sk-text-main;
	}
	.clear-btn {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		padding: 12rpx;
		min-width: 72rpx;
		text-align: center;
	}
	.clear-btn.placeholder {
		visibility: hidden;
	}

	/* ---------- 空状态 ---------- */
	.empty {
		text-align: center;
		padding-top: 160rpx;
	}
	.empty-icon {
		font-size: 130rpx;
		animation: sk-float 2.6s ease-in-out infinite;
	}
	.empty-title {
		font-size: $sk-font-xl;
		font-weight: bold;
		color: $sk-text-main;
		margin-top: 24rpx;
	}
	.empty-words {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		margin-top: 16rpx;
		line-height: 1.8;
		white-space: pre-line; /* 让 \n 换行生效 */
	}
	.empty-btn {
		margin: 60rpx auto 0;
		width: 360rpx;
	}

	/* ---------- 统计条 ---------- */
	.summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 24rpx;
	}
	.summary-text {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
	}
	.retry-btn {
		background: linear-gradient(135deg, $sk-danger, #FFA8A8);
		color: #FFFFFF;
		font-size: $sk-font-sm;
		font-weight: bold;
		padding: 14rpx 32rpx;
		border-radius: $sk-radius-pill;
		box-shadow: 0 6rpx 0 rgba(200, 90, 90, 0.4);
	}
	.retry-btn:active {
		transform: translateY(4rpx);
		box-shadow: 0 2rpx 0 rgba(200, 90, 90, 0.4);
	}

	/* ---------- 错题卡片 ---------- */
	.wrong-card {
		margin-bottom: 24rpx;
	}
	.tag-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	.subject-tag {
		padding: 6rpx 20rpx;
		border-radius: $sk-radius-sm;
		color: #FFFFFF;
		font-size: $sk-font-xs;
		font-weight: bold;
	}
	.wrong-times {
		font-size: $sk-font-xs;
		color: $sk-danger;
	}
	.expand-arrow {
		margin-left: auto;
		font-size: $sk-font-xs;
		color: $sk-text-light;
	}
	.q-text {
		font-size: $sk-font-base;
		line-height: 1.6;
		font-weight: bold;
		color: $sk-text-main;
		margin-top: 18rpx;
	}

	/* ---------- 展开详情 ---------- */
	.detail {
		margin-top: 24rpx;
		border-top: 2rpx dashed #EFE9DC;
		padding-top: 24rpx;
		animation: sk-pop 0.25s ease;
	}
	.detail-opt {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		padding: 14rpx 20rpx;
		border-radius: $sk-radius-sm;
		margin-bottom: 10rpx;
	}
	/* 正确答案那一行：绿色高亮 */
	.detail-opt.is-answer {
		background: #E9F9EC;
		color: #2E8B45;
		font-weight: bold;
	}
	.answer-mark {
		font-size: $sk-font-xs;
	}
	.explain {
		font-size: $sk-font-sm;
		color: $sk-text-sub;
		line-height: 1.7;
		background: #FFF8E1;
		border-radius: $sk-radius-sm;
		padding: 20rpx;
		margin-top: 12rpx;
	}
	.master-btn {
		margin-top: 24rpx;
		text-align: center;
		font-size: $sk-font-sm;
		font-weight: bold;
		color: $sk-success;
		border: 3rpx solid $sk-success;
		border-radius: $sk-radius-pill;
		padding: 18rpx;
	}
	.master-btn:active {
		background: #E9F9EC;
	}
</style>
