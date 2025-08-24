import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"

export default function Layout({children}: { children: React.ReactNode }) {
    return (
        <SidebarProvider defaultOpen={false}>
            <AppSidebar/>

            <main className="flex-1">
                {/* <SidebarTrigger /> */}
                {children}
            </main>
        </SidebarProvider>
    )
}