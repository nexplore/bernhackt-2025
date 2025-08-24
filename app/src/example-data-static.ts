import type { ForceGraphData } from "@/components/forcegraph.tsx";
import type { SampleLink, SampleNode } from "@/example-data.types.ts";

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
        {source: "1", target: "2", attractionX: 0.5, attractionY: 0.1},
        {source: "2", target: "3", attractionX: 0.1, attractionY: 0.2},
        {source: "3", target: "4", attractionX: -0.1, attractionY: -0.02},
        {source: "4", target: "1", attractionX: 0.3, attractionY: 0.4},
    ],
};