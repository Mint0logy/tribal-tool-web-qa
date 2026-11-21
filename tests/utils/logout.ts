import type { Page } from '@playwright/test'
import { expect, test, type TestLogger } from '../fixtures.js'

export const logout = async (
  page: Page,
  logger: TestLogger,
): Promise<void> => {
  logger.log('Logout flow started')

  try {
    await test.step('Open the account menu', async () => {
      await page.getByRole('button', { name: 'Otwórz menu' }).click()

      await expect(
        page.getByRole('button', {
          name: 'Wyloguj się',
          exact: true,
        }),
      ).toBeVisible()
    })

    await test.step('Select the logout option', async () => {
      await page
        .getByRole('button', {
          name: 'Wyloguj się',
          exact: true,
        })
        .click()
    })

    logger.log('Logout flow completed')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.log(`Logout flow failed: ${message}`)
    throw error
  }
}