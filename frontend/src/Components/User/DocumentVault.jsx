import axios from 'axios'
import { downloadFile } from '../../download'
import { useEffect, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BASE_URL
const ACCEPTED_FILES = '.pdf,image/jpeg,image/png'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : ''
}

function DocumentVault() {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [label, setLabel] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [file, setFile] = useState(null)

  useEffect(() => {
    let isCurrent = true

    axios.get(`${BASE_URL}/tenant-documents`, { withCredentials: true })
      .then((response) => {
        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load documents')
        if (!isCurrent) return
        setDocuments(response.data.data.documents || [])
        setError('')
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.response?.data?.message || requestError.message || 'Unable to load documents')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  // A link cannot carry the session token, so the file is fetched and handed to the browser.
  const download = async (document) => {
    setError('')

    try {
      await downloadFile(`${BASE_URL}/tenant-documents/${document.id}/download`, document.originalName)
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to download the document')
    }
  }

  const uploadDocument = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!file) {
      setError('Choose a PDF, JPEG, or PNG file to upload')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('label', label)
      if (expiresAt) formData.append('expiresAt', expiresAt)

      const response = await axios.post(`${BASE_URL}/tenant-documents`, formData, { withCredentials: true })
      const document = response.data?.data?.document
      if (!response.data?.success || !document) throw new Error(response.data?.message || 'Unable to upload document')

      setDocuments((current) => [document, ...current])
      setLabel('')
      setExpiresAt('')
      setFile(null)
      setNotice('Document saved to your private vault')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const deleteDocument = async (document) => {
    if (!window.confirm(`Delete ${document.label}? This removes the file from your vault.`)) return

    setDeletingId(document.id)
    setError('')
    setNotice('')
    try {
      const response = await axios.delete(`${BASE_URL}/tenant-documents/${document.id}`, { withCredentials: true })
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to delete document')
      setDocuments((current) => current.filter((entry) => entry.id !== document.id))
      setNotice('Document deleted from your vault')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to delete document')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Document vault</h2>
        <p className="mt-1 text-sm text-slate-600">Keep identity and rental documents here, then choose exactly which files to share with each landlord.</p>
      </div>

      <form onSubmit={uploadDocument} className="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-700">
          Document name
          <input value={label} onChange={(event) => setLabel(event.target.value)} required minLength="2" maxLength="100" placeholder="Aadhaar card, visa, employment letter…" disabled={isUploading} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-700 disabled:bg-slate-100" />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Expiry date <span className="font-normal text-slate-500">(optional)</span>
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={isUploading} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-700 disabled:bg-slate-100" />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          File <span className="font-normal text-slate-500">(PDF, JPEG, or PNG; up to 10 MB)</span>
          <input type="file" accept={ACCEPTED_FILES} onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={isUploading} required className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-300 disabled:opacity-60" />
        </label>
        <button type="submit" disabled={isUploading} className="justify-self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isUploading ? 'Uploading…' : 'Add to vault'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {isLoading && <p className="mt-5 text-sm text-slate-600">Loading your documents…</p>}
      {!isLoading && !documents.length && <p className="mt-5 text-sm text-slate-600">No documents saved yet.</p>}

      {!isLoading && documents.length > 0 && (
        <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-800">{document.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{document.originalName} · {formatSize(document.size)}{document.expiresAt ? ` · expires ${formatDate(document.expiresAt)}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => download(document)} className="text-sm font-medium text-slate-700 underline hover:text-slate-950">Download</button>
                <button type="button" onClick={() => deleteDocument(document)} disabled={deletingId === document.id} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60">{deletingId === document.id ? 'Deleting…' : 'Delete'}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DocumentVault
