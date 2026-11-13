import { expect, test } from '@playwright/test'

const dock = (page) => page.getByRole('navigation', { name: 'Primary navigation' })

test.describe('Primary navigation smoke', () => {
  test('boots on the home page with all five destinations', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('revision', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Make today/ })).toBeVisible()

    const nav = dock(page)
    await expect(nav).toBeVisible()
    for (const label of ['Home', 'Library', 'Calendar', 'Insights', 'Settings']) {
      await expect(nav.getByRole('button', { name: label })).toBeVisible()
    }
  })

  test('every dock destination renders its page', async ({ page }) => {
    await page.goto('/')
    const nav = dock(page)

    const destinations = [
      ['Library', /Your library/],
      ['Calendar', /Your calendar/],
      ['Insights', /Your rhythm/],
      ['Settings', /Settings/],
      ['Home', /Make today/],
    ]

    for (const [label, heading] of destinations) {
      await nav.getByRole('button', { name: label }).click()
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      await expect(nav.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('library drill-down hides the dock and back restores it', async ({ page }) => {
    await page.goto('/')
    const nav = dock(page)

    await nav.getByRole('button', { name: 'Library' }).click()
    await page.getByRole('button', { name: 'Open Learning React' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()

    await page.getByRole('button', { name: /^Hooks in depth/ }).click()
    await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
    await expect(nav).toHaveClass(/dock-hidden/)

    await page.getByRole('main').getByRole('button', { name: 'Learning React' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()
    await expect(nav).not.toHaveClass(/dock-hidden/)
  })

  test('keyboard activates a dock destination', async ({ page }) => {
    await page.goto('/')
    const insights = dock(page).getByRole('button', { name: 'Insights' })

    await insights.focus()
    await expect(insights).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { level: 1, name: 'Your rhythm' })).toBeVisible()
  })

  test('calendar and library cross-navigation opens a topic', async ({ page }) => {
    await page.goto('/')
    const nav = dock(page)

    await nav.getByRole('button', { name: 'Calendar' }).click()
    await page.locator('.upcoming-review').first().click()

    await expect(page.getByRole('main').getByRole('button', { name: 'Learning React' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
  })
})
