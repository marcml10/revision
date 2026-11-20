/**
 * Home Page E2E Test Fixtures
 * Provides localStorage seeding and helper functions for Playwright tests.
 */

import { expect } from '@playwright/test'

const pad = (value) => String(value).padStart(2, '0')

export const isoOffset = (offset) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const TODAY = isoOffset(0)
export const YESTERDAY = isoOffset(-1)
export const TOMORROW = isoOffset(1)
export const IN_TWO_DAYS = isoOffset(2)
export const IN_THREE_DAYS = isoOffset(3)

export const booksFixture = () => [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TODAY, progress: 0 },
      { id: 't2', title: 'State patterns', chapter: 'Ch 9', due: TOMORROW, progress: 0 },
      { id: 't3', title: 'Effects and lifecycle', chapter: 'Ch 11', due: IN_TWO_DAYS, progress: 0 },
    ],
  },
  {
    id: 'b2',
    title: 'Clean Code',
    author: 'R. C. Martin',
    accent: 'violet',
    topics: [
      { id: 't4', title: 'Meaningful names', chapter: 'Ch 2', due: 'Unscheduled', progress: 0 },
      { id: 't5', title: 'Functions', chapter: 'Ch 3', due: IN_THREE_DAYS, progress: 0 },
    ],
  },
]

export const checklistEntry = (items = [], note = '', day = TODAY) => ({ day, items, note })

export const schedulesFixture = (overrides = {}) => ({
  t1: { date: TODAY, time: '09:30' },
  t2: { date: TOMORROW, time: '12:30' },
  ...overrides,
})

export const checklistsFixture = (overrides = {}) => ({
  t1: checklistEntry([
    { id: 'ci1', text: 'Understand useEffect', done: true },
    { id: 'ci2', text: 'Practice custom hooks', done: false },
  ], 'Review useEffect cleanup'),
  t2: checklistEntry([
    { id: 'ci3', text: 'Read about useReducer', done: false },
  ]),
  t3: checklistEntry([
    { id: 'ci4', text: 'Cleanup functions', done: true },
    { id: 'ci5', text: 'Dependency array', done: false },
  ], 'Partial progress'),
  ...overrides,
})

export const coverageFixture = (overrides = {}) => ({
  t1: { [TODAY]: 50 },
  t3: { [TODAY]: 100, [YESTERDAY]: 75 },
  ...overrides,
})

export const settingsFixture = (overrides = {}) => ({
  reminderTime: '09:00',
  weeklyGoal: 5,
  compactMode: false,
  reducedMotion: false,
  ...overrides,
})

export const canvasFixture = (overrides = {}) => ({
  t1: { texts: [], nodes: [], edges: [], strokes: [] },
  ...overrides,
})

export const seedHomeStorage = (overrides = {}) => {
  const defaults = {
    'revision-books': booksFixture(),
    'revision-schedules': schedulesFixture(),
    'revision-checklists': checklistsFixture(),
    'revision-coverage': coverageFixture(),
    'revision-canvas': canvasFixture(),
    'revision-settings': settingsFixture(),
  }
  return { ...defaults, ...overrides }
}

export const corruptBooksStorage = () => ({
  'revision-books': 'not valid json',
})

export const emptyBooksStorage = () => ({
  'revision-books': [],
})

export const allCoveredChecklists = () => ({
  'revision-checklists': {
    t1: checklistEntry([
      { id: 'ci1', text: 'Task 1', done: true },
      { id: 'ci2', text: 'Task 2', done: true },
    ]),
    t2: checklistEntry([
      { id: 'ci3', text: 'Task 3', done: true },
    ]),
    t3: checklistEntry([
      { id: 'ci4', text: 'Task 4', done: true },
      { id: 'ci5', text: 'Task 5', done: true },
    ]),
    t4: checklistEntry([
      { id: 'ci6', text: 'Task 6', done: true },
    ]),
    t5: checklistEntry([
      { id: 'ci7', text: 'Task 7', done: true },
    ]),
  },
})

export const yesterdayChecklists = () => ({
  'revision-checklists': {
    t1: checklistEntry([
      { id: 'ci1', text: 'Yesterday task', done: true },
    ], '', YESTERDAY),
    t2: checklistEntry([
      { id: 'ci2', text: 'Another yesterday task', done: false },
    ], '', YESTERDAY),
  },
})

