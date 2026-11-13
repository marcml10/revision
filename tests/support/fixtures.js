const pad = (value) => String(value).padStart(2, '0')

export const isoOffset = (offset) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const TODAY = isoOffset(0)
export const YESTERDAY = isoOffset(-1)
export const TOMORROW = isoOffset(1)

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const dayLabel = (iso) => {
  if (iso === TODAY) return 'Today'
  if (iso === TOMORROW) return 'Tomorrow'
  const date = new Date(`${iso}T00:00:00`)
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

export const monthLabel = (monthOffset) => {
  const now = new Date()
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`
}

export const monthOffsetFor = (iso) => {
  const now = new Date()
  const date = new Date(`${iso}T00:00:00`)
  return (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth()
}

export const booksFixture = () => [
  {
    id: 'b1',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 't1', title: 'Hooks in depth', chapter: 'Ch 7', due: TODAY, progress: 0 },
      { id: 't2', title: 'State patterns', chapter: 'Ch 9', due: TOMORROW, progress: 0 },
    ],
  },
  {
    id: 'b2',
    title: 'Clean Code',
    author: 'R. C. Martin',
    accent: 'violet',
    topics: [
      { id: 't3', title: 'Meaningful names', chapter: 'Ch 2', due: 'Unscheduled', progress: 0 },
    ],
  },
]

export const item = (id, text, done = false) => ({ id, text, done })

export const entry = (items = [], note = '') => ({ day: TODAY, items, note })

export const seedStorage = (overrides = {}) => {
  const defaults = {
    'revision-books': booksFixture(),
    'revision-schedules': {},
    'revision-checklists': {},
    'revision-coverage': {},
    'revision-canvas': {},
    'revision-settings': { reminderTime: '09:00', weeklyGoal: 5, compactMode: false, reducedMotion: false },
  }
  Object.entries({ ...defaults, ...overrides }).forEach(([key, value]) => {
    window.localStorage.setItem(key, JSON.stringify(value))
  })
}
