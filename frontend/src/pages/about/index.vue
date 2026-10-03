<template>
  <view class="page">
    <view class="topbar">
      <navigator class="back-button" open-type="navigateBack" :delta="1" aria-label="返回">
        <view class="back-arrow" aria-hidden="true" />
      </navigator>
      <text class="topbar-title">关于三叶</text>
      <view class="topbar-space" />
    </view>

    <view class="content">
      <view class="brand-mark" aria-hidden="true">
        <view class="leaf leaf-left" />
        <view class="leaf leaf-top" />
        <view class="leaf leaf-right" />
        <view class="stem" />
      </view>

      <text class="brand-name">SomeLeaf</text>
      <text class="brand-cn">三叶</text>

      <view class="story">
        <text class="story-lead">一叶知秋，见微知著。</text>
        <text class="story-text">
          Leaf，既是树叶，也是书页。SomeLeaf，既是片片树叶，也是篇篇文章。
        </text>
        <text class="story-text">
          俗话说：“一叶落知天下秋。”从一片叶子的飘落感知四时流转，是见微知著；从一页文字出发，看见更辽阔的世界，也是阅读中的见微知著。
        </text>
        <text class="story-text">
          “三叶”中的“三”并非确数，而是虚指。它指向许多叶片、许多书页、许多读者，也指向人与人在阅读中发生的一次次思想相遇。
        </text>
      </view>

      <text class="version">SomeLeaf v0.1.5 -- 20261003</text>
    </view>
  </view>
</template>

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
  padding: 72rpx 48rpx 60rpx;
}

.brand-mark {
  position: relative;
  width: 86rpx;
  height: 86rpx;
}

.leaf {
  position: absolute;
  width: 36rpx;
  height: 49rpx;
  background: #3f805e;
  border-radius: 30rpx 5rpx 30rpx 5rpx;
}

.leaf-left {
  left: 3rpx;
  top: 28rpx;
  transform: rotate(-42deg);
}

.leaf-top {
  left: 25rpx;
  top: 1rpx;
  background: #67a96f;
}

.leaf-right {
  right: 3rpx;
  top: 27rpx;
  background: #286849;
  transform: rotate(42deg) scaleX(-1);
}

.stem {
  position: absolute;
  left: 41rpx;
  bottom: 0;
  width: 4rpx;
  height: 32rpx;
  background: #295f45;
  border-radius: 4rpx;
}

.brand-name,
.brand-cn,
.story-lead,
.story-text,
.version {
  display: block;
}

.brand-name {
  margin-top: 34rpx;
  color: #1f3d2e;
  font-size: 46rpx;
  font-weight: 700;
}

.brand-cn {
  margin-top: 8rpx;
  color: #66766d;
  font-size: 27rpx;
}

.story {
  margin-top: 56rpx;
  padding-top: 36rpx;
  border-top: 1rpx solid #dce3de;
}

.story-lead {
  color: #244e39;
  font-family: "Songti SC", "STSong", serif;
  font-size: 34rpx;
  font-weight: 650;
}

.story-text {
  margin-top: 25rpx;
  color: #596a61;
  font-size: 27rpx;
  line-height: 1.9;
  text-align: justify;
}

.version {
  margin-top: 60rpx;
  padding-top: 25rpx;
  color: #939d97;
  border-top: 1rpx solid #dce3de;
  font-size: 21rpx;
}

@media screen and (min-width: 768px) {
  .page {
    width: 750rpx;
    margin: 0 auto;
    box-shadow: 0 0 48rpx rgba(24, 32, 28, 0.08);
  }
}
</style>
