<template>
  <view class="page">
    <view class="topbar">
      <view class="brand">
        <view class="brand-mark" aria-hidden="true">
          <view class="leaf leaf-left" />
          <view class="leaf leaf-top" />
          <view class="leaf leaf-right" />
          <view class="stem" />
        </view>
        <view class="brand-copy">
          <text class="brand-name">SomeLeaf</text>
          <text class="brand-cn">三叶</text>
        </view>
      </view>

      <view class="avatar" aria-hidden="true">叶</view>
    </view>

    <view class="content">
      <view class="section-heading">
        <view>
          <text class="title">我的书架</text>
          <text class="book-count">0 本书</text>
        </view>
        <view class="view-mode" aria-hidden="true">
          <view class="grid-dot" />
          <view class="grid-dot" />
          <view class="grid-dot" />
          <view class="grid-dot" />
        </view>
      </view>

      <view class="shelf-line">
        <view class="shelf-label">
          <view class="label-line" />
          <text>全部图书</text>
        </view>
        <text class="sort-label">最近阅读</text>
      </view>

      <view class="empty-state">
        <view class="empty-art" aria-hidden="true">
          <view class="sun" />
          <view class="book">
            <view class="book-page book-page-left">
              <view class="page-rule page-rule-short" />
              <view class="page-rule" />
              <view class="page-rule" />
            </view>
            <view class="book-page book-page-right">
              <view class="mini-leaf mini-leaf-left" />
              <view class="mini-leaf mini-leaf-right" />
              <view class="mini-stem" />
            </view>
            <view class="book-fold" />
          </view>
          <view class="ground-shadow" />
        </view>

        <text class="empty-title">书架还是空的</text>
        <text class="empty-copy">从一本喜欢的小说开始吧</text>

        <view class="import-button">
          <text class="plus">+</text>
          <text>导入 TXT</text>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item nav-item-active">
        <view class="nav-icon" aria-hidden="true">
          <view class="nav-books">
            <view class="nav-book" />
            <view class="nav-book nav-book-raised" />
            <view class="nav-book" />
          </view>
        </view>
        <text class="nav-label">书架</text>
      </view>

      <navigator class="nav-item" url="/pages/profile/index" open-type="redirect">
        <view class="nav-icon" aria-hidden="true">
          <view class="nav-profile">
            <view class="profile-head" />
            <view class="profile-body" />
          </view>
        </view>
        <text class="nav-label">我的</text>
      </navigator>
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
  height: 112rpx;
  padding: calc(24rpx + env(safe-area-inset-top)) 40rpx 16rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e9e5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 20rpx;
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

.brand-copy {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.brand-name {
  color: #193c2d;
  font-size: 38rpx;
  font-weight: 700;
}

.brand-cn {
  color: #7c8a82;
  font-size: 24rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  color: #ffffff;
  background: #d5a95b;
  border-radius: 50%;
  font-size: 25rpx;
  font-weight: 600;
}

.content {
  padding: 52rpx 40rpx 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  display: block;
  font-size: 50rpx;
  font-weight: 700;
  line-height: 1.2;
}

.book-count {
  display: block;
  margin-top: 12rpx;
  color: #7a847e;
  font-size: 25rpx;
}

.view-mode {
  display: grid;
  grid-template-columns: repeat(2, 10rpx);
  gap: 7rpx;
  width: 64rpx;
  height: 64rpx;
  place-content: center;
  background: #e7ece8;
  border-radius: 8rpx;
}

.grid-dot {
  width: 10rpx;
  height: 10rpx;
  background: #476957;
  border-radius: 2rpx;
}

.shelf-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 56rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #dde3de;
}

.shelf-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: #233e31;
  font-size: 27rpx;
  font-weight: 600;
}

.label-line {
  width: 6rpx;
  height: 28rpx;
  background: #4a8a62;
  border-radius: 4rpx;
}

.sort-label {
  color: #87918b;
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding-top: 92rpx;
}

.empty-art {
  position: relative;
  width: 330rpx;
  height: 252rpx;
}

.sun {
  position: absolute;
  top: 6rpx;
  right: 38rpx;
  width: 66rpx;
  height: 66rpx;
  background: #e2bd72;
  border-radius: 50%;
}

.book {
  position: absolute;
  left: 31rpx;
  bottom: 29rpx;
  display: flex;
  width: 268rpx;
  height: 160rpx;
  filter: drop-shadow(0 18rpx 18rpx rgba(35, 62, 49, 0.1));
}

.book-page {
  position: relative;
  width: 50%;
  height: 100%;
  padding: 45rpx 26rpx;
  background: #ffffff;
  border: 3rpx solid #315d47;
}

.book-page-left {
  border-radius: 12rpx 2rpx 4rpx 24rpx;
  border-right-width: 1rpx;
  transform: skewY(5deg);
}

.book-page-right {
  border-radius: 2rpx 12rpx 24rpx 4rpx;
  border-left-width: 1rpx;
  transform: skewY(-5deg);
}

.book-fold {
  position: absolute;
  left: 132rpx;
  top: 6rpx;
  width: 4rpx;
  height: 148rpx;
  background: #315d47;
  opacity: 0.45;
}

.page-rule {
  width: 72rpx;
  height: 4rpx;
  margin-bottom: 14rpx;
  background: #cbd7cf;
  border-radius: 4rpx;
}

.page-rule-short {
  width: 48rpx;
}

.mini-leaf {
  position: absolute;
  top: 51rpx;
  width: 31rpx;
  height: 45rpx;
  background: #5a9a67;
  border-radius: 28rpx 4rpx 28rpx 4rpx;
}

.mini-leaf-left {
  left: 39rpx;
  transform: rotate(-32deg);
}

.mini-leaf-right {
  right: 37rpx;
  transform: rotate(32deg) scaleX(-1);
}

.mini-stem {
  position: absolute;
  left: 65rpx;
  top: 81rpx;
  width: 4rpx;
  height: 34rpx;
  background: #3f7552;
  border-radius: 4rpx;
}

.ground-shadow {
  position: absolute;
  left: 41rpx;
  bottom: 6rpx;
  width: 248rpx;
  height: 25rpx;
  background: rgba(34, 65, 49, 0.1);
  border-radius: 50%;
  filter: blur(7rpx);
}

.empty-title {
  margin-top: 20rpx;
  color: #20382c;
  font-size: 34rpx;
  font-weight: 650;
}

.empty-copy {
  margin-top: 15rpx;
  color: #818c85;
  font-size: 25rpx;
}

.import-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260rpx;
  height: 88rpx;
  margin-top: 48rpx;
  gap: 13rpx;
  color: #ffffff;
  background: #2f6b4f;
  border-radius: 8rpx;
  box-shadow: 0 12rpx 24rpx rgba(47, 107, 79, 0.2);
  font-size: 27rpx;
  font-weight: 600;
}

.plus {
  margin-top: -3rpx;
  font-size: 40rpx;
  font-weight: 300;
  line-height: 1;
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
