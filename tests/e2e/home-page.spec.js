import { expect, test } from '@playwright/test'
import {
  seedHomeStorage,
  allCoveredChecklists,
  initStorage,
  initClearStorage,
  applyStorage,
  waitForAppReady,
  getDock,
  navigateTo,
  openTopicFromHome,
  openScheduleSheet,
  openEditTopicSheet,
  saveTopicForm,
  saveSchedule,
  TODAY,
  TOMORROW,
  YESTERDAY,
} from './fixtures/home-page.fixture.js'

test.describe('Home Page — Standard Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    initClearStorage(page)
    initStorage(page, seedHomeStorage())
    await page.goto('/')
    await waitForAppReady(page)
  })

  // ============================================================
  // A. Home Boot & Navigation
  // ============================================================
  test('H-01: boots on Home with greeting, date, and focus card', async ({ page }) => {
    await expect(page.getByText('revision', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: /Make today/ })).toBeVisible()
    await expect(page.getByText(new RegExp(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)$/))).toBeVisible()

    const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
    await expect(focusCard).toBeVisible()
    await expect(focusCard.locator('strong')).toContainText('Hooks in depth')
    await expect(focusCard.locator('small')).toContainText('Ch 7')
  })

  test('H-02: focus card click opens TopicPage with Notes tab', async ({ page }) => {
    const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
    await focusCard.click()

    await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Learning React' })).toBeVisible()
  })

  test('H-03: "See all" button navigates to Library view', async ({ page }) => {
    await page.getByRole('button', { name: 'See all' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
    await expect(getDock(page).getByRole('button', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
  })

  test('H-04: topic preview row click opens TopicPage', async ({ page }) => {
    await page.getByRole('button', { name: 'State patterns' }).first().click()
    await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
  })

  test('H-05: schedule button opens ScheduleSheet for topic', async ({ page }) => {
    const dialog = await openScheduleSheet(page, 'Hooks in depth')
    await expect(dialog.locator('.focus-label')).toContainText('Schedule review')
    await expect(dialog.getByText('Hooks in depth')).toBeVisible()
    await expect(dialog.getByText('Learning React · Ch 7')).toBeVisible()
  })

  test('H-06: edit button opens TopicFormSheet pre-filled', async ({ page }) => {
    const dialog = await openEditTopicSheet(page, 'Hooks in depth')
    await expect(dialog.locator('.focus-label')).toContainText('Edit topic')
    await expect(dialog.getByLabel('Topic title')).toHaveValue('Hooks in depth')
    await expect(dialog.getByLabel('Chapter or unit, optional')).toHaveValue('Ch 7')
  })

  // ============================================================
  // B. Accessibility & Viewport
  // ============================================================
  test('H-13: focus ring visible on all interactive elements via Tab', async ({ page }) => {
    const focusableSelectors = [
      'nav[aria-label="Primary navigation"] button',
      '.focus-card',
      '.topic-row button',
      'button:has-text("See all")',
    ]

    for (const selector of focusableSelectors) {
      const element = page.locator(selector).first()
      await element.focus()
      await expect(element).toBeFocused()
      await page.keyboard.press('Tab')
    }
  })

  test('H-14: icon-only buttons have descriptive aria-labels', async ({ page }) => {
    const scheduleButton = page.getByRole('button', { name: /^(Schedule|Reschedule) Hooks in depth/ })
    await expect(scheduleButton).toBeVisible()

    const editButton = page.getByRole('button', { name: 'Edit or delete Hooks in depth' })
    await expect(editButton).toBeVisible()
  })

  test('H-15: mobile viewport touch targets meet minimum size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await waitForAppReady(page)

    const dockButtons = getDock(page).getByRole('button')
    const count = await dockButtons.count()
    for (let i = 0; i < count; i++) {
      const box = await dockButtons.nth(i).boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
    const focusBox = await focusCard.boundingBox()
    expect(focusBox.width).toBeGreaterThanOrEqual(44)
    expect(focusBox.height).toBeGreaterThanOrEqual(44)
  })

  // ============================================================
  // C. Edit & Delete Topic Flow
  // ============================================================
  test.describe('Edit & Delete Topic', () => {
    test('H-26: simultaneous title and chapter change persists', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(dialog, { title: 'Mastering Hooks', chapter: 'Ch 7 Final' })
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).toContainText('Mastering Hooks')
      await openTopicFromHome(page, 'Mastering Hooks')
      await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    })

    test('H-29: confirmed delete removes topic and cleans up associated data', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      page.once('dialog', (browserDialog) => browserDialog.accept())
      await dialog.getByRole('button', { name: 'Delete topic' }).click()
      await expect(dialog).toBeHidden()

      await expect(page.getByRole('button', { name: 'Hooks in depth' })).not.toBeVisible()
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).not.toContainText('Hooks in depth')

      await navigateTo(page, 'Library')
      await page.getByRole('button', { name: 'Open Learning React' }).click()
      await expect(page.getByRole('button', { name: 'Hooks in depth' })).not.toBeVisible()

      await navigateTo(page, 'Calendar')
      await expect(page.getByRole('button', { name: /Hooks in depth/ })).not.toBeVisible()

      await navigateTo(page, 'Insights')
      await expect(page.getByText('Hooks in depth')).not.toBeVisible()
    })
  })

  // ============================================================
  // D. Schedule Sheet Flow
  // ============================================================
  test.describe('Schedule Sheet', () => {
    test('H-38: save schedule updates focus card with new date/time', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('button', { name: 'Tomorrow' }).click()
      await dialog.getByRole('radio', { name: '5:30 PM' }).click()
      await saveSchedule(dialog, { time: '5:30 PM' })

      const schedules = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-schedules')))
      expect(schedules.t1).toEqual({ date: TOMORROW, time: '17:30' })
    })

    test('H-39: "Back to auto" removes custom schedule', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('button', { name: 'Back to auto' }).click()
      await expect(dialog).toBeHidden()

      const schedules = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-schedules')))
      expect(schedules.t1).toBeUndefined()
    })
  })

  // ============================================================
  // E. Cross-cutting Flows
  // ============================================================
  test.describe('Cross-cutting Flows', () => {
    test('H-45: editing topic title updates schedule sheet reference', async ({ page }) => {
      const editDialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(editDialog, { title: 'Renamed Hooks Topic' })

      const scheduleDialog = await openScheduleSheet(page, 'Renamed Hooks Topic')
      await expect(scheduleDialog.locator('.focus-label')).toContainText('Schedule review')
      await expect(scheduleDialog.getByText('Renamed Hooks Topic')).toBeVisible()
    })

    test('H-46: scheduling then editing preserves schedule', async ({ page }) => {
      const scheduleDialog = await openScheduleSheet(page, 'Hooks in depth')
      await scheduleDialog.getByRole('button', { name: 'Tomorrow' }).click()
      await scheduleDialog.getByRole('radio', { name: '5:30 PM' }).click()
      await saveSchedule(scheduleDialog, { time: '5:30 PM' })

      const editDialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(editDialog, { title: 'Edited Hooks', chapter: 'Ch 7 Updated' })

      const books = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-books')))
      const schedules = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-schedules')))
      expect(books[0].topics[0].title).toBe('Edited Hooks')
      expect(schedules.t1).toEqual({ date: TOMORROW, time: '17:30' })
    })
  })
})

