import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mainRegion, renderWithBooks } from '../support/render-app.jsx'
import { openNotes } from '../support/navigation.js'
import { entry, item, TODAY } from '../support/fixtures.js'

describe('Topic checklist', () => {
  it('starts empty with a disabled add button', async () => {
    const { user } = renderWithBooks()
    await openNotes(user)

    expect(screen.getByText('Nothing here yet — add your first point below.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })

  it('adds checklist points and tracks progress', async () => {
    const { user } = renderWithBooks()
    await openNotes(user)

    const input = screen.getByRole('textbox', { name: 'Add a checklist point' })
    await user.type(input, 'Read useEffect docs')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(input, 'Write a custom hook{Enter}')

    expect(screen.getByRole('button', { name: 'Tick Read useEffect docs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tick Write a custom hook' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tick Read useEffect docs' }))
    expect(screen.getByRole('button', { name: 'Untick Read useEffect docs' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))
    expect(mainRegion().getByRole('button', { name: /^Hooks in depth/ })).toHaveTextContent('50%')
  })

  it('unticking a point clears it again', async () => {
    const { user } = renderWithBooks({
      'revision-checklists': { t1: entry([item('i1', 'Read docs', true)]) },
    })
    await openNotes(user)

    await user.click(screen.getByRole('button', { name: 'Untick Read docs' }))

    expect(screen.getByRole('button', { name: 'Tick Read docs' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('removes a checklist point', async () => {
    const { user } = renderWithBooks({
      'revision-checklists': { t1: entry([item('i1', 'Read docs'), item('i2', 'Write hook')]) },
    })
    await openNotes(user)

    await user.click(screen.getByRole('button', { name: 'Remove Read docs' }))

    expect(screen.queryByRole('button', { name: 'Tick Read docs' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tick Write hook' })).toBeInTheDocument()
  })

  it('shows all points as complete when every item is ticked', async () => {
    const { user } = renderWithBooks({
      'revision-checklists': { t1: { day: TODAY, items: [item('i1', 'Read docs', true)], note: '' } },
    })
    await openNotes(user)
    await user.click(mainRegion().getByRole('button', { name: 'Learning React' }))

    const row = mainRegion().getByRole('button', { name: /^Hooks in depth/ })
    expect(row).toHaveClass('topic-main')
    expect(row.closest('.topic-row')).toHaveClass('is-complete')
  })
})
