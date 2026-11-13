import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import rough from 'roughjs'
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
  ChevronsLeft,
  ChevronsRight,
  Circle,
  CirclePlus,
  Clock,
  Eraser,
  Flame,
  Layers3,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Square,
  Target,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
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

  /* Some in-app browsers expose a fixed-position viewport taller than the visible
     area; anchor the dock and sheets to the real visible height instead. */
  useEffect(() => {
    const setAppH = () => document.documentElement.style.setProperty('--app-h', `${document.documentElement.clientHeight}px`)
    setAppH()
    window.addEventListener('resize', setAppH)
    window.visualViewport?.addEventListener('resize', setAppH)
    return () => {
      window.removeEventListener('resize', setAppH)
      window.visualViewport?.removeEventListener('resize', setAppH)
    }
  }, [])

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
  const dockHidden = view === 'library' && openTopicId !== null

  return (
    <div className={`app-shell ${settings.compactMode ? 'compact-mode' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''} ${dockHidden ? 'dock-free' : ''}`}>
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
      <Dock active={view} onNavigate={setView} hidden={dockHidden} />
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

function LibraryPage({ books, allTopics, query, onQueryChange, openBookId, openTopicId, onOpenBook, onOpenTopic, schedules, checklists, canvases, onSetCanvas, onSchedule, onAddBook, onAddTopic, onEditBook, onEditTopic, onSetNote }) {
  const openBook = books.find((book) => book.id === openBookId)
  const openTopic = openBook?.topics.find((topic) => topic.id === openTopicId)

  if (openBook && openTopic) {
    return (
      <TopicPage
        key={openTopic.id}
        topic={openTopic}
        book={openBook}
        entry={checklists[openTopic.id]}
        canvas={canvases[openTopic.id]}
        onSetCanvas={(updater) => onSetCanvas(openTopic.id, updater)}
        onBack={() => onOpenTopic(null)}
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

function TopicPage({ topic, book, entry, canvas, onSetCanvas, onBack, onSetNote }) {
  const [space, setSpace] = useState('notes')
  const note = entry?.note ?? ''

  return (
    <section className="page-section topic-page">
      <div className="topic-header">
        <button className="back-button" onClick={onBack}><ChevronLeft size={15} /> {book.title}</button>
        <div className="space-toggle" role="tablist" aria-label="Topic spaces">
          <button role="tab" aria-selected={space === 'notes'} className={space === 'notes' ? 'active' : ''} onClick={() => setSpace('notes')}>Notes</button>
          <button role="tab" aria-selected={space === 'board'} className={space === 'board' ? 'active' : ''} onClick={() => setSpace('board')}>Board</button>
        </div>
      </div>

      {space === 'board' ? (
        <TopicBoard canvas={canvas ?? { texts: [], nodes: [], edges: [], strokes: [] }} onChange={onSetCanvas} />
      ) : (
        <textarea
          className="note-area"
          value={note}
          onChange={(event) => onSetNote(topic.id, event.target.value)}
          placeholder="Write freely…"
          aria-label="Notes"
        />
      )}
    </section>
  )
}

const NODE_W = 132
const NODE_H = 44
const INK = '#1d2633'
const SHAPE_FONT_PX = 15
const SHAPE_PAD_X = 14
const SHAPE_PAD_Y = 9
const SHAPE_MIN_W = 60
const SHAPE_MIN_H = 34

const makeElementId = (prefix) => `${prefix}-${Date.now()}`
const TEXT_SIZES = [12, 15, 19, 24, 30, 38, 48, 60]
const BOARD_COLORS = ['#1d2633', '#d96855', '#4d88aa', '#bb8b3d', '#8265b3', '#98a3af']
const BOARD_FILLS = ['#f9ddd5', '#d8e8f2', '#f6ecd4', '#e6ddf5', '#dcf0e4', '#eceff2']
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4
const clampZoom = (value) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

const BOARD_TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'pen', label: 'Pen', icon: Pencil },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'mind', label: 'Mind map', icon: Share2 },
]

function normalizeCanvas(canvas) {
  return {
    texts: (canvas.texts ?? []).map((t) => ({ ...t, color: t.color ?? INK, fontSize: t.fontSize ?? 15 })),
    strokes: (canvas.strokes ?? []).map((s) => ({ ...s, color: s.color ?? INK, width: 2 })),
    shapes: (canvas.shapes ?? []).map((s) => ({ ...s, width: 2 })),
    nodes: (canvas.nodes ?? []).map((n) => ({ ...n })),
    edges: (canvas.edges ?? []).map((e) => ({ ...e })),
  }
}

function strokesPath(points) {
  return points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

function normRect(shape) {
  return { x: Math.min(shape.x, shape.x + shape.w), y: Math.min(shape.y, shape.y + shape.h), w: Math.abs(shape.w), h: Math.abs(shape.h) }
}

function arrowHeadPoints(x1, y1, x2, y2, width) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 9 + width * 2
  const spread = 0.42
  return [
    [x2 - len * Math.cos(angle - spread), y2 - len * Math.sin(angle - spread)],
    [x2, y2],
    [x2 - len * Math.cos(angle + spread), y2 - len * Math.sin(angle + spread)],
  ]
}

function seedFromId(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) || 1
}

/* Rebuilds the sketchy render layer from plain geometry. Rough.js draws every
   rectangle/ellipse/line/connector as hand-drawn strokes with a stable seed per
   element, so each object keeps its own natural variation across re-renders. */
