import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mainRegion, openBook, renderWithBooks } from '../support/render-app.jsx'

describe('Topic management', () => {
  it('adds a topic to an open book', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: /Add a topic/ }))
    expect(screen.getByRole('dialog', { name: 'Add a topic: Learning React' })).toBeInTheDocument()

    const save = screen.getByRole('button', { name: 'Add topic' })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText('Topic title'), 'Effects and refs')
    await user.type(screen.getByLabelText('Chapter or unit, optional'), 'Ch 8')
    await user.click(save)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: /^Effects and refs/ })).toBeInTheDocument()
    expect(mainRegion().getByText(/3 topics/)).toBeInTheDocument()
  })

  it('renames a topic from the row menu', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete Hooks in depth' }))
    expect(screen.getByRole('dialog', { name: 'Edit topic: Hooks in depth' })).toBeInTheDocument()

    const title = screen.getByLabelText('Topic title')
    await user.clear(title)
    await user.type(title, 'Hooks in practice')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(mainRegion().getByRole('button', { name: /^Hooks in practice/ })).toBeInTheDocument()
    expect(mainRegion().queryByRole('button', { name: /^Hooks in depth/ })).not.toBeInTheDocument()
  })

  it('deletes a topic after confirmation', async () => {
    const { user } = renderWithBooks()
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete State patterns' }))
    await user.click(screen.getByRole('button', { name: /Delete topic/ }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('State patterns'))
    expect(mainRegion().queryByRole('button', { name: /^State patterns/ })).not.toBeInTheDocument()
  })

  it('keeps the topic when deletion is cancelled', async () => {
    const { user } = renderWithBooks({}, { confirm: false })
    await openBook(user, 'Learning React')

    await user.click(mainRegion().getByRole('button', { name: 'Edit or delete State patterns' }))
    await user.click(screen.getByRole('button', { name: /Delete topic/ }))

    expect(mainRegion().getByRole('button', { name: /^State patterns/ })).toBeInTheDocument()
  })
})
