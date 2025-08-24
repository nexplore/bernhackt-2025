import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import type { DataSource } from "./project-selection"
import type { SampleNode, SampleLink } from "@/example-data.types"

interface LayoutProps {
  children: React.ReactNode;
  selectedDataSource: DataSource;
  onDataSourceChange: (dataSource: DataSource) => void;
  selectedNode: SampleNode | null;
  allNodes: SampleNode[];
  allLinks: SampleLink[];
}

export default function Layout({
  children, 
  selectedDataSource, 
  onDataSourceChange, 
  selectedNode, 
  allNodes, 
  allLinks
}: LayoutProps) {
    return (
        <SidebarProvider defaultOpen={true}>
            <AppSidebar
              selectedDataSource={selectedDataSource}
              onDataSourceChange={onDataSourceChange}
              selectedNode={selectedNode}
              allNodes={allNodes}
              allLinks={allLinks}
            />

            <main className="flex-1">
                {/* <SidebarTrigger /> */}
                {children}
            </main>
        </SidebarProvider>
    )
}