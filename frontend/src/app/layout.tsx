import type { Metadata, Viewport } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientWrapper from "@/components/ClientWrapper";
import { TenantProvider } from '@/context/TenantContext';
import { ApolloWrapper } from "@/components/providers/ApolloWrapper";
import { AuthProvider } from '@/context/AuthContext';
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "NG-VMS — NextGen Visitor Management System",
    template: "%s | NG-VMS",
  },
  description:
    "NextGen Visitor Management System — A secure, real-time enterprise visitor tracking and approval platform by Print Electronics Equipments Pvt Ltd.",
  applicationName: "NG-VMS",
  keywords: ["visitor management", "VMS", "security", "enterprise", "biometric"],
  authors: [{ name: "Print Electronics Equipments Pvt Ltd" }],
  robots: "noindex, nofollow", // Internal enterprise tool — do not index
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NG-VMS",
  },
  formatDetection: { telephone: false },
  manifest: "manifest.json",
  icons: { icon: "favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#fdfbfb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <div className="bg-mesh" />
        <ErrorBoundary>
          <TenantProvider>
            <ApolloWrapper>
              <AuthProvider>
                <ClientWrapper>{children}</ClientWrapper>
              </AuthProvider>
            </ApolloWrapper>
          </TenantProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
