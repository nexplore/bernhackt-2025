import * as d3 from "d3";
import type React from "react";
import { ForceGraph, type ForceGraphData } from "./forcegraph";

export type SampleNode = {
  id: string;
  group: string;
  feasibility: number; // feasibility
  viability: number; // viability
  size: number; // desirability
  benefit: number;
};

export type SampleLink = {
  source: string;
  target: string;
  attractionX: number;
  attractionY: number;
};

export const SampleForceGraph: React.FC = () => {
  const data: ForceGraphData<SampleNode, SampleLink> = {
    nodes: [
      // x: feasiblity
      // y: viablity
      // size: desirability
      // color: benefit

      // TBD:
      // framing parameters: MUST
      // Green shadow: Universal Synergy

      {
        id: "1",
        group: "Google Pay Debit",
        feasibility: 0.5,
        viability: 0.3,
        size: 5,
        benefit: 0.8,
      },
      {
        id: "2",
        group: "Customer Data Mgmt",
        feasibility: 0.25,
        viability: 0.75,
        size: 6,
        benefit: 0,
      },
      {
        id: "3",
        group: "Twint",
        feasibility: 0.3,
        viability: 0.4,
        size: 3,
        benefit: -0.6,
      },
      {
        id: "4",
        group: "Instant Payments",
        feasibility: 0.7,
        viability: 0.5,
        size: 8,
        benefit: 0.1,
      },
    ],
    links: [
      // Voraussetzung: Arrow
      // Dissynergie: Red dashed
      // Synergie: Green dashed
      { source: "1", target: "2", attractionX: 0.5, attractionY: 0.1 },
      { source: "2", target: "3", attractionX: 0.1, attractionY: 0.2 },
      { source: "3", target: "4", attractionX: -0.1, attractionY: -0.02 },
      { source: "4", target: "1", attractionX: 0.3, attractionY: 0.4 },
    ],
  };

  return (
    <ForceGraph
      xLabel="Feasibility"
      yLabel="Viability"
      nodes={data.nodes}
      links={data.links}
      linkStrength={(link) => attractionDist(link) / 10}
      // linkStrengthX={link => link.attractionX }
      // linkStrengthY={link => link.attractionY  }
      linkMarker={(link) =>
        attractionDist(link) > 0
          ? { type: "arrow", size: 6 }
          : { type: "none", size: 0 }
      }
      linkStroke={(link) =>
        attractionDist(link) > 0.01
          ? "green"
          : attractionDist(link) < 0.01
          ? "red"
          : "gray"
      }
      nodePosition={(node, { width, height }) => ({
        x: node.feasibility * width,
        y: node.viability * height,
      })}
      nodeRadius={(node) => node.size * 15}
      nodeTitle={(node) => node.group}
      nodeFill={(node) => {
        // node.sentiment: -1 (red), 0 (white), 1 (green)
        if (node.benefit <= 0) {
          // Blend from red to white
          return d3.interpolateRgb("red", "white")(node.benefit + 1);
        } else {
          // Blend from white to green
          return d3.interpolateRgb("white", "green")(node.benefit);
        }
      }}
    />
  );
};

function attractionDist(link: SampleLink) {
  return (
    Math.sign(link.attractionX + link.attractionY) *
    Math.sqrt(link.attractionX ** 2 + link.attractionY ** 2)
  );
}
