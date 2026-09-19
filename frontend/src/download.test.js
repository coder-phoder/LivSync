import assert from 'node:assert/strict'
import test from 'node:test'
import { fileNameFrom } from './download.js'

test('the server-chosen filename is used, however the header is spelled', () => {
  assert.equal(fileNameFrom('inline; filename="livsync-agreement-AGR-2026-014.pdf"', 'x.pdf'), 'livsync-agreement-AGR-2026-014.pdf')
  assert.equal(fileNameFrom('attachment; filename="aadhaar card.pdf"', 'x.pdf'), 'aadhaar card.pdf')
  assert.equal(fileNameFrom('attachment; filename=plain.pdf', 'x.pdf'), 'plain.pdf')
  assert.equal(fileNameFrom("attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf", 'x.pdf'), 'résumé.pdf')
})

test('an unreadable header falls back to the name the caller picked', () => {
  assert.equal(fileNameFrom(undefined, 'receipt.pdf'), 'receipt.pdf')
  assert.equal(fileNameFrom('', 'receipt.pdf'), 'receipt.pdf')
  assert.equal(fileNameFrom('inline', 'receipt.pdf'), 'receipt.pdf')
})

test('a half-escaped name is kept rather than thrown away', () => {
  assert.equal(fileNameFrom('attachment; filename="100%-paid.pdf"', 'x.pdf'), '100%-paid.pdf')
})
