import { expect, test } from '@playwright/test'
import {
  seedLibraryStorage,
  initStorage,
  initClearStorage,
  waitForAppReady,
  getDock,
  openLibrary,
  openBook,
  backToLibrary,
  openTopicFromBook,
  openAddBookSheet,
  openEditBookSheet,
  saveBookForm,
  openAddTopicSheet,
  openEditTopicSheet,
  saveTopicForm,
  acceptNextDialog,
  readStorage,
  readAllStorage,
  TOMORROW,
} from './fixtures/library-page.fixture.js'

test.describe('Library Page — Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    initClearStorage(page)
    initStorage(page, seedLibraryStorage())
    await page.goto('/')
    await waitForAppReady(page)
  })

  // ============================================================
  // A. Library Root
  // ============================================================
  test.describe('Library Root', () => {
    test('L-01: boots Library root with header, meta, and book cards', async ({ page }) => {
      await openLibrary(page)

      await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
      await expect(page.getByText('2 books · 3 topics')).toBeVisible()

      await expect(page.getByRole('button', { name: 'Open Learning React' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Clean Code' })).toBeVisible()
    })

    test('L-02: book cards show topics count, next due, and progress', async ({ page }) => {
      await openLibrary(page)

      const learningReactCard = page.getByRole('button', { name: 'Open Learning React' })
      await expect(learningReactCard).toContainText('2 topics')
      await expect(learningReactCard).toContainText('Next · Today')
      await expect(learningReactCard).toContainText('75%')

      const cleanCodeCard = page.getByRole('button', { name: 'Open Clean Code' })
      await expect(cleanCodeCard).toContainText('1 topics')
      await expect(cleanCodeCard).toContainText('Unscheduled')
      await expect(cleanCodeCard).toContainText('0%')
    })

    test('L-03: featured hero appears when a topic is due today', async ({ page }) => {
      await openLibrary(page)

      const hero = page.getByRole('button', { name: /Continue revising/ })
      await expect(hero).toBeVisible()
      await expect(hero).toContainText('Hooks in depth')
      await expect(hero).toContainText('Learning React · due Today')
    })

    test('L-04: hero falls back to first topic when none due today', async ({ page }) => {
      await page.evaluate((data) => {
        Object.entries(data).forEach(([key, value]) => {
          window.localStorage.setItem(key, JSON.stringify(value))
        })
      }, seedLibraryStorage({
        'revision-books': [
          { id: 'b1', title: 'Learning React', author: 'Alex Banks', accent: 'coral', topics: [
            { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TOMORROW, progress: 0 },
          ] },
        ],
      }))
      await page.reload()
      await waitForAppReady(page)

      await openLibrary(page)
      const hero = page.getByRole('button', { name: /Continue revising/ })
      await expect(hero).toBeVisible()
      await expect(hero).toContainText('Hooks in depth')
    })

    test('L-06: search by topic title filters results', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('hooks')

      await expect(page.getByRole('heading', { level: 2, name: 'Results' })).toBeVisible()
      await expect(page.getByText('1 topic found')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).toBeVisible()
    })
  })

  // ============================================================
  // B. Drill-down and Navigation
  // ============================================================
  test.describe('Drill-down and Navigation', () => {
    test('L-11: opening book from card shows book detail with topics', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')

      await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()
      await expect(page.getByText('Alex Banks')).toBeVisible()
      await expect(page.getByText('75%')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^State patterns/ })).toBeVisible()
    })

    test('L-12: back button from book returns to library root and clears search', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      await backToLibrary(page)

      await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
      await expect(page.getByRole('textbox', { name: 'Search books or topics' })).toHaveValue('')
    })

    test('L-13: opening topic from book shows topic page with Notes tab', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      await openTopicFromBook(page, 'Hooks in depth')

      await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
      await expect(page.getByRole('textbox', { name: 'Notes' })).toBeVisible()
    })

    test('L-14: dock is hidden and inert while topic is open', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      await openTopicFromBook(page, 'Hooks in depth')

      const dock = getDock(page)
      await expect(dock).toHaveClass(/dock-hidden/)
      await expect(dock).toHaveAttribute('inert', '')

      await page.getByRole('main').getByRole('button', { name: 'Learning React' }).click()
      await expect(dock).not.toHaveClass(/dock-hidden/)
      await expect(dock).not.toHaveAttribute('inert', '')
    })

    test('L-16: clicking a search result opens the topic page directly', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('hooks')
      await page.getByRole('button', { name: /^Hooks in depth/ }).click()

      await expect(page.getByRole('tablist', { name: 'Topic spaces' })).toBeVisible()
      await expect(page.getByRole('tab', { name: 'Notes', selected: true })).toBeVisible()
    })
  })

  // ============================================================
  // C. Add Book
  // ============================================================
  test.describe('Add Book', () => {
    test('L-18: add book with title, author, and colour persists and opens book detail', async ({ page }) => {
      await openLibrary(page)
      const dialog = await openAddBookSheet(page)

      await dialog.getByLabel('Book title').fill('Deep Work')
      await dialog.getByLabel('Author, optional').fill('Cal Newport')
      await dialog.getByRole('radio', { name: 'Blue' }).check()
      await saveBookForm(dialog, {})

      await expect(page.getByRole('heading', { level: 2, name: 'Deep Work' })).toBeVisible()
      await expect(page.getByText('No topics yet — add your first below.')).toBeVisible()

      const books = await readStorage(page, 'revision-books')
      const added = books.find((b) => b.title === 'Deep Work')
      expect(added).toBeDefined()
      expect(added.author).toBe('Cal Newport')
      expect(added.accent).toBe('blue')
    })
  })

  // ============================================================
  // D. Edit / Delete Book
  // ============================================================
  test.describe('Edit / Delete Book', () => {
    test('L-23: renaming book updates hero and library card', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      await expect(dialog.getByLabel('Book title')).toHaveValue('Learning React')
      await expect(dialog.getByLabel('Author, optional')).toHaveValue('Alex Banks')

      await saveBookForm(dialog, { title: 'React Deep Dive' })

      await expect(page.getByRole('heading', { level: 2, name: 'React Deep Dive' })).toBeVisible()
      await backToLibrary(page)
      await expect(page.getByRole('button', { name: 'Open React Deep Dive' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Learning React' })).not.toBeVisible()
    })

    test('L-26: delete confirm removes book and updates counts', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      acceptNextDialog(page)
      await dialog.getByRole('button', { name: /Delete book/ }).click()

      await expect(page.getByRole('heading', { level: 1, name: 'Your library' })).toBeVisible()
      await expect(page.getByText('1 books · 1 topics')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Learning React' })).not.toBeVisible()
    })

    test('L-27: delete book also removes its schedules, checklists, coverage, and canvas', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      acceptNextDialog(page)
      await dialog.getByRole('button', { name: /Delete book/ }).click()

      const storage = await readAllStorage(page)
      expect(storage['revision-schedules'].t1).toBeUndefined()
      expect(storage['revision-schedules'].t2).toBeUndefined()
      expect(storage['revision-checklists'].t1).toBeUndefined()
      expect(storage['revision-checklists'].t2).toBeUndefined()
      expect(storage['revision-coverage'].t1).toBeUndefined()
      expect(storage['revision-coverage'].t2).toBeUndefined()
      expect(storage['revision-canvas'].t1).toBeUndefined()
      expect(storage['revision-canvas'].t2).toBeUndefined()

      expect(storage['revision-checklists'].t3).toBeDefined()
      expect(storage['revision-coverage'].t3).toBeDefined()
      expect(storage['revision-canvas'].t3).toBeDefined()
    })
  })

  // ============================================================
  // E. Topics
  // ============================================================
  test.describe('Topics', () => {
    test('L-29: add topic happy path creates row with defaults', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openAddTopicSheet(page)

      await dialog.getByLabel('Topic title').fill('New Topic')
      await saveTopicForm(dialog, {})

      await expect(page.getByRole('button', { name: /^New Topic/ })).toBeVisible()
      await expect(page.getByText('3 topics')).toBeVisible()

      const books = await readStorage(page, 'revision-books')
      const lr = books.find((b) => b.title === 'Learning React')
      const topic = lr.topics.find((t) => t.title === 'New Topic')
      expect(topic).toBeDefined()
      expect(topic.chapter).toBe('General')
      expect(topic.due).toBe('Unscheduled')
    })

    test('L-31: renaming topic and changing chapter persists', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')

      await expect(dialog.getByLabel('Topic title')).toHaveValue('Hooks in depth')
      await expect(dialog.getByLabel('Chapter or unit, optional')).toHaveValue('Ch 7')

      await saveTopicForm(dialog, { title: 'Hooks Updated', chapter: 'Ch 7 Revised' })

      await expect(page.getByRole('button', { name: /^Hooks Updated/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).not.toBeVisible()

      const books = await readStorage(page, 'revision-books')
      const lr = books.find((b) => b.title === 'Learning React')
      const topic = lr.topics.find((t) => t.title === 'Hooks Updated')
      expect(topic.chapter).toBe('Ch 7 Revised')
    })

    test('L-33: delete topic confirm removes topic and cleans up associated data', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'State patterns')

      acceptNextDialog(page)
      await dialog.getByRole('button', { name: 'Delete topic' }).click()

      await expect(page.getByRole('button', { name: /^State patterns/ })).not.toBeVisible()
      await expect(page.locator('small').first()).toContainText('1 topic')

      const storage = await readAllStorage(page)
      expect(storage['revision-schedules'].t2).toBeUndefined()
      expect(storage['revision-checklists'].t2).toBeUndefined()
      expect(storage['revision-coverage'].t2).toBeUndefined()
      expect(storage['revision-canvas'].t2).toBeUndefined()

      expect(storage['revision-schedules'].t1).toBeDefined()
      expect(storage['revision-checklists'].t1).toBeDefined()
      expect(storage['revision-coverage'].t1).toBeDefined()
      expect(storage['revision-canvas'].t1).toBeDefined()
    })
  })
})

