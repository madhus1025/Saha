import { test, expect } from '@playwright/test'
import { apiContext, seedCouple, loginViaUi } from './fixtures'

/**
 * Real end-to-end Connect flow across TWO independent couple accounts, each in its own browser
 * context, talking to the real backend. Seeds fresh unique couples per run so it is repeatable.
 */
test.describe('Connect (real backend)', () => {
  test('couple A searches, requests, and couple B accepts — both see the connection', async ({
    browser,
  }) => {
    const api = await apiContext()
    const A = await seedCouple(api, 'CA')
    const B = await seedCouple(api, 'CB')
    await api.dispose()

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    // --- A: find couple B and send a request -------------------------------------------------
    await loginViaUi(pageA, A.husband.username)
    await pageA.goto('/connect')
    await pageA.getByRole('button', { name: 'Find Couples' }).first().click()
    await pageA.getByPlaceholder(/Search by Together ID/).fill(B.togetherID)

    // Search result for B appears
    await expect(pageA.getByText(B.togetherID)).toBeVisible()
    await pageA.getByRole('button', { name: 'Connect', exact: true }).click()

    // The outgoing request shows up under A's Pending tab
    await pageA.getByRole('button', { name: 'Pending' }).click()
    await expect(pageA.getByText(B.togetherID)).toBeVisible()
    await expect(pageA.getByText('Request sent by you')).toBeVisible()

    // --- B: sees the incoming request and accepts --------------------------------------------
    await loginViaUi(pageB, B.husband.username)
    await pageB.goto('/connect')
    await pageB.getByRole('button', { name: 'Pending' }).click()
    await expect(pageB.getByText(A.togetherID)).toBeVisible()
    await expect(pageB.getByText('Request received')).toBeVisible()
    await pageB.getByRole('button', { name: 'Accept' }).click()

    // B now lists A under Connected
    await pageB.getByRole('button', { name: 'Connected' }).click()
    await expect(pageB.getByText(A.togetherID)).toBeVisible()

    // --- A: the accepted connection now appears under Connected ------------------------------
    await pageA.getByRole('button', { name: 'Connected' }).click()
    await expect(pageA.getByText(B.togetherID)).toBeVisible()

    await ctxA.close()
    await ctxB.close()
  })

  test('couple B can reject an incoming request', async ({ browser }) => {
    const api = await apiContext()
    const A = await seedCouple(api, 'RA')
    const B = await seedCouple(api, 'RB')
    await api.dispose()

    const ctxA = await browser.newContext()
    const ctxB = await browser.newContext()
    const pageA = await ctxA.newPage()
    const pageB = await ctxB.newPage()

    await loginViaUi(pageA, A.husband.username)
    await pageA.goto('/connect')
    await pageA.getByRole('button', { name: 'Find Couples' }).first().click()
    await pageA.getByPlaceholder(/Search by Together ID/).fill(B.togetherID)
    await expect(pageA.getByText(B.togetherID)).toBeVisible()
    await pageA.getByRole('button', { name: 'Connect', exact: true }).click()

    await loginViaUi(pageB, B.husband.username)
    await pageB.goto('/connect')
    await pageB.getByRole('button', { name: 'Pending' }).click()
    await expect(pageB.getByText(A.togetherID)).toBeVisible()
    // Reject button is the icon-only outline button next to Accept.
    await pageB.getByRole('button', { name: 'Accept' }).locator('xpath=preceding-sibling::button').click()

    // After rejecting, the request disappears from B's pending list.
    await expect(pageB.getByText(A.togetherID)).toBeHidden()

    // And A should NOT see B under Connected.
    await pageA.getByRole('button', { name: 'Connected' }).click()
    await expect(pageA.getByText(B.togetherID)).toBeHidden()

    await ctxA.close()
    await ctxB.close()
  })
})
