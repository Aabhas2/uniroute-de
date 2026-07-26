'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  User, Bell, Download, Trash2, Moon, Sun, Palette,
  DollarSign, RefreshCw, Globe2, Monitor, LayoutDashboard,
  CheckSquare, Shield, Info, ChevronRight, AlertTriangle
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { countriesConfig } from '@/data/countries'
import { dbTasks } from '@/lib/db'
import { updateExchangeRates, formatExchangeRate } from '@/lib/exchangeRates'
import { cn } from '@/lib/utils'

// ─── Toggle component ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: () => void; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      className="toggle"
      data-checked={checked ? 'true' : 'false'}
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

// ─── Color scheme palettes ─────────────────────────────────────────────────
const COLOR_SCHEMES = [
  { key: 'burgundy', label: 'Burgundy',  primary: '349 52% 32%', accent: '38 72% 48%',  dot: '#8B2340' },
  { key: 'ocean',    label: 'Ocean',     primary: '210 78% 40%', accent: '183 65% 42%', dot: '#1A5C9C' },
  { key: 'forest',   label: 'Forest',    primary: '152 48% 30%', accent: '80 58% 42%',  dot: '#1F6B3F' },
  { key: 'slate',    label: 'Slate',     primary: '220 42% 35%', accent: '260 52% 52%', dot: '#2D4A7A' },
  { key: 'rose',     label: 'Rose',      primary: '340 68% 40%', accent: '15 72% 52%',  dot: '#A31B47' },
  { key: 'amber',    label: 'Amber',     primary: '28 80% 42%',  accent: '48 88% 48%',  dot: '#B45309' },
]

