"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReferralStatus } from "@/lib/db/schema";
import { REFERRAL_LABELS } from "@/lib/db/schema";

interface FollowUpFieldsProps {
  willingToRefer: ReferralStatus;
  reminderDate: string;
  reminderNote: string;
  onWillingChange: (v: ReferralStatus) => void;
  onReminderDateChange: (v: string) => void;
  onReminderNoteChange: (v: string) => void;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FollowUpFields({
  willingToRefer,
  reminderDate,
  reminderNote,
  onWillingChange,
  onReminderDateChange,
  onReminderNoteChange,
}: FollowUpFieldsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          Follow-up
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Set a reminder and note so you actually follow through.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-base">Willing to refer later?</Label>
        <Select
          value={willingToRefer}
          onValueChange={(v) => v && onWillingChange(v as ReferralStatus)}
        >
          <SelectTrigger className="h-11 w-full min-w-0 rounded-lg px-3.5 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(REFERRAL_LABELS) as ReferralStatus[]).map((key) => (
              <SelectItem key={key} value={key} className="text-base">
                {REFERRAL_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label htmlFor="reminder_at" className="text-base">
          Remind me to reach out
        </Label>
        <Input
          id="reminder_at"
          type="date"
          value={reminderDate}
          onChange={(e) => onReminderDateChange(e.target.value)}
          className="h-11 text-base"
        />
        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { label: "3 days", days: 3 },
            { label: "1 week", days: 7 },
            { label: "2 weeks", days: 14 },
            { label: "1 month", days: 30 },
          ].map((preset) => (
            <Button
              key={preset.days}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-lg px-3 text-sm"
              onClick={() => onReminderDateChange(daysFromNow(preset.days))}
            >
              {preset.label}
            </Button>
          ))}
          {reminderDate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg px-3 text-sm"
              onClick={() => onReminderDateChange("")}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="reminder_note" className="text-base">
          Reminder note
        </Label>
        <Input
          id="reminder_note"
          value={reminderNote}
          onChange={(e) => onReminderNoteChange(e.target.value)}
          placeholder="Reminder note"
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}
