import axios from 'axios'
import { CalendarClock, Download, FileText, LockKeyhole, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadFile } from '../../download'

const BASE_URL = import.meta.env.VITE_BASE_URL
const ACCEPTED_FILES = '.pdf,image/jpeg,image/png'
const inputClass = 'mt-2 w-full rounded-xl border border-ink/15 bg-card px-3 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-faint/80 focus:border-ink/55 focus:ring-2 focus:ring-lime/55 disabled:cursor-not-allowed disabled:bg-ink/5'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
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

    return () => { isCurrent = false }
  }, [])

  const download = async (document) => {
    setError('')

    try {
      await downloadFile(`${BASE_URL}/tenant-documents/${document.id}/download`, document.originalName)
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to download the document')
    }
  }

  const uploadDocument = async () => {
    setError('')
    setNotice('')

    if (label.trim().length < 2) {
      setError('Add a document name with at least 2 characters')
      return
    }

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
    <section aria-labelledby="vault-heading" className="overflow-hidden rounded-2xl border border-ink/15 bg-card/90 shadow-[0_22px_48px_-40px_rgba(21,19,15,.75)]">
      <div className="border-b border-ink/12 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-faint">Private documents</p><h2 id="vault-heading" className="mt-2 font-display text-[21px] font-bold tracking-[-.035em]">Document vault</h2></div><span className="grid size-9 place-items-center rounded-xl bg-forest text-lime"><LockKeyhole aria-hidden className="size-[17px]" /></span></div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Keep rental paperwork ready, then choose exactly what to share.</p>
      </div>

      <div className="p-5">
        <div className="grid gap-3">
          <label className="block font-mono text-[10px] uppercase tracking-[.12em] text-faint">Document name<input value={label} onChange={(event) => setLabel(event.target.value)} required minLength="2" maxLength="100" placeholder="Aadhaar card, visa…" disabled={isUploading} className={inputClass} /></label>
          <label className="block font-mono text-[10px] uppercase tracking-[.12em] text-faint">Expiry date <span className="normal-case tracking-normal">(optional)</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={isUploading} className={inputClass} /></label>
          <label className="block"><span className="font-mono text-[10px] uppercase tracking-[.12em] text-faint">File <span className="normal-case tracking-normal">(PDF, JPEG or PNG; max 10 MB)</span></span><input type="file" accept={ACCEPTED_FILES} onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={isUploading} required className="mt-2 block w-full cursor-pointer text-[12px] text-muted file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-ink/7 file:px-2.5 file:py-2 file:text-[12px] file:font-medium file:text-ink hover:file:bg-ink/12 disabled:opacity-60" /></label>
          <button type="button" onClick={uploadDocument} disabled={isUploading} className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink/20 px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-[#F7F5EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60"><Upload aria-hidden className="size-3.5" />{isUploading ? 'Uploading…' : 'Add a document'}</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-clay/25 bg-clay/8 px-3 py-2.5 text-[12px] leading-relaxed text-clay">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-forest/8 px-3 py-2.5 text-[12px] leading-relaxed text-forest">{notice}</p>}

        {isLoading && <div aria-busy="true" className="mt-5 grid gap-2"><span className="h-14 animate-pulse rounded-xl bg-ink/6" /><span className="h-14 animate-pulse rounded-xl bg-ink/6" /></div>}
        {!isLoading && !documents.length && <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-ink/20 bg-ink/3 px-4 py-6 text-center"><FileText aria-hidden className="size-5 text-forest" /><p className="mt-2 text-[12.5px] font-medium">Your vault is empty.</p><p className="mt-1 text-[11.5px] leading-relaxed text-muted">Upload a document to keep it handy for a rental request.</p></div>}

        {!isLoading && documents.length > 0 && (
          <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
            {documents.map((document) => (
              <li key={document.id} className="py-3.5">
                <div className="flex items-start gap-3"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-ink/5 text-forest"><FileText aria-hidden className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-ink">{document.label}</p><p className="mt-1 text-[11px] leading-relaxed text-muted">{document.originalName} · {formatSize(document.size)}{document.expiresAt && <><span aria-hidden> · </span><span className="inline-flex items-center gap-1"><CalendarClock aria-hidden className="size-3" />{formatDate(document.expiresAt)}</span></>}</p></div></div>
                <div className="mt-3 flex items-center gap-3 pl-11"><button type="button" onClick={() => download(document)} className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-medium text-ink transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"><Download aria-hidden className="size-3.5" />Download</button><button type="button" onClick={() => deleteDocument(document)} disabled={deletingId === document.id} className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-progress disabled:opacity-60"><Trash2 aria-hidden className="size-3.5" />{deletingId === document.id ? 'Deleting…' : 'Delete'}</button></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default DocumentVault
