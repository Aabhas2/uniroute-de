'use client'

import { useMemo } from 'react'
import { Calendar, AlertTriangle, BookOpen, GraduationCap, FileText, CheckSquare } from 'lucide-react'
import { Task, University as UniType, Exam, VisaStep, Scholarship } from '@/types'
import { cn } from '@/lib/utils'

interface DeadlineItem {
  id: string
  title: string
  date: Date
  type: 'task' | 'university' | 'exam' | 'visa' | 'scholarship'
  status?: string
}

interface DeadlineTimelineProps {
  tasks: Task[]
  universities: UniType[]
  exams: Exam[]
  visaSteps: VisaStep[]
  scholarships: Scholarship[]
  limit?: number
}

const typeConfig = {
  task: { label: 'Task', icon: CheckSquare, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
  university: { label: 'University', icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  exam: { label: 'Exam', icon: BookOpen, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
  visa: { label: 'Visa', icon: FileText, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  scholarship: { label: 'Scholarship', icon: Calendar, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function DeadlineTimeline({ tasks, universities, exams, visaSteps, scholarships, limit = 8 }: DeadlineTimelineProps) {
  const items = useMemo<DeadlineItem[]>(() => {
    const all: DeadlineItem[] = []
    const now = new Date()

    tasks.filter(t => t.dueDate && t.status !== 'Completed').forEach(t => {
      all.push({ id: t.id, title: t.title, date: new Date(t.dueDate!), type: 'task', status: t.status })
    })
    universities.filter(u => u.applicationDeadline && u.status !== 'Rejected').forEach(u => {
      all.push({ id: u.id, title: `${u.name} Application`, date: new Date(u.applicationDeadline), type: 'university', status: u.status })
    })
    exams.filter(e => e.plannedDate && e.status !== 'Completed').forEach(e => {
      all.push({ id: e.id, title: `${e.name} Exam`, date: new Date(e.plannedDate!), type: 'exam', status: e.status })
    })
    visaSteps.filter(v => v.dueDate && v.status !== 'Completed').forEach(v => {
      all.push({ id: v.id, title: v.title, date: new Date(v.dueDate!), type: 'visa', status: v.status })
    })
    scholarships.filter(s => s.deadline && s.status !== 'Rejected').forEach(s => {
      all.push({ id: s.id, title: `${s.name} Deadline`, date: new Date(s.deadline), type: 'scholarship', status: s.status })
    })

    return all
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, limit)
  }, [tasks, universities, exams, visaSteps, scholarships, limit])

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No upcoming deadlines</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map(item => {
        const cfg = typeConfig[item.type]
        const Icon = cfg.icon
        const days = daysUntil(item.date)
        const isOverdue = days < 0
        const isUrgent = days <= 14

        return (
          <div
            key={`${item.type}-${item.id}`}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-colors',
              isOverdue ? 'bg-danger/10 border-danger/30' : isUrgent ? 'bg-danger/5 border-danger/20' : `${cfg.bg} ${cfg.border}`
            )}
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
              {isOverdue || isUrgent
                ? <AlertTriangle className="h-4 w-4 text-danger" />
                : <Icon className={cn('h-4 w-4', cfg.color)} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {cfg.label} · {item.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                isOverdue ? 'bg-danger/20 text-danger font-bold' : isUrgent ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
              )}>
                {isOverdue ? 'Overdue' : days === 0 ? 'Today' : `${days}d`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