/**
 * Apply storage state to the page via localStorage.
 * Must be called AFTER page.goto() to the app origin.
 */
export const applyStorage = async (page, storage) => {
  await page.evaluate((data) => {
    Object.entries(data).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }, storage)
}

/**
 * Clear all revision localStorage keys.
 * Must be called AFTER page.goto() to the app origin.
 */
export const clearRevisionStorage = async (page) => {
  await page.evaluate(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('revision-'))
      .forEach((key) => window.localStorage.removeItem(key))
  })
}

/**
 * Initialize localStorage BEFORE page navigation using addInitScript.
 * Use this in test.beforeEach to set up storage before the app loads.
 */
export const initStorage = (page, storage) => {
  page.addInitScript((data) => {
    Object.entries(data).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }, storage)
}

/**
 * Clear revision storage BEFORE page navigation using addInitScript.
 */
export const initClearStorage = (page) => {
  page.addInitScript(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('revision-'))
      .forEach((key) => window.localStorage.removeItem(key))
  })
}

/**
 * Wait for the app to finish its mount effects (daily reset, migrations).
 */
export const waitForAppReady = async (page) => {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => {
    try {
      const coverage = JSON.parse(window.localStorage.getItem('revision-coverage') || '{}')
      return typeof coverage === 'object'
    } catch {
      return false
    }
  })
  await page.waitForTimeout(100)
}

/**
 * Get the primary navigation dock.
 */
export const getDock = (page) => page.getByRole('navigation', { name: 'Primary navigation' })

/**
 * Click a dock destination and wait for the view to change.
 */
export const navigateTo = async (page, label) => {
  const dock = getDock(page)
  await dock.getByRole('button', { name: label }).click()
  await expect(dock.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
}

/**
 * Open a topic from the Home page focus card or topic list.
 */
export const openTopicFromHome = async (page, topicTitle) => {
  const topicButton = page.getByRole('button', { name: new RegExp(`^${topicTitle}`) }).first()
  await topicButton.click()
  await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
}

/**
 * Open the ScheduleSheet for a topic from Home page.
 * Handles both "Schedule" and "Reschedule" button labels.
 */
export const openScheduleSheet = async (page, topicTitle) => {
  const scheduleButton = page.getByRole('button', { name: new RegExp(`^(Schedule|Reschedule) ${topicTitle}`) })
  await scheduleButton.click()
  const dialog = page.getByRole('dialog', { name: `Schedule review: ${topicTitle}` })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.focus-label')).toContainText('Schedule review')
  return dialog
}

/**
 * Open the TopicFormSheet (edit) for a topic from Home page.
 */
export const openEditTopicSheet = async (page, topicTitle) => {
  const editButton = page.getByRole('button', { name: `Edit or delete ${topicTitle}` })
  await editButton.click()
  const dialog = page.getByRole('dialog', { name: `Edit topic: ${topicTitle}` })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.focus-label')).toContainText('Edit topic')
  return dialog
}

/**
 * Fill and save the TopicFormSheet.
 */
export const saveTopicForm = async (dialog, { title, chapter }) => {
  if (title !== undefined) {
    await dialog.getByLabel('Topic title').fill(title)
  }
  if (chapter !== undefined) {
    await dialog.getByLabel('Chapter or unit, optional').fill(chapter)
  }
  await dialog.getByRole('button', { name: /Save changes|Add topic/ }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Delete a topic from the TopicFormSheet.
 */
export const deleteTopicFromSheet = async (page, dialog, topicTitle) => {
  await dialog.getByRole('button', { name: `Delete ${topicTitle}` }).click()
  await page.waitForFunction(() => window.confirm.toString().includes('native code') || true)
  await page.getByRole('button', { name: /Delete|Confirm/ }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Save schedule from ScheduleSheet.
 */
export const saveSchedule = async (dialog, { date, time }) => {
  if (date) {
    await dialog.getByRole('grid', { name: /Pick a review day/ }).getByRole('button', { name: date }).click()
  }
  if (time) {
    await dialog.getByRole('radio', { name: time }).click()
  }
  await dialog.getByRole('button', { name: 'Save schedule' }).click()
  await expect(dialog).toBeHidden()
}
