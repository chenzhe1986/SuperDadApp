<template>
	<view class="container">
		<view class="child-title">
			📊 范围内快乐数计算
		</view>
		
		<view class="input-card child-card">
			<view class="child-card-content">
				<view class="child-input-label">🔢 请输入范围上限N (最大100万)：</view>
				<input type="number" v-model="inputNumber" class="child-input" placeholder="请输入数字" />
			</view>
		</view>
		
		<view class="child-button child-button-accent child-animated" @click="calculateHappyNumbers">
			🚀 开始计算
		</view>
		
		<view v-if="isCalculating" class="calculating child-subtitle">
			<text style="color: var(--child-info);">🧮 计算中... 请稍候 ⏳</text>
		</view>
		
		<view v-if="happyNumbers.length > 0" class="result-card child-card">
			<view class="child-card-content">
				<view class="result-title child-subtitle">🌟 1 到 {{ inputNumber }} 范围内的快乐数：</view>
				<view class="happy-numbers-list">
					<view v-for="(number, index) in happyNumbers" :key="index" 
						  class="child-list-item" @click="showDetail(number)">
						<text class="child-list-item-text">😊 {{ number }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				inputNumber: '',
				happyNumbers: [],
				isCalculating: false
			}
		},
		methods: {
			// 计算数字各位数的平方和
			getSumOfSquares(num) {
				let sum = 0;
				while (num > 0) {
					const digit = num % 10;
					sum += digit * digit;
					num = Math.floor(num / 10);
				}
				return sum;
			},
			
			// 判断一个数是否为快乐数
			isHappy(num) {
				const seen = new Set();
				
				while (num !== 1 && !seen.has(num)) {
					seen.add(num);
					num = this.getSumOfSquares(num);
				}
				
				return num === 1;
			},
			
			// 计算范围内所有快乐数
			calculateHappyNumbers() {
				if (!this.inputNumber || this.inputNumber <= 0) {
					uni.showToast({
						title: '请输入一个正整数',
						icon: 'none'
					});
					return;
				}
				
				const number = parseInt(this.inputNumber);
				
				if (number > 1000000) {
					uni.showToast({
						title: '请输入不超过100万的数字',
						icon: 'none'
					});
					return;
				}
				
				this.isCalculating = true;
				this.happyNumbers = [];
				
				// 使用setTimeout避免界面卡死
				setTimeout(() => {
					for (let i = 1; i <= number; i++) {
						if (this.isHappy(i)) {
							this.happyNumbers.push(i);
						}
					}
					this.isCalculating = false;
					
					uni.showToast({
						title: `找到${this.happyNumbers.length}个快乐数`,
						icon: 'none'
					});
				}, 100);
			},
			
			// 显示详情
			showDetail(number) {
				// 传递数字到详情页面
				uni.navigateTo({
					url: `/pages/happy-detail/happy-detail?number=${number}`
				});
			}
		}
	}
</script>

<style>
	@import "../../styles/child-friendly.css";
	
	.container {
		padding: 20rpx;
	}
	
	.input-card {
		margin: 30rpx 0;
	}
	
	.calculating {
		text-align: center;
		padding: 20rpx;
		font-weight: bold;
	}
	
	.result-title {
		font-weight: bold;
		margin-bottom: 20rpx;
		text-align: center;
	}
	
	.result-card {
		margin-top: 40rpx;
	}
</style>