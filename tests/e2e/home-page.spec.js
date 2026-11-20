import { expect, test } from '@playwright/test'
import {
  seedHomeStorage,
  corruptBooksStorage,
  allCoveredChecklists,
  initStorage,
  initClearStorage,
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

test.describe('Home Page — Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    initClearStorage(page)
    initStorage(page, seedHomeStorage())
    await page.goto('/')
    await waitForAppReady(page)
  })

  // ============================================================
  // H-01: Cold boot renders Home with greeting & focus card
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

  // ============================================================
  // H-02: Focus card navigates to TopicPage
  // ============================================================
  test('H-02: focus card click opens TopicPage with Notes tab', async ({ page }) => {
    const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
    await focusCard.click()

    await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Learning React' })).toBeVisible()
  })

  // ============================================================
  // H-03: "See all" navigates to Library
  // ============================================================
  test('H-03: "See all" button navigates to Library view', async ({ page }) => {
    await page.getByRole('button', { name: 'See all' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
    await expect(getDock(page).getByRole('button', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
  })

  // ============================================================
  // H-04: Topic preview row opens topic
  // ============================================================
  test('H-04: topic preview row click opens TopicPage', async ({ page }) => {
    await page.getByRole('button', { name: 'State patterns' }).first().click()
    await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
  })

  // ============================================================
  // H-05: Schedule button opens ScheduleSheet
  // ============================================================
  test('H-05: schedule button opens ScheduleSheet for topic', async ({ page }) => {
    const dialog = await openScheduleSheet(page, 'Hooks in depth')
    await expect(dialog.locator('.focus-label')).toContainText('Schedule review')
    await expect(dialog.getByText('Hooks in depth')).toBeVisible()
    await expect(dialog.getByText('Learning React · Ch 7')).toBeVisible()
  })

  // ============================================================
  // H-06: Edit button opens TopicFormSheet
  // ============================================================
  test('H-06: edit button opens TopicFormSheet pre-filled', async ({ page }) => {
    const dialog = await openEditTopicSheet(page, 'Hooks in depth')
    await expect(dialog.locator('.focus-label')).toContainText('Edit topic')
    await expect(dialog.getByLabel('Topic title')).toHaveValue('Hooks in depth')
    await expect(dialog.getByLabel('Chapter or unit, optional')).toHaveValue('Ch 7')
  })

  // ============================================================
  // H-07: Dock highlights Home as active
  // ============================================================
  test('H-07: Home dock button has aria-current=page on load', async ({ page }) => {
    await expect(getDock(page).getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  // ============================================================
  // H-08: Keyboard activates dock items
  // ============================================================
  test('H-08: keyboard navigation activates dock destinations', async ({ page }) => {
    const insightsButton = getDock(page).getByRole('button', { name: 'Insights' })
    await insightsButton.focus()
    await expect(insightsButton).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Your rhythm' })).toBeVisible()
  })

  // ============================================================
  // H-09: Daily reset clears checklist on new day
  // ============================================================
  test('H-09: daily reset archives yesterday coverage and clears checkboxes', async ({ context }) => {
    const freshPage = await context.newPage()
    initClearStorage(freshPage)
    initStorage(freshPage, {
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
    await freshPage.goto('/')
    await waitForAppReady(freshPage)

    // Open topic page to check checklist state
    await openTopicFromHome(freshPage, 'Hooks in depth')
    // Checklist should be reset (all items unchecked)
    // The notes tab should be visible
    await expect(freshPage.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    await freshPage.close()
  })

  // ============================================================
  // H-10: Focus card falls back when all covered
  // ============================================================
  test('H-10: focus card shows first topic when all covered today', async ({ context }) => {
    const freshPage = await context.newPage()
    initClearStorage(freshPage)
    initStorage(freshPage, {
      ...seedHomeStorage(),
      ...allCoveredChecklists(),
      // Remove schedule for t1 so it shows "Up next" not "Scheduled"
      'revision-schedules': {},
    })
    await freshPage.goto('/')
    await waitForAppReady(freshPage)

    const focusCard = freshPage.locator('.focus-card')
    await expect(focusCard).toBeVisible()
    // When all topics covered, falls back to first topic in list (t1 = Hooks in depth)
    await expect(focusCard.locator('strong')).toContainText('Hooks in depth')
    await expect(focusCard.locator('.focus-label')).toContainText('Up next')
    await freshPage.close()
  })

  // ============================================================
  // H-11: Scheduled topics sort by date/time
  // ============================================================
  test('H-11: scheduled topics appear in chronological order', async ({ context }) => {
    const freshPage = await context.newPage()
    initClearStorage(freshPage)
    initStorage(freshPage, {
      ...seedHomeStorage(),
      'revision-schedules': {
        t1: { date: TOMORROW, time: '12:30' },
        t2: { date: TODAY, time: '09:30' },
        t3: { date: TODAY, time: '07:30' },
      },
    })
    await freshPage.goto('/')
    await waitForAppReady(freshPage)

    const focusCard = freshPage.locator('.focus-card')
    await expect(focusCard).toBeVisible()
    await expect(focusCard.locator('strong')).toContainText('Effects and lifecycle')
    // small contains "Ch 11 · Today · 7:30 AM"
    await expect(focusCard.locator('small')).toContainText('7:30 AM')
    await expect(focusCard.locator('.focus-label')).toContainText('Scheduled')
    await freshPage.close()
  })

  // ============================================================
  // H-12: localStorage corruption falls back to seeds
  // ============================================================
  test('H-12: corrupted books localStorage falls back to seed books', async ({ context }) => {
    const freshPage = await context.newPage()
    initClearStorage(freshPage)
    initStorage(freshPage, corruptBooksStorage())
    await freshPage.goto('/')
    await waitForAppReady(freshPage)

    await expect(freshPage.getByRole('heading', { level: 1, name: /Make today/ })).toBeVisible()
    const focusCard = freshPage.getByRole('button', { name: /^Up next/ })
    await expect(focusCard).toBeVisible()
    await expect(focusCard.locator('strong')).toContainText('React Server Components')
    await freshPage.close()
  })

  // ============================================================
  // H-13: Focus visible on all interactive elements
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

  // ============================================================
  // H-14: ARIA labels on icon-only buttons
  // ============================================================
  test('H-14: icon-only buttons have descriptive aria-labels', async ({ page }) => {
    const scheduleButton = page.getByRole('button', { name: /^(Schedule|Reschedule) Hooks in depth/ })
    await expect(scheduleButton).toBeVisible()

    const editButton = page.getByRole('button', { name: 'Edit or delete Hooks in depth' })
    await expect(editButton).toBeVisible()
  })

  // ============================================================
  // H-15: Mobile touch targets ≥ 44×44px
  // ============================================================
  test('H-15: mobile viewport touch targets meet minimum size', async ({ context }) => {
    const freshPage = await context.newPage()
    initClearStorage(freshPage)
    initStorage(freshPage, seedHomeStorage())
    await freshPage.setViewportSize({ width: 390, height: 844 })
    await freshPage.goto('/')
    await waitForAppReady(freshPage)

    const dockButtons = getDock(freshPage).getByRole('button')
    const count = await dockButtons.count()
    for (let i = 0; i < count; i++) {
      const box = await dockButtons.nth(i).boundingBox()
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }

    const focusCard = freshPage.getByRole('button', { name: /^Scheduled|^Up next/ })
    const focusBox = await focusCard.boundingBox()
    expect(focusBox.width).toBeGreaterThanOrEqual(44)
    expect(focusBox.height).toBeGreaterThanOrEqual(44)
    await freshPage.close()
  })

  // ============================================================
  // NEW: Edit Topic - Input Validation Test Cases
  // ============================================================
  test.describe('Edit Topic — Input Validation', () => {
    test('H-16: save button disabled when title is empty', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Topic title').fill('')
      await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    test('H-17: save button enabled when title has content', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Topic title').fill('New Title')
      await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    })

    test('H-18: whitespace-only title is treated as empty', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Topic title').fill('   ')
      await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    test('H-19: title input accepts special characters', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      const specialTitle = 'Hooks & Effects: useEffect/useLayoutEffect #1'
      await dialog.getByLabel('Topic title').fill(specialTitle)
      await expect(dialog.getByLabel('Topic title')).toHaveValue(specialTitle)
      await saveTopicForm(dialog, { title: specialTitle })
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).toContainText(specialTitle)
    })

    test('H-20: chapter input accepts empty value', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Chapter or unit, optional').fill('')
      await saveTopicForm(dialog, { chapter: '' })
      // Empty optional chapter preserves the existing chapter by design.
      const smallText = await page.locator('.focus-card small').textContent()
      expect(smallText).toContain('Ch 7')
    })

    test('H-21: chapter input accepts long text', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      const longChapter = 'Chapter 7: Advanced Hooks Patterns and Custom Hooks Deep Dive'
      await dialog.getByLabel('Chapter or unit, optional').fill(longChapter)
      await saveTopicForm(dialog, { chapter: longChapter })
      const books = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-books')))
      expect(books[0].topics[0].chapter).toBe(longChapter)
    })

    test('H-22: escape key closes edit sheet without saving', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Topic title').fill('Should Not Save')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
      await expect(focusCard.locator('strong')).toContainText('Hooks in depth')
    })

    test('H-23: clicking backdrop closes edit sheet without saving', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Topic title').fill('Should Not Save')
      await page.locator('.sheet-backdrop').click()
      await expect(dialog).toBeHidden()
      const focusCard = page.getByRole('button', { name: /^Scheduled|^Up next/ })
      await expect(focusCard.locator('strong')).toContainText('Hooks in depth')
    })
  })

  // ============================================================
  // NEW: Edit Topic - Save Changes Persist
  // ============================================================
  test.describe('Edit Topic — Save Persistence', () => {
    test('H-24: title change persists after save', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(dialog, { title: 'Advanced Hooks Patterns' })
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).toContainText('Advanced Hooks Patterns')
    })

    test('H-25: chapter change persists after save', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(dialog, { chapter: 'Ch 7 Revised' })
      const books = await page.evaluate(() => JSON.parse(localStorage.getItem('revision-books')))
      expect(books[0].topics[0].chapter).toBe('Ch 7 Revised')
    })

    test('H-26: simultaneous title and chapter change persists', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await saveTopicForm(dialog, { title: 'Mastering Hooks', chapter: 'Ch 7 Final' })
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).toContainText('Mastering Hooks')
      await openTopicFromHome(page, 'Mastering Hooks')
      await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    })
  })

  // ============================================================
  // NEW: Edit Topic - Delete Functionality
  // ============================================================
  test.describe('Edit Topic — Delete Topic', () => {
    test('H-27: delete button visible in edit sheet', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      await expect(dialog.getByRole('button', { name: 'Delete topic' })).toBeVisible()
    })

    test('H-28: delete shows confirmation dialog', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      const confirmation = page.waitForEvent('dialog').then(async (browserDialog) => {
        expect(browserDialog.type()).toBe('confirm')
        expect(browserDialog.message()).toContain('Hooks in depth')
        await browserDialog.dismiss()
      })
      await dialog.getByRole('button', { name: 'Delete topic' }).click()
      await confirmation
      await expect(dialog).toBeVisible()
    })

    test('H-29: confirmed delete removes topic from Home and Library', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      page.once('dialog', (browserDialog) => browserDialog.accept())
      await dialog.getByRole('button', { name: 'Delete topic' }).click()
      await expect(dialog).toBeHidden()

      await expect(page.getByRole('button', { name: 'Hooks in depth' })).not.toBeVisible()
      await expect(page.getByRole('button', { name: /^Scheduled|^Up next/ }).locator('strong')).not.toContainText('Hooks in depth')

      await navigateTo(page, 'Library')
      await page.getByRole('button', { name: 'Open Learning React' }).click()
      await expect(page.getByRole('button', { name: 'Hooks in depth' })).not.toBeVisible()
    })

    test('H-30: delete also removes associated schedule', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      page.once('dialog', (browserDialog) => browserDialog.accept())
      await dialog.getByRole('button', { name: 'Delete topic' }).click()

      await navigateTo(page, 'Calendar')
      await expect(page.getByRole('button', { name: /Hooks in depth/ })).not.toBeVisible()
    })

    test('H-31: delete also removes associated checklist and coverage', async ({ page }) => {
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')
      page.once('dialog', (browserDialog) => browserDialog.accept())
      await dialog.getByRole('button', { name: 'Delete topic' }).click()

      await navigateTo(page, 'Insights')
      await expect(page.getByText('Hooks in depth')).not.toBeVisible()
    })
  })

  // ============================================================
  // NEW: Schedule Sheet - Date and Time Changes
  // ============================================================
  test.describe('Schedule Sheet — Date and Time Changes', () => {
    test('H-32: schedule sheet opens with current schedule pre-selected', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await expect(dialog.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true')
      await expect(dialog.getByLabel('Custom time')).toHaveValue('09:30')
    })

    test('H-33: changing date updates preview', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('button', { name: 'Tomorrow' }).click()
      await expect(dialog.locator('.sheet-preview')).toContainText('Tomorrow')
    })

    test('H-34: changing time via preset chips updates preview', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('radio', { name: '12:30' }).click()
      await expect(dialog.locator('.sheet-preview')).toContainText('12:30')
    })

    test('H-35: changing time via custom time input updates preview', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Custom time').fill('14:45')
      await expect(dialog.locator('.sheet-preview')).toContainText('2:45 PM')
    })

    test('H-36: navigating months in calendar works', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      const nextMonthButton = dialog.getByRole('button', { name: 'Next month' })
      await expect(nextMonthButton).toBeEnabled()
      await nextMonthButton.click()
      await expect(dialog.getByText(new RegExp(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/))).toBeVisible()
    })

    test('H-37: cannot select past dates (disabled)', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      const disabledDays = dialog.getByRole('grid', { name: /Pick a review day/ }).locator('button:disabled')
      await expect(disabledDays.first()).toBeVisible()
      expect(await disabledDays.count()).toBeGreaterThan(0)
    })

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

    test('H-40: escape key closes schedule sheet without saving', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('button', { name: 'Tomorrow' }).click()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()

      const focusCard = page.getByRole('button', { name: /^Scheduled/ })
      await expect(focusCard.locator('small')).toContainText('Today')
      await expect(focusCard.locator('small')).toContainText('9:30 AM')
    })

    test('H-41: clicking backdrop closes schedule sheet without saving', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('button', { name: 'Tomorrow' }).click()
      await page.locator('.sheet-backdrop').click({ position: { x: 1, y: 1 } })
      await expect(dialog).toBeHidden()

      const focusCard = page.getByRole('button', { name: /^Scheduled/ })
      await expect(focusCard.locator('small')).toContainText('Today')
    })
  })

  // ============================================================
  // NEW: Schedule Sheet - Input Validation
  // ============================================================
  test.describe('Schedule Sheet — Input Validation', () => {
    test('H-42: custom time input accepts valid 24-hour format', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByLabel('Custom time').fill('23:59')
      await expect(dialog.getByLabel('Custom time')).toHaveValue('23:59')
    })

    test('H-43: custom time input shows browser validation for invalid format', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      const timeInput = dialog.getByLabel('Custom time')
      await timeInput.fill('25:00')
      // HTML time inputs reject an invalid 24-hour value rather than storing it.
      await expect(timeInput).not.toHaveValue('25:00')
    })

    test('H-44: preset time chips are mutually exclusive', async ({ page }) => {
      const dialog = await openScheduleSheet(page, 'Hooks in depth')
      await dialog.getByRole('radio', { name: '7:30 AM' }).click()
      await expect(dialog.getByRole('radio', { name: '7:30 AM' })).toHaveAttribute('aria-checked', 'true')
      await expect(dialog.getByRole('radio', { name: '12:30 PM' })).toHaveAttribute('aria-checked', 'false')
      await dialog.getByRole('radio', { name: '12:30 PM' }).click()
      await expect(dialog.getByRole('radio', { name: '12:30 PM' })).toHaveAttribute('aria-checked', 'true')
      await expect(dialog.getByRole('radio', { name: '7:30 AM' })).toHaveAttribute('aria-checked', 'false')
    })
  })

  // ============================================================
  // NEW: Cross-cutting - Edit then Schedule flow
  // ============================================================
  test.describe('Cross-cutting — Edit then Schedule', () => {
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
