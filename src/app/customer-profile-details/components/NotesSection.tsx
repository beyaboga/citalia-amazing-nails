'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Note {
  id: number;
  content: string;
  author: string;
  date: string;
  time: string;
}

interface NotesSectionProps {
  customerId: number;
}

const NotesSection = ({ customerId }: NotesSectionProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/customers/${customerId}/notes`);
        if (response.ok) {
          setNotes(await response.json());
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar la nota');

      setNotes(prev => [result, ...prev]);
      setNewNote('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar la nota');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <Icon name="DocumentTextIcon" size={24} className="text-primary" />
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Notas y Comunicaciones
        </h2>
      </div>

      <div className="mb-6">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Agregar nueva nota..."
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Icon name="PlusIcon" size={16} />
            <span className="caption font-medium">{isSaving ? 'Guardando...' : 'Agregar Nota'}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="UserCircleIcon" size={18} className="text-muted-foreground" />
                    <span className="caption font-medium text-foreground">{note.author}</span>
                  </div>
                  <span className="caption text-muted-foreground text-xs">
                    {note.date} - {note.time}
                  </span>
                </div>
                <p className="caption text-foreground">{note.content}</p>
              </div>
            ))}
          </div>

          {notes.length === 0 && (
            <div className="text-center py-12">
              <Icon name="DocumentTextIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay notas disponibles</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NotesSection;