import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, openTopic, renderWithBooks } from '../support/render-app.jsx'

describe('Topic page', () => {
  it('opens on the notes space with the topic tabs available', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')

    const tabs = mainRegion().getByRole('tablist', { name: 'Topic spaces' })
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'false')
    expect(tabs).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument()
  })

  it('switches between notes and board spaces', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')

    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Board' }))
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Pen' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Notes' }))
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument()
  })

  it('hides the dock while a topic is open and restores it on back', async () => {
    const { user } = renderWithBooks()
    await openTopic(user, 'Learning React', 'Hooks in depth')

    expect(dockButton('Library').closest('nav')).toHaveClass('dock-hidden')

    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))
    expect(dockButton('Library').closest('nav')).not.toHaveClass('dock-hidden')
  })
})
