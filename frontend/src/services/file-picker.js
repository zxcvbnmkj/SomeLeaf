import { parseEpub } from '@/services/epub-parser'

const MAX_FILE_BYTES = 4 * 1024 * 1024

function validateFile(name, size) {
  if (!name || !/\.(txt|epub)$/i.test(name)) {
    throw new Error('请选择 TXT 或 EPUB 文件')
  }

  if (size > MAX_FILE_BYTES) {
    throw new Error('仅支持 4 MB 以内的 TXT 或 EPUB 文件')
  }
}

function isEpub(name) {
  return /\.epub$/i.test(name || '')
}

async function createPickedFile(name, size, buffer) {
  if (isEpub(name)) {
    const parsed = await parseEpub(buffer)
    return {
      name,
      size,
      content: parsed.content,
      encoding: 'utf-8',
      format: 'epub',
      title: parsed.title,
      chapters: parsed.chapters
    }
  }

  const decoded = decodeTextBuffer(buffer)
  return {
    name,
    size,
    content: decoded.content,
    encoding: decoded.encoding,
    format: 'txt',
    chapters: []
  }
}

function removeBom(content) {
  return content.replace(/^\uFEFF/, '')
}

function decodeTextBuffer(buffer) {
  const bytes = new Uint8Array(buffer)
  let encoding = 'utf-8'
  let offset = 0

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le'
    offset = 2
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be'
    offset = 2
  }

  const body = buffer.slice(offset)

  if (encoding !== 'utf-8' || offset > 0) {
    try {
      return {
        content: removeBom(new TextDecoder(encoding, { fatal: true }).decode(body)),
        encoding
      }
    } catch (error) {
      throw new Error('TXT 文件编码无效或内容已损坏')
    }
  }

  try {
    return {
      content: new TextDecoder('utf-8', { fatal: true }).decode(body),
      encoding: 'utf-8'
    }
  } catch (error) {
    try {
      return {
        content: new TextDecoder('gb18030', { fatal: true }).decode(body),
        encoding: 'gb18030'
      }
    } catch (fallbackError) {
      throw new Error('暂时无法识别该 TXT 文件的编码')
    }
  }
}

// #ifdef H5
function pickFromBrowser() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.epub,text/plain,application/epub+zip'

    input.onchange = async (event) => {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        reject(new Error('未选择文件'))
        return
      }

      try {
        validateFile(file.name, file.size)
        const buffer = await file.arrayBuffer()
        resolve(await createPickedFile(file.name, file.size, buffer))
      } catch (error) {
        reject(error)
      }
    }

    input.click()
  })
}
// #endif

// #ifdef APP-PLUS
function getDocumentMeta(resolver, uri) {
  const cursor = resolver.query(uri, null, null, null, null)
  let name = ''
  let size = 0

  if (!cursor) {
    return { name, size }
  }

  plus.android.importClass(cursor)

  try {
    if (cursor.moveToFirst()) {
      const nameIndex = cursor.getColumnIndex('_display_name')
      const sizeIndex = cursor.getColumnIndex('_size')

      if (nameIndex >= 0) {
        name = cursor.getString(nameIndex)
      }

      if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
        size = Number(cursor.getLong(sizeIndex))
      }
    }
  } finally {
    cursor.close()
  }

  return { name, size }
}

function detectAndroidEncoding(resolver, uri) {
  const inputStream = resolver.openInputStream(uri)

  plus.android.importClass(inputStream)

  try {
    const first = inputStream.read()
    const second = inputStream.read()
    const third = inputStream.read()

    if (first === 0xef && second === 0xbb && third === 0xbf) {
      return 'UTF-8'
    }

    if (first === 0xff && second === 0xfe) {
      return 'UTF-16LE'
    }

    if (first === 0xfe && second === 0xff) {
      return 'UTF-16BE'
    }

    return ''
  } finally {
    inputStream.close()
  }
}

