"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useTenant } from "../app/TenantContext";
import Link from "next/link";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { tenant, loading } = useTenant();

  if (!loading && tenant && tenant.licenseValid === false) {
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/login')) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '1rem' }}>System Locked</h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>{tenant.licenseReason || 'The system license is invalid or has expired.'}</p>
          <Link href="/login" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.375rem', textDecoration: 'none', fontWeight: '500' }}>
            Go to Admin Login
          </Link>
        </div>
      );
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
