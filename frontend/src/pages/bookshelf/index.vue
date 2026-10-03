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

    </view>

    <view class="content">
      <view class="section-heading">
        <view>
          <text class="title">我的书架</text>
          <text class="book-count">{{ books.length }} 本书</text>
        </view>
        <button
          class="add-button"
          :disabled="isImporting"
          aria-label="添加图书"
          @click="handleAdd"
        >+</button>
      </view>

      <view class="category-tabs" role="tablist">
        <view
          v-for="category in categories"
          :key="category.key"
          class="category-tab"
          :class="{ 'category-tab-active': activeCategory === category.key }"
          role="tab"
          :aria-selected="activeCategory === category.key"
          @tap="activeCategory = category.key"
        >
          <text>{{ category.label }}</text>
          <text class="category-count">{{ category.count }}</text>
        </view>
      </view>

      <view class="shelf-line">
        <view class="shelf-label">
          <view class="label-line" />
          <text>{{ activeCategoryLabel }}</text>
        </view>
        <text class="sort-label">最近阅读</text>
      </view>

      <view v-if="filteredBooks.length" class="book-list">
        <view
          v-for="book in filteredBooks"
          :key="book.id"
          class="book-card"
          @click="handleBookTap(book.id)"
          @longpress="showBookActions(book)"
        >
          <view class="card-heading">
            <view class="card-leaf" aria-hidden="true">
              <view class="card-leaf-left" />
              <view class="card-leaf-right" />
              <view class="card-stem" />
            </view>
            <view class="card-labels">
              <text v-if="book.sharing" class="sharing-label">
                {{ book.sharing.status === 'closed' ? '已关闭' : `${book.sharing.memberCount || 1} 人共读` }}
              </text>
              <text class="file-type">{{ (book.format || 'txt').toUpperCase() }}</text>
            </view>
          </view>

          <text class="book-title">{{ book.title }}</text>
          <text class="file-name">{{ book.fileName }}</text>

          <view class="card-footer">
            <text class="book-meta">{{ formatFileSize(book.fileSize) }}</text>
            <view class="row-arrow" aria-hidden="true" />
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
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

        <text class="empty-title">{{ emptyTitle }}</text>
        <text class="empty-copy">{{ emptyCopy }}</text>

        <button
          class="import-button"
          :disabled="isImporting"
          @click="activeCategory === 'shared' ? chooseSharedJoin() : handleImport()"
        >
          <text class="plus">+</text>
          <text>{{ activeCategory === 'shared' ? '加入共读' : '导入图书' }}</text>
        </button>
      </view>
    </view>

    <view v-if="isAddMenuVisible" class="add-menu-layer" @tap="closeAddMenu">
      <view class="add-menu" @tap.stop="stopAddMenuTap">
        <view class="add-menu-handle" />
        <view class="add-menu-heading">
          <view>
            <text class="add-menu-title">添加到书架</text>
            <text class="add-menu-subtitle">选择一种方式开始阅读</text>
          </view>
          <button class="add-menu-close" aria-label="关闭" @tap="closeAddMenu">×</button>
        </view>

        <view class="add-menu-options">
          <view class="add-menu-option" @tap="chooseLocalImport">
            <view class="add-option-icon add-option-file" aria-hidden="true">
              <view class="file-icon-fold" />
              <view class="file-icon-line file-icon-line-one" />
              <view class="file-icon-line file-icon-line-two" />
            </view>
            <view class="add-option-copy">
              <text class="add-option-title">导入本地图书</text>
              <text class="add-option-desc">TXT / EPUB，保存在本机</text>
            </view>
            <view class="add-option-arrow" aria-hidden="true" />
          </view>

          <view class="add-menu-option" @tap="chooseSharedJoin">
            <view class="add-option-icon add-option-link" aria-hidden="true">
              <view class="link-ring link-ring-left" />
              <view class="link-ring link-ring-right" />
            </view>
            <view class="add-option-copy">
              <text class="add-option-title">加入好友共读</text>
              <text class="add-option-desc">输入 6 位邀请码加入房间</text>
            </view>
            <view class="add-option-arrow" aria-hidden="true" />
          </view>
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
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { pickBookFile } from '@/services/file-picker'
import { ApiError, getAccessToken } from '@/services/auth'
import {
  deleteBook,
  listBooks,
  readBookContent,
  saveImportedBook,
  saveJoinedBook,
  updateBookSharing
} from '@/services/book-storage'
import {
  createReadingRoom,
  joinReadingRoom
} from '@/services/reading-rooms'
import { syncLocalReadingToRoom } from '@/services/reading-sync'

