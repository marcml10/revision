import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openTopic, renderApp, renderWithBooks } from '../support/render-app.jsx'
import { dayLabel, TODAY } from '../support/fixtures.js'

describe('Sheet and tab accessibility', () => {
  it('announces the add-book sheet as a labelled modal dialog', async () => {
    const { user } = renderApp()
    await user.click(dockButton('Library'))
    await user.click(mainRegion().getByRole('button', { name: /Add a book/ }))

    const dialog = screen.getByRole('dialog', { name: 'Add a book: New in your library' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    const colours = screen.getByRole('radiogroup', { name: 'Cover colour' })
    expect(within(colours).getAllByRole('radio')).toHaveLength(5)

    const blue = screen.getByRole('radio', { name: 'Blue' })
    await user.click(blue)
    expect(blue).toHaveAttribute('aria-checked', 'true')
  })

  it('closes the add-book sheet with its labelled close button', async () => {
    const { user } = renderApp()
    await user.click(dockButton('Library'))
    await user.click(mainRegion().getByRole('button', { name: /Add a book/ }))

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('labels the schedule form controls', async () => {
    const { user } = renderWithBooks()
    await user.click(screen.getByRole('button', { name: 'Schedule Hooks in depth' }))

    expect(screen.getByRole('radiogroup', { name: 'Review time' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /Pick a review day in/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Custom time')).toBeInTheDocument()

    const today = screen.getByRole('button', { name: dayLabel(TODAY) })
    expect(today).toHaveAttribute('aria-pressed', 'true')
  })

  it('exposes topic spaces as tabs with selection state', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')

    expect(screen.getByRole('tablist', { name: 'Topic spaces' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'false')
  })

  it('exposes board tools with pressed state', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')
    await user.click(screen.getByRole('tab', { name: 'Board' }))

    const select = screen.getByRole('button', { name: 'Select' })
    expect(select).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Text' }))
    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true')
    expect(select).toHaveAttribute('aria-pressed', 'false')
  })

  it('dismisses a sheet with Escape', async () => {
    const { user } = renderApp()
    await user.click(dockButton('Library'))
    await user.click(mainRegion().getByRole('button', { name: /Add a book/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
