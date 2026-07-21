import { test, expect } from '@playwright/test'

/** Fills step 1 with valid details and continues. */
async function completeStepOne(page: import('@playwright/test').Page, username = 'maya.k') {
  await page.getByLabel('Your name').fill('Maya Krishnan')
  await page.getByLabel('Username').fill(username)
  await page.locator('input[type="date"]').fill('1996-06-14')
  await page.getByRole('radio', { name: 'Wife' }).click()
  await page.getByLabel('Email').fill('maya@post.com')
  await page.getByLabel('Phone').fill('+31612048890')
  await page.getByRole('button', { name: /continue/i }).click()
}

test.describe('Registration wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('step 1 asks only for your own half @smoke', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'First, you' })).toBeVisible()
    await expect(page.getByText('Step 1 of 3')).toBeVisible()
    await expect(
      page.getByText('Your person fills in their own half when they arrive — you never type for them.'),
    ).toBeVisible()

    // Nothing on this screen refers to the other partner.
    await expect(page.getByText(/husband's details|wife's details/i)).toHaveCount(0)
  })

  test('role offers exactly Wife and Husband', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Wife' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Husband' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(2)
  })

  test('step 1 refuses someone under sixteen', async ({ page }) => {
    const almostSixteen = new Date()
    almostSixteen.setFullYear(almostSixteen.getFullYear() - 16)
    almostSixteen.setDate(almostSixteen.getDate() + 1)

    await page.getByLabel('Your name').fill('Too Young')
    await page.getByLabel('Username').fill('tooyoung')
    await page.locator('input[type="date"]').fill(almostSixteen.toISOString().slice(0, 10))
    await page.getByRole('radio', { name: 'Wife' }).click()
    await page.getByLabel('Email').fill('young@post.com')
    await page.getByLabel('Phone').fill('+31612048890')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page.getByText('You need to be at least 16.')).toBeVisible()
  })

  test('step 2 accepts a passphrase with no digits or symbols', async ({ page }) => {
    await completeStepOne(page)

    await expect(page.getByRole('heading', { name: 'One key for your home' })).toBeVisible()
    await expect(page.getByText('Step 2 of 3')).toBeVisible()

    await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple')
    await expect(page.getByText('Good — long and easy to say out loud')).toBeVisible()

    await page.getByLabel('Once more').fill('correct horse battery staple')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page.getByRole('heading', { name: 'The name on your door' })).toBeVisible()
  })

  test('step 2 blocks a password below twelve characters, however complex', async ({ page }) => {
    await completeStepOne(page)

    await page.getByLabel('Password', { exact: true }).fill('Sh0rt!Sh0rt')
    await page.getByLabel('Once more').fill('Sh0rt!Sh0rt')
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page.getByText('A little longer — at least 12 characters.')).toBeVisible()
  })

  test('step 2 warns about a weak passphrase without blocking it', async ({ page }) => {
    await completeStepOne(page)

    const weakButValid = 'aaaaaaaaaaaa' // 12 chars, low entropy
    await page.getByLabel('Password', { exact: true }).fill(weakButValid)
    await page.getByLabel('Once more').fill(weakButValid)
    await page.getByRole('button', { name: /continue/i }).click()

    // Nothing scolds; Continue still works.
    await expect(page.getByRole('heading', { name: 'The name on your door' })).toBeVisible()
  })

  test('step 3 uppercases the TogetherID as you type', async ({ page }) => {
    await completeStepOne(page)
    await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple')
    await page.getByLabel('Once more').fill('correct horse battery staple')
    await page.getByRole('button', { name: /continue/i }).click()

    const input = page.getByLabel('TogetherID')
    await input.fill('maya-arun')
    await expect(input).toHaveValue('MAYA-ARUN')
    await expect(page.getByRole('button', { name: /open our home/i })).toBeVisible()
    await expect(page.getByText(/the home opens when you\u2019re both here/i)).toBeVisible()
  })

  test('back returns to the previous step with values intact', async ({ page }) => {
    await completeStepOne(page)
    await page.getByRole('button', { name: /^back$/i }).click()

    await expect(page.getByRole('heading', { name: 'First, you' })).toBeVisible()
    await expect(page.getByLabel('Username')).toHaveValue('maya.k')
  })

  test('navigates to login from the register page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
