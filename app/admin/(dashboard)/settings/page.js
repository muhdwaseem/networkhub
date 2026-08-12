import { getSettings } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Site Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Controls the contact details, WhatsApp number, logo and hero image used across the site.
      </p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
