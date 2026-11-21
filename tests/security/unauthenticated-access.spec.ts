import { expect, test } from '../fixtures'

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

test.describe('Security', () => {
  test('redirects unauthenticated users from a protected page to login', async ({
    page,
    logger,
  }) => {
    await test.step('Open a protected page without a session', async () => {
      logger.log('Navigating to protected route /account/subscription')
      await page.goto('/account/subscription')
    })

    await test.step('Verify redirect to the login page', async () => {
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/)
    })
  })
})