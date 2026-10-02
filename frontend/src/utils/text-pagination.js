const CHAPTER_PATTERN = /^\s*((?:正文\s*)?第[0-9零一二三四五六七八九十百千万两〇○]+[章节回卷部篇][^\r\n]*|序章[^\r\n]*|楔子[^\r\n]*|前言[^\r\n]*|后记[^\r\n]*|番外[^\r\n]*)\s*$/gm

function splitIntoSections(content, fallbackTitle, chapters = []) {
  const normalized = content
    .replace(/\r\n?/g, '\n')
    .replace(/\n(?:(?:[^\S\n]|\u200B|\uFEFF)*\n)+/g, '\n')
    .replace(/\n+/g, '\n')
    .trim()
  const validChapters = chapters
    .filter((chapter) => chapter && chapter.title && Number.isFinite(chapter.startOffset))
    .sort((left, right) => left.startOffset - right.startOffset)

  if (validChapters.length) {
    return validChapters.map((chapter, index) => ({
      title: chapter.title.trim(),
      content: normalized.slice(
        Math.max(0, chapter.startOffset),
        validChapters[index + 1]?.startOffset ?? normalized.length
      ).trim(),
      includeTitle: true
    })).filter((section) => section.content)
  }

  const matches = Array.from(normalized.matchAll(CHAPTER_PATTERN))

  if (!matches.length) {
    return [{ title: fallbackTitle, content: normalized, includeTitle: false }]
  }

  const sections = []
  const preface = normalized.slice(0, matches[0].index).trim()

  if (preface) {
    sections.push({ title: '正文之前', content: preface, includeTitle: false })
  }

  matches.forEach((match, index) => {
    const contentStart = match.index + match[0].length
    const contentEnd = matches[index + 1]?.index ?? normalized.length
    const sectionContent = normalized.slice(contentStart, contentEnd).trim()

    sections.push({
      title: match[1].trim(),
      content: sectionContent,
      includeTitle: true
    })
  })

  return sections
}

function createDisplayLines(section, isFirstSection) {
  const lines = []
  let hasSeenBookText = false

  if (section.includeTitle) {
    lines.push(section.title)
    hasSeenBookText = true
  }

  section.content.split('\n').forEach((sourceLine) => {
    const line = sourceLine.trim()

    if (!line) {
      lines.push('')
      return
    }

    const isFirstBookLine = isFirstSection && !hasSeenBookText
    lines.push(`${isFirstBookLine ? '' : '　　'}${line}`)
    hasSeenBookText = true
  })

  return lines
}

function paginateSection(
  section,
  charactersPerLine,
  pageLineLimit,
  firstPageLineLimit,
  isFirstSection
) {
  const sourceLines = createDisplayLines(section, isFirstSection)
  const pages = []
  let pageLines = []
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
      content: pageLines.join('\n')
    })
    pageLines = []
    usedLines = 0
  }

  sourceLines.forEach((sourceLine) => {
    if (!sourceLine) {
      if (usedLines >= currentLineLimit()) pushPage()
      pageLines.push('')
      usedLines += 1
      return
    }

    let remainingText = sourceLine

    while (remainingText.length) {
      const availableLines = currentLineLimit() - usedLines

      if (availableLines <= 0) {
        pushPage()
        continue
      }

      const availableCharacters = availableLines * charactersPerLine

      if (remainingText.length <= availableCharacters) {
        pageLines.push(remainingText)
        usedLines += Math.ceil(remainingText.length / charactersPerLine)
        remainingText = ''
      } else {
        pageLines.push(remainingText.slice(0, availableCharacters))
        remainingText = remainingText.slice(availableCharacters)
        usedLines += availableLines
        pushPage()
      }
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
  const charactersPerLine = options.charactersPerLine || 18
  const pageLineLimit = options.pageLineLimit || 18
  const firstPageLineLimit = options.firstPageLineLimit || pageLineLimit
  const sections = splitIntoSections(content, fallbackTitle, options.chapters)
  const pages = sections.flatMap((section, index) =>
    paginateSection(
      section,
      charactersPerLine,
      pageLineLimit,
      index === 0 ? firstPageLineLimit : pageLineLimit,
      index === 0
    )
  )

  return pages.length
    ? pages
    : [{ title: fallbackTitle, content: '这本书没有可显示的内容。' }]
}
