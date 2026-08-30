<template>
	<view class="container">
		<view class="child-title">
			数字 <text style="color: var(--child-primary);">{{ number }}</text> 的计算过程：
		</view>
		
		<view class="process-list">
			<view v-for="(item, index) in process" :key="index" 
				  :class="['child-chip', 'process', isRepeatItem(item, index) ? 'repeat' : '']">
				<text class="child-chip-content">{{ item }}</text>
			</view>
		</view>
		
		<view v-if="isHappy" class="result-card child-card" style="text-align: center; background: linear-gradient(135deg, var(--child-success), #7ED6DF);">
			🎉 {{ number }} 是快乐数！ 🎉
		</view>
		<view v-else class="result-card child-card" style="text-align: center; background: linear-gradient(135deg, var(--child-error), #F8A5A5);">
			😢 {{ number }} 不是快乐数！ 😢
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				number: 0,
				process: [],
				isHappy: false
			}
		},
		onLoad(options) {
			if (options.number) {
				this.number = parseInt(options.number);
				this.calculateProcess();
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
			
			// 计算过程
			calculateProcess() {
				const seen = new Set();
				const process = [this.number]; // 记录计算过程
				let num = this.number;
				
				while (num !== 1 && !seen.has(num)) {
					seen.add(num);
					num = this.getSumOfSquares(num);
					process.push(num);
				}
				
				this.process = process;
				this.isHappy = num === 1;
			},
			
			// 检查是否为重复项
			isRepeatItem(item, index) {
				if (this.isHappy) return false;
				// 找到第一个重复的数字
				const firstIndex = this.process.indexOf(item);
				return firstIndex !== index;
			}
		}
	}
</script>

<style>
	@import "../../styles/child-friendly.css";
	
	.container {
		padding: 20rpx;
	}
	
	.process-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		margin: 30rpx 0;
	}
	
	.result-card {
		margin-top: 40rpx;
		font-size: 36rpx;
		font-weight: bold;
		color: white;
	}
</style>