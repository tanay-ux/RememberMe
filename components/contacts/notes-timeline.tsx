"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <section className="space-y-6">
      <h3 className="text-sm font-semibold text-foreground">Notes</h3>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <Textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you talk about?"
          rows={3}
          className="min-h-24 rounded-lg resize-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={noteType}
            onValueChange={(v) => v && setNoteType(v as NoteType)}
          >
            <SelectTrigger className="h-9 w-36 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-lg px-4"
          >
            Add note
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {notes.map((note) => (
            <li key={note.id} className="py-5 first:pt-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary">
                      {NOTE_TYPE_LABELS[note.note_type]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format(note.created_at, "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    {note.body}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-lg text-muted-foreground"
                  onClick={() => void handleDelete(note.id)}
                >
                  <Trash2 className="size-4 stroke-[1.5]" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
