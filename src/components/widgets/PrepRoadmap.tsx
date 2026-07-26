'use client'

import { useMemo } from 'react'
import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react'
import { Task } from '@/types'
import { cn } from '@/lib/utils'

interface Phase {
  id: string
  title: string
  emoji: string
  description: string
  keywords: string[]   // keywords to match against task titles
  href: string
}

const GERMANY_PHASES: Phase[] = [
  {
    id: 'research',
    title: 'Research',
    emoji: '🔍',
    description: 'Shortlist universities, programs, and requirements',
    keywords: ['research', 'shortlist', 'university', 'course', 'program'],
    href: '/universities',
  },
  {
    id: 'tests',
    title: 'Test Prep',
    emoji: '📝',
    description: 'Language and aptitude tests (IELTS, TestDaF, GRE)',
    keywords: ['test', 'exam', 'ielts', 'toefl', 'gre', 'testdaf', 'dsh', 'language'],
    href: '/exams',
  },
  {
    id: 'documents',
    title: 'Documents',
    emoji: '📄',
    description: 'SOP, LOR, transcripts, APS certificate',
    keywords: ['sop', 'lor', 'letter', 'transcript', 'aps', 'document', 'cv', 'resume'],
    href: '/tasks',
  },
  {
    id: 'apply',
    title: 'Applications',
    emoji: '🎓',
    description: 'Submit university applications via uni-assist or direct',
    keywords: ['apply', 'application', 'submit', 'uni-assist', 'portal'],
    href: '/universities',
  },
  {
    id: 'visa',
    title: 'Visa',
    emoji: '🛂',
    description: 'Blocked account, visa appointment, insurance',
    keywords: ['visa', 'embassy', 'sperrkonto', 'blocked', 'insurance', 'appointment'],
    href: '/visa',
  },
  {
    id: 'departure',
    title: 'Pre-Departure',
    emoji: '✈️',
    description: 'Flights, housing, Anmeldung, enrollment',
    keywords: ['flight', 'housing', 'accommodation', 'anmeldung', 'enrollment', 'arrival', 'book'],
    href: '/tasks',
  },
]

interface PrepRoadmapProps {
  tasks: Task[]
}

export function PrepRoadmap({ tasks }: PrepRoadmapProps) {
  const phases = useMemo(() => {
    return GERMANY_PHASES.map(phase => {
      const related = tasks.filter(t =>
        phase.keywords.some(kw =>
          t.title.toLowerCase().includes(kw) ||
          (t.description?.toLowerCase().includes(kw) ?? false) ||
          t.category.toLowerCase().includes(kw)
        )
      )
      const completed = related.filter(t => t.status === 'Completed').length
      const inProgress = related.filter(t => t.status === 'In Progress').length
      const total = related.length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0
      const status: 'done' | 'active' | 'pending' =
        pct === 100 && total > 0 ? 'done' : (completed > 0 || inProgress > 0) ? 'active' : 'pending'

      return { ...phase, completed, inProgress, total, pct, status }
    })
  }, [tasks])

  return (
    <div className="space-y-2">
      {phases.map((phase, idx) => {
        const isLast = idx === phases.length - 1
        return (
          <div key={phase.id}>
            <div className={cn(
              'flex items-center gap-3 p-3 rounded-xl border transition-all group',
              phase.status === 'done'   ? 'bg-success/8 border-success/20' :
              phase.status === 'active' ? 'bg-primary/8 border-primary/20' :
                                         'bg-muted/30 border-border'
            )}>
              {/* Status icon */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0',
                phase.status === 'done'   ? 'bg-success/15' :
                phase.status === 'active' ? 'bg-primary/15' :
                                            'bg-muted'
              )}>
                {phase.status === 'done'
                  ? <CheckCircle className="h-4 w-4 text-success" />
                  : phase.status === 'active'
                    ? <Clock className="h-4 w-4 text-primary" />
                    : <Circle className="h-4 w-4 text-muted-foreground" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{phase.emoji}</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    phase.status === 'done'   ? 'text-success' :
                    phase.status === 'active' ? 'text-foreground' :
                                               'text-muted-foreground'
                  )}>
                    {phase.title}
                  </span>
                  {phase.status === 'active' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                      {phase.inProgress > 0 ? `${phase.inProgress} In Progress` : 'Active'}
                    </span>
                  )}
                </div>
                {phase.total > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          phase.status === 'done' ? 'bg-success' : 'bg-primary'
                        )}
                        style={{ width: `${Math.max(phase.pct, phase.inProgress > 0 ? 35 : 0)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      {phase.completed}/{phase.total} done
                    </span>
                  </div>
                )}
                {phase.total === 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                )}
              </div>

              {/* Arrow */}
              <a href={phase.href} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>

            {/* Connector */}
            {!isLast && (
              <div className="ml-4 w-px h-2 bg-border" />
            )}
          </div>
        )
      })}
    </div>
  )
}
