import { test, expect } from '@playwright/test'

const authState = JSON.stringify({
  state: {
    isAuthenticated: true,
    username: 'madhu',
    partnerName: 'Priya Avinash',
    togetherID: 'MADHU-PRIYA',
    coupleId: '11111111-1111-1111-1111-111111111111',
    partnerId: '22222222-2222-2222-2222-222222222222',
    role: 'Husband',
    profilePictureUrl: null,
  },
  version: 0,
})

const myProfileResponse = {
  partnerId: '22222222-2222-2222-2222-222222222222',
  username: 'madhu',
  name: 'Madhu Avinash',
  dateOfBirth: '1990-05-15',
  email: 'madhu@saha.test',
  phoneNumber: '+911234567890',
  profilePictureUrl: null,
  role: 'Husband',
  coupleInfo: {
    coupleId: '11111111-1111-1111-1111-111111111111',
    togetherID: 'MADHU-PRIYA',
    partner: {
      partnerId: '33333333-3333-3333-3333-333333333333',
      username: 'priya',
      name: 'Priya Avinash',
      profilePictureUrl: null,
      role: 'Wife',
    },
  },
}

const partnerProfileResponse = {
  partnerId: '33333333-3333-3333-3333-333333333333',
  username: 'priya',
  name: 'Priya Avinash',
  dateOfBirth: '1992-08-20',
  email: 'priya@saha.test',
  phoneNumber: '+911234567891',
  profilePictureUrl: null,
  role: 'Wife',
  coupleInfo: {
    coupleId: '11111111-1111-1111-1111-111111111111',
    togetherID: 'MADHU-PRIYA',
    partner: {
      partnerId: '22222222-2222-2222-2222-222222222222',
      username: 'madhu',
      name: 'Madhu Avinash',
      profilePictureUrl: null,
      role: 'Husband',
    },
  },
}

test.describe('Profile', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    // Use URL function to avoid glob ? ambiguity
    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(myProfileResponse) }),
    )
    await page.route((url) => url.pathname.endsWith('/profile/partner'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partnerProfileResponse) }),
    )

    await page.goto('/profile')
    // Wait for profile to load before tests start
    await expect(page.getByText('Madhu Avinash').first()).toBeVisible({ timeout: 5000 })
  })

  test('renders profile page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
    await expect(page.getByText('Manage your personal details')).toBeVisible()
  })

  test('shows My Profile tab active by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /my profile/i })).toBeVisible()
  })

  test('shows own name and role', async ({ page }) => {
    await expect(page.getByText('Madhu Avinash').first()).toBeVisible()
    await expect(page.getByText('@madhu · Husband')).toBeVisible()
  })

  test('shows Together ID badge', async ({ page }) => {
    await expect(page.getByText('MADHU-PRIYA').first()).toBeVisible()
  })

  test('shows personal details section', async ({ page }) => {
    // Use first() because getByText matches both <h2> and its parent <div>
    await expect(page.getByText('Personal Details').first()).toBeVisible()
    await expect(page.getByText('madhu@saha.test')).toBeVisible()
    await expect(page.getByText('+911234567890')).toBeVisible()
    await expect(page.getByText('May 15, 1990')).toBeVisible()
  })

  test('shows Together section with partner info', async ({ page }) => {
    await expect(page.getByText('Together').first()).toBeVisible()
    await expect(page.getByText('Priya Avinash').first()).toBeVisible()
    await expect(page.getByText('@priya · Wife')).toBeVisible()
  })

  test('Edit button opens edit form', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('Edit Profile').first()).toBeVisible()
    await expect(page.getByLabel('Full Name')).toBeVisible()
    await expect(page.getByLabel('Date of Birth')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Phone Number')).toBeVisible()
  })

  test('edit form is pre-populated with current values', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByLabel('Full Name')).toHaveValue('Madhu Avinash')
    await expect(page.getByLabel('Email')).toHaveValue('madhu@saha.test')
    await expect(page.getByLabel('Phone Number')).toHaveValue('+911234567890')
  })

  test('Cancel button closes edit form', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await expect(page.getByText('Edit Profile').first()).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText('Personal Details').first()).toBeVisible()
    await expect(page.getByText('Edit Profile')).not.toBeVisible()
  })

  test('edit form validates empty name', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    // triple-click selects all text, Backspace deletes it — fires DOM events RHF listens to
    await page.getByLabel('Full Name').click({ clickCount: 3 })
    await page.keyboard.press('Backspace')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Name is required')).toBeVisible()
  })

  test('edit form validates invalid email', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByLabel('Email').click({ clickCount: 3 })
    await page.keyboard.type('not-an-email')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('switches to partner tab and shows partner profile read-only', async ({ page }) => {
    await page.getByRole('button', { name: /priya avinash.*profile/i }).click()
    await expect(page.getByText('Priya Avinash').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('@priya · Wife')).toBeVisible()
    await expect(page.getByText('priya@saha.test')).toBeVisible()
    await expect(page.getByText('August 20, 1992')).toBeVisible()
  })

  test('partner tab has no Edit button', async ({ page }) => {
    await page.getByRole('button', { name: /priya avinash.*profile/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).not.toBeVisible()
  })

  test('partner tab shows View as partner button', async ({ page }) => {
    await page.getByRole('button', { name: /priya avinash.*profile/i }).click()
    await expect(page.getByRole('button', { name: /view as partner/i })).toBeVisible({ timeout: 5000 })
  })

  test('unauthenticated access redirects to login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/profile')
    await expect(page).toHaveURL('/login')
    await ctx.close()
  })
})

