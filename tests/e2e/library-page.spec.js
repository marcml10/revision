import { expect, test } from '@playwright/test'
import {
  seedLibraryStorage,
  corruptBooksStorage,
  emptyBooksStorage,
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
  dismissNextDialog,
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

    test('L-04: hero falls back to first topic when none due today', async ({ context }) => {
      const freshPage = await context.newPage()
      initClearStorage(freshPage)
      initStorage(freshPage, seedLibraryStorage({
        'revision-books': [
          { id: 'b1', title: 'Learning React', author: 'Alex Banks', accent: 'coral', topics: [
            { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TOMORROW, progress: 0 },
          ] },
        ],
      }))
      await freshPage.goto('/')
      await waitForAppReady(freshPage)

      await openLibrary(freshPage)
      const hero = freshPage.getByRole('button', { name: /Continue revising/ })
      await expect(hero).toBeVisible()
      await expect(hero).toContainText('Hooks in depth')
      await freshPage.close()
    })

    test('L-05: empty books array falls back to seed library', async ({ context }) => {
      const freshPage = await context.newPage()
      initClearStorage(freshPage)
      initStorage(freshPage, { 'revision-books': [] })
      await freshPage.goto('/')
      await waitForAppReady(freshPage)

      await openLibrary(freshPage)
      // Empty array falls back to seed library (4 books, 10 topics)
      await expect(freshPage.getByText('4 books · 10 topics')).toBeVisible()
      await expect(freshPage.getByRole('button', { name: /Continue revising/ })).toBeVisible()
      await freshPage.close()
    })

    test('L-06: search by topic title filters results', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('hooks')

      await expect(page.getByRole('heading', { level: 2, name: 'Results' })).toBeVisible()
      await expect(page.getByText('1 topic found')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).toBeVisible()
    })

    test('L-07: search by book title matches its topics', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('clean code')

      await expect(page.getByText('1 topic found')).toBeVisible()
      await expect(page.getByRole('button', { name: /^Meaningful names/ })).toBeVisible()
    })

    test('L-08: empty query after trimming shows regular library view', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('   ')

      // Whitespace-only query is trimmed to empty, so it shows regular library view
      await expect(page.getByRole('heading', { level: 2, name: 'Your books' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Clean Code' })).toBeVisible()
    })

    test('L-09: no-match state shows empty message', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('quantum physics')

      await expect(page.getByText('0 topics found')).toBeVisible()
      await expect(page.getByText(/Nothing matched/)).toBeVisible()
    })

    test('L-10: clearing search restores book grid', async ({ page }) => {
      await openLibrary(page)
      const search = page.getByRole('textbox', { name: 'Search books or topics' })
      await search.fill('hooks')
      await search.clear()

      await expect(page.getByRole('heading', { level: 2, name: 'Your books' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Clean Code' })).toBeVisible()
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
    test('L-17: save button disabled for empty or whitespace title', async ({ page }) => {
      await openLibrary(page)
      const dialog = await openAddBookSheet(page)

      const saveButton = dialog.getByRole('button', { name: 'Add book' })
      await expect(saveButton).toBeDisabled()

      await dialog.getByLabel('Book title').fill('   ')
      await expect(saveButton).toBeDisabled()
    })

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

    test('L-19: author is optional and defaults to "Your notes"', async ({ page }) => {
      await openLibrary(page)
      const dialog = await openAddBookSheet(page)

      await dialog.getByLabel('Book title').fill('Authorless Book')
      await saveBookForm(dialog, {})

      const books = await readStorage(page, 'revision-books')
      const added = books.find((b) => b.title === 'Authorless Book')
      expect(added.author).toBe('Your notes')
    })

    test('L-20: cover colour radio group is mutually exclusive', async ({ page }) => {
      await openLibrary(page)
      const dialog = await openAddBookSheet(page)

      await dialog.getByLabel('Book title').fill('Colour Test')
      await dialog.getByRole('radio', { name: 'Coral' }).check()
      await expect(dialog.getByRole('radio', { name: 'Coral' })).toHaveAttribute('aria-checked', 'true')
      await expect(dialog.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'false')

      await dialog.getByRole('radio', { name: 'Blue' }).check()
      await expect(dialog.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true')
      await expect(dialog.getByRole('radio', { name: 'Coral' })).toHaveAttribute('aria-checked', 'false')
    })

    test('L-21: cancel add book via Escape and backdrop', async ({ page }) => {
      await openLibrary(page)
      const dialog = await openAddBookSheet(page)

      await dialog.getByLabel('Book title').fill('Should Not Save')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()

      await openAddBookSheet(page)
      await dialog.getByLabel('Book title').fill('Should Not Save Either')
      await page.locator('.sheet-backdrop').click({ position: { x: 1, y: 1 } })
      await expect(dialog).toBeHidden()

      const books = await readStorage(page, 'revision-books')
      expect(books.find((b) => b.title === 'Should Not Save')).toBeUndefined()
      expect(books.find((b) => b.title === 'Should Not Save Either')).toBeUndefined()
    })
  })

  // ============================================================
  // D. Edit / Delete Book
  // ============================================================
  test.describe('Edit / Delete Book', () => {
    test('L-22: edit sheet is prefilled with current values', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      await expect(dialog.getByLabel('Book title')).toHaveValue('Learning React')
      await expect(dialog.getByLabel('Author, optional')).toHaveValue('Alex Banks')
      await expect(dialog.getByRole('radio', { name: 'Coral' })).toHaveAttribute('aria-checked', 'true')
    })

    test('L-23: renaming book updates hero and library card', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      await saveBookForm(dialog, { title: 'React Deep Dive' })

      await expect(page.getByRole('heading', { level: 2, name: 'React Deep Dive' })).toBeVisible()
      await backToLibrary(page)
      await expect(page.getByRole('button', { name: 'Open React Deep Dive' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open Learning React' })).not.toBeVisible()
    })

    test('L-25: delete cancel dismisses native confirm and keeps book', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditBookSheet(page, 'Learning React')

      dismissNextDialog(page)
      await dialog.getByRole('button', { name: /Delete book/ }).click()

      await expect(page.getByRole('heading', { level: 2, name: 'Learning React' })).toBeVisible()
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
      // t1 and t2 (Learning React's topics) should be cleaned up
      expect(storage['revision-schedules'].t1).toBeUndefined()
      expect(storage['revision-schedules'].t2).toBeUndefined()
      expect(storage['revision-checklists'].t1).toBeUndefined()
      expect(storage['revision-checklists'].t2).toBeUndefined()
      expect(storage['revision-coverage'].t1).toBeUndefined()
      expect(storage['revision-coverage'].t2).toBeUndefined()
      expect(storage['revision-canvas'].t1).toBeUndefined()
      expect(storage['revision-canvas'].t2).toBeUndefined()

      // t3 (Clean Code's topic) should remain
      // Note: t3 has no schedule initially, but has checklist, coverage, and canvas
      expect(storage['revision-checklists'].t3).toBeDefined()
      expect(storage['revision-coverage'].t3).toBeDefined()
      expect(storage['revision-canvas'].t3).toBeDefined()
    })
  })

  // ============================================================
  // E. Topics
  // ============================================================
  test.describe('Topics', () => {
    test('L-28: add topic save disabled for empty or whitespace title', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openAddTopicSheet(page)

      const saveButton = dialog.getByRole('button', { name: 'Add topic' })
      await expect(saveButton).toBeDisabled()

      await dialog.getByLabel('Topic title').fill('   ')
      await expect(saveButton).toBeDisabled()
    })

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

    test('L-30: edit topic sheet is prefilled', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')

      await expect(dialog.getByLabel('Topic title')).toHaveValue('Hooks in depth')
      await expect(dialog.getByLabel('Chapter or unit, optional')).toHaveValue('Ch 7')
    })

    test('L-31: renaming topic and changing chapter persists', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'Hooks in depth')

      await saveTopicForm(dialog, { title: 'Hooks Updated', chapter: 'Ch 7 Revised' })

      await expect(page.getByRole('button', { name: /^Hooks Updated/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).not.toBeVisible()

      const books = await readStorage(page, 'revision-books')
      const lr = books.find((b) => b.title === 'Learning React')
      const topic = lr.topics.find((t) => t.title === 'Hooks Updated')
      expect(topic.chapter).toBe('Ch 7 Revised')
    })

    test('L-32: delete topic cancel dismisses native confirm and keeps topic', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'State patterns')

      dismissNextDialog(page)
      await dialog.getByRole('button', { name: 'Delete topic' }).click()

      await expect(page.getByRole('button', { name: /^State patterns/ })).toBeVisible()
    })

    test('L-33: delete topic confirm removes topic and cleans up associated data', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const dialog = await openEditTopicSheet(page, 'State patterns')

      acceptNextDialog(page)
      await dialog.getByRole('button', { name: 'Delete topic' }).click()

      await expect(page.getByRole('button', { name: /^State patterns/ })).not.toBeVisible()
      // Book detail meta shows "1 topic · next review ..."
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

    test('L-34: book with no topics shows empty state', async ({ context }) => {
      const freshPage = await context.newPage()
      initClearStorage(freshPage)
      initStorage(freshPage, {
        'revision-books': [
          { id: 'b1', title: 'Empty Book', author: 'Author', accent: 'coral', topics: [] },
        ],
      })
      await freshPage.goto('/')
      await waitForAppReady(freshPage)

      await openLibrary(freshPage)
      await openBook(freshPage, 'Empty Book')

      await expect(freshPage.getByText('No topics yet — add your first below.')).toBeVisible()
      await expect(freshPage.getByRole('textbox', { name: 'Search topics' })).not.toBeVisible()
      await freshPage.close()
    })

    test('L-35: in-book search filters topic rows', async ({ page }) => {
      await openLibrary(page)
      await openBook(page, 'Learning React')
      const search = page.getByRole('textbox', { name: 'Search topics' })

      await search.fill('state')
      await expect(page.getByRole('button', { name: /^State patterns/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /^Hooks in depth/ })).not.toBeVisible()

      await search.fill('zzz')
      await expect(page.getByText('No topics in this book match your search.')).toBeVisible()
    })
  })

  // ============================================================
  // F. Persistence & Resilience
  // ============================================================
  test.describe('Persistence & Resilience', () => {
    test('L-39: corrupt books storage falls back to seed library', async ({ context }) => {
      const freshPage = await context.newPage()
      initClearStorage(freshPage)
      initStorage(freshPage, corruptBooksStorage())
      await freshPage.goto('/')
      await waitForAppReady(freshPage)

      await openLibrary(freshPage)
      // Seed library has 4 books and 10 topics
      await expect(freshPage.getByText('4 books · 10 topics')).toBeVisible()
      await freshPage.close()
    })

    test('L-40: empty books array falls back to seed library', async ({ context }) => {
      const freshPage = await context.newPage()
      initClearStorage(freshPage)
      initStorage(freshPage, emptyBooksStorage())
      await freshPage.goto('/')
      await waitForAppReady(freshPage)

      await openLibrary(freshPage)
      // Empty array falls back to seed library (4 books, 10 topics)
      await expect(freshPage.getByText('4 books · 10 topics')).toBeVisible()
      await freshPage.close()
    })
  })
})

