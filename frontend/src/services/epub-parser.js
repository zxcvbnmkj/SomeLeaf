import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'

const MAX_EXTRACTED_BYTES = 4 * 1024 * 1024

function utf8ByteLength(value) {
  let length = 0
  for (const character of value) {
    const codePoint = character.codePointAt(0)
    if (codePoint <= 0x7f) length += 1
    else if (codePoint <= 0x7ff) length += 2
    else if (codePoint <= 0xffff) length += 3
    else length += 4
  }
  return length
}

function parseXml(source, label) {
  const document = new DOMParser().parseFromString(source, 'application/xml')
  const errors = document.getElementsByTagName('parsererror')
  if (errors.length) throw new Error(`${label}格式不正确`)
  return document
}

function resolveArchivePath(basePath, relativePath) {
  const parts = `${basePath}/${relativePath}`.split('/')
  const resolved = []
  parts.forEach((part) => {
    if (!part || part === '.') return
    if (part === '..') resolved.pop()
    else resolved.push(part)
  })
  return resolved.join('/')
}

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'div', 'figcaption',
  'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr',
  'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'tr', 'ul'
])

function extractNodeText(node, chunks) {
  if (node.nodeType === 3 || node.nodeType === 4) {
    chunks.push(node.nodeValue || '')
    return
  }
  if (node.nodeType !== 1) return

  const tagName = String(node.localName || node.nodeName).toLowerCase()
  if (tagName === 'script' || tagName === 'style' || tagName === 'svg') return
  const isBlock = BLOCK_TAGS.has(tagName)
  if (isBlock && chunks.length) chunks.push('\n')
  Array.from(node.childNodes || []).forEach((child) => extractNodeText(child, chunks))
  if (isBlock) chunks.push('\n')
}

function cleanChapterText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function chapterFromXhtml(source, fallbackTitle) {
  const document = parseXml(source.replace(/&nbsp;/g, '&#160;'), 'EPUB 章节')
  const body = document.getElementsByTagName('body')[0] || document.documentElement
  const heading = ['h1', 'h2', 'h3'].reduce(
    (result, tag) => result || document.getElementsByTagName(tag)[0],
    null
  )
  const chunks = []
  extractNodeText(body, chunks)
  const title = cleanChapterText(heading?.textContent) || fallbackTitle
  const extracted = cleanChapterText(chunks.join(''))
  const content = extracted.startsWith(`${title}\n`)
    ? extracted.slice(title.length + 1).trim()
    : extracted
  return {
    title,
    content
  }
}

function metadataTitle(packageDocument) {
  const titleNodes = [
    ...Array.from(packageDocument.getElementsByTagName('dc:title')),
    ...Array.from(packageDocument.getElementsByTagName('title'))
  ]
  return cleanChapterText(titleNodes[0]?.textContent)
}

export async function parseEpub(buffer) {
  let archive
  try {
    archive = await JSZip.loadAsync(buffer)
  } catch (_) {
    throw new Error('EPUB 文件已损坏或不是有效的 EPUB')
  }

  const containerEntry = archive.file('META-INF/container.xml')
  if (!containerEntry) throw new Error('EPUB 缺少书籍目录信息')
  const containerDocument = parseXml(
    await containerEntry.async('string'),
    'EPUB 目录'
  )
  const rootFile = containerDocument.getElementsByTagName('rootfile')[0]
  const packagePath = rootFile?.getAttribute('full-path')
  if (!packagePath) throw new Error('EPUB 缺少正文索引')

  const packageEntry = archive.file(packagePath)
  if (!packageEntry) throw new Error('EPUB 正文索引不存在')
  const packageDocument = parseXml(await packageEntry.async('string'), 'EPUB 索引')
  const packageDirectory = packagePath.includes('/')
    ? packagePath.slice(0, packagePath.lastIndexOf('/'))
    : ''
  const manifest = new Map()
  Array.from(packageDocument.getElementsByTagName('item')).forEach((item) => {
    manifest.set(item.getAttribute('id'), {
      href: item.getAttribute('href'),
      mediaType: item.getAttribute('media-type') || ''
    })
  })

  const spine = Array.from(packageDocument.getElementsByTagName('itemref'))
  const parsedChapters = []
  for (let index = 0; index < spine.length; index += 1) {
    const item = manifest.get(spine[index].getAttribute('idref'))
    if (!item?.href || !/xhtml|html/i.test(item.mediaType)) continue
    const entryPath = resolveArchivePath(packageDirectory, decodeURIComponent(item.href.split('#')[0]))
    const entry = archive.file(entryPath)
    if (!entry) continue
    const chapter = chapterFromXhtml(await entry.async('string'), `第 ${index + 1} 节`)
    if (chapter.content) parsedChapters.push(chapter)
  }

  if (!parsedChapters.length) throw new Error('EPUB 中没有可阅读的正文')

  let content = ''
  const chapters = []
  parsedChapters.forEach((chapter) => {
    if (content) content += '\n'
    chapters.push({ title: chapter.title, startOffset: content.length })
    content += chapter.content
  })
  if (utf8ByteLength(content) > MAX_EXTRACTED_BYTES) {
    throw new Error('EPUB 解压后的正文不能超过 4 MB')
  }
  return {
    title: metadataTitle(packageDocument),
    content,
    chapters
  }
}
