import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePlus,
  Flame,
  Layers3,
  MoreHorizontal,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import Dock from './components/Dock.jsx'
import SettingsPage from './components/settings/settingsPage.jsx'
import './App.css'

const defaultSettings = {
  dockColor: '#ffffff',
  remindersEnabled: true,
  reminderTime: '09:00',
  weeklyGoal: 5,
  compactMode: false,
  reducedMotion: false,
}

function App() {
  const [view, setView] = useState('home')
  const [completed, setCompleted] = useState([])
  const [query, setQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(27)
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = window.localStorage.getItem('revision-settings')
      return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings
    } catch {
      return defaultSettings
    }
  })

  useEffect(() => {
    window.localStorage.setItem('revision-settings', JSON.stringify(settings))
  }, [settings])

  const updateSettings = (changes) => {
    setSettings((current) => ({ ...current, ...changes }))
  }

  const resetSettings = () => {
    if (!window.confirm('Reset all settings to their defaults?')) return false
    setSettings(defaultSettings)
    return true
  }

  const topics = [
    { id: 'react', title: 'React Server Components', category: 'Frontend', due: 'Today', accent: 'coral', progress: 72 },
    { id: 'systems', title: 'Distributed Systems', category: 'Computer science', due: 'Tomorrow', accent: 'blue', progress: 46 },
    { id: 'spanish', title: 'Spanish conversation', category: 'Language', due: 'Fri, 28 Jun', accent: 'yellow', progress: 28 },
  ]

  const filteredTopics = topics.filter((topic) => topic.title.toLowerCase().includes(query.toLowerCase()))

  const toggleComplete = (id) => {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <div className={`app-shell ${settings.compactMode ? 'compact-mode' : ''} ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <main className="app-content">
        {view === 'settings' ? (
          <SettingsPage settings={settings} onChange={updateSettings} onReset={resetSettings} />
        ) : view === 'library' ? (
          <section className="page-section">
            <PageHeader title="Your library" subtitle="Keep every topic in one place." icon={<BookOpen size={18} />} />
            <div className="search-field">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics" aria-label="Search topics" />
            </div>
            <div className="topic-list full-list">
              {filteredTopics.map((topic) => <TopicRow key={topic.id} topic={topic} completed={completed} onToggle={toggleComplete} />)}
            </div>
            <button className="outline-button wide-button"><CirclePlus size={18} /> Add a topic</button>
          </section>
        ) : view === 'insights' ? (
          <section className="page-section">
            <PageHeader title="Your rhythm" subtitle="Small sessions compound into real recall." icon={<Target size={18} />} />
            <div className="insight-grid">
              <div className="insight-card highlight-card"><Flame size={20} /><strong>7 days</strong><span>Current streak</span></div>
              <div className="insight-card"><Brain size={20} /><strong>84%</strong><span>Recall strength</span></div>
              <div className="insight-card"><CalendarDays size={20} /><strong>18 min</strong><span>Average session</span></div>
            </div>
            <div className="panel weekly-panel">
              <div className="panel-heading"><div><h2>This week</h2><p>Minutes spent revising</p></div><MoreHorizontal size={20} /></div>
              <div className="bar-chart" aria-label="Weekly revision chart">
                {[44, 68, 52, 82, 60, 35, 22].map((height, index) => <div className="bar-column" key={index}><div className="bar" style={{ height: `${height}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}
              </div>
            </div>
          </section>
        ) : view === 'calendar' ? (
          <CalendarPage selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        ) : (
          <HomePage topics={topics} completed={completed} onToggle={toggleComplete} settings={settings} />
        )}
      </main>
      <Dock color={settings.dockColor} active={view} onNavigate={setView} />
    </div>
  )
}

