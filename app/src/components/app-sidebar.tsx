import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { GraphLegend } from "@/components/graph-legend";
import {
  ProjectSelection,
  type DataSource,
} from "@/components/project-selection";
import { SelectedItemDetails } from "@/components/selected-item-details";
import type { SampleNode, SampleLink } from "@/example-data.types";

interface AppSidebarProps {
  selectedDataSource: DataSource;
  onDataSourceChange: (dataSource: DataSource) => void;
  selectedNode: SampleNode | null;
  allNodes: SampleNode[];
  allLinks: SampleLink[];
}

export function AppSidebar({
  selectedDataSource,
  onDataSourceChange,
  selectedNode,
  allNodes,
  allLinks,
}: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-lg font-semibold p-4">Impact Map</h2>
      </SidebarHeader>
      <SidebarContent className="text-left">
        <ProjectSelection
          selectedDataSource={selectedDataSource}
          onDataSourceChange={onDataSourceChange}
        />
        <SelectedItemDetails
          selectedNode={selectedNode}
          allNodes={allNodes}
          allLinks={allLinks}
        />
        <GraphLegend />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
