import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BASE_URL
const ACCEPTED_FILES = '.pdf,image/jpeg,image/png'

function idOf(requirement) {
  return requirement.requirementId || requirement.id || requirement._id
}

function RequiredDocumentsPicker({ requirements = [], selectedDocuments = [], onChange, disabled = false, title = 'Required documents' }) {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(requirements.length))
  const [uploadingRequirement, setUploadingRequirement] = useState('')
  const [error, setError] = useState('')

  const normalizedRequirements = useMemo(() => requirements.map((requirement) => ({ ...requirement, requirementId: idOf(requirement) })).filter((requirement) => requirement.requirementId), [requirements])
  const selection = useMemo(() => Object.fromEntries(selectedDocuments
    .filter((entry) => entry?.requirementId && entry?.documentId)
    .map((entry) => [entry.requirementId, entry.documentId])), [selectedDocuments])

  useEffect(() => {
    if (!normalizedRequirements.length) return undefined

    let isCurrent = true
    axios.get(`${BASE_URL}/tenant-documents`, { withCredentials: true })
      .then((response) => {
        if (!response.data?.success) throw new Error(response.data?.message || 'Unable to load your vault')
        if (isCurrent) setDocuments(response.data.data.documents || [])
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.response?.data?.message || requestError.message || 'Unable to load your vault')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [normalizedRequirements])

  const updateSelection = (requirementId, documentId) => {
    const next = { ...selection, [requirementId]: documentId }
    onChange?.(Object.entries(next).filter(([, id]) => id).map(([selectedRequirementId, selectedDocumentId]) => ({ requirementId: selectedRequirementId, documentId: selectedDocumentId })))
  }

  const uploadForRequirement = async (requirement, file) => {
    if (!file) return

    setError('')
    setUploadingRequirement(requirement.requirementId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('label', requirement.name)
      const response = await axios.post(`${BASE_URL}/tenant-documents`, formData, { withCredentials: true })
      const document = response.data?.data?.document
      if (!response.data?.success || !document) throw new Error(response.data?.message || 'Unable to upload document')

      setDocuments((current) => [document, ...current])
      updateSelection(requirement.requirementId, document.id)
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to upload document')
    } finally {
      setUploadingRequirement('')
    }
  }

  if (!normalizedRequirements.length) return null

  return (
    <section className="rounded-2xl border border-ink/12 bg-paper/60 p-4">
      <h3 className="font-display text-[15.5px] font-semibold tracking-[-.02em]">{title}</h3>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">Select a file already in your vault, or upload it now. Only the selected file is shared with this landlord.</p>
      {isLoading && <p className="mt-3 text-[13.5px] text-muted">Loading your document vault…</p>}

      {!isLoading && (
        <div className="mt-4 space-y-4">
          {normalizedRequirements.map((requirement) => {
            const isUploading = uploadingRequirement === requirement.requirementId

            return (
              <div key={requirement.requirementId} className="rounded-xl border border-ink/12 bg-card p-3.5">
                <label className="block font-mono text-[10.5px] uppercase tracking-[.14em] text-faint">
                  {requirement.name}
                  <select value={selection[requirement.requirementId] || ''} onChange={(event) => updateSelection(requirement.requirementId, event.target.value)} disabled={disabled || isUploading} required className="mt-1.5 w-full cursor-pointer rounded-xl border border-ink/20 bg-card px-3 py-2.5 font-sans text-[14px] tracking-normal text-ink normal-case outline-none transition-colors focus:border-ink disabled:cursor-not-allowed disabled:opacity-55">
                    <option value="">Choose a vault document</option>
                    {documents.map((document) => {
                      const selectedElsewhere = Object.entries(selection).some(([otherRequirement, selectedDocumentId]) => otherRequirement !== requirement.requirementId && selectedDocumentId === document.id)
                      return <option key={document.id} value={document.id} disabled={selectedElsewhere}>{document.label} — {document.originalName}</option>
                    })}
                  </select>
                </label>
                <label className="mt-3 block text-[12.5px] text-muted">
                  Or upload {requirement.name} now <span className="text-faint">(PDF, JPEG, PNG; max 10 MB)</span>
                  <input type="file" accept={ACCEPTED_FILES} onChange={(event) => uploadForRequirement(requirement, event.target.files?.[0])} disabled={disabled || isUploading} className="mt-1.5 block w-full cursor-pointer text-[13px] text-muted file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-3.5 file:py-1.5 file:text-[12.5px] file:font-medium file:text-[#F7F5EF] hover:file:bg-clay disabled:opacity-55" />
                </label>
                {isUploading && <p className="mt-2 text-[12px] text-faint">Uploading to your vault…</p>}
              </div>
            )
          })}
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[13.5px] text-clay">{error}</p>}
    </section>
  )
}

export default RequiredDocumentsPicker
