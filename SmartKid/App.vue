<script>
	// App.vue —— 应用生命周期文件
	// 整个APP启动、进入前台、进入后台时会触发这里的钩子函数
	export default {
		onLaunch: function() {
			console.log('全能小学霸 启动啦！')
		},
		onShow: function() {
			// APP 从后台回到前台
		},
		onHide: function() {
			// APP 进入后台
		}
	}
</script>

<style lang="scss">
	/*
	 * 全局公共样式 —— 每个页面都会生效
	 * 具体的"设计规范变量"定义在 uni.scss 中
	 */

	/* 页面统一底色：奶油米白，柔和不刺眼 */
	page {
		background-color: $sk-bg;
		color: $sk-text-main;
		font-size: $sk-font-base;
		/* 优先使用圆润可爱的系统字体，儿童阅读更友好 */
		font-family: "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif;
	}

	/* ============ 通用大按钮（果冻按钮） ============ */
	/* 儿童APP按钮要"大而圆"，方便小手指点击，点击区域不小于 88rpx 高 */
	.sk-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 104rpx;
		border-radius: $sk-radius-pill;
		font-size: $sk-font-btn;
		font-weight: bold;
		color: #FFFFFF;
		background: linear-gradient(135deg, $sk-primary, #7DBBFF);
		box-shadow: 0 8rpx 0 rgba(46, 122, 210, 0.45); /* 底部投影营造"果冻厚度" */
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	/* 按下时下沉，模拟真实按钮的"咔哒"手感（微动效） */
	.sk-btn:active,
	.sk-btn-hover {
		transform: translateY(6rpx) scale(0.98);
		box-shadow: 0 2rpx 0 rgba(46, 122, 210, 0.45);
	}

	/* 橙色副按钮 */
	.sk-btn-orange {
		background: linear-gradient(135deg, $sk-secondary, #FFCE7A);
		box-shadow: 0 8rpx 0 rgba(214, 138, 30, 0.45);
	}
	.sk-btn-orange:active {
		box-shadow: 0 2rpx 0 rgba(214, 138, 30, 0.45);
	}

	/* 绿色按钮 */
	.sk-btn-green {
		background: linear-gradient(135deg, $sk-success, #92E39C);
		box-shadow: 0 8rpx 0 rgba(60, 158, 90, 0.45);
	}
	.sk-btn-green:active {
		box-shadow: 0 2rpx 0 rgba(60, 158, 90, 0.45);
	}

	/* ============ 通用卡片 ============ */
	.sk-card {
		background-color: #FFFFFF;
		border-radius: $sk-radius-lg;
		box-shadow: 0 6rpx 24rpx rgba(120, 100, 60, 0.08);
		padding: 32rpx;
	}

	/* ============ 通用动画 ============ */
	/* 弹跳出现：用于答对时的反馈图标 */
	@keyframes sk-pop {
		0%   { transform: scale(0); }
		60%  { transform: scale(1.25); }
		100% { transform: scale(1); }
	}
	/* 左右摇头：用于答错时的选项抖动 */
	@keyframes sk-shake {
		0%, 100% { transform: translateX(0); }
		20% { transform: translateX(-14rpx); }
		40% { transform: translateX(12rpx); }
		60% { transform: translateX(-8rpx); }
		80% { transform: translateX(6rpx); }
	}
	/* 上下漂浮：用于装饰元素，让页面"活"起来 */
	@keyframes sk-float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-14rpx); }
	}
	/* 心跳缩放：用于倒计时最后几秒的紧张提示 */
	@keyframes sk-heartbeat {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.18); }
	}
</style>
