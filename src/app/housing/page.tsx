'use client'

import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Home, MapPin, ExternalLink, Euro, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { HousingApplication } from '@/types'
import { formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { HousingForm } from '@/components/forms/HousingForm'
import { useIsClient } from '@/hooks/useIsClient'
import { Loading } from '@/components/ui/Loading'
import { dbHousing } from '@/lib/db'

import { mockHousing } from '@/data/mockData'

export default function HousingPage() {
  const isClient = useIsClient()
  const { user } = useAuth()
  const [applications, setApplications] = useState<HousingApplication[]>([])
  const [mounted, setMounted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<HousingApplication | undefined>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [appToDelete, setAppToDelete] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const loadHousing = async () => {
      if (user) {
        try {
          const cloudHousing = await dbHousing.fetch(user.uid)
          setApplications(cloudHousing)
        } catch (error) {
          console.error('Error fetching housing from cloud:', error)
        }
      } else {
        try {
          const saved = localStorage.getItem('housing')
          if (saved) {
            setApplications(JSON.parse(saved).map((h: any) => ({
              ...h,
              moveInDate: h.moveInDate ? new Date(h.moveInDate) : undefined
            })))
          } else {
            setApplications(mockHousing)
          }
        } catch (error) {
          console.error('Error loading housing:', error)
          setApplications(mockHousing)
        }
      }
    }
    loadHousing()
  }, [user])

  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('housing', JSON.stringify(applications))
    }
  }, [applications, mounted, user])

  const getStatusVariant = (status: HousingApplication['status']) => {
    switch (status) {
      case 'Accepted': return 'success'
      case 'Offered': return 'info'
      case 'Interview/Viewing': return 'warning'
      case 'Rejected': return 'error'
      case 'Applied': return 'default'
      default: return 'default'
    }
  }

  const handleAddOrUpdate = async (data: Omit<HousingApplication, 'id'>) => {
    if (user) {
      try {
        if (editingApp) {
          await dbHousing.update(user.uid, { ...data, id: editingApp.id })
          setApplications(prev => prev.map(a => a.id === editingApp.id ? { ...data, id: editingApp.id } : a))
        } else {
          const added = await dbHousing.add(user.uid, data)
          setApplications(prev => [...prev, added])
        }
      } catch (error) {
        console.error('Error saving housing:', error)
      }
    } else {
      if (editingApp) {
        setApplications(prev => prev.map(a => a.id === editingApp.id ? { ...data, id: editingApp.id } : a))
      } else {
        const newApp = { ...data, id: Date.now().toString() }
        setApplications(prev => [...prev, newApp])
      }
    }
    setIsModalOpen(false)
    setEditingApp(undefined)
  }

  const handleDelete = async () => {
    if (appToDelete) {
      if (user) {
        try {
          await dbHousing.delete(user.uid, appToDelete)
        } catch (error) {
          console.error('Error deleting housing:', error)
        }
      }
      setApplications(prev => prev.filter(a => a.id !== appToDelete))
      setAppToDelete(null)
      setConfirmOpen(false)
    }
  }

  if (!isClient || !mounted) {
    return (
      <Layout>
        <Loading text="Loading housing tracker..." />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Housing Search</h1>
            <p className="text-muted-foreground">Track your WG and Dormitory applications</p>
          </div>
          <Button onClick={() => { setEditingApp(undefined); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </Button>
        </div>

        {/* Housing Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold text-foreground">{applications.length}</p>
              </div>
              <Home className="h-8 w-8 text-primary/60" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interviews</p>
                <p className="text-2xl font-bold text-warning">
                  {applications.filter(a => a.status === 'Interview/Viewing').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offered</p>
                <p className="text-2xl font-bold text-info">
                  {applications.filter(a => a.status === 'Offered' || a.status === 'Accepted').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <Card className="bg-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Popular Housing Platforms in Germany</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open('https://www.wg-gesucht.de/', '_blank')}>
              WG-Gesucht <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://www.immoscout24.de/', '_blank')}>
              ImmoScout24 <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://www.studierendenwerk-deutschland.de/', '_blank')}>
              Studierendenwerk <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Applications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app) => (
            <Card key={app.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{app.title}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 mr-1" /> {app.city} • {app.type}
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(app.status)}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Warmmiete (Rent):</span>
                    <span className="font-bold text-foreground">
                      {app.currency} {app.rent}/month
                    </span>
                  </div>
                  
                  {app.moveInDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Move-in Date:</span>
                      <span className="font-medium text-foreground">{formatDate(app.moveInDate)}</span>
                    </div>
                  )}
                </div>

                {app.notes && (
                  <div>
                    <h4 className="font-medium text-foreground mb-1 text-sm">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">{app.notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingApp(app); setIsModalOpen(true); }}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-danger hover:text-danger/80" onClick={() => { setAppToDelete(app.id); setConfirmOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {app.website && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(app.website, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Visit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingApp(undefined); }}
        title={editingApp ? "Edit Application" : "Add Application"}
      >
        <HousingForm
          initialData={editingApp}
          onSubmit={handleAddOrUpdate}
          onCancel={() => { setIsModalOpen(false); setEditingApp(undefined); }}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setAppToDelete(null); }}
        onConfirm={handleDelete}
        title="Delete Application"
        message="Are you sure you want to delete this housing application? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </Layout>
  )
}
