'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { SavingsForm } from '@/components/forms/SavingsForm'
import { CurrencyToggle } from '@/components/ui/CurrencyToggle'
import { ClientCurrency } from '@/components/ui/ClientCurrency'
import { BlockedAccountTracker } from '@/components/finance/BlockedAccountTracker'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useIsClient } from '@/hooks/useIsClient'
import { mockFinanceItems, mockSavingsGoals } from '@/data/mockData'
import { FinanceItem, SavingsGoal } from '@/types'
import { dbFinance, dbSavingsGoals } from '@/lib/db'
import { convertCurrency, formatDate } from '@/lib/utils'
import { Plus, DollarSign, TrendingUp, TrendingDown, CheckCircle, Edit2, Trash2, ArrowLeftRight, Target } from 'lucide-react'

export default function FinancePage() {
  const isClient = useIsClient()
  const { settings, updateSettings } = useTheme()
  const { user } = useAuth()
  const toast = useToast()

  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([])
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)

  // Confirm Dialog State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    type: 'expense' | 'savings' | null
    id: string | null
    isDeleting: boolean
  }>({ isOpen: false, type: null, id: null, isDeleting: false })

  // Currency converter state
  const [convAmount, setConvAmount] = useState('')
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'EUR' | 'INR'>('EUR')
  const [toCurrency, setToCurrency] = useState<'USD' | 'EUR' | 'INR'>('USD')

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FinanceItem | undefined>()

  // Savings modal state
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false)
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | undefined>()

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadFinances = useCallback(async () => {
    setLoading(true)
    if (user) {
      try {
        const [cloudFinance, cloudSavings] = await Promise.all([
          dbFinance.fetch(user.uid),
          dbSavingsGoals.fetch(user.uid),
        ])
        setFinanceItems(cloudFinance)
        setSavingsGoals(cloudSavings)
      } catch {
        toast.error('Failed to load finance data')
      }
    } else {
      try {
        const savedItems = localStorage.getItem('financeItems')
        const savedSavings = localStorage.getItem('savingsGoals')
        setFinanceItems(savedItems ? JSON.parse(savedItems) : mockFinanceItems)
        setSavingsGoals(savedSavings
          ? JSON.parse(savedSavings).map((g: any) => ({
              ...g,
              deadline: g.deadline ? new Date(g.deadline) : undefined,
              createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
            }))
          : mockSavingsGoals)
      } catch {
        setFinanceItems(mockFinanceItems)
        setSavingsGoals(mockSavingsGoals)
      }
    }
    setLoading(false)
  }, [user, toast])

  useEffect(() => {
    loadFinances()
    const handleDataUpdate = () => loadFinances()
    window.addEventListener('app-data-updated', handleDataUpdate)
    return () => window.removeEventListener('app-data-updated', handleDataUpdate)
  }, [loadFinances])

  // Persist locally for guests
  useEffect(() => {
    if (!loading && !user && isClient) {
      localStorage.setItem('financeItems', JSON.stringify(financeItems))
      localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals))
    }
  }, [financeItems, savingsGoals, loading, user, isClient])

  // ─── Derived stats ────────────────────────────────────────────────────────
  // Bug #3 fix: convertAmount now takes the item's own currency as source,
  // so USD/INR expenses are converted correctly instead of being treated as EUR.
  const convertAmount = useCallback((amt: number, fromCurrency = 'EUR') =>
    convertCurrency(amt, fromCurrency, settings.currency.primary, settings.currency.exchangeRates),
    [settings.currency])

  const { totalEstimated, totalPaid, totalRemaining, categoryTotals } = useMemo(() => {
    const totalEstimated = financeItems.reduce((s, i) => s + convertAmount(i.estimatedAmount, i.currency), 0)
    const totalPaid = financeItems.filter(i => i.paid).reduce((s, i) => s + convertAmount(i.actualAmount ?? i.estimatedAmount, i.currency), 0)
    const totalRemaining = totalEstimated - totalPaid

    const categoryTotals: Record<string, { estimated: number; paid: number }> = {}
    financeItems.forEach(item => {
      if (!categoryTotals[item.category]) categoryTotals[item.category] = { estimated: 0, paid: 0 }
      categoryTotals[item.category].estimated += convertAmount(item.estimatedAmount, item.currency)
      if (item.paid) categoryTotals[item.category].paid += convertAmount(item.actualAmount ?? item.estimatedAmount, item.currency)
    })
    return { totalEstimated, totalPaid, totalRemaining, categoryTotals }
  }, [financeItems, convertAmount])

  const { totalSavingsTarget, totalSavingsCurrent } = useMemo(() => ({
    totalSavingsTarget: savingsGoals.reduce((s, g) => s + convertCurrency(g.targetAmount, g.currency as any, settings.currency.primary, settings.currency.exchangeRates), 0),
    totalSavingsCurrent: savingsGoals.reduce((s, g) => s + convertCurrency(g.currentAmount, g.currency as any, settings.currency.primary, settings.currency.exchangeRates), 0),
  }), [savingsGoals, settings.currency])

  const budgetPct = totalEstimated > 0 ? Math.round((totalPaid / totalEstimated) * 100) : 0

  // ─── Expense handlers ─────────────────────────────────────────────────────
  const handleAddExpense = async (data: Omit<FinanceItem, 'id'>) => {
    if (user) {
      try {
        const added = await dbFinance.add(user.uid, data)
        setFinanceItems(prev => [...prev, added])
        toast.success('Expense added successfully')
      } catch {
        toast.error('Failed to add expense')
      }
    } else {
      setFinanceItems(prev => [...prev, { ...data, id: Date.now().toString() }])
      toast.success('Expense added')
    }
    setIsExpenseModalOpen(false)
  }

  const handleUpdateExpense = async (data: Omit<FinanceItem, 'id'>) => {
    if (!editingExpense) return
    const updated: FinanceItem = { ...data, id: editingExpense.id }
    if (user) {
      try {
        await dbFinance.update(user.uid, updated)
        setFinanceItems(prev => prev.map(i => i.id === editingExpense.id ? updated : i))
        toast.success('Expense updated')
      } catch {
        toast.error('Failed to update expense')
      }
    } else {
      setFinanceItems(prev => prev.map(i => i.id === editingExpense.id ? updated : i))
      toast.success('Expense updated')
    }
    setIsExpenseModalOpen(false)
    setEditingExpense(undefined)
  }

  const handleTogglePaid = async (id: string) => {
    const item = financeItems.find(i => i.id === id)
    if (!item) return
    const updated = { ...item, paid: !item.paid }
    if (user) {
      try {
        await dbFinance.update(user.uid, updated)
        setFinanceItems(prev => prev.map(i => i.id === id ? updated : i))
        toast.success(updated.paid ? 'Marked as paid' : 'Marked as unpaid')
      } catch {
        toast.error('Failed to update')
      }
    } else {
      setFinanceItems(prev => prev.map(i => i.id === id ? updated : i))
    }
  }

  const handleDeleteItem = (id: string) => {
    setConfirmState({ isOpen: true, type: 'expense', id, isDeleting: false })
  }

  const handleConfirmDelete = async () => {
    const { type, id } = confirmState
    if (!type || !id) return

    setConfirmState(prev => ({ ...prev, isDeleting: true }))

    if (type === 'expense') {
      if (user) {
        try {
          await dbFinance.delete(user.uid, id)
          setFinanceItems(prev => prev.filter(i => i.id !== id))
          toast.success('Expense deleted')
        } catch {
          toast.error('Failed to delete')
        }
      } else {
        setFinanceItems(prev => prev.filter(i => i.id !== id))
      }
    } else if (type === 'savings') {
      if (user) {
        try {
          await dbSavingsGoals.delete(user.uid, id)
          setSavingsGoals(prev => prev.filter(g => g.id !== id))
          toast.success('Savings goal deleted')
        } catch {
          toast.error('Failed to delete')
        }
      } else {
        setSavingsGoals(prev => prev.filter(g => g.id !== id))
      }
    }

    setConfirmState({ isOpen: false, type: null, id: null, isDeleting: false })
  }

  // ─── Savings handlers ─────────────────────────────────────────────────────
  const handleAddSavingsGoal = async (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    if (user) {
      try {
        const added = await dbSavingsGoals.add(user.uid, data)
        setSavingsGoals(prev => [...prev, added])
        toast.success('Savings goal added')
      } catch {
        toast.error('Failed to add savings goal')
      }
    } else {
      setSavingsGoals(prev => [...prev, { ...data, id: Date.now().toString(), createdAt: new Date() }])
      toast.success('Savings goal added')
    }
    setIsSavingsModalOpen(false)
  }

  const handleUpdateSavingsGoal = async (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    if (!editingSavingsGoal) return
    const updated: SavingsGoal = { ...data, id: editingSavingsGoal.id, createdAt: editingSavingsGoal.createdAt }
    if (user) {
      try {
        await dbSavingsGoals.update(user.uid, updated)
        setSavingsGoals(prev => prev.map(g => g.id === editingSavingsGoal.id ? updated : g))
        toast.success('Savings goal updated')
      } catch {
        toast.error('Failed to update')
      }
    } else {
      setSavingsGoals(prev => prev.map(g => g.id === editingSavingsGoal.id ? updated : g))
      toast.success('Savings goal updated')
    }
    setIsSavingsModalOpen(false)
    setEditingSavingsGoal(undefined)
  }

  const handleDeleteSavingsGoal = (id: string) => {
    setConfirmState({ isOpen: true, type: 'savings', id, isDeleting: false })
  }

  // ─── Category badge colors ────────────────────────────────────────────────
  const getCategoryColor = (cat: FinanceItem['category']) => {
    const map: Record<FinanceItem['category'], string> = {
      Application: 'status-info',
      Travel:      'status-success',
      Tuition:     'bg-primary/10 text-primary border border-primary/20',
      Living:      'status-warning',
      Other:       'status-neutral',
    }
    return map[cat] ?? 'status-neutral'
  }

  // ─── Currency converter ───────────────────────────────────────────────────
  const convertedAmount = useMemo(() => {
    const n = parseFloat(convAmount)
    if (isNaN(n)) return 0
    return convertCurrency(n, fromCurrency, toCurrency, settings.currency.exchangeRates)
  }, [convAmount, fromCurrency, toCurrency, settings.currency.exchangeRates])

  const handleCurrencyChange = (cur: string) => {
    updateSettings({ ...settings, currency: { ...settings.currency, primary: cur } })
  }

  if (!isClient || loading) {
    return <Layout><SkeletonPage /></Layout>
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">

        {/* ── Page header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finance Planner</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Track your study abroad expenses and budget</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CurrencyToggle currentCurrency={settings.currency.primary} onCurrencyChange={handleCurrencyChange} />
            <Button variant="outline" onClick={() => { setEditingExpense(undefined); setIsExpenseModalOpen(true) }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Expense
            </Button>
            <Button onClick={() => { setEditingSavingsGoal(undefined); setIsSavingsModalOpen(true) }}>
              <Target className="h-4 w-4 mr-1.5" /> Add Goal
            </Button>
          </div>
        </div>

        <BlockedAccountTracker 
          savingsGoals={savingsGoals} 
        />

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Estimated', value: totalEstimated, color: 'text-info',    icon: DollarSign,    bg: 'bg-info/10' },
            { label: 'Total Paid',      value: totalPaid,      color: 'text-success', icon: CheckCircle,   bg: 'bg-success/10' },
            { label: 'Remaining',       value: totalRemaining, color: 'text-danger',  icon: TrendingDown,  bg: 'bg-danger/10' },
          ].map(({ label, value, color, icon: Icon, bg }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>
                    <ClientCurrency amount={value} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget Used</p>
                <p className="text-xl font-bold mt-1 text-primary">{budgetPct}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Budget progress ─────────────────────────────────── */}
        <Card>
          <CardHeader><CardTitle>Budget Progress</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <ProgressBar value={totalPaid} max={totalEstimated} label="Overall Budget Usage" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {Object.entries(categoryTotals).map(([cat, totals]) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-foreground">{cat}</span>
                    <span className="text-muted-foreground text-xs">
                      <ClientCurrency amount={totals.paid} currency={settings.currency.primary} showSymbol /> /&nbsp;
                      <ClientCurrency amount={totals.estimated} currency={settings.currency.primary} showSymbol />
                    </span>
                  </div>
                  <ProgressBar value={totals.paid} max={totals.estimated} showPercentage={false} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Expense table ───────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expense Breakdown</CardTitle>
            <span className="text-xs text-muted-foreground">{financeItems.length} items</span>
          </CardHeader>
          <CardContent>
            {financeItems.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">No expenses yet</p>
                <p className="text-muted-foreground text-sm mb-4">Add your first expense to start tracking</p>
                <Button onClick={() => setIsExpenseModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Description', 'Category', 'Estimated', 'Actual', 'Status', 'Actions'].map(h => (
                        <th key={h} className={`py-3 px-4 ${h === 'Description' ? 'text-left' : h === 'Actions' || h === 'Status' ? 'text-center' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financeItems.map(item => (
                      <tr key={item.id} className="group">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{item.description}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getCategoryColor(item.category)}>{item.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          <ClientCurrency amount={convertAmount(item.estimatedAmount)} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-muted-foreground">
                          {item.actualAmount
                            ? <ClientCurrency amount={convertAmount(item.actualAmount)} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                            : <span className="text-muted-foreground/50">–</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={item.paid ? 'success' : 'warning'}>{item.paid ? 'Paid' : 'Pending'}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center items-center gap-1">
                            <button
                              onClick={() => handleTogglePaid(item.id)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${item.paid ? 'text-warning hover:bg-warning/10' : 'text-success hover:bg-success/10'}`}
                            >
                              {item.paid ? 'Unpaid' : 'Mark Paid'}
                            </button>
                            <button
                              onClick={() => { setEditingExpense(item); setIsExpenseModalOpen(true) }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-info hover:bg-info/10 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Currency Converter ──────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Currency Converter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="input-group">
                <label className="input-label">Amount</label>
                <input type="number" value={convAmount} onChange={e => setConvAmount(e.target.value)} placeholder="0.00" className="input-field" />
              </div>
              <div className="input-group">
                <label className="input-label">From</label>
                <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value as any)} className="input-field">
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="INR">INR ₹</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">To</label>
                <select value={toCurrency} onChange={e => setToCurrency(e.target.value as any)} className="input-field">
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                  <option value="INR">INR ₹</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-muted/40 rounded-xl border border-border text-center">
              <p className="text-lg font-semibold text-foreground">
                <ClientCurrency amount={convertedAmount} currency={toCurrency} showSymbol />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                1 EUR ≈ {(settings.currency.exchangeRates?.USD || 1.1).toFixed(2)} USD · {(settings.currency.exchangeRates?.INR || 90).toFixed(0)} INR (indicative)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Savings Goals ───────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Savings Goals</CardTitle>
            <Button size="sm" variant="outline" onClick={() => { setEditingSavingsGoal(undefined); setIsSavingsModalOpen(true) }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Goal
            </Button>
          </CardHeader>
          <CardContent>
            {savingsGoals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium mb-1">No savings goals yet</p>
                <p className="text-muted-foreground text-sm mb-4">Set a target to track your savings progress</p>
                <Button onClick={() => setIsSavingsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Savings Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-info/10 border border-info/20 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Target</p>
                    <p className="text-xl font-bold text-info">
                      <ClientCurrency amount={totalSavingsTarget} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                    </p>
                  </div>
                  <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
                    <p className="text-xl font-bold text-success">
                      <ClientCurrency amount={totalSavingsCurrent} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                    </p>
                  </div>
                </div>

                {/* Goal cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savingsGoals.map(goal => {
                    const progress = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0
                    const convertedTarget = convertCurrency(goal.targetAmount, goal.currency as any, settings.currency.primary, settings.currency.exchangeRates)
                    const convertedCurrent = convertCurrency(goal.currentAmount, goal.currency as any, settings.currency.primary, settings.currency.exchangeRates)
                    return (
                      <div key={goal.id} className="border border-border rounded-xl p-4 bg-card/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">{goal.title}</h4>
                            {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                            {goal.deadline && (
                              <p className="text-xs text-muted-foreground mt-0.5">Due: {formatDate(goal.deadline)}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingSavingsGoal(goal); setIsSavingsModalOpen(true) }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-info hover:bg-info/10 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSavingsGoal(goal.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <ProgressBar value={progress} variant={progress >= 100 ? 'success' : 'default'} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              <ClientCurrency amount={convertedCurrent} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} /> saved
                            </span>
                            <span className="font-medium">
                              <ClientCurrency amount={convertedTarget} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} /> goal
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Expense Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setEditingExpense(undefined) }}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="md"
      >
        <ExpenseForm
          expense={editingExpense}
          onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
          onCancel={() => { setIsExpenseModalOpen(false); setEditingExpense(undefined) }}
        />
      </Modal>

      {/* ── Savings Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={isSavingsModalOpen}
        onClose={() => { setIsSavingsModalOpen(false); setEditingSavingsGoal(undefined) }}
        title={editingSavingsGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}
        size="md"
      >
        <SavingsForm
          savingsGoal={editingSavingsGoal}
          onSubmit={editingSavingsGoal ? handleUpdateSavingsGoal : handleAddSavingsGoal}
          onCancel={() => { setIsSavingsModalOpen(false); setEditingSavingsGoal(undefined) }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, type: null, id: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title={confirmState.type === 'expense' ? 'Delete Expense?' : 'Delete Savings Goal?'}
        message={`This will permanently delete this ${confirmState.type === 'expense' ? 'expense' : 'savings goal'}. This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={confirmState.isDeleting}
      />
    </Layout>
  )
}