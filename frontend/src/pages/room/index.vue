<template>
  <view class="page">
    <view class="topbar">
      <navigator class="back-button" open-type="navigateBack" :delta="1" aria-label="返回">
        <view class="back-arrow" aria-hidden="true" />
      </navigator>
      <text class="topbar-title">共读空间</text>
      <view class="topbar-space" />
    </view>

    <view v-if="isLoading" class="state-view">正在读取共读信息</view>

    <view v-else-if="room" class="content">
      <view class="book-heading">
        <view class="book-mark" aria-hidden="true">
          <view class="mark-leaf mark-leaf-left" />
          <view class="mark-leaf mark-leaf-right" />
          <view class="mark-stem" />
        </view>
        <view class="book-copy">
          <text class="book-title">{{ room.book.title }}</text>
          <text class="book-state" :class="{ 'book-state-closed': room.status === 'closed' }">
            {{ room.status === 'active' ? '共读进行中' : '共读已关闭' }}
          </text>
        </view>
      </view>

      <view class="invite-section">
        <text class="section-label">邀请码</text>
        <view class="invite-row">
          <text class="invite-code">{{ room.invite_code }}</text>
          <button
            class="copy-button"
            :disabled="room.status === 'closed'"
            @click="copyInviteCode"
          >复制</button>
        </view>
        <text v-if="room.status === 'closed'" class="closed-note">邀请码已经失效，已有成员仍可查看共读记录。</text>
      </view>

      <view class="members-section">
        <view class="section-heading">
          <text class="section-title">共读成员</text>
          <text class="member-count">{{ room.member_count }} 人</text>
        </view>

        <view class="member-list">
          <view v-for="member in room.members" :key="member.id" class="member-row">
            <view class="member-avatar">{{ member.username.slice(0, 1).toUpperCase() }}</view>
            <view class="member-copy">
              <view class="member-name-row">
                <text class="member-name">{{ member.username }}</text>
                <text v-if="member.id === room.owner_id" class="owner-label">创建者</text>
              </view>
              <text class="joined-time">{{ formatJoinedAt(member.joined_at) }} 加入</text>
            </view>
          </view>
        </view>
      </view>

      <button
        v-if="room.is_owner && room.status === 'active'"
        class="close-room-button"
        :loading="isClosing"
        :disabled="isClosing"
        @click="confirmCloseRoom"
      >关闭共读</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ApiError } from '@/services/auth'
import { findBookByRoom, updateBookSharing } from '@/services/book-storage'
import { closeReadingRoom, getReadingRoom } from '@/services/reading-rooms'

const roomId = ref(0)
const bookId = ref('')
const room = ref(null)
const isLoading = ref(true)
const isClosing = ref(false)

function formatJoinedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function syncLocalBook(nextRoom) {
  const localBook = bookId.value
    ? { id: bookId.value }
    : findBookByRoom(nextRoom.id)
  if (localBook) updateBookSharing(localBook.id, nextRoom)
}

