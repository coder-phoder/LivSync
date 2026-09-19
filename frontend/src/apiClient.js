import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_BASE_URL?.trim()

export const api = axios.create({
  baseURL: configuredBaseUrl?.replace(/\/+$/, '') || 'http://localhost:4000',
  withCredentials: true,
  timeout: 20_000,
})

export function requestErrorMessage(error, fallback) {
  if (!error.response) {
    return 'We could not reach LivSync. Check your connection and try again.'
  }

  return error.response.data?.message || fallback
}