const books = ref([])
const activeCategory = ref('all')
const isImporting = ref(false)
const isAddMenuVisible = ref(false)
const deletingBookId = ref('')
let suppressNextTap = false

function refreshBookshelf() {
  books.value = listBooks()
}

const categoryDefinitions = [
  { key: 'all', label: '全部图书' },
  { key: 'local', label: '本地图书' },
  { key: 'shared', label: '共读图书' }
]

const filteredBooks = computed(() => {
  if (activeCategory.value === 'local') {
    return books.value.filter((book) => !book.sharing)
  }
  if (activeCategory.value === 'shared') {
    return books.value.filter((book) => Boolean(book.sharing))
  }
  return books.value
})

const categories = computed(() => categoryDefinitions.map((category) => ({
  ...category,
  count: category.key === 'all'
    ? books.value.length
    : books.value.filter((book) => category.key === 'shared' ? Boolean(book.sharing) : !book.sharing).length
})))

const activeCategoryLabel = computed(() =>
  categoryDefinitions.find((category) => category.key === activeCategory.value)?.label || '全部图书'
)

const emptyTitle = computed(() => {
  if (activeCategory.value === 'local') return '还没有本地图书'
  if (activeCategory.value === 'shared') return '还没有共读图书'
  return '书架还是空的'
})

const emptyCopy = computed(() => {
  if (activeCategory.value === 'local') return '从本地导入一本喜欢的小说吧'
  if (activeCategory.value === 'shared') return '加入好友共读后，图书会出现在这里'
  return '从一本喜欢的小说开始吧'
})

