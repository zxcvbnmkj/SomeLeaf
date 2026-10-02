<template>
  <view v-if="visible" class="panel-layer" @tap="emit('close')">
    <view class="panel" @tap.stop>
      <view class="panel-handle" />
      <view class="panel-heading">
        <view class="tabs">
          <view
            class="tab"
            :class="{ 'tab-active': activeTab === 'annotations' }"
            @tap="activeTab = 'annotations'"
          >划线评论</view>
          <view
            class="tab"
            :class="{ 'tab-active': activeTab === 'notes' }"
            @tap="activeTab = 'notes'"
          >读书笔记</view>
        </view>
        <button class="close-button" aria-label="关闭" @tap="emit('close')">×</button>
      </view>

      <view v-if="isReadOnly" class="readonly-banner">共读已关闭，以下内容仅可查看</view>
      <view v-else-if="isLocal" class="privacy-banner">
        未开启共读时，评论与笔记仅缓存在本机，不会上传，以保证绝对隐私。开启共读后，已有内容将上传云端并对共读成员可见。
      </view>

      <view
        v-if="activeTab === 'annotations'"
        class="panel-body"
        :class="{ 'panel-body-with-notice': isLocal }"
      >
        <scroll-view class="entry-list entry-list-full" scroll-y>
          <view v-if="isLoading" class="empty-state">正在加载</view>
          <view v-else-if="!annotations.length" class="empty-state">还没有划线评论</view>
          <view
            v-for="item in annotations"
            :key="item.id"
            class="entry"
            @tap="emit('locate', item)"
            @longpress="showAnnotationActions(item)"
          >
            <text class="quote">“{{ compactText(item.quote, 110) }}”</text>
            <text v-if="item.comment" class="entry-content">{{ item.comment }}</text>
            <view class="entry-meta">
              <text>{{ item.username }}</text>
              <text>{{ formatTime(item.created_at) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-else class="panel-body" :class="{ 'panel-body-with-notice': isLocal }">
        <view v-if="!isReadOnly" class="create-row">
          <text class="selection-preview">记录对这本书的想法</text>
          <button class="create-button" :disabled="isBusy" @tap="addNote">写笔记</button>
        </view>

        <scroll-view class="entry-list" :class="{ 'entry-list-full': isReadOnly }" scroll-y>
          <view v-if="isLoading" class="empty-state">正在加载</view>
          <view v-else-if="!notes.length" class="empty-state">还没有读书笔记</view>
          <view
            v-for="item in notes"
            :key="item.id"
            class="entry"
            @longpress="showNoteActions(item)"
          >
            <text class="note-title">读书笔记</text>
            <text class="entry-content">{{ item.content }}</text>
            <text v-if="item.quote" class="note-quote">摘录：{{ compactText(item.quote, 72) }}</text>
            <view class="entry-meta">
              <text>{{ item.username }}</text>
              <text>{{ formatTime(item.created_at) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view v-if="editor.visible" class="editor-layer" @tap="closeEditor">
        <view class="editor-dialog" @tap.stop>
          <text class="editor-title">{{ editorTitle }}</text>
          <text v-if="editor.kind.includes('annotation') && (selectedRange || editor.item)" class="editor-quote">
            “{{ compactText(selectedRange?.quote || editor.item?.quote, 80) }}”
          </text>
          <textarea
            v-model="editor.value"
            class="editor-input"
            :maxlength="editor.kind.includes('note') ? 10000 : 4000"
            :placeholder="editor.kind.includes('note') ? '写下你的想法' : '写下对这段话的评论'"
            placeholder-class="editor-placeholder"
            :focus="true"
          />
          <view class="editor-actions">
            <button class="editor-cancel" :disabled="isBusy" @tap="closeEditor">取消</button>
            <button class="editor-save" :loading="isBusy" :disabled="isBusy" @tap="saveEditor">保存</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ApiError } from '@/services/auth'
import {
  createLocalAnnotation,
  createLocalNote,
  deleteLocalAnnotation,
  deleteLocalNote,
  listLocalAnnotations,
  listLocalNotes,
  updateLocalAnnotation,
  updateLocalNote
} from '@/services/local-reading'
import {
  createAnnotation,
  createNote,
  deleteAnnotation,
  deleteNote,
  listAnnotations,
  listNotes,
  updateAnnotation,
  updateNote
} from '@/services/reading-rooms'

const props = defineProps({
  visible: { type: Boolean, default: false },
  room: { type: Object, default: null },
  localBookId: { type: String, default: '' },
  currentUserId: { type: Number, default: 0 },
  selectedRange: { type: Object, default: null },
  initialTab: { type: String, default: 'annotations' },
  composeRequest: { type: Number, default: 0 }
})

const emit = defineEmits(['close', 'locate', 'annotations-change', 'clear-selection'])
const activeTab = ref('annotations')
const annotations = ref([])
const notes = ref([])
const isLoading = ref(false)
const isBusy = ref(false)
const editor = ref({ visible: false, kind: '', item: null, value: '' })
const isLocal = computed(() => Boolean(props.localBookId))
const isReadOnly = computed(() => !isLocal.value && props.room?.status === 'closed')
const editorTitle = computed(() => {
  const titles = {
    'annotation-create': '添加划线评论',
    'annotation-edit': '编辑划线评论',
    'note-create': '写读书笔记',
    'note-edit': '编辑读书笔记'
  }
  return titles[editor.value.kind] || '编辑'
})

function compactText(value, maxLength) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim()
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}…` : compact
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`
}

function showError(error, fallback) {
  uni.showToast({
    title: error instanceof ApiError ? error.message : fallback,
    icon: 'none',
    duration: 2800
  })
}

async function loadEntries() {
  if (!isLocal.value && !props.room?.id) return
  isLoading.value = true
  try {
    const [nextAnnotations, nextNotes] = isLocal.value
      ? [listLocalAnnotations(props.localBookId), listLocalNotes(props.localBookId)]
      : await Promise.all([
          listAnnotations(props.room.id),
          listNotes(props.room.id)
        ])
    annotations.value = nextAnnotations
    notes.value = nextNotes
    emit('annotations-change', nextAnnotations)
  } catch (error) {
    showError(error, '读取评论和笔记失败')
  } finally {
    isLoading.value = false
  }
}

function openEditor(kind, item = null) {
  editor.value = {
    visible: true,
    kind,
    item,
    value: kind === 'annotation-edit'
      ? (item.comment || '')
      : kind === 'note-edit'
        ? item.content
        : ''
  }
}

function closeEditor() {
  if (isBusy.value) return
  editor.value = { visible: false, kind: '', item: null, value: '' }
}

function addNote() {
  openEditor('note-create')
}

async function saveEditor() {
  if (isBusy.value) return
  const value = editor.value.value.trim()
  if (editor.value.kind.includes('note') && !value) {
    uni.showToast({ title: '请输入笔记内容', icon: 'none' })
    return
  }
  if (editor.value.kind === 'annotation-create' && !value) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }

  isBusy.value = true
  try {
    if (editor.value.kind === 'annotation-create') {
      const payload = {
        start_offset: props.selectedRange.startOffset,
        end_offset: props.selectedRange.endOffset,
        quote: props.selectedRange.quote,
        comment: value || null
      }
      if (isLocal.value) {
        createLocalAnnotation(props.localBookId, payload)
      } else {
        await createAnnotation(props.room.id, {
          start_offset: payload.start_offset,
          end_offset: payload.end_offset,
          comment: payload.comment
        })
      }
      emit('clear-selection')
    } else if (editor.value.kind === 'annotation-edit') {
      if (isLocal.value) {
        updateLocalAnnotation(props.localBookId, editor.value.item.id, value || null)
      } else {
        await updateAnnotation(props.room.id, editor.value.item.id, value || null)
      }
    } else if (editor.value.kind === 'note-create') {
      const payload = {
        title: null,
        content: value,
        anchor_offset: null,
        quote: null
      }
      if (isLocal.value) {
        createLocalNote(props.localBookId, payload)
      } else {
        await createNote(props.room.id, payload)
      }
      emit('clear-selection')
    } else if (editor.value.kind === 'note-edit') {
      if (isLocal.value) {
        updateLocalNote(props.localBookId, editor.value.item.id, { content: value })
      } else {
        await updateNote(props.room.id, editor.value.item.id, { content: value })
      }
    }
    editor.value = { visible: false, kind: '', item: null, value: '' }
    await loadEntries()
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (error) {
    showError(error, '保存失败')
  } finally {
    isBusy.value = false
  }
}

function confirmDelete(title, action) {
  uni.showModal({
    title,
    content: '删除后无法恢复。',
    confirmText: '删除',
    confirmColor: '#A4473D',
    success: ({ confirm }) => {
      if (confirm) action()
    }
  })
}

function showAnnotationActions(item) {
  if (isReadOnly.value || (!isLocal.value && item.user_id !== props.currentUserId)) return
  uni.showActionSheet({
    itemList: ['编辑评论', '删除划线'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) editAnnotation(item)
      if (tapIndex === 1) confirmDelete('删除划线', () => removeAnnotation(item))
    }
  })
}

