import { apiRequest } from '@/services/auth'


export function createReadingRoom(book, content) {
  return apiRequest('/rooms', {
    method: 'POST',
    authenticated: true,
    data: {
      title: book.title,
      file_name: book.fileName,
      content,
      chapters: book.chapters || []
    }
  })
}

export function joinReadingRoom(inviteCode) {
  return apiRequest('/rooms/join', {
    method: 'POST',
    authenticated: true,
    data: { invite_code: inviteCode }
  })
}

export function getReadingRoom(roomId) {
  return apiRequest(`/rooms/${roomId}`, { authenticated: true })
}

export function closeReadingRoom(roomId) {
  return apiRequest(`/rooms/${roomId}/close`, {
    method: 'POST',
    authenticated: true
  })
}

export function listAnnotations(roomId) {
  return apiRequest(`/rooms/${roomId}/annotations`, { authenticated: true })
}

export function createAnnotation(roomId, payload) {
  return apiRequest(`/rooms/${roomId}/annotations`, {
    method: 'POST',
    authenticated: true,
    data: payload
  })
}

export function updateAnnotation(roomId, annotationId, comment) {
  return apiRequest(`/rooms/${roomId}/annotations/${annotationId}`, {
    method: 'PATCH',
    authenticated: true,
    data: { comment }
  })
}

export function deleteAnnotation(roomId, annotationId) {
  return apiRequest(`/rooms/${roomId}/annotations/${annotationId}`, {
    method: 'DELETE',
    authenticated: true
  })
}

export function listNotes(roomId) {
  return apiRequest(`/rooms/${roomId}/notes`, { authenticated: true })
}

export function createNote(roomId, payload) {
  return apiRequest(`/rooms/${roomId}/notes`, {
    method: 'POST',
    authenticated: true,
    data: payload
  })
}

export function updateNote(roomId, noteId, payload) {
  return apiRequest(`/rooms/${roomId}/notes/${noteId}`, {
    method: 'PATCH',
    authenticated: true,
    data: payload
  })
}

export function deleteNote(roomId, noteId) {
  return apiRequest(`/rooms/${roomId}/notes/${noteId}`, {
    method: 'DELETE',
    authenticated: true
  })
}