// ============================================================
// Reload Persistence Tests
// ============================================================
test.describe('Library Page — Reload Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('L-36: topic notes persist across reload', async ({ page }) => {
    await page.evaluate((data) => {
      Object.entries(data).forEach(([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value))
      })
    }, seedLibraryStorage())
    
    await page.reload()
    await waitForAppReady(page)

    await openLibrary(page)
    await openBook(page, 'Learning React')
    await openTopicFromBook(page, 'Hooks in depth')

    await page.getByRole('textbox', { name: 'Notes' }).fill('Persisted note')
    await page.waitForFunction(() => {
      const c = JSON.parse(localStorage.getItem('revision-checklists') || '{}')
      return c.t1?.note === 'Persisted note'
    })

    let checklists = await readStorage(page, 'revision-checklists')
    expect(checklists.t1.note).toBe('Persisted note')

    await page.reload()
    await waitForAppReady(page)

    await expect.poll(async () => {
      const c = await readStorage(page, 'revision-checklists')
      return c?.t1?.note
    }).toBe('Persisted note')
  })

  test('L-38: CRUD operations survive reload', async ({ page }) => {
    await page.evaluate((data) => {
      Object.entries(data).forEach(([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value))
      })
    }, seedLibraryStorage())
    
    await page.reload()
    await waitForAppReady(page)

    await openLibrary(page)
    const dialog = await openAddBookSheet(page)
    await saveBookForm(dialog, { title: 'Reload Test', author: 'Tester', accent: 'Green' })

    await page.waitForFunction(() => {
      const b = JSON.parse(localStorage.getItem('revision-books') || '[]')
      return b.some((book) => book.title === 'Reload Test')
    })

    await backToLibrary(page)
    await openBook(page, 'Reload Test')
    const addTopicDialog = await openAddTopicSheet(page)
    await saveTopicForm(addTopicDialog, { title: 'Reload Topic' })

    await page.waitForFunction(() => {
      const b = JSON.parse(localStorage.getItem('revision-books') || '[]')
      const rt = b.find((book) => book.title === 'Reload Test')
      return rt && rt.topics.some((t) => t.title === 'Reload Topic')
    })

    await page.reload()
    await waitForAppReady(page)
    await openLibrary(page)

    await expect(page.getByRole('button', { name: 'Open Reload Test' })).toBeVisible()
    await openBook(page, 'Reload Test')
    await expect(page.getByRole('button', { name: /^Reload Topic/ })).toBeVisible()

    const editDialog = await openEditBookSheet(page, 'Reload Test')
    await saveBookForm(editDialog, { title: 'Reload Test Renamed' })

    await page.waitForFunction(() => {
      const b = JSON.parse(localStorage.getItem('revision-books') || '[]')
      return b.some((book) => book.title === 'Reload Test Renamed')
    })

    await page.reload()
    await waitForAppReady(page)
    await openLibrary(page)
    await expect(page.getByRole('button', { name: 'Open Reload Test Renamed' })).toBeVisible()
  })
})
