// src/lib/mapExampleToForceGraph.ts
import type { ForceGraphData } from "./components/core/forcegraph";
import type { SampleNode, SampleLink } from "./components/core/SampleForceGraph";
import { type projects as ProjectsType, type evaluations as EvaluationsType, projects, evaluations } from "./example-data"; // for dev-time types only (optional)

/**
 * Map example data (projects + evaluations) to ForceGraphData<SampleNode, SampleLink>.
 *
 * Heuristics:
 * - Normalize choice codes (123400000..123400004) to [0,1] or [-1,1] for benefit.
 * - Feasibility: average of several technical/integrability/maintainability fields.
 * - Viability: average of strategic/demand/monetary related fields.
 * - Size: inverse-scaled by im_costs (lower cost -> larger "desirability" size).
 * - Links: create links between projects that share owningbusinessunit or owninguser;
 *   attraction computed from averaged synergy fields.
 */
export function mapExampleDataToForceGraph(
  projects: Array<any>,
  evaluations: Array<any>
): ForceGraphData<SampleNode, SampleLink> {
  // known choice codes (observed in data). If your domain uses different values, adjust this list.
  const choiceCodes = [123400000, 123400001, 123400002, 123400003, 123400004];

  function normalizeChoiceTo01(choice: number | undefined | null) {
    if (choice == null) return NaN;
    const idx = choiceCodes.indexOf(choice);
    if (idx === -1) {
      // fallback: try to map proportionally if it's numeric and in reasonable range
      return Number.isFinite(choice) ? Math.max(0, Math.min(1, (choice - choiceCodes[0]) / (choiceCodes[choiceCodes.length - 1] - choiceCodes[0] || 1))) : NaN;
    }
    return idx / (choiceCodes.length - 1);
  }

  function normalizeChoiceToMinus1To1(choice: number | undefined | null) {
    const n = normalizeChoiceTo01(choice);
    return Number.isFinite(n) ? n * 2 - 1 : NaN;
  }

  function avgValid(arr: number[]) {
    const vals = arr.filter(Number.isFinite);
    if (!vals.length) return NaN;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // Aggregate evaluations for a given project id
  function evalsForProject(projectId: string) {
    return evaluations.filter((e) => e.im_projectid === projectId);
  }

  function aggregateEvaluationMetrics(projectId: string) {
    const evs = evalsForProject(projectId);

    // Feasibility keys (heuristic)
    const feasibilityKeys = [
      "im_2_03_02_technology",
      "im_2_04_03_integrability",
      "im_2_04_04_maintainability",
      "im_2_06_01_structural",
      "im_2_06_02_procedural",
    ];

    // Viability keys (heuristic)
    const viabilityKeys = [
      "im_1_01_01_strategic",
      "im_1_02_01_internaldemand",
      "im_1_02_02_externaldemand",
      "im_3_08_01_monetary", // monetary may be coded but include it
    ];

    // Benefit keys (fallback if project.im_benefit missing)
    const benefitKeys = [
      "im_3_08_07_databenefit",
      "im_3_08_02_costsavings",
      "im_3_08_04_innovation",
      "im_3_08_05_decisionsupport",
    ];

    // Synergy keys for link attraction
    const synergyKeys = ["im_3_10_02_synergyuniversal", "im_3_10_01_synergyspecific", "im_3_10_02_synergyendemic"];

    const feasibilityVals = evs.flatMap((ev) => feasibilityKeys.map((k) => normalizeChoiceTo01(ev[k])));
    const viabilityVals = evs.flatMap((ev) => viabilityKeys.map((k) => normalizeChoiceTo01(ev[k])));
    const benefitVals = evs.flatMap((ev) => benefitKeys.map((k) => normalizeChoiceTo01(ev[k])));
    const synergyVals = evs.flatMap((ev) => synergyKeys.map((k) => normalizeChoiceToMinus1To1(ev[k])));

    return {
      feasibility: avgValid(feasibilityVals),
      viability: avgValid(viabilityVals),
      benefitFallback01: avgValid(benefitVals),
      synergy: avgValid(synergyVals),
    };
  }

  // Map projects -> nodes
  const nodes: SampleNode[] = projects.map((p) => {
    const pid = p.im_projectid ?? p.im_name ?? String(Math.random());
    const agg = aggregateEvaluationMetrics(pid);

    // benefit: prefer project.im_benefit if present
    let benefit = NaN;
    if (p.im_benefit != null) {
      benefit = normalizeChoiceToMinus1To1(p.im_benefit);
    } else if (Number.isFinite(agg.benefitFallback01)) {
      benefit = agg.benefitFallback01 * 2 - 1;
    } else {
      benefit = 0; // fallback neutral
    }

    // feasibility/viability fallback to NaN -> set to .5 neutral
    const feasibility = Number.isFinite(agg.feasibility) ? agg.feasibility : 0.5;
    const viability = Number.isFinite(agg.viability) ? agg.viability : 0.5;

    // size: derive from im_costs (smaller cost -> larger size). map to roughly 3..10
    let size = 5;
    if (typeof p.im_costs === "number" && p.im_costs >= 0) {
      const clamped = Math.max(0, Math.min(1, 1 - p.im_costs / 2000)); // assumes 2000 is "high"
      size = 3 + clamped * 7;
    }

    return {
      id: pid,
      group: p.im_name ?? p.im_description ?? pid,
      feasibility,
      viability,
      size,
      benefit,
    };
  });

  // Ensure nodes are spread across a safe interior of 0..1 for feasibility and viability.
  // Preserve relative ordering but assign evenly spaced coordinates inside [margin, 1-margin]
  // to avoid rendering on the exact axes bounds.
  function spreadAttribute(attr: "feasibility" | "viability", margin) {
    if (nodes.length <= 1) {
      if (nodes.length === 1) nodes[0][attr] = 0.5;
      return;
    }

    // Build array with original scores (use 0.5 for missing values to keep them in middle)
    const scored = nodes.map((n, i) => ({ i, score: Number.isFinite(n[attr]) ? n[attr] as number : 0.5 }));

    // Sort by score to preserve ordering
    scored.sort((a, b) => a.score - b.score || a.i - b.i);

    // Assign evenly spaced positions in [margin, 1-margin]
    const N = nodes.length;
    const span = Math.max(0, 1 - 2 * margin);
    for (let rank = 0; rank < scored.length; rank++) {
      const idx = scored[rank].i;
      const value = N === 1 ? 0.5 : margin + (rank / (N - 1)) * span;
      // clamp and set
      nodes[idx][attr] = Math.max(margin, Math.min(1 - margin, value));
    }
  }

  // Spread with a small margin so points don't sit exactly on the axes edges.
  spreadAttribute("feasibility", 0.1);
  spreadAttribute("viability", 0.15);

  // Create links: connect projects that share owningbusinessunit or owninguser
  const links: SampleLink[] = [];
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const a = projects[i];
      const b = projects[j];
      const sameBU = a.owningbusinessunit && a.owningbusinessunit === b.owningbusinessunit;
      const sameOwner = a.owninguser && a.owninguser === b.owninguser;

      if (!sameBU && !sameOwner) continue;

      const aggA = aggregateEvaluationMetrics(a.im_projectid);
      const aggB = aggregateEvaluationMetrics(b.im_projectid);

      // attraction: average synergy of both projects [-1..1] -> use as scalar
      const synergyA = Number.isFinite(aggA.synergy) ? aggA.synergy : 0;
      const synergyB = Number.isFinite(aggB.synergy) ? aggB.synergy : 0;
      const attraction = (synergyA + synergyB) / 2;

      // project pair similarity in benefit drives X/Y distribution
      const benefitA = pToNumber(a.im_benefit) ?? (aggA.benefitFallback01 ?? 0.5);
      const benefitB = pToNumber(b.im_benefit) ?? (aggB.benefitFallback01 ?? 0.5);
      const benefitDiff = (benefitA - benefitB);

      // simple layout of attraction vector:
      const attractionX = attraction * (1 - Math.abs(benefitDiff));
      const attractionY = attraction * 0.4 * Math.sign(benefitDiff || 1);

      links.push({
        source: a.im_projectid,
        target: b.im_projectid,
        attractionX,
        attractionY,
      });
    }
  }

  return { nodes, links };

  // helper to safely turn choice code to normalized 0..1 number if present
  function pToNumber(choice: any) {
    if (choice == null) return undefined;
    const n01 = normalizeChoiceTo01(choice);
    return Number.isFinite(n01) ? n01 : undefined;
  }
}
export const mappedExampleData = mapExampleDataToForceGraph(projects, evaluations);