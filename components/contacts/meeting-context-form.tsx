import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MeetingContextFormProps {
  values: {
    event_name?: string;
    location?: string;
    date_met?: string;
    initial_context?: string;
  };
  onChange: (field: string, value: string) => void;
}

export function MeetingContextForm({
  values,
  onChange,
}: MeetingContextFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Where you met</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="event_name">Event / Conference</Label>
          <Input
            id="event_name"
            value={values.event_name ?? ""}
            onChange={(e) => onChange("event_name", e.target.value)}
            placeholder="React Summit 2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date_met">Date</Label>
          <Input
            id="date_met"
            type="date"
            value={values.date_met ?? ""}
            onChange={(e) => onChange("date_met", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={values.location ?? ""}
            onChange={(e) => onChange("location", e.target.value)}
            placeholder="Amsterdam, Booth 42"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="initial_context">First impression / context</Label>
          <Textarea
            id="initial_context"
            value={values.initial_context ?? ""}
            onChange={(e) => onChange("initial_context", e.target.value)}
            placeholder="Talked about their startup, interested in hiring..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
