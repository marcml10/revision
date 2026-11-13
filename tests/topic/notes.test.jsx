import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mainRegion, openBook, renderApp, renderWithBooks } from '../support/render-app.jsx'
import { openNotes } from '../support/navigation.js'

describe('Topic notes', () => {
  it('stores free-form notes per topic', async () => {
    const { user } = renderWithBooks()
    await openNotes(user)

    const notes = screen.getByRole('textbox', { name: 'Notes' })
    await user.type(notes, 'Recall beats re-reading.')
    expect(notes).toHaveValue('Recall beats re-reading.')

    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))
    await user.click(mainRegion().getByRole('button', { name: /^Hooks in depth/ }))
    await user.click(screen.getByRole('tab', { name: 'Notes' }))

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Recall beats re-reading.')
  })

  it('restores notes after the app is reopened', async () => {
    const first = renderWithBooks()
    await openNotes(first.user)
    await first.user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Spaced repetition works.')
    first.unmount()

    const second = renderApp({ seed: false })
    await openNotes(second.user)

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Spaced repetition works.')
  })

  it('keeps notes separate between topics', async () => {
    const { user } = renderWithBooks()
    await openNotes(user)
    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'Hooks note')

    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))
    await user.click(mainRegion().getByRole('button', { name: /^State patterns/ }))
    await user.click(screen.getByRole('tab', { name: 'Notes' }))

    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('')
  })

  it('returns to the library level from a topic', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')
    await user.click(mainRegion().getByRole('button', { name: /^State patterns/ }))
    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Learning React' })).toBeInTheDocument()
  })
})