async function editAnnotation(item) {
  openEditor('annotation-edit', item)
}

async function removeAnnotation(item) {
  try {
    if (isLocal.value) {
      deleteLocalAnnotation(props.localBookId, item.id)
    } else {
      await deleteAnnotation(props.room.id, item.id)
    }
    await loadEntries()
  } catch (error) {
    showError(error, '删除失败')
  }
}

function showNoteActions(item) {
  if (isReadOnly.value || (!isLocal.value && item.user_id !== props.currentUserId)) return
  uni.showActionSheet({
    itemList: ['编辑笔记', '删除笔记'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) editNote(item)
      if (tapIndex === 1) confirmDelete('删除笔记', () => removeNote(item))
    }
  })
}

async function editNote(item) {
  openEditor('note-edit', item)
}

async function removeNote(item) {
  try {
    if (isLocal.value) {
      deleteLocalNote(props.localBookId, item.id)
    } else {
      await deleteNote(props.room.id, item.id)
    }
    await loadEntries()
  } catch (error) {
    showError(error, '删除失败')
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      editor.value = { visible: false, kind: '', item: null, value: '' }
      return
    }
    activeTab.value = props.initialTab === 'notes' ? 'notes' : 'annotations'
    loadEntries()
  }
)

let handledComposeRequest = 0
watch(
  () => [props.visible, props.composeRequest],
  ([visible, request]) => {
    if (!visible || !request || request === handledComposeRequest) return
    handledComposeRequest = request
    activeTab.value = 'annotations'
    openEditor('annotation-create')
  },
  { flush: 'post' }
)
</script>

