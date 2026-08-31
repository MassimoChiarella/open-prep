import type { Metadata, Viewport } from "next";

import { LocalizedAppShell } from "@/components/LocalizedAppShell";
import { ServiceWorkerRegistration } from "@/features/offline/ServiceWorkerRegistration";
import { themeInitializationScript } from "@/features/theme/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Open Prep",
    template: "%s | Open Prep"
  },
  applicationName: "Open Prep",
  description: "Open-source, accessible, local-first consulting interview preparation with offline support.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Open Prep"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/icons/app-icon.svg"
      },
      {
        rel: "icon",
        sizes: "192x192",
        type: "image/png",
        url: "/icons/app-icon-192.png"
      },
      {
        rel: "icon",
        sizes: "512x512",
        type: "image/png",
        url: "/icons/app-icon-512.png"
      }
    ],
    apple: [
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        type: "image/png",
        url: "/icons/apple-touch-icon-180.png"
      }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { color: "#f2f2ee", media: "(prefers-color-scheme: light)" },
    { color: "#20211f", media: "(prefers-color-scheme: dark)" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html dir="ltr" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="font-sans antialiased">
        <LocalizedAppShell>{children}</LocalizedAppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