function buildRoughLayer(layer, svgEl, board, draftShape) {
  while (layer.firstChild) layer.removeChild(layer.firstChild)
  const rc = rough.svg(svgEl)
  const base = { roughness: 1, bowing: 1 }

  board.edges.forEach((edge) => {
    const a = board.nodes.find((n) => n.id === edge.from)
    const b = board.nodes.find((n) => n.id === edge.to)
    if (!a || !b) return
    layer.appendChild(rc.line(a.x + NODE_W / 2, a.y + NODE_H / 2, b.x + NODE_W / 2, b.y + NODE_H / 2, { ...base, stroke: '#b8c6d1', strokeWidth: 2, seed: seedFromId(edge.id) }))
  })

  const drawShape = (shape) => {
    const o = {
      ...base,
      stroke: shape.color,
      strokeWidth: shape.width,
      seed: seedFromId(shape.id),
      ...(shape.fill && shape.fill !== 'none' ? { fill: shape.fill, fillStyle: 'solid' } : {}),
    }
    if (shape.type === 'rect') {
      const b = normRect(shape)
      layer.appendChild(rc.rectangle(b.x, b.y, Math.max(b.w, 2), Math.max(b.h, 2), o))
    } else if (shape.type === 'ellipse') {
      const b = normRect(shape)
      layer.appendChild(rc.ellipse(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, 4), Math.max(b.h, 4), o))
    } else if (shape.type === 'line') {
      layer.appendChild(rc.line(shape.x, shape.y, shape.x + shape.w, shape.y + shape.h, o))
    } else {
      layer.appendChild(rc.line(shape.x, shape.y, shape.x + shape.w, shape.y + shape.h, o))
      layer.appendChild(rc.linearPath(arrowHeadPoints(shape.x, shape.y, shape.x + shape.w, shape.y + shape.h, shape.width), { ...base, stroke: shape.color, strokeWidth: shape.width, seed: seedFromId(shape.id) + 13 }))
    }
  }
  board.shapes.forEach(drawShape)
  if (draftShape) drawShape({ ...draftShape, id: 'draft' })

  board.nodes.forEach((n) => {
    layer.appendChild(rc.rectangle(n.x, n.y, NODE_W, NODE_H, { ...base, stroke: '#a9b8c4', strokeWidth: 1.5, fill: '#ffffff', fillStyle: 'solid', seed: seedFromId(n.id) }))
  })
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function textBounds(text) {
  const firstLine = (text.text ?? '').split('\n')[0] ?? ''
  return {
    x: text.x,
    y: text.y - 4,
    w: Math.max(24, firstLine.length * text.fontSize * 0.55),
    h: text.fontSize * 1.4 + 8,
  }
}

function hitTest(canvas, p, tolerance = 7) {
  const edges = canvas.edges.map((edge) => {
    const a = canvas.nodes.find((n) => n.id === edge.from)
    const b = canvas.nodes.find((n) => n.id === edge.to)
    if (!a || !b) return null
    return {
      kind: 'edge', id: edge.id,
      _a: { x: a.x + NODE_W / 2, y: a.y + NODE_H / 2 },
      _b: { x: b.x + NODE_W / 2, y: b.y + NODE_H / 2 },
    }
  }).filter(Boolean)
  const items = [
    ...canvas.texts.map((t) => ({ kind: 'text', ...t })),
    ...canvas.nodes.map((n) => ({ kind: 'node', ...n })),
    ...canvas.strokes.map((s) => ({ kind: 'stroke', ...s })),
    ...canvas.shapes.map((s) => ({ kind: 'shape', ...s })),
    ...edges,
  ]
  for (let i = items.length - 1; i >= 0; i--) {
    const el = items[i]
    if (el.kind === 'stroke') {
      const pts = el.points
      for (let j = 0; j < pts.length - 1; j++) {
        if (distToSegment(p, pts[j], pts[j + 1]) <= tolerance + el.width) return el
      }
      continue
    }
    if (el.kind === 'shape' && (el.type === 'line' || el.type === 'arrow')) {
      if (distToSegment(p, { x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }) <= tolerance + el.width) return el
      continue
    }
    if (el.kind === 'edge') {
      if (distToSegment(p, el._a, el._b) <= tolerance) return el
      continue
    }
    if (el.kind === 'shape' && el.type === 'ellipse') {
      const b = normRect(el)
      const rx = Math.max(b.w / 2, 1)
      const ry = Math.max(b.h / 2, 1)
      const t = ((p.x - (b.x + rx)) ** 2) / (rx * rx) + ((p.y - (b.y + ry)) ** 2) / (ry * ry)
      if (t <= 1 || Math.abs(Math.sqrt(t) - 1) * Math.min(rx, ry) <= tolerance) return el
      continue
    }
    const b = el.kind === 'text' ? textBounds(el) : el.kind === 'node' ? { x: el.x, y: el.y, w: NODE_W, h: NODE_H } : normRect(el)
    if (p.x >= b.x - tolerance && p.x <= b.x + b.w + tolerance && p.y >= b.y - tolerance && p.y <= b.y + b.h + tolerance) return el
  }
  return null
}

