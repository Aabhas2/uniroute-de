'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Plus, CheckCircle, Clock, AlertTriangle, Calendar, FileText, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { countriesConfig } from '@/data/countries'
import { mockVisaSteps } from '@/data/mockData'
import { dbVisaSteps } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { VisaStep } from '@/types'
import { VisaStepForm } from '@/components/forms/VisaStepForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CertificateTracker } from '@/components/visa/CertificateTracker'
import { useIsClient } from '@/hooks/useIsClient'
import { Loading } from '@/components/ui/Loading'

export default function VisaPage() {
  const isClient = useIsClient()
  const { user } = useAuth()
  const { settings } = useTheme()
  const [visaSteps, setVisaSteps] = useState<VisaStep[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<VisaStep | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stepToDelete, setStepToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false)
  const [stepToComplete, setStepToComplete] = useState<string | null>(null)

  // Load data on mount / auth state change
  useEffect(() => {
    setMounted(true)
    
    const loadVisaSteps = async () => {
      if (user) {
        try {
          const cloudSteps = await dbVisaSteps.fetch(user.uid)
          setVisaSteps(cloudSteps)
        } catch (error) {
          console.error('Error fetching visa steps from cloud:', error)
        }
      } else {
        try {
          const savedSteps = localStorage.getItem('visaSteps')
          const parsedSteps = savedSteps ? JSON.parse(savedSteps).map((step: any) => ({
            ...step,
            dueDate: step.dueDate ? new Date(step.dueDate) : null
          })) : mockVisaSteps
          setVisaSteps(parsedSteps)
        } catch (error) {
          console.error('Error loading visa steps:', error)
          setVisaSteps(mockVisaSteps)
        }
      }
    }

    loadVisaSteps()
  }, [user])

  // Save steps locally (guest mode only)
  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('visaSteps', JSON.stringify(visaSteps))
    }
  }, [visaSteps, mounted, user])

  const getStatusIcon = (status: VisaStep['status']) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-5 w-5 text-success" />
      case 'In Progress': return <Clock className="h-5 w-5 text-info" />
      case 'Pending': return <AlertTriangle className="h-5 w-5 text-warning" />
    }
  }

  const getStatusVariant = (status: VisaStep['status']): 'success' | 'info' | 'warning' | 'default' => {
    switch (status) {
      case 'Completed': return 'success'
      case 'In Progress': return 'info'
      case 'Pending': return 'warning'
      default: return 'default'
    }
  }

  const completedSteps = visaSteps.filter(step => step.status === 'Completed').length
  const totalSteps = visaSteps.length
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const handleAddStep = () => {
    setEditingStep(undefined)
    setIsModalOpen(true)
  }

  const handleEditStep = (step: VisaStep) => {
    setEditingStep(step)
    setIsModalOpen(true)
  }

  const handleDeleteStep = (stepId: string) => {
    setStepToDelete(stepId)
    setConfirmOpen(true)
  }

  const confirmDeleteStep = async () => {
    if (!stepToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbVisaSteps.delete(user.uid, stepToDelete)
        setVisaSteps(prev => prev.filter(s => s.id !== stepToDelete))
      } catch (error) {
        console.error('Error deleting visa step:', error)
      }
    } else {
      setVisaSteps(prev => prev.filter(s => s.id !== stepToDelete))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setStepToDelete(null)
  }

  const handleSaveStep = async (step: VisaStep) => {
    if (editingStep) {
      if (user) {
        try {
          await dbVisaSteps.update(user.uid, step)
          setVisaSteps(prev => prev.map(s => s.id === step.id ? step : s))
        } catch (error) {
          console.error('Error updating visa step:', error)
        }
      } else {
        setVisaSteps(prev => prev.map(s => s.id === step.id ? step : s))
      }
    } else {
      if (user) {
        try {
          const { id, ...data } = step
          const added = await dbVisaSteps.add(user.uid, data)
          setVisaSteps(prev => [...prev, added])
        } catch (error) {
          console.error('Error adding visa step:', error)
        }
      } else {
        setVisaSteps(prev => [...prev, step])
      }
    }
    setIsModalOpen(false)
    setEditingStep(undefined)
  }

  const handleCancelEdit = () => {
    setIsModalOpen(false)
    setEditingStep(undefined)
  }

  const handleMarkComplete = (stepId: string) => {
    setStepToComplete(stepId)
    setCompleteConfirmOpen(true)
  }

  const confirmMarkComplete = async () => {
    if (!stepToComplete) return
    const matched = visaSteps.find(s => s.id === stepToComplete)
    if (!matched) return

    const updated: VisaStep = { ...matched, status: 'Completed' as VisaStep['status'] }

    if (user) {
      try {
        await dbVisaSteps.update(user.uid, updated)
        setVisaSteps(prev => prev.map(step => step.id === stepToComplete ? updated : step))
      } catch (error) {
        console.error('Error completing visa step:', error)
      }
    } else {
      setVisaSteps(prev => prev.map(step => step.id === stepToComplete ? updated : step))
    }
    setCompleteConfirmOpen(false)
    setStepToComplete(null)
  }

  const handleBookAppointment = () => {
    const country = settings.personalDetails.targetCountry || 'Germany'
    if (country === 'Germany') {
      window.open('https://service2.diplo.de/rktermin/extern/choose_categoryList.do?locationCode=indi&realmId=108&categoryId=373', '_blank', 'noopener,noreferrer')
    } else if (country === 'Canada') {
      window.open('https://www.canada.ca/en/immigration-refugees-citizenship/services/biometrics.html', '_blank', 'noopener,noreferrer')
    } else {
      window.open('https://www.vfsglobal.com', '_blank', 'noopener,noreferrer')
    }
  }

  const handleDocumentChecklist = async () => {
    // Prevent adding duplicate checklists
    const alreadyExists = visaSteps.some(s =>
      s.title.toLowerCase().includes('document checklist') ||
      s.title.toLowerCase().includes('checklist')
    )
    if (alreadyExists) {
      alert('A document checklist step already exists. Edit it in the list above.')
      return
    }

    const country = settings.personalDetails.targetCountry || 'Germany'
    const config = countriesConfig[country]
    
    const checklistStep: Omit<VisaStep, 'id'> = {
      title: `${country} Document Checklist`,
      description: `Complete document checklist for ${country} student visa. Required proof: ${config?.visaAmount || '11904'} ${config?.visaCurrency || 'EUR'} via ${config?.visaType || 'Blocked Account'}.`,
      status: 'Pending',
      documents: config ? [
        'Valid passport (6+ months validity)',
        'University admission letter',
        `Financial Proof (${config.visaAmount} ${config.visaCurrency} via ${config.visaType})`,
        'Health insurance coverage',
        'Academic transcripts and certificates',
        ...config.mandatedExams.map(exam => `${exam} documentation`),
        'Biometric photos'
      ] : [
        'Valid passport',
        'University admission letter',
        'Proof of financial resources',
        'Academic transcripts'
      ]
    }

    if (user) {
      try {
        const added = await dbVisaSteps.add(user.uid, checklistStep)
        setVisaSteps(prev => [...prev, added])
      } catch (error) {
        console.error('Error generating document checklist:', error)
      }
    } else {
      const stepWithId: VisaStep = {
        ...checklistStep,
        id: Date.now().toString()
      }
      setVisaSteps(prev => [...prev, stepWithId])
    }
  }

  const handleTrackApplication = () => {
    const country = settings.personalDetails.targetCountry || 'Germany'
    if (country === 'Germany') {
      window.open('https://visa.vfsglobal.com/ind/en/deu/track-application', '_blank', 'noopener,noreferrer')
    } else if (country === 'Canada') {
      window.open('https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html', '_blank', 'noopener,noreferrer')
    } else {
      window.open('https://visa.vfsglobal.com', '_blank', 'noopener,noreferrer')
    }
  }

  const VisaStepCard = ({ step, index }: { step: VisaStep; index: number }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full font-medium text-sm">
              {index + 1}
            </div>
            <CardTitle className="text-lg">{step.title}</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(step.status)}
            <Badge variant={getStatusVariant(step.status)}>
              {step.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{step.description}</p>

        {step.dueDate && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Due Date
            </div>
            <span className="font-medium">{formatDate(step.dueDate)}</span>
          </div>
        )}

        <div>
          <h4 className="font-medium text-foreground mb-2">Required Documents</h4>
          <div className="space-y-2">
            {step.documents.map((document, docIndex) => (
              <div key={docIndex} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                <span className="text-sm text-muted-foreground">{document}</span>
              </div>
            ))}
          </div>
        </div>

        {step.notes && (
          <div>
            <h4 className="font-medium text-foreground mb-1">Notes</h4>
            <p className="text-sm text-muted-foreground">{step.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditStep(step)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDeleteStep(step.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {step.status !== 'Completed' && (
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => handleMarkComplete(step.id)}
            >
              Mark Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (!isClient) {
    return (
      <Layout>
        <Loading text="Loading your visa process..." />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visa Process</h1>
            <p className="text-muted-foreground">Track your German student visa application</p>
          </div>
          <Button onClick={handleAddStep}>
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>

        <CertificateTracker />

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Visa Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar 
              value={progressPercentage} 
              label="Overall Progress"
              className="mb-6"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalSteps}</div>
                <div className="text-sm text-muted-foreground">Total Steps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{completedSteps}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{totalSteps - completedSteps}</div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visa Steps */}
        <div className="space-y-6">
          {visaSteps.map((step, index) => (
            <VisaStepCard key={step.id} step={step} index={index} />
          ))}
        </div>

        {visaSteps.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No visa steps added yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your visa application steps</p>
            <Button onClick={handleAddStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Step
            </Button>
          </div>
        )}

        {/* Visa Information */}
        <Card>
          <CardHeader>
            <CardTitle>German Student Visa Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">Required Documents</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Valid passport (6+ months validity)</li>
                  <li>• University admission letter</li>
                  <li>• Proof of financial resources (€11,904/year via Blocked Account)</li>
                  <li>• Health insurance coverage</li>
                  <li>• Academic transcripts and certificates</li>
                  <li>• Language proficiency certificates</li>
                  <li>• Completed visa application form</li>
                  <li>• Biometric photos</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-3">Important Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Apply 3 months before travel date</li>
                  <li>• Book appointment early at German consulate</li>
                  <li>• Prepare for visa interview questions</li>
                  <li>• Keep all original documents ready</li>
                  <li>• Processing time: 4-12 weeks typically</li>
                  <li>• Visa fee: €75 for most countries</li>
                  <li>• Consider blocked account for financial proof</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={handleBookAppointment}
              >
                <Calendar className="h-6 w-6 mb-2" />
                Book Appointment
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={handleDocumentChecklist}
              >
                <FileText className="h-6 w-6 mb-2" />
                Document Checklist
              </Button>
              <Button 
                variant="outline" 
                className="h-16 flex-col"
                onClick={handleTrackApplication}
              >
                <CheckCircle className="h-6 w-6 mb-2" />
                Track Application
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCancelEdit}
          title={editingStep ? 'Edit Visa Step' : 'Add New Visa Step'}
        >
          <VisaStepForm
            visaStep={editingStep}
            onSave={handleSaveStep}
            onCancel={handleCancelEdit}
          />
        </Modal>

        <ConfirmDialog
          isOpen={completeConfirmOpen}
          onClose={() => { setCompleteConfirmOpen(false); setStepToComplete(null) }}
          onConfirm={confirmMarkComplete}
          title="Mark Step as Complete?"
          message="Are you sure you want to mark this visa step as completed? You can edit it later if needed."
          confirmLabel="Mark Complete"
          variant="warning"
        />

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setStepToDelete(null) }}
          onConfirm={confirmDeleteStep}
          title="Delete Visa Step?"
          message="This will permanently delete this visa step. This action cannot be undone."
          confirmLabel="Delete"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}