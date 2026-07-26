'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Plus, Calendar, ExternalLink, DollarSign, Award, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockScholarships } from '@/data/mockData'
import { dbScholarships } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Scholarship } from '@/types'
import { ScholarshipForm } from '@/components/forms/ScholarshipForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

export default function ScholarshipsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scholarshipToDelete, setScholarshipToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load data on mount / auth state change
  useEffect(() => {
    setMounted(true)
    
    const loadScholarships = async () => {
      if (user) {
        try {
          const cloudScholarships = await dbScholarships.fetch(user.uid)
          setScholarships(cloudScholarships)
        } catch (error) {
          console.error('Error fetching cloud scholarships:', error)
        }
      } else {
        try {
          const savedScholarships = localStorage.getItem('scholarships')
          const parsedScholarships = savedScholarships ? JSON.parse(savedScholarships).map((scholarship: any) => ({
            ...scholarship,
            deadline: scholarship.deadline ? new Date(scholarship.deadline) : undefined
          })) : mockScholarships
          setScholarships(parsedScholarships)
        } catch (error) {
          console.error('Error loading scholarships:', error)
          setScholarships(mockScholarships)
        }
      }
    }

    loadScholarships()
  }, [user])

  // Save scholarships locally (guest mode only)
  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('scholarships', JSON.stringify(scholarships))
    }
  }, [scholarships, mounted, user])

  const getStatusVariant = (status: Scholarship['status']): 'success' | 'info' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'Accepted': return 'success'
      case 'Applied': return 'info'
      case 'Rejected': return 'error'
      case 'To Apply': return 'warning'
      default: return 'default'
    }
  }

  const handleAddScholarship = useCallback(() => {
    setEditingScholarship(undefined)
    setIsModalOpen(true)
  }, [])

  const handleEditScholarship = useCallback((scholarship: Scholarship) => {
    setEditingScholarship(scholarship)
    setIsModalOpen(true)
  }, [])

  const handleDeleteScholarship = useCallback((scholarshipId: string) => {
    setScholarshipToDelete(scholarshipId)
    setConfirmOpen(true)
  }, [])

  const confirmDeleteScholarship = async () => {
    if (!scholarshipToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbScholarships.delete(user.uid, scholarshipToDelete)
        setScholarships(prev => prev.filter(s => s.id !== scholarshipToDelete))
        window.dispatchEvent(new Event('app-data-updated'))
      } catch (error) {
        console.error('Error deleting scholarship:', error)
      }
    } else {
      setScholarships(prev => prev.filter(s => s.id !== scholarshipToDelete))
      window.dispatchEvent(new Event('app-data-updated'))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setScholarshipToDelete(null)
  }

  const handleSaveScholarship = useCallback(async (scholarship: Scholarship) => {
    if (editingScholarship) {
      if (user) {
        try {
          await dbScholarships.update(user.uid, scholarship)
          setScholarships(prev => prev.map(s => s.id === scholarship.id ? scholarship : s))
          window.dispatchEvent(new Event('app-data-updated'))
        } catch (error) {
          console.error('Error updating scholarship:', error)
        }
      } else {
        setScholarships(prev => prev.map(s => s.id === scholarship.id ? scholarship : s))
        window.dispatchEvent(new Event('app-data-updated'))
      }
    } else {
      if (user) {
        try {
          const { id, ...data } = scholarship
          const added = await dbScholarships.add(user.uid, data)
          setScholarships(prev => [...prev, added])
          window.dispatchEvent(new Event('app-data-updated'))
        } catch (error) {
          console.error('Error adding scholarship:', error)
        }
      } else {
        setScholarships(prev => [...prev, scholarship])
        window.dispatchEvent(new Event('app-data-updated'))
      }
    }
    setIsModalOpen(false)
    setEditingScholarship(undefined)
  }, [editingScholarship, user])

  const handleCancelEdit = useCallback(() => {
    setIsModalOpen(false)
    setEditingScholarship(undefined)
  }, [])

  const handleOpenWebsite = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleApplyNow = useCallback(async (scholarship: Scholarship) => {
    const updated = { ...scholarship, status: 'Applied' as Scholarship['status'] }

    if (user) {
      try {
        await dbScholarships.update(user.uid, updated)
        setScholarships(prev => prev.map(s => s.id === scholarship.id ? updated : s))
        window.dispatchEvent(new Event('app-data-updated'))
      } catch (error) {
        console.error('Error applying scholarship:', error)
      }
    } else {
      setScholarships(prev => prev.map(s => s.id === scholarship.id ? updated : s))
      window.dispatchEvent(new Event('app-data-updated'))
    }
    
    if (scholarship.website) {
      window.open(scholarship.website, '_blank', 'noopener,noreferrer')
    } else {
      toast.success('Status updated to Applied!')
    }
  }, [user, toast])

  const ScholarshipCard = ({ scholarship }: { scholarship: Scholarship }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{scholarship.name}</CardTitle>
          <Badge variant={getStatusVariant(scholarship.status)}>
            {scholarship.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="font-semibold text-success">€{scholarship.amount} / month</span>
          </div>
          
          {scholarship.deadline && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Deadline:</span>
              <span className="font-medium text-foreground">{formatDate(scholarship.deadline)}</span>
            </div>
          )}
          
          {scholarship.eligibility && (
            <div>
              <span className="text-sm text-muted-foreground block mb-1">Eligibility:</span>
              <p className="text-sm text-foreground/90 bg-muted/30 p-2 rounded">{scholarship.eligibility}</p>
            </div>
          )}
        </div>

        {scholarship.requirements && scholarship.requirements.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Requirements</h4>
            <div className="flex flex-wrap gap-1.5">
              {scholarship.requirements.map((req, i) => (
                <Badge key={i} variant="default" className="text-xs">
                  {req}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditScholarship(scholarship)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDeleteScholarship(scholarship.id)}
              className="text-danger hover:text-danger/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2">
            {scholarship.website && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleOpenWebsite(scholarship.website!)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit
              </Button>
            )}
            {scholarship.status === 'To Apply' && (
              <Button variant="primary" size="sm" onClick={() => handleApplyNow(scholarship)}>
                Apply Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const totalAmount = useMemo(() => 
    scholarships
      .filter(s => s.status === 'Accepted')
      .reduce((sum, s) => sum + s.amount, 0),
    [scholarships]
  )

  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your scholarships...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scholarships Tracker</h1>
            <p className="text-muted-foreground">Record and track your target German scholarship opportunities</p>
          </div>
          <Button onClick={handleAddScholarship}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scholarship
          </Button>
        </div>

        {/* Scholarship Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Scholarships</p>
                <p className="text-2xl font-bold text-foreground">{scholarships.length}</p>
              </div>
              <Award className="h-8 w-8 text-info" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Applied</p>
                <p className="text-2xl font-bold text-info">
                  {scholarships.filter(s => s.status === 'Applied').length}
                </p>
              </div>
              <Award className="h-8 w-8 text-info" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secured Monthly</p>
                <p className="text-2xl font-bold text-success">
                  €{totalAmount.toLocaleString()} / mo
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </CardContent>
          </Card>
        </div>

        {/* Scholarships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scholarships.map((scholarship) => (
            <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
          ))}
        </div>

        {scholarships.length === 0 && (
          <div className="text-center py-12 fade-in">
            <div className="mx-auto w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No scholarships tracked yet</h3>
            <p className="text-muted-foreground mb-4">Add scholarships you discover during your German university research.</p>
            <Button onClick={handleAddScholarship}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Scholarship
            </Button>
          </div>
        )}

        {/* Scholarship Official Portals & Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Official Scholarship Portals & Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-3">German Scholarship Databases</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2.5 bg-muted/30 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">DAAD Scholarship Database</p>
                      <p className="text-xs text-muted-foreground">Official database for international master's students</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenWebsite('https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/30 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Deutschlandstipendium</p>
                      <p className="text-xs text-muted-foreground">300€/month merit-based university stipend</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenWebsite('https://www.deutschlandstipendium.de/')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/30 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">Heinrich Böll Foundation</p>
                      <p className="text-xs text-muted-foreground">Scholarships for all disciplines (German proficiency required)</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenWebsite('https://www.boell.de/en/scholarships')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-3">Application Tips</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>• Apply 6–12 months in advance — DAAD deadlines are typically in October/November.</li>
                  <li>• Tailor your Statement of Purpose (SOP) to the specific foundation's values.</li>
                  <li>• Prepare academic recommendations (LORs) from university professors.</li>
                  <li>• Highlight social commitment, leadership, or political/community engagement.</li>
                  <li>• Proofread all documents thoroughly before submitting.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCancelEdit}
          title={editingScholarship ? 'Edit Scholarship' : 'Add New Scholarship'}
        >
          <ScholarshipForm
            scholarship={editingScholarship}
            onSave={handleSaveScholarship}
            onCancel={handleCancelEdit}
          />
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setScholarshipToDelete(null) }}
          onConfirm={confirmDeleteScholarship}
          title="Delete Scholarship?"
          message="This will permanently delete this scholarship record. This action cannot be undone."
          confirmLabel="Delete"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
}