function formatFileSize(bytes) {
  if (!bytes) return '未知大小'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function openBook(id) {
  uni.navigateTo({ url: `/pages/reader/index?id=${id}` })
}

function handleBookTap(id) {
  if (suppressNextTap) return
  openBook(id)
}

function showBookActions(book) {
  if (deletingBookId.value) return

  suppressNextTap = true

  const actions = book.sharing
    ? ['查看共读信息', '删除本地图书']
    : ['开启好友共读', '删除图书']

  uni.showActionSheet({
    itemList: actions,
    success: ({ tapIndex }) => {
      if (tapIndex === 0 && book.sharing) {
        openRoom(book)
      } else if (tapIndex === 0) {
        startSharing(book)
      } else if (tapIndex === 1) {
        confirmDelete(book)
      }
    },
    complete: () => {
      setTimeout(() => {
        suppressNextTap = false
      }, 300)
    }
  })
}

function requireLogin() {
  if (getAccessToken()) return true

  uni.showModal({
    title: '需要登录',
    content: '好友共读需要一个账户来标记成员身份。',
    confirmText: '去登录',
    success: ({ confirm }) => {
      if (confirm) {
        uni.redirectTo({ url: '/pages/profile/index' })
      }
    }
  })
  return false
}

function openRoom(book) {
  if (!requireLogin()) return
  uni.navigateTo({
    url: `/pages/room/index?id=${book.sharing.roomId}&bookId=${book.id}`
  })
}

function startSharing(book) {
  if (!requireLogin() || isImporting.value) return

  uni.showModal({
    title: '开启好友共读',
    content: '开启后，图书正文以及这本书已有的本地评论和笔记都会上传云端，并对共读成员可见。是否继续？',
    confirmText: '开启共读',
    confirmColor: '#2F6B4F',
    success: ({ confirm }) => {
      if (confirm) performStartSharing(book)
    }
  })
}

async function performStartSharing(book) {
  if (isImporting.value) return

  isImporting.value = true
  uni.showLoading({ title: '正在开启共读', mask: true })
  try {
    const content = await readBookContent(book)
    const room = await createReadingRoom(book, content)
    updateBookSharing(book.id, room)
    const migration = await syncLocalReadingToRoom(book.id, room.id)
    refreshBookshelf()
    uni.hideLoading()
    const migrationText = migration.uploaded
      ? `\n已将 ${migration.uploaded} 条本地评论或笔记上传云端。`
      : ''
    const retryText = migration.failed
      ? `\n另有 ${migration.failed} 条暂未上传，已保留在本机，稍后打开图书时会自动重试。`
      : ''
    uni.showModal({
      title: '共读已开启',
      content: `邀请码：${room.invite_code}${migrationText}${retryText}`,
      confirmText: '查看房间',
      success: ({ confirm }) => {
        if (confirm) openRoom({ ...book, sharing: { roomId: room.id } })
      }
    })
  } catch (error) {
    uni.showToast({
      title: error instanceof ApiError ? error.message : (error.message || '开启共读失败'),
      icon: 'none',
      duration: 2800
    })
  } finally {
    uni.hideLoading()
    isImporting.value = false
  }
}

function handleAdd() {
  if (isImporting.value) return
  isAddMenuVisible.value = true
}

function closeAddMenu() {
  isAddMenuVisible.value = false
}

function stopAddMenuTap() {}

function chooseLocalImport() {
  closeAddMenu()
  handleImport()
}

function chooseSharedJoin() {
  closeAddMenu()
  promptInviteCode()
}

function promptInviteCode() {
  if (!requireLogin()) return

  uni.showModal({
    title: '加入好友共读',
    editable: true,
    placeholderText: '请输入 6 位邀请码',
    cancelText: '取消',
    confirmText: '加入',
    success: ({ confirm, content }) => {
      if (!confirm) return
      const inviteCode = String(content || '').trim()
      if (!/^\d{6}$/.test(inviteCode)) {
        uni.showToast({ title: '请输入 6 位数字邀请码', icon: 'none' })
        return
      }
      joinByInviteCode(inviteCode)
    }
  })
}

async function joinByInviteCode(inviteCode) {
  if (isImporting.value) return

  isImporting.value = true
  uni.showLoading({ title: '正在加入', mask: true })
  try {
    const result = await joinReadingRoom(inviteCode)
    const book = await saveJoinedBook(result)
    refreshBookshelf()
    uni.hideLoading()
    uni.showModal({
      title: '已加入共读',
      content: `《${book.title}》已保存到本地书架。`,
      confirmText: '开始阅读',
      success: ({ confirm }) => {
        if (confirm) openBook(book.id)
      }
    })
  } catch (error) {
    uni.showToast({
      title: error instanceof ApiError ? error.message : (error.message || '加入共读失败'),
      icon: 'none',
      duration: 2800
    })
  } finally {
    uni.hideLoading()
    isImporting.value = false
  }
}

function confirmDelete(book) {
  uni.showModal({
    title: '删除图书',
    content: `确定从书架删除《${book.title}》吗？删除后无法恢复。`,
    confirmText: '删除',
    confirmColor: '#A4473D',
    success: async ({ confirm }) => {
      if (!confirm) return

      deletingBookId.value = book.id

      try {
        await deleteBook(book)
        refreshBookshelf()
        uni.showToast({ title: '已删除', icon: 'none' })
      } catch (error) {
        uni.showToast({
          title: error.message || '删除失败，请重试',
          icon: 'none'
        })
      } finally {
        deletingBookId.value = ''
      }
    }
  })
}

async function handleImport() {
  if (isImporting.value) return

  isImporting.value = true

  try {
    uni.showLoading({ title: '正在读取文件', mask: true })
    const file = await pickBookFile()
    uni.showLoading({ title: '正在导入', mask: true })
    const book = await saveImportedBook(file)
    refreshBookshelf()
    uni.showToast({ title: `已导入《${book.title}》`, icon: 'none' })
  } catch (error) {
    if (error && error.message !== '未选择文件') {
      uni.showToast({
        title: error.message || '导入失败，请重试',
        icon: 'none',
        duration: 2600
      })
    }
  } finally {
    uni.hideLoading()
    isImporting.value = false
  }
}

onShow(refreshBookshelf)
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

.add-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0 0 5rpx;
  color: #ffffff;
  background: #2f6b4f;
  border: 0;
  border-radius: 8rpx;
  font-size: 42rpx;
  font-weight: 300;
  line-height: 1;
}

