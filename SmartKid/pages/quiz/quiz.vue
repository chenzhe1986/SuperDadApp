<template>
	<!--
		答题页 —— 核心闯关页面
		功能：随机25题 / 每题20秒倒计时 / 选项点击高亮 /
		      答对答错即时动画+音效 / 自动进入下一题
		两种模式：
		  normal —— 正常闯关（从年级题库随机抽题）
		  wrong  —— 错题重练（从错题本抽题，答对自动移出错题本）
	-->
	<view class="page">
		<view :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ============ 顶部信息栏 ============ -->
		<view class="top-bar">
			<!-- 退出按钮 -->
			<view class="quit-btn" @tap="confirmQuit">✕</view>
			<!-- 进度：第几题/共几题 -->
			<view class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</view>
			<!-- 得分 -->
			<view class="score-text">⭐ {{ score }}</view>
		</view>

		<!-- 进度条：直观展示闯关进度 -->
		<view class="progress-track">
			<view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
		</view>

		<!-- ============ 倒计时 ============ -->
		<view class="timer-box">
			<!-- 剩余时间少于6秒时变红并加心跳动画，提醒抓紧 -->
			<view class="timer-num" :class="{ urgent: timeLeft <= 5 }">⏰ {{ timeLeft }}s</view>
			<view class="timer-track">
				<view
					class="timer-fill"
					:class="{ urgent: timeLeft <= 5 }"
					:style="{ width: (timeLeft / TIME_PER_QUESTION * 100) + '%' }"
				></view>
			</view>
		</view>

		<!-- ============ 题目卡片 ============ -->
		<view class="sk-card question-card" v-if="current">
			<!-- 科目 + 难度标签 -->
			<view class="tag-row">
				<view class="subject-tag" :style="{ backgroundColor: subjColor(current.subject) }">
					{{ subjIcon(current.subject) }} {{ current.subject }}
				</view>
				<view class="diff-tag">{{ diffStars(current.difficulty) }}</view>
				<!-- 连对次数：连对2次以上才显示，激励孩子 -->
				<view class="combo-tag" v-if="combo >= 2">🔥 连对x{{ combo }}</view>
			</view>
			<!-- 题干（大字号，方便儿童阅读） -->
			<view class="question-text">{{ current.question }}</view>
		</view>

		<!-- ============ 选项区 ============ -->
		<view class="options-area" v-if="current">
			<view
				v-for="(opt, idx) in current.options"
				:key="idx"
				class="option-item"
				:class="optionClass(idx)"
				@tap="chooseOption(idx)"
			>
				<!-- 选项字母圆牌 A/B/C/D -->
				<view class="option-letter">{{ letters[idx] }}</view>
				<view class="option-text">{{ opt }}</view>
				<!-- 判定图标：答完后显示 ✓ / ✗ -->
				<view class="option-mark" v-if="answered && idx === current.answer">✓</view>
				<view class="option-mark wrong-mark" v-else-if="answered && idx === selectedIndex">✗</view>
			</view>
		</view>

		<!-- ============ 答题后的即时反馈条 ============ -->
		<view class="feedback" v-if="answered" :class="isCorrect ? 'fb-right' : 'fb-wrong'">
			<view class="fb-title">
				{{ isCorrect ? praiseText : (selectedIndex === -1 ? '⏰ 时间到啦！' : '💪 ' + encourageText) }}
			</view>
			<!-- 简短解析：答完立刻学到知识点 -->
			<view class="fb-explain">💡 {{ current.explanation }}</view>
		</view>
	</view>
</template>

