import { BottomNav } from '@/components/navigation/bottom-nav';
import { SidebarNav } from '@/components/navigation/sidebar-nav';
import { HeaderBar } from '@/components/navigation/header-bar';
import { OnboardingBanner } from '@/components/onboarding/onboarding-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-bg">
      <SidebarNav />
      <div className="flex-1 flex flex-col min-h-screen">
        <HeaderBar />
        {/* Main Content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Sitter onboarding prompt — auto-hidden for parents and complete sitters */}
            <OnboardingBanner />
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

