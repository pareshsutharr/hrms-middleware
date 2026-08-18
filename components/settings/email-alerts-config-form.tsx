"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FREQUENCY_OPTIONS = [
  { value: "every", label: "Every push attempt (success or failure)" },
  { value: "changes_and_failures", label: "Only when something changed or failed" },
  { value: "failures_only", label: "Only on failure" },
  { value: "off", label: "Off (no emails)" },
] as const;

interface EmailConfig {
  recipientEmail: string;
  recipientEmailSource: "override" | "env";
  frequency: string;
  frequencySource: "override" | "default";
}

export function EmailAlertsConfigForm() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [frequency, setFrequency] = useState<string>("every");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/config/email")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setConfig(json.data);
          setRecipientEmail(json.data.recipientEmail);
          setFrequency(json.data.frequency);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/config/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail, frequency }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to save");
      toast.success("Email alert settings saved.");
      const refreshed = await fetch("/api/config/email").then((r) => r.json());
      if (refreshed.success) setConfig(refreshed.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!recipientEmail) {
      toast.error("Enter a recipient email first.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/config/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientEmail }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to send test email");
      toast.success(`Test email sent to ${recipientEmail}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading configuration…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Alerts</CardTitle>
        <CardDescription>
          Notifications for every COSEC → Frappe checkin push (agent auto-push, daily catch-up, and manual sync).
          Sent via the SMTP relay configured in environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email-recipient">Recipient email</Label>
            <Input
              id="email-recipient"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <p className="text-xs text-muted-foreground">
              Source: {config?.recipientEmailSource === "override" ? "saved override" : "environment variable"}.
              Clear this field and save to turn alerts off entirely.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-frequency">Send</Label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value ?? "every")}>
              <SelectTrigger id="email-frequency" className="w-full">
                <SelectValue placeholder="Select frequency">
                  {(value: string | null) => FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? "Select frequency"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Source: {config?.frequencySource === "override" ? "saved override" : "default"}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send Test Email
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