<style scoped>
.panel-layer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  background: rgba(20, 28, 24, 0.28);
}

.panel {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 72vh;
  max-height: 920rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: #f8f9f6;
  border-radius: 8rpx 8rpx 0 0;
  box-shadow: 0 -16rpx 42rpx rgba(28, 42, 34, 0.14);
}

.panel-handle {
  width: 58rpx;
  height: 6rpx;
  margin: 13rpx auto 5rpx;
  background: #cad1cc;
  border-radius: 6rpx;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 82rpx;
  padding: 0 26rpx 0 34rpx;
  border-bottom: 1rpx solid #e0e5e1;
}

.tabs {
  display: flex;
  height: 100%;
  gap: 36rpx;
}

.tab {
  display: flex;
  align-items: center;
  height: 100%;
  color: #7b8780;
  border-bottom: 4rpx solid transparent;
  font-size: 26rpx;
}

.tab-active {
  color: #2b5f46;
  border-bottom-color: #3f805e;
  font-weight: 650;
}

.close-button {
  width: 58rpx;
  height: 58rpx;
  margin: 0;
  padding: 0;
  color: #77837c;
  background: transparent;
  font-size: 40rpx;
  font-weight: 300;
  line-height: 54rpx;
}

.close-button::after,
.create-button::after {
  border: 0;
}

