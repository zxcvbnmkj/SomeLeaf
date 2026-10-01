<template>
	<view class="reader-page">
		<view class="reader-header">
			<navigator class="back-button" open-type="navigateBack" :delta="1" aria-label="返回书架">
				<view class="back-arrow" aria-hidden="true" />
			</navigator>

			<text class="header-title">SomeLeaf</text>
			<view class="header-space" />
		</view>

		<view v-if="isLoading" class="page-status">
			<view class="loading-leaf" aria-hidden="true" />
			<text>正在打开图书</text>
		</view>

		<view v-else class="reading-area" @tap="handleReadingTap">
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
				<text class="book-content"><text v-for="(segment, segmentIndex) in highlightedSegments"
						:key="segmentIndex"
						:class="{ 'search-highlight': segment.highlighted }">{{ segment.text }}</text></text>
			</view>

		</view>

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

		<view v-if="!isLoading && isControlsVisible" class="reader-footer">
			<view class="progress-row">
				<slider class="progress-slider" :value="sliderProgress" :min="0" :max="100" :step="1"
					activeColor="#3F7959" backgroundColor="#DCE4DE" block-color="#FFFFFF" :block-size="18"
					@changing="handleProgressChanging" @change="handleProgressChange" />
				<text class="progress-percent">{{ sliderProgress }}%</text>
				<button class="search-toggle" aria-label="搜索正文" @click="openSearch">
					<view class="search-icon" aria-hidden="true" />
				</button>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		computed,
		ref
	} from 'vue'
	import {
		onLoad
	} from '@dcloudio/uni-app'
	import {
		findBook,
		readBookContent,
		updateBookProgress
	} from '@/services/book-storage'
	import {
		paginateBook
	} from '@/utils/text-pagination'

	const bookTitle = ref('')
	const activeBookId = ref('')
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

	function getPageLimits() {
		const systemInfo = uni.getSystemInfoSync()
		const viewportWidth = systemInfo.windowWidth
		const viewportHeight = systemInfo.windowHeight
		const rpx = viewportWidth / 750
		const safeTop = systemInfo.safeAreaInsets?.top || systemInfo.statusBarHeight || 0
		const safeBottom = systemInfo.safeAreaInsets?.bottom || 0
		const contentWidth = viewportWidth - 80 * rpx
		const contentHeight =
			viewportHeight - (76 + 64) * rpx - safeTop - safeBottom
		const fontSize = 32 * rpx
		const lineHeight = 36 * rpx
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

	function splitByKeyword(text, keyword) {
		if (!keyword) return [{
			text,
			:
		}]

		const segments = []
		const normalizedText = text.toLocaleLowerCase()
		const normalizedKeyword = keyword.toLocaleLowerCase()
		let cursor = 0
		let matchIndex = normalizedText.indexOf(normalizedKeyword)

		while (matchIndex !== -1) {
			if (matchIndex > cursor) {
				segments.push({
					text: text.slice(cursor, matchIndex),
					highlighted: false
				})
			}

			const matchEnd = matchIndex + keyword.length
			segments.push({
				text: text.slice(matchIndex, matchEnd),
				highlighted: true
			})
			cursor = matchEnd
			matchIndex = normalizedText.indexOf(normalizedKeyword, cursor)
		}

		if (cursor < text.length) {
			segments.push({
				text: text.slice(cursor),
				highlighted: false
			})
		}

		return segments.length ? segments : [{
			text,
			highlighted: false
		}]
	}

	const highlightedSegments = computed(() => {
		const keyword = searchMatches.value.length ? searchKeyword.value.trim() : ''
		return splitByKeyword(formattedPageContent.value, keyword)
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

	function openSearch() {
		isSearchOpen.value = true
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

			bookTitle.value = book.title
			activeBookId.value = book.id
			const content = await readBookContent(book)
			pages.value = paginateBook(content, book.title, getPageLimits())
			currentPageIndex.value = Math.round(
				((book.progress || 0) / 100) * Math.max(0, pages.value.length - 1)
			)
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
	.header-space {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64rpx;
		height: 64rpx;
		flex: 0 0 64rpx;
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
		padding: 36rpx 40rpx calc(36rpx + env(safe-area-inset-bottom));
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
		font-family: "Songti SC", "STSong", serif;
		font-size: 32rpx;
		line-height: 1.75;
		text-align: justify;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.search-highlight {
		color: #24382d;
		background: #f0cf72;
	}

	.reader-footer {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 5;
		display: flex;
		height: calc(96rpx + env(safe-area-inset-bottom));
		padding: 15rpx 32rpx env(safe-area-inset-bottom);
		background: rgba(246, 247, 242, 0.96);
		border-top: 1rpx solid rgba(47, 76, 60, 0.1);
	}

	.search-panel {
		position: fixed;
		right: 0;
		bottom: calc(96rpx + env(safe-area-inset-bottom));
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
	.search-toggle {
		margin: 0;
		padding: 0;
		background: transparent;
		border: 0;
	}

	.search-submit::after,
	.search-close::after,
	.result-button::after,
	.search-toggle::after {
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

	.progress-row {
		display: flex;
		align-items: center;
		width: 100%;
		height: 66rpx;
		gap: 16rpx;
	}

	.progress-slider {
		min-width: 0;
		margin: 0;
		flex: 1;
	}

	.progress-percent {
		width: 64rpx;
		flex: 0 0 64rpx;
		color: #52665a;
		font-size: 21rpx;
		text-align: right;
	}

	.search-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52rpx;
		height: 52rpx;
		flex: 0 0 52rpx;
	}

	.search-icon {
		position: relative;
		width: 23rpx;
		height: 23rpx;
		border: 3rpx solid #426b54;
		border-radius: 50%;
	}

	.search-icon::after {
		position: absolute;
		right: -8rpx;
		bottom: -6rpx;
		width: 11rpx;
		height: 3rpx;
		content: '';
		background: #426b54;
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
	}
</style>