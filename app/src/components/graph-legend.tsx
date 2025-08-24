import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

export function GraphLegend() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Legend</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="space-y-4 px-2 text-sm">
          {/* Node Colors */}
          <div>
            <h4 className="font-medium mb-2">Node Colors (Benefit)</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span>Low Benefit (Red)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
                <span>Neutral Benefit (White)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>High Benefit (Green)</span>
              </div>
            </div>
          </div>

          {/* Node Sizes */}
          <div>
            <h4 className="font-medium mb-2">Node Sizes</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Low Desirability</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                <span>High Desirability</span>
              </div>
            </div>
          </div>

          {/* Axes */}
          <div>
            <h4 className="font-medium mb-2">Axes</h4>
            <div className="space-y-1">
              <div>X-axis: Feasibility →</div>
              <div>Y-axis: Viability ↑</div>
            </div>
          </div>

          {/* Link Types */}
          <div>
            <h4 className="font-medium mb-2">Connections</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }}></div>
                <span>Positive Synergy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }}></div>
                <span>Negative Dissynergy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gray-500"></div>
                <span>→ Prerequisite</span>
              </div>
            </div>
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}