.add-button::after,
.import-button::after {
  border: 0;
}

.add-button[disabled],
.import-button[disabled] {
  opacity: 0.6;
}

.shelf-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
}

.category-tabs {
  display: flex;
  margin-top: 42rpx;
  border-bottom: 1rpx solid #dde3de;
}

.category-tab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  flex: 1;
  padding: 0 6rpx 20rpx;
  color: #8a958e;
  font-size: 25rpx;
  line-height: 1.2;
  white-space: nowrap;
}

.category-count {
  margin-left: 6rpx;
  color: #a3aca6;
  font-size: 20rpx;
}

.category-tab-active {
  color: #2f6b4f;
  font-weight: 650;
}

.category-tab-active::after {
  position: absolute;
  right: 25%;
  bottom: -1rpx;
  left: 25%;
  height: 5rpx;
  background: #3f805e;
  border-radius: 5rpx 5rpx 0 0;
  content: '';
}

.shelf-label {
  display: none;
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

.book-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
  padding-top: 30rpx;
}

.book-card {
  display: flex;
  min-width: 0;
  height: 264rpx;
  padding: 24rpx;
  flex-direction: column;
  background: #ffffff;
  border: 1rpx solid #dfe5e0;
  border-radius: 16rpx;
  box-shadow: 0 10rpx 24rpx rgba(37, 62, 49, 0.07);
}

.book-card:active {
  background: #f9fbf9;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 42rpx;
}

.card-leaf {
  position: relative;
  width: 38rpx;
  height: 38rpx;
}

.card-leaf-left,
.card-leaf-right {
  position: absolute;
  top: 4rpx;
  width: 15rpx;
  height: 23rpx;
  background: #5d936d;
  border-radius: 14rpx 2rpx 14rpx 2rpx;
}

.card-leaf-left {
  left: 4rpx;
  transform: rotate(-34deg);
}

.card-leaf-right {
  right: 4rpx;
  background: #357653;
  transform: rotate(34deg) scaleX(-1);
}

.card-stem {
  position: absolute;
  left: 18rpx;
  bottom: 3rpx;
  width: 3rpx;
  height: 17rpx;
  background: #3c704f;
  border-radius: 3rpx;
}

.file-type {
  color: #79877f;
  font-size: 19rpx;
  font-weight: 600;
}

.card-labels {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10rpx;
}

.sharing-label {
  overflow: hidden;
  max-width: 120rpx;
  padding: 5rpx 9rpx;
  color: #2f6b4f;
  background: #e8f1eb;
  border-radius: 5rpx;
  font-size: 18rpx;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-title {
  display: -webkit-box;
  overflow: hidden;
  height: 82rpx;
  margin-top: 18rpx;
  color: #20382c;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.file-name {
  display: block;
  overflow: hidden;
  margin-top: 8rpx;
  color: #8a958e;
  font-size: 20rpx;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 16rpx;
  border-top: 1rpx solid #edf0ed;
}

.book-meta {
  display: block;
  color: #89938d;
  font-size: 20rpx;
}

.row-arrow {
  width: 11rpx;
  height: 11rpx;
  margin-right: 4rpx;
  border-top: 2rpx solid #829289;
  border-right: 2rpx solid #829289;
  transform: rotate(45deg);
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
  padding: 0;
  border: 0;
  gap: 13rpx;
  color: #ffffff;
  background: #2f6b4f;
  border-radius: 8rpx;
  box-shadow: 0 12rpx 24rpx rgba(47, 107, 79, 0.2);
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1;
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

.add-menu-layer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  background: rgba(25, 39, 31, 0.3);
}

.add-menu {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 14rpx 36rpx calc(28rpx + env(safe-area-inset-bottom));
  background: #fbfcfa;
  border-radius: 28rpx 28rpx 0 0;
  box-shadow: 0 -16rpx 42rpx rgba(34, 59, 45, 0.18);
}

.add-menu-handle {
  width: 72rpx;
  height: 7rpx;
  margin: 0 auto 30rpx;
  background: #d4ddd6;
  border-radius: 8rpx;
}

.add-menu-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 24rpx;
}