function SelectionOutline({ shape, scale }) {
  const base = shape.type === 'line' || shape.type === 'arrow'
    ? { x: Math.min(shape.x, shape.x + shape.w), y: Math.min(shape.y, shape.y + shape.h), w: Math.abs(shape.w), h: Math.abs(shape.h) }
    : normRect(shape)
  const pad = 6 / scale
  return (
    <rect
      x={base.x - pad} y={base.y - pad}
      width={Math.max(base.w + pad * 2, 10)} height={Math.max(base.h + pad * 2, 10)}
      rx={4} fill="none" stroke="rgba(217,104,85,.6)" strokeWidth={1.5 / scale}
      strokeDasharray={`${5 / scale} ${4 / scale}`}
    />
  )
}

function TopicBoard({ canvas: rawCanvas, onChange }) {
  const canvas = useMemo(() => normalizeCanvas(rawCanvas ?? { texts: [], strokes: [], shapes: [], nodes: [], edges: [] }), [rawCanvas])
  const surfaceRef = useRef(null)
  const svgRef = useRef(null)
  const roughLayerRef = useRef(null)
  const [tool, setTool] = useState('select')
  const [toolsPacked, setToolsPacked] = useState(false)
  const [canvasTouched, setCanvasTouched] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, s: 1 })
  const [selection, setSelection] = useState(null)
  const [defaults, setDefaults] = useState({ color: INK, fill: 'none', width: 2, fontSize: 15 })
  const [textDraft, setTextDraft] = useState(null)
  const [nodeDraft, setNodeDraft] = useState(null)
  const [shapeDraft, setShapeDraft] = useState(null)
  const [liveStroke, setLiveStroke] = useState(null)
  const [draftShape, setDraftShape] = useState(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panning, setPanning] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const historyRef = useRef({ stack: [], index: -1 })
  const gestureRef = useRef(null)
  const strokeRef = useRef(null)
  const draftRef = useRef(null)
  const measureRef = useRef(null)
  const pointersRef = useRef(new Map())
  const pinchRef = useRef(null)
  const cancelRef = useRef(false)
  const selectionRef = useRef(null)
  const defaultsRef = useRef(defaults)
  const viewRef = useRef(view)
  selectionRef.current = selection
  defaultsRef.current = defaults
  viewRef.current = view

  useLayoutEffect(() => {
    if (roughLayerRef.current && svgRef.current) buildRoughLayer(roughLayerRef.current, svgRef.current, canvas, draftShape)
    // draftShape included so the in-progress shape is drawn sketchy as well
  }, [canvas, draftShape])

  useEffect(() => {
    historyRef.current = { stack: [JSON.stringify(normalizeCanvas(canvas))], index: 0 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncHistoryFlags = () => {
    setCanUndo(historyRef.current.index > 0)
    setCanRedo(historyRef.current.index < historyRef.current.stack.length - 1)
  }
  const pushHistory = (next) => {
    const h = historyRef.current
    const snap = JSON.stringify(next)
    if (h.stack[h.index] === snap) return
    h.stack = h.stack.slice(0, h.index + 1)
    h.stack.push(snap)
    if (h.stack.length > 50) h.stack.shift()
    h.index = h.stack.length - 1
    syncHistoryFlags()
  }
  const commit = (mutator, { history = true } = {}) => {
    onChange((raw) => {
      const next = normalizeCanvas(raw)
      mutator(next)
      if (history) pushHistory(next)
      return next
    })
  }
  const undo = () => {
    const h = historyRef.current
    if (h.index <= 0) return
    h.index -= 1
    onChange(() => JSON.parse(h.stack[h.index]))
    setSelection(null)
    syncHistoryFlags()
  }
  const redo = () => {
    const h = historyRef.current
    if (h.index >= h.stack.length - 1) return
    h.index += 1
    onChange(() => JSON.parse(h.stack[h.index]))
    setSelection(null)
    syncHistoryFlags()
  }

  const toWorld = (event) => {
    const rect = surfaceRef.current.getBoundingClientRect()
    return { x: (event.clientX - rect.left - viewRef.current.x) / viewRef.current.s, y: (event.clientY - rect.top - viewRef.current.y) / viewRef.current.s }
  }
  const zoomAt = (cx, cy, factor) => setView((v) => {
    const s = clampZoom(v.s * factor)
    return { s, x: cx - (cx - v.x) * (s / v.s), y: cy - (cy - v.y) * (s / v.s) }
  })

  useEffect(() => {
    const el = surfaceRef.current
    const onWheel = (event) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) {
        zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0022))
      } else {
        setView((v) => ({ ...v, x: v.x - event.deltaX, y: v.y - event.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteSelection = () => {
    const sel = selectionRef.current
    if (!sel) return
    if (sel.kind === 'edge') commit((c) => { c.edges = c.edges.filter((e) => e.id !== sel.id) })
    else if (sel.kind === 'node') commit((c) => { c.nodes = c.nodes.filter((n) => n.id !== sel.id); c.edges = c.edges.filter((e) => e.from !== sel.id && e.to !== sel.id) })
    else if (sel.kind === 'text') commit((c) => { c.texts = c.texts.filter((t) => t.id !== sel.id) })
    else if (sel.kind === 'stroke') commit((c) => { c.strokes = c.strokes.filter((s) => s.id !== sel.id) })
    else if (sel.kind === 'shape') commit((c) => { c.shapes = c.shapes.filter((s) => s.id !== sel.id) })
    setSelection(null)
  }

  const keyActionsRef = useRef({})
  keyActionsRef.current = { undo, redo, deleteSelection }
  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement
      return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'))
    }
    const onKeyDown = (event) => {
      if (event.code === 'Space' && !isTyping()) {
        event.preventDefault()
        setSpaceHeld(true)
        return
      }
      if (isTyping()) return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) keyActionsRef.current.redo()
        else keyActionsRef.current.undo()
        return
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault()
        keyActionsRef.current.redo()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectionRef.current) {
        event.preventDefault()
        keyActionsRef.current.deleteSelection()
      }
    }
    const onKeyUp = (event) => {
      if (event.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const eraseAt = (p) => {
    const hit = hitTest(canvas, p)
    if (!hit) return
    if (hit.kind === 'edge') commit((c) => { c.edges = c.edges.filter((e) => e.id !== hit.id) })
    else if (hit.kind === 'node') commit((c) => { c.nodes = c.nodes.filter((n) => n.id !== hit.id); c.edges = c.edges.filter((e) => e.from !== hit.id && e.to !== hit.id) })
    else if (hit.kind === 'text') commit((c) => { c.texts = c.texts.filter((t) => t.id !== hit.id) })
    else if (hit.kind === 'stroke') commit((c) => { c.strokes = c.strokes.filter((s) => s.id !== hit.id) })
    else if (hit.kind === 'shape') commit((c) => { c.shapes = c.shapes.filter((s) => s.id !== hit.id) })
  }

  const onPointerDown = (event) => {
    if (event.target.closest('[data-ui]') || event.target.closest('input')) return
    setCanvasTouched(true)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      gestureRef.current = null
      strokeRef.current = null
      draftRef.current = null
      setLiveStroke(null)
      setDraftShape(null)
      pinchRef.current = { dist: Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1), view: { ...viewRef.current } }
      return
    }
    try { surfaceRef.current.setPointerCapture(event.pointerId) } catch { /* synthetic events may not capture */ }
    if (event.button === 1 || (spaceHeld && tool === 'select')) {
      event.preventDefault()
      gestureRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, view: { ...viewRef.current } }
      setPanning(true)
      return
    }
    if (event.button !== 0) return
    const p = toWorld(event)

    if (tool === 'select') {
      const hit = hitTest(canvas, p)
      setSelection(hit ? { kind: hit.kind, id: hit.id } : null)
      if (hit && hit.kind !== 'edge') gestureRef.current = { kind: 'move', orig: { ...hit }, startX: p.x, startY: p.y }
      return
    }
    if (tool === 'pen') {
      gestureRef.current = { kind: 'draw-stroke' }
      strokeRef.current = [p]
      setLiveStroke(strokeRef.current)
      return
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'arrow' || tool === 'line') {
      gestureRef.current = { kind: 'draw-shape' }
      const draft = { type: tool, x: p.x, y: p.y, w: 0, h: 0, color: defaultsRef.current.color, fill: defaultsRef.current.fill, width: defaultsRef.current.width, rough: defaultsRef.current.rough }
      draftRef.current = draft
      setDraftShape(draft)
      return
    }
    if (tool === 'text') {
      setSelection(null)
      /* Defer the input to pointer-up: mounting it during the press lets the
         mousedown default action steal its focus straight away. */
      gestureRef.current = { kind: 'text-place', at: p }
      return
    }
    if (tool === 'eraser') {
      gestureRef.current = { kind: 'erase' }
      eraseAt(p)
      return
    }
    if (tool === 'mind') {
      const hit = hitTest(canvas, p)
      if (hit && hit.kind === 'node') {
        const sel = selectionRef.current
        if (sel && sel.kind === 'node' && sel.id !== hit.id && !canvas.edges.some((e) => (e.from === sel.id && e.to === hit.id) || (e.from === hit.id && e.to === sel.id))) {
          commit((c) => { c.edges.push({ id: `eg-${Date.now()}`, from: sel.id, to: hit.id }) })
        }
        setSelection((current) => (current?.kind === 'node' && current.id === hit.id ? null : { kind: 'node', id: hit.id }))
        return
      }
      setSelection(null)
      const id = `nd-${Date.now()}`
      commit((c) => { c.nodes.push({ id, x: p.x - NODE_W / 2, y: p.y - NODE_H / 2, label: '' }) }, { history: false })
      cancelRef.current = false
      setNodeDraft({ id, value: '', isNew: true })
    }
  }

  const onPointerMove = (event) => {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.max(Math.hypot(a.x - b.x, a.y - b.y), 1)
      const start = pinchRef.current
      const rect = surfaceRef.current.getBoundingClientRect()
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }
      const factor = clampZoom(dist / start.dist)
      setView((v) => {
        const s = clampZoom(start.view.s * factor)
        return { s, x: mid.x - (mid.x - start.view.x) * (s / start.view.s), y: mid.y - (mid.y - start.view.y) * (s / start.view.s) }
      })
      return
    }
    const gesture = gestureRef.current
    if (!gesture) return
    if (gesture.kind === 'pan') {
      setView({ s: gesture.view.s, x: gesture.view.x + (event.clientX - gesture.startX), y: gesture.view.y + (event.clientY - gesture.startY) })
      return
    }
    const p = toWorld(event)
    if (gesture.kind === 'move') {
      const dx = p.x - gesture.startX
      const dy = p.y - gesture.startY
      const o = gesture.orig
      commit((c) => {
        if (o.kind === 'text') c.texts = c.texts.map((t) => t.id === o.id ? { ...t, x: o.x + dx, y: o.y + dy } : t)
        else if (o.kind === 'node') c.nodes = c.nodes.map((n) => n.id === o.id ? { ...n, x: o.x + dx, y: o.y + dy } : n)
        else if (o.kind === 'stroke') c.strokes = c.strokes.map((s) => s.id === o.id ? { ...s, points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) } : s)
        else if (o.kind === 'shape') c.shapes = c.shapes.map((s) => s.id === o.id ? { ...s, x: o.x + dx, y: o.y + dy } : s)
      }, { history: false })
      return
    }
    if (gesture.kind === 'draw-stroke') {
      const last = strokeRef.current[strokeRef.current.length - 1]
      if (Math.hypot(p.x - last.x, p.y - last.y) > 1.5) {
        strokeRef.current = [...strokeRef.current, p]
        setLiveStroke(strokeRef.current)
      }
      return
    }
    if (gesture.kind === 'draw-shape') {
      const draft = { ...draftRef.current, w: p.x - draftRef.current.x, h: p.y - draftRef.current.y }
      draftRef.current = draft
      setDraftShape(draft)
      return
    }
    if (gesture.kind === 'erase') eraseAt(p)
  }

  const onPointerUp = (event) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    const gesture = gestureRef.current
    if (!gesture) return
    gestureRef.current = null
    if (gesture.kind === 'text-place') {
      if (event.type !== 'pointercancel') {
        cancelRef.current = false
        setTextDraft({ x: gesture.at.x, y: gesture.at.y, value: '', width: measureLineWidth('', defaultsRef.current.fontSize) + 6, fontSize: defaultsRef.current.fontSize, color: defaultsRef.current.color })
      }
      return
    }
    if (gesture.kind === 'pan') { setPanning(false); return }
    if (gesture.kind === 'draw-stroke') {
      const points = strokeRef.current ?? []
      strokeRef.current = null
      setLiveStroke(null)
      if (points.length > 1) {
        commit((c) => { c.strokes.push({ id: `st-${Date.now()}`, points, color: defaultsRef.current.color, width: defaultsRef.current.width }) })
      }
      return
    }
    if (gesture.kind === 'draw-shape') {
      const draft = draftRef.current
      draftRef.current = null
      setDraftShape(null)
      if (draft) {
        const isLine = draft.type === 'line' || draft.type === 'arrow'
        const meaningful = isLine ? Math.hypot(draft.w, draft.h) > 4 : Math.abs(draft.w) > 4 && Math.abs(draft.h) > 4
        if (meaningful) {
          const id = makeElementId('sh')
          const shape = isLine
            ? { ...draft, id }
            : { ...draft, x: Math.min(draft.x, draft.x + draft.w), y: Math.min(draft.y, draft.y + draft.h), w: Math.abs(draft.w), h: Math.abs(draft.h), id }
          commit((c) => { c.shapes.push(shape) })
          /* Closed shapes go straight into label editing; the shape hugs the text as it is typed. */
          if (!isLine) {
            cancelRef.current = false
            setShapeDraft({ id, value: '', isNew: true, orig: { x: shape.x, y: shape.y, w: shape.w, h: shape.h }, origLabel: '' })
          }
        }
      }
      return
    }
    if (gesture.kind === 'move' || gesture.kind === 'erase' || gesture.kind === 'resize') {
      commit((c) => c, { history: true })
    }
  }

  const startResize = (event, handle) => {
    event.stopPropagation()
    const shape = canvas.shapes.find((s) => s.id === selection?.id)
    if (!shape) return
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* ignore */ }
    gestureRef.current = { kind: 'resize', shape: { ...shape }, handle }
  }
  const onHandleMove = (event) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.kind !== 'resize') return
    const p = toWorld(event)
    const o = gesture.shape
    if (o.type === 'line' || o.type === 'arrow') {
      if (gesture.handle.index === 0) {
        commit((c) => { c.shapes = c.shapes.map((s) => s.id === o.id ? { ...s, x: p.x, y: p.y, w: o.x + o.w - p.x, h: o.y + o.h - p.y } : s) }, { history: false })
      } else {
        commit((c) => { c.shapes = c.shapes.map((s) => s.id === o.id ? { ...s, w: p.x - o.x, h: p.y - o.y } : s) }, { history: false })
      }
      return
    }
    const anchor = gesture.handle.anchor
    commit((c) => {
      c.shapes = c.shapes.map((s) => s.id === o.id
        ? { ...s, x: Math.min(anchor.x, p.x), y: Math.min(anchor.y, p.y), w: Math.abs(p.x - anchor.x), h: Math.abs(p.y - anchor.y) }
        : s)
    }, { history: false })
  }
  const onHandleUp = () => {
    if (gestureRef.current?.kind === 'resize') commit((c) => c, { history: true })
    gestureRef.current = null
  }

  const onSurfaceDoubleClick = (event) => {
    if (event.target.closest('[data-ui]') || event.target.closest('input')) return
    const hit = hitTest(canvas, toWorld(event))
    if (!hit) return
    if (hit.kind === 'text') {
      cancelRef.current = false
      const fontSize = hit.fontSize ?? 15
      setTextDraft({ id: hit.id, x: hit.x, y: hit.y, value: hit.text, width: measureLineWidth(hit.text, fontSize) + 6, fontSize, color: hit.color ?? INK })
    }
    if (hit.kind === 'node') { cancelRef.current = false; setNodeDraft({ id: hit.id, value: hit.label, isNew: false }) }
    if (hit.kind === 'shape' && (hit.type === 'rect' || hit.type === 'ellipse')) {
      cancelRef.current = false
      setShapeDraft({ id: hit.id, value: hit.label ?? '', isNew: false, orig: { x: hit.x, y: hit.y, w: hit.w, h: hit.h }, origLabel: hit.label ?? '' })
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
      commit((c) => {
        if (draft.id) c.texts = c.texts.map((t) => t.id === draft.id ? { ...t, text: draft.value } : t)
        else c.texts.push({ id: makeElementId('tx'), x: draft.x, y: draft.y, text: draft.value, color: draft.color, fontSize: draft.fontSize })
      })
    } else if (draft.id) {
      commit((c) => { c.texts = c.texts.filter((t) => t.id !== draft.id) })
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
      commit((c) => { c.nodes = c.nodes.map((n) => n.id === draft.id ? { ...n, label: value } : n) })
    } else if (draft.isNew) {
      commit((c) => {
        c.nodes = c.nodes.filter((n) => n.id !== draft.id)
        c.edges = c.edges.filter((e) => e.from !== draft.id && e.to !== draft.id)
      })
    }
    setNodeDraft(null)
  }

  /* Single-line width, used by the standalone text input so the box follows the typed text. */
  const measureLineWidth = (value, fontSize) => {
    const el = measureRef.current
    if (!el) return 0
    el.style.whiteSpace = 'pre'
    el.style.width = ''
    el.style.fontSize = `${fontSize}px`
    el.textContent = value || ' '
    return el.offsetWidth
  }

  /* Longest unbreakable word plus the height of the text wrapped at columnWidth. */
  const measureTextLayout = (value, columnWidth, fontSize = SHAPE_FONT_PX) => {
    const el = measureRef.current
    if (!el) return { wordW: 0, wrappedH: fontSize * 1.3 }
    const words = value.split(/\s+/).filter(Boolean)
    el.style.whiteSpace = 'pre'
    el.style.width = ''
    el.style.fontSize = `${fontSize}px`
    el.textContent = words.reduce((longest, word) => (word.length > longest.length ? word : longest), ' ')
    const wordW = el.offsetWidth
    el.style.whiteSpace = 'normal'
    el.style.width = `${Math.max(10, Math.round(columnWidth))}px`
    el.textContent = value || ' '
    const wrappedH = el.offsetHeight
    el.style.whiteSpace = ''
    el.style.width = ''
    return { wordW, wrappedH }
  }

  const shapeTextColumn = (shape) => Math.max(30, (shape.type === 'ellipse' ? shape.w / Math.SQRT2 : shape.w) - SHAPE_PAD_X * 2)

  /* The drawn size is the floor: text wraps inside it and the shape only grows
     once the wrapped text no longer fits. Rects stretch taller; ellipses scale
     width and height by the same factor so they stay round. */
  const fitShapeToText = (shape, value) => {
    const colW = shapeTextColumn(shape)
    const { wordW, wrappedH } = measureTextLayout(value, colW)
    const cx = shape.x + shape.w / 2
    const cy = shape.y + shape.h / 2
    let w
    let h
    if (shape.type === 'ellipse') {
      /* Text lives in the inscribed rectangle, so the bounding box needs √2× it. */
      const wReq = Math.max(SHAPE_MIN_W, (wordW + SHAPE_PAD_X * 2) * Math.SQRT2)
      const hReq = Math.max(SHAPE_MIN_H, (wrappedH + SHAPE_PAD_Y * 2) * Math.SQRT2)
      const scale = Math.max(wReq / shape.w, hReq / shape.h, 1)
      w = shape.w * scale
      h = shape.h * scale
    } else {
      w = Math.max(shape.w, SHAPE_MIN_W, wordW + SHAPE_PAD_X * 2)
      h = Math.max(shape.h, SHAPE_MIN_H, wrappedH + SHAPE_PAD_Y * 2)
    }
    return { shape: { ...shape, x: cx - w / 2, y: cy - h / 2, w, h }, colW, textH: wrappedH }
  }

  const resizeShapeToText = (id, value) => {
    let layout = null
    commit((c) => {
      c.shapes = c.shapes.map((s) => {
        if (s.id !== id) return s
        const result = fitShapeToText(s, value)
        layout = { colW: result.colW, textH: result.textH }
        return result.shape
      })
    }, { history: false })
    return layout
  }

  const commitShapeLabel = () => {
    const draft = shapeDraft
    if (!draft) return
    const cancelled = cancelRef.current
    cancelRef.current = false
    if (cancelled) {
      commit((c) => {
        c.shapes = c.shapes.map((s) => s.id === draft.id ? { ...s, ...draft.orig, label: draft.origLabel } : s)
      }, { history: false })
    } else {
      const value = draft.value.trim()
      commit((c) => {
        c.shapes = c.shapes.map((s) => {
          if (s.id !== draft.id) return s
          return { ...(value ? fitShapeToText(s, value).shape : s), label: value }
        })
      })
    }
    setShapeDraft(null)
  }

  const applyProp = (prop, value) => {
    setDefaults((current) => ({ ...current, [prop]: value }))
    const sel = selectionRef.current
    if (!sel) return
    commit((c) => {
      if (sel.kind === 'text') c.texts = c.texts.map((t) => t.id === sel.id ? (prop === 'color' || prop === 'fontSize' ? { ...t, [prop]: value } : t) : t)
      else if (sel.kind === 'stroke') c.strokes = c.strokes.map((s) => s.id === sel.id ? { ...s, color: prop === 'color' ? value : s.color } : s)
      else if (sel.kind === 'shape') c.shapes = c.shapes.map((s) => s.id === sel.id ? { ...s, color: prop === 'color' ? value : s.color, fill: prop === 'fill' ? value : s.fill } : s)
    })
  }

  const switchTool = (id) => {
    setTool(id)
    setSelection(null)
    setLiveStroke(null)
    setDraftShape(null)
    setCanvasTouched(false)
    strokeRef.current = null
    draftRef.current = null
    gestureRef.current = null
  }

  const selShape = selection?.kind === 'shape' ? canvas.shapes.find((s) => s.id === selection.id) : null
  const selStroke = selection?.kind === 'stroke' ? canvas.strokes.find((s) => s.id === selection.id) : null
  const selText = selection?.kind === 'text' ? canvas.texts.find((t) => t.id === selection.id) : null
  const selNode = selection?.kind === 'node' ? canvas.nodes.find((n) => n.id === selection.id) : null

  const activeFontSize = selText ? selText.fontSize : defaults.fontSize

  /* Steps through TEXT_SIZES so both buttons and repeated clicks land on the same scale. */
  const changeTextSize = (delta) => {
    const index = TEXT_SIZES.reduce((best, size, i) => (Math.abs(size - activeFontSize) < Math.abs(TEXT_SIZES[best] - activeFontSize) ? i : best), 0)
    const next = TEXT_SIZES[Math.min(TEXT_SIZES.length - 1, Math.max(0, index + delta))]
    if (next !== activeFontSize) applyProp('fontSize', next)
  }

  const handles = []
  if (selShape) {
    if (selShape.type === 'rect' || selShape.type === 'ellipse') {
      const b = normRect(selShape)
      handles.push(
        { x: b.x, y: b.y, anchor: { x: b.x + b.w, y: b.y + b.h } },
        { x: b.x + b.w, y: b.y, anchor: { x: b.x, y: b.y + b.h } },
        { x: b.x, y: b.y + b.h, anchor: { x: b.x + b.w, y: b.y } },
        { x: b.x + b.w, y: b.y + b.h, anchor: { x: b.x, y: b.y } },
      )
    } else {
      handles.push({ x: selShape.x, y: selShape.y, index: 0 }, { x: selShape.x + selShape.w, y: selShape.y + selShape.h, index: 1 })
    }
  }

  /* Colour dock: offered when a drawing tool is fresh so defaults can be set,
     but it disappears the moment the canvas is actually used — it only
     reappears to edit the colours of a selected element. */
  const showProps = !toolsPacked && tool !== 'eraser' && (selection !== null || (['pen', 'rect', 'ellipse', 'arrow', 'line', 'text', 'mind'].includes(tool) && !canvasTouched))
  const activeFill = selShape ? selShape.fill : selText || selNode ? undefined : defaults.fill
  const activeColor = selShape ? selShape.color : selStroke ? selStroke.color : selText ? selText.color : selNode ? undefined : defaults.color
  /* Fill applies only to the closed shapes; strokes, text, arrows and lines are stroke-only. */
  const fillApplies = tool === 'rect' || tool === 'ellipse' || Boolean(selShape && (selShape.type === 'rect' || selShape.type === 'ellipse'))

  return (
    <div className="board-wrap">
      <div className={`board-toolbar ${toolsPacked ? 'packed' : ''}`} data-ui>
        {toolsPacked ? (
          <button className="board-tool" onClick={() => setToolsPacked(false)} aria-label="Show tools" title="Show tools">
            <ChevronsRight size={15} />
          </button>
        ) : (
          <>
            {BOARD_TOOLS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`board-tool ${tool === id ? 'active' : ''}`} onClick={() => switchTool(id)} aria-label={label} aria-pressed={tool === id} title={label}>
                <Icon size={15} />
              </button>
            ))}
            <span className="board-sep" />
            <button className="board-tool" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
            <button className="board-tool" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={15} /></button>
            <span className="board-sep" />
            <button
              className="board-tool"
              onClick={() => {
                if (!window.confirm('Clear everything on this board?')) return
                commit((c) => {
                  c.texts = []
                  c.strokes = []
                  c.shapes = []
                  c.nodes = []
                  c.edges = []
                })
                setSelection(null)
                setTextDraft(null)
                setNodeDraft(null)
                setShapeDraft(null)
              }}
              aria-label="Clear board"
              title="Clear board"
            >
              <Trash2 size={15} />
            </button>
            <button className="board-tool" onClick={() => setToolsPacked(true)} aria-label="Hide tools" title="Hide tools">
              <ChevronsLeft size={15} />
            </button>
          </>
        )}
      </div>

      {showProps && (
        <div className="board-props" data-ui>
          <div className="board-prop">
            <span>Stroke</span>
            <div className="board-swatches">
              {BOARD_COLORS.map((color) => (
                <button key={color} className={`board-swatch ${activeColor === color ? 'active' : ''}`} style={{ background: color }} onClick={() => applyProp('color', color)} aria-label={`Stroke ${color}`} title={color} />
              ))}
            </div>
          </div>
          {fillApplies && (
            <div className="board-prop">
              <span>Fill</span>
              <div className="board-swatches">
                <button className={`board-swatch fill-none ${activeFill === 'none' ? 'active' : ''}`} onClick={() => applyProp('fill', 'none')} aria-label="No fill" title="No fill" />
                {BOARD_FILLS.map((color) => (
                  <button key={color} className={`board-swatch ${activeFill === color ? 'active' : ''}`} style={{ background: color }} onClick={() => applyProp('fill', color)} aria-label={`Fill ${color}`} title={color} />
                ))}
              </div>
            </div>
          )}
          {(selText || tool === 'text') && (
            <div className="board-prop">
              <span>Size</span>
              <div className="board-size">
                <button onClick={() => changeTextSize(-1)} aria-label="Decrease text size" title="Smaller text"><Minus size={13} /></button>
                <strong>{activeFontSize}px</strong>
                <button onClick={() => changeTextSize(1)} aria-label="Increase text size" title="Bigger text"><Plus size={13} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={surfaceRef}
        className={`board-surface tool-${tool} ${panning ? 'panning' : ''} ${spaceHeld && tool === 'select' ? 'pan-ready' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onSurfaceDoubleClick}
      >
        <div className="board-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <svg ref={svgRef} className="board-svg" aria-hidden="true">
            <g ref={roughLayerRef} />
            {selShape && <SelectionOutline shape={selShape} scale={view.s} />}
            {selStroke && <path d={strokesPath(selStroke.points)} fill="none" stroke="rgba(217,104,85,.35)" strokeWidth={selStroke.width + 6} strokeLinecap="round" strokeLinejoin="round" />}
            {canvas.strokes.map((stroke) => (
              <path key={stroke.id} className="board-stroke" d={strokesPath(stroke.points)} stroke={stroke.color} strokeWidth={stroke.width} />
            ))}
            {liveStroke && <path className="board-stroke" d={strokesPath(liveStroke)} stroke={defaultsRef.current.color} strokeWidth={defaultsRef.current.width} />}
          </svg>

          {canvas.texts.map((text) => textDraft?.id === text.id ? null : (
            <div
              key={text.id}
              className={`board-text ${selection?.kind === 'text' && selection.id === text.id ? 'selected' : ''}`}
              style={{ left: text.x, top: text.y, color: text.color, fontSize: text.fontSize }}
            >
              {text.text}
            </div>
          ))}

          {canvas.shapes.map((shape) => {
            if (shapeDraft?.id === shape.id) {
              const colW = shapeDraft.layout?.colW ?? shapeTextColumn(shape)
              const textH = shapeDraft.layout?.textH ?? SHAPE_FONT_PX * 1.3
              return (
                <textarea
                  key={shape.id}
                  className="board-shape-input"
                  style={{
                    left: shape.x + (shape.w - colW) / 2,
                    top: shape.y + (shape.h - textH) / 2,
                    width: colW,
                    height: Math.ceil(textH) + 2,
                    color: shape.color,
                  }}
                  value={shapeDraft.value}
                  autoFocus
                  rows={1}
                  onChange={(event) => {
                    const value = event.target.value
                    const layout = resizeShapeToText(shape.id, value)
                    setShapeDraft((current) => (current ? { ...current, value, layout: layout ?? current.layout } : current))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) commitShapeLabel()
                    if (event.key === 'Escape') { cancelRef.current = true; commitShapeLabel() }
                  }}
                  onBlur={commitShapeLabel}
                  aria-label="Shape label"
                />
              )
            }
            if (!shape.label || shape.type === 'line' || shape.type === 'arrow') return null
            const colW = shapeTextColumn(shape)
            return (
              <div
                key={shape.id}
                className="board-shape-label"
                style={{ left: shape.x + (shape.w - colW) / 2, top: shape.y, width: colW, height: shape.h, color: shape.color }}
              >
                {shape.label}
              </div>
            )
          })}

          {canvas.nodes.map((node) => (
            <div
              key={node.id}
              className={`board-node ${selection?.kind === 'node' && selection.id === node.id ? 'selected' : ''}`}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
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
              style={{ left: textDraft.x, top: textDraft.y, width: textDraft.width, color: textDraft.color, fontSize: textDraft.fontSize }}
              value={textDraft.value}
              autoFocus
              onChange={(event) => {
                const value = event.target.value
                setTextDraft((current) => (current ? { ...current, value, width: measureLineWidth(value, current.fontSize) + 6 } : current))
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitText()
                if (event.key === 'Escape') { cancelRef.current = true; commitText() }
              }}
              onBlur={commitText}
              aria-label="Board text"
            />
          )}
        </div>

        <div className="board-overlay">
          {handles.map((handle, index) => {
            const sx = handle.x * view.s + view.x
            const sy = handle.y * view.s + view.y
            return <button key={index} data-ui className="board-handle" style={{ left: sx - 5, top: sy - 5 }} onPointerDown={(event) => startResize(event, handle)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} aria-label="Resize handle" />
          })}
        </div>
      </div>

      <div className="board-zoom" data-ui>
        <button onClick={() => zoomAt(surfaceRef.current.clientWidth / 2, surfaceRef.current.clientHeight / 2, 1 / 1.25)} aria-label="Zoom out"><ZoomOut size={14} /></button>
        <button className="board-zoom-level" onClick={() => setView({ x: 0, y: 0, s: 1 })} title="Reset zoom">{Math.round(view.s * 100)}%</button>
        <button onClick={() => zoomAt(surfaceRef.current.clientWidth / 2, surfaceRef.current.clientHeight / 2, 1.25)} aria-label="Zoom in"><ZoomIn size={14} /></button>
      </div>

      <span ref={measureRef} className="board-shape-measure" aria-hidden="true" />
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