async function loadRoom() {
  if (!roomId.value) return
  try {
    room.value = await getReadingRoom(roomId.value)
    syncLocalBook(room.value)
  } catch (error) {
    uni.showToast({
      title: error instanceof ApiError ? error.message : '读取共读信息失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
  }
}

function copyInviteCode() {
  uni.setClipboardData({
    data: room.value.invite_code,
    success: () => uni.showToast({ title: '邀请码已复制', icon: 'none' })
  })
}

function confirmCloseRoom() {
  uni.showModal({
    title: '关闭共读',
    content: '关闭后邀请码失效，服务器上的 TXT 将被删除，所有评论和笔记变为只读。手机中的图书不会删除。',
    confirmText: '确认关闭',
    confirmColor: '#A4473D',
    success: ({ confirm }) => {
      if (confirm) handleCloseRoom()
    }
  })
}

async function handleCloseRoom() {
  if (isClosing.value) return
  isClosing.value = true
  try {
    room.value = await closeReadingRoom(roomId.value)
    syncLocalBook(room.value)
    uni.showToast({ title: '共读已关闭', icon: 'none' })
  } catch (error) {
    uni.showToast({
      title: error instanceof ApiError ? error.message : '关闭共读失败',
      icon: 'none'
    })
  } finally {
    isClosing.value = false
  }
}

onLoad((options) => {
  roomId.value = Number(options.id || 0)
  bookId.value = options.bookId || ''
})

onShow(loadRoom)
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: calc(56rpx + env(safe-area-inset-bottom));
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
  font-size: 29rpx;
  font-weight: 650;
}

.state-view {
  padding-top: 220rpx;
  color: #7b8780;
  font-size: 25rpx;
  text-align: center;
}

.content {
  max-width: 750rpx;
  margin: 0 auto;
  padding: 44rpx 40rpx;
}

.book-heading {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-bottom: 38rpx;
}

.book-mark {
  position: relative;
  width: 78rpx;
  height: 78rpx;
  flex: 0 0 78rpx;
  background: #ffffff;
  border: 1rpx solid #dfe5e0;
  border-radius: 8rpx;
}

.mark-leaf {
  position: absolute;
  top: 18rpx;
  width: 25rpx;
  height: 34rpx;
  background: #60966f;
  border-radius: 22rpx 3rpx 22rpx 3rpx;
}

.mark-leaf-left {
  left: 14rpx;
  transform: rotate(-35deg);
}

.mark-leaf-right {
  right: 14rpx;
  background: #377553;
  transform: rotate(35deg) scaleX(-1);
}

.mark-stem {
  position: absolute;
  left: 37rpx;
  bottom: 12rpx;
  width: 4rpx;
  height: 27rpx;
  background: #3f704f;
}

.book-copy {
  min-width: 0;
}

.book-title,
.book-state {
  display: block;
}

.book-title {
  overflow: hidden;
  color: #20382c;
  font-size: 34rpx;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-state {
  margin-top: 10rpx;
  color: #3f805e;
  font-size: 23rpx;
}

.book-state-closed {
  color: #8a7772;
}

.invite-section {
  padding: 32rpx 0 38rpx;
  border-top: 1rpx solid #dfe4e0;
  border-bottom: 1rpx solid #dfe4e0;
}

.section-label,
.section-title {
  color: #67766e;
  font-size: 23rpx;
}

.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15rpx;
}

.invite-code {
  color: #1d4e37;
  font-family: ui-monospace, "SFMono-Regular", monospace;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.copy-button {
  width: 116rpx;
  height: 62rpx;
  margin: 0;
  padding: 0;
  color: #ffffff;
  background: #2f6b4f;
  border-radius: 7rpx;
  font-size: 24rpx;
  line-height: 62rpx;
}

.copy-button::after,
.close-room-button::after {
  border: 0;
}

.copy-button[disabled] {
  color: #9aa39e;
  background: #e3e7e4;
}

.closed-note {
  display: block;
  margin-top: 18rpx;
  color: #8a7772;
  font-size: 22rpx;
  line-height: 1.55;
}

.members-section {
  padding-top: 42rpx;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.section-title {
  color: #253c30;
  font-size: 28rpx;
  font-weight: 650;
}

.member-count {
  color: #7d8982;
  font-size: 23rpx;
}

.member-row {
  display: flex;
  align-items: center;
  min-height: 104rpx;
  gap: 20rpx;
  border-bottom: 1rpx solid #e2e6e3;
}

.member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  color: #ffffff;
  background: #668a72;
  border-radius: 50%;
  font-size: 25rpx;
  font-weight: 600;
}

.member-copy {
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.member-name {
  color: #263b30;
  font-size: 27rpx;
  font-weight: 600;
}

.owner-label {
  padding: 4rpx 8rpx;
  color: #826525;
  background: #f1e8ce;
  border-radius: 4rpx;
  font-size: 18rpx;
}

.joined-time {
  display: block;
  margin-top: 7rpx;
  color: #929c96;
  font-size: 20rpx;
}

.close-room-button {
  height: 82rpx;
  margin: 50rpx 0 0;
  color: #994c43;
  background: transparent;
  border: 1rpx solid #d9c1be;
  border-radius: 8rpx;
  font-size: 26rpx;
  line-height: 82rpx;
}

@media screen and (min-width: 768px) {
  .page {
    width: 750rpx;
    margin: 0 auto;
    box-shadow: 0 0 48rpx rgba(24, 32, 28, 0.08);
  }
}
</style>