// ============================================================
// Reload Persistence Tests (separate suite to avoid beforeEach initStorage)
// ============================================================
test.describe('Library Page — Reload Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // No initStorage here - we'll set up manually in each test
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('L-36: topic notes persist across reload', async ({ page }) => {
    // Set up test data directly in localStorage, then reload
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
    // Wait for the localStorage to update
    await page.waitForFunction(() => {
      const c = JSON.parse(localStorage.getItem('revision-checklists') || '{}')
      return c.t1?.note === 'Persisted note'
    })

    // Verify localStorage has the note before reload
    let checklists = await readStorage(page, 'revision-checklists')
    expect(checklists.t1.note).toBe('Persisted note')

    // Reload and verify
    await page.reload()
    await waitForAppReady(page)
    await page.waitForTimeout(200)
    checklists = await readStorage(page, 'revision-checklists')
    expect(checklists.t1.note).toBe('Persisted note')
  })

  test('L-38: CRUD operations survive reload', async ({ page }) => {
    // Set up test data directly in localStorage, then reload
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

    // Wait for books to persist
    await page.waitForFunction(() => {
      const b = JSON.parse(localStorage.getItem('revision-books') || '[]')
      return b.some((book) => book.title === 'Reload Test')
    })

    await backToLibrary(page)
    await openBook(page, 'Reload Test')
    const addTopicDialog = await openAddTopicSheet(page)
    await saveTopicForm(addTopicDialog, { title: 'Reload Topic' })

    // Wait for topic to persist
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

    // Edit and verify - get fresh edit dialog
    const editDialog = await openEditBookSheet(page, 'Reload Test')
    await saveBookForm(editDialog, { title: 'Reload Test Renamed' })

    // Wait for rename to persist
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