function CalendarPage({ selectedDate, onSelectDate }) {
  const reviewDays = {
    3: { tone: 'blue', count: 1 },
    6: { tone: 'coral', count: 2 },
    11: { tone: 'yellow', count: 1 },
    14: { tone: 'blue', count: 1 },
    19: { tone: 'coral', count: 3 },
    24: { tone: 'yellow', count: 1 },
    27: { tone: 'coral', count: 2 },
  }
  const calendarDays = [
    ...Array.from({ length: 6 }, (_, index) => ({ day: 26 + index, outside: true })),
    ...Array.from({ length: 30 }, (_, index) => ({ day: index + 1 })),
    ...Array.from({ length: 6 }, (_, index) => ({ day: index + 1, outside: true })),
  ]
  const upcomingReviews = [
    { day: 27, weekday: 'THU', title: 'React Server Components', meta: 'Frontend · 20 min', tone: 'coral' },
    { day: 28, weekday: 'FRI', title: 'Spanish conversation', meta: 'Language · 15 min', tone: 'yellow' },
    { day: 30, weekday: 'SUN', title: 'Distributed Systems', meta: 'Computer science · 25 min', tone: 'blue' },
  ]

  return (
    <section className="page-section calendar-page">
      <PageHeader title="Your calendar" subtitle="A clear view of what is ready to revisit." icon={<CalendarDays size={18} />} />

      <div className="calendar-panel">
        <div className="calendar-toolbar">
          <div>
            <span className="calendar-eyebrow">Review plan</span>
            <h2>June 2024</h2>
          </div>
          <div className="calendar-actions">
            <button className="calendar-action" aria-label="Previous month"><ChevronRight size={16} className="rotate-180" /></button>
            <button className="calendar-action" aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
        </div>
        <div className="calendar-grid" role="grid" aria-label="June 2024 review calendar">
          {calendarDays.map((item, index) => {
            const review = !item.outside ? reviewDays[item.day] : null
            const isSelected = !item.outside && item.day === selectedDate
            return (
              <button
                className={`calendar-day ${item.outside ? 'outside-month' : ''} ${isSelected ? 'selected-day' : ''}`}
                key={`${item.outside ? 'outside' : 'current'}-${item.day}-${index}`}
                onClick={() => !item.outside && onSelectDate(item.day)}
                aria-label={`${item.outside ? 'Adjacent month' : 'June'} ${item.day}${review ? `, ${review.count} review${review.count > 1 ? 's' : ''}` : ''}`}
                aria-pressed={isSelected}
                disabled={item.outside}
              >
                <span>{item.day}</span>
                {review && <i className={`review-marker ${review.tone}`}>{review.count > 1 ? review.count : ''}</i>}
              </button>
            )
          })}
        </div>
        <div className="calendar-legend">
          <span><i className="legend-dot coral" /> Review due</span>
          <span><i className="legend-dot blue" /> Planned</span>
        </div>
      </div>

      <div className="section-heading calendar-list-heading">
        <div><h2>Upcoming reviews</h2><p>{selectedDate === 27 ? 'Your next few sessions are ready.' : `Reviews around June ${selectedDate}.`}</p></div>
        <span className="review-count">{upcomingReviews.length} queued</span>
      </div>
      <div className="upcoming-list">
        {upcomingReviews.map((review) => (
          <button className={`upcoming-review ${review.day === selectedDate ? 'current-review' : ''}`} key={review.title} onClick={() => onSelectDate(review.day)}>
            <span className="review-date"><strong>{review.day}</strong><small>{review.weekday}</small></span>
            <span className={`review-accent ${review.tone}`} />
            <span className="review-details"><strong>{review.title}</strong><small>{review.meta}</small></span>
            <ChevronRight size={17} />
          </button>
        ))}
      </div>
    </section>
  )
}

function HomePage({ topics, completed, onToggle, settings }) {
  const nextTopic = topics.find((topic) => !completed.includes(topic.id)) || topics[0]
  const goalProgress = Math.min(100, Math.round((completed.length / settings.weeklyGoal) * 100))
  return (
    <section className="page-section home-page">
      <header className="topbar">
        <div className="brand-mark"><span>r</span><div><strong>revision</strong><small>your second brain</small></div></div>
        <button className="icon-button" aria-label="Open profile"><span className="avatar">AK</span></button>
      </header>

      <div className="greeting">
        <p className="date-line">Thursday, 27 June</p>
        <h1>Make today<br /><em>stick.</em></h1>
        <p className="intro-copy">A little review now saves a lot of re-learning later.</p>
      </div>

      <button className="focus-card" onClick={() => onToggle(nextTopic.id)}>
        <div className="focus-orbit"><Sparkles size={20} /></div>
        <div className="focus-copy"><span className="focus-label">Up next</span><strong>{nextTopic.title}</strong><small>{nextTopic.category} · {nextTopic.due}</small></div>
        <span className="focus-arrow"><ArrowUpRight size={19} /></span>
      </button>

      <div className="section-heading"><div><h2>Keep the thread</h2><p>Your topics, at a glance.</p></div><button className="text-button">See all <ChevronRight size={16} /></button></div>
      <div className="topic-list">
        {topics.slice(0, 3).map((topic) => <TopicRow key={topic.id} topic={topic} completed={completed} onToggle={onToggle} />)}
      </div>

      <div className="streak-banner"><div className="streak-icon"><Flame size={18} /></div><div><strong>7 day streak</strong><span>{completed.length >= settings.weeklyGoal ? 'Weekly goal reached. Keep the rhythm going.' : `${settings.weeklyGoal - completed.length} more review${settings.weeklyGoal - completed.length === 1 ? '' : 's'} to reach your weekly goal.`}</span></div><div className="streak-progress"><span style={{ width: `${goalProgress}%` }} /></div></div>
      <div className={`reminder-banner ${settings.remindersEnabled ? '' : 'is-muted'}`}><CalendarDays size={16} /><span>{settings.remindersEnabled ? `Reminder set for ${formatTime(settings.reminderTime)}.` : 'Reminders are currently off.'}</span></div>
    </section>
  )
}

function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`
}

function PageHeader({ title, subtitle, icon }) {
  return <header className="page-header"><div className="page-title-icon">{icon}</div><div><h1>{title}</h1><p>{subtitle}</p></div></header>
}

function TopicRow({ topic, completed, onToggle }) {
  const isComplete = completed.includes(topic.id)
  return (
    <button className={`topic-row ${isComplete ? 'is-complete' : ''}`} onClick={() => onToggle(topic.id)}>
      <span className={`topic-dot ${topic.accent}`}><Layers3 size={16} /></span>
      <span className="topic-details"><strong>{topic.title}</strong><small>{topic.category} · {topic.due}</small></span>
      <span className="topic-status">{isComplete ? <Check size={17} /> : `${topic.progress}%`}</span>
    </button>
  )
}

export default App
