import { clearLocalReadingData } from '@/services/local-reading'

const BOOKS_KEY = 'someleaf:books'
const CONTENT_KEY_PREFIX = 'someleaf:book-content:'

function createBookId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function titleFromFileName(fileName) {
  return fileName.replace(/\.txt$/i, '').trim() || '未命名图书'
}

function sharingMetadata(room) {
  return {
    roomId: room.id,
    inviteCode: room.invite_code,
    ownerId: room.owner_id,
    isOwner: room.is_owner,
    status: room.status,
    memberCount: room.member_count
  }
}

function writeAppFile(id, content) {
  return new Promise((resolve, reject) => {
    plus.io.requestFileSystem(
      plus.io.PRIVATE_DOC,
      (fileSystem) => {
        fileSystem.root.getDirectory(
          'books',
          { create: true },
          (directory) => {
            directory.getFile(
              `${id}.txt`,
              { create: true },
              (entry) => {
                entry.createWriter(
                  (writer) => {
                    writer.onwrite = () => resolve(entry.toLocalURL())
                    writer.onerror = () => reject(new Error('保存 TXT 文件失败'))
                    writer.write(content)
                  },
                  () => reject(new Error('无法写入 TXT 文件'))
                )
              },
              () => reject(new Error('无法创建 TXT 文件'))
            )
          },
          () => reject(new Error('无法创建图书目录'))
        )
      },
      () => reject(new Error('无法访问应用文件目录'))
    )
  })
}

function readAppFile(filePath) {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => {
        entry.file(
          (file) => {
            const reader = new plus.io.FileReader()
            reader.onloadend = (event) => resolve(event.target.result || '')
            reader.onerror = () => reject(new Error('读取图书内容失败'))
            reader.readAsText(file, 'utf-8')
          },
          () => reject(new Error('无法打开图书文件'))
        )
      },
      () => reject(new Error('图书文件不存在'))
    )
  })
}

function removeAppFile(filePath) {
  return new Promise((resolve) => {
    if (!filePath) {
      resolve()
      return
    }

    plus.io.resolveLocalFileSystemURL(
      filePath,
      (entry) => entry.remove(resolve, resolve),
      resolve
    )
  })
}

export function listBooks() {
  const books = uni.getStorageSync(BOOKS_KEY)
  return Array.isArray(books) ? books : []
}

export function findBook(id) {
  return listBooks().find((book) => book.id === id)
}

export function updateBookProgress(id, progress) {
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const books = listBooks().map((book) =>
    book.id === id ? { ...book, progress: normalizedProgress } : book
  )

  uni.setStorageSync(BOOKS_KEY, books)
}

export function updateBookSharing(id, room) {
  const books = listBooks().map((book) =>
    book.id === id ? { ...book, sharing: sharingMetadata(room) } : book
  )
  uni.setStorageSync(BOOKS_KEY, books)
  return books.find((book) => book.id === id)
}

export function findBookByRoom(roomId) {
  return listBooks().find((book) => Number(book.sharing?.roomId) === Number(roomId))
}

export async function saveImportedBook(file) {
  const id = createBookId()
  let filePath = ''

  // #ifdef H5
  uni.setStorageSync(`${CONTENT_KEY_PREFIX}${id}`, file.content)
  // #endif

  // #ifdef APP-PLUS
  filePath = await writeAppFile(id, file.content)
  // #endif

  const book = {
    id,
    title: titleFromFileName(file.name),
    fileName: file.name,
    filePath,
    fileSize: file.size > 0 ? file.size : file.content.length,
    encoding: 'utf-8',
    sourceEncoding: file.encoding || 'utf-8',
    importedAt: Date.now(),
    progress: 0
  }

  const books = [book, ...listBooks()]
  uni.setStorageSync(BOOKS_KEY, books)

  return book
}

export async function saveJoinedBook(result) {
  const existing = findBookByRoom(result.room.id)
  if (existing) {
    return updateBookSharing(existing.id, result.room)
  }

  const id = createBookId()
  let filePath = ''

  // #ifdef H5
  uni.setStorageSync(`${CONTENT_KEY_PREFIX}${id}`, result.content)
  // #endif

  // #ifdef APP-PLUS
  filePath = await writeAppFile(id, result.content)
  // #endif

  const book = {
    id,
    title: result.room.book.title,
    fileName: result.room.book.file_name,
    filePath,
    fileSize: result.room.book.file_size,
    encoding: result.room.book.encoding,
    importedAt: Date.now(),
    progress: 0,
    source: 'shared',
    sharing: sharingMetadata(result.room)
  }

  uni.setStorageSync(BOOKS_KEY, [book, ...listBooks()])
  return book
}

export async function readBookContent(book) {
  if (!book) {
    throw new Error('没有找到这本书')
  }

  // #ifdef H5
  return uni.getStorageSync(`${CONTENT_KEY_PREFIX}${book.id}`) || ''
  // #endif

  // #ifdef APP-PLUS
  return readAppFile(book.filePath)
  // #endif

  // #ifndef H5 || APP-PLUS
  return ''
  // #endif
}

export async function deleteBook(book) {
  if (!book) return

  clearLocalReadingData(book.id)

  // #ifdef H5
  uni.removeStorageSync(`${CONTENT_KEY_PREFIX}${book.id}`)
  // #endif

  // #ifdef APP-PLUS
  await removeAppFile(book.filePath)
  // #endif

  const remainingBooks = listBooks().filter((item) => item.id !== book.id)
  uni.setStorageSync(BOOKS_KEY, remainingBooks)
}
