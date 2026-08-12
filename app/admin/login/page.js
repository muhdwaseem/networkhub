import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSettings } from "@/lib/db";
import LoginForm from "@/components/admin/LoginForm";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage() {
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src={settings.logo} alt={settings.businessName} width={160} height={40} className="h-9 w-auto" />
          <h1 className="mt-6 text-xl font-bold text-ink-900">Admin Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Manage products, images and site settings.</p>
        </div>

        <div className="card p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-brand-700 hover:text-brand-600">
            &larr; Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
