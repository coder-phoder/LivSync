import { useState } from 'react'

const PROPERTY_TYPES = ['apartment', 'house', 'studio', 'villa', 'room']
const ROOM_TYPES = ['entire-place', 'private-room', 'shared-room']
const LISTING_STATUSES = ['published', 'rented', 'archived']
const COMMON_DOCUMENTS = ['Aadhaar card', 'PAN card', 'Passport', 'Visa']

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}

function createFormData(listing) {
  return {
    title: listing?.title || '',
    description: listing?.description || '',
    propertyType: listing?.propertyType || 'apartment',
    roomType: listing?.roomType || 'entire-place',
    address: listing?.location?.address || '',
    city: listing?.location?.city || '',
    state: listing?.location?.state || '',
    postalCode: listing?.location?.postalCode || '',
    bedrooms: listing?.bedrooms ?? 1,
    bathrooms: listing?.bathrooms ?? 1,
    areaSqFt: listing?.areaSqFt ?? '',
    furnished: listing?.furnished || false,
    coldRent: listing?.rent?.coldRent ?? '',
    utilities: listing?.rent?.utilities ?? 0,
    otherMonthlyCharges: listing?.rent?.otherMonthlyCharges ?? 0,
    securityDeposit: listing?.securityDeposit ?? 0,
    brokerageFee: listing?.brokerageFee ?? 0,
    floorPlanUrl: listing?.floorPlanUrl || '',
    virtualTourUrl: listing?.virtualTourUrl || '',
    modelUrl: listing?.modelUrl || '',
    mediaFolderUrl: listing?.mediaFolderUrl || '',
    amenities: listing?.amenities?.join(', ') || '',
    documentRequirements: (listing?.documentRequirements || []).map((requirement) => requirement.name).filter(Boolean),
    customDocument: '',
    availableFrom: toDateInput(listing?.availableFrom),
    status: listing?.status || 'published',
  }
}

