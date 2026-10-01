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
      <view v-if="currentUser" class="profile">
        <view class="avatar">{{ avatarText }}</view>
        <view class="profile-copy">
          <text class="profile-name">{{ currentUser.username }}</text>
          <text class="profile-note">愿每次翻页都有新的发现</text>
        </view>
      </view>

      <view v-if="currentUser" class="section">
        <view class="setting-row">
          <text class="setting-name">账户</text>
          <text class="setting-value">{{ currentUser.username }}</text>
        </view>
        <view class="divider" />
        <navigator class="setting-link" url="/pages/about/index">
          <view class="setting-row">
            <text class="setting-name">关于三叶</text>
            <view class="setting-tail">
              <text class="setting-value">v0.1.0</text>
              <view class="setting-arrow" aria-hidden="true" />
            </view>
          </view>
        </navigator>
        <view class="divider" />
        <navigator class="setting-link" url="/pages/feedback/index">
          <view class="setting-row">
            <text class="setting-name">意见反馈</text>
            <view class="setting-arrow" aria-hidden="true" />
          </view>
        </navigator>
      </view>

      <button
        v-if="currentUser"
        class="logout-button"
        :disabled="isSubmitting"
        @click="handleLogout"
      >退出登录</button>

      <view v-else class="auth-area">
        <view class="auth-heading">
          <view class="avatar auth-avatar">叶</view>
          <view class="profile-copy">
            <text class="profile-name">{{ isRegisterMode ? '创建账户' : '欢迎回来' }}</text>
            <text class="profile-note">{{ isRegisterMode ? '注册后即可开始好友共读' : '登录你的三叶账户' }}</text>
          </view>
        </view>

        <view class="mode-switch">
          <view
            class="mode-option"
            :class="{ 'mode-option-active': !isRegisterMode }"
            @click="setMode(false)"
          >登录</view>
          <view
            class="mode-option"
            :class="{ 'mode-option-active': isRegisterMode }"
            @click="setMode(true)"
          >注册</view>
        </view>

        <view class="auth-form">
          <label class="field">
            <text class="field-label">用户名</text>
            <input
              v-model="username"
              class="field-input"
              type="text"
              maxlength="24"
              placeholder="3-24 个字符"
              placeholder-class="field-placeholder"
              :disabled="isSubmitting"
              @confirm="handleSubmit"
            />
          </label>

          <label class="field">
            <text class="field-label">密码</text>
            <input
              v-model="password"
              class="field-input"
              type="text"
              :password="true"
              maxlength="128"
              placeholder="至少 8 个字符"
              placeholder-class="field-placeholder"
              :disabled="isSubmitting"
              @confirm="handleSubmit"
            />
          </label>

          <text v-if="formError" class="form-error">{{ formError }}</text>

          <button
            class="submit-button"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >{{ isRegisterMode ? '注册并登录' : '登录' }}</button>
        </view>
      </view>

      <view v-if="!currentUser" class="section feedback-section">
        <navigator class="setting-link" url="/pages/feedback/index">
          <view class="setting-row">
            <text class="setting-name">意见反馈</text>
            <view class="setting-arrow" aria-hidden="true" />
          </view>
        </navigator>
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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  ApiError,
  clearSession,
  getAccessToken,
  getCurrentUser,
  getStoredUser,
  login,
  register
} from '@/services/auth'

const currentUser = ref(getStoredUser())
const isRegisterMode = ref(true)
const isSubmitting = ref(false)
const username = ref('')
const password = ref('')
const formError = ref('')

const avatarText = computed(() => {
  const name = currentUser.value?.username?.trim()
  return name ? name.slice(0, 1).toUpperCase() : '叶'
})

function setMode(registerMode) {
  if (isSubmitting.value) return
  isRegisterMode.value = registerMode
  formError.value = ''
}

function validateForm() {
  const normalizedUsername = username.value.trim()

  if (normalizedUsername.length < 3 || normalizedUsername.length > 24) {
    return '用户名长度必须为 3 到 24 个字符'
  }
  if (password.value.length < 8 || password.value.length > 128) {
    return '密码长度必须为 8 到 128 个字符'
  }
  return ''
}

async function handleSubmit() {
  if (isSubmitting.value) return

  formError.value = validateForm()
  if (formError.value) return

  isSubmitting.value = true
  try {
    const submit = isRegisterMode.value ? register : login
    currentUser.value = await submit(username.value.trim(), password.value)
    password.value = ''
    uni.showToast({
      title: isRegisterMode.value ? '注册成功' : '登录成功',
      icon: 'success'
    })
  } catch (error) {
    formError.value = error instanceof ApiError
      ? error.message
      : '操作失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '本地导入的图书不会受到影响。',
    confirmText: '退出',
    confirmColor: '#A4473D',
    success: ({ confirm }) => {
      if (!confirm) return
      clearSession()
      currentUser.value = null
      username.value = ''
      password.value = ''
      formError.value = ''
    }
  })
}

onShow(async () => {
  if (!getAccessToken()) {
    currentUser.value = null
    return
  }

  try {
    currentUser.value = await getCurrentUser()
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      clearSession()
      currentUser.value = null
    }
  }
})
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

.auth-area {
  padding-top: 16rpx;
}

.auth-heading {
  display: flex;
  align-items: center;
  gap: 28rpx;
  padding: 20rpx 0 40rpx;
}

.auth-avatar {
  background: #3f805e;
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
  width: 100%;
  min-height: 98rpx;
  text-align: left;
  box-sizing: border-box;
}

.setting-link {
  display: block;
  width: 100%;
  text-align: left;
}

.setting-name {
  display: block;
  flex: 1;
  color: #263c31;
  font-size: 27rpx;
  text-align: left;
}

.setting-value {
  color: #89938d;
  font-size: 24rpx;
}

.setting-tail {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.divider {
  height: 1rpx;
  background: #e8ebe9;
}

.feedback-section {
  margin-top: 28rpx;
}

.setting-arrow {
  width: 13rpx;
  height: 13rpx;
  margin-right: 5rpx;
  border-top: 2rpx solid #89938d;
  border-right: 2rpx solid #89938d;
  transform: rotate(45deg);
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  height: 76rpx;
  padding: 6rpx;
  background: #e7ebe8;
  border-radius: 8rpx;
}

.mode-option {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #738078;
  border-radius: 6rpx;
  font-size: 26rpx;
}

.mode-option-active {
  color: #244a37;
  background: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(30, 52, 40, 0.08);
  font-weight: 600;
}

.auth-form {
  margin-top: 34rpx;
}

.field {
  display: block;
  margin-bottom: 26rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #31473b;
  font-size: 25rpx;
  font-weight: 600;
}

.field-input {
  width: 100%;
  height: 92rpx;
  padding: 0 26rpx;
  color: #18201c;
  background: #ffffff;
  border: 1rpx solid #dce3de;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.field-placeholder {
  color: #a0aaa4;
}

.form-error {
  display: block;
  margin: -4rpx 0 22rpx;
  color: #a4473d;
  font-size: 24rpx;
  line-height: 1.5;
}

.submit-button,
.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92rpx;
  margin: 0;
  border-radius: 8rpx;
  font-size: 28rpx;
  line-height: 1;
}

.submit-button::after,
.logout-button::after {
  border: 0;
}

.submit-button {
  color: #ffffff;
  background: #2f6b4f;
  font-weight: 600;
}

.submit-button[disabled] {
  color: rgba(255, 255, 255, 0.8);
  background: #779887;
}

.logout-button {
  margin-top: 28rpx;
  color: #92453e;
  background: transparent;
  border: 1rpx solid #d9c4c1;
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
