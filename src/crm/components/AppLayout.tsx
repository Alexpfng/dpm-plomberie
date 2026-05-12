import { SidebarProvider, SidebarTrigger } from "@/crm/components/ui/sidebar";
import { AppSidebar } from "@/crm/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-3 bg-card shrink-0">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
