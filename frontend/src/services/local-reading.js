const ANNOTATION_KEY_PREFIX = 'someleaf:local-annotations:'
const NOTE_KEY_PREFIX = 'someleaf:local-notes:'

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function readList(key) {
  const value = uni.getStorageSync(key)
  return Array.isArray(value) ? value : []
}

function writeList(key, value) {
  uni.setStorageSync(key, value)
  return value
}

function annotationKey(bookId) {
  return `${ANNOTATION_KEY_PREFIX}${bookId}`
}

function noteKey(bookId) {
  return `${NOTE_KEY_PREFIX}${bookId}`
}

export function listLocalAnnotations(bookId) {
  return readList(annotationKey(bookId)).sort(
    (left, right) => left.start_offset - right.start_offset ||
      new Date(left.created_at) - new Date(right.created_at)
  )
}

export function createLocalAnnotation(bookId, payload) {
  const now = new Date().toISOString()
  const annotation = {
    id: createId('annotation'),
    user_id: 0,
    username: '我',
    start_offset: payload.start_offset,
    end_offset: payload.end_offset,
    quote: payload.quote,
    comment: payload.comment || null,
    created_at: now,
    updated_at: now,
    local: true
  }
  writeList(annotationKey(bookId), [...listLocalAnnotations(bookId), annotation])
  return annotation
}

export function updateLocalAnnotation(bookId, annotationId, comment) {
  let updated = null
  const annotations = listLocalAnnotations(bookId).map((item) => {
    if (item.id !== annotationId) return item
    updated = {
      ...item,
      comment: comment || null,
      updated_at: new Date().toISOString()
    }
    return updated
  })
  writeList(annotationKey(bookId), annotations)
  return updated
}

export function deleteLocalAnnotation(bookId, annotationId) {
  writeList(
    annotationKey(bookId),
    listLocalAnnotations(bookId).filter((item) => item.id !== annotationId)
  )
}

export function listLocalNotes(bookId) {
  return readList(noteKey(bookId)).sort(
    (left, right) => new Date(right.created_at) - new Date(left.created_at)
  )
}

export function createLocalNote(bookId, payload) {
  const now = new Date().toISOString()
  const note = {
    id: createId('note'),
    user_id: 0,
    username: '我',
    title: payload.title || null,
    content: payload.content,
    anchor_offset: payload.anchor_offset,
    quote: payload.quote || null,
    created_at: now,
    updated_at: now,
    local: true
  }
  writeList(noteKey(bookId), [note, ...listLocalNotes(bookId)])
  return note
}

export function updateLocalNote(bookId, noteId, payload) {
  let updated = null
  const notes = listLocalNotes(bookId).map((item) => {
    if (item.id !== noteId) return item
    updated = {
      ...item,
      ...payload,
      updated_at: new Date().toISOString()
    }
    return updated
  })
  writeList(noteKey(bookId), notes)
  return updated
}

export function deleteLocalNote(bookId, noteId) {
  writeList(
    noteKey(bookId),
    listLocalNotes(bookId).filter((item) => item.id !== noteId)
  )
}

export function clearLocalReadingData(bookId) {
  uni.removeStorageSync(annotationKey(bookId))
  uni.removeStorageSync(noteKey(bookId))
}
