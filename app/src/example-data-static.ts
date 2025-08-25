import type { ForceGraphData } from "@/components/forcegraph.tsx";
import type { SampleLink, SampleNode } from "@/example-data.types.ts";
import { colorMap } from "@/example-data.types.ts";

export const exampleDataStatic: ForceGraphData<SampleNode, SampleLink> = {
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
      group: "Google Wallet",
      feasibility: 0.5,
      viability: 0.3,
      size: 3,
      benefit: 0.4,
      color: colorMap.transaktionen,
    },
    {
      id: "2",
      group: "Hanfkreditkarten",
      feasibility: 0.25,
      viability: 0.75,
      size: 6,
      benefit: -0.2,
      color: colorMap.zinsgeschaeft,
    },
    {
      id: "3",
      group: "Twint",
      feasibility: 0.3,
      viability: 0.4,
      size: 4,
      benefit: 0.6,
      color: colorMap.transaktionen,
    },
    {
      id: "4",
      group: "Instant Payments",
      feasibility: 0.7,
      viability: 0.5,
      size: 2,
      benefit: 0.1,
      color: colorMap.transaktionen,
    },
    {
      id: "5",
      group: "Apple Pay",
      feasibility: 0.8,
      viability: 0.8,
      size: 2,
      benefit: 0.5,
      color: colorMap.transaktionen,
    },
    {
      id: "6",
      group: "Open Banking API",
      feasibility: 0.6,
      viability: 0.7,
      size: 5,
      benefit: 0.7,
      color: colorMap.transaktionen,
    },
    {
      id: "7",
      group: "Loyalty & Rewards",
      feasibility: 0.4,
      viability: 0.6,
      size: 4,
      benefit: 0.5,
      color: colorMap.kundenzufriedenheit,
    },
    {
      id: "8",
      group: "POS Integration",
      feasibility: 0.7,
      viability: 0.2,
      size: 3,
      benefit: 0.2,
      color: colorMap.transaktionen,
    },
    {
      id: "9",
      group: "Cross-border Payments",
      feasibility: 0.15,
      viability: 0.15,
      size: 4,
      benefit: 0.3,
      color: colorMap.transaktionen,
    },
    {
      id: "10",
      group: "Digital Identity",
      feasibility: 0.5,
      viability: 0.45,
      size: 6,
      benefit: 0.6,
      color: colorMap.mitarbeiterzufriedenheit, // used for identity here
    },
    {
      id: "11",
      group: "Merchant Financing",
      feasibility: 0.2,
      viability: 0.9,
      size: 3,
      benefit: -0.1,
      color: colorMap.zinsgeschaeft,
    },

    {
      id: "12",
      group: "Happiness",
      feasibility: 0.15,
      viability: 0.3,
      size: 6,
      benefit: 0.3,
      color: colorMap.kundenzufriedenheit,
    },
    {
      id: "13",
      group: "Synchronschwimmen",
      feasibility: 0.6,
      viability: 0.12,
      size: 3,
      benefit: 0.2,
      color: colorMap.kundenzufriedenheit,
    },
  ],
  links: [
    // Voraussetzung: Arrow
    // Dissynergie: Red dashed
    // Synergie: Green dashed
    { source: "3", target: "1", attractionX: 0.5, attractionY: 0.1 },
    { source: "1", target: "3", attractionX: 0.3, attractionY: 0.4 },
    { source: "1", target: "5", attractionX: 0.5, attractionY: 0.6 },
    { source: "7", target: "2", attractionX: 0.8, attractionY: 0.6 },
    { source: "10", target: "2", attractionX: 0.8, attractionY: 0.6 },
    { source: "12", target: "2", attractionX: 0.9, attractionY: 1 },
    { source: "1", target: "2", attractionX: -0.4, attractionY: -0.2 },
    { source: "3", target: "2", attractionX: -0.1, attractionY: -0.5 },
  ],
};
