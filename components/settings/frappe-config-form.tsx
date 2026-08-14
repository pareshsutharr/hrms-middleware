"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface FrappeConfig {
  baseUrl: string;
  baseUrlSource: "override" | "env";
  apiKey: string;
  apiKeySource: "override" | "env";
  apiSecretSet: boolean;
  apiSecretSource: "override" | "env";
}

export function FrappeConfigForm() {
  const [config, setConfig] = useState<FrappeConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/config/frappe")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setConfig(json.data);
          setBaseUrl(json.data.baseUrl);
          setApiKey(json.data.apiKey);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = { baseUrl, apiKey };
      if (apiSecret) body.apiSecret = apiSecret;
      const res = await fetch("/api/config/frappe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to save");
      toast.success("Frappe HRMS configuration saved.");
      setApiSecret("");
      const refreshed = await fetch("/api/config/frappe").then((r) => r.json());
      if (refreshed.success) setConfig(refreshed.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/frappe/test");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Test failed");
      setTestResult(json.data);
      if (json.data.success) toast.success(json.data.message);
      else toast.error(json.data.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test failed";
      setTestResult({ success: false, message });
      toast.error(message);
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
        <CardTitle className="flex items-center gap-2">
          Frappe HRMS <Badge variant="outline">Phase 2</Badge>
        </CardTitle>
        <CardDescription>
          Connection to your Frappe HRMS instance. Values are stored server-side only and never sent to the
          browser. See the README for how to generate an API Key/Secret.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="frappe-base-url">Base URL</Label>
            <Input
              id="frappe-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://hr.yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Source: {config?.baseUrlSource === "override" ? "saved override" : "environment variable"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frappe-api-key">API Key</Label>
            <Input id="frappe-api-key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" />
            <p className="text-xs text-muted-foreground">
              Source: {config?.apiKeySource === "override" ? "saved override" : "environment variable"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frappe-api-secret">API Secret</Label>
            <Input
              id="frappe-api-secret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={config?.apiSecretSet ? "•••••••• (leave blank to keep)" : "Not set"}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Source: {config?.apiSecretSource === "override" ? "saved override" : "environment variable"}
            </p>
          </div>
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
              testResult.success
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {testResult.success ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            {testResult.message}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing && <Loader2 className="size-4 animate-spin" />} Test Connection
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Save Configuration
        </Button>
      </CardFooter>
    </Card>
  );
}
