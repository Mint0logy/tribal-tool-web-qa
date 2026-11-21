import type { Page } from '@playwright/test'
import { test, type TestLogger } from '../fixtures.js'

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const login = async (
  page: Page,
  logger: TestLogger,
): Promise<void> => {
  logger.log('Login flow started')

  try {
    const username = getRequiredEnv('E2E_USERNAME')
    const password = getRequiredEnv('E2E_PASSWORD')

    await test.step('Open the login page', async () => {
      await page.goto('/login')
    })

    await test.step('Enter login credentials', async () => {
      await page
        .getByLabel(/email|e-mail|username|nazwa użytkownika/i)
        .fill(username)

      await page.getByLabel(/hasło|password/i).fill(password)
    })

    await test.step('Submit the login form', async () => {
      await page
        .getByRole('button', { name: /zaloguj|sign in|log in/i })
        .click()
    })

    logger.log('Login flow completed')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.log(`Login flow failed: ${message}`)
    throw error
  }
}