<script>
	import { pickQuizSet, subjectColor, subjectIcon } from '../../utils/questionBank.js'
	import { addWrong, removeWrong, getWrongBook, updateBestScore, addPlayCount } from '../../utils/storage.js'
	import { playClick, playCorrect, playWrong } from '../../utils/sound.js'

	// 每题答题时间（秒），想调整题目时长改这里即可
	const TIME_PER_QUESTION = 20
	// 每答对一题的得分
	const SCORE_PER_QUESTION = 5
	// 答完一题后停留多久进入下一题（毫秒），留出看解析的时间
	const NEXT_DELAY = 2200

	// 答对时随机夸奖语（正向激励，儿童心理学：即时具体的表扬最有效）
	const PRAISES = ['🎉 太棒了！', '👍 真厉害！', '🌟 答对啦！', '🎈 好聪明！', '🏅 完全正确！']
	// 答错时的鼓励语（不批评，保护学习积极性）
	const ENCOURAGES = ['再想想，你一定行！', '没关系，记住它就赚到啦！', '差一点点，继续加油！', '错了也是收获哦！']

	export default {
		data() {
			return {
				TIME_PER_QUESTION,          // 让模板里能读到这个常量
				statusBarHeight: 20,
				mode: 'normal',             // normal=正常闯关 / wrong=错题重练
				grade: 4,                   // 当前年级
				questions: [],              // 本次闯关的题目列表
				currentIndex: 0,            // 当前是第几题（从0开始）
				selectedIndex: -1,          // 玩家选中的选项下标，-1表示没选（超时）
				answered: false,            // 当前题是否已作答
				isCorrect: false,           // 当前题是否答对
				score: 0,                   // 当前得分
				correctCount: 0,            // 答对题数
				combo: 0,                   // 当前连对次数
				maxCombo: 0,                // 最高连对次数
				timeLeft: TIME_PER_QUESTION,// 当前题剩余秒数
				timer: null,                // 倒计时定时器
				nextTimer: null,            // 自动跳下一题的定时器
				letters: ['A', 'B', 'C', 'D'],
				praiseText: '',             // 本题的夸奖语
				encourageText: '',          // 本题的鼓励语
				subjectStat: {}             // 分科目统计 { 语文: {total:3, right:2}, ... }
			}
		},
		computed: {
			/** 当前题目对象 */
			current() {
				return this.questions[this.currentIndex] || null
			},
			/** 闯关进度百分比（进度条用） */
			progressPercent() {
				if (this.questions.length === 0) return 0
				return ((this.currentIndex + (this.answered ? 1 : 0)) / this.questions.length) * 100
			}
		},
		onLoad(options) {
			const info = uni.getSystemInfoSync()
			this.statusBarHeight = info.statusBarHeight || 20

			// 读取页面参数：年级 和 模式
			this.grade = Number(options.grade || 4)
			this.mode = options.mode || 'normal'

			if (this.mode === 'wrong') {
				// ---- 错题重练：从错题本取题（最多20道，随机顺序） ----
				const book = getWrongBook()
				this.questions = this.shuffleArr(book).slice(0, 20)
			} else {
				// ---- 正常闯关：随机抽25题（前5题人文社科、各科均衡，见 questionBank.js） ----
				this.questions = pickQuizSet(this.grade, 25)
			}

			if (this.questions.length === 0) {
				uni.showToast({ title: '没有可用的题目哦', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1200)
				return
			}
			this.startTimer()
		},
		// 离开页面时清理定时器，避免内存泄漏
		onUnload() {
			this.stopAllTimers()
		},
		methods: {
			/* ---------- 工具方法 ---------- */
			subjColor: subjectColor,
			subjIcon: subjectIcon,
			/** 难度转星星显示 */
			diffStars(diff) {
				return { '简单': '⭐', '中等': '⭐⭐', '困难': '⭐⭐⭐' }[diff] || '⭐'
			},
			/** 简单洗牌（错题重练时打乱顺序用） */
			shuffleArr(arr) {
				const a = arr.slice()
				for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[a[i], a[j]] = [a[j], a[i]]
				}
				return a
			},

			/* ---------- 倒计时 ---------- */
			startTimer() {
				this.timeLeft = TIME_PER_QUESTION
				this.timer = setInterval(() => {
					this.timeLeft--
					if (this.timeLeft <= 0) {
						// 时间到，按"没选答案"处理（判错）
						this.settle(-1)
					}
				}, 1000)
			},
			stopAllTimers() {
				if (this.timer) clearInterval(this.timer)
				if (this.nextTimer) clearTimeout(this.nextTimer)
				this.timer = null
				this.nextTimer = null
			},

			/* ---------- 选项样式 ---------- */
			/**
			 * 计算每个选项此刻应有的样式类：
			 *   未作答时：普通白色
			 *   作答后：正确答案变绿弹跳；选错的那个变红抖动；其它变灰
			 */
			optionClass(idx) {
				if (!this.answered) return ''
				if (idx === this.current.answer) return 'right'          // 正确答案：绿色
				if (idx === this.selectedIndex) return 'wrong'           // 选错的：红色
				return 'dimmed'                                          // 其余：变淡
			},

			/* ---------- 核心：点击选项 ---------- */
			chooseOption(idx) {
				// 已作答就不再响应，防止连点
				if (this.answered) return
				playClick()
				this.settle(idx)
			},

			/**
			 * 结算当前题（点击选项或超时都会走到这里）
			 * @param {Number} idx 玩家选择的下标，-1 表示超时未选
			 */
			settle(idx) {
				this.stopAllTimers()
				this.answered = true
				this.selectedIndex = idx
				this.isCorrect = idx === this.current.answer

				// ---- 分科目统计 ----
				const subj = this.current.subject
				if (!this.subjectStat[subj]) this.subjectStat[subj] = { total: 0, right: 0 }
				this.subjectStat[subj].total++

				if (this.isCorrect) {
					// ======== 答对 ========
					playCorrect()
					this.score += SCORE_PER_QUESTION
					this.correctCount++
					this.combo++
					this.maxCombo = Math.max(this.maxCombo, this.combo)
					this.subjectStat[subj].right++
					// 随机换一句夸奖语，保持新鲜感
					this.praiseText = PRAISES[Math.floor(Math.random() * PRAISES.length)]
					// 错题重练模式下：答对了就从错题本移除（表示已掌握）
					if (this.mode === 'wrong') {
						removeWrong(this.current.id)
					}
				} else {
					// ======== 答错 / 超时 ========
					playWrong()
					this.combo = 0 // 连对中断
					this.encourageText = ENCOURAGES[Math.floor(Math.random() * ENCOURAGES.length)]
					// 记入错题本（同一题重复答错只累计次数，见 storage.js）
					addWrong(this.current)
				}

				// 停留几秒展示解析，然后自动进入下一题
				this.nextTimer = setTimeout(() => this.nextQuestion(), NEXT_DELAY)
			},

			/* ---------- 下一题 / 收尾 ---------- */
			nextQuestion() {
				if (this.currentIndex >= this.questions.length - 1) {
					this.finishQuiz()
					return
				}
				this.currentIndex++
				this.answered = false
				this.selectedIndex = -1
				this.isCorrect = false
				this.startTimer()
			},

			/** 闯关结束：保存成绩，跳转结果页 */
			finishQuiz() {
				this.stopAllTimers()
				let newRecord = false
				if (this.mode === 'normal') {
					addPlayCount() // 闯关次数 +1
					newRecord = updateBestScore(this.grade, this.score) // 尝试刷新最高分
				}
				// 把本次成绩存到本地，结果页读取后展示
				// （数据较多，用本地存储中转比 URL 传参更可靠）
				uni.setStorageSync('sk_last_result', {
					mode: this.mode,
					grade: this.grade,
					score: this.score,
					total: this.questions.length,
					correctCount: this.correctCount,
					maxCombo: this.maxCombo,
					newRecord: newRecord,
					subjectStat: this.subjectStat
				})
				// redirectTo：结果页替换当前页，防止返回时回到已结束的答题页
				uni.redirectTo({ url: '/pages/result/result' })
			},

			/** 点左上角 ✕ 退出：弹窗确认，防止误触 */
			confirmQuit() {
				uni.showModal({
					title: '要退出闯关吗？',
					content: '中途退出的话，本次成绩就不算咯~',
					confirmText: '退出',
					cancelText: '继续答题',
					success: (res) => {
						if (res.confirm) {
							this.stopAllTimers()
							uni.navigateBack()
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
		background: linear-gradient(180deg, #E8F4FF 0%, $sk-bg 40%);
	}

	/* ---------- 顶部信息栏 ---------- */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20rpx 0;
	}
	.quit-btn {
		width: 72rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		font-size: 36rpx;
		color: $sk-text-sub;
		box-shadow: 0 4rpx 10rpx rgba(120, 100, 60, 0.1);
	}
	.progress-text {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-text-main;
	}
	.score-text {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-secondary;
	}

	/* ---------- 闯关进度条 ---------- */
	.progress-track {
		height: 16rpx;
		background: #EAE3D5;
		border-radius: 8rpx;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, $sk-primary, #7DBBFF);
		border-radius: 8rpx;
		transition: width 0.4s ease; /* 进度平滑增长的微动效 */
	}

	/* ---------- 倒计时 ---------- */
	.timer-box {
		display: flex;
		align-items: center;
		gap: 20rpx;
		margin: 28rpx 0;
	}
	.timer-num {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-primary;
		min-width: 130rpx;
	}
	/* 最后5秒：变红 + 心跳动画，制造紧张感 */
	.timer-num.urgent {
		color: $sk-danger;
		animation: sk-heartbeat 0.8s ease-in-out infinite;
	}
	.timer-track {
		flex: 1;
		height: 14rpx;
		background: #EAE3D5;
		border-radius: 7rpx;
		overflow: hidden;
	}
	.timer-fill {
		height: 100%;
		background: $sk-warning;
		border-radius: 7rpx;
		transition: width 1s linear; /* 每秒线性缩短 */
	}
	.timer-fill.urgent {
		background: $sk-danger;
	}

	/* ---------- 题目卡片 ---------- */
	.question-card {
		margin-bottom: 32rpx;
		min-height: 220rpx;
	}
	.tag-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 24rpx;
	}
	.subject-tag {
		padding: 8rpx 24rpx;
		border-radius: $sk-radius-sm;
		color: #FFFFFF;
		font-size: $sk-font-sm;
		font-weight: bold;
	}
	.diff-tag {
		font-size: $sk-font-sm;
	}
	.combo-tag {
		margin-left: auto;
		font-size: $sk-font-sm;
		font-weight: bold;
		color: #FF7A00;
		animation: sk-pop 0.4s ease; /* 连对标签弹出动画 */
	}
	/* 题干：40rpx 大字号 + 1.7 行高，儿童阅读黄金参数 */
	.question-text {
		font-size: $sk-font-lg;
		line-height: 1.7;
		font-weight: bold;
		color: $sk-text-main;
	}

	/* ---------- 选项 ---------- */
	.options-area {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}
	.option-item {
		display: flex;
		align-items: center;
		background: $sk-card-bg;
		border: 4rpx solid #EFE9DC;
		border-radius: $sk-radius-md;
		padding: 26rpx 28rpx;
		transition: transform 0.12s ease, background-color 0.2s, border-color 0.2s;
	}
	/* 手指按下瞬间轻微缩小 = 点击高亮微动效 */
	.option-item:active {
		transform: scale(0.97);
		background: #F0F8FF;
		border-color: $sk-primary;
	}
	.option-letter {
		width: 64rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: #F1EDE3;
		color: $sk-text-main;
		font-weight: bold;
		font-size: $sk-font-base;
		margin-right: 24rpx;
		flex-shrink: 0;
	}
	.option-text {
		flex: 1;
		font-size: $sk-font-base;
		line-height: 1.5;
		color: $sk-text-main;
	}
	.option-mark {
		font-size: 40rpx;
		font-weight: bold;
		color: #FFFFFF;
		margin-left: 12rpx;
		animation: sk-pop 0.35s ease; /* ✓/✗ 弹跳出现 */
	}

	/* 答对的选项：整体变绿 + 弹跳 */
	.option-item.right {
		background: $sk-success;
		border-color: $sk-success;
		animation: sk-pop 0.4s ease;
		.option-letter { background: rgba(255, 255, 255, 0.35); color: #FFFFFF; }
		.option-text { color: #FFFFFF; font-weight: bold; }
	}
	/* 选错的选项：整体变红 + 左右抖动 */
	.option-item.wrong {
		background: $sk-danger;
		border-color: $sk-danger;
		animation: sk-shake 0.45s ease;
		.option-letter { background: rgba(255, 255, 255, 0.35); color: #FFFFFF; }
		.option-text { color: #FFFFFF; }
	}
	/* 其余选项：变淡淡出 */
	.option-item.dimmed {
		opacity: 0.45;
	}

	/* ---------- 反馈条 ---------- */
	.feedback {
		margin-top: 36rpx;
		border-radius: $sk-radius-lg;
		padding: 28rpx 32rpx;
		animation: sk-pop 0.35s ease;
	}
	.fb-right {
		background: #E9F9EC;
		border: 3rpx solid $sk-success;
	}
	.fb-wrong {
		background: #FFF0F0;
		border: 3rpx solid $sk-danger;
	}
	.fb-title {
		font-size: $sk-font-md;
		font-weight: bold;
		color: $sk-text-main;
	}
	.fb-explain {
		margin-top: 14rpx;
		font-size: $sk-font-sm;
		line-height: 1.6;
		color: $sk-text-sub;
	}
</style>
