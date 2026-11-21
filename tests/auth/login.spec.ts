import { expect, test } from '../fixtures'

const requiredEnv = (name: string): string =>{
  const value = process.env[name]
    
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
    
  return value
}

test.describe('Authentication', () => {
  test('allows a user with valid credentials to sign in', async ({ page, logger }) => {
    const username = requiredEnv('TEST_USERNAME')
    const password = requiredEnv('TEST_PASSWORD')

    logger.log("Strating test execution")
    
    await test.step('Open the login page', async () => {
      logger.log("navigate to /login")
      await page.goto("/login")
    })

    await test.step('Enter valid credentials', async () => {
      await page.getByLabel(/email|username/i).fill(username)
      await page.getByLabel(/password|Hasło/i).fill(password)
    })

    await test.step('Submit the login form', async () => {
      await page
        .getByRole('button', { name: /sign in|log in|zaloguj/i })
        .click()
    })

    await test.step('Verify successful login', async () => {
      await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/)
    })
  })
})