<template>
  <view class="page">
    <view class="topbar">
      <view>
        <text class="eyebrow">SomeLeaf</text>
        <text class="title">我的</text>
      </view>

      <view class="brand-mark" aria-hidden="true">
        <view class="leaf leaf-left" />
        <view class="leaf leaf-top" />
        <view class="leaf leaf-right" />
        <view class="stem" />
      </view>
    </view>

    <view class="content">
      <view class="profile">
        <view class="avatar">叶</view>
        <view class="profile-copy">
          <text class="profile-name">三叶读者</text>
          <text class="profile-note">愿每次翻页都有新的发现</text>
        </view>
      </view>

      <view class="section">
        <view class="setting-row">
          <text class="setting-name">阅读偏好</text>
          <text class="setting-value">默认</text>
        </view>
        <view class="divider" />
        <view class="setting-row">
          <text class="setting-name">关于三叶</text>
          <text class="setting-value">v0.1.0</text>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <navigator class="nav-item" url="/pages/bookshelf/index" open-type="redirect">
        <view class="nav-icon" aria-hidden="true">
          <view class="nav-books">
            <view class="nav-book" />
            <view class="nav-book nav-book-raised" />
            <view class="nav-book" />
          </view>
        </view>
        <text class="nav-label">书架</text>
      </navigator>

      <view class="nav-item nav-item-active">
        <view class="nav-icon" aria-hidden="true">
          <view class="nav-profile">
            <view class="profile-head" />
            <view class="profile-body" />
          </view>
        </view>
        <text class="nav-label">我的</text>
      </view>
    </view>
  </view>
</template>

<script setup>
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: calc(132rpx + env(safe-area-inset-bottom));
  background: #f3f5f2;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(46rpx + env(safe-area-inset-top)) 40rpx 34rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e9e5;
}

.eyebrow,
.title {
  display: block;
}

.eyebrow {
  color: #6f7e75;
  font-size: 23rpx;
}

.title {
  margin-top: 8rpx;
  color: #18201c;
  font-size: 48rpx;
  font-weight: 700;
  line-height: 1.2;
}

.brand-mark {
  position: relative;
  width: 62rpx;
  height: 62rpx;
}

.leaf {
  position: absolute;
  width: 27rpx;
  height: 36rpx;
  background: #3f805e;
  border-radius: 24rpx 4rpx 24rpx 4rpx;
}

.leaf-left {
  left: 3rpx;
  top: 18rpx;
  transform: rotate(-42deg);
}

.leaf-top {
  left: 18rpx;
  top: 1rpx;
  background: #67a96f;
  transform: rotate(2deg);
}

.leaf-right {
  right: 3rpx;
  top: 17rpx;
  background: #286849;
  transform: rotate(42deg) scaleX(-1);
}

.stem {
  position: absolute;
  left: 29rpx;
  bottom: 1rpx;
  width: 4rpx;
  height: 24rpx;
  background: #295f45;
  border-radius: 4rpx;
}

.content {
  padding: 48rpx 40rpx;
}

.profile {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 32rpx 0 44rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  flex: 0 0 104rpx;
  color: #ffffff;
  background: #d5a95b;
  border-radius: 50%;
  font-size: 36rpx;
  font-weight: 600;
}

.profile-copy {
  min-width: 0;
}

.profile-name,
.profile-note {
  display: block;
}

.profile-name {
  color: #20382c;
  font-size: 34rpx;
  font-weight: 650;
}

.profile-note {
  margin-top: 12rpx;
  color: #7d8982;
  font-size: 24rpx;
  line-height: 1.5;
}

.section {
  padding: 0 28rpx;
  background: #ffffff;
  border: 1rpx solid #e2e7e3;
  border-radius: 8rpx;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 98rpx;
}

.setting-name {
  color: #263c31;
  font-size: 27rpx;
}

.setting-value {
  color: #89938d;
  font-size: 24rpx;
}

.divider {
  height: 1rpx;
  background: #e8ebe9;
}

.bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  display: flex;
  height: calc(112rpx + env(safe-area-inset-bottom));
  padding: 13rpx 18% env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid #e1e6e2;
  justify-content: space-between;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 86rpx;
  box-sizing: border-box;
  gap: 5rpx;
  flex-direction: column;
  color: #8b948e;
  font-size: 21rpx;
}

.nav-item-active {
  color: #2f6b4f;
  font-weight: 600;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  flex: 0 0 44rpx;
}

.nav-label {
  display: block;
  height: 28rpx;
  line-height: 28rpx;
  text-align: center;
}

.nav-books {
  display: flex;
  align-items: flex-end;
  width: 32rpx;
  height: 36rpx;
  gap: 4rpx;
}

.nav-book {
  width: 8rpx;
  height: 29rpx;
  background: currentColor;
  border-radius: 2rpx;
}

.nav-book-raised {
  height: 35rpx;
}

.nav-profile {
  position: relative;
  width: 34rpx;
  height: 36rpx;
}

.profile-head {
  position: absolute;
  top: 1rpx;
  left: 11rpx;
  width: 13rpx;
  height: 13rpx;
  border: 3rpx solid currentColor;
  border-radius: 50%;
}

.profile-body {
  position: absolute;
  bottom: 0;
  left: 4rpx;
  width: 26rpx;
  height: 14rpx;
  border: 3rpx solid currentColor;
  border-bottom: 0;
  border-radius: 18rpx 18rpx 0 0;
}

@media screen and (min-width: 768px) {
  .page {
    width: 750rpx;
    min-height: 100vh;
    margin: 0 auto;
    box-shadow: 0 0 48rpx rgba(24, 32, 28, 0.08);
  }

  .bottom-nav {
    right: 50%;
    left: auto;
    width: 750rpx;
    transform: translateX(50%);
  }
}
</style>
