import { CosecConfigForm } from "@/components/settings/cosec-config-form";
import { FrappeConfigForm } from "@/components/settings/frappe-config-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure integrations used by this dashboard.</p>
      </div>
      <CosecConfigForm />
      <FrappeConfigForm />
    </div>
  );
}
