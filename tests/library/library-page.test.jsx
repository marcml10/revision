import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dockButton, mainRegion, renderWithBooks } from '../support/render-app.jsx'

describe('Library page', () => {
  it('shows library metadata and every book', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))

    expect(screen.getByRole('heading', { level: 1, name: 'Your library' })).toBeInTheDocument()
    expect(mainRegion().getByText('2 books · 3 topics')).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: 'Open Learning React' })).toBeInTheDocument()
    expect(mainRegion().getByRole('button', { name: 'Open Clean Code' })).toBeInTheDocument()
  })

  it('features a topic that is due today', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))

    const hero = mainRegion().getByRole('button', { name: /Continue revising/ })
    expect(hero).toHaveTextContent('Hooks in depth')
    expect(hero).toHaveTextContent('Learning React · due Today')
  })

  it('opens the featured book from the hero card', async () => {
    const { user } = renderWithBooks()
    await user.click(dockButton('Library'))
    await user.click(mainRegion().getByRole('button', { name: /Continue revising/ }))

    expect(mainRegion().getByRole('heading', { level: 2, name: 'Learning React' })).toBeInTheDocument()
  })
})
