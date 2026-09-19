import axios from 'axios'

const FILENAME = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i

// The server names these files; that name only reaches us if CORS exposes Content-Disposition.
export function fileNameFrom(header, fallback) {
  const match = FILENAME.exec(header || '')

  if (!match) return fallback

  try {
    return decodeURIComponent(match[1].trim())
  } catch {
    return match[1].trim()
  }
}

// Protected files cannot be linked to: a browser navigation carries no Authorization header, so the
// request arrives signed out. Both helpers below fetch through axios, which does carry the session,
// and then hand the bytes to the browser as a blob.
async function fetchAsBlobUrl(url) {
  const response = await axios.get(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(response.data)

  // Revoking in the same tick cancels the transfer in Firefox, so let the browser take it first.
  // After this the blob is gone, so reloading the opened tab will not find it again.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)

  return { objectUrl, name: fileNameFrom(response.headers['content-disposition'], null) }
}

function saveToDisk(objectUrl, name) {
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// Opens the file in its own tab, for documents meant to be read rather than kept.
//
// The tab is claimed synchronously, before the request goes out: a browser only honours
// window.open while the click that triggered it is still the current user gesture, and awaiting
// the download ends that. If a blocker refuses the tab anyway, the file is saved instead so the
// click is never a no-op.
export async function openFile(url, fallbackName) {
  const tab = window.open('', '_blank')

  if (tab) tab.document.write('Preparing your document…')

  try {
    const { objectUrl, name } = await fetchAsBlobUrl(url)

    if (tab) {
      tab.location = objectUrl
      return
    }

    saveToDisk(objectUrl, name || fallbackName)
  } catch (error) {
    if (tab) tab.close()
    throw error
  }
}

// Saves the file, for documents the server sends as an attachment.
export async function downloadFile(url, fallbackName) {
  const { objectUrl, name } = await fetchAsBlobUrl(url)

  saveToDisk(objectUrl, name || fallbackName)
}
