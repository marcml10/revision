import { describe, expect, it } from 'vitest'
import { renderWithBooks } from '../support/render-app.jsx'
import { item, TODAY, YESTERDAY } from '../support/fixtures.js'

const read = (key) => JSON.parse(window.localStorage.getItem(key))

describe('Daily rollover', () => {
  it('archives yesterday’s coverage and unticks every checklist item', () => {
    renderWithBooks({
      'revision-checklists': {
        t1: { day: YESTERDAY, items: [item('i1', 'Read docs', true), item('i2', 'Write hook', false)], note: 'keep me' },
      },
    })

    const checklists = read('revision-checklists')
    expect(checklists.t1.day).toBe(TODAY)
    expect(checklists.t1.items.map((it) => it.done)).toEqual([false, false])
    expect(checklists.t1.note).toBe('keep me')

    expect(read('revision-coverage').t1[YESTERDAY]).toBe(50)
  })

  it('leaves today’s checklist untouched', () => {
    renderWithBooks({
      'revision-checklists': { t1: { day: TODAY, items: [item('i1', 'Read docs', true)], note: '' } },
    })

    expect(read('revision-checklists').t1.items[0].done).toBe(true)
  })

  it('does not archive empty checklists', () => {
    renderWithBooks({
      'revision-checklists': { t1: { day: YESTERDAY, items: [], note: '' } },
    })

    expect(read('revision-coverage')).toEqual({})
  })
})