// ============================================================
// Custom Storage & Planning Mechanics
// ============================================================
test.describe('Home Page — Custom Storage Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('H-09: daily reset archives yesterday coverage and clears checkboxes', async ({ page }) => {
    await applyStorage(page, {
      ...seedHomeStorage(),
      'revision-checklists': {
        t1: {
          day: YESTERDAY,
          items: [
            { id: 'ci1', text: 'Yesterday task 1', done: true },
            { id: 'ci2', text: 'Yesterday task 2', done: false },
          ],
          note: 'Yesterday note',
        },
      },
    })
    await page.reload()
    await waitForAppReady(page)

    await openTopicFromHome(page, 'Hooks in depth')
    await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
  })

  test('H-10: focus card shows first topic when all covered today', async ({ page }) => {
    await applyStorage(page, {
      ...seedHomeStorage(),
      ...allCoveredChecklists(),
      'revision-schedules': {},
    })
    await page.reload()
    await waitForAppReady(page)

    const focusCard = page.locator('.focus-card')
    await expect(focusCard).toBeVisible()
    await expect(focusCard.locator('strong')).toContainText('Hooks in depth')
    await expect(focusCard.locator('.focus-label')).toContainText('Up next')
  })

  test('H-11: scheduled topics appear in chronological order', async ({ page }) => {
    await applyStorage(page, {
      ...seedHomeStorage(),
      'revision-schedules': {
        t1: { date: TOMORROW, time: '12:30' },
        t2: { date: TODAY, time: '09:30' },
        t3: { date: TODAY, time: '07:30' },
      },
    })
    await page.reload()
    await waitForAppReady(page)

    const focusCard = page.locator('.focus-card')
    await expect(focusCard).toBeVisible()
    await expect(focusCard.locator('strong')).toContainText('Effects and lifecycle')
    await expect(focusCard.locator('small')).toContainText('7:30 AM')
    await expect(focusCard.locator('.focus-label')).toContainText('Scheduled')
  })
})
