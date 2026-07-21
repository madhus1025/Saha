import { test, expect, type APIRequestContext } from '@playwright/test'
import { apiContext, seedCompleteCouple, loginViaUi, type SeededCouple } from './fixtures'

/** Profile: viewing own + partner details, editing with validation, and the read-only partner view. */

let api: APIRequestContext
let couple: SeededCouple

test.beforeAll(async () => {
  api = await apiContext()
  couple = await seedCompleteCouple(api, 'prof')
})
test.afterAll(async () => {
  await api.dispose()
})

test.beforeEach(async ({ page }) => {
  await loginViaUi(page, couple.registrant.username)
  await page.goto('/profile')
})

test('My Profile shows the signed-in partner details', async ({ page }) => {
  await expect(page.getByRole('heading', { name: couple.registrant.name })).toBeVisible()
  await expect(page.getByText(`@${couple.registrant.username}`)).toBeVisible()
  await expect(page.getByText(couple.togetherID).first()).toBeVisible()
})

test('editing the profile persists the new name', async ({ page }) => {
  const newName = `Renamed ${Date.now()}`
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Full Name').fill(newName)
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(page.getByText('Profile updated').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: newName })).toBeVisible()

  // Survives a reload (persisted server-side, not just local state).
  await page.reload()
  await expect(page.getByRole('heading', { name: newName })).toBeVisible({ timeout: 15_000 })
})

test('edit form rejects an invalid email and phone number', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Phone Number').fill('123')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Enter a valid email')).toBeVisible()
  await expect(page.getByText('Enter a valid phone number')).toBeVisible()
})

test('the partner tab is read-only (no edit control)', async ({ page }) => {
  await page.getByRole('button', { name: /'s Profile/ }).click()
  await expect(page.getByText(`@${couple.partner.username}`)).toBeVisible()
  // No "Edit" button on the partner's profile.
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0)
})

test('"View as partner" enters a read-only banner mode that can be exited', async ({ page }) => {
  await page.getByRole('button', { name: /'s Profile/ }).click()
  await page.getByRole('button', { name: 'View as partner' }).click()
  await expect(page.getByText(/Read Only Mode/)).toBeVisible()
  await page.getByRole('button', { name: 'Exit partner view' }).click()
  await expect(page.getByText(/Read Only Mode/)).toHaveCount(0)
})