.add-menu-title,
.add-menu-subtitle {
  display: block;
}

.add-menu-title {
  color: #20382b;
  font-size: 34rpx;
  font-weight: 650;
  line-height: 1.35;
}

.add-menu-subtitle {
  margin-top: 7rpx;
  color: #8a958e;
  font-size: 21rpx;
}

.add-menu-close {
  width: 58rpx;
  height: 58rpx;
  margin: 0;
  padding: 0;
  color: #748279;
  background: #eef3ef;
  border: 0;
  border-radius: 50%;
  font-size: 38rpx;
  font-weight: 300;
  line-height: 52rpx;
}

.add-menu-close::after {
  border: 0;
}

.add-menu-options {
  display: flex;
  gap: 18rpx;
  flex-direction: column;
}

.add-menu-option {
  display: flex;
  align-items: center;
  min-height: 126rpx;
  padding: 20rpx 24rpx;
  background: #ffffff;
  border: 1rpx solid #e0e8e1;
  border-radius: 14rpx;
  box-shadow: 0 7rpx 18rpx rgba(41, 69, 52, 0.05);
}

.add-menu-option:active {
  background: #f1f7f2;
  border-color: #c6d9ca;
}

.add-option-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76rpx;
  height: 76rpx;
  margin-right: 22rpx;
  flex: 0 0 76rpx;
  background: #eaf3ec;
  border-radius: 20rpx;
}

.add-option-copy {
  min-width: 0;
  flex: 1;
}

.add-option-title,
.add-option-desc {
  display: block;
}

.add-option-title {
  color: #294434;
  font-size: 28rpx;
  font-weight: 600;
}

.add-option-desc {
  overflow: hidden;
  margin-top: 8rpx;
  color: #8a978f;
  font-size: 21rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-option-arrow {
  width: 14rpx;
  height: 14rpx;
  margin-left: 16rpx;
  border-top: 2rpx solid #7f9586;
  border-right: 2rpx solid #7f9586;
  transform: rotate(45deg);
}

.add-option-file {
  background: #eef3e7;
}

.add-option-file::before {
  width: 34rpx;
  height: 42rpx;
  content: '';
  background: #5e8d68;
  border-radius: 5rpx;
}

.file-icon-fold {
  position: absolute;
  top: 19rpx;
  right: 21rpx;
  width: 12rpx;
  height: 12rpx;
  background: #dbe9d7;
  clip-path: polygon(0 0, 100% 100%, 0 100%);
}

.file-icon-line {
  position: absolute;
  left: 28rpx;
  width: 20rpx;
  height: 3rpx;
  background: #dbe9d7;
  border-radius: 3rpx;
}

.file-icon-line-one {
  top: 42rpx;
}

.file-icon-line-two {
  top: 50rpx;
  width: 15rpx;
}

.add-option-link {
  background: #e8f1ee;
}

.link-ring {
  position: absolute;
  width: 25rpx;
  height: 15rpx;
  border: 5rpx solid #4d8065;
  border-radius: 15rpx;
  transform: rotate(-42deg);
}

.link-ring-left {
  left: 17rpx;
}

.link-ring-right {
  right: 17rpx;
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
