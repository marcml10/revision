import { BarChart3, BookOpen, CalendarDays, Home, Settings2 } from 'lucide-react'

function Dock({ color = '#ffffff', active = 'home', onNavigate, hidden = false }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ]

  return (
    <nav className={`bottom-dock ${hidden ? 'dock-hidden' : ''}`} style={{ backgroundColor: color }} aria-label="Primary navigation" inert={hidden || undefined}>
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`dock-item ${active === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
          aria-label={label}
          aria-current={active === id ? 'page' : undefined}
          title={label}
        >
          <Icon size={19} strokeWidth={active === id ? 2.4 : 1.8} />
        </button>
      ))}
    </nav>
  )
}

export default Dock
