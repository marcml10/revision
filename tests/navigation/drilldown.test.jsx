import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openBook, openTopic, renderWithBooks } from '../support/render-app.jsx'

describe('Drill-down navigation', () => {
  it('moves from library to a book to a topic and back', async () => {
    const { user } = renderWithBooks()

    await openBook(user, 'Learning React')
    expect(mainRegion().getByRole('heading', { level: 2, name: 'Learning React' })).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: /Add a topic/ })).toBeInTheDocument()

    await user.click(mainRegion().getByRole('button', { name: /^Hooks in depth/ }))
    expect(mainRegion().getByRole('button', { name: 'Learning React' })).toBeInTheDocument()
    expect(dockButton('Library').closest('nav')).toHaveClass('dock-hidden')

    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))
    expect(mainRegion().getByRole('heading', { level: 2, name: 'Learning React' })).toBeInTheDocument()
    expect(dockButton('Library').closest('nav')).not.toHaveClass('dock-hidden')
  })

  it('opens a topic from the home focus card', async () => {
    const { user } = renderWithBooks()

    await user.click(screen.getByRole('button', { name: /Up next/ }))
    expect(mainRegion().getByRole('button', { name: 'Learning React' })).toBeInTheDocument()
    expect(mainRegion().getByRole('tablist', { name: 'Topic spaces' })).toBeInTheDocument()
  })

  it('opens a topic from a calendar review row', async () => {
    const { user } = renderWithBooks()

    await user.click(dockButton('Calendar'))
    await user.click(screen.getByRole('button', { name: /Hooks in depth/ }))

    expect(mainRegion().getByRole('button', { name: 'Learning React' })).toBeInTheDocument()
    expect(dockButton('Calendar').closest('nav')).toHaveClass('dock-hidden')
  })

  it('returns to the library root and clears the search query', async () => {
    const { user } = renderWithBooks()

    await openTopic(user, 'Learning React', 'Hooks in depth')
    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))

    const search = mainRegion().getByRole('textbox', { name: 'Search topics' })
    await user.type(search, 'hooks')
    await user.click(mainRegion().getByRole('button', { name: 'Library' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your library' })).toBeInTheDocument()
    expect(mainRegion().getByRole('textbox', { name: 'Search books or topics' })).toHaveValue('')
  })
})
