import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { useAccount, useMsal } from "@azure/msal-react";
import { useEffect } from "react";


export default function Layout({ children }: { children: React.ReactNode }) {

   const { instance, accounts, inProgress } = useMsal();
    const account = useAccount(accounts[0] || {});

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
    
      <main className="flex-1">
        {/* <SidebarTrigger /> */}
        {children}
      </main>
    </SidebarProvider>
  )
}