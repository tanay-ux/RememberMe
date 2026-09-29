"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addNote, deleteNote } from "@/lib/db/contacts";
import type { Note, NoteType } from "@/lib/db/schema";
import { NOTE_TYPE_LABELS } from "@/lib/utils/format";
import { noteFormSchema } from "@/lib/validation/contact";

interface NotesTimelineProps {
  contactId: string;
  notes: Note[];
  onNotesChange: () => void;
}

export function NotesTimeline({
  contactId,
  notes,
  onNotesChange,
}: NotesTimelineProps) {
  const [body, setBody] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = noteFormSchema.safeParse({ body, note_type: noteType });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid note");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addNote(contactId, body, noteType);
      setBody("");
      onNotesChange();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    await deleteNote(noteId);
    onNotesChange();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Notes & conversations</h3>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="note-body">Add a note</Label>
          <Textarea
            id="note-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Follow up about their product launch..."
            rows={3}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={noteType}
            onValueChange={(v) => v && setNoteType(v as NoteType)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={submitting}>
            Add note
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border bg-card p-3 text-card-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {NOTE_TYPE_LABELS[note.note_type]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(note.created_at, "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => void handleDelete(note.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
