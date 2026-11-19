import React, { useState } from 'react';
import { Pencil, Pin, PinOff, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { confirmDialog } from '@/components/ui/confirm';
import { formatPeruDateTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useDeleteSchoolNote,
  useSaveSchoolNote,
  useSchoolNotes,
  type SchoolNote,
} from '../../api/usePlatform';
import { IconButton } from '../ui-bits';

interface SchoolNotesCardProps {
  schoolId: string;
}

/** Notas internas del equipo de la plataforma (el colegio no las ve) */
export const SchoolNotesCard: React.FC<SchoolNotesCardProps> = ({ schoolId }) => {
  const { data: notes, isLoading } = useSchoolNotes(schoolId);
  const { mutate: saveNote, isPending } = useSaveSchoolNote(schoolId);
  const { mutate: deleteNote } = useDeleteSchoolNote(schoolId);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  const add = () => {
    if (!draft.trim()) return;
    saveNote(
      { body: draft.trim() },
      {
        onSuccess: () => setDraft(''),
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo guardar la nota.')),
      },
    );
  };

  const saveEdit = () => {
    if (!editing?.body.trim()) return;
    saveNote(
      { id: editing.id, body: editing.body.trim() },
      {
        onSuccess: () => setEditing(null),
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo guardar la nota.')),
      },
    );
  };

  const togglePin = (note: SchoolNote) => saveNote({ id: note.id, pinned: !note.pinned });

  const remove = async (note: SchoolNote) => {
    const confirmed = await confirmDialog({
      title: '¿Eliminar esta nota interna?',
      description: 'No se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    });
    if (confirmed) {
      deleteNote(note.id, {
        onError: (err) => toast.error(getApiErrorMessage(err, 'No se pudo eliminar la nota.')),
      });
    }
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" /> Notas internas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Solo las ve el equipo de la plataforma. Ej.: “llamar en marzo”, “pidió descuento”.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe una nota…"
            maxLength={4000}
            rows={2}
            className="text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={add}
              disabled={!draft.trim()}
              isLoading={isPending && !editing}
            >
              Agregar nota
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !notes?.length ? (
          <p className="text-xs text-muted-foreground">Todavía no hay notas.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`rounded-xl border p-3 text-sm ${note.pinned ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
              >
                {editing?.id === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={editing.body}
                      onChange={(e) => setEditing({ id: note.id, body: e.target.value })}
                      maxLength={4000}
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={saveEdit}
                        disabled={!editing.body.trim()}
                        isLoading={isPending}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-line text-foreground">{note.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatPeruDateTime(note.createdAt)}
                        {note.authorEmail ? ` · ${note.authorEmail}` : ''}
                      </span>
                      <div className="flex gap-0.5">
                        <IconButton label={note.pinned ? 'Desfijar' : 'Fijar arriba'} onClick={() => togglePin(note)}>
                          {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </IconButton>
                        <IconButton label="Editar" onClick={() => setEditing({ id: note.id, body: note.body })}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconButton>
                        <IconButton label="Eliminar" onClick={() => remove(note)} danger>
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconButton>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