function ListingForm({ listing, onSave, onCancel, isSubmitting, error, inModal = false }) {
  const [form, setForm] = useState(() => createFormData(listing))

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: type === 'checkbox' ? checked : value }))
  }

  const toggleCommonDocument = (name) => {
    setForm((currentForm) => ({
      ...currentForm,
      documentRequirements: currentForm.documentRequirements.some((requirement) => requirement.toLocaleLowerCase() === name.toLocaleLowerCase())
        ? currentForm.documentRequirements.filter((requirement) => requirement.toLocaleLowerCase() !== name.toLocaleLowerCase())
        : [...currentForm.documentRequirements, name],
    }))
  }

  const addCustomDocument = () => {
    const name = form.customDocument.trim()

    if (!name || form.documentRequirements.some((requirement) => requirement.toLocaleLowerCase() === name.toLocaleLowerCase())) return

    setForm((currentForm) => ({
      ...currentForm,
      documentRequirements: [...currentForm.documentRequirements, name],
      customDocument: '',
    }))
  }

  const removeDocumentRequirement = (name) => {
    setForm((currentForm) => ({
      ...currentForm,
      documentRequirements: currentForm.documentRequirements.filter((requirement) => requirement !== name),
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      roomType: form.roomType,
      location: {
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
      },
      bedrooms: Number(form.bedrooms),
      bathrooms: Number(form.bathrooms),
      areaSqFt: Number(form.areaSqFt),
      furnished: form.furnished,
      rent: {
        coldRent: Number(form.coldRent),
        utilities: Number(form.utilities || 0),
        otherMonthlyCharges: Number(form.otherMonthlyCharges || 0),
      },
      securityDeposit: Number(form.securityDeposit || 0),
      brokerageFee: Number(form.brokerageFee || 0),
      ...(form.floorPlanUrl.trim() && { floorPlanUrl: form.floorPlanUrl.trim() }),
      ...(form.virtualTourUrl.trim() && { virtualTourUrl: form.virtualTourUrl.trim() }),
      ...(form.modelUrl.trim() && { modelUrl: form.modelUrl.trim() }),
      ...(form.mediaFolderUrl.trim() && { mediaFolderUrl: form.mediaFolderUrl.trim() }),
      amenities: form.amenities.split(',').map((amenity) => amenity.trim()).filter(Boolean),
      documentRequirements: form.documentRequirements.map((name) => ({ name })),
      availableFrom: form.availableFrom,
      status: form.status,
    })
  }

  return (
    <form className={inModal ? 'space-y-5 p-5 sm:p-6' : 'mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'} onSubmit={handleSubmit}>
      <div className="flex items-center justify-between gap-4">
        {!inModal && <h2 className="text-xl font-semibold">{listing ? 'Edit listing' : 'New listing'}</h2>}
        {inModal && <span className="text-sm text-slate-500">Review each section before publishing.</span>}
        {onCancel && <button type="button" onClick={onCancel} disabled={isSubmitting} className="text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>}
      </div>

      <label className="block text-sm font-medium text-slate-700" htmlFor="title">
        Title
        <input id="title" name="title" value={form.title} onChange={handleChange} required minLength="5" maxLength="120" disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" />
      </label>
      <label className="block text-sm font-medium text-slate-700" htmlFor="description">
        Description
        <textarea id="description" name="description" value={form.description} onChange={handleChange} required minLength="20" maxLength="3000" rows="4" disabled={isSubmitting} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="propertyType">
          Property type
          <select id="propertyType" name="propertyType" value={form.propertyType} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50">
            {PROPERTY_TYPES.map((type) => <option key={type} value={type} className="capitalize">{type}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="roomType">
          Room type
          <select id="roomType" name="roomType" value={form.roomType} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50">
            {ROOM_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('-', ' ')}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="address">Address<input id="address" name="address" value={form.address} onChange={handleChange} required minLength="5" disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="city">City<input id="city" name="city" value={form.city} onChange={handleChange} required minLength="2" disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="state">State<input id="state" name="state" value={form.state} onChange={handleChange} required minLength="2" disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="postalCode">Postal code<input id="postalCode" name="postalCode" value={form.postalCode} onChange={handleChange} required minLength="3" disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="bedrooms">Bedrooms<input id="bedrooms" name="bedrooms" type="number" min="0" max="50" value={form.bedrooms} onChange={handleChange} required disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="bathrooms">Bathrooms<input id="bathrooms" name="bathrooms" type="number" min="0" max="50" step="0.5" value={form.bathrooms} onChange={handleChange} required disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="areaSqFt">Area (sq ft)<input id="areaSqFt" name="areaSqFt" type="number" min="1" value={form.areaSqFt} onChange={handleChange} required disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700" htmlFor="furnished"><input id="furnished" name="furnished" type="checkbox" checked={form.furnished} onChange={handleChange} disabled={isSubmitting} className="size-4 accent-slate-900" /> Furnished</label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="coldRent">Monthly rent<input id="coldRent" name="coldRent" type="number" min="0" value={form.coldRent} onChange={handleChange} required disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="utilities">Utilities<input id="utilities" name="utilities" type="number" min="0" value={form.utilities} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="otherMonthlyCharges">Other charges<input id="otherMonthlyCharges" name="otherMonthlyCharges" type="number" min="0" value={form.otherMonthlyCharges} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="securityDeposit">Security deposit<input id="securityDeposit" name="securityDeposit" type="number" min="0" value={form.securityDeposit} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="brokerageFee">Brokerage fee<input id="brokerageFee" name="brokerageFee" type="number" min="0" value={form.brokerageFee} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="availableFrom">Available from<input id="availableFrom" name="availableFrom" type="date" value={form.availableFrom} onChange={handleChange} required disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      </div>

      <label className="block text-sm font-medium text-slate-700" htmlFor="amenities">Amenities <span className="font-normal text-slate-500">(comma separated)</span><input id="amenities" name="amenities" value={form.amenities} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4" aria-labelledby="document-requirements-heading">
        <h3 id="document-requirements-heading" className="text-sm font-semibold text-slate-900">Documents required to rent</h3>
        <p className="mt-1 text-xs text-slate-600">Ask for any documents you need. Tenants choose which private vault file to share with this application.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {COMMON_DOCUMENTS.map((name) => {
            const selected = form.documentRequirements.some((requirement) => requirement.toLocaleLowerCase() === name.toLocaleLowerCase())

            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleCommonDocument(name)}
                disabled={isSubmitting || (!selected && form.documentRequirements.length >= 12)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
              >
                {selected ? '✓ ' : ''}{name}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            name="customDocument"
            value={form.customDocument}
            onChange={handleChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomDocument()
              }
            }}
            maxLength="100"
            disabled={isSubmitting || form.documentRequirements.length >= 12}
            placeholder="Add another document, e.g. employment letter"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-700 disabled:bg-slate-100"
          />
          <button type="button" onClick={addCustomDocument} disabled={isSubmitting || !form.customDocument.trim() || form.documentRequirements.length >= 12} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">Add</button>
        </div>
        {form.documentRequirements.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {form.documentRequirements.map((name) => (
              <li key={name} className="flex items-center gap-1 rounded-full bg-slate-200 py-1 pl-3 pr-1 text-xs text-slate-800">
                {name}
                <button type="button" onClick={() => removeDocumentRequirement(name)} disabled={isSubmitting} aria-label={`Remove ${name}`} className="rounded-full px-1.5 py-0.5 text-slate-600 hover:bg-slate-300 hover:text-slate-950 disabled:opacity-60">×</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">{form.documentRequirements.length}/12 documents requested</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="floorPlanUrl">Floor plan URL <span className="font-normal text-slate-500">(optional)</span><input id="floorPlanUrl" name="floorPlanUrl" type="url" value={form.floorPlanUrl} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="virtualTourUrl">Virtual tour URL <span className="font-normal text-slate-500">(optional)</span><input id="virtualTourUrl" name="virtualTourUrl" type="url" value={form.virtualTourUrl} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      </div>
      <label className="block text-sm font-medium text-slate-700" htmlFor="modelUrl">3D model <span className="font-normal text-slate-500">(optional Google Drive link to a .glb file, shared as “anyone with the link”)</span><input id="modelUrl" name="modelUrl" type="url" placeholder="https://drive.google.com/file/d/FILE_ID/view" value={form.modelUrl} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      <label className="block text-sm font-medium text-slate-700" htmlFor="mediaFolderUrl">Listing photos &amp; videos <span className="font-normal text-slate-500">(Google Drive folder shared as “anyone with the link” — every image and video in it becomes this listing&apos;s gallery. Save again after adding files to pick them up.)</span><input id="mediaFolderUrl" name="mediaFolderUrl" type="url" placeholder="https://drive.google.com/drive/folders/FOLDER_ID" value={form.mediaFolderUrl} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50" /></label>
      <label className="block text-sm font-medium text-slate-700" htmlFor="status">Listing status<select id="status" name="status" value={form.status} onChange={handleChange} disabled={isSubmitting} className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-700 disabled:bg-slate-50">{LISTING_STATUSES.map((status) => <option key={status} value={status} className="capitalize">{status}</option>)}</select></label>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Saving…' : listing ? 'Save changes' : 'Create listing'}</button>
    </form>
  )
}

export default ListingForm
