import { expect, test } from '@playwright/test'

function requiredEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

test.describe('Authentication', () => {
  test('allows a user with valid credentials to sign in', async ({ page }) => {
    const username = requiredEnv('TEST_USERNAME')
    const password = requiredEnv('TEST_PASSWORD')

    await page.goto('/login')

    await page.getByLabel(/email|username/i).fill(username)
    await page.getByLabel(/password/i).fill(password)
    await page
      .getByRole('button', { name: /sign in|log in|zaloguj/i })
      .click()

    // Zmień ten warunek, jeśli aplikacja ma konkretny adres po zalogowaniu.
    await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/)
  })
})