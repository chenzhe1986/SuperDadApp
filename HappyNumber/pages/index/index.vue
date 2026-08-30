<template>
	<view class="container">
		<view class="child-title">
			🔢 快乐数计算器
		</view>
		
		<view class="subtitle">
			<text style="font-size: 32rpx; color: var(--child-secondary-dark);">来探索数字的奥秘吧！</text>
		</view>
		
		<view class="menu-container">
			<view class="menu-item">
				<navigator url="/pages/happy-check/happy-check" class="child-button child-button-primary child-animated">
					😊 判断快乐数
				</navigator>
			</view>
			<view class="menu-item">
				<navigator url="/pages/happy-range/happy-range" class="child-button child-button-accent child-animated">
					📊 范围内快乐数计算
				</navigator>
			</view>
		</view>
		
		<view class="info-card child-card">
			<view class="child-card-content">
				<view class="child-subtitle">什么是快乐数？</view>
				<view class="child-body1">
					快乐数是一个数学概念，如果一个正整数经过反复计算各位数字的平方和，
					最终能得到1，那么这个数就是快乐数！
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		methods: {
			
		}
	}
</script>

<style>
	@import "../../styles/child-friendly.css";
	
	.container {
		padding: 20rpx;
		text-align: center;
	}
	
	.menu-container {
		margin-top: 80rpx;
	}
	
	.menu-item {
		margin: 50rpx 30rpx;
		text-align: center;
	}
	
	.subtitle {
		margin: 20rpx 0;
	}
	
	.info-card {
		margin-top: 80rpx;
	}
</style>