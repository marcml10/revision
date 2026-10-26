import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Brain,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Clock,
  Eraser,
  Flame,
  Layers3,
  MoreHorizontal,
  Pencil,
  PenLine,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import Dock from './components/Dock.jsx'
import SettingsPage from './components/settings/settingsPage.jsx'
import './App.css'

const defaultSettings = {
  reminderTime: '09:00',
  weeklyGoal: 5,
  compactMode: false,
  reducedMotion: false,
}

/* App clock: real today, normalised to midnight. */
const NOW = new Date()
const APP_TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const TODAY_ISO = toIso(APP_TODAY)
const TOMORROW_ISO = toIso(new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate() + 1))
const isoFromToday = (offset) => toIso(new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate() + offset))

const seedBooks = [
  {
    id: 'react',
    title: 'Learning React',
    author: 'Alex Banks',
    accent: 'coral',
    topics: [
      { id: 'react-rsc', title: 'React Server Components', chapter: 'Ch 12', due: TODAY_ISO, progress: 72 },
      { id: 'react-hooks', title: 'Hooks in depth', chapter: 'Ch 7', due: TOMORROW_ISO, progress: 46 },
      { id: 'react-state', title: 'State management patterns', chapter: 'Ch 9', due: isoFromToday(4), progress: 35 },
    ],
  },
  {
    id: 'ddia',
    title: 'Designing Data-Intensive Applications',
    author: 'M. Kleppmann',
    accent: 'blue',
    topics: [
      { id: 'ddia-replication', title: 'Replication', chapter: 'Ch 5', due: isoFromToday(3), progress: 58 },
      { id: 'ddia-partition', title: 'Partitioning', chapter: 'Ch 6', due: isoFromToday(6), progress: 22 },
      { id: 'ddia-consensus', title: 'Consensus & fault tolerance', chapter: 'Ch 9', due: isoFromToday(9), progress: 12 },
    ],
  },
  {
    id: 'spanish',
    title: 'Fluent Spanish',
    author: 'Language guide',
    accent: 'yellow',
    topics: [
      { id: 'es-subjunctive', title: 'Subjunctive mood', chapter: 'Unit 3', due: TOMORROW_ISO, progress: 28 },
      { id: 'es-convo', title: 'Conversation practice', chapter: 'Unit 5', due: isoFromToday(2), progress: 64 },
    ],
  },
  {
    id: 'clean-code',
    title: 'Clean Code',
    author: 'R. C. Martin',
    accent: 'violet',
    topics: [
      { id: 'cc-names', title: 'Meaningful names', chapter: 'Ch 2', due: isoFromToday(5), progress: 88 },
      { id: 'cc-functions', title: 'Functions & arguments', chapter: 'Ch 3', due: isoFromToday(8), progress: 41 },
    ],
  },
]

/* Dues saved by earlier builds were plain labels; map them onto relative ISO dates. */
const LEGACY_DUE_OFFSETS = {
  Today: 0,
  Tomorrow: 1,
  'Fri, 28 Jun': 1,
  'Sat, 29 Jun': 2,
  'Sun, 30 Jun': 3,
  'Mon, 1 Jul': 4,
  'Tue, 2 Jul': 5,
  'Wed, 3 Jul': 6,
  'Thu, 4 Jul': 8,
  'Fri, 5 Jul': 9,
}
const isLegacyDue = (due) => typeof due === 'string' && due !== 'Unscheduled' && !/^\d{4}-/.test(due)

const ACCENTS = [
  { id: 'coral', label: 'Coral' },
  { id: 'blue', label: 'Blue' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'violet', label: 'Violet' },
  { id: 'green', label: 'Green' },
]

