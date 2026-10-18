import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/features/auth/auth-provider";
// fonts ship with the site, split by character range so pages only load what they show
import "@fontsource/dela-gothic-one/400.css";
import "@fontsource/m-plus-rounded-1c/500.css";
import "@fontsource/m-plus-rounded-1c/700.css";
import "@fontsource/m-plus-rounded-1c/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kana Dojo", template: "%s | Kana Dojo" },
  description: "Learn to read hiragana with an endless, timed reading game.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#10142e" },
  ],
};

// runs before paint so the saved theme never flashes
const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem("kana-dojo:v1:theme")||"null")||JSON.parse(localStorage.getItem("kana-dojo:v1:settings")||"{}").theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
