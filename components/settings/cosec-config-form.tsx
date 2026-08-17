"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface CosecConfig {
  baseUrl: string;
  baseUrlSource: "override" | "env";
  username: string;
  usernameSource: "override" | "env";
  passwordSet: boolean;
  passwordSource: "override" | "env";
}

interface ModeStatus {
  direct: "connected" | "error" | "checking";
  agent: "connected" | "error" | "not_configured" | "checking";
}

export function CosecConfigForm() {
  const [config, setConfig] = useState<CosecConfig | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mode, setMode] = useState<ModeStatus>({ direct: "checking", agent: "checking" });

  useEffect(() => {
    fetch("/api/config/cosec")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setConfig(json.data);
          setBaseUrl(json.data.baseUrl);
          setUsername(json.data.username);
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/health")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMode({
            direct: json.data.cosec?.status === "connected" ? "connected" : "error",
            agent: json.data.agent?.status ?? "not_configured",
          });
        }
      })
      .catch(() => setMode({ direct: "error", agent: "not_configured" }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = { baseUrl, username };
      if (password) body.password = password;
      const res = await fetch("/api/config/cosec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to save");
      toast.success("COSEC configuration saved.");
      setPassword("");
      const refreshed = await fetch("/api/config/cosec").then((r) => r.json());
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
      const res = await fetch("/api/cosec/test");
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
        <CardTitle>COSEC</CardTitle>
        <CardDescription>
          Connection to the COSEC device API. Values are stored server-side only and never sent to the browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Direct connection</span>
          <Badge variant={mode.direct === "connected" ? "default" : "destructive"}>
            {mode.direct === "checking" ? "Checking…" : mode.direct === "connected" ? "Reachable" : "Unreachable"}
          </Badge>
          <span className="text-sm text-muted-foreground">Agent relay</span>
          <Badge variant={mode.agent === "connected" ? "default" : mode.agent === "error" ? "destructive" : "outline"}>
            {mode.agent === "checking"
              ? "Checking…"
              : mode.agent === "connected"
                ? "Connected"
                : mode.agent === "error"
                  ? "Not reporting"
                  : "Not set up"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          On a cloud deployment (Vercel etc.), Direct will normally show Unreachable — the COSEC device is on a
          private LAN and the cloud can&apos;t reach it directly. That&apos;s expected, not an error: Agent relay
          (see <code className="rounded bg-muted px-1 py-0.5">/agent/cosec-agent</code>) is what actually gets COSEC
          data into this deployment when Direct isn&apos;t possible. Self-hosting on the same network as the device
          instead makes Direct the one that matters.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cosec-base-url">Base URL</Label>
            <Input
              id="cosec-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://192.168.0.107:85"
            />
            <p className="text-xs text-muted-foreground">
              Source: {config?.baseUrlSource === "override" ? "saved override" : "environment variable"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cosec-username">Username</Label>
            <Input id="cosec-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="HR" />
            <p className="text-xs text-muted-foreground">
              Source: {config?.usernameSource === "override" ? "saved override" : "environment variable"}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cosec-password">Password</Label>
            <Input
              id="cosec-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config?.passwordSet ? "•••••••• (leave blank to keep)" : "Not set"}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Source: {config?.passwordSource === "override" ? "saved override" : "environment variable"}
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
