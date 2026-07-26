'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Modal } from '@/components/ui/Modal'
import { SkeletonPage } from '@/components/ui/Skeleton'
import { TaskForm } from '@/components/forms/TaskForm'
import { UniversityForm } from '@/components/forms/UniversityForm'
import { ExamForm } from '@/components/forms/ExamForm'
import { ClientCurrency } from '@/components/ui/ClientCurrency'
import { DeadlineTimeline } from '@/components/widgets/DeadlineTimeline'
import { DeadlineAlerts } from '@/components/widgets/DeadlineAlerts'
import { PrepRoadmap } from '@/components/widgets/PrepRoadmap'
import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  Plus, BookOpen, DollarSign, FileText, CheckCircle,
  GraduationCap, Map, Target
} from 'lucide-react'
import { mockTasks, mockUniversities, mockExams, mockFinanceItems } from '@/data/mockData'
import { dbTasks, dbUniversities, dbExams, dbFinance } from '@/lib/db'
import { convertCurrency } from '@/lib/utils'
import { Task, University, Exam, FinanceItem } from '@/types'

export default function Dashboard() {
  const router = useRouter()
  const { settings } = useTheme()
  const { user } = useAuth()
  const toast = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [financeItems, setFinanceItems] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [isUniModalOpen, setIsUniModalOpen] = useState(false)
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)

  // ─── Load data ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (user) {
      try {
        const [cloudTasks, cloudUnis, cloudExams, cloudFinance] = await Promise.all([
          dbTasks.fetch(user.uid),
          dbUniversities.fetch(user.uid),
          dbExams.fetch(user.uid),
          dbFinance.fetch(user.uid),
        ])
        setTasks(cloudTasks.length > 0 ? cloudTasks : mockTasks)
        setUniversities(cloudUnis.length > 0 ? cloudUnis : mockUniversities)
        setExams(cloudExams.length > 0 ? cloudExams : mockExams)
        setFinanceItems(cloudFinance.length > 0 ? cloudFinance : mockFinanceItems)
      } catch (error) {
        console.warn('Dashboard cloud fetch error fallback:', error)
        setTasks(mockTasks)
        setUniversities(mockUniversities)
        setExams(mockExams)
        setFinanceItems(mockFinanceItems)
      }
    } else {
      try {
        const savedTasks = localStorage.getItem('tasks')
        const savedUnis = localStorage.getItem('universities')
        const savedExams = localStorage.getItem('exams')
        const savedFinance = localStorage.getItem('financeItems')

        const sanitizeTitle = (t: string) => t.replace(/Austrian/gi, 'German')

        setTasks(savedTasks
          ? JSON.parse(savedTasks).map((t: any) => ({
              ...t,
              title: sanitizeTitle(t.title),
              description: t.description ? sanitizeTitle(t.description) : '',
              dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
              createdAt: new Date(t.createdAt ?? Date.now())
            }))
          : mockTasks)
        setUniversities(savedUnis
          ? JSON.parse(savedUnis).map((u: any) => ({ ...u, applicationDeadline: new Date(u.applicationDeadline) }))
          : mockUniversities)
        setExams(savedExams
          ? JSON.parse(savedExams).map((e: any) => ({ ...e, plannedDate: e.plannedDate ? new Date(e.plannedDate) : undefined }))
          : mockExams)
        setFinanceItems(savedFinance ? JSON.parse(savedFinance) : mockFinanceItems)
      } catch {
        setTasks(mockTasks); setUniversities(mockUniversities); setExams(mockExams); setFinanceItems(mockFinanceItems)
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadData()
    const handleDataUpdate = () => loadData()
    window.addEventListener('app-data-updated', handleDataUpdate)
    return () => window.removeEventListener('app-data-updated', handleDataUpdate)
  }, [loadData])

  // ─── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'Completed').length
    const inProgress = tasks.filter(t => t.status === 'In Progress').length
    const convertAmt = (a: number) => convertCurrency(a, 'EUR', settings.currency.primary, settings.currency.exchangeRates)
    const totalBudget = financeItems.reduce((s, i) => s + convertAmt(i.estimatedAmount), 0)
    const totalPaid = financeItems.filter(i => i.paid).reduce((s, i) => s + convertAmt(i.actualAmount ?? i.estimatedAmount), 0)
    const appInProgress = universities.filter(u => u.status === 'Applied' || u.status === 'Accepted').length
    
    const now = new Date()
    const upcomingCount =
      tasks.filter(t => t.dueDate && t.status !== 'Completed' && new Date(t.dueDate) >= now).length +
      universities.filter(u => u.applicationDeadline && u.status !== 'Rejected' && new Date(u.applicationDeadline) >= now).length +
      exams.filter(e => e.plannedDate && e.status !== 'Completed' && new Date(e.plannedDate) >= now).length

    return { total, done, inProgress, pct: total > 0 ? Math.round((done / total) * 100) : 0, totalBudget, totalPaid, appInProgress, upcomingCount }
  }, [tasks, financeItems, universities, exams, settings.currency])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (user) {
      try {
        const added = await dbTasks.add(user.uid, data)
        setTasks(prev => [added, ...prev])
        toast.success('Task added!')
      } catch { toast.error('Failed to add task') }
    } else {
      const newTask: Task = { ...data, id: Date.now().toString(), createdAt: new Date() }
      setTasks(prev => {
        const updated = [newTask, ...prev]
        localStorage.setItem('tasks', JSON.stringify(updated))
        window.dispatchEvent(new Event('app-data-updated'))
        return updated
      })
      toast.success('Task added!')
    }
    setIsTaskModalOpen(false)
  }, [user, toast])

  const handleAddUniversity = useCallback(async (data: Omit<University, 'id'>) => {
    if (user) {
      try {
        const added = await dbUniversities.add(user.uid, data)
        setUniversities(prev => [added, ...prev])
        toast.success('University added!')
      } catch { toast.error('Failed to add university') }
    } else {
      const newUni: University = { ...data, id: Date.now().toString() }
      setUniversities(prev => {
        const updated = [newUni, ...prev]
        localStorage.setItem('universities', JSON.stringify(updated))
        window.dispatchEvent(new Event('app-data-updated'))
        return updated
      })
      toast.success('University added!')
    }
    setIsUniModalOpen(false)
  }, [user, toast])

  const handleAddExam = useCallback(async (data: Exam) => {
    if (user) {
      try {
        const added = await dbExams.add(user.uid, data)
        setExams(prev => [added, ...prev])
        toast.success('Exam added!')
      } catch { toast.error('Failed to add exam') }
    } else {
      const newExam: Exam = { ...data, id: data.id || Date.now().toString() }
      setExams(prev => {
        const updated = [newExam, ...prev]
        localStorage.setItem('exams', JSON.stringify(updated))
        window.dispatchEvent(new Event('app-data-updated'))
        return updated
      })
      toast.success('Exam added!')
    }
    setIsExamModalOpen(false)
  }, [user, toast])

  const handleUpdateTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (!editingTask) return
    const updated: Task = { ...data, id: editingTask.id, createdAt: editingTask.createdAt }
    if (user) {
      try {
        await dbTasks.update(user.uid, updated)
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t))
        toast.success('Task updated')
      } catch { toast.error('Failed to update task') }
    } else {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t))
      toast.success('Task updated')
    }
    setIsTaskModalOpen(false)
    setEditingTask(undefined)
  }, [editingTask, user, toast])

  if (loading) return <Layout><SkeletonPage /></Layout>

  return (
    <Layout>
      <div className="space-y-6 fade-in">

        {/* ── Hero banner ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 p-7"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.10), hsl(var(--accent)/0.08))' }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">UniRoute DE Workspace</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1.5">
              Welcome{settings.personalDetails.name ? `, ${settings.personalDetails.name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              Germany study preparation · {stats.pct}% complete · {stats.done} of {stats.total} tasks done
            </p>
            <div className="mt-4 max-w-sm">
              <ProgressBar value={stats.pct} showPercentage={false} />
            </div>
          </div>
          <div className="absolute bottom-4 right-6 text-4xl pointer-events-none opacity-30 select-none">
            🇩🇪
          </div>
        </div>

        {/* ── Stat cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Universities', value: universities.length, icon: BookOpen, color: 'text-info', bg: 'bg-info/10', sub: `${stats.appInProgress} active` },
            { label: 'Tasks Done', value: `${stats.done}/${stats.total}`, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', sub: `${stats.inProgress} in progress` },
            { label: 'Exams', value: exams.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10', sub: `${exams.filter(e=>e.status==='Completed').length} completed` },
            { 
              label: 'Budget Paid', 
              value: null, 
              icon: DollarSign, 
              color: 'text-accent', 
              bg: 'bg-accent/10', 
              sub: stats.totalBudget > 0 ? `of total budget` : 'total budget', 
              isCurrency: true, 
              amount: stats.totalPaid 
            },
          ].map(({ label, value, icon: Icon, color, bg, sub, isCurrency, amount }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-xl font-bold mt-1 ${color}`}>
                    {isCurrency
                      ? <ClientCurrency amount={amount!} currency={settings.currency.primary} showSymbol={settings.currency.displaySymbol} />
                      : value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Urgent Deadline Alerts ─────────────────────────────── */}
        <DeadlineAlerts />

        {/* ── Main content grid ────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Prep Roadmap — wider */}
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              <CardTitle>Preparation Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              <PrepRoadmap tasks={tasks} />
            </CardContent>
          </Card>

          {/* Deadline Timeline */}
          <Card className="xl:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Deadlines</CardTitle>
              {stats.upcomingCount > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  Showing {Math.min(stats.upcomingCount, 8)}
                </span>
              )}
            </CardHeader>
            <CardContent>
              <DeadlineTimeline
                tasks={tasks}
                universities={universities}
                exams={exams}
                visaSteps={[]}
                scholarships={[]}
                limit={8}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────── */}
        {settings.dashboard.showQuickActions && (
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Add University', icon: GraduationCap, color: 'text-info', bg: 'bg-info/10', hbg: 'group-hover:bg-info/20', onClick: () => setIsUniModalOpen(true) },
                  { label: 'Add Exam', icon: FileText, color: 'text-primary', bg: 'bg-primary/10', hbg: 'group-hover:bg-primary/20', onClick: () => setIsExamModalOpen(true) },
                  { label: 'Add Task', icon: Plus, color: 'text-success', bg: 'bg-success/10', hbg: 'group-hover:bg-success/20', onClick: () => setIsTaskModalOpen(true) },
                  { label: 'Finance', icon: Target, color: 'text-accent', bg: 'bg-accent/10', hbg: 'group-hover:bg-accent/20', onClick: () => router.push('/finance') },
                ].map(({ label, icon: Icon, color, bg, hbg, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all duration-200 group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${bg} ${hbg} flex items-center justify-center transition-colors`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Recent Tasks ──────────────────────────────────────── */}
        {settings.dashboard.showRecentTasks && tasks.filter(t => t.status !== 'Completed').length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Tasks</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => router.push('/tasks')}>View all</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks
                  .filter(t => t.status !== 'Completed')
                  .slice(0, settings.dashboard.tasksToShow ?? 5)
                  .map(task => (
                    <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 px-2 rounded-lg transition-colors" onClick={() => router.push('/tasks')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'High' ? 'bg-danger' : task.priority === 'Medium' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${task.status === 'In Progress' ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground'}`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(undefined) }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        size="md"
      >
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdateTask : handleAddTask}
          onCancel={() => { setIsTaskModalOpen(false); setEditingTask(undefined) }}
        />
      </Modal>

      {/* University Modal */}
      <Modal
        isOpen={isUniModalOpen}
        onClose={() => setIsUniModalOpen(false)}
        title="Add University Application"
        size="lg"
      >
        <UniversityForm
          onSubmit={handleAddUniversity}
          onCancel={() => setIsUniModalOpen(false)}
        />
      </Modal>

      {/* Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Add Standardized Exam"
        size="md"
      >
        <ExamForm
          onSave={handleAddExam}
          onCancel={() => setIsExamModalOpen(false)}
        />
      </Modal>
    </Layout>
  )
}
