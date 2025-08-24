import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SampleNode, SampleLink } from "@/example-data.types";

interface SelectedItemDetailsProps {
  selectedNode: SampleNode | null;
  allNodes: SampleNode[];
  allLinks: SampleLink[];
}

export function SelectedItemDetails({
  selectedNode,
  allNodes,
  allLinks,
}: SelectedItemDetailsProps) {
  if (!selectedNode) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Selection Details</SidebarGroupLabel>
        <SidebarGroupContent className="px-2 ">
          <p className="text-sm text-muted-foreground">
            Click on a node in the graph to see details
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Find connections for the selected node
  const connections = allLinks.filter(
    (link) => link.source === selectedNode.id || link.target === selectedNode.id
  );

  // Separate positive and negative synergies
  const positiveSynergies: Array<{ nodeId: string; attraction: number }> = [];
  const negativeSynergies: Array<{ nodeId: string; attraction: number }> = [];

  connections.forEach((link) => {
    const attraction = Math.sqrt(link.attractionX ** 2 + link.attractionY ** 2);
    const isPositive = link.attractionX + link.attractionY > 0;
    const connectedNodeId =
      link.source === selectedNode.id ? link.target : link.source;

    if (isPositive) {
      positiveSynergies.push({ nodeId: connectedNodeId, attraction });
    } else {
      negativeSynergies.push({ nodeId: connectedNodeId, attraction });
    }
  });

  // Helper to get node name by ID
  const getNodeName = (nodeId: string) => {
    const node = allNodes.find((n) => n.id === nodeId);
    return node?.group || nodeId;
  };

  // Helper to format numbers
  const formatNumber = (num: number) => Math.round(num * 100) / 100;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Selection Details</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="space-y-4 px-2">
          {/* Selected Node Details */}
          <div>
            <h4 className="font-medium mb-2">{selectedNode.group}</h4>
            <div className="space-y-1 text-sm">
              <div>
                Feasibility:{" "}
                <Badge variant="secondary">
                  {formatNumber(selectedNode.feasibility)}
                </Badge>
              </div>
              <div>
                Viability:{" "}
                <Badge variant="secondary">
                  {formatNumber(selectedNode.viability)}
                </Badge>
              </div>
              <div>
                Benefit:{" "}
                <Badge
                  variant={
                    selectedNode.benefit > 0.1
                      ? "default"
                      : selectedNode.benefit < -0.1
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {formatNumber(selectedNode.benefit)}
                </Badge>
              </div>
              <div>
                Size: <Badge variant="outline">{selectedNode.size}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Connections Overview */}
          <div>
            <h4 className="font-medium mb-2">
              Connections ({connections.length})
            </h4>
            {connections.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No connections found
              </p>
            )}
          </div>

          {/* Positive Synergies */}
          {positiveSynergies.length > 0 && (
            <>
              <div>
                <h5 className="font-medium text-green-600 mb-2">
                  Positive Synergies ({positiveSynergies.length})
                </h5>
                <div className="space-y-1">
                  {positiveSynergies.map(({ nodeId, attraction }) => (
                    <div
                      key={nodeId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{getNodeName(nodeId)}</span>
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        +{formatNumber(attraction)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Negative Synergies */}
          {negativeSynergies.length > 0 && (
            <>
              <div>
                <h5 className="font-medium text-red-600 mb-2">
                  Negative Dissynergies ({negativeSynergies.length})
                </h5>
                <div className="space-y-1">
                  {negativeSynergies.map(({ nodeId, attraction }) => (
                    <div
                      key={nodeId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>{getNodeName(nodeId)}</span>
                      <Badge variant="destructive">
                        -{formatNumber(attraction)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