.readonly-banner {
  padding: 13rpx 30rpx;
  color: #806c67;
  background: #eee7e4;
  font-size: 21rpx;
  text-align: center;
}

.privacy-banner {
  display: flex;
  align-items: center;
  height: 96rpx;
  padding: 0 30rpx;
  color: #52675b;
  background: #edf3ee;
  font-size: 20rpx;
  line-height: 1.55;
}

.panel-body {
  height: calc(100% - 106rpx);
}

.readonly-banner + .panel-body {
  height: calc(100% - 152rpx);
}

.panel-body-with-notice {
  height: calc(100% - 202rpx);
}

.create-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 86rpx;
  padding: 0 32rpx;
  gap: 20rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e9e6;
}

.selection-preview {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  color: #76827b;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.create-button {
  width: 132rpx;
  height: 56rpx;
  margin: 0;
  padding: 0;
  color: #ffffff;
  background: #2f6b4f;
  border-radius: 6rpx;
  font-size: 22rpx;
  line-height: 56rpx;
}

.entry-list {
  height: calc(100% - 86rpx);
}

.entry-list-full {
  height: 100%;
}

.editor-layer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36rpx;
  background: rgba(23, 31, 27, 0.38);
}

.editor-dialog {
  width: 100%;
  box-sizing: border-box;
  padding: 30rpx;
  background: #ffffff;
  border-radius: 8rpx;
  box-shadow: 0 18rpx 50rpx rgba(26, 39, 32, 0.2);
}

.editor-title,
.editor-quote {
  display: block;
}

.editor-title {
  color: #263b30;
  font-size: 29rpx;
  font-weight: 650;
}

.editor-quote {
  overflow: hidden;
  margin-top: 16rpx;
  color: #617168;
  font-family: "Songti SC", serif;
  font-size: 22rpx;
  line-height: 1.55;
}

.editor-input {
  display: block;
  width: 100%;
  max-width: 100%;
  height: 230rpx;
  margin-top: 22rpx;
  padding: 20rpx;
  box-sizing: border-box;
  color: #24352c;
  background: #f4f6f3;
  border: 1rpx solid #dce3de;
  border-radius: 7rpx;
  font-size: 25rpx;
  line-height: 1.6;
}

.editor-placeholder {
  color: #9ba59f;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 22rpx;
  gap: 14rpx;
}

.editor-cancel,
.editor-save {
  width: 126rpx;
  height: 62rpx;
  margin: 0;
  padding: 0;
  border-radius: 6rpx;
  font-size: 23rpx;
  line-height: 62rpx;
}

.editor-cancel {
  color: #637169;
  background: #eef1ee;
}

.editor-save {
  color: #ffffff;
  background: #2f6b4f;
}

.editor-cancel::after,
.editor-save::after {
  border: 0;
}

.entry {
  padding: 27rpx 34rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #e5e9e6;
}

.quote,
.note-title,
.entry-content,
.note-quote {
  display: block;
}

.quote {
  color: #4d6759;
  font-family: "Songti SC", "STSong", serif;
  font-size: 25rpx;
  line-height: 1.55;
}

.note-title {
  color: #263d31;
  font-size: 25rpx;
  font-weight: 650;
}

.entry-content {
  margin-top: 13rpx;
  color: #28362f;
  font-size: 25rpx;
  line-height: 1.65;
  white-space: pre-wrap;
}

.note-quote {
  margin-top: 13rpx;
  padding-left: 16rpx;
  color: #78857e;
  border-left: 4rpx solid #a9baaf;
  font-size: 21rpx;
  line-height: 1.55;
}

.entry-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 17rpx;
  color: #929c96;
  font-size: 20rpx;
}

.empty-state {
  padding-top: 110rpx;
  color: #929c96;
  font-size: 24rpx;
  text-align: center;
}

@media screen and (min-width: 768px) {
  .panel {
    right: 50%;
    left: auto;
    width: 750rpx;
    transform: translateX(50%);
  }
}
</style>
