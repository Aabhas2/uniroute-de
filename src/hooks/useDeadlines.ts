import { useState, useEffect } from 'react'
import { dbTasks, dbUniversities, dbExams, dbScholarships, dbVisaSteps } from '@/lib/db'
import { Task, University, Exam, Scholarship, VisaStep } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { mockTasks, mockUniversities, mockExams, mockScholarships, mockVisaSteps } from '@/data/mockData'

export type DeadlineItem = {
  id: string
  title: string
  date: Date
  type: 'Task' | 'University' | 'Exam' | 'Scholarship' | 'Visa Step'
  priority: 'High' | 'Medium' | 'Low'
  status: string
  href: string
}

export function useDeadlines(daysThreshold: number = 30) {
  const { user } = useAuth()
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchAllData = async () => {
      setLoading(true)
      let tasks: Task[] = []
      let unis: University[] = []
      let exams: Exam[] = []
      let scholarships: Scholarship[] = []
      let visaSteps: VisaStep[] = []

      if (user) {
        try {
          const results = await Promise.all([
            dbTasks.fetch(user.uid),
            dbUniversities.fetch(user.uid),
            dbExams.fetch(user.uid),
            dbScholarships.fetch(user.uid),
            dbVisaSteps.fetch(user.uid)
          ])
          tasks = results[0]
          unis = results[1]
          exams = results[2]
          scholarships = results[3]
          visaSteps = results[4]
        } catch (error) {
          console.error('Failed to fetch deadlines from cloud:', error)
        }
      } else {
        // Load from local storage or mock
        const parseLocal = (key: string, mockData: any[], dateFields: string[]) => {
          const stored = localStorage.getItem(key)
          if (!stored) return mockData
          try {
            const parsed = JSON.parse(stored)
            return parsed.map((item: any) => {
              const res = { ...item }
              dateFields.forEach(field => {
                if (res[field]) res[field] = new Date(res[field])
              })
              return res
            })
          } catch {
            return mockData
          }
        }

        tasks = parseLocal('tasks', mockTasks, ['dueDate', 'createdAt'])
        unis = parseLocal('universities', mockUniversities, ['applicationDeadline'])
        exams = parseLocal('exams', mockExams, ['plannedDate', 'actualDate'])
        scholarships = parseLocal('scholarships', mockScholarships, ['deadline'])
        visaSteps = parseLocal('visaSteps', mockVisaSteps, ['dueDate'])
      }

      if (!isMounted) return

      const now = new Date()
      const thresholdDate = new Date()
      thresholdDate.setDate(now.getDate() + daysThreshold)

      const aggregated: DeadlineItem[] = []

      tasks.forEach(t => {
        if (t.status !== 'Completed' && t.dueDate && t.dueDate <= thresholdDate) {
          aggregated.push({
            id: `task-${t.id}`,
            title: t.title,
            date: t.dueDate,
            type: 'Task',
            priority: t.priority,
            status: t.status,
            href: '/tasks'
          })
        }
      })

      unis.forEach(u => {
        if (u.status !== 'Accepted' && u.status !== 'Rejected' && u.applicationDeadline && u.applicationDeadline <= thresholdDate) {
          aggregated.push({
            id: `uni-${u.id}`,
            title: `${u.name} App`,
            date: u.applicationDeadline,
            type: 'University',
            priority: 'High',
            status: u.status,
            href: '/universities'
          })
        }
      })

      exams.forEach(e => {
        if (e.status !== 'Completed' && e.plannedDate && e.plannedDate <= thresholdDate) {
          aggregated.push({
            id: `exam-${e.id}`,
            title: e.name,
            date: e.plannedDate,
            type: 'Exam',
            priority: 'Medium',
            status: e.status,
            href: '/exams'
          })
        }
      })

      scholarships.forEach(s => {
        if (s.status !== 'Accepted' && s.status !== 'Rejected' && s.deadline && s.deadline <= thresholdDate) {
          aggregated.push({
            id: `schol-${s.id}`,
            title: s.name,
            date: s.deadline,
            type: 'Scholarship',
            priority: 'Medium',
            status: s.status,
            href: '/scholarships'
          })
        }
      })

      visaSteps.forEach(v => {
        if (v.status !== 'Completed' && v.dueDate && v.dueDate <= thresholdDate) {
          aggregated.push({
            id: `visa-${v.id}`,
            title: v.title,
            date: v.dueDate,
            type: 'Visa Step',
            priority: 'High',
            status: v.status,
            href: '/visa'
          })
        }
      })

      // Sort by date ascending
      aggregated.sort((a, b) => a.date.getTime() - b.date.getTime())
      
      setDeadlines(aggregated)
      setLoading(false)
    }

    fetchAllData()

    const handleDataUpdate = () => fetchAllData()
    window.addEventListener('app-data-updated', handleDataUpdate)

    return () => {
      isMounted = false
      window.removeEventListener('app-data-updated', handleDataUpdate)
    }
  }, [user, daysThreshold])

  return { deadlines, loading }
}
