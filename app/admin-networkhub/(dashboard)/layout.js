import { getSettings } from "@/lib/db";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminDashboardLayout({ children }) {
  const settings = await getSettings();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav businessName={settings.businessName} />
      <div className="container-page py-8">{children}</div>
    </div>
  );
}
