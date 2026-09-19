import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLandlordSignals } from './landlordHomeSignals.js'

const tomorrow = new Date(Date.now() + 24 * 3600000).toISOString()

test('a live landlord call is the highest priority', () => {
  const { needsYou } = buildLandlordSignals({
    landlord: { emailVerified: false, hasSignature: false },
    calls: [{ id: 'call-1', joinable: true, listing: { title: 'Baner Road' }, counterpart: { name: 'Rhea' } }],
  })

  assert.equal(needsYou[0].id, 'call-live-call-1')
  assert.equal(needsYou[1].id, 'verify')
})

test('a pending application and a requested call are surfaced as decisions', () => {
  const { needsYou } = buildLandlordSignals({
    landlord: { emailVerified: true, hasSignature: true },
    rentals: [{ id: 'rental-1', status: 'pending', createdAt: new Date().toISOString(), tenants: [{ name: 'Rhea' }], listing: { title: 'Baner Road' } }],
    calls: [{ id: 'call-2', status: 'requested', mode: 'video', counterpart: { name: 'Ari' }, listing: { title: 'Aundh House' } }],
  })

  assert.equal(needsYou[0].id, 'application-rental-1')
  assert.equal(needsYou[1].id, 'schedule-call-2')
})

test('accepted applications and future calls sit in motion instead of the decision queue', () => {
  const { needsYou, inMotion, counts } = buildLandlordSignals({
    landlord: { emailVerified: true, hasSignature: true },
    listings: [{ status: 'published' }, { status: 'rented' }, { status: 'archived' }],
    rentals: [{ id: 'rental-2', status: 'accepted', tenants: [{ name: 'Rhea', payment: { paid: false } }], listing: { title: 'Koregaon Park' } }],
    calls: [{ id: 'call-3', status: 'scheduled', joinable: false, startAt: tomorrow, counterpart: { name: 'Ari' }, listing: { title: 'Aundh House' } }],
  })

  assert.equal(needsYou.length, 0)
  assert.equal(inMotion.length, 2)
  assert.equal(counts.published, 1)
  assert.equal(counts.scheduled, 1)
})
