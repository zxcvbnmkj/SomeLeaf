const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'
).replace(/\/$/, '')

const TOKEN_STORAGE_KEY = 'someleaf_access_token'
const USER_STORAGE_KEY = 'someleaf_current_user'

export class ApiError extends Error {
  constructor(message, statusCode = 0) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

function errorMessage(data, fallback) {
  if (typeof data?.detail === 'string') return data.detail

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item?.msg)
      .filter(Boolean)
      .join('；') || fallback
  }

  return fallback
}

export function apiRequest(path, { method = 'GET', data, authenticated = false } = {}) {
  const token = getAccessToken()
  const header = {
    'Content-Type': 'application/json'
  }

  if (authenticated && token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header,
      success: ({ statusCode, data: responseData }) => {
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData)
          return
        }

        if (statusCode === 401 && authenticated) {
          clearSession()
        }

        reject(new ApiError(
          errorMessage(responseData, `请求失败（${statusCode}）`),
          statusCode
        ))
      },
      fail: () => {
        reject(new ApiError('无法连接服务器，请确认后端已经启动'))
      }
    })
  })
}

function saveSession(session) {
  uni.setStorageSync(TOKEN_STORAGE_KEY, session.access_token)
  uni.setStorageSync(USER_STORAGE_KEY, session.user)
  return session.user
}

export function getAccessToken() {
  return uni.getStorageSync(TOKEN_STORAGE_KEY) || ''
}

export function getStoredUser() {
  return uni.getStorageSync(USER_STORAGE_KEY) || null
}

export function clearSession() {
  uni.removeStorageSync(TOKEN_STORAGE_KEY)
  uni.removeStorageSync(USER_STORAGE_KEY)
}

export async function register(username, password) {
  const session = await apiRequest('/auth/register', {
    method: 'POST',
    data: { username, password }
  })
  return saveSession(session)
}

export async function login(username, password) {
  const session = await apiRequest('/auth/login', {
    method: 'POST',
    data: { username, password }
  })
  return saveSession(session)
}

export async function getCurrentUser() {
  const user = await apiRequest('/auth/me', { authenticated: true })
  uni.setStorageSync(USER_STORAGE_KEY, user)
  return user
}
