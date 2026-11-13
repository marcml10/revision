import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openBook, renderWithBooks } from '../support/render-app.jsx'

describe('Library search', () => {
  it('finds topics by title across all books', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))

    await user.type(mainRegion().getByRole('textbox', { name: 'Search books or topics' }), 'hooks')

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Results' })).toBeInTheDocument()
    expect(mainRegion().getByText('1 topic found')).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: /^Hooks in depth/ })).toBeInTheDocument()
  })

  it('also matches the book title', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))

    await user.type(mainRegion().getByRole('textbox', { name: 'Search books or topics' }), 'clean code')

    expect(mainRegion().getByText('1 topic found')).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: /^Meaningful names/ })).toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))

    await user.type(mainRegion().getByRole('textbox', { name: 'Search books or topics' }), 'quantum physics')

    expect(mainRegion().getByText('0 topics found')).toBeInTheDocument()
    expect(mainRegion().getByText(/Nothing matched/)).toBeInTheDocument()
  })

  it('restores the book grid when the query is cleared', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))
    const search = mainRegion().getByRole('textbox', { name: 'Search books or topics' })

    await user.type(search, 'hooks')
    await user.clear(search)

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Your books' })).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: 'Open Clean Code' })).toBeInTheDocument()
  })

  it('filters topics inside an open book', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')
    const search = mainRegion().getByRole('textbox', { name: 'Search topics' })

    await user.type(search, 'state')
    expect(mainRegion().getByRole('button', { name: /^State patterns/ })).toBeInTheDocument()
    expect(mainRegion().queryByRole('button', { name: /^Hooks in depth/ })).not.toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'zzz')
    expect(mainRegion().getByText('No topics in this book match your search.')).toBeInTheDocument()
  })
})
