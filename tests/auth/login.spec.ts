import { expect, test } from '../fixtures.js'
import { login } from '../utils/login.js'

test.describe('Authentication', () => {
  test('allows a user with valid credentials to sign in', async ({
    page,
    logger,
  }) => {
    await login(page, logger)

    await test.step('Verify access to the subscription page', async () => {
      await page.goto('/account/subscription')
      await expect(page).toHaveURL(/\/account\/subscription(?:[/?#]|$)/)
    })
  })
})