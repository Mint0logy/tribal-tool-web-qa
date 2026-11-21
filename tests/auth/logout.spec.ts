import { expect, test } from '../fixtures.js'
import { login } from '../utils/login.js'
import { logout } from '../utils/logout.js'

test.describe('Authentication', () => {
  test('allows a signed-in user to log out', async ({ page, logger }) => {
    await login(page, logger)

    await test.step('Verify the user is signed in', async () => {
      await page.goto('/account/subscription')
      await expect(page).toHaveURL(/\/account\/subscription(?:[/?#]|$)/)
    })

    await logout(page, logger)

    await test.step('Verify the user is signed out', async () => {
      await page.goto('/account/subscription')
      await expect(page).toHaveURL(/\/login(?:[/?#]|$)/)
    })
  })
})