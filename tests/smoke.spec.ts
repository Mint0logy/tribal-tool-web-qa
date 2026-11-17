import { test, expect } from '@playwright/test'

test.describe('Tribal Tool - Smoke Tests', () => {
  test('should load the application successfully', async ({ page }) => {
    const response = await page.goto('/')

    expect(response).not.toBeNull()
    expect(response?.status()).toBeLessThan(400)

    await expect(page.locator('body')).toBeVisible()
  })
})