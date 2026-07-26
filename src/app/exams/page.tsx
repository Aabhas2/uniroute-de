'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Plus, Calendar, ExternalLink, BookOpen, Award, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockExams } from '@/data/mockData'
import { dbExams } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Exam } from '@/types'
import { ExamForm } from '@/components/forms/ExamForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LanguageTracker } from '@/components/exams/LanguageTracker'
import { useIsClient } from '@/hooks/useIsClient'
import { Loading } from '@/components/ui/Loading'

export default function ExamsPage() {
  const isClient = useIsClient()
  const { user } = useAuth()
  const [exams, setExams] = useState<Exam[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load data on mount / auth state change
  const loadExams = useCallback(async () => {
    if (user) {
      try {
        const cloudExams = await dbExams.fetch(user.uid)
        setExams(cloudExams)
      } catch (error) {
        console.error('Error fetching exams from cloud:', error)
        setExams([])
      }
    } else {
      try {
        const savedExams = localStorage.getItem('exams')
        const parsedExams = savedExams ? JSON.parse(savedExams).map((exam: any) => ({
          ...exam,
          plannedDate: exam.plannedDate ? new Date(exam.plannedDate) : null,
          actualDate: exam.actualDate ? new Date(exam.actualDate) : null
        })) : mockExams
        setExams(parsedExams)
      } catch (error) {
        console.error('Error loading exams:', error)
        setExams(mockExams)
      }
    }
  }, [user])

  useEffect(() => {
    setMounted(true)
    loadExams()
    const handleDataUpdate = () => loadExams()
    window.addEventListener('app-data-updated', handleDataUpdate)
    return () => window.removeEventListener('app-data-updated', handleDataUpdate)
  }, [loadExams])

  // Save exams locally (guest mode only)
  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('exams', JSON.stringify(exams))
    }
  }, [exams, mounted, user])

  const getStatusVariant = (status: Exam['status']) => {
    switch (status) {
      case 'Completed': return 'success'
      case 'Registered': return 'info'
      case 'To Register': return 'warning'
    }
  }

  const handleAddExam = () => {
    setEditingExam(undefined)
    setIsModalOpen(true)
  }

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam)
    setIsModalOpen(true)
  }

  const handleDeleteExam = (examId: string) => {
    setExamToDelete(examId)
    setConfirmOpen(true)
  }

  const confirmDeleteExam = async () => {
    if (!examToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbExams.delete(user.uid, examToDelete)
        setExams(prev => prev.filter(e => e.id !== examToDelete))
      } catch (error) {
        console.error('Error deleting exam:', error)
      }
    } else {
      setExams(prev => prev.filter(e => e.id !== examToDelete))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setExamToDelete(null)
  }

  const handleSaveExam = async (exam: Exam) => {
    if (editingExam) {
      if (user) {
        try {
          await dbExams.update(user.uid, exam)
          setExams(prev => prev.map(e => e.id === exam.id ? exam : e))
        } catch (error) {
          console.error('Error updating exam:', error)
        }
      } else {
        setExams(prev => prev.map(e => e.id === exam.id ? exam : e))
      }
    } else {
      if (user) {
        try {
          // Remove ID placeholder since Firestore generates one
          const { id, ...data } = exam
          const added = await dbExams.add(user.uid, data)
          setExams(prev => [...prev, added])
        } catch (error) {
          console.error('Error adding exam:', error)
        }
      } else {
        setExams(prev => [...prev, exam])
      }
    }
    setIsModalOpen(false)
    setEditingExam(undefined)
  }

  const handleCancelEdit = () => {
    setIsModalOpen(false)
    setEditingExam(undefined)
  }

  const [scoreModalOpen, setScoreModalOpen] = useState(false)
  const [examToComplete, setExamToComplete] = useState<string | null>(null)
  const [scoreInput, setScoreInput] = useState('')

  const handleMarkComplete = (examId: string) => {
    setExamToComplete(examId)
    setScoreInput('')
    setScoreModalOpen(true)
  }

  const confirmMarkComplete = async () => {
    if (!examToComplete) return
    const matched = exams.find(e => e.id === examToComplete)
    if (!matched) return

    const updated: Exam = {
      ...matched,
      status: 'Completed' as Exam['status'],
      actualDate: new Date(),
      score: scoreInput.trim() || matched.score
    }

    if (user) {
      try {
        await dbExams.update(user.uid, updated)
        setExams(prev => prev.map(exam => exam.id === examToComplete ? updated : exam))
      } catch (error) {
        console.error('Error completing exam:', error)
      }
    } else {
      setExams(prev => prev.map(exam => exam.id === examToComplete ? updated : exam))
    }
    setScoreModalOpen(false)
    setExamToComplete(null)
    setScoreInput('')
  }

  const handleMarkRegistered = async (examId: string) => {
    const matched = exams.find(e => e.id === examId)
    if (!matched) return

    const updated: Exam = { ...matched, status: 'Registered' as Exam['status'] }

    if (user) {
      try {
        await dbExams.update(user.uid, updated)
        setExams(prev => prev.map(exam => exam.id === examId ? updated : exam))
      } catch (error) {
        console.error('Error registering exam:', error)
      }
    } else {
      setExams(prev => prev.map(exam => exam.id === examId ? updated : exam))
    }
  }

  const handleOpenRegistration = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const ExamCard = ({ exam }: { exam: Exam }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{exam.name}</CardTitle>
          <Badge variant={getStatusVariant(exam.status)}>
            {exam.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Fee:</span>
            <span className="font-medium text-foreground">€{exam.fee}</span>
          </div>
          
          {exam.plannedDate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Planned Date:</span>
              <span className="font-medium text-foreground">{formatDate(exam.plannedDate)}</span>
            </div>
          )}
          
          {exam.actualDate && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed:</span>
              <span className="font-medium text-foreground">{formatDate(exam.actualDate)}</span>
            </div>
          )}
          
          {exam.score && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Score:</span>
              <span className="font-medium text-success">{exam.score}</span>
            </div>
          )}
        </div>

        {exam.preparationResources.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-2">Preparation Resources</h4>
            <div className="space-y-1">
              {exam.preparationResources.map((resource, index) => (
                <div key={index} className="flex items-center text-sm text-muted-foreground">
                  <BookOpen className="h-3 w-3 mr-2" />
                  {resource}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditExam(exam)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDeleteExam(exam.id)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2">
            {exam.registrationLink && exam.status === 'To Register' && (
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => {
                  handleOpenRegistration(exam.registrationLink!)
                  handleMarkRegistered(exam.id)
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Register
              </Button>
            )}
            {exam.status === 'Registered' && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleMarkComplete(exam.id)}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (!isClient) {
    return (
      <Layout>
        <Loading text="Loading your exams..." />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams</h1>
            <p className="text-muted-foreground">Track your standardized tests and preparations</p>
          </div>
          <Button onClick={handleAddExam}>
            <Plus className="h-4 w-4 mr-2" />
            Add Exam
          </Button>
        </div>

        <LanguageTracker />

        {/* Exam Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Exams</p>
                <p className="text-2xl font-bold text-foreground">{exams.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-info" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">To Register</p>
                <p className="text-2xl font-bold text-warning">
                  {exams.filter(exam => exam.status === 'To Register').length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-warning" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Registered</p>
                <p className="text-2xl font-bold text-info">
                  {exams.filter(exam => exam.status === 'Registered').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">
                  {exams.filter(exam => exam.status === 'Completed').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-success" />
            </CardContent>
          </Card>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>

        {exams.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No exams added yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your required standardized tests</p>
            <Button onClick={handleAddExam}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Exam
            </Button>
          </div>
        )}

        {/* Exam Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Preparation Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">IELTS Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Practice all four skills: reading, writing, listening, speaking</li>
                  <li>• Take timed practice tests</li>
                  <li>• Focus on academic vocabulary</li>
                  <li>• Book your test 2-3 months in advance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">TestAS Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Understand the test format and structure</li>
                  <li>• Practice logical reasoning problems</li>
                  <li>• Improve German language skills if taking in German</li>
                  <li>• Review your field-specific knowledge</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCancelEdit}
          title={editingExam ? 'Edit Exam' : 'Add New Exam'}
        >
          <ExamForm
            exam={editingExam}
            onSave={handleSaveExam}
            onCancel={handleCancelEdit}
          />
        </Modal>

        {/* Mark Complete / Score Modal */}
        <Modal
          isOpen={scoreModalOpen}
          onClose={() => { setScoreModalOpen(false); setExamToComplete(null) }}
          title="Mark Exam as Complete"
        >
          <div className="space-y-4 p-1">
            <p className="text-sm text-muted-foreground">Optionally enter your score or result for this exam.</p>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Score / Result (optional)</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 7.5 / Band 8 / Passed"
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmMarkComplete() }}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setScoreModalOpen(false); setExamToComplete(null) }}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkComplete}
                className="flex-1 px-4 py-2 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setExamToDelete(null) }}
          onConfirm={confirmDeleteExam}
          title="Delete Exam?"
          message="This will permanently remove the exam and all its details. This action cannot be undone."
          confirmLabel="Delete Exam"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}