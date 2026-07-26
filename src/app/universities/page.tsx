'use client'

import { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { UniversityForm } from '@/components/forms/UniversityForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Plus, ExternalLink, MapPin, Calendar, Globe, Edit, Trash2, FileText } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockUniversities } from '@/data/mockData'
import { dbUniversities } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { University } from '@/types'

export default function UniversitiesPage() {
  const { user } = useAuth()
  const [universities, setUniversities] = useState<University[]>([])
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | undefined>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uniToDelete, setUniToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load data on mount / auth state change
  const loadUnis = useCallback(async () => {
    if (user) {
      try {
        const cloudUnis = await dbUniversities.fetch(user.uid)
        setUniversities(cloudUnis)
      } catch (error) {
        console.error('Error fetching universities from cloud:', error)
        setUniversities([])
      }
    } else {
      try {
        const savedUniversities = localStorage.getItem('universities')
        const parsedUniversities = savedUniversities
          ? JSON.parse(savedUniversities).map((uni: any) => ({
              ...uni,
              applicationDeadline: uni.applicationDeadline ? new Date(uni.applicationDeadline) : undefined
            }))
          : mockUniversities
        setUniversities(parsedUniversities)
      } catch (error) {
        console.error('Error loading universities:', error)
        setUniversities(mockUniversities)
      }
    }
  }, [user])

  useEffect(() => {
    setMounted(true)
    loadUnis()
    const handleDataUpdate = () => loadUnis()
    window.addEventListener('app-data-updated', handleDataUpdate)
    return () => window.removeEventListener('app-data-updated', handleDataUpdate)
  }, [loadUnis])

  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('universities', JSON.stringify(universities))
    }
  }, [universities, mounted, user])

  const getStatusVariant = (status: University['status']) => {
    switch (status) {
      case 'Accepted': return 'success'
      case 'Applied': return 'info'
      case 'Rejected': return 'error'
      default: return 'default'
    }
  }

  const handleAddUniversity = async (universityData: Omit<University, 'id'>) => {
    if (user) {
      try {
        const added = await dbUniversities.add(user.uid, universityData)
        setUniversities(prev => [...prev, added])
      } catch (error) {
        console.error('Error adding university:', error)
      }
    } else {
      const newUniversity: University = { ...universityData, id: Date.now().toString() }
      setUniversities(prev => [...prev, newUniversity])
    }
    setIsModalOpen(false)
  }

  const handleEditUniversity = (university: University) => {
    setEditingUniversity(university)
    setIsModalOpen(true)
  }

  const handleUpdateUniversity = async (universityData: Omit<University, 'id'>) => {
    if (!editingUniversity) return
    const updatedUniversity: University = { ...universityData, id: editingUniversity.id }
    if (user) {
      try {
        await dbUniversities.update(user.uid, updatedUniversity)
        setUniversities(prev => prev.map(uni => uni.id === editingUniversity.id ? updatedUniversity : uni))
      } catch (error) {
        console.error('Error updating university:', error)
      }
    } else {
      setUniversities(prev => prev.map(uni => uni.id === editingUniversity.id ? updatedUniversity : uni))
    }
    setIsModalOpen(false)
    setEditingUniversity(undefined)
  }

  // Bug #13 fix: Replaced confirm() with ConfirmDialog
  const handleDeleteUniversity = (id: string) => {
    setUniToDelete(id)
    setConfirmOpen(true)
  }

  const confirmDeleteUniversity = async () => {
    if (!uniToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbUniversities.delete(user.uid, uniToDelete)
        setUniversities(prev => prev.filter(uni => uni.id !== uniToDelete))
      } catch (error) {
        console.error('Error deleting university:', error)
      }
    } else {
      setUniversities(prev => prev.filter(uni => uni.id !== uniToDelete))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setUniToDelete(null)
  }

  const handleStatusChange = async (id: string, newStatus: University['status']) => {
    setUniversities(prev => {
      const matched = prev.find(uni => uni.id === id)
      if (!matched) return prev
      const updated = { ...matched, status: newStatus }
      if (user) {
        dbUniversities.update(user.uid, updated).catch(e => console.error('Error updating status:', e))
      }
      return prev.map(uni => uni.id === id ? updated : uni)
    })
  }

  const handleVisitWebsite = (website: string) => {
    window.open(website, '_blank', 'noopener,noreferrer')
  }

  if (!mounted) return null

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Universities</h1>
            <p className="text-muted-foreground text-sm">Manage your university applications</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add University
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {universities.map((university) => (
            <Card key={university.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{university.name}</CardTitle>
                  <Badge variant={getStatusVariant(university.status)}>
                    {university.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {university.location}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Globe className="h-4 w-4 mr-2" />
                    {university.language}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    Deadline: {formatDate(university.applicationDeadline)}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">Course</h4>
                  <p className="text-sm text-muted-foreground">{university.course}</p>
                </div>

                {university.notes && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{university.notes}</p>
                  </div>
                )}

                {/* Documents Tracker */}
                <div className="pt-2">
                  <h4 className="font-medium text-foreground mb-2 flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-1.5 text-primary" /> Documents
                  </h4>
                  {university.documents ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center bg-muted/30 px-2 py-1.5 rounded">
                        <span className="text-muted-foreground">SOP</span>
                        <span className={`font-medium ${university.documents.sopStatus === 'Submitted' ? 'text-success' : 'text-primary'}`}>
                          {university.documents.sopStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-muted/30 px-2 py-1.5 rounded">
                        <span className="text-muted-foreground">LORs</span>
                        <span className={`font-medium ${university.documents.lor1Status === 'Received' && university.documents.lor2Status === 'Received' ? 'text-success' : 'text-warning'}`}>
                          {(university.documents.lor1Status === 'Received' ? 1 : 0) + (university.documents.lor2Status === 'Received' ? 1 : 0)}/2 Received
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-muted/30 px-2 py-1.5 rounded">
                        <span className="text-muted-foreground">Transcripts</span>
                        <span className={`font-medium ${university.documents.transcriptStatus === 'Attested' ? 'text-success' : 'text-primary'}`}>
                          {university.documents.transcriptStatus}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Documents not tracked yet. Edit to add.</p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditUniversity(university)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUniversity(university.id)}
                      className="text-danger border-danger/30 hover:bg-danger/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    {university.website && (
                      <Button variant="ghost" size="sm" onClick={() => handleVisitWebsite(university.website!)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                    )}
                    {university.status === 'Interested' && (
                      <Button variant="primary" size="sm" onClick={() => handleStatusChange(university.id, 'Applied')}>
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {universities.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No universities added yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your target universities</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First University
            </Button>
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingUniversity(undefined) }}
          title={editingUniversity ? 'Edit University' : 'Add New University'}
        >
          <UniversityForm
            university={editingUniversity}
            onSubmit={editingUniversity ? handleUpdateUniversity : handleAddUniversity}
            onCancel={() => { setIsModalOpen(false); setEditingUniversity(undefined) }}
          />
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setUniToDelete(null) }}
          onConfirm={confirmDeleteUniversity}
          title="Delete University?"
          message="This will permanently remove this university and all its application details. This action cannot be undone."
          confirmLabel="Delete University"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}
