import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NestCare — Trusted Childcare Marketplace",
  description: "Book background-checked childcare providers for in-home babysitting, after-school pickups, and overnight care.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg dark:bg-slate-950 text-stone-900 dark:text-slate-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="top-right"
            closeButton
            toastOptions={{
              classNames: {
                toast: "group toast bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-stone-200/60 dark:border-slate-800 text-stone-900 dark:text-slate-100 rounded-2xl shadow-xl p-4 flex gap-3 items-center !font-sans",
                title: "text-xs font-bold leading-normal",
                description: "text-[11px] text-stone-500 dark:text-slate-400 font-semibold leading-relaxed",
                actionButton: "bg-primary text-white text-xs font-bold rounded-xl px-3 py-1.5 hover:bg-emerald-800 transition-colors",
                cancelButton: "bg-stone-150 dark:bg-slate-800 text-stone-700 dark:text-slate-300 text-xs font-bold rounded-xl px-3 py-1.5 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors",
                closeButton: "hover:bg-stone-100 dark:hover:bg-slate-800 border-none transition-colors",
                success: "!border-l-4 !border-l-emerald-500 dark:!border-l-emerald-400",
                error: "!border-l-4 !border-l-rose-500 dark:!border-l-rose-400",
                info: "!border-l-4 !border-l-sky-500 dark:!border-l-sky-400",
                warning: "!border-l-4 !border-l-amber-500 dark:!border-l-amber-400",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
