import type { Metadata, Viewport } from "next";

import { LocalizedAppShell } from "@/components/LocalizedAppShell";
import { ServiceWorkerRegistration } from "@/features/offline/ServiceWorkerRegistration";
import { themeInitializationScript } from "@/features/theme/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Consulting Mental Math Practice",
    template: "%s | Consulting Mental Math Practice"
  },
  applicationName: "Consulting Mental Math Practice",
  description: "A private, local-first consulting mental math practice web app.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mental Math Practice"
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
      }
    ],
    apple: [
      {
        rel: "apple-touch-icon",
        url: "/icons/maskable-icon.svg"
      }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#20211f"
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
