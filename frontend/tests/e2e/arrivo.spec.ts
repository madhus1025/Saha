import { test, expect } from '@playwright/test'

test.describe('Arrivo public website', () => {
  const pages = [
    {
      path: '/arrivo/',
      title: 'Arrivo - A little more arriving',
      heading: /A little less watching/,
    },
    { path: '/arrivo/privacy/', title: 'Arrivo Privacy policy', heading: 'Privacy policy' },
    { path: '/arrivo/support/', title: 'Arrivo Support', heading: 'Arrivo Support' },
  ]

  for (const entry of pages) {
    test(`@smoke ${entry.path} serves the actual public document without login`, async ({
      page,
    }) => {
      const response = await page.goto(entry.path)
      expect(response?.status()).toBe(200)
      await expect(page).toHaveTitle(entry.title)
      await expect(page.getByRole('heading', { level: 1, name: entry.heading })).toBeVisible()
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://www.wesaha.com${entry.path}`,
      )
      await expect(page.locator('script, iframe, form')).toHaveCount(0)
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      for (const image of await page.locator('img').all()) {
        expect(
          await image.evaluate(
            (element) =>
              element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
          ),
        ).toBe(true)
      }
    })
  }

  test('@smoke public policy and support navigation works independently of the Saha app', async ({
    page,
  }) => {
    await page.goto('/arrivo/')
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Privacy' })
      .click()
    await expect(page).toHaveURL(/\/arrivo\/privacy\/$/)
    await expect(page.getByRole('heading', { name: 'Information on your iPhone' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Notification previews' })).toBeVisible()
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Support' })
      .click()
    await expect(page).toHaveURL(/\/arrivo\/support\/$/)
    await expect(page.getByRole('heading', { name: 'Why did I not hear an alert?' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'madhu@wesaha.com' }).first()).toHaveAttribute(
      'href',
      'mailto:madhu@wesaha.com?subject=Arrivo%20support',
    )
  })
})
