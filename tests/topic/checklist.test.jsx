import { describe, expect, it } from 'vitest'
import { mainRegion, renderWithBooks } from '../support/render-app.jsx'
import { openNotes } from '../support/navigation.js'
import { item, TODAY } from '../support/fixtures.js'

describe('Topic checklist state', () => {
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
