'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FinanceItem } from '@/types'

import { useTheme } from '@/contexts/ThemeContext'

interface ExpenseFormProps {
  expense?: FinanceItem
  onSubmit: (data: Omit<FinanceItem, 'id'>) => void
  onCancel: () => void
}

const CATEGORIES: FinanceItem['category'][] = ['Application', 'Travel', 'Tuition', 'Living', 'Other']

export function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const { settings } = useTheme()
  const [description, setDescription] = useState(expense?.description ?? '')
  const [estimatedAmount, setEstimatedAmount] = useState(expense?.estimatedAmount?.toString() ?? '')
  const [actualAmount, setActualAmount] = useState(expense?.actualAmount?.toString() ?? '')
  const [category, setCategory] = useState<FinanceItem['category']>(expense?.category ?? 'Other')
  const [currency, setCurrency] = useState(expense?.currency ?? settings.currency.primary ?? 'EUR')
  const [paid, setPaid] = useState(expense?.paid ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!description.trim()) errs.description = 'Description is required'
    if (!estimatedAmount || isNaN(parseFloat(estimatedAmount)) || parseFloat(estimatedAmount) <= 0)
      errs.estimatedAmount = 'Enter a valid amount greater than 0'
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    onSubmit({
      description: description.trim(),
      estimatedAmount: parseFloat(estimatedAmount),
      actualAmount: actualAmount ? parseFloat(actualAmount) : undefined,
      category,
      currency,
      paid,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Description */}
      <div className="input-group">
        <label className="input-label">Description <span className="text-danger">*</span></label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. University Application Fee"
          className="input-field"
        />
        {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
      </div>

      {/* Category & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="input-group">
          <label className="input-label">Category <span className="text-danger">*</span></label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as FinanceItem['category'])}
            className="input-field"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-field">
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="INR">INR ₹</option>
          </select>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="input-group">
          <label className="input-label">Estimated Amount <span className="text-danger">*</span></label>
          <input
            type="number"
            value={estimatedAmount}
            onChange={e => setEstimatedAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="input-field"
          />
          {errors.estimatedAmount && <p className="text-xs text-danger">{errors.estimatedAmount}</p>}
        </div>
        <div className="input-group">
          <label className="input-label">Actual Amount <span className="text-muted-foreground">(optional)</span></label>
          <input
            type="number"
            value={actualAmount}
            onChange={e => setActualAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="input-field"
          />
        </div>
      </div>

      {/* Paid toggle */}
      <div className="setting-row">
        <div>
          <p className="setting-label">Mark as Paid</p>
          <p className="setting-description">Toggle if this expense has already been paid</p>
        </div>
        <button
          type="button"
          className="toggle"
          data-checked={paid ? 'true' : 'false'}
          onClick={() => setPaid(!paid)}
          aria-pressed={paid}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {expense ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}
