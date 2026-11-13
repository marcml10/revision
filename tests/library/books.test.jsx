import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openBook, renderWithBooks } from '../support/render-app.jsx'

describe('Book management', () => {
  it('adds a book with a title, author, and cover colour', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))
    await user.click(mainRegion().getByRole('button', { name: /Add a book/ }))

    const dialog = screen.getByRole('dialog', { name: 'Add a book: New in your library' })
    const save = screen.getByRole('button', { name: 'Add book' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText('Book title'), 'Deep Work')
    await user.type(screen.getByLabelText('Author, optional'), 'Cal Newport')
    await user.click(screen.getByRole('radio', { name: 'Blue' }))
    expect(save).toBeEnabled()
    await user.click(save)

    expect(dialog).not.toBeInTheDocument()
    expect(mainRegion().getByRole('heading', { level: 2, name: 'Deep Work' })).toBeInTheDocument()
    expect(mainRegion().getByText('No topics yet — add your first below.')).toBeInTheDocument()
  })

  it('renames a book', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete Learning React' }))
    expect(screen.getByRole('dialog', { name: 'Edit book: Learning React' })).toBeInTheDocument()

    const title = screen.getByLabelText('Book title')
    await user.clear(title)
    await user.type(title, 'React Deep Dive')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(mainRegion().getByRole('heading', { level: 2, name: 'React Deep Dive' })).toBeInTheDocument()
  })

  it('deletes a book after confirmation and returns to the library', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete Learning React' }))
    await user.click(screen.getByRole('button', { name: /Delete book/ }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Learning React'))
    expect(screen.getByRole('heading', { level: 1, name: 'Your library' })).toBeInTheDocument()
    expect(mainRegion().queryByRole('button', { name: 'Open Learning React' })).not.toBeInTheDocument()
    expect(mainRegion().getByText('1 books · 1 topics')).toBeInTheDocument()
  })

  it('keeps the book when deletion is cancelled', async () => {
    const { user } = renderWithBooks({}, { confirm: false })
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete Learning React' }))
    await user.click(screen.getByRole('button', { name: /Delete book/ }))

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Learning React' })).toBeInTheDocument()
  })
})
