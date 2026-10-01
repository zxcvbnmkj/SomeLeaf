const MAX_FILE_BYTES = 2.5 * 1024 * 1024

function validateFile(name, size) {
  if (!name || !name.toLowerCase().endsWith('.txt')) {
    throw new Error('请选择 TXT 文件')
  }

  if (size > MAX_FILE_BYTES) {
    throw new Error('首版仅支持 2.5 MB 以内的 TXT 文件')
  }
}

function validateUtf8(content) {
  if (content.includes('\uFFFD')) {
    throw new Error('文件可能不是 UTF-8 编码，请转换编码后重试')
  }

  return content.replace(/^\uFEFF/, '')
}

// #ifdef H5
function pickFromBrowser() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,text/plain'

    input.onchange = async (event) => {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        reject(new Error('未选择文件'))
        return
      }

      try {
        validateFile(file.name, file.size)
        const buffer = await file.arrayBuffer()
        const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer)

        resolve({
          name: file.name,
          size: file.size,
          content: validateUtf8(content)
        })
      } catch (error) {
        reject(
          error instanceof TypeError
            ? new Error('文件不是有效的 UTF-8 编码')
            : error
        )
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

function readAndroidText(resolver, uri) {
  const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
  const BufferedReader = plus.android.importClass('java.io.BufferedReader')
  const inputStream = resolver.openInputStream(uri)
  const reader = new BufferedReader(new InputStreamReader(inputStream, 'UTF-8'))
  const lines = []
  let characterCount = 0

  plus.android.importClass(reader)

  try {
    let line = reader.readLine()

    while (line !== null) {
      const currentLine = String(line)
      characterCount += currentLine.length

      if (characterCount > MAX_FILE_BYTES) {
        throw new Error('首版仅支持 2.5 MB 以内的 TXT 文件')
      }

      lines.push(currentLine)
      line = reader.readLine()
    }
  } finally {
    reader.close()
  }

  return validateUtf8(lines.join('\n'))
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
    intent.setType('text/plain')

    activity.onActivityResult = (code, resultCode, data) => {
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

        resolve({
          name: meta.name,
          size: meta.size,
          content: readAndroidText(resolver, uri)
        })
      } catch (error) {
        reject(error)
      }
    }

    activity.startActivityForResult(intent, requestCode)
  })
}
// #endif

export function pickTextFile() {
  // #ifdef H5
  return pickFromBrowser()
  // #endif

  // #ifdef APP-PLUS
  return pickFromAndroid()
  // #endif

  // #ifndef H5 || APP-PLUS
  return Promise.reject(new Error('当前平台暂不支持 TXT 导入'))
  // #endif
}
