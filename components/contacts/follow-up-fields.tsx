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
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Follow-up</h3>

      <div className="space-y-1.5">
        <Label>Willing to refer later?</Label>
        <Select
          value={willingToRefer}
          onValueChange={(v) => v && onWillingChange(v as ReferralStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(REFERRAL_LABELS) as ReferralStatus[]).map((key) => (
              <SelectItem key={key} value={key}>
                {REFERRAL_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reminder_at">Remind me to reach out</Label>
        <Input
          id="reminder_at"
          type="date"
          value={reminderDate}
          onChange={(e) => onReminderDateChange(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
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
              size="xs"
              onClick={() => onReminderDateChange(daysFromNow(preset.days))}
            >
              {preset.label}
            </Button>
          ))}
          {reminderDate && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onReminderDateChange("")}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reminder_note">Reminder note</Label>
        <Input
          id="reminder_note"
          value={reminderNote}
          onChange={(e) => onReminderNoteChange(e.target.value)}
          placeholder="Ask about referral / send portfolio"
        />
      </div>
    </div>
  );
}
