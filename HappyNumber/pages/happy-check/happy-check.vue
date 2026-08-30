<template>
	<view class="container">
		<view class="child-title">
			😊 判断快乐数
		</view>
		
		<view class="input-card child-card">
			<view class="child-card-content">
				<view class="child-input-label">🔢 请输入一个正整数：</view>
				<input type="number" v-model="inputNumber" class="child-input" placeholder="请输入数字" />
			</view>
		</view>
		
		<view class="child-button child-button-primary child-animated" @click="checkHappyNumber">
			🔍 判断是否为快乐数
		</view>
		
		<view v-if="result !== null" class="result-card child-card">
			<view class="child-card-content">
				<view v-if="result.isHappy" class="happy-result child-subtitle" style="color: var(--child-success);">
					🎉 {{ inputNumber }} 是快乐数！
				</view>
				<view v-else class="not-happy-result child-subtitle" style="color: var(--child-error);">
					😢 {{ inputNumber }} 不是快乐数！
				</view>
				
				<view class="process-title child-subtitle">🧮 计算过程：</view>
				<view class="process-list">
					<view v-for="(item, index) in result.process" :key="index" 
						  :class="['child-chip', 'process', isRepeatItem(item, index) ? 'repeat' : '']">
						<text class="child-chip-content">{{ item }}</text>
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
				result: null
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
			
			// 判断一个数是否为快乐数，并记录计算过程
			isHappyWithProcess(num) {
				const seen = new Set();
				const process = [num]; // 记录计算过程
				
				while (num !== 1 && !seen.has(num)) {
					seen.add(num);
					num = this.getSumOfSquares(num);
					process.push(num);
				}
				
				return {
					isHappy: num === 1,
					process: process
				};
			},
			
			// 检查是否为重复项
			isRepeatItem(item, index) {
				if (!this.result || this.result.isHappy) return false;
				// 找到第一个重复的数字
				const firstIndex = this.result.process.indexOf(item);
				return firstIndex !== index;
			},
			
			// 检查快乐数
			checkHappyNumber() {
				if (!this.inputNumber || this.inputNumber <= 0) {
					uni.showToast({
						title: '请输入一个正整数',
						icon: 'none'
					});
					return;
				}
				
				const number = parseInt(this.inputNumber);
				this.result = this.isHappyWithProcess(number);
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
	
	.process-list {
		display: flex;
		flex-wrap: wrap;
		margin-top: 20rpx;
		justify-content: center;
	}
	
	.result-card {
		margin-top: 40rpx;
	}
</style>