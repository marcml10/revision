/**
 * Library Page E2E Test Fixtures
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

export const checklistEntry = (items = [], note = '', day = TODAY) => ({ day, items, note })

const baseBooks = [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TODAY, progress: 0 },
      { id: 't2', title: 'State patterns', chapter: 'Ch 9', due: TOMORROW, progress: 0 },
    ],
  },
  {
    id: 'b2',
    title: 'Clean Code',
    author: 'R. C. Martin',
    accent: 'violet',
    topics: [
      { id: 't3', title: 'Meaningful names', chapter: 'Ch 2', due: 'Unscheduled', progress: 0 },
    ],
  },
]

export const libraryBooksFixture = () => baseBooks

export const libraryBooksWithDueToday = () => [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TODAY, progress: 0 },
      { id: 't2', title: 'State patterns', chapter: 'Ch 9', due: TOMORROW, progress: 0 },
    ],
  },
]

export const libraryBooksNoDueToday = () => [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TOMORROW, progress: 0 },
    ],
  },
]

export const emptyBooksFixture = () => []

export const bookWithoutTopicsFixture = () => [
  {
    id: 'b1',
    title: 'Empty Book',
    author: 'Author',
    accent: 'coral',
    topics: [],
  },
]

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
    { id: 'ci3', text: 'Read about useReducer', done: true },
    { id: 'ci4', text: 'Try useReducer', done: true },
  ], 'Done'),
  t3: checklistEntry([], 'No checklist yet'),
  ...overrides,
})

export const coverageFixture = (overrides = {}) => ({
  t1: { [TODAY]: 50 },
  t2: { [TODAY]: 100 },
  t3: {},
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
  t1: { texts: [], nodes: [], edges: [], strokes: [], shapes: [] },
  t2: { texts: [], nodes: [], edges: [], strokes: [], shapes: [] },
  t3: { texts: [], nodes: [], edges: [], strokes: [], shapes: [] },
  ...overrides,
})

export const seedLibraryStorage = (overrides = {}) => {
  const defaults = {
    'revision-books': libraryBooksFixture(),
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

/**
 * Apply storage state to the page via localStorage using addInitScript.
 * Must be called BEFORE page.goto().
 * NOTE: This runs on EVERY navigation including reload. For tests that verify
 * persistence across reload, use setupStorageForReload instead.
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
 * NOTE: This runs on EVERY navigation including reload.
 */
export const initClearStorage = (page) => {
  page.addInitScript(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('revision-'))
      .forEach((key) => window.localStorage.removeItem(key))
  })
}

/**
 * Set up storage for tests that verify persistence across reload.
 * This navigates to the app, sets localStorage via evaluate, then reloads.
 * Use this instead of initStorage + initClearStorage in beforeEach for reload tests.
 */
export const setupStorageForReload = async (page, storage) => {
  // First navigation - sets up the init scripts
  initClearStorage(page)
  initStorage(page, storage)
  await page.goto('/')
  await waitForAppReady(page)
  
  // Now overwrite localStorage with the exact test data (bypassing init scripts)
  await page.evaluate((data) => {
    Object.entries(data).forEach(([key, value]) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
  }, storage)
  
  // Reload so the app reads our test data on mount
  await page.reload()
  await waitForAppReady(page)
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
 * Open Library root view.
 */
export const openLibrary = async (page) => {
  await navigateTo(page, 'Library')
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
}

/**
 * Open a book from the library grid or hero.
 */
export const openBook = async (page, bookTitle) => {
  const bookButton = page.getByRole('button', { name: `Open ${bookTitle}` })
  await bookButton.click()
  await expect(page.getByRole('heading', { level: 2, name: bookTitle })).toBeVisible()
}

/**
 * Go back from book detail to library root.
 * The back button has the text "Library".
 */
export const backToLibrary = async (page) => {
  await page.getByRole('main').getByRole('button', { name: 'Library' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
}

/**
 * Open a topic from the book detail view.
 */
export const openTopicFromBook = async (page, topicTitle) => {
  const topicButton = page.getByRole('button', { name: new RegExp(`^${topicTitle}`) }).first()
  await topicButton.click()
  await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
}

/**
 * Open the Add Book sheet.
 */
export const openAddBookSheet = async (page) => {
  await page.getByRole('button', { name: /Add a book/ }).click()
  await expect(page.getByRole('dialog', { name: 'Add a book: New in your library' })).toBeVisible()
  return page.getByRole('dialog', { name: 'Add a book: New in your library' })
}

/**
 * Open the Edit Book sheet.
 */
export const openEditBookSheet = async (page, bookTitle) => {
  const editButton = page.getByRole('button', { name: `Edit or delete ${bookTitle}` })
  await editButton.click()
  await expect(page.getByRole('dialog', { name: `Edit book: ${bookTitle}` })).toBeVisible()
  return page.getByRole('dialog', { name: `Edit book: ${bookTitle}` })
}

/**
 * Save the BookFormSheet (add or edit).
 */
export const saveBookForm = async (dialog, { title, author, accent }) => {
  if (title !== undefined) {
    await dialog.getByLabel('Book title').fill(title)
  }
  if (author !== undefined) {
    await dialog.getByLabel('Author, optional').fill(author)
  }
  if (accent !== undefined) {
    await dialog.getByRole('radio', { name: accent }).check()
  }
  await dialog.getByRole('button', { name: /Add book|Save changes/ }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Open the Add Topic sheet (from within an open book).
 */
export const openAddTopicSheet = async (page) => {
  await page.getByRole('button', { name: /Add a topic/ }).click()
  await expect(page.getByRole('dialog', { name: /Add a topic:/ })).toBeVisible()
  return page.getByRole('dialog', { name: /Add a topic:/ })
}

/**
 * Open the Edit Topic sheet (from topic row menu).
 */
export const openEditTopicSheet = async (page, topicTitle) => {
  const editButton = page.getByRole('button', { name: `Edit or delete ${topicTitle}` })
  await editButton.click()
  await expect(page.getByRole('dialog', { name: `Edit topic: ${topicTitle}` })).toBeVisible()
  return page.getByRole('dialog', { name: `Edit topic: ${topicTitle}` })
}

/**
 * Save the TopicFormSheet (add or edit).
 */
export const saveTopicForm = async (dialog, { title, chapter }) => {
  if (title !== undefined) {
    await dialog.getByLabel('Topic title').fill(title)
  }
  if (chapter !== undefined) {
    await dialog.getByLabel('Chapter or unit, optional').fill(chapter)
  }
  await dialog.getByRole('button', { name: /Add topic|Save changes/ }).click()
  await expect(dialog).toBeHidden()
}

/**
 * Accept or dismiss the next native confirm dialog.
 */
export const acceptNextDialog = (page) => page.once('dialog', (d) => d.accept())
export const dismissNextDialog = (page) => page.once('dialog', (d) => d.dismiss())

/**
 * Read revision localStorage from the page context.
 */
export const readStorage = async (page, key) => {
  return page.evaluate((k) => JSON.parse(window.localStorage.getItem(k) || 'null'), key)
}

/**
 * Read all revision storage keys.
 */
export const readAllStorage = async (page) => {
  return page.evaluate(() => {
    const data = {}
    for (const key of ['revision-books', 'revision-schedules', 'revision-checklists', 'revision-coverage', 'revision-canvas', 'revision-settings']) {
      data[key] = JSON.parse(window.localStorage.getItem(key) || 'null')
    }
    return data
  })
}