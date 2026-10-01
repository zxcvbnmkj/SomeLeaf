<template>
	<view class="page">
		<view class="topbar">
			<navigator class="back-button" open-type="navigateBack" :delta="1" aria-label="返回">
				<view class="back-arrow" aria-hidden="true" />
			</navigator>
			<text class="topbar-title">意见反馈</text>
			<view class="topbar-space" />
		</view>

		<view class="content">
			<view class="heading-mark" aria-hidden="true">
				<view class="mail-body" />
				<view class="mail-fold mail-fold-left" />
				<view class="mail-fold mail-fold-right" />
			</view>

			<text class="title">期待听到你的声音</text>
			<text class="message">
				三叶还在慢慢生长。无论是阅读体验、好友共读方式，还是使用中遇到的问题，都欢迎告诉我。你的每一条建议，我都会认真阅读。
			</text>

			<view class="contact-section">
				<text class="contact-label">联系邮箱</text>
				<view class="email-row">
					<text class="email">{{ feedbackEmail }}</text>
					<button class="copy-button" @click="copyEmail">复制邮箱</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	const feedbackEmail = '18879758248@163.com'

	function copyEmail() {
		uni.setClipboardData({
			data: feedbackEmail,
			success: () => {
				uni.showToast({
					title: '邮箱已复制',
					icon: 'none'
				})
			}
		})
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		color: #1d2c24;
		background: #f3f5f2;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: calc(88rpx + env(safe-area-inset-top));
		padding: env(safe-area-inset-top) 20rpx 0;
		background: #ffffff;
		border-bottom: 1rpx solid #e2e7e3;
	}

	.back-button,
	.topbar-space {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
	}

	.back-arrow {
		width: 20rpx;
		height: 20rpx;
		border-bottom: 4rpx solid #345544;
		border-left: 4rpx solid #345544;
		transform: rotate(45deg);
	}

	.topbar-title {
		color: #20352a;
		font-size: 29rpx;
		font-weight: 650;
	}

	.content {
		max-width: 750rpx;
		margin: 0 auto;
		padding: 88rpx 48rpx 60rpx;
	}

	.heading-mark {
		position: relative;
		width: 92rpx;
		height: 72rpx;
	}

	.mail-body {
		position: absolute;
		top: 7rpx;
		left: 0;
		width: 92rpx;
		height: 60rpx;
		background: #e8f0e9;
		border: 3rpx solid #3f7456;
		border-radius: 7rpx;
	}

	.mail-fold {
		position: absolute;
		top: 10rpx;
		width: 53rpx;
		height: 3rpx;
		background: #3f7456;
		transform-origin: left center;
	}

	.mail-fold-left {
		left: 3rpx;
		transform: rotate(35deg);
	}

	.mail-fold-right {
		right: 3rpx;
		transform: rotate(-35deg);
		transform-origin: right center;
	}

	.title,
	.message,
	.contact-label,
	.email {
		display: block;
	}

	.title {
		margin-top: 38rpx;
		color: #20382c;
		font-size: 42rpx;
		font-weight: 700;
	}

	.message {
		margin-top: 26rpx;
		color: #66756d;
		font-size: 27rpx;
		line-height: 1.85;
	}

	.contact-section {
		margin-top: 68rpx;
		padding: 28rpx 0;
		border-top: 1rpx solid #dce3de;
		border-bottom: 1rpx solid #dce3de;
	}

	.contact-label {
		color: #7c8881;
		font-size: 22rpx;
	}

	.email-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 78rpx;
		gap: 20rpx;
	}

	.email {
		min-width: 0;
		color: #244f39;
		font-size: 30rpx;
		font-weight: 600;
		word-break: break-all;
	}

	.copy-button {
		width: 132rpx;
		height: 60rpx;
		margin: 0;
		padding: 0;
		flex: 0 0 132rpx;
		color: #ffffff;
		background: #2f6b4f;
		border-radius: 7rpx;
		font-size: 22rpx;
		line-height: 60rpx;
	}

	.copy-button::after {
		border: 0;
	}

	@media screen and (min-width: 768px) {
		.page {
			width: 750rpx;
			margin: 0 auto;
			box-shadow: 0 0 48rpx rgba(24, 32, 28, 0.08);
		}
	}
</style>