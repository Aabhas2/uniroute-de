'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { TaskForm } from '@/components/forms/TaskForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Plus, Calendar, AlertTriangle, Edit, Trash2 } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { mockTasks } from '@/data/mockData'
import { dbTasks } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Task } from '@/types'

export default function TasksPage() {
  const { settings } = useTheme()
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load data on mount / auth state change
  const loadTasks = useCallback(async () => {
    if (user) {
      try {
        const cloudTasks = await dbTasks.fetch(user.uid)
        setTasks(cloudTasks)
      } catch (error) {
        console.error('Error fetching cloud tasks:', error)
        setTasks([])
      }
    } else {
      try {
        const savedTasks = localStorage.getItem('tasks')
        const parsedTasks = savedTasks ? JSON.parse(savedTasks).map((task: any) => ({
          ...task,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          createdAt: task.createdAt ? new Date(task.createdAt) : new Date()
        })) : mockTasks
        setTasks(parsedTasks)
      } catch (error) {
        console.error('Error loading tasks:', error)
        setTasks(mockTasks)
      }
    }
  }, [user])

  useEffect(() => {
    setMounted(true)
    loadTasks()
    const handleDataUpdate = () => loadTasks()
    window.addEventListener('app-data-updated', handleDataUpdate)
    return () => window.removeEventListener('app-data-updated', handleDataUpdate)
  }, [loadTasks])

  // Save tasks locally (guest mode only)
  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('tasks', JSON.stringify(tasks))
    }
  }, [tasks, mounted, user])

  const getPriorityVariant = useCallback((priority: Task['priority']) => {
    switch (priority) {
      case 'High': return 'error'
      case 'Medium': return 'warning'
      case 'Low': return 'default'
    }
  }, [])

  const tasksByStatus = useMemo(() => {
    try {
      // Filter tasks based on settings
      let filteredTasks = tasks
      if (!settings.tasks.showCompletedTasks) {
        filteredTasks = tasks.filter(task => task.status !== 'Completed')
      }

      // Sort tasks based on settings
      const sortedTasks = [...filteredTasks].sort((a, b) => {
        switch (settings.tasks.sortBy) {
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
            const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate)
            return aDate.getTime() - bDate.getTime()
          case 'priority':
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
            return priorityOrder[b.priority] - priorityOrder[a.priority]
          case 'created':
            const aCreated = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
            const bCreated = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
            return bCreated.getTime() - aCreated.getTime()
          case 'title':
            return a.title.localeCompare(b.title)
          default:
            return 0
        }
      })

      return {
        'To Do': sortedTasks.filter(task => task.status === 'To Do'),
        'In Progress': sortedTasks.filter(task => task.status === 'In Progress'),
        'Completed': settings.tasks.showCompletedTasks 
          ? sortedTasks.filter(task => task.status === 'Completed')
          : []
      }
    } catch (error) {
      console.error('Error processing tasks:', error)
      return {
        'To Do': [],
        'In Progress': [],
        'Completed': []
      }
    }
  }, [tasks, settings.tasks.showCompletedTasks, settings.tasks.sortBy])

  const handleAddTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (user) {
      try {
        const added = await dbTasks.add(user.uid, taskData)
        setTasks(prev => [added, ...prev])
        window.dispatchEvent(new Event('app-data-updated'))
      } catch (error) {
        console.error('Error adding task:', error)
      }
    } else {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
        createdAt: new Date()
      }
      setTasks(prev => {
        const updated = [newTask, ...prev]
        localStorage.setItem('tasks', JSON.stringify(updated))
        window.dispatchEvent(new Event('app-data-updated'))
        return updated
      })
    }
    setIsModalOpen(false)
  }, [user])

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }, [])

  const handleUpdateTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!editingTask) return
    
    const updatedTask: Task = {
      ...taskData,
      id: editingTask.id,
      createdAt: editingTask.createdAt
    }

    if (user) {
      try {
        await dbTasks.update(user.uid, updatedTask)
        setTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task))
      } catch (error) {
        console.error('Error updating task:', error)
      }
    } else {
      setTasks(prev => prev.map(task => task.id === editingTask.id ? updatedTask : task))
    }
    setIsModalOpen(false)
    setEditingTask(undefined)
  }, [editingTask, user])

  const handleDeleteTask = useCallback((id: string) => {
    setTaskToDelete(id)
    setConfirmOpen(true)
  }, [])

  const confirmDeleteTask = useCallback(async () => {
    if (!taskToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbTasks.delete(user.uid, taskToDelete)
        setTasks(prev => prev.filter(task => task.id !== taskToDelete))
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    } else {
      setTasks(prev => prev.filter(task => task.id !== taskToDelete))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setTaskToDelete(null)
  }, [user, taskToDelete])

  const handleStatusChange = useCallback(async (id: string, newStatus: Task['status']) => {
    setTasks(prev => {
      const matched = prev.find(t => t.id === id)
      if (!matched) return prev
      const updated = { ...matched, status: newStatus }
      
      if (user) {
        dbTasks.update(user.uid, updated).catch(e => console.error('Status sync error:', e))
      }
      
      // Notify dashboard and other listeners
      window.dispatchEvent(new Event('app-data-updated'))
      return prev.map(task => task.id === id ? updated : task)
    })
  }, [user])

  const TaskCard = React.memo(({ task }: { task: Task }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-foreground">{task.title}</h3>
          <Badge variant={getPriorityVariant(task.priority)}>
            {task.priority}
          </Badge>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="bg-muted  px-2 py-1 rounded">{task.category}</span>
          {task.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" onClick={() => handleEditTask(task)} className="text-xs px-2 py-1">
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDeleteTask(task.id)} className="text-xs px-2 py-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          {task.status !== 'Completed' && (
            <Button 
              variant="primary" 
              size="sm" 
              className="text-xs px-2 py-1"
              onClick={() => {
                const nextStatus = task.status === 'To Do' ? 'In Progress' : 'Completed'
                handleStatusChange(task.id, nextStatus)
              }}
            >
              {task.status === 'To Do' ? 'Start' : 'Complete'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  ))

  TaskCard.displayName = 'TaskCard'

  const TaskColumn = ({ title, status, tasks: columnTasks }: { 
    title: string
    status: Task['status']
    tasks: Task[] 
  }) => (
    <div className="flex-1 min-w-0">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="default">{columnTasks.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {columnTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {columnTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Show nothing during SSR
  if (!mounted) {
    return null
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
            <p className="text-muted-foreground">Organize and track your preparation tasks</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">To Do</p>
                <p className="text-2xl font-bold text-info">{tasksByStatus['To Do'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-warning">{tasksByStatus['In Progress'].length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{tasksByStatus['Completed'].length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto">
          <TaskColumn 
            title="To Do" 
            status="To Do" 
            tasks={tasksByStatus['To Do']} 
          />
          <TaskColumn 
            title="In Progress" 
            status="In Progress" 
            tasks={tasksByStatus['In Progress']} 
          />
          <TaskColumn 
            title="Completed" 
            status="Completed" 
            tasks={tasksByStatus['Completed']} 
          />
        </div>

        {/* Overdue Tasks Alert */}
        {tasks.some(task => task.dueDate && task.dueDate < new Date() && task.status !== 'Completed') && (
          <Card className="border-danger/30 bg-danger/10 dark:bg-danger/15 shadow-sm">
            <CardContent className="flex items-center p-4">
              <AlertTriangle className="h-5 w-5 text-danger shrink-0 mr-3" />
              <div>
                <h3 className="font-semibold text-danger text-sm">Overdue Tasks</h3>
                <p className="text-sm text-foreground/80 mt-0.5">
                  You have {tasks.filter(task => task.dueDate && task.dueDate < new Date() && task.status !== 'Completed').length} overdue task(s) that need attention.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingTask(undefined)
          }}
          title={editingTask ? 'Edit Task' : 'Add New Task'}
        >
          <TaskForm
            task={editingTask}
            onSubmit={editingTask ? handleUpdateTask : handleAddTask}
            onCancel={() => {
              setIsModalOpen(false)
              setEditingTask(undefined)
            }}
          />
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setTaskToDelete(null) }}
          onConfirm={confirmDeleteTask}
          title="Delete Task?"
          message="This will permanently delete this task. This action cannot be undone."
          confirmLabel="Delete Task"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
} 