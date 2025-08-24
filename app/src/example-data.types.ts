export type SampleNode = {
    id: string;
    group: string;
    feasibility: number;
    viability: number;
    size: number;
    benefit: number;
};

export type SampleLink = {
    source: string;
    target: string;
    attractionX: number;
    attractionY: number;
};
