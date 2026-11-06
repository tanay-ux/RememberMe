import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagPicker } from "@/components/tags/tag-picker";

interface MeetingContextFormProps {
  value: string;
  onChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function MeetingContextForm({
  value,
  onChange,
  tags,
  onTagsChange,
}: MeetingContextFormProps) {
  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Meeting context
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Where you met, what you talked about, anything worth remembering.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="meeting_notes" className="sr-only">
          Meeting notes
        </Label>
        <Textarea
          id="meeting_notes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Where you met, what you talked about…"
          rows={5}
          className="min-h-32 rounded-lg resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Tags</Label>
        <TagPicker selected={tags} onChange={onTagsChange} />
      </div>
    </div>
  );
}