function dayLabel(iso) {
  if (iso === TODAY_ISO) return 'Today'
  if (iso === TOMORROW_ISO) return 'Tomorrow'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`
}

function monthOffsetFromToday(iso) {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 0
  return Math.max(0, (date.getFullYear() - APP_TODAY.getFullYear()) * 12 + date.getMonth() - APP_TODAY.getMonth())
}

function lastDays(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate() - (count - 1 - index))
    const weekday = WEEKDAYS_SHORT[date.getDay()]
    return { iso: toIso(date), label: `${weekday} ${date.getDate()}`, initial: weekday[0] }
  })
}

/* Streak = consecutive days of positive progress, counting back from today.
   Today gets grace: an unstarted day shows the run as "at risk" instead of broken;
   a past day with no coverage resets it. Recomputed live from the coverage log. */
function computeStreak(coverageLog, allTopics) {
  const activeDays = new Set()
  allTopics.forEach((topic) => {
    Object.entries(coverageLog[topic.id] ?? {}).forEach(([iso, percent]) => {
      if (percent > 0) activeDays.add(iso)
    })
  })
  if (activeDays.size === 0) return 0
  let streak = 0
  let cursor = APP_TODAY
  if (!activeDays.has(toIso(cursor))) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
  }
  while (activeDays.has(toIso(cursor))) {
    streak++
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1)
  }
  return streak
}

function monthCells(monthOffset) {
  const month = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth() + monthOffset, 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = (month.getDay() + 6) % 7
  return {
    month,
    label: `${MONTHS_LONG[month.getMonth()]} ${month.getFullYear()}`,
    cells: [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({ blank: true, key: `blank-${index}` })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const iso = toIso(new Date(month.getFullYear(), month.getMonth(), index + 1))
        return { key: iso, iso, label: index + 1, disabled: iso < TODAY_ISO, selected: false, today: iso === TODAY_ISO }
      }),
    ],
  }
}

/* Grid for the main calendar: browsable into the past, nothing disabled. */
function calendarCells(monthOffset) {
  const month = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth() + monthOffset, 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = (month.getDay() + 6) % 7
  return {
    label: `${MONTHS_LONG[month.getMonth()]} ${month.getFullYear()}`,
    cells: [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({ blank: true, key: `blank-${index}` })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const iso = toIso(new Date(month.getFullYear(), month.getMonth(), index + 1))
        return { key: iso, iso, label: index + 1, today: iso === TODAY_ISO }
      }),
    ],
  }
}

function dueLabel(topic, schedule) {
  return schedule ? `${dayLabel(schedule.date)} · ${formatTime(schedule.time)}` : dayLabel(topic.due)
}

function topicProgress(topic, checklists) {
  const entry = checklists[topic.id]
  if (!entry || entry.items.length === 0) return topic.progress
  return Math.round((entry.items.filter((item) => item.done).length / entry.items.length) * 100)
}

function isCoveredToday(topic, checklists) {
  const entry = checklists[topic.id]
  return Boolean(entry && entry.items.length > 0 && entry.items.every((item) => item.done))
}

function scheduleSortKey(schedule) {
  return `${schedule.date}T${schedule.time}`
}

function App() {
  const [view, setView] = useState('home')
  const [query, setQuery] = useState('')
  const [openBookId, setOpenBookId] = useState(null)
  const [openTopicId, setOpenTopicId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(TODAY_ISO)
  const [scheduleTopicId, setScheduleTopicId] = useState(null)
  const [addSheet, setAddSheet] = useState(null)
  const [editSheet, setEditSheet] = useState(null)
  const [books, setBooks] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('revision-books'))
      return Array.isArray(saved) && saved.length > 0 ? saved : seedBooks
    } catch {
      return seedBooks
    }
  })
  const [schedules, setSchedules] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('revision-schedules')) ?? {}
    } catch {
      return {}
    }
  })
  const [checklists, setChecklists] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('revision-checklists')) ?? {}
    } catch {
      return {}
    }
  })
  const [coverageLog, setCoverageLog] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('revision-coverage')) ?? {}
    } catch {
      return {}
    }
  })
  const [canvases, setCanvases] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('revision-canvas')) ?? {}
    } catch {
      return {}
    }
  })
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = window.localStorage.getItem('revision-settings')
      return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings
    } catch {
      return defaultSettings
    }
  })

  const allTopics = books.flatMap((book) =>
    book.topics.map((topic) => ({ ...topic, accent: book.accent, bookId: book.id, bookTitle: book.title }))
  )

  useEffect(() => {
    window.localStorage.setItem('revision-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    window.localStorage.setItem('revision-schedules', JSON.stringify(schedules))
  }, [schedules])

  useEffect(() => {
    window.localStorage.setItem('revision-books', JSON.stringify(books))
  }, [books])

  useEffect(() => {
    window.localStorage.setItem('revision-checklists', JSON.stringify(checklists))
  }, [checklists])

  useEffect(() => {
    window.localStorage.setItem('revision-coverage', JSON.stringify(coverageLog))
  }, [coverageLog])

  useEffect(() => {
    window.localStorage.setItem('revision-canvas', JSON.stringify(canvases))
  }, [canvases])

  const setCanvas = (topicId, updater) => {
    setCanvases((current) => ({
      ...current,
      [topicId]: updater(current[topicId] ?? { texts: [], nodes: [], edges: [], strokes: [] }),
    }))
  }

  /* One-time migration: turn legacy text dues ('Today', 'Mon, 1 Jul') into relative ISO dates. */
  useEffect(() => {
    if (!books.some((book) => book.topics.some((topic) => isLegacyDue(topic.due)))) return
    setBooks((current) => current.map((book) => ({
      ...book,
      topics: book.topics.map((topic) => isLegacyDue(topic.due)
        ? { ...topic, due: isoFromToday(LEGACY_DUE_OFFSETS[topic.due] ?? 2) }
        : topic),
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Daily roll: when the app opens on a new day, archive yesterday's coverage
     percentage into the log, then untick every checkbox for a fresh start. */
  useEffect(() => {
    const stale = []
    let needsReset = false
    const rolled = {}
    for (const [topicId, entry] of Object.entries(checklists)) {
      if (entry.day !== TODAY_ISO) {
        needsReset = true
        if (entry.items.length > 0) {
          stale.push({ topicId, day: entry.day, percent: Math.round((entry.items.filter((item) => item.done).length / entry.items.length) * 100) })
        }
        rolled[topicId] = { ...entry, day: TODAY_ISO, items: entry.items.map((item) => ({ ...item, done: false })) }
      } else {
        rolled[topicId] = entry
      }
    }
    if (needsReset) setChecklists(rolled)
    if (stale.length > 0) {
      setCoverageLog((current) => {
        const next = { ...current }
        stale.forEach(({ topicId, day, percent }) => {
          next[topicId] = { ...(next[topicId] ?? {}), [day]: percent }
        })
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateSettings = (changes) => {
    setSettings((current) => ({ ...current, ...changes }))
  }

  const resetSettings = () => {
    if (!window.confirm('Reset all settings to their defaults?')) return false
    setSettings(defaultSettings)
    return true
  }

  const mutateChecklist = (topicId, mutator) => {
    const entry = checklists[topicId] ?? { day: TODAY_ISO, items: [], note: '' }
    const next = mutator({ ...entry, items: [...entry.items] })
    setChecklists((current) => ({ ...current, [topicId]: next }))
    setCoverageLog((current) => {
      if (next.items.length > 0) {
        const percent = Math.round((next.items.filter((item) => item.done).length / next.items.length) * 100)
        return { ...current, [topicId]: { ...current[topicId], [TODAY_ISO]: percent } }
      }
      if (current[topicId]) {
        const topicLog = { ...current[topicId] }
        delete topicLog[TODAY_ISO]
        return { ...current, [topicId]: topicLog }
      }
      return current
    })
  }

  const addChecklistItem = (topicId, text) =>
    mutateChecklist(topicId, (entry) => ({ ...entry, items: [...entry.items, { id: `it-${Date.now()}`, text, done: false }] }))

  const toggleChecklistItem = (topicId, itemId) =>
    mutateChecklist(topicId, (entry) => ({ ...entry, items: entry.items.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) }))

  const deleteChecklistItem = (topicId, itemId) =>
    mutateChecklist(topicId, (entry) => ({ ...entry, items: entry.items.filter((item) => item.id !== itemId) }))

  const setTopicNote = (topicId, note) =>
    setChecklists((current) => ({
      ...current,
      [topicId]: { ...(current[topicId] ?? { day: TODAY_ISO, items: [], note: '' }), note },
    }))

  const selectBook = (bookId) => {
    setOpenBookId(bookId)
    setOpenTopicId(null)
  }

  const openTopicById = (topicId) => {
    if (topicId === null) {
      setOpenTopicId(null)
      return
    }
    const topic = allTopics.find((item) => item.id === topicId)
    if (!topic) return
    setOpenBookId(topic.bookId)
    setOpenTopicId(topicId)
    setView('library')
  }

  const saveSchedule = ({ date, time }) => {
    setSchedules((current) => ({ ...current, [scheduleTopicId]: { date, time } }))
    setScheduleTopicId(null)
  }

  const resetSchedule = () => {
    setSchedules((current) => {
      const next = { ...current }
      delete next[scheduleTopicId]
      return next
    })
    setScheduleTopicId(null)
  }

  const addBook = ({ title, author, accent }) => {
    const id = `bk-${Date.now()}`
    setBooks((current) => [...current, { id, title, author: author || 'Your notes', accent, topics: [] }])
    setAddSheet(null)
    setView('library')
    setOpenBookId(id)
  }

  const addTopic = ({ title, chapter }) => {
    const bookId = addSheet.bookId
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, topics: [...book.topics, { id: `tp-${Date.now()}`, title, chapter: chapter || 'General', due: 'Unscheduled', progress: 0 }] }
      : book
    ))
    setAddSheet(null)
  }

  const saveBookEdits = ({ title, author, accent }) => {
    const bookId = editSheet.bookId
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, title, author: author || book.author || 'Your notes', accent }
      : book
    ))
    setEditSheet(null)
  }

  const deleteBook = () => {
    const book = books.find((item) => item.id === editSheet.bookId)
    if (!book) {
      setEditSheet(null)
      return
    }
    const topicWord = `${book.topics.length} topic${book.topics.length === 1 ? '' : 's'}`
    if (!window.confirm(`Delete "${book.title}" and its ${topicWord}? Their schedules will be removed too.`)) return
    setSchedules((current) => {
      const next = { ...current }
      book.topics.forEach((topic) => delete next[topic.id])
      return next
    })
    setCanvases((current) => {
      const next = { ...current }
      book.topics.forEach((topic) => delete next[topic.id])
      return next
    })
    setBooks((current) => current.filter((item) => item.id !== book.id))
    setOpenBookId(null)
    setEditSheet(null)
  }

  const saveTopicEdits = ({ title, chapter }) => {
    const { bookId, topicId } = editSheet
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, topics: book.topics.map((topic) => topic.id === topicId ? { ...topic, title, chapter: chapter || topic.chapter } : topic) }
      : book
    ))
    setEditSheet(null)
  }

  const deleteTopic = () => {
    const { bookId, topicId } = editSheet
    const topic = books.find((book) => book.id === bookId)?.topics.find((item) => item.id === topicId)
    if (!topic) {
      setEditSheet(null)
      return
    }
    if (!window.confirm(`Delete "${topic.title}"? Its schedule will be removed too.`)) return
    setSchedules((current) => {
      const next = { ...current }
      delete next[topicId]
      return next
    })
    setCanvases((current) => {
      const next = { ...current }
      delete next[topicId]
      return next
    })
    setBooks((current) => current.map((book) => book.id === bookId
      ? { ...book, topics: book.topics.filter((item) => item.id !== topicId) }
      : book
    ))
    setEditSheet(null)
  }

  const openTopicEditor = (topicId) => {
    const topic = allTopics.find((item) => item.id === topicId)
    if (topic) setEditSheet({ type: 'topic', bookId: topic.bookId, topicId })
  }

  const scheduleTopic = allTopics.find((topic) => topic.id === scheduleTopicId)
  const addTopicBook = addSheet?.type === 'topic' ? books.find((book) => book.id === addSheet.bookId) : null

  return (
    <div className={`app-shell ${settings.compactMode ? 'compact-mode' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <main className="app-content">
        {view === 'settings' ? (
          <SettingsPage settings={settings} onChange={updateSettings} onReset={resetSettings} />
        ) : view === 'library' ? (
          <LibraryPage
            books={books}
            allTopics={allTopics}
            query={query}
            onQueryChange={setQuery}
            openBookId={openBookId}
            openTopicId={openTopicId}
            onOpenBook={selectBook}
            onOpenTopic={openTopicById}
            schedules={schedules}
            checklists={checklists}
            canvases={canvases}
            onSetCanvas={setCanvas}
            onSchedule={setScheduleTopicId}
            onAddBook={() => setAddSheet({ type: 'book' })}
            onAddTopic={(bookId) => setAddSheet({ type: 'topic', bookId })}
            onEditBook={(bookId) => setEditSheet({ type: 'book', bookId })}
            onEditTopic={openTopicEditor}
            onAddItem={addChecklistItem}
            onToggleItem={toggleChecklistItem}
            onDeleteItem={deleteChecklistItem}
            onSetNote={setTopicNote}
          />
        ) : view === 'insights' ? (
          <InsightsPage allTopics={allTopics} checklists={checklists} coverageLog={coverageLog} weeklyGoal={settings.weeklyGoal} />
        ) : view === 'calendar' ? (
          <CalendarPage
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            schedules={schedules}
            allTopics={allTopics}
            coverageLog={coverageLog}
            onOpenTopic={openTopicById}
          />
        ) : (
          <HomePage
            topics={allTopics}
            onSeeAll={() => setView('library')}
            schedules={schedules}
            checklists={checklists}
            onSchedule={setScheduleTopicId}
            onEditTopic={openTopicEditor}
            onOpenTopic={openTopicById}
          />
        )}
      </main>
      <Dock active={view} onNavigate={setView} />
      {scheduleTopic && (
        <ScheduleSheet
          topic={scheduleTopic}
          schedule={schedules[scheduleTopic.id]}
          defaultTime={settings.reminderTime}
          onSave={saveSchedule}
          onReset={resetSchedule}
          onClose={() => setScheduleTopicId(null)}
        />
      )}
      {addSheet?.type === 'book' && (
        <BookFormSheet
          defaultAccent={ACCENTS[books.length % ACCENTS.length].id}
          onSave={addBook}
          onClose={() => setAddSheet(null)}
        />
      )}
      {addTopicBook && (
        <TopicFormSheet
          book={addTopicBook}
          onSave={addTopic}
          onClose={() => setAddSheet(null)}
        />
      )}
      {editSheet?.type === 'book' && books.some((book) => book.id === editSheet.bookId) && (
        <BookFormSheet
          book={books.find((book) => book.id === editSheet.bookId)}
          onSave={saveBookEdits}
          onDelete={deleteBook}
          onClose={() => setEditSheet(null)}
        />
      )}
      {editSheet?.type === 'topic' && (
        <TopicFormSheet
          book={books.find((book) => book.id === editSheet.bookId)}
          topic={books.find((book) => book.id === editSheet.bookId)?.topics.find((item) => item.id === editSheet.topicId)}
          onSave={saveTopicEdits}
          onDelete={deleteTopic}
          onClose={() => setEditSheet(null)}
        />
      )}
    </div>
  )
}

