<template>
	<view class="reader-page">
		<view class="reader-header">
			<navigator class="back-button" open-type="navigateBack" :delta="1" aria-label="返回书架">
				<view class="back-arrow" aria-hidden="true" />
			</navigator>

			<text class="header-title">SomeLeaf</text>
			<button
				v-if="activeBook"
				class="header-community"
				aria-label="评论与读书笔记"
				@tap.stop="openCommunity('annotations')"
			>
				<view class="community-icon" aria-hidden="true" />
			</button>
			<view v-else class="header-space" />
		</view>

		<view v-if="isLoading" class="page-status">
			<view class="loading-leaf" aria-hidden="true" />
			<text>正在打开图书</text>
		</view>

		<view
			v-else
			class="reading-area"
				:selection-bridge-active="Boolean(activeBook)"
			:change:selection-bridge-active="selectionBridge.onActiveChange"
			@tap="handleReadingTap"
		>
			<view v-if="currentPageIndex === 0" class="chapter-heading">
				<text class="chapter-number">本地 TXT</text>
				<text class="chapter-title">{{ bookTitle }}</text>
				<view class="chapter-mark" aria-hidden="true">
					<view class="mark-line" />
					<view class="mark-leaf mark-leaf-left" />
					<view class="mark-leaf mark-leaf-right" />
					<view class="mark-line" />
				</view>
			</view>

			<view class="article">
				<text
					class="book-content"
					:user-select="Boolean(activeBook)"
					:style="bookContentStyle"
				><text v-for="(segment, segmentIndex) in highlightedSegments"
						:key="segmentIndex"
						:class="{ 'search-highlight': segment.searchHighlighted, 'annotation-highlight': segment.annotationHighlighted }"
						@tap="handleSegmentTap(segment, $event)"
					>{{ segment.text }}</text></text>
			</view>

		</view>

		<button
			v-if="canCommentOnSelection"
			class="selection-comment-button"
			:style="selectionCommentButtonStyle"
			@tap.stop="commentOnSelection"
		>
			<view class="selection-comment-icon" aria-hidden="true" />
			<text>评论</text>
		</button>

		<view v-if="isControlsVisible && isSearchOpen" class="search-panel">
			<view class="search-input-row">
				<input v-model="searchKeyword" class="search-input" type="text" confirm-type="search"
					placeholder="输入正文关键词" placeholder-class="search-placeholder" @input="clearSearchResults"
					@confirm="runKeywordSearch" />
				<button class="search-submit" @click="runKeywordSearch">搜索</button>
				<button class="search-close" aria-label="关闭搜索" @click="closeSearch">×</button>
			</view>

			<view class="search-results">
				<text class="result-status">{{ searchResultText }}</text>
				<view class="result-actions">
					<button class="result-button" :disabled="!searchMatches.length"
						@click="goToSearchResult(-1)">上一处</button>
					<button class="result-button" :disabled="!searchMatches.length"
						@click="goToSearchResult(1)">下一处</button>
				</view>
			</view>
		</view>

		<view v-if="isControlsVisible && activeFooterPanel === 'progress'" class="reader-tool-panel">
			<view class="slider-row">
				<slider class="tool-slider" :value="sliderProgress" :min="0" :max="100" :step="1"
					activeColor="#3F7959" backgroundColor="#DCE4DE" block-color="#FFFFFF" :block-size="18"
					@changing="handleProgressChanging" @change="handleProgressChange" />
				<text class="slider-value">{{ sliderProgress }}%</text>
			</view>
		</view>

		<view v-if="isControlsVisible && activeFooterPanel === 'font'" class="reader-tool-panel">
			<view class="slider-row">
				<text class="font-scale font-scale-small">A</text>
				<slider class="tool-slider" :value="displayFontSize" :min="26" :max="42" :step="2"
					activeColor="#3F7959" backgroundColor="#DCE4DE" block-color="#FFFFFF" :block-size="18"
					@changing="handleFontChanging" @change="handleFontChange" />
				<text class="font-scale font-scale-large">A</text>
				<text class="font-value">{{ displayFontSize }}</text>
			</view>
		</view>

		<view v-if="!isLoading && isControlsVisible" class="reader-footer">
			<view class="footer-actions">
				<button
					class="footer-action"
					:class="{ 'footer-action-active': activeFooterPanel === 'progress' }"
					@click="toggleFooterPanel('progress')"
				>
					<text class="progress-icon">{{ sliderProgress }}%</text>
					<text class="footer-label">进度</text>
				</button>
				<button
					class="footer-action"
					:class="{ 'footer-action-active': activeFooterPanel === 'font' }"
					@click="toggleFooterPanel('font')"
				>
					<text class="font-icon">Aa</text>
					<text class="footer-label">字号</text>
				</button>
				<button
					class="footer-action"
					:class="{ 'footer-action-active': isSearchOpen }"
					@click="openSearch"
				>
					<view class="search-icon" aria-hidden="true" />
					<text class="footer-label">搜索</text>
				</button>
			</view>
		</view>

		<ReaderCommunityPanel
			v-if="activeBook"
			:visible="isCommunityVisible"
			:room="communityRoom"
			:local-book-id="communityRoom ? '' : activeBookId"
			:current-user-id="currentUserId"
			:selected-range="selectedRange"
			:current-offset="currentOffset"
			:page-number="currentPageIndex + 1"
			:initial-tab="communityInitialTab"
			:compose-request="commentComposeRequest"
			@close="isCommunityVisible = false"
			@locate="locateCommunityEntry"
			@annotations-change="sharedAnnotations = $event"
			@clear-selection="clearSelectedRange"
		/>
	</view>
