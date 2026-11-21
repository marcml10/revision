import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, renderApp, renderWithBooks } from '../support/render-app.jsx'
import { openNotes } from '../support/navigation.js'
import { booksFixture, TODAY } from '../support/fixtures.js'

const read = (key) => JSON.parse(window.localStorage.getItem(key))

describe('Local storage persistence', () => {
  it('writes every revision data key on startup', () => {
    renderWithBooks()

    for (const key of ['revision-books', 'revision-schedules', 'revision-checklists', 'revision-coverage', 'revision-canvas', 'revision-settings']) {
      expect(window.localStorage.getItem(key)).not.toBeNull()
    }
  })

  it('falls back to seed books when stored books are corrupt', async () => {
    window.localStorage.setItem('revision-books', '{not valid json')
    const { user } = renderApp({ seed: false })

    await user.click(dockButton('Library'))
    expect(mainRegion().getByText('4 books · 10 topics')).toBeInTheDocument()
    expect(window.localStorage.getItem('revision-books')).not.toBe('{not valid json')
  })

  it('migrates legacy text due dates to ISO dates', () => {
    const legacyBooks = booksFixture()
    legacyBooks[0].topics[0].due = 'Today'
    renderApp({ storage: { 'revision-books': legacyBooks } })

    const stored = read('revision-books')
    expect(stored[0].topics[0].due).toBe(TODAY)
  })

  it('persists topic notes made through the UI', async () => {
    const { user } = renderWithBooks()
    await openNotes(user)
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Review closures')

    expect(read('revision-checklists').t1.note).toBe('Review closures')
  })

  it('persists settings and schedules across reloads', async () => {
    const first = renderWithBooks()
    await first.user.click(dockButton('Settings'))
    await first.user.click(screen.getByRole('button', { name: /^7/ }))
    first.unmount()

    expect(read('revision-settings').weeklyGoal).toBe(7)
    expect(read('revision-schedules')).toEqual({})

    const second = renderApp({ seed: false })
    await second.user.click(dockButton('Settings'))
    const group = screen.getByRole('group', { name: 'Weekly review goal' })
    expect(within(group).getByRole('button', { name: /^7/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
