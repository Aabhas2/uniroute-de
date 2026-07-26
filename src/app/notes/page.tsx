'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Plus, Search, FileText, Calendar, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { mockNotes } from '@/data/mockData'
import { dbNotes } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { Note } from '@/types'
import { NoteForm } from '@/components/forms/NoteForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export default function NotesPage() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load data on mount / auth change
  useEffect(() => {
    setMounted(true)
    
    const loadNotes = async () => {
      if (user) {
        try {
          const cloudNotes = await dbNotes.fetch(user.uid)
          setNotes(cloudNotes)
        } catch (error) {
          console.error('Error fetching cloud notes:', error)
        }
      } else {
        try {
          const savedNotes = localStorage.getItem('notes')
          if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
              id: note.id || Date.now().toString(),
              title: note.title || 'Untitled',
              content: note.content || '',
              category: note.category || 'General',
              tags: Array.isArray(note.tags) ? note.tags : [],
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
              updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date()
            }))
            setNotes(parsedNotes)
          } else {
            setNotes(mockNotes)
          }
        } catch (error) {
          console.error('Error loading notes:', error)
          setNotes(mockNotes)
        }
      }
    }

    loadNotes()
  }, [user])

  // Save notes locally (guest mode only)
  useEffect(() => {
    if (mounted && !user) {
      localStorage.setItem('notes', JSON.stringify(notes))
    }
  }, [notes, mounted, user])

  const handleAddNote = () => {
    setEditingNote(undefined)
    setIsModalOpen(true)
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setIsModalOpen(true)
  }

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId)
    setConfirmOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return
    setIsDeleting(true)
    if (user) {
      try {
        await dbNotes.delete(user.uid, noteToDelete)
        setNotes(prev => prev.filter(n => n.id !== noteToDelete))
      } catch (error) {
        console.error('Error deleting note:', error)
      }
    } else {
      setNotes(notes.filter(n => n.id !== noteToDelete))
    }
    setIsDeleting(false)
    setConfirmOpen(false)
    setNoteToDelete(null)
  }

  const handleSaveNote = async (note: Note) => {
    if (editingNote) {
      if (user) {
        try {
          await dbNotes.update(user.uid, note)
          setNotes(prev => prev.map(n => n.id === note.id ? note : n))
        } catch (error) {
          console.error('Error updating note:', error)
        }
      } else {
        setNotes(notes.map(n => n.id === note.id ? note : n))
      }
    } else {
      if (user) {
        try {
          // Remove ID placeholder since Firestore generates one
          const { id, ...data } = note
          const added = await dbNotes.add(user.uid, data)
          setNotes(prev => [...prev, added])
        } catch (error) {
          console.error('Error adding note:', error)
        }
      } else {
        setNotes([...notes, note])
      }
    }
    setIsModalOpen(false)
    setEditingNote(undefined)
  }

  const handleCancelEdit = () => {
    setIsModalOpen(false)
    setEditingNote(undefined)
  }

  // Memoized categories calculation from actual notes list
  const categories = useMemo(() => ['all', ...Array.from(new Set(notes.map(note => note.category).filter(Boolean)))], [notes])
  
  // Simple filtered notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm === '' || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // NoteCard component
  const NoteCard = ({ note }: { note: Note }) => (
    <Card className="hover:shadow-md transition-shadow gpu-accelerated">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{note.title}</CardTitle>
          <Badge variant="default">{note.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground overflow-hidden line-clamp-3">
          {note.content}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {(note.tags || []).map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="info" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(note.updatedAt)}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleEditNote(note)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleDeleteNote(note.id)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // Show loading during SSR
  if (!mounted) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your notes...</p>
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
            <h1 className="text-2xl font-bold text-foreground">Notes</h1>
            <p className="text-muted-foreground">Organize your research and study notes</p>
          </div>
          <Button onClick={handleAddNote}>
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category: string) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'All Categories' : category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Notes</p>
                <p className="text-2xl font-bold text-foreground">{notes.length}</p>
              </div>
              <FileText className="h-8 w-8 text-info" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">{Math.max(0, categories.length - 1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tags</p>
                <p className="text-2xl font-bold text-foreground">
                  {Array.from(new Set(notes.flatMap(note => note.tags || []))).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-foreground">
                  {notes.filter(note => {
                    const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt)
                    const now = new Date()
                    return noteDate.getMonth() === now.getMonth() && 
                           noteDate.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No notes found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first note.'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all') && (
                <div className="mt-6">
                  <Button onClick={handleAddNote}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal for Add/Edit Note */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCancelEdit}
          title={editingNote ? 'Edit Note' : 'Add New Note'}
        >
          <NoteForm
            note={editingNote}
            onSave={handleSaveNote}
            onCancel={handleCancelEdit}
          />
        </Modal>

        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => { setConfirmOpen(false); setNoteToDelete(null) }}
          onConfirm={confirmDeleteNote}
          title="Delete Note?"
          message="This will permanently delete this note. This action cannot be undone."
          confirmLabel="Delete Note"
          isLoading={isDeleting}
        />
      </div>
    </Layout>
  )
} 