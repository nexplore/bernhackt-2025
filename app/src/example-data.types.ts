export type SampleNode = {
  id: string;
  group: string;
  feasibility: number;
  viability: number;
  size: number;
  benefit: number;
  color?: string;
};

export type SampleLink = {
  source: string;
  target: string;
  attractionX: number;
  attractionY: number;
};

export const colorMap = {
  transaktionen: "#3382FF",
  zinsgeschaeft: "#FFDC4A",
  kundenzufriedenheit: "#C86300",
  mitarbeiterzufriedenheit: "#0D8B48",
};
