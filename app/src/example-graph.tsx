import { ForceGraph } from "@/components/forcegraph.tsx";
import { exampleDataStatic } from "@/example-data-static.ts";
import { exampleDataMapped } from "@/example-data.util";
import * as d3 from "d3";
import type React from "react";
import type { DataSource } from "@/components/project-selection";
import type { SampleNode } from "@/example-data.types";

export type SampleLink = {
  source: string;
  target: string;
  attractionX: number;
  attractionY: number;
};

interface ExampleForceGraphProps {
  selectedDataSource: DataSource;
  onNodeSelect: (node: SampleNode | null) => void;
}

/**
 * An example force-directed graph component using sample data.
 */
export const ExampleForceGraph: React.FC<ExampleForceGraphProps> = ({ 
  selectedDataSource, 
  onNodeSelect 
}) => {
  const data = selectedDataSource === 'mapped' ? exampleDataMapped : exampleDataStatic;

  const handleNodeClick = (node: any, selected: boolean) => {
    onNodeSelect(selected ? node : null);
  };

  return (
    <ForceGraph
      xLabel="Feasibility"
      yLabel="Viability"
      nodes={data.nodes}
      nodePosition={(node, { width, height }) => ({
        x: node.feasibility * width,
        y: node.viability * height,
      })}
      nodeRadius={(node) => node.size * 6}
      nodeTitle={(node) => node.group}
      nodeOnClick={handleNodeClick}
      nodeFill={(node) => {
        if (node.benefit <= 0) {
          // Blend from red to white
          return d3.interpolateRgb("red", "white")(node.benefit + 1);
        } else {
          // Blend from white to green
          return d3.interpolateRgb("white", "green")(node.benefit);
        }
      }}
      links={data.links}
      linkStrength={(link) => attractionDist(link) / 10}
      linkMarker={(link) =>
        attractionDist(link) > 0
          ? { type: "arrow-end", size: 6 }
          : attractionDist(link) < 0
          ? { type: "arrow-start", size: 6 }
          : { type: "none", size: 0 }
      }
      linkEndOffset={(link) => (attractionDist(link) < 0 ? 12 : 0)}
      linkStroke={(link) =>
        attractionDist(link) > 0.01
          ? "green"
          : attractionDist(link) < 0.01
          ? "red"
          : "gray"
      }
      linkStrokeStyle={(link) =>
        attractionDist(link) > 0.01
          ? "4 5"
          : attractionDist(link) < 0.01
          ? "2 10"
          : "1 1"
      }
    />
  );
};

function attractionDist(link: SampleLink) {
  return (
    Math.sign(link.attractionX + link.attractionY) *
    Math.sqrt(link.attractionX ** 2 + link.attractionY ** 2)
  );
}
