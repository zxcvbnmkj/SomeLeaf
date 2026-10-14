const CHAPTER_PATTERN = /^\s*((?:正文\s*)?第[0-9零一二三四五六七八九十百千万两〇○]+[章节回卷部篇][^\r\n]*|序章[^\r\n]*|楔子[^\r\n]*|前言[^\r\n]*|后记[^\r\n]*|番外[^\r\n]*)\s*$/gm
// 章节标题里的固定部分，例如"第十二章""正文 第3回""番外"。
const CHAPTER_HEAD_PATTERN = /^(?:正文\s*)?(?:第[0-9零一二三四五六七八九十百千万两〇○]+[章节回卷部篇]|序章|楔子|前言|后记|番外)/
const CHAPTER_TITLE_MAX_LENGTH = 30
// 标题后半部分以这些字符开头，说明是"第一章 风起""第一章：风起"这种明确的标题写法。
const TITLE_SEPARATOR_PATTERN = /^[\s:：、.．·\-—_|｜（(【\[《「“]/
const SENTENCE_PUNCTUATION_PATTERN = /[，。！？；…,!?;]/
const SENTENCE_ENDING_PATTERN = /[。，、；：,;:]$/

// CHAPTER_PATTERN 只看行首，"第一节课结束后，他走出教室。""前言不搭后语地说了一句。"
// 这类正文句子也会被当成章节。这里再按标题的常见写法过滤一遍。
function isLikelyChapterTitle(title) {
  if (Array.from(title).length > CHAPTER_TITLE_MAX_LENGTH) return false
  // 标题几乎不会以句号、逗号、冒号收尾，也几乎不含句号。
  if (SENTENCE_ENDING_PATTERN.test(title) || title.includes('。')) return false

  const rest = title.slice(title.match(CHAPTER_HEAD_PATTERN)[0].length)
  if (!rest || TITLE_SEPARATOR_PATTERN.test(rest)) return true
  // "第1章风起"这种不加分隔的写法也很常见，但后面紧跟的若是带标点的句子，
  // 多半是"第三回合，他赢了"这样的正文。
  return !SENTENCE_PUNCTUATION_PATTERN.test(rest)
}

// 与阅读页的 normalizeForSharing、后端的 normalize_book_content 保持一致：
// 评论和笔记的 start_offset / end_offset 都是相对这份规范化正文的 UTF-16 偏移。
export function normalizeBookContent(content) {
  return String(content || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n(?:(?:[^\S\n]|\u200B|\uFEFF)*\n)+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()
}

// 返回 text.slice(start, end).trim() 在 text 中的起止位置。
function trimmedRange(text, start, end) {
  while (start < end && /\s/.test(text[start])) start += 1
  while (end > start && /\s/.test(text[end - 1])) end -= 1
  return { start, end }
}

function createSection(normalized, title, titleOffset, contentStart, contentEnd, includeTitle) {
  const range = trimmedRange(normalized, contentStart, contentEnd)
  return {
    title,
    titleOffset,
    content: normalized.slice(range.start, range.end),
    contentOffset: range.start,
    includeTitle
  }
}

function splitIntoSections(content, fallbackTitle, chapters = []) {
  const normalized = normalizeBookContent(content)
  const validChapters = chapters
    .filter((chapter) => chapter && chapter.title && Number.isFinite(chapter.startOffset))
    .sort((left, right) => left.startOffset - right.startOffset)

  if (validChapters.length) {
    return validChapters.map((chapter, index) => createSection(
      normalized,
      chapter.title.trim(),
      null,
      Math.max(0, chapter.startOffset),
      validChapters[index + 1]?.startOffset ?? normalized.length,
      true
    )).filter((section) => section.content)
  }

  const matches = Array.from(normalized.matchAll(CHAPTER_PATTERN))
    .filter((match) => isLikelyChapterTitle(match[1].trim()))

  if (!matches.length) {
    return [createSection(normalized, fallbackTitle, null, 0, normalized.length, false)]
  }

  const sections = []
  const preface = createSection(normalized, '正文之前', null, 0, matches[0].index, false)

  if (preface.content) {
    sections.push(preface)
  }

  matches.forEach((match, index) => {
    const titleStart = match.index + match[0].indexOf(match[1])
    const titleRange = trimmedRange(normalized, titleStart, titleStart + match[1].length)

    sections.push(createSection(
      normalized,
      normalized.slice(titleRange.start, titleRange.end),
      titleRange.start,
      match.index + match[0].length,
      matches[index + 1]?.index ?? normalized.length,
      true
    ))
  })

  return sections
}

// 每个显示行记录正文部分在规范化全文中的起点（sourceStart）；
// prefixLength 是行首补上的缩进长度，这部分不对应原文。
function createDisplayLines(section, isFirstSection) {
  const lines = []
  let hasSeenBookText = false

  if (section.includeTitle) {
    lines.push({ text: section.title, sourceStart: section.titleOffset, prefixLength: 0 })
    hasSeenBookText = true
  }

  let cursor = section.contentOffset
  section.content.split('\n').forEach((sourceLine) => {
    const lineStart = cursor
    cursor += sourceLine.length + 1
    const line = sourceLine.trim()

    if (!line) {
      lines.push({ text: '', sourceStart: null, prefixLength: 0 })
      return
    }

    const prefix = isFirstSection && !hasSeenBookText ? '' : '　　'
    lines.push({
      text: `${prefix}${line}`,
      sourceStart: lineStart + sourceLine.indexOf(line),
      prefixLength: prefix.length
    })
    hasSeenBookText = true
  })

  return lines
}

// 浏览器在 CJK 文本中默认遵守的避头尾规则：这些字符不能出现在行首 / 行尾。
const toCodeSet = (chars) => new Set(Array.from(chars, (char) => char.codePointAt(0)))
const NO_LINE_START = toCodeSet('，。、！？；：…‥）》」』】〕〉”’,.!?;:)]}%·ー～〜ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々〻')
const NO_LINE_END = toCodeSet('（《「『【〔〈“‘([{')

// 没有 measureText 时的字宽估算（单位 em）。全角字符恒为 1em；
// 半角字符宁可估宽一点，让模拟折行略早于真实折行，避免正文溢出被裁掉。
function estimateCharWidth(char) {
  const code = char.codePointAt(0)
  if (code === 0x20) return 0.3
  if (code < 0x7f) {
    if (/[ilIjtf.,:;!'|]/.test(char)) return 0.35
    if (/[mwMW@]/.test(char)) return 0.9
    return 0.62
  }
  if (code >= 0xff61 && code <= 0xff9f) return 0.5
  return 1
}

// 返回按码点取字宽的函数。BMP 字符用定长表缓存（0 表示未测量），
// 分页时每个字只是一次数组读取，measureText 每种字符只调用一次。
function createWidthMeasurer(measureCharWidth) {
  const bmpWidths = new Float64Array(0x10000)
  const astralWidths = new Map()

  function measure(code) {
    const char = String.fromCodePoint(code)
    const width = measureCharWidth?.(char)
    return Number.isFinite(width) && width > 0 ? width : estimateCharWidth(char)
  }

  return (code) => {
    if (code < 0x10000) {
      return bmpWidths[code] || (bmpWidths[code] = measure(code))
    }
    let width = astralWidths.get(code)
    if (width === undefined) astralWidths.set(code, (width = measure(code)))
    return width
  }
}

function previousCharIndex(text, index) {
  const code = text.charCodeAt(index - 1)
  return code >= 0xdc00 && code <= 0xdfff && index >= 2 ? index - 2 : index - 1
}

// 引号在 Unicode 换行规则（UAX #14）里属于 QU 类，宽度是"模糊"，不算东亚字符。
const QUOTES = toCodeSet('“”‘’"\'«»')
const OPENING_QUOTES = toCodeSet('“‘«')
const CLOSING_QUOTES = toCodeSet('”’»')

// 东亚宽字符（East Asian Width 为 F / W / H），用于引号的 LB19a 规则。
function isEastAsian(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1f64f) ||
    (code >= 0x1f900 && code <= 0x1f9ff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  )
}

// 判断能否在 text[index] 之前断行，规则与浏览器（ICU 的 UAX #14 实现）一致。
function canBreakBefore(text, index) {
  const before = text.codePointAt(previousCharIndex(text, index))
  const after = text.codePointAt(index)

  // pre-wrap 下空格之后总能断行（空格悬挂在上一行末尾）。
  if (before === 0x20) return true
  if (NO_LINE_START.has(after) || NO_LINE_END.has(before)) return false
  // 破折号"——"两半不能拆开。
  if (before === 0x2014 && after === 0x2014) return false

  // LB19：右引号前、左引号后不断；LB19a：引号只有夹在东亚字符之间时才可以断。
  if (QUOTES.has(after)) {
    if (!OPENING_QUOTES.has(after) || !isEastAsian(before)) return false
    const next = index + (after > 0xffff ? 2 : 1)
    if (next >= text.length || !isEastAsian(text.codePointAt(next))) return false
  }
  if (QUOTES.has(before)) {
    if (!CLOSING_QUOTES.has(before) || !isEastAsian(after)) return false
    const previous = previousCharIndex(text, index)
    if (previous === 0 || !isEastAsian(text.codePointAt(previousCharIndex(text, previous)))) return false
  }

  return true
}

// 按浏览器 `white-space: pre-wrap; word-break: break-all` 的方式模拟折行，
// 返回每一行的文本；把这些行原样拼回去渲染时，折行位置与这里一致。
function wrapParagraph(text, lineWidth, charWidth) {
  // 只吸收逐字累加的浮点误差；行宽恰好是字号整数倍时，最后一个字也要能排进去。
  const limit = lineWidth + 1e-6
  const lines = []
  let lineStart = 0
  let width = 0
  let index = 0

  while (index < text.length) {
    const code = text.codePointAt(index)
    const size = code > 0xffff ? 2 : 1
    const nextWidth = charWidth(code)

    // pre-wrap 下行尾空格悬挂，不参与换行。
    if (code === 0x20 || width + nextWidth <= limit || index === lineStart) {
      width += nextWidth
      index += size
      continue
    }

    // 放不下时在行尾断开；若此处不允许断行（避头尾、引号等），就像浏览器一样把前面的字一起挪到下一行。
    let breakIndex = index
    while (!canBreakBefore(text, breakIndex) && previousCharIndex(text, breakIndex) > lineStart) {
      breakIndex = previousCharIndex(text, breakIndex)
    }

    lines.push(text.slice(lineStart, breakIndex))
    lineStart = breakIndex
    width = 0
    for (let carried = breakIndex; carried < index;) {
      const carriedCode = text.codePointAt(carried)
      width += charWidth(carriedCode)
      carried += carriedCode > 0xffff ? 2 : 1
    }
  }

  if (index > lineStart) lines.push(text.slice(lineStart))
  return lines
}

function paginateSection(
  section,
  lineWidth,
  charWidth,
  pageLineLimit,
  firstPageLineLimit,
  isFirstSection
) {
  const sourceLines = createDisplayLines(section, isFirstSection)
  const pages = []
  let pageLines = []
  let pageRuns = []
  let pageLength = 0
  let usedLines = 0

  function currentLineLimit() {
    return pages.length === 0 ? firstPageLineLimit : pageLineLimit
  }

  function pushPage() {
    if (!pageLines.length) return

    pages.push({
      title: pages.length === 0 ? section.title : `${section.title}（续）`,
      chapterTitle: section.title,
      isChapterStart: pages.length === 0,
      content: pageLines.join('\n'),
      // 页面文字与规范化全文的对应关系：[{ pageStart, sourceStart, length }]
      runs: pageRuns,
      sourceStart: pageRuns[0]?.sourceStart ?? null,
      sourceEnd: pageRuns.length
        ? pageRuns[pageRuns.length - 1].sourceStart + pageRuns[pageRuns.length - 1].length
        : null
    })
    pageLines = []
    pageRuns = []
    pageLength = 0
    usedLines = 0
  }

  // 把显示行 line.text 的 [from, to) 这一段放进当前页，并记录其中原文部分的映射。
  function appendToPage(line, from, to) {
    const pageStart = pageLines.length ? pageLength + 1 : 0
    pageLines.push(line.text.slice(from, to))
    pageLength = pageStart + (to - from)

    const sourceFrom = Math.max(from, line.prefixLength)
    if (line.sourceStart === null || to <= sourceFrom) return
    pageRuns.push({
      pageStart: pageStart + (sourceFrom - from),
      sourceStart: line.sourceStart + (sourceFrom - line.prefixLength),
      length: to - sourceFrom
    })
  }

  sourceLines.forEach((sourceLine) => {
    if (!sourceLine.text) {
      if (usedLines >= currentLineLimit()) pushPage()
      appendToPage(sourceLine, 0, 0)
      usedLines += 1
      return
    }

    const wrappedLines = wrapParagraph(sourceLine.text, lineWidth, charWidth)
    let lineIndex = 0
    let textOffset = 0

    // 整段按视觉行分配到各页，页面边界总是落在某一视觉行的末尾，
    // 因此每页最后一行都是排满的，不会出现"行内还有空位却被截到下一页"。
    while (lineIndex < wrappedLines.length) {
      const availableLines = currentLineLimit() - usedLines

      if (availableLines <= 0) {
        pushPage()
        continue
      }

      const pageChunk = wrappedLines.slice(lineIndex, lineIndex + availableLines)
      const chunkLength = pageChunk.reduce((total, line) => total + line.length, 0)
      appendToPage(sourceLine, textOffset, textOffset + chunkLength)
      textOffset += chunkLength
      usedLines += pageChunk.length
      lineIndex += pageChunk.length
    }
  })

  pushPage()
  return pages
}

export function paginateBook(
  content,
  fallbackTitle = '未命名图书',
  options = {}
) {
  // lineWidth 以 em 为单位（正文宽度 / 字号），兼容旧的 charactersPerLine 参数。
  const lineWidth = options.lineWidth || options.charactersPerLine || 18
  const charWidth = createWidthMeasurer(options.measureCharWidth)
  const pageLineLimit = options.pageLineLimit || 18
  const firstPageLineLimit = options.firstPageLineLimit || pageLineLimit
  const sections = splitIntoSections(content, fallbackTitle, options.chapters)
  const pages = sections.flatMap((section, index) =>
    paginateSection(
      section,
      lineWidth,
      charWidth,
      pageLineLimit,
      index === 0 ? firstPageLineLimit : pageLineLimit,
      index === 0
    )
  )

  // 只有标题等不对应原文的页面，沿用前一页的位置，保证 sourceStart 单调递增、可二分查找。
  let previousEnd = 0
  pages.forEach((page) => {
    if (page.sourceStart === null) {
      page.sourceStart = previousEnd
      page.sourceEnd = previousEnd
    }
    previousEnd = page.sourceEnd
  })

  return pages.length
    ? pages
    : [{ title: fallbackTitle, content: '这本书没有可显示的内容。', runs: [], sourceStart: 0, sourceEnd: 0 }]
}

// 找到包含全文偏移 offset 的页（即 sourceStart <= offset 的最后一页）。
export function findPageIndexBySourceOffset(pages, offset) {
  if (!pages.length || !Number.isFinite(offset)) return -1
  let low = 0
  let high = pages.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (pages[middle].sourceStart <= offset) low = middle
    else high = middle - 1
  }
  return low
}

// 把全文区间 [start, end) 换算成某一页内的若干区间；跨段落时会被段首缩进、换行分成多段。
export function pageRangesForSource(page, start, end) {
  const ranges = []
  ;(page?.runs || []).forEach((run) => {
    const from = Math.max(start, run.sourceStart)
    const to = Math.min(end, run.sourceStart + run.length)
    if (to > from) {
      ranges.push({
        start: run.pageStart + (from - run.sourceStart),
        end: run.pageStart + (to - run.sourceStart)
      })
    }
  })
  return ranges
}
