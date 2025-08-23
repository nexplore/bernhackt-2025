import { ForceGraph } from "@/components/core/forcegraph.tsx";
import { mappedExampleData, staticExampleData } from "@/example-data.util";
import * as d3 from "d3";
import { link } from "fs";
import type React from "react";

export type SampleLink = {
  source: string;
  target: string;
  attractionX: number;
  attractionY: number;
};

export const SampleForceGraph: React.FC = () => {
  const data = staticExampleData;

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
          : { type: "none", size: 0 }
      }
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
