import {
  deleteLocalAnnotation,
  deleteLocalNote,
  listLocalAnnotations,
  listLocalNotes
} from '@/services/local-reading'
import { createAnnotation, createNote } from '@/services/reading-rooms'

export async function syncLocalReadingToRoom(bookId, roomId) {
  const annotations = listLocalAnnotations(bookId)
  const notes = listLocalNotes(bookId)
  let uploaded = 0
  let failed = 0

  for (const item of annotations) {
    try {
      await createAnnotation(roomId, {
        start_offset: item.start_offset,
        end_offset: item.end_offset,
        comment: item.comment
      })
      deleteLocalAnnotation(bookId, item.id)
      uploaded += 1
    } catch (_) {
      failed += 1
    }
  }

  for (const item of notes) {
    try {
      await createNote(roomId, {
        title: item.title,
        content: item.content,
        anchor_offset: item.anchor_offset,
        quote: item.quote
      })
      deleteLocalNote(bookId, item.id)
      uploaded += 1
    } catch (_) {
      failed += 1
    }
  }

  return { uploaded, failed }
}
