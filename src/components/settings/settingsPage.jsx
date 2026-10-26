import { Gauge, RotateCcw, Settings2, Sparkles } from 'lucide-react'

const weeklyGoals = [3, 5, 7]

function SettingsPage({ settings, onChange, onReset }) {
  return (
    <section className="page-section settings-page">
      <div className="settings-heading"><div className="page-title-icon"><Settings2 size={18} /></div><div><h1>Settings</h1><p>Make revision feel like yours.</p></div></div>
      <div className="settings-group">
        <div className="settings-label"><Gauge size={18} /><div><strong>Weekly goal</strong><span>Choose how many reviews you want to complete.</span></div></div>
        <div className="goal-picker" role="group" aria-label="Weekly review goal">{weeklyGoals.map((goal) => <button key={goal} className={settings.weeklyGoal === goal ? 'selected' : ''} aria-pressed={settings.weeklyGoal === goal} onClick={() => onChange({ weeklyGoal: goal })}>{goal}<small>reviews</small></button>)}</div>
      </div>
      <div className="settings-group">
        <div className="settings-label"><Sparkles size={18} /><div><strong>Focus mode</strong><span>Make the layout calmer and easier to scan.</span></div></div>
        <div className="toggle-list">
          <label className="toggle-row"><span><strong>Compact layout</strong><small>Use tighter topic cards.</small></span><input type="checkbox" checked={settings.compactMode} onChange={(event) => onChange({ compactMode: event.target.checked })} /><span className="switch-track" aria-hidden="true"><span /></span></label>
          <label className="toggle-row"><span><strong>Reduce motion</strong><small>Minimize interface transitions.</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => onChange({ reducedMotion: event.target.checked })} /><span className="switch-track" aria-hidden="true"><span /></span></label>
        </div>
      </div>
      <div className="settings-reset">
        <div><strong>Reset preferences</strong><span>Return appearance and focus settings to their defaults.</span></div>
        <button className="reset-button" onClick={onReset}><RotateCcw size={15} /> Reset</button>
      </div>
      <div className="settings-note"><strong>Built for steady progress.</strong><span>Revision is intentionally quiet, so your attention can stay on the work.</span></div>
    </section>
  )
}

export default SettingsPage
 