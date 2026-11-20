import { expect, test } from '@playwright/test'

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test.describe('Security', () => {
  test('redirects unauthenticated users from a protected page to login', async ({
    page,
  }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/)
  })
})