</template>

<script setup>
	import {
		computed,
		onMounted,
		onUnmounted,
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		findBook,
		readBookContent,
		updateBookProgress,
		updateBookSharing
	} from '@/services/book-storage'
	import { getAccessToken, getStoredUser } from '@/services/auth'
	import { listLocalAnnotations } from '@/services/local-reading'
	import { getReadingRoom, listAnnotations } from '@/services/reading-rooms'
	import { syncLocalReadingToRoom } from '@/services/reading-sync'
	import ReaderCommunityPanel from '@/components/ReaderCommunityPanel.vue'
	import {
		paginateBook
	} from '@/utils/text-pagination'

	const bookTitle = ref('')
	const activeBook = ref(null)
	const activeBookId = ref('')
	const fullContent = ref('')
	const pages = ref([])
	const currentPageIndex = ref(0)
	const isLoading = ref(true)
	const draggingProgress = ref(null)
	const isControlsVisible = ref(false)
	const isSearchOpen = ref(false)
	const searchKeyword = ref('')
	const searchMatches = ref([])
	const activeSearchIndex = ref(-1)
	const hasSearched = ref(false)
	const activeFooterPanel = ref('')
	const readerFontSize = ref(32)
	const draggingFontSize = ref(null)
	const isCommunityVisible = ref(false)
	const communityInitialTab = ref('annotations')
	const commentComposeRequest = ref(0)
	const selectedRange = ref(null)
	const selectionButtonPosition = ref(null)
	const sharedAnnotations = ref([])
	const currentUserId = Number(getStoredUser()?.id || 0)
	const FONT_SIZE_STORAGE_KEY = 'someleaf:reader-font-size'
	const storedFontSize = Number(uni.getStorageSync(FONT_SIZE_STORAGE_KEY))
	if (storedFontSize >= 26 && storedFontSize <= 42) {
		readerFontSize.value = storedFontSize
	}
	const displayFontSize = computed(() =>
		draggingFontSize.value === null ? readerFontSize.value : draggingFontSize.value
	)
	const bookContentStyle = computed(() => ({
		fontSize: `${readerFontSize.value}rpx`,
		lineHeight: 1.75
	}))

	function normalizeForSharing(content) {
		return String(content || '')
			.replace(/^\uFEFF/, '')
			.replace(/\r\n?/g, '\n')
			.replace(/\n(?:(?:[^\S\n]|\u200B|\uFEFF)*\n)+/g, '\n')
			.replace(/\n+/g, '\n')
			.trim()
	}

	const normalizedContent = computed(() => normalizeForSharing(fullContent.value))
	const communityRoom = computed(() => {
		const sharing = activeBook.value?.sharing
		if (!sharing) return null
		return {
			id: Number(sharing.roomId),
			status: sharing.status || 'active'
		}
	})
	const canCommentOnSelection = computed(() =>
		Boolean(
			selectedRange.value &&
			selectionButtonPosition.value &&
			communityRoom.value?.status !== 'closed'
		)
	)
	const selectionCommentButtonStyle = computed(() => {
		if (!selectionButtonPosition.value) return {}
		return {
			left: `${selectionButtonPosition.value.left}px`,
			top: `${selectionButtonPosition.value.top}px`
		}
	})
	const currentOffset = computed(() => {
		if (!normalizedContent.value.length || !pages.value.length) return 0
		let offset = Math.floor(
			(currentPageIndex.value / pages.value.length) * normalizedContent.value.length
		)
		const currentCodeUnit = normalizedContent.value.charCodeAt(offset)
		const previousCodeUnit = normalizedContent.value.charCodeAt(offset - 1)
		if (
			currentCodeUnit >= 0xDC00 && currentCodeUnit <= 0xDFFF &&
			previousCodeUnit >= 0xD800 && previousCodeUnit <= 0xDBFF
		) {
			offset -= 1
		}
		return offset
	})

	function getPageLimits() {
		const systemInfo = uni.getSystemInfoSync()
		const viewportWidth = systemInfo.windowWidth
		const viewportHeight = systemInfo.windowHeight
		const rpx = viewportWidth / 750
		const safeTop = systemInfo.safeAreaInsets?.top || systemInfo.statusBarHeight || 0
		const safeBottom = systemInfo.safeAreaInsets?.bottom || 0
		const contentWidth = viewportWidth - 80 * rpx
		const contentHeight =
			viewportHeight - (76 + 112) * rpx - safeTop - safeBottom
		const fontSize = readerFontSize.value * rpx
		const lineHeight = readerFontSize.value * 1.75 * rpx
		const charactersPerLine = Math.max(10, Math.floor(contentWidth / fontSize))
		const normalLines = Math.max(6, Math.floor(contentHeight / lineHeight))
		const firstPageLines = Math.max(
			4,
			Math.floor((contentHeight - 190 * rpx) / lineHeight)
		)

		return {
			charactersPerLine: Math.max(10, Math.floor(charactersPerLine * 0.9)),
			pageLineLimit: Math.max(6, Math.floor(normalLines * 0.9)),
			firstPageLineLimit: Math.max(4, Math.floor(firstPageLines * 0.9))
		}
	}

	const currentPage = computed(() =>
		pages.value[currentPageIndex.value] || {
			title: '',
			content: ''
		}
	)

	const formattedPageContent = computed(() => currentPage.value.content)

	function matchIndexes(text, needle, caseInsensitive = false) {
		if (!needle) return []
		const source = caseInsensitive ? text.toLocaleLowerCase() : text
		const target = caseInsensitive ? needle.toLocaleLowerCase() : needle
		const indexes = []
		let index = source.indexOf(target)

		while (index !== -1) {
			indexes.push(index)
			index = source.indexOf(target, index + Math.max(1, target.length))
		}
		return indexes
	}

	function splitHighlightedText(text, keyword, annotations) {
		if (!text) return [{ text: '', searchHighlighted: false, annotationHighlighted: false }]
		const searchMarks = new Uint8Array(text.length)
		const annotationMarks = Array.from({ length: text.length }, () => [])

		matchIndexes(text, keyword, true).forEach((index) => {
			for (let cursor = index; cursor < index + keyword.length; cursor += 1) {
				searchMarks[cursor] = 1
			}
		})
		annotations.forEach((annotation) => {
			matchIndexes(text, annotation.quote).forEach((index) => {
				for (let cursor = index; cursor < index + annotation.quote.length; cursor += 1) {
					annotationMarks[cursor].push(annotation)
				}
			})
		})

		const segments = []
		let start = 0
		const signature = (index) =>
			`${searchMarks[index]}:${annotationMarks[index].map((item) => item.id).join(',')}`
		for (let index = 1; index <= text.length; index += 1) {
			if (index < text.length && signature(index) === signature(start)) continue
			segments.push({
				text: text.slice(start, index),
				searchHighlighted: Boolean(searchMarks[start]),
				annotationHighlighted: annotationMarks[start].length > 0,
				annotations: annotationMarks[start]
			})
			start = index
		}
		return segments
	}

	const highlightedSegments = computed(() => {
		const keyword = searchMatches.value.length ? searchKeyword.value.trim() : ''
		const pageAnnotations = sharedAnnotations.value.filter(
			(annotation) => findEntryPageIndex(annotation) === currentPageIndex.value
		)
		return splitHighlightedText(
			formattedPageContent.value,
			keyword,
			pageAnnotations
		)
	})

	const readingProgress = computed(() => {
		if (pages.value.length <= 1) return pages.value.length ? 100 : 0

		return Math.round(
			(currentPageIndex.value / (pages.value.length - 1)) * 100
		)
	})

	const sliderProgress = computed(() =>
		draggingProgress.value === null ?
		readingProgress.value :
		draggingProgress.value
	)

	const searchResultText = computed(() => {
		if (!hasSearched.value) return '输入关键词后开始搜索'
		if (!searchMatches.value.length) return '没有找到匹配内容'

		return `${activeSearchIndex.value + 1} / ${searchMatches.value.length} 页`
	})

	function saveProgress() {
		if (!activeBookId.value) return
		updateBookProgress(activeBookId.value, readingProgress.value)
	}

	function changePage(nextIndex) {
		if (nextIndex < 0 || nextIndex >= pages.value.length) return

		clearSelectedRange()
		currentPageIndex.value = nextIndex
		saveProgress()
	}

	function goToPreviousPage() {
		changePage(currentPageIndex.value - 1)
	}

	function goToNextPage() {
		changePage(currentPageIndex.value + 1)
	}

	function hideReaderControls() {
		if (isSearchOpen.value) closeSearch()
		activeFooterPanel.value = ''
		isControlsVisible.value = false
	}

	function toggleReaderControls() {
		if (isControlsVisible.value) {
			hideReaderControls()
		} else {
			isControlsVisible.value = true
		}
	}

	function handleReadingTap(event) {
		if (
			selectedRange.value &&
			typeof window !== 'undefined' &&
			window.getSelection?.()?.isCollapsed
		) {
			clearSelectedRange()
		}
		const touch = event.changedTouches && event.changedTouches[0]
		const tapX = touch?.clientX ?? event.detail?.x

		if (typeof tapX !== 'number') return

		uni.createSelectorQuery()
			.select('.reading-area')
			.boundingClientRect((rect) => {
				if (!rect) return

				const relativeX = (tapX - rect.left) / rect.width

				if (relativeX < 0.35) {
					hideReaderControls()
					goToPreviousPage()
				} else if (relativeX > 0.65) {
					hideReaderControls()
					goToNextPage()
				} else {
					toggleReaderControls()
				}
			})
			.exec()
	}

	function handleProgressChanging(event) {
		draggingProgress.value = Math.round(event.detail.value)
	}

	function handleProgressChange(event) {
		const progress = Math.round(event.detail.value)
		const lastPageIndex = Math.max(0, pages.value.length - 1)
		const targetPageIndex = Math.round((progress / 100) * lastPageIndex)

		draggingProgress.value = null
		changePage(targetPageIndex)
	}

	function toggleFooterPanel(panel) {
		if (isSearchOpen.value) closeSearch()
		activeFooterPanel.value = activeFooterPanel.value === panel ? '' : panel
	}

	function handleFontChanging(event) {
		draggingFontSize.value = Math.round(event.detail.value)
	}

	function handleFontChange(event) {
		const nextFontSize = Math.round(event.detail.value)
		const progress = readingProgress.value
		draggingFontSize.value = null
		if (nextFontSize === readerFontSize.value) return

		clearSelectedRange()
		readerFontSize.value = nextFontSize
		uni.setStorageSync(FONT_SIZE_STORAGE_KEY, nextFontSize)
		pages.value = paginateBook(fullContent.value, bookTitle.value, getPageLimits())
		currentPageIndex.value = Math.round(
			(progress / 100) * Math.max(0, pages.value.length - 1)
		)
		saveProgress()
	}

	function openSearch() {
		activeFooterPanel.value = ''
		isSearchOpen.value = !isSearchOpen.value
	}

	function requireCommunityLogin() {
		if (getAccessToken()) return true
		uni.showModal({
			title: '需要登录',
			content: '登录后才能查看和发布共读内容。',
			confirmText: '去登录',
			success: ({ confirm }) => {
				if (confirm) uni.redirectTo({ url: '/pages/profile/index' })
			}
		})
		return false
	}

	function openCommunity(tab = 'annotations') {
		if (communityRoom.value && !requireCommunityLogin()) return
		communityInitialTab.value = tab
		isCommunityVisible.value = true
	}

	function closestQuoteRange(quote) {
		const source = normalizedContent.value
		if (!quote || !source) return null
		let index = source.indexOf(quote)
		let bestIndex = -1
		let bestDistance = Number.POSITIVE_INFINITY
		while (index !== -1) {
			const distance = Math.abs(index - currentOffset.value)
			if (distance < bestDistance) {
				bestIndex = index
				bestDistance = distance
			}
			index = source.indexOf(quote, index + 1)
		}
		if (bestIndex < 0) return null
		return {
			startOffset: bestIndex,
			endOffset: bestIndex + quote.length,
			quote: source.slice(bestIndex, bestIndex + quote.length)
		}
	}

	function cleanSelectedText(value) {
		return String(value || '')
			.replace(/\r\n?/g, '\n')
			.replace(/(^|\n)　　/g, '$1')
			.trim()
	}

	function rememberSelectedText(value) {
		const quote = cleanSelectedText(value)
		if (!quote || quote.length > 2000) return false
		const range = closestQuoteRange(quote)
		if (!range) return false
		selectedRange.value = range
		return true
	}

	function positionSelectionCommentButton(rect, viewportWidth, viewportHeight) {
		if (!rect || (!rect.width && !rect.height)) return false
		const rpx = Math.min(viewportWidth, 750) / 750
		const buttonWidth = 132 * rpx
		const buttonHeight = 64 * rpx
		const gap = 12 * rpx
		const edge = 20 * rpx
		let left = rect.right + gap
		if (left + buttonWidth > viewportWidth - edge) {
			left = rect.right - buttonWidth
		}
		left = Math.max(edge, Math.min(left, viewportWidth - buttonWidth - edge))
		const top = Math.max(
			edge,
			Math.min(rect.top + (rect.height - buttonHeight) / 2, viewportHeight - buttonHeight - edge)
		)

		selectionButtonPosition.value = { left, top }
		return true
	}

	function handleRenderedSelection(payload) {
		if (!payload || !rememberSelectedText(payload.text)) return
		positionSelectionCommentButton(payload.rect, payload.viewportWidth, payload.viewportHeight)
	}

	defineExpose({ handleRenderedSelection })

	function captureBrowserSelection() {
		if (typeof window === 'undefined' || typeof document === 'undefined') return
		const selection = window.getSelection?.()
		if (!selection || selection.isCollapsed) return
		const contentElement = document.querySelector('.book-content')
		if (!contentElement || !contentElement.contains(selection.getRangeAt(0).commonAncestorContainer)) return
		if (!rememberSelectedText(selection.toString())) return
		const range = selection.getRangeAt(0)
		const rectangles = Array.from(range.getClientRects()).filter(
			(rect) => rect.width > 0 && rect.height > 0
		)
		positionSelectionCommentButton(
			rectangles[rectangles.length - 1] || range.getBoundingClientRect(),
			window.innerWidth,
			window.innerHeight
		)
	}

	function clearSelectedRange() {
		selectedRange.value = null
		selectionButtonPosition.value = null
		if (typeof window !== 'undefined') window.getSelection?.()?.removeAllRanges()
	}

	function commentOnSelection() {
		if (!selectedRange.value) return
		if (communityRoom.value && !requireCommunityLogin()) return
		communityInitialTab.value = 'annotations'
		commentComposeRequest.value += 1
		isCommunityVisible.value = true
	}

	function handleSegmentTap(segment, event) {
		if (!segment.annotations?.length) return
		event.stopPropagation?.()
		const uniqueAnnotations = Array.from(
			new Map(segment.annotations.map((item) => [item.id, item])).values()
		)
		const content = uniqueAnnotations
			.map((item) => `${item.username}：${item.comment || '只标记了这段原文'}`)
			.join('\n\n')
		uni.showModal({
			title: '划线评论',
			content,
			showCancel: false,
			confirmText: '关闭'
		})
	}

	function findEntryPageIndex(item) {
		if (!item.quote || !pages.value.length) return -1
		const expectedPage = Math.floor(
			((item.start_offset ?? item.anchor_offset ?? 0) /
				Math.max(1, normalizedContent.value.length)) * pages.value.length
		)
		const matchingPages = pages.value
			.map((page, index) => page.content.includes(item.quote) ? index : -1)
			.filter((index) => index >= 0)
		return matchingPages.sort(
			(left, right) => Math.abs(left - expectedPage) - Math.abs(right - expectedPage)
		)[0] ?? -1
	}

	function locateCommunityEntry(item) {
		isCommunityVisible.value = false
		let targetPage = findEntryPageIndex(item)
		if (targetPage < 0 && item.anchor_offset !== null && item.anchor_offset !== undefined) {
			targetPage = Math.floor(
				(item.anchor_offset / Math.max(1, normalizedContent.value.length)) * pages.value.length
			)
		}
		if (targetPage >= 0) changePage(Math.min(pages.value.length - 1, targetPage))
	}

	async function refreshCommunity() {
		if (!activeBook.value?.sharing || !getAccessToken()) return
		try {
			const room = await getReadingRoom(activeBook.value.sharing.roomId)
			activeBook.value = updateBookSharing(activeBook.value.id, room)
			if (room.status === 'active') {
				await syncLocalReadingToRoom(activeBook.value.id, room.id)
			}
			sharedAnnotations.value = await listAnnotations(room.id)
		} catch (_) {
			// 本地阅读不应因为服务器暂时不可用而中断。
		}
	}

	function closeSearch() {
		isSearchOpen.value = false
		searchKeyword.value = ''
		searchMatches.value = []
		activeSearchIndex.value = -1
		hasSearched.value = false
	}

	function clearSearchResults() {
		searchMatches.value = []
		activeSearchIndex.value = -1
		hasSearched.value = false
	}

	function runKeywordSearch() {
		const keyword = searchKeyword.value.trim()

		if (!keyword) {
			uni.showToast({
				title: '请输入关键词',
				icon: 'none'
			})
			return
		}

		uni.hideKeyboard()

		const normalizedKeyword = keyword.toLocaleLowerCase()
		searchMatches.value = pages.value.reduce((matches, page, pageIndex) => {
			if (page.content.toLocaleLowerCase().includes(normalizedKeyword)) {
				matches.push(pageIndex)
			}

			return matches
		}, [])
		hasSearched.value = true

		if (!searchMatches.value.length) {
			activeSearchIndex.value = -1
			return
		}

		activeSearchIndex.value = 0
		changePage(searchMatches.value[0])
	}

	function goToSearchResult(offset) {
		if (!searchMatches.value.length) return

		const total = searchMatches.value.length
		activeSearchIndex.value = (activeSearchIndex.value + offset + total) % total
		changePage(searchMatches.value[activeSearchIndex.value])
	}

	onLoad(async (options) => {
		try {
			const book = findBook(options.id)

			if (!book) {
				throw new Error('没有找到这本书')
			}

			activeBook.value = book
			bookTitle.value = book.title
			activeBookId.value = book.id
			const content = await readBookContent(book)
			fullContent.value = content
			pages.value = paginateBook(content, book.title, getPageLimits())
			currentPageIndex.value = Math.round(
				((book.progress || 0) / 100) * Math.max(0, pages.value.length - 1)
			)
			if (book.sharing) {
				refreshCommunity()
			} else {
				sharedAnnotations.value = listLocalAnnotations(book.id)
			}
		} catch (error) {
			uni.showToast({
				title: error.message || '图书打开失败',
				icon: 'none'
			})

			setTimeout(() => uni.navigateBack(), 1200)
		} finally {
			isLoading.value = false
		}
	})

	onMounted(() => {
		if (typeof document !== 'undefined') {
			document.addEventListener('selectionchange', captureBrowserSelection)
		}
	})

	onUnmounted(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('selectionchange', captureBrowserSelection)
		}
	})
	</script>

	<script module="selectionBridge" lang="renderjs">
		export default {
			data() {
				return {
					enabled: true,
					captureTimer: null
				}
			},
			mounted() {
				document.addEventListener('selectionchange', this.scheduleCapture)
				document.addEventListener('touchend', this.scheduleCapture)
				document.addEventListener('mouseup', this.scheduleCapture)
			},
			beforeDestroy() {
				document.removeEventListener('selectionchange', this.scheduleCapture)
				document.removeEventListener('touchend', this.scheduleCapture)
				document.removeEventListener('mouseup', this.scheduleCapture)
				if (this.captureTimer) clearTimeout(this.captureTimer)
			},
			methods: {
				onActiveChange(value) {
					this.enabled = Boolean(value)
				},
				scheduleCapture() {
					if (!this.enabled) return
					if (this.captureTimer) clearTimeout(this.captureTimer)
					this.captureTimer = setTimeout(() => this.captureSelection(), 80)
				},
				captureSelection() {
					const selection = window.getSelection && window.getSelection()
					if (!selection || selection.isCollapsed || !selection.rangeCount) return
					const contentElement = this.$el && this.$el.querySelector('.book-content')
					const range = selection.getRangeAt(0)
					if (!contentElement || !contentElement.contains(range.commonAncestorContainer)) return
					const rectangles = Array.from(range.getClientRects()).filter(
						(rect) => rect.width > 0 && rect.height > 0
					)
					const sourceRect = rectangles[rectangles.length - 1] || range.getBoundingClientRect()
					if (!sourceRect || (!sourceRect.width && !sourceRect.height)) return
					this.$ownerInstance.callMethod('handleRenderedSelection', {
						text: selection.toString(),
						rect: {
							left: sourceRect.left,
							right: sourceRect.right,
							top: sourceRect.top,
							width: sourceRect.width,
							height: sourceRect.height
						},
						viewportWidth: window.innerWidth,
						viewportHeight: window.innerHeight
					})
				}
			}
		}
	</script>

	<style scoped>
	.reader-page {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		height: 100vh;
		overflow: hidden;
		background: #f6f7f2;
		color: #26302a;
	}

	.reader-header {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: calc(76rpx + env(safe-area-inset-top));
		padding: env(safe-area-inset-top) 20rpx 0;
		background: rgba(246, 247, 242, 0.96);
		border-bottom: 1rpx solid rgba(47, 76, 60, 0.1);
	}

	.back-button,
	.header-space,
	.header-community {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		flex: 0 0 64rpx;
	}

	.header-community {
		margin: 0;
		padding: 0;
		background: transparent;
		border: 0;
	}

	.header-community::after {
		border: 0;
	}

	.back-arrow {
		width: 20rpx;
		height: 20rpx;
		border-bottom: 4rpx solid #345544;
		border-left: 4rpx solid #345544;
		transform: rotate(45deg);
	}

	.header-title {
		overflow: hidden;
		max-width: 480rpx;
		color: #52635a;
		font-size: 24rpx;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.page-status {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 65vh;
		gap: 20rpx;
		flex-direction: column;
		color: #718078;
		font-size: 24rpx;
	}

	.loading-leaf {
		width: 30rpx;
		height: 42rpx;
		background: #5f936f;
		border-radius: 28rpx 4rpx 28rpx 4rpx;
		transform: rotate(-20deg);
	}

	.reading-area {
		width: 100%;
		height: calc(100vh - 76rpx - env(safe-area-inset-top));
		max-width: 760rpx;
		margin: 0 auto;
		padding: 36rpx 40rpx calc(72rpx + env(safe-area-inset-bottom));
		overflow: hidden;
	}

	.chapter-heading {
		display: flex;
		align-items: center;
		flex-direction: column;
		margin-bottom: 28rpx;
		text-align: center;
	}

	.chapter-number {
		color: #6e7f75;
		font-size: 23rpx;
	}

	.chapter-title {
		display: -webkit-box;
		overflow: hidden;
		max-width: 100%;
		margin-top: 12rpx;
		color: #1f3027;
		font-size: 36rpx;
		font-weight: 650;
		line-height: 1.4;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.chapter-mark {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 32rpx;
		margin-top: 18rpx;
		gap: 7rpx;
	}

	.mark-line {
		width: 42rpx;
		height: 1rpx;
		background: #a9b5ad;
	}

	.mark-leaf {
		width: 13rpx;
		height: 19rpx;
		background: #5f8e70;
		border-radius: 12rpx 2rpx 12rpx 2rpx;
	}

	.mark-leaf-left {
		transform: rotate(-38deg);
	}

	.mark-leaf-right {
		transform: rotate(38deg) scaleX(-1);
	}

	.article {
		width: 100%;
		overflow: hidden;
	}

	.book-content {
		display: block;
		-webkit-user-select: text;
		font-family: "Songti SC", "STSong", serif;
		font-size: 32rpx;
		line-height: 1.75;
		text-align: justify;
		white-space: pre-wrap;
		word-break: break-all;
		user-select: text;
	}

	.search-highlight {
		color: #24382d;
		background: #f0cf72;
	}

	.annotation-highlight {
		background: rgba(126, 165, 119, 0.2);
	}

	.search-highlight.annotation-highlight {
		background: rgba(218, 190, 99, 0.42);
	}

	.selection-comment-button {
		position: fixed;
		z-index: 8;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 132rpx;
		height: 64rpx;
		margin: 0;
		padding: 0;
		gap: 10rpx;
		color: #ffffff;
		background: #315f48;
		border-radius: 8rpx;
		box-shadow: 0 10rpx 24rpx rgba(37, 74, 55, 0.2);
		font-size: 23rpx;
		line-height: 64rpx;
	}

	.selection-comment-button::after {
		border: 0;
	}

	.selection-comment-icon {
		position: relative;
		width: 25rpx;
		height: 20rpx;
		border: 3rpx solid currentColor;
		border-radius: 5rpx;
	}

	.selection-comment-icon::after {
		position: absolute;
		left: 3rpx;
		bottom: -7rpx;
		width: 7rpx;
		height: 7rpx;
		content: '';
		background: #315f48;
		border-bottom: 3rpx solid currentColor;
		border-left: 3rpx solid currentColor;
		transform: skewY(-35deg);
	}

	.reader-footer {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 5;
		display: flex;
		height: calc(112rpx + env(safe-area-inset-bottom));
		padding: 8rpx 44rpx env(safe-area-inset-bottom);
		background: rgba(246, 247, 242, 0.96);
		border-top: 1rpx solid rgba(47, 76, 60, 0.1);
	}

	.search-panel {
		position: fixed;
		right: 0;
		bottom: calc(112rpx + env(safe-area-inset-bottom));
		left: 0;
		z-index: 6;
		height: 164rpx;
		padding: 18rpx 32rpx;
		background: #ffffff;
		border-top: 1rpx solid #dfe5e0;
		box-shadow: 0 -12rpx 28rpx rgba(31, 48, 39, 0.08);
	}

	.search-input-row {
		display: flex;
		align-items: center;
		height: 60rpx;
		gap: 12rpx;
	}

	.search-input {
		min-width: 0;
		height: 60rpx;
		padding: 0 20rpx;
		flex: 1;
		color: #263b30;
		background: #f1f4f1;
		border: 1rpx solid #dce3de;
		border-radius: 8rpx;
		font-size: 24rpx;
	}

	.search-placeholder {
		color: #9aa49e;
	}

	.search-submit,
	.search-close,
	.result-button,
	.footer-action {
		margin: 0;
		padding: 0;
		background: transparent;
		border: 0;
	}

	.search-submit::after,
	.search-close::after,
	.result-button::after,
	.footer-action::after {
		border: 0;
	}

	.search-submit {
		width: 76rpx;
		height: 60rpx;
		color: #315f48;
		font-size: 23rpx;
		line-height: 60rpx;
	}

	.search-close {
		width: 48rpx;
		height: 60rpx;
		color: #7f8b84;
		font-size: 38rpx;
		font-weight: 300;
		line-height: 56rpx;
	}

	.search-results {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 68rpx;
	}

	.result-status {
		color: #7b8880;
		font-size: 21rpx;
	}

	.result-actions {
		display: flex;
		gap: 8rpx;
	}

	.result-button {
		width: 92rpx;
		height: 50rpx;
		color: #426b54;
		font-size: 21rpx;
		line-height: 50rpx;
	}

	.result-button[disabled] {
		color: #b2bab5;
		opacity: 1;
	}

	.reader-tool-panel {
		position: fixed;
		right: 0;
		bottom: calc(112rpx + env(safe-area-inset-bottom));
		left: 0;
		z-index: 6;
		height: 96rpx;
		padding: 12rpx 36rpx;
		background: #ffffff;
		border-top: 1rpx solid #dfe5e0;
		box-shadow: 0 -12rpx 28rpx rgba(31, 48, 39, 0.08);
	}

	.slider-row {
		display: flex;
		align-items: center;
		width: 100%;
		height: 72rpx;
		gap: 16rpx;
	}

	.tool-slider {
		min-width: 0;
		margin: 0;
		flex: 1;
	}

	.slider-value {
		width: 64rpx;
		flex: 0 0 64rpx;
		color: #52665a;
		font-size: 21rpx;
		text-align: right;
	}

	.font-scale {
		width: 34rpx;
		flex: 0 0 34rpx;
		color: #52665a;
		font-family: "Songti SC", serif;
		text-align: center;
	}

	.font-scale-small {
		font-size: 22rpx;
	}

	.font-scale-large {
		font-size: 34rpx;
	}

	.font-value {
		width: 42rpx;
		flex: 0 0 42rpx;
		color: #52665a;
		font-size: 21rpx;
		text-align: right;
	}

	.footer-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		height: 96rpx;
	}

	.footer-action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 148rpx;
		height: 88rpx;
		gap: 5rpx;
		flex-direction: column;
		color: #69776f;
	}

	.footer-action-active {
		color: #2f6b4f;
	}

	.progress-icon,
	.font-icon {
		display: block;
		height: 34rpx;
		font-size: 22rpx;
		font-weight: 650;
		line-height: 34rpx;
	}

	.font-icon {
		font-family: "Songti SC", serif;
		font-size: 25rpx;
	}

	.footer-label {
		display: block;
		height: 28rpx;
		font-size: 20rpx;
		line-height: 28rpx;
	}

	.community-icon {
		position: relative;
		width: 27rpx;
		height: 22rpx;
		border: 3rpx solid #426b54;
		border-radius: 6rpx;
	}

	.community-icon::after {
		position: absolute;
		left: 4rpx;
		bottom: -8rpx;
		width: 8rpx;
		height: 8rpx;
		content: '';
		background: #f6f7f2;
		border-bottom: 3rpx solid #426b54;
		border-left: 3rpx solid #426b54;
		transform: skewY(-35deg);
	}

	.search-icon {
		position: relative;
		width: 23rpx;
		height: 23rpx;
		border: 3rpx solid currentColor;
		border-radius: 50%;
	}

	.search-icon::after {
		position: absolute;
		right: -8rpx;
		bottom: -6rpx;
		width: 11rpx;
		height: 3rpx;
		content: '';
		background: currentColor;
		border-radius: 3rpx;
		transform: rotate(45deg);
	}

	@media screen and (min-width: 768px) {
		.reader-page {
			right: auto;
			left: 50%;
			width: 750rpx;
			margin: 0;
			box-shadow: 0 0 48rpx rgba(24, 32, 28, 0.08);
			transform: translateX(-50%);
		}

		.reader-footer {
			right: 50%;
			left: auto;
			width: 750rpx;
			transform: translateX(50%);
		}

		.search-panel {
			right: 50%;
			left: auto;
			width: 750rpx;
			transform: translateX(50%);
		}

		.reader-tool-panel {
			right: 50%;
			left: auto;
			width: 750rpx;
			transform: translateX(50%);
		}
	}
</style>