function SheetShell({ eyebrow, title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="schedule-sheet" role="dialog" aria-modal="true" aria-label={`${eyebrow}: ${title}`} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <span className="focus-label">{eyebrow}</span>
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BookFormSheet({ book, defaultAccent, onSave, onDelete, onClose }) {
  const isEdit = Boolean(book)
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [accent, setAccent] = useState(book?.accent ?? defaultAccent)
  const canSave = title.trim().length > 0

  return (
    <SheetShell
      eyebrow={isEdit ? 'Edit book' : 'Add a book'}
      title={isEdit ? book.title : 'New in your library'}
      subtitle={isEdit ? 'Rename, recolour, or remove it.' : 'Give it a title and a cover colour.'}
      onClose={onClose}
    >
      <div className="sheet-form">
        <label className="sheet-field"><BookOpen size={15} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Book title" aria-label="Book title" /></label>
        <label className="sheet-field"><PenLine size={15} /><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Author (optional)" aria-label="Author, optional" /></label>
      </div>

      <p className="sheet-label">Cover colour</p>
      <div className="accent-picker" role="radiogroup" aria-label="Cover colour">
        {ACCENTS.map((option) => (
          <button
            key={option.id}
            className={`cover-art accent-swatch ${option.id} ${accent === option.id ? 'selected' : ''}`}
            role="radio"
            aria-checked={accent === option.id}
            aria-label={option.label}
            title={option.label}
            onClick={() => setAccent(option.id)}
          >
            {accent === option.id && <Check size={15} />}
          </button>
        ))}
      </div>

      <div className="sheet-actions">
        {isEdit && (
          <button className="ghost-button danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete book
          </button>
        )}
        <button className="solid-button" disabled={!canSave} onClick={() => onSave({ title: title.trim(), author: author.trim(), accent })}>
          <Check size={16} /> {isEdit ? 'Save changes' : 'Add book'}
        </button>
      </div>
    </SheetShell>
  )
}

function TopicFormSheet({ book, topic, onSave, onDelete, onClose }) {
  const isEdit = Boolean(topic)
  const [title, setTitle] = useState(topic?.title ?? '')
  const [chapter, setChapter] = useState(topic?.chapter ?? '')
  const canSave = title.trim().length > 0

  return (
    <SheetShell
      eyebrow={isEdit ? 'Edit topic' : 'Add a topic'}
      title={isEdit ? topic.title : book.title}
      subtitle={isEdit ? `${book.title} · rename or remove it.` : 'Break the book into reviewable pieces.'}
      onClose={onClose}
    >
      <div className="sheet-form">
        <label className="sheet-field"><Layers3 size={15} /><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Topic title" aria-label="Topic title" /></label>
        <label className="sheet-field"><Bookmark size={15} /><input value={chapter} onChange={(event) => setChapter(event.target.value)} placeholder="Chapter or unit (optional)" aria-label="Chapter or unit, optional" /></label>
      </div>

      <div className="sheet-actions">
        {isEdit && (
          <button className="ghost-button danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete topic
          </button>
        )}
        <button className="solid-button" disabled={!canSave} onClick={() => onSave({ title: title.trim(), chapter: chapter.trim() })}>
          <Check size={16} /> {isEdit ? 'Save changes' : 'Add topic'}
        </button>
      </div>
    </SheetShell>
  )
}

function ScheduleSheet({ topic, schedule, defaultTime, onSave, onReset, onClose }) {
  const [date, setDate] = useState(schedule?.date ?? TODAY_ISO)
  const [time, setTime] = useState(schedule?.time ?? defaultTime)
  const [monthOffset, setMonthOffset] = useState(() => monthOffsetFromToday(schedule?.date ?? TODAY_ISO))

  const { label: monthLabel, cells } = monthCells(monthOffset)

  return (
    <SheetShell eyebrow="Schedule review" title={topic.title} subtitle={`${topic.bookTitle} · ${topic.chapter}`} onClose={onClose}>
      <p className="sheet-label">Pick a day</p>
      <div className="sheet-cal">
        <div className="sheet-cal-toolbar">
          <strong>{monthLabel}</strong>
          <div className="calendar-actions">
            <button className="calendar-action" disabled={monthOffset === 0} onClick={() => setMonthOffset((offset) => offset - 1)} aria-label="Previous month"><ChevronRight size={15} className="rotate-180" /></button>
            <button className="calendar-action" disabled={monthOffset >= 11} onClick={() => setMonthOffset((offset) => offset + 1)} aria-label="Next month"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="sheet-cal-weekdays" aria-hidden="true">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
        </div>
        <div className="sheet-cal-grid" role="grid" aria-label={`Pick a review day in ${monthLabel}`}>
          {cells.map((cell) => cell.blank ? <span key={cell.key} /> : (
            <button
              key={cell.key}
              className={`sheet-cal-day ${cell.iso === date ? 'selected' : ''} ${cell.today ? 'is-today' : ''}`}
              disabled={cell.disabled}
              onClick={() => setDate(cell.iso)}
              aria-pressed={cell.iso === date}
              aria-label={dayLabel(cell.iso)}
            >
              {cell.label}
            </button>
          ))}
        </div>
      </div>

      <p className="sheet-label">Pick a time</p>
      <div className="time-chips" role="radiogroup" aria-label="Review time">
        {['07:30', '12:30', '17:30', '20:00'].map((preset) => (
          <button
            key={preset}
            className={`chip ${time === preset ? 'selected' : ''}`}
            role="radio"
            aria-checked={time === preset}
            onClick={() => setTime(preset)}
          >
            {formatTime(preset)}
          </button>
        ))}
      </div>
      <div className="sheet-time-row">
        <span className="time-field sheet-time-field">
          <Clock size={14} />
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Custom time" />
        </span>
        <span className="sheet-preview"><CalendarClock size={13} /> {dayLabel(date)} · {formatTime(time)}</span>
      </div>

      <div className="sheet-actions">
        {schedule && (
          <button className="ghost-button" onClick={onReset}><RotateCcw size={14} /> Back to auto</button>
        )}
        <button className="solid-button" onClick={() => onSave({ date, time })}><Check size={16} /> Save schedule</button>
      </div>
    </SheetShell>
  )
}

function LibraryPage({ books, allTopics, query, onQueryChange, openBookId, openTopicId, onOpenBook, onOpenTopic, schedules, checklists, canvases, onSetCanvas, onSchedule, onAddBook, onAddTopic, onEditBook, onEditTopic, onAddItem, onToggleItem, onDeleteItem, onSetNote }) {
  const openBook = books.find((book) => book.id === openBookId)
  const openTopic = openBook?.topics.find((topic) => topic.id === openTopicId)

  if (openBook && openTopic) {
    return (
      <TopicPage
        key={openTopic.id}
        topic={openTopic}
        book={openBook}
        entry={checklists[openTopic.id]}
        schedule={schedules[openTopic.id]}
        canvas={canvases[openTopic.id]}
        onSetCanvas={(updater) => onSetCanvas(openTopic.id, updater)}
        onBack={() => onOpenTopic(null)}
        onAddItem={onAddItem}
        onToggleItem={onToggleItem}
        onDeleteItem={onDeleteItem}
        onSetNote={onSetNote}
      />
    )
  }

  if (openBook) {
    const topics = openBook.topics.map((topic) => ({ ...topic, accent: openBook.accent }))
    const filteredTopics = topics.filter((topic) => topic.title.toLowerCase().includes(query.toLowerCase()))
    const progress = topics.length ? Math.round(topics.reduce((sum, topic) => sum + topicProgress(topic, checklists), 0) / topics.length) : 0
    const dueToday = topics.some((topic) => topic.due === TODAY_ISO)

    return (
      <section className="page-section library-page">
        <button className="back-button" onClick={() => { onOpenBook(null); onQueryChange('') }}>
          <ChevronLeft size={15} /> Library
        </button>

        <div className="book-hero">
          <span className={`cover-art mini-cover ${openBook.accent}`} aria-hidden="true" />
          <div className="book-hero-copy">
            <span className="book-hero-eyebrow">{openBook.author}</span>
            <h2>{openBook.title}</h2>
            <div className="book-hero-stats">
              <span className="book-progress-bar"><span className={openBook.accent} style={{ width: `${progress}%` }} /></span>
              <strong>{progress}%</strong>
            </div>
            <small>{topics.length === 0 ? 'No topics yet — add your first below.' : `${topics.length} topic${topics.length === 1 ? '' : 's'} · ${dueToday ? 'review due today' : `next review ${dayLabel(topics[0].due)}`}`}</small>
          </div>
          <button className="hero-more" onClick={() => onEditBook(openBook.id)} aria-label={`Edit or delete ${openBook.title}`} title="Edit or delete book">
            <MoreHorizontal size={17} />
          </button>
        </div>

        {topics.length > 0 && (
          <>
            <div className="search-field">
              <Search size={17} />
              <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search topics" aria-label="Search topics" />
            </div>
            <div className="topic-list full-list">
              {filteredTopics.map((topic) => (
                <TopicRow key={topic.id} topic={topic} schedule={schedules[topic.id]} checklists={checklists} onOpen={onOpenTopic} onSchedule={onSchedule} onEdit={onEditTopic} />
              ))}
            </div>
            {filteredTopics.length === 0 && <p className="empty-note">No topics in this book match your search.</p>}
          </>
        )}
        <button className="outline-button wide-button" onClick={() => onAddTopic(openBook.id)}><CirclePlus size={18} /> Add a topic</button>
      </section>
    )
  }

  const q = query.trim().toLowerCase()
  const resultTopics = q
    ? allTopics.filter((topic) => topic.title.toLowerCase().includes(q) || topic.bookTitle.toLowerCase().includes(q))
    : []
  const featuredBook = books.find((book) => book.topics.some((topic) => topic.due === TODAY_ISO)) || books.find((book) => book.topics.length > 0)
  const featuredTopic = featuredBook ? (featuredBook.topics.find((topic) => topic.due === TODAY_ISO) || featuredBook.topics[0]) : null

  return (
    <section className="page-section library-page">
      <PageHeader
        title="Your library"
        subtitle="Your books, and every topic inside them."
        icon={<BookOpen size={18} />}
        meta={`${books.length} books · ${allTopics.length} topics`}
      />

      <div className="search-field">
        <Search size={17} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search books or topics" aria-label="Search books or topics" />
      </div>

      {q ? (
        <>
          <div className="section-heading library-results-heading">
            <div><h2>Results</h2><p>{resultTopics.length} topic{resultTopics.length === 1 ? '' : 's'} found</p></div>
          </div>
          <div className="topic-list full-list">
            {resultTopics.map((topic) => (
              <TopicRow key={topic.id} topic={{ ...topic, category: topic.bookTitle }} schedule={schedules[topic.id]} checklists={checklists} onOpen={onOpenTopic} onSchedule={onSchedule} onEdit={onEditTopic} />
            ))}
          </div>
          {resultTopics.length === 0 && <p className="empty-note">Nothing matched. Try another word, or add it as a new topic.</p>}
        </>
      ) : (
        <>
          {featuredTopic && (
            <button className="library-hero" onClick={() => onOpenBook(featuredBook.id)}>
              <span className={`cover-art hero-cover ${featuredBook.accent}`} aria-hidden="true" />
              <span className="hero-copy">
                <span className="focus-label">Continue revising</span>
                <strong>{featuredTopic.title}</strong>
                <small>{featuredBook.title} · due {dayLabel(featuredTopic.due)}</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          )}

          <div className="section-heading library-books-heading">
            <div><h2>Your books</h2><p>Tap a cover to open its topics.</p></div>
          </div>
          <div className="books-grid">
            {books.map((book) => <BookCard key={book.id} book={book} checklists={checklists} onOpen={() => onOpenBook(book.id)} />)}
        </div>
        <button className="outline-button wide-button" onClick={onAddBook}><CirclePlus size={18} /> Add a book</button>
        </>
      )}
    </section>
  )
}

function BookCard({ book, checklists, onOpen }) {
  const topics = book.topics
  const progress = topics.length ? Math.round(topics.reduce((sum, topic) => sum + topicProgress(topic, checklists), 0) / topics.length) : 0
  return (
    <button className="book-card" onClick={onOpen} aria-label={`Open ${book.title}`}>
      <span className={`book-cover cover-art ${book.accent}`}>
        <span className="cover-copy">
          <small>{book.author}</small>
          <strong>{book.title}</strong>
        </span>
        <span className="cover-foot">
          <span className="cover-progress"><span style={{ width: `${progress}%` }} /></span>
          <em>{progress}%</em>
        </span>
      </span>
      <span className="book-card-meta">
        <strong>{topics.length} topics</strong>
        <small>{topics.length ? `Next · ${dayLabel(topics[0].due)}` : 'No topics yet'}</small>
      </span>
    </button>
  )
}

function InsightsPage({ allTopics, checklists, coverageLog, weeklyGoal }) {
  const days = lastDays(7)
  const dayPercent = (iso) => {
    const values = allTopics
      .map((topic) => coverageLog[topic.id]?.[iso])
      .filter((value) => value !== undefined)
    return values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
  }
  const series = days.map((day) => ({ ...day, percent: dayPercent(day.iso) }))

  const recorded = series.filter((day) => day.percent !== null)
  const avgCoverage = recorded.length > 0 ? Math.round(recorded.reduce((sum, day) => sum + day.percent, 0) / recorded.length) : 0

  const streak = computeStreak(coverageLog, allTopics)
  const todayPercent = dayPercent(TODAY_ISO)
  const yesterdayIso = toIso(new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate() - 1))
  const yesterdayPercent = dayPercent(yesterdayIso)
  const delta = (todayPercent ?? 0) - (yesterdayPercent ?? 0)
  const hasDeltaData = todayPercent !== null || yesterdayPercent !== null
  const atRisk = streak > 0 && (todayPercent ?? 0) === 0
  const streakStatus = streak === 0
    ? ((todayPercent ?? 0) > 0 ? 'Streak started — first progress logged today.' : 'No progress yet — tick a point to start a streak.')
    : atRisk ? 'At risk — no progress yet today.' : `Extended to ${streak} day${streak === 1 ? '' : 's'} — keep it going!`

  const todayEntries = Object.values(checklists).filter((entry) => entry.day === TODAY_ISO)
  const totalPoints = todayEntries.reduce((sum, entry) => sum + entry.items.length, 0)
  const donePoints = todayEntries.reduce((sum, entry) => sum + entry.items.filter((item) => item.done).length, 0)
  const coveredToday = allTopics.filter((topic) => isCoveredToday(topic, checklists)).length

  return (
    <section className="page-section">
      <PageHeader title="Your rhythm" subtitle="Small sessions compound into real recall." icon={<Target size={18} />} />

      <div className="live-panel">
        <div className="live-head">
          <span className="live-badge"><i className="live-dot" /> Live</span>
          <strong className="live-streak"><Flame size={16} /> {streak} {streak === 1 ? 'day' : 'days'}</strong>
        </div>
        <p className="live-status">{streakStatus}</p>
        <div className="live-stats">
          <div className="live-stat"><span>Today</span><strong>{todayPercent ?? 0}%</strong></div>
          <div className="live-stat"><span>vs yesterday</span><strong className={!hasDeltaData ? '' : delta > 0 ? 'positive' : delta < 0 ? 'negative' : ''}>{!hasDeltaData ? '—' : delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '±0%'}</strong></div>
          <div className="live-stat"><span>Points</span><strong>{totalPoints > 0 ? `${donePoints}/${totalPoints}` : '0'}</strong></div>
        </div>
      </div>

      <div className="insight-grid">
        <div className="insight-card"><Brain size={20} /><strong>{avgCoverage}%</strong><span>Avg daily coverage</span></div>
        <div className="insight-card"><CalendarDays size={20} /><strong>{totalPoints > 0 ? `${donePoints}/${totalPoints}` : '0'}</strong><span>Points ticked today</span></div>
        <div className="insight-card"><Check size={20} /><strong>{coveredToday}</strong><span>Topics covered today</span></div>
      </div>
      <div className="panel weekly-panel">
        <div className="panel-heading"><div><h2>This week</h2><p>Average daily coverage across your topics</p></div><MoreHorizontal size={20} /></div>
        <div className="bar-chart" aria-label="Daily coverage over the last 7 days">
          {series.map((day) => (
            <div className="bar-column" key={day.iso}>
              <div className={`bar ${day.percent === null ? 'is-empty' : ''}`} style={{ height: `${day.percent ?? 4}%` }} />
              <span>{day.initial}</span>
            </div>
          ))}
        </div>
        <p className="insight-note">
          {coveredToday >= weeklyGoal
            ? 'Weekly goal reached — nice rhythm.'
            : `${weeklyGoal - coveredToday} more topic${weeklyGoal - coveredToday === 1 ? '' : 's'} to reach your weekly goal.`}
          {' '}Coverage is the share of checklist points you tick each day.
        </p>
      </div>
    </section>
  )
}

function CalendarPage({ selectedDate, onSelectDate, schedules, allTopics, coverageLog, onOpenTopic }) {
  const [monthOffset, setMonthOffset] = useState(() => monthOffsetFromToday(selectedDate))

  const scheduledByIso = {}
  const autoByIso = {}
  allTopics.forEach((topic) => {
    const schedule = schedules[topic.id]
    if (schedule) (scheduledByIso[schedule.date] ??= []).push({ topic, time: schedule.time })
    else if (topic.due !== 'Unscheduled') (autoByIso[topic.due] ??= []).push(topic)
  })

  const { label: monthLabel, cells } = calendarCells(monthOffset)
  const markerFor = (iso) => {
    if (scheduledByIso[iso]?.length) return { tone: 'violet', count: scheduledByIso[iso].length }
    if (autoByIso[iso]?.length) return { tone: 'coral', count: autoByIso[iso].length }
    if (allTopics.some((topic) => coverageLog[topic.id]?.[iso] !== undefined)) return { tone: 'blue', count: '' }
    return null
  }

  const isPast = selectedDate < TODAY_ISO
  const dayItems = isPast ? [] : [
    ...(scheduledByIso[selectedDate] ?? []).map(({ topic, time }) => ({ topic, time, kind: 'scheduled' })),
    ...(autoByIso[selectedDate] ?? []).map((topic) => ({ topic, time: null, kind: 'auto' })),
  ].sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  const coverageDay = isPast
    ? allTopics
        .map((topic) => ({ topic, percent: coverageLog[topic.id]?.[selectedDate] }))
        .filter((item) => item.percent !== undefined)
        .sort((a, b) => b.percent - a.percent)
    : []
  const dayCount = isPast ? coverageDay.length : dayItems.length
  const headingTitle = isPast
    ? `Coverage on ${dayLabel(selectedDate)}`
    : selectedDate === TODAY_ISO ? 'Today’s reviews' : `Reviews on ${dayLabel(selectedDate)}`
  const headingSub = isPast
    ? 'What you actually covered that day.'
    : 'Tap a review to open its topic.'

  return (
    <section className="page-section calendar-page">
      <PageHeader title="Your calendar" subtitle="A clear view of what is ready to revisit." icon={<CalendarDays size={18} />} />

      <div className="calendar-panel">
        <div className="calendar-toolbar">
          <div>
            <span className="calendar-eyebrow">Review plan</span>
            <h2>{monthLabel}</h2>
          </div>
          <div className="calendar-actions">
            <button className="text-button today-jump" onClick={() => { setMonthOffset(0); onSelectDate(TODAY_ISO) }}>Today</button>
            <button className="calendar-action" disabled={monthOffset <= -12} onClick={() => setMonthOffset((offset) => offset - 1)} aria-label="Previous month"><ChevronRight size={16} className="rotate-180" /></button>
            <button className="calendar-action" disabled={monthOffset >= 11} onClick={() => setMonthOffset((offset) => offset + 1)} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
        </div>
        <div className="calendar-grid" role="grid" aria-label={`Review calendar for ${monthLabel}`}>
          {cells.map((cell) => {
            if (cell.blank) return <span key={cell.key} />
            const marker = markerFor(cell.iso)
            return (
              <button
                className={`calendar-day ${cell.iso === selectedDate ? 'selected-day' : ''} ${cell.today ? 'is-today' : ''}`}
                key={cell.iso}
                onClick={() => onSelectDate(cell.iso)}
                aria-pressed={cell.iso === selectedDate}
                aria-label={`${dayLabel(cell.iso)}${marker ? (marker.tone === 'blue' ? ', coverage logged' : `, ${marker.count} review${marker.count > 1 ? 's' : ''}`) : ''}`}
              >
                <span>{cell.label}</span>
                {marker && <i className={`review-marker ${marker.tone}`}>{marker.count > 1 ? marker.count : ''}</i>}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span><i className="legend-dot violet" /> Scheduled by you</span>
          <span><i className="legend-dot coral" /> Auto plan</span>
          <span><i className="legend-dot blue" /> Coverage logged</span>
        </div>
      </div>

      <div className="section-heading calendar-list-heading">
        <div><h2>{headingTitle}</h2><p>{headingSub}</p></div>
        <span className="review-count">{dayCount} queued</span>
      </div>
      <div className="upcoming-list">
        {(isPast ? coverageDay : dayItems).map((entry) => {
          const tone = isPast ? 'blue' : entry.kind === 'scheduled' ? 'violet' : 'coral'
          const slotLabel = isPast ? 'covered' : entry.kind === 'scheduled' ? 'planned' : 'auto'
          const meta = isPast ? entry.topic.bookTitle : `${entry.topic.bookTitle} · ${entry.time ? formatTime(entry.time) : 'anytime'}`
          return (
            <button className="upcoming-review" key={`${entry.topic.id}-${selectedDate}`} onClick={() => onOpenTopic(entry.topic.id)}>
              <span className="review-date"><strong>{isPast ? `${entry.percent}%` : selectedDate === TODAY_ISO ? 'Today' : new Date(`${selectedDate}T00:00:00`).getDate()}</strong><small>{slotLabel}</small></span>
              <span className={`review-accent ${tone}`} />
              <span className="review-details"><strong>{entry.topic.title}</strong><small>{meta}</small></span>
              <ChevronRight size={17} />
            </button>
          )
        })}
        {dayCount === 0 && (
          <p className="empty-note">
            {isPast ? 'No coverage recorded for this day.' : 'Nothing planned for this day. Use the clock icon on any topic to schedule it here.'}
          </p>
        )}
      </div>
    </section>
  )
}

function HomePage({ topics, onSeeAll, schedules, checklists, onSchedule, onEditTopic, onOpenTopic }) {
  const scheduledPending = topics
    .filter((topic) => schedules[topic.id] && !isCoveredToday(topic, checklists))
    .sort((a, b) => scheduleSortKey(schedules[a.id]).localeCompare(scheduleSortKey(schedules[b.id])))
  const nextTopic = scheduledPending[0] ?? topics.find((topic) => !isCoveredToday(topic, checklists)) ?? topics[0]
  return (
    <section className="page-section home-page">
      <header className="topbar">
        <div className="brand-mark"><span>r</span><div><strong>revision</strong><small>your second brain</small></div></div>
        <button className="icon-button" aria-label="Open profile"><span className="avatar">AK</span></button>
      </header>

      <div className="greeting">
        <p className="date-line">{WEEKDAYS_LONG[APP_TODAY.getDay()]}, {APP_TODAY.getDate()} {MONTHS_LONG[APP_TODAY.getMonth()]}</p>
        <h1>Make today<br /><em>stick.</em></h1>
        <p className="intro-copy">A little review now saves a lot of re-learning later.</p>
      </div>

      {nextTopic && (
        <button className="focus-card" onClick={() => onOpenTopic(nextTopic.id)}>
          <div className="focus-orbit"><Sparkles size={20} /></div>
          <div className="focus-copy">
            <span className="focus-label">{schedules[nextTopic.id] ? 'Scheduled' : 'Up next'}</span>
            <strong>{nextTopic.title}</strong>
            <small>{nextTopic.chapter} · {dueLabel(nextTopic, schedules[nextTopic.id])}</small>
          </div>
          <span className="focus-arrow"><ArrowUpRight size={19} /></span>
        </button>
      )}

      <div className="section-heading"><div><h2>Keep the thread</h2><p>Your topics, at a glance.</p></div><button className="text-button" onClick={onSeeAll}>See all <ChevronRight size={16} /></button></div>
      <div className="topic-list">
        {topics.slice(0, 3).map((topic) => (
          <TopicRow key={topic.id} topic={topic} schedule={schedules[topic.id]} checklists={checklists} onOpen={onOpenTopic} onSchedule={onSchedule} onEdit={onEditTopic} />
        ))}
      </div>
    </section>
  )
}

function TopicPage({ topic, book, entry, schedule, canvas, onSetCanvas, onBack, onAddItem, onToggleItem, onDeleteItem, onSetNote }) {
  const [draft, setDraft] = useState('')
  const [space, setSpace] = useState('board')
  const items = entry?.items ?? []
  const note = entry?.note ?? ''

  const submitItem = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    onAddItem(topic.id, draft.trim())
    setDraft('')
  }
  return (
    <section className="page-section topic-page">
      <button className="back-button" onClick={onBack}><ChevronLeft size={15} /> {book.title}</button>

      <div className="topic-hero">
        <span className={`topic-dot big ${book.accent}`}><Layers3 size={18} /></span>
        <div className="topic-hero-copy">
          <span className="book-hero-eyebrow">{book.title} · {topic.chapter}</span>
          <h2>{topic.title}</h2>
          <small>{dueLabel(topic, schedule)}</small>
        </div>
      </div>

      <div className="space-toggle" role="tablist" aria-label="Topic spaces">
        <button role="tab" aria-selected={space === 'board'} className={space === 'board' ? 'active' : ''} onClick={() => setSpace('board')}>Board</button>
        <button role="tab" aria-selected={space === 'notes'} className={space === 'notes' ? 'active' : ''} onClick={() => setSpace('notes')}>Notes</button>
      </div>

      {space === 'board' ? (
        <TopicBoard canvas={canvas ?? { texts: [], nodes: [], edges: [], strokes: [] }} onChange={onSetCanvas} />
      ) : (
        <>
          <div className="check-list">
            {items.map((item) => (
              <div key={item.id} className={`check-item ${item.done ? 'done' : ''}`}>
                <button className="check-toggle" onClick={() => onToggleItem(topic.id, item.id)} aria-pressed={item.done} aria-label={`${item.done ? 'Untick' : 'Tick'} ${item.text}`}>
                  <span className="check-box">{item.done && <Check size={13} />}</span>
                  <span className="check-text">{item.text}</span>
                </button>
                <button className="check-remove" onClick={() => onDeleteItem(topic.id, item.id)} aria-label={`Remove ${item.text}`}><X size={13} /></button>
              </div>
            ))}
            {items.length === 0 && <p className="empty-note">Nothing here yet — add your first point below.</p>}
          </div>
          <form className="check-add" onSubmit={submitItem}>
            <CirclePlus size={16} />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submitItem(event)}
              placeholder="Add a point…"
              aria-label="Add a checklist point"
            />
            <button type="submit" disabled={!draft.trim()}>Add</button>
          </form>

          <textarea
            className="note-area"
            value={note}
            onChange={(event) => onSetNote(topic.id, event.target.value)}
            placeholder="Write freely…"
            aria-label="Notes"
          />
        </>
      )}
    </section>
  )
}

const NODE_W = 132
const NODE_H = 44
const BOARD_TOOLS = [
  { id: 'write', label: 'Write', hint: 'Tap anywhere and start typing', icon: Type },
  { id: 'draw', label: 'Draw', hint: 'Drag to sketch', icon: Pencil },
  { id: 'mind', label: 'Mind map', hint: 'Tap for a node · tap two nodes to connect them', icon: Share2 },
  { id: 'erase', label: 'Erase', hint: 'Tap anything to erase it', icon: Eraser },
]

function strokesPath(points) {
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function TopicBoard({ canvas, onChange }) {
  const boardRef = useRef(null)
  const [tool, setTool] = useState('write')
  const [textDraft, setTextDraft] = useState(null)
  const [nodeDraft, setNodeDraft] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [liveStroke, setLiveStroke] = useState(null)
  const strokeRef = useRef(null)
  const dragRef = useRef(null)
  const cancelRef = useRef(false)

  const point = (event) => {
    const rect = boardRef.current.getBoundingClientRect()
    return { x: Math.round(event.clientX - rect.left), y: Math.round(event.clientY - rect.top) }
  }

  const update = (mutator) => onChange((current) => {
    const next = { texts: [...current.texts], nodes: [...current.nodes], edges: [...current.edges], strokes: [...current.strokes] }
    mutator(next)
    return next
  })

  const onBackground = (event) => !event.target.closest('[data-el]') && !event.target.closest('[data-ui]')

  const onBoardPointerDown = (event) => {
    if (!onBackground(event)) return
    if (tool === 'draw') {
      strokeRef.current = [point(event)]
      setLiveStroke(strokeRef.current)
    }
  }
  const onBoardPointerMove = (event) => {
    if (tool !== 'draw' || !strokeRef.current) return
    const p = point(event)
    const last = strokeRef.current[strokeRef.current.length - 1]
    if (Math.hypot(p.x - last.x, p.y - last.y) > 2) {
      strokeRef.current = [...strokeRef.current, p]
      setLiveStroke(strokeRef.current)
    }
  }
  const onBoardPointerUp = () => {
    if (tool !== 'draw' || !strokeRef.current) return
    const points = strokeRef.current
    if (points.length > 1) update((c) => { c.strokes.push({ id: `st-${Date.now()}`, points }) })
    strokeRef.current = null
    setLiveStroke(null)
  }
  const onBoardClick = (event) => {
    if (!onBackground(event)) return
    if (tool === 'write') {
      setSelectedId(null)
      const p = point(event)
      cancelRef.current = false
      setTextDraft({ x: p.x, y: p.y, value: '' })
    } else if (tool === 'mind') {
      setSelectedId(null)
      const p = point(event)
      const id = `nd-${Date.now()}`
      update((c) => { c.nodes.push({ id, x: p.x - NODE_W / 2, y: p.y - NODE_H / 2, label: '' }) })
      cancelRef.current = false
      setNodeDraft({ id, value: '', isNew: true })
    }
  }

  const commitText = () => {
    const draft = textDraft
    if (!draft) return
    if (cancelRef.current) {
      cancelRef.current = false
      setTextDraft(null)
      return
    }
    const value = draft.value.trim()
    if (value) {
      update((c) => {
        if (draft.id) c.texts = c.texts.map((t) => t.id === draft.id ? { ...t, text: draft.value } : t)
        else c.texts.push({ id: `tx-${Date.now()}`, x: draft.x, y: draft.y, text: draft.value })
      })
    } else if (draft.id) {
      update((c) => { c.texts = c.texts.filter((t) => t.id !== draft.id) })
    }
    setTextDraft(null)
  }

  const commitNodeLabel = () => {
    const draft = nodeDraft
    if (!draft) return
    const cancelled = cancelRef.current
    cancelRef.current = false
    const value = cancelled ? '' : draft.value.trim()
    if (value) {
      update((c) => { c.nodes = c.nodes.map((n) => n.id === draft.id ? { ...n, label: value } : n) })
    } else if (draft.isNew || cancelled) {
      update((c) => {
        c.nodes = c.nodes.filter((n) => n.id !== draft.id)
        c.edges = c.edges.filter((e) => e.from !== draft.id && e.to !== draft.id)
      })
    }
    setNodeDraft(null)
  }

  const startNodeDrag = (event, node) => {
    if (tool !== 'mind' || nodeDraft) return
    event.stopPropagation()
    const p = point(event)
    dragRef.current = { id: node.id, dx: p.x - node.x, dy: p.y - node.y }
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* synthetic events may not capture */ }
  }
  const onNodePointerMove = (event, node) => {
    const drag = dragRef.current
    if (!drag || drag.id !== node.id) return
    const p = point(event)
    update((c) => {
      c.nodes = c.nodes.map((n) => n.id === node.id
        ? { ...n, x: Math.max(0, p.x - drag.dx), y: Math.max(0, p.y - drag.dy) }
        : n)
    })
  }
  const endNodeDrag = () => { dragRef.current = null }

  const onNodeClick = (event, node) => {
    event.stopPropagation()
    if (tool === 'erase') {
      update((c) => {
        c.nodes = c.nodes.filter((n) => n.id !== node.id)
        c.edges = c.edges.filter((e) => e.from !== node.id && e.to !== node.id)
      })
      return
    }
    if (tool !== 'mind' || nodeDraft) return
    if (selectedId && selectedId !== node.id && !canvas.edges.some((e) => (e.from === selectedId && e.to === node.id) || (e.from === node.id && e.to === selectedId))) {
      update((c) => { c.edges.push({ id: `eg-${Date.now()}`, from: selectedId, to: node.id }) })
    }
    setSelectedId((current) => (current === node.id ? null : node.id))
  }

  const activeHint = BOARD_TOOLS.find((item) => item.id === tool).hint

  return (
    <div className="board-wrap">
      <div className="board-toolbar" data-ui>
        {BOARD_TOOLS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`board-tool ${tool === id ? 'active' : ''}`} onClick={() => { setTool(id); setSelectedId(null) }} aria-label={label} aria-pressed={tool === id} title={label}>
            <Icon size={15} />
          </button>
        ))}
        <span className="board-hint">{activeHint}</span>
        <button
          className="board-tool"
          onClick={() => {
            if (!window.confirm('Clear everything on this board?')) return
            onChange(() => ({ texts: [], nodes: [], edges: [], strokes: [] }))
            setSelectedId(null)
            setTextDraft(null)
            setNodeDraft(null)
          }}
          aria-label="Clear board"
          title="Clear board"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div
        ref={boardRef}
        className={`board-surface tool-${tool}`}
        onPointerDown={onBoardPointerDown}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerLeave={onBoardPointerUp}
        onClick={onBoardClick}
      >
        <svg className="board-svg" aria-hidden="true">
          {canvas.edges.map((edge) => {
            const from = canvas.nodes.find((n) => n.id === edge.from)
            const to = canvas.nodes.find((n) => n.id === edge.to)
            if (!from || !to) return null
            return <line key={edge.id} className="board-edge" x1={from.x + NODE_W / 2} y1={from.y + NODE_H / 2} x2={to.x + NODE_W / 2} y2={to.y + NODE_H / 2} />
          })}
          {canvas.strokes.map((stroke) => (
            <path
              key={stroke.id}
              className={`board-stroke ${tool === 'erase' ? 'erasable' : ''}`}
              d={strokesPath(stroke.points)}
              onClick={(event) => {
                if (tool !== 'erase') return
                event.stopPropagation()
                update((c) => { c.strokes = c.strokes.filter((s) => s.id !== stroke.id) })
              }}
            />
          ))}
          {liveStroke && <path className="board-stroke" d={strokesPath(liveStroke)} />}
        </svg>

        {canvas.texts.map((text) => textDraft?.id === text.id ? null : (
          <div
            key={text.id}
            data-el
            className="board-text"
            style={{ left: text.x, top: text.y }}
            onClick={(event) => {
              event.stopPropagation()
              if (tool === 'erase') update((c) => { c.texts = c.texts.filter((t) => t.id !== text.id) })
              else if (tool === 'write' && !textDraft) { cancelRef.current = false; setTextDraft({ id: text.id, x: text.x, y: text.y, value: text.text }) }
            }}
          >
            {text.text}
          </div>
        ))}

        {canvas.nodes.map((node) => (
          <div
            key={node.id}
            data-el
            className={`board-node ${tool === 'mind' ? 'draggable' : ''} ${selectedId === node.id ? 'selected' : ''}`}
            style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
            onPointerDown={(event) => startNodeDrag(event, node)}
            onPointerMove={(event) => onNodePointerMove(event, node)}
            onPointerUp={endNodeDrag}
            onPointerCancel={endNodeDrag}
            onClick={(event) => onNodeClick(event, node)}
            onDoubleClick={(event) => {
              event.stopPropagation()
              if (tool === 'mind') { cancelRef.current = false; setNodeDraft({ id: node.id, value: node.label, isNew: false }) }
            }}
          >
            {nodeDraft?.id === node.id ? (
              <input
                className="board-node-input"
                value={nodeDraft.value}
                autoFocus
                onChange={(event) => setNodeDraft({ ...nodeDraft, value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitNodeLabel()
                  if (event.key === 'Escape') { cancelRef.current = true; commitNodeLabel() }
                }}
                onBlur={commitNodeLabel}
                aria-label="Node label"
              />
            ) : (
              <span className="board-node-label">{node.label}</span>
            )}
          </div>
        ))}

        {textDraft && (
          <input
            className="board-input"
            style={{ left: textDraft.x, top: textDraft.y, width: `${Math.max(6, textDraft.value.length + 1)}ch` }}
            value={textDraft.value}
            autoFocus
            onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitText()
              if (event.key === 'Escape') { cancelRef.current = true; commitText() }
            }}
            onBlur={commitText}
            aria-label="Board text"
          />
        )}
      </div>
    </div>
  )
}

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`
}

function PageHeader({ title, subtitle, icon, meta }) {
  return (
    <header className="page-header">
      <div className="page-title-icon">{icon}</div>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {meta && <span className="page-meta">{meta}</span>}
      </div>
    </header>
  )
}

function TopicRow({ topic, schedule, checklists, onOpen, onSchedule, onEdit }) {
  const covered = isCoveredToday(topic, checklists)
  const progress = topicProgress(topic, checklists)
  return (
    <div className={`topic-row ${covered ? 'is-complete' : ''}`}>
      <button className="topic-main" onClick={() => onOpen(topic.id)}>
        <span className={`topic-dot ${topic.accent}`}><Layers3 size={16} /></span>
        <span className="topic-details"><strong>{topic.title}</strong><small>{topic.category ?? topic.chapter} · {dueLabel(topic, schedule)}</small></span>
        <span className="topic-status">{covered ? <Check size={17} /> : `${progress}%`}</span>
      </button>
      <button
        className={`schedule-button ${schedule ? 'is-set' : ''}`}
        onClick={() => onSchedule(topic.id)}
        aria-label={schedule ? `Reschedule ${topic.title}, currently ${dayLabel(schedule.date)} at ${formatTime(schedule.time)}` : `Schedule ${topic.title}`}
        title={schedule ? `Scheduled · ${dayLabel(schedule.date)}, ${formatTime(schedule.time)}` : 'Schedule review'}
      >
        <CalendarClock size={15} />
      </button>
      {onEdit && (
        <button
          className="more-button"
          onClick={() => onEdit(topic.id)}
          aria-label={`Edit or delete ${topic.title}`}
          title="Edit or delete topic"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
    </div>
  )
}

export default App