function readAndroidTextWithEncoding(resolver, uri, encoding) {
  const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
  const BufferedReader = plus.android.importClass('java.io.BufferedReader')
  const inputStream = resolver.openInputStream(uri)
  const reader = new BufferedReader(new InputStreamReader(inputStream, encoding))
  const lines = []
  let characterCount = 0

  plus.android.importClass(reader)

  try {
    let line = reader.readLine()

    while (line !== null) {
      const currentLine = String(line)
      characterCount += currentLine.length

      if (characterCount > MAX_FILE_BYTES) {
        throw new Error('仅支持 4 MB 以内的 TXT 文件')
      }

      lines.push(currentLine)
      line = reader.readLine()
    }
  } finally {
    reader.close()
  }

  return removeBom(lines.join('\n'))
}

function readAndroidText(resolver, uri) {
  const bomEncoding = detectAndroidEncoding(resolver, uri)

  if (bomEncoding) {
    return {
      content: readAndroidTextWithEncoding(resolver, uri, bomEncoding),
      encoding: bomEncoding.toLowerCase()
    }
  }

  const utf8Content = readAndroidTextWithEncoding(resolver, uri, 'UTF-8')

  if (!utf8Content.includes('\uFFFD')) {
    return { content: utf8Content, encoding: 'utf-8' }
  }

  const gb18030Content = readAndroidTextWithEncoding(resolver, uri, 'GB18030')

  if (gb18030Content.includes('\uFFFD')) {
    throw new Error('暂时无法识别该 TXT 文件的编码')
  }

  return { content: gb18030Content, encoding: 'gb18030' }
}

function base64ToUint8Array(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function readAndroidBytes(resolver, uri) {
  const ByteArrayOutputStream = plus.android.importClass('java.io.ByteArrayOutputStream')
  const Base64 = plus.android.importClass('android.util.Base64')
  const inputStream = resolver.openInputStream(uri)
  const outputStream = new ByteArrayOutputStream()
  const buffer = plus.android.newObject('[B', 8192)
  let totalBytes = 0

  plus.android.importClass(inputStream)
  plus.android.importClass(outputStream)

  try {
    let readCount = inputStream.read(buffer)
    while (readCount !== -1) {
      totalBytes += Number(readCount)
      if (totalBytes > MAX_FILE_BYTES) {
        throw new Error('仅支持 4 MB 以内的 TXT 或 EPUB 文件')
      }
      outputStream.write(buffer, 0, readCount)
      readCount = inputStream.read(buffer)
    }
    const encoded = String(Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP))
    return base64ToUint8Array(encoded)
  } finally {
    inputStream.close()
    outputStream.close()
  }
}

function pickFromAndroid() {
  return new Promise((resolve, reject) => {
    const Intent = plus.android.importClass('android.content.Intent')
    const activity = plus.android.runtimeMainActivity()
    const resolver = activity.getContentResolver()
    const requestCode = 2617
    const previousHandler = activity.onActivityResult
    const intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)

    plus.android.importClass(resolver)
    intent.addCategory(Intent.CATEGORY_OPENABLE)
    intent.setType('*/*')

    activity.onActivityResult = async (code, resultCode, data) => {
      if (code !== requestCode) {
        if (typeof previousHandler === 'function') {
          previousHandler(code, resultCode, data)
        }
        return
      }

      activity.onActivityResult = previousHandler

      if (resultCode !== -1 || !data) {
        reject(new Error('未选择文件'))
        return
      }

      try {
        plus.android.importClass(data)
        const uri = data.getData()
        plus.android.importClass(uri)

        const meta = getDocumentMeta(resolver, uri)
        validateFile(meta.name, meta.size)
        if (isEpub(meta.name)) {
          const bytes = readAndroidBytes(resolver, uri)
          resolve(await createPickedFile(meta.name, meta.size || bytes.length, bytes))
        } else {
          const decoded = readAndroidText(resolver, uri)
          resolve({
            name: meta.name,
            size: meta.size,
            content: decoded.content,
            encoding: decoded.encoding,
            format: 'txt',
            chapters: []
          })
        }
      } catch (error) {
        reject(error)
      }
    }

    activity.startActivityForResult(intent, requestCode)
  })
}
// #endif

export function pickBookFile() {
  // #ifdef H5
  return pickFromBrowser()
  // #endif

  // #ifdef APP-PLUS
  return pickFromAndroid()
  // #endif

  // #ifndef H5 || APP-PLUS
  return Promise.reject(new Error('当前平台暂不支持本地图书导入'))
  // #endif
}

export const pickTextFile = pickBookFile