type TabKey = 'profile' | 'appearance' | 'dashboard' | 'currency' | 'tasks' | 'notifications' | 'data' | 'about'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'profile',       label: 'Profile',       icon: User },
  { key: 'appearance',    label: 'Appearance',    icon: Palette },
  { key: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { key: 'currency',      label: 'Currency',      icon: DollarSign },
  { key: 'tasks',         label: 'Tasks',         icon: CheckSquare },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'data',          label: 'Data',          icon: Shield },
  { key: 'about',         label: 'About',         icon: Info },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSettings } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [isUpdatingRates, setIsUpdatingRates] = useState(false)

  // GitHub-style Reset Data State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetConfirmInput, setResetConfirmInput] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    type: 'import' | 'clear' | null
    payload: string | null
    isLoading: boolean
  }>({ isOpen: false, type: null, payload: null, isLoading: false })

  const handleExecuteReset = async () => {
    if (resetConfirmInput.trim() !== 'RESET') return
    setIsResetting(true)
    try {
      localStorage.clear()
      toast.success('App data successfully reset')
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch {
      toast.error('Failed to reset app data')
    } finally {
      setIsResetting(false)
    }
  }

  // Apply color scheme to CSS variables on html element
  const applyColorScheme = useCallback((schemeKey: string) => {
    const scheme = COLOR_SCHEMES.find(s => s.key === schemeKey)
    if (!scheme) return
    const html = document.documentElement
    html.style.setProperty('--primary', scheme.primary)
    html.style.setProperty('--ring', scheme.primary)
    html.style.setProperty('--accent', scheme.accent)
  }, [])

  // Apply on load and when scheme changes
  useEffect(() => {
    if (settings.appearance.colorScheme) {
      applyColorScheme(settings.appearance.colorScheme)
    }
  }, [settings.appearance.colorScheme, applyColorScheme])

  const set = <K extends keyof typeof settings>(
    section: K,
    field: string,
    value: any
  ) => {
    updateSettings({
      ...settings,
      [section]: { ...(settings[section] as any), [field]: value },
    })
  }

  const handlePersonalChange = async (field: string, value: string) => {
    set('personalDetails', field, value)
    if (field === 'targetCountry') {
      const config = countriesConfig[value]
      if (config) {
        setConfirmState({ isOpen: true, type: 'import', payload: value, isLoading: false })
      }
    }
  }

  const handleUpdateRates = async () => {
    setIsUpdatingRates(true)
    try {
      const result = await updateExchangeRates()
      if (result.success && result.rates) {
        updateSettings({
          ...settings,
          currency: {
            ...settings.currency,
            exchangeRates: result.rates as unknown as Record<string, number>,
            lastUpdated: new Date().toISOString(),
          },
        })
        toast.success(result.source === 'api' ? 'Exchange rates updated!' : 'Using fallback rates (API unavailable)')
      } else {
        toast.error(`Failed to update rates: ${result.error}`)
      }
    } catch {
      toast.error('Error updating exchange rates')
    }
    setIsUpdatingRates(false)
  }

  const handleExportData = () => {
    const allData = {
      exportedAt: new Date().toISOString(),
      app: 'UniRoute DE',
      version: '2.0.0',
      settings,
      tasks:        JSON.parse(localStorage.getItem('tasks')        || '[]'),
      universities: JSON.parse(localStorage.getItem('universities') || '[]'),
      exams:        JSON.parse(localStorage.getItem('exams')        || '[]'),
      scholarships: JSON.parse(localStorage.getItem('scholarships') || '[]'),
      financeItems: JSON.parse(localStorage.getItem('financeItems') || '[]'),
      notes:        JSON.parse(localStorage.getItem('notes')        || '[]'),
      housing:      JSON.parse(localStorage.getItem('housing')      || '[]'),
      visaSteps:    JSON.parse(localStorage.getItem('visaSteps')   || '[]'),
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'uniroute-de-data.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('All data exported successfully')
  }

  const handleClearData = () => {
    setConfirmState({ isOpen: true, type: 'clear', payload: null, isLoading: false })
  }

  const handleConfirmAction = async () => {
    const { type, payload } = confirmState
    if (!type) return

    setConfirmState(prev => ({ ...prev, isLoading: true }))

    if (type === 'import' && payload) {
      const config = countriesConfig[payload]
      if (config) {
        const newTasks = config.stages.map((stage: any, idx: number) => ({
          title: stage.title,
          description: `${stage.phase}: ${stage.description}`,
          category: 'Preparation',
          priority: 'Medium' as const,
          status: 'To Do' as const,
          dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + idx + 1, 1),
        }))
        if (user) {
          try {
            await Promise.all(newTasks.map((t: any) => dbTasks.add(user.uid, t)))
            toast.success(`Milestones imported for ${payload}!`)
          } catch {
            toast.error('Failed to import milestones')
          }
        } else {
          const existing = JSON.parse(localStorage.getItem('tasks') || '[]')
          const withIds = newTasks.map((t: any) => ({ ...t, id: Date.now().toString() + Math.random() }))
          localStorage.setItem('tasks', JSON.stringify([...existing, ...withIds]))
          toast.success(`Milestones imported for ${payload}!`)
        }
      }
    } else if (type === 'clear') {
      localStorage.clear()
      toast.success('All local data cleared')
      setTimeout(() => window.location.reload(), 800)
    }

    setConfirmState({ isOpen: false, type: null, payload: null, isLoading: false })
  }

  // ─── Tab content renderers ────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="input-group">
          <label className="input-label" htmlFor="s-name">Full Name</label>
          <input id="s-name" type="text" value={settings.personalDetails.name}
            onChange={e => handlePersonalChange('name', e.target.value)}
            placeholder="Your full name" className="input-field" />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="s-email">Email</label>
          <input id="s-email" type="email" value={settings.personalDetails.email}
            onChange={e => handlePersonalChange('email', e.target.value)}
            placeholder="you@example.com" className="input-field" />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="s-country">Target Country</label>
          <select id="s-country" value={settings.personalDetails.targetCountry}
            onChange={e => handlePersonalChange('targetCountry', e.target.value)}
            className="input-field">
            <option value="Germany">🇩🇪 Germany</option>
            <option value="Canada">🇨🇦 Canada</option>
            <option value="Netherlands">🇳🇱 Netherlands</option>
            <option value="Switzerland">🇨🇭 Switzerland</option>
            <option value="Austria">🇦🇹 Austria</option>
            <option value="UK">🇬🇧 United Kingdom</option>
            <option value="Australia">🇦🇺 Australia</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="s-date">Target Start Date</label>
          <input id="s-date" type="date" value={settings.personalDetails.targetStartDate}
            onChange={e => handlePersonalChange('targetStartDate', e.target.value)}
            className="input-field" />
        </div>
      </div>
      {user && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
          <p className="text-sm font-medium text-foreground">Signed in as</p>
          <p className="text-sm text-muted-foreground mt-0.5">{user.displayName || user.email}</p>
        </div>
      )}
    </div>
  )

  const renderAppearance = () => (
    <div className="space-y-6">
      {/* Theme */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Theme</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'light',  label: 'Light',  icon: Sun },
            { value: 'dark',   label: 'Dark',   icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button key={value}
              onClick={() => updateSettings({ ...settings, theme: value as any })}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                settings.theme === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Color Scheme</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {COLOR_SCHEMES.map(scheme => (
            <button key={scheme.key}
              onClick={() => {
                set('appearance', 'colorScheme', scheme.key)
                applyColorScheme(scheme.key)
              }}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all',
                settings.appearance.colorScheme === scheme.key
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/30 hover:bg-muted/30'
              )}>
              <span className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: scheme.dot }} />
              <span className="text-xs text-muted-foreground">{scheme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="input-group">
        <label className="input-label" htmlFor="s-fontsize">Font Size</label>
        <select id="s-fontsize" value={settings.appearance.fontSize}
          onChange={e => set('appearance', 'fontSize', e.target.value)}
          className="input-field max-w-xs">
          <option value="small">Small</option>
          <option value="medium">Medium (Default)</option>
          <option value="large">Large</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="space-y-0 divide-y divide-border">
        {[
          { key: 'compactMode',    label: 'Compact Mode',    desc: 'Reduce spacing and padding throughout the app' },
          { key: 'showAnimations', label: 'Animations',      desc: 'Enable smooth transitions and micro-animations' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="setting-row">
            <div>
              <p className="setting-label">{label}</p>
              <p className="setting-description">{desc}</p>
            </div>
            <Toggle
              checked={(settings.appearance as any)[key]}
              onChange={() => set('appearance', key, !(settings.appearance as any)[key])}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="space-y-0 divide-y divide-border">
        {[
          { key: 'showProgressBars',     label: 'Progress Bars',       desc: 'Show preparation progress indicators' },
          { key: 'showRecentTasks',      label: 'Recent Tasks',        desc: 'Display the recent task list on dashboard' },
          { key: 'showFinancialOverview',label: 'Financial Overview',  desc: 'Show budget summary on dashboard' },
          { key: 'showQuickActions',     label: 'Quick Actions',       desc: 'Display shortcut buttons for common actions' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="setting-row">
            <div>
              <p className="setting-label">{label}</p>
              <p className="setting-description">{desc}</p>
            </div>
            <Toggle
              checked={(settings.dashboard as any)[key]}
              onChange={() => set('dashboard', key, !(settings.dashboard as any)[key])}
            />
          </div>
        ))}
      </div>
      <div className="input-group">
        <label className="input-label" htmlFor="s-taskcount">Tasks shown on Dashboard</label>
        <input id="s-taskcount" type="number" min="1" max="20"
          value={settings.dashboard.tasksToShow}
          onChange={e => set('dashboard', 'tasksToShow', parseInt(e.target.value) || 5)}
          className="input-field max-w-xs" />
      </div>
    </div>
  )

  const renderCurrency = () => (
    <div className="space-y-5">
      <div className="input-group max-w-xs">
        <label className="input-label" htmlFor="s-currency">Primary Currency</label>
        <select id="s-currency" value={settings.currency.primary}
          onChange={e => set('currency', 'primary', e.target.value)}
          className="input-field">
          <option value="EUR">Euro (EUR €)</option>
          <option value="USD">US Dollar (USD $)</option>
          <option value="INR">Indian Rupee (INR ₹)</option>
        </select>
      </div>

      <div className="space-y-0 divide-y divide-border">
        <div className="setting-row">
          <div>
            <p className="setting-label">Display Currency Symbol</p>
            <p className="setting-description">Show € $ ₹ symbols in financial displays</p>
          </div>
          <Toggle checked={settings.currency.displaySymbol}
            onChange={() => set('currency', 'displaySymbol', !settings.currency.displaySymbol)} />
        </div>
        <div className="setting-row">
          <div>
            <p className="setting-label">Auto-update Exchange Rates</p>
            <p className="setting-description">Automatically fetch latest rates on startup</p>
          </div>
          <Toggle checked={settings.currency.autoUpdate ?? false}
            onChange={() => set('currency', 'autoUpdate', !(settings.currency.autoUpdate ?? false))} />
        </div>
      </div>

      {/* Rate update */}
      <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Exchange Rates</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last updated: {settings.currency.lastUpdated
              ? new Date(settings.currency.lastUpdated).toLocaleString()
              : 'Never'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleUpdateRates} disabled={isUpdatingRates}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', isUpdatingRates && 'animate-spin')} />
          {isUpdatingRates ? 'Updating…' : 'Update Now'}
        </Button>
      </div>

      {/* Rate display */}
      <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current Rates</p>
        {[
          { label: '1 EUR → USD', value: formatExchangeRate(settings.currency.exchangeRates?.USD || 1.1) },
          { label: '1 EUR → INR', value: formatExchangeRate(settings.currency.exchangeRates?.INR || 90, 2) },
          { label: '1 USD → EUR', value: formatExchangeRate(1 / (settings.currency.exchangeRates?.USD || 1.1)) },
          { label: '1 USD → INR', value: formatExchangeRate((settings.currency.exchangeRates?.INR || 90) / (settings.currency.exchangeRates?.USD || 1.1), 2) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* Manual override */}
      <details className="border border-border rounded-xl group">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-foreground hover:bg-muted/30 rounded-xl flex items-center justify-between list-none">
          Manual Rate Override (Advanced)
          <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
        </summary>
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
          <p className="text-xs text-muted-foreground">These will be overwritten when auto-update is enabled.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: '1 EUR = ? USD', key: 'USD', def: 1.1 },
              { label: '1 EUR = ? INR', key: 'INR', def: 90 },
            ].map(({ label, key, def }) => (
              <div key={key} className="input-group">
                <label className="input-label">{label}</label>
                <input type="number" step="0.0001"
                  value={settings.currency.exchangeRates?.[key] ?? def}
                  onChange={e => set('currency', 'exchangeRates', {
                    ...settings.currency.exchangeRates,
                    [key]: parseFloat(e.target.value) || def,
                  })}
                  className="input-field" />
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  )

  const renderTasks = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="input-group">
          <label className="input-label" htmlFor="s-taskpriority">Default Priority</label>
          <select id="s-taskpriority" value={settings.tasks.defaultPriority}
            onChange={e => set('tasks', 'defaultPriority', e.target.value)}
            className="input-field">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="s-taskcategory">Default Category</label>
          <input id="s-taskcategory" type="text" value={settings.tasks.defaultCategory}
            onChange={e => set('tasks', 'defaultCategory', e.target.value)}
            placeholder="e.g. General" className="input-field" />
        </div>
        <div className="input-group">
          <label className="input-label" htmlFor="s-tasksort">Sort Tasks By</label>
          <select id="s-tasksort" value={settings.tasks.sortBy}
            onChange={e => set('tasks', 'sortBy', e.target.value)}
            className="input-field">
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
            <option value="created">Created Date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>
      <div className="space-y-0 divide-y divide-border">
        {[
          { key: 'showCompletedTasks', label: 'Show Completed Tasks', desc: 'Display completed tasks in the task list' },
          { key: 'autoArchiveCompleted', label: 'Auto-archive Completed', desc: 'Automatically archive tasks when completed' },
          { key: 'groupByCategory', label: 'Group by Category', desc: 'Group tasks by their assigned category' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="setting-row">
            <div>
              <p className="setting-label">{label}</p>
              <p className="setting-description">{desc}</p>
            </div>
            <Toggle
              checked={(settings.tasks as any)[key]}
              onChange={() => set('tasks', key, !(settings.tasks as any)[key])}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
        <p className="text-xs text-warning font-medium">🚧 Push & email notifications are coming in a future update. These settings are saved but not yet active.</p>
      </div>
      <div className="space-y-0 divide-y divide-border">
        {[
          { key: 'deadlineReminders', label: 'Deadline Reminders',  desc: 'Get notified about upcoming deadlines (coming soon)' },
          { key: 'taskUpdates',       label: 'Task Updates',        desc: 'Notifications when tasks are updated (coming soon)' },
          { key: 'emailNotifications',label: 'Email Notifications', desc: 'Receive important updates via email (coming soon)' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="setting-row">
            <div>
              <p className="setting-label">{label}</p>
              <p className="setting-description">{desc}</p>
            </div>
            <Toggle
              checked={(settings.notifications as any)[key]}
              onChange={() => set('notifications', key, !(settings.notifications as any)[key])}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const renderData = () => (
    <div className="space-y-4">
      <div className="input-group max-w-xs">
        <label className="input-label" htmlFor="s-exportformat">Export Format</label>
        <select id="s-exportformat" value={settings.data.exportFormat}
          onChange={e => set('data', 'exportFormat', e.target.value)}
          className="input-field">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      </div>
      <div className="space-y-0 divide-y divide-border">
        <div className="setting-row">
          <div>
            <p className="setting-label">Auto Save</p>
            <p className="setting-description">Automatically save changes as you make them</p>
          </div>
          <Toggle checked={settings.data.autoSave}
            onChange={() => set('data', 'autoSave', !settings.data.autoSave)} />
        </div>
        <div className="setting-row">
          <div>
            <p className="setting-label">Cloud Sync</p>
            <p className="setting-description">Sync data across devices via Firestore {!user && '(requires sign in)'}</p>
          </div>
          <Toggle checked={settings.data.syncEnabled && !!user}
            onChange={() => set('data', 'syncEnabled', !settings.data.syncEnabled)} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <Button variant="outline" onClick={handleExportData} className="justify-center">
          <Download className="h-4 w-4 mr-2" /> Export Data
        </Button>
        <Button
          variant="outline"
          onClick={() => { setResetConfirmInput(''); setIsResetModalOpen(true); }}
          className="justify-center text-danger border-danger/40 hover:bg-danger/10 font-medium"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Reset All App Data
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        ⚠️ Clearing data only removes locally cached data. Cloud data is preserved if you are signed in.
      </p>
    </div>
  )

  const renderAbout = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-xl">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
          <Globe2 className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground text-lg">UniRoute DE</p>
          <p className="text-muted-foreground text-sm">Version 1.0.0 · Updated for International Students</p>
        </div>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>A comprehensive study abroad planning dashboard, focused on Germany but extensible to any country.</p>
        <p className="pt-2">Built with <strong className="text-foreground">Next.js 15</strong> · <strong className="text-foreground">TypeScript</strong> · <strong className="text-foreground">Tailwind CSS</strong> · <strong className="text-foreground">Firebase</strong></p>
        <div className="pt-3 grid grid-cols-2 gap-2">
          {[
          { label: 'Framework', value: 'Next.js 15' },
            { label: 'Database', value: 'Cloud Firestore' },
            { label: 'Auth', value: 'Firebase Auth' },
            { label: 'Hosting', value: 'Vercel' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5 p-3 bg-muted/40 rounded-lg">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    const TAB_CONTENT: Record<TabKey, React.ReactNode> = {
      profile:       renderProfile(),
      appearance:    renderAppearance(),
      dashboard:     renderDashboard(),
      currency:      renderCurrency(),
      tasks:         renderTasks(),
      notifications: renderNotifications(),
      data:          renderData(),
      about:         renderAbout(),
    }
    return TAB_CONTENT[activeTab]
  }

  const activeTabMeta = TABS.find(t => t.key === activeTab)!

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your preferences, appearance, and data</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Sidebar ───────────────────────────────────── */}
          <aside className="lg:w-52 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    'focus-visible:outline-2 focus-visible:outline-primary',
                    activeTab === key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Content ──────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 border-b border-border pb-4">
                <activeTabMeta.icon className="h-4 w-4 text-primary" />
                <CardTitle>{activeTabMeta.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {renderTabContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, type: null, payload: null, isLoading: false })}
        onConfirm={handleConfirmAction}
        title={confirmState.type === 'import' ? 'Import Milestones?' : 'Clear All Data?'}
        message={
          confirmState.type === 'import'
            ? `Import official preparation milestones for ${confirmState.payload} into your tasks?`
            : 'This will permanently delete all local data. Continue?'
        }
        confirmLabel={confirmState.type === 'import' ? 'Import' : 'Clear Data'}
        variant={confirmState.type === 'import' ? 'warning' : 'danger'}
        isLoading={confirmState.isLoading}
      />

      {/* GitHub-style Reset App Data Modal */}
      <Modal 
        isOpen={isResetModalOpen} 
        onClose={() => { if (!isResetting) { setIsResetModalOpen(false); setResetConfirmInput(''); } }}
        title="Reset All App Data"
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              <strong>Warning:</strong> This action is destructive and cannot be undone. This will permanently reset all your university applications, tasks, notes, budget items, and custom settings.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              To confirm, type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-danger font-bold">RESET</span> in the box below:
            </label>
            <input
              type="text"
              value={resetConfirmInput}
              onChange={e => setResetConfirmInput(e.target.value)}
              placeholder="Type RESET here"
              className="input-field font-mono text-sm uppercase tracking-wider"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => { setIsResetModalOpen(false); setResetConfirmInput(''); }}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-danger hover:bg-danger/90 text-white border-danger disabled:opacity-40"
              onClick={handleExecuteReset}
              disabled={resetConfirmInput.trim() !== 'RESET' || isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset Everything'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}