test.describe('Profile – avatar illustration', () => {
  test('shows husband illustration when no photo is set', async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(myProfileResponse) }),
    )
    await page.route((url) => url.pathname.endsWith('/profile/partner'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partnerProfileResponse) }),
    )

    await page.goto('/profile')
    await expect(page.getByText('Madhu Avinash').first()).toBeVisible({ timeout: 5000 })

    // The avatar img in the profile card should use the husband illustration
    const avatarImg = page.locator('img[alt="Madhu Avinash"]').first()
    await expect(avatarImg).toHaveAttribute('src', /avatar-husband\.svg/)
  })

  test('shows wife illustration for partner on partner tab', async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(myProfileResponse) }),
    )
    await page.route((url) => url.pathname.endsWith('/profile/partner'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partnerProfileResponse) }),
    )

    await page.goto('/profile')
    await expect(page.getByText('Madhu Avinash').first()).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /priya avinash.*profile/i }).click()
    await expect(page.getByText('Priya Avinash').first()).toBeVisible({ timeout: 5000 })

    const avatarImg = page.locator('img[alt="Priya Avinash"]').first()
    await expect(avatarImg).toHaveAttribute('src', /avatar-wife\.svg/)
  })
})

test.describe('Profile – photo upload', () => {
  const uploadedUrl = '/uploads/profile-pictures/couple1/partner1/photo.jpg'

  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((stored) => {
      localStorage.setItem('saha-auth', stored)
    }, authState)

    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(myProfileResponse) }),
    )
    await page.route((url) => url.pathname.endsWith('/profile/partner'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(partnerProfileResponse) }),
    )

    await page.goto('/profile')
    await expect(page.getByText('Madhu Avinash').first()).toBeVisible({ timeout: 5000 })
  })

  test('camera button is visible on my profile', async ({ page }) => {
    await expect(page.getByLabel('Change profile picture')).toBeVisible()
  })

  test('successful upload shows "Photo updated" toast', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/profile/me/picture'), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profilePictureUrl: uploadedUrl }),
      }),
    )

    const fileInput = page.locator('#profile-picture')
    await fileInput.setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
    })

    await expect(page.getByText('Photo updated').first()).toBeVisible({ timeout: 5000 })
  })

  test('after successful upload, avatar shows the uploaded image', async ({ page }) => {
    const updatedProfile = { ...myProfileResponse, profilePictureUrl: uploadedUrl }

    await page.route((url) => url.pathname.endsWith('/profile/me/picture'), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profilePictureUrl: uploadedUrl }),
      }),
    )

    // After upload invalidates the cache, /profile/me returns the updated profile
    await page.route((url) => url.pathname.endsWith('/profile/me'), (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(updatedProfile) }),
    )

    const fileInput = page.locator('#profile-picture')
    await fileInput.setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-bytes'),
    })

    await expect(page.getByText('Photo updated').first()).toBeVisible({ timeout: 5000 })

    // Avatar should now show the uploaded URL, not the illustration
    const avatarImg = page.locator('img[alt="Madhu Avinash"]').first()
    await expect(avatarImg).toHaveAttribute('src', uploadedUrl)
  })

  test('failed upload shows "Upload failed" error toast', async ({ page }) => {
    await page.route((url) => url.pathname.endsWith('/profile/me/picture'), (route) =>
      route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'File too large', status: 413 }),
      }),
    )

    const fileInput = page.locator('#profile-picture')
    await fileInput.setInputFiles({
      name: 'huge.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('x'.repeat(100)),
    })

    await expect(page.getByText('Upload failed').first()).toBeVisible({ timeout: 5000 })
  })

  test('file input accepts only image types', async ({ page }) => {
    const fileInput = page.locator('#profile-picture')
    const accept = await fileInput.getAttribute('accept')
    expect(accept).toContain('image/jpeg')
    expect(accept).toContain('image/png')
    expect(accept).toContain('image/webp')
  })

  test('camera button is not visible on partner tab (read-only)', async ({ page }) => {
    await page.getByRole('button', { name: /priya avinash.*profile/i }).click()
    await expect(page.getByText('Priya Avinash').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByLabel('Change profile picture')).not.toBeVisible()
  })
})
