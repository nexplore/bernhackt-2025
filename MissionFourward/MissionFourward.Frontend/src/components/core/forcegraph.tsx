import forceReturnToPos from "@/lib/force-return-to-pos";
import * as d3 from "d3";

import { type SimulationNodeDatum } from "d3";

import React, { useRef, useEffect } from "react";

export type ForceGraphNode<T> = SimulationNodeDatum & {
  id: string | number;
} & T;

export type ForceGraphLink<TLink = {}> = d3.SimulationLinkDatum<
  d3.SimulationNodeDatum & { id?: string | number }
> &
  TLink;

export type ForceGraphData<T, TLink = {}> = {
  nodes: Array<ForceGraphNode<T>>;
  links: Array<ForceGraphLink<TLink>>;
};

type ForceGraphOptions<T, TLink = {}> = {
  nodeId?: (d: ForceGraphNode<T>) => string | number;
  nodeGroup?: (d: ForceGraphNode<T>) => string | number;
  nodeGroups?: Array<string | number>;
  nodeTitle?:
    | ((d: ForceGraphNode<T>) => string)
    | ((d: ForceGraphNode<T>, i: number) => string);
  nodeFill?: string | ((d: ForceGraphNode<T>) => string);
  nodeStroke?: string | ((d: ForceGraphNode<T>) => string);
  nodeStrokeWidth?: number | ((d: ForceGraphNode<T>) => number);
  nodeStrokeOpacity?: number;
  nodeRadius?: number | ((d: ForceGraphNode<T>) => number);
  nodeStrength?: number | ((d: ForceGraphNode<T>) => number);
  nodePosition?: (d: ForceGraphNode<T>, state: { width: number; height: number }) => { x: number; y: number };
  nodeOnClick?: (d: ForceGraphNode<T>, selected: boolean) => void;
  linkSource?: (d: ForceGraphLink<TLink>) => any;
  linkTarget?: (d: ForceGraphLink<TLink>) => any;
  linkStroke?: string | ((d: ForceGraphLink<TLink>) => string);
  linkStrokeOpacity?: number;
  linkStrokeWidth?: number | ((d: ForceGraphLink<TLink>) => number);
  linkStrokeLinecap?: string | ((d: ForceGraphLink<TLink>) => string);
  linkMarker?:
    | string
    | ((d: ForceGraphLink<TLink>) => { type: "arrow" | "none"; size: number }); // marker id or function
  linkStrength?: number | ((d: ForceGraphLink<TLink>) => number);
  // global scale applied to per-axis strengths (useful because raw 0..1 values
  // are usually too large for direct velocity application). Tune this to make
  // attractions weaker/stronger. Default is small so 0..1 maps to gentle forces.
  linkStrengthScale?: number;
  // a distance scale used to attenuate per-axis forces for long links.
  // The applied per-axis force will be multiplied by 1 / (1 + len / linkDistanceScale).
  linkDistanceScale?: number;
  colors?: Array<string> | readonly string[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  axisMargin?: number;
  invalidation?: Promise<any>;
};

export type ForceGraphProps<T, TLink = {}> = {} & ForceGraphData<T, TLink> &
  ForceGraphOptions<T, TLink>;

// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function createD3ForceGraph<TData, TLink = {}>(
  {
    nodes, // an iterable of node objects (typically [{id}, …])

    links, // an iterable of link objects (typically [{source, target}, …])
  }: ForceGraphData<TData, TLink>,
  {
    nodeId = (d) => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "white", // node stroke fill (if not using a group color encoding)
    nodeStroke = "currentColor", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
  nodeStrength,
  nodePosition,
    linkSource = ({ source }) =>
      typeof source === "number" || typeof source === "string"
        ? source
        : source?.id, // given d in links, returns a node identifier string
    linkTarget = ({ target }) =>
      typeof target === "number" || typeof target === "string"
        ? target
        : target?.id, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength,
    nodeOnClick,
    linkMarker,
    xLabel = "x",
    yLabel = "y",
    axisMargin = 40,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width = 1000, // outer width, in pixels
    height = 800, // outer height, in pixels
    invalidation, // when this promise resolves, stop the simulation
  }: ForceGraphOptions<TData, TLink> = {}
) {
  // Compute values.


  // If the user provided an accessor to initialize node positions, apply it now.
  // The accessor should return an object with numeric { x, y } coordinates. These
  // values are assigned directly to the simulation's node objects (d.x, d.y).
  // Note: the coordinate convention used by the rest of this component expects
  // coordinates in the same space the simulation uses (some callers use 0..1
  // normalized coords; others use pixel values). The accessor should match the
  // coordinate system you expect the simulation to use.
  if (typeof nodePosition === "function") {
    nodes.forEach((n) => {
      try {
        const p = (nodePosition)(n, { width, height });
        if (p && typeof p.x === "number") n.x = p.x;
        if (p && typeof p.y === "number") n.y = height - p.y;
      } catch (e) {
        // swallow accessor errors to avoid breaking the whole graph
        // eslint-disable-next-line no-console
        console.warn("nodePosition accessor threw:", e);
      }
    });
  }

  const N = d3.map(nodes, nodeId).map(intern);
  const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const titles = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W =
    typeof linkStrokeWidth !== "function"
      ? null
      : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);
  const LC =
    typeof linkStrokeLinecap !== "function"
      ? null
      : d3.map(links, linkStrokeLinecap);
  // compute marker mapping: if user provided a function, use it; if they
  // provided a string id, we'll use it for all links; otherwise, compute a
  // default per-link marker based on net per-axis attraction (arrow shown
  // when net attraction > 0).
  let LM: any = null;
  let LM_default: any = null;
  if (typeof linkMarker === "function") {
    LM = d3.map(links, (d) => linkMarker(d)?.type);
  } else if (!linkMarker) {
    const sxAcc = 0;
    const syAcc = 0;
    LM_default = d3.map(links, (l) => (sxAcc + syAcc > 0 ? "arrow" : null));
  }

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (node, i) => ({ ...node, id: N[i] }));
  links = d3.map(links, (link, i) => ({
    ...link,
    source: LS[i],
    target: LT[i],
  }));


  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  // track currently selected node id so link strength can depend on it
  let selectedId: string | number | null = null;

  const forceNode = nodeStrength || linkStrength ? d3.forceManyBody() : null;
  const forceLink = linkStrength
    ? d3.forceLink(links).id(({ index: i }) => N[i])
    : null;
    // Create a force, that when active, slowly moves nodes to their starting position (similar to forceCenter, not modifying velocities but positions)

  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  // Wrap the provided linkStrength so it only applies when the link's target
  // node is the currently selected node. Otherwise return 0. The strength
  // accessor closes over `selectedId` so updating `selectedId` and restarting
  // the simulation will re-evaluate strengths.
  const baseStrength =
        typeof linkStrength === "function"
          ? (l: any) => (linkStrength as any)(l)
          : () => linkStrength as number;

const startingPositions = forceReturnToPos((node: ForceGraphNode<TData>) => {
  if (node.id === selectedId || !selectedId) {
    const pos = nodePosition(node, { width, height });
    pos.y = height - pos.y; // invert y axis
    return pos;
  }
  return null;
});

  function initializeForceLink() {
    if (linkStrength !== undefined && forceLink) {

      forceLink.strength((l: any) => {
        // d.target may be a node object (with .id) or a primitive id
        const tid = l && typeof l.target === "object" ? l.target.id : l.target;
        console.log('selected', selectedId, 'matches', tid === selectedId, l)
        return tid === selectedId ? baseStrength(l) : 0;
      });


    
    }
  }

  initializeForceLink();

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink)
    // .force("charge", forceNode)
    // .force("center", d3.forceCenter())
    .force("collide", d3.forceCollide().radius(nodeRadius))
    .force('startingPositions', startingPositions)
    .on("tick", ticked);

  const padding = axisMargin + 20;
  const svg = d3
    .create("svg")
    .attr("width", "100%")
    .attr("viewBox", [
      0 ,
      0 ,
      width + padding * 2,
      height + padding * 2,
    ])
    .attr(
      "style",
      "max-width: 100%; height: auto; height: intrinsic; max-height: 90vh"
    );

  // Add arrow marker definitions (start and end variants so we can use
  // marker-start and marker-end on axis lines reliably).
  const defs = svg.append("defs");

  // Arrow pointing forward for marker-end
  defs
    .append("marker")
    .attr("id", "arrow-end")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "currentColor");

  // Arrow reversed for marker-start
  defs
    .append("marker")
    .attr("id", "arrow-start")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 0)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M10,-5L0,0L10,5")
    .attr("fill", "currentColor");

  // Add X and Y axes (legend) behind the graph, positioned at left and bottom edges
  // const leftX = -width / 2 + axisMargin;
  // const bottomY = height / 2 - axisMargin;
  const leftX = padding;
  const bottomY = height - padding;

  const xScale = d3
    .scaleLinear()
    .domain([0, width])
    .range([padding, width - padding]);
  const yScale = d3
    .scaleLinear()
    .domain([0, height])
    .range([padding, height - padding]);

  const xAxis = d3.axisBottom(xScale).ticks(0).tickSizeOuter(0);
  const yAxis = d3.axisLeft(yScale).ticks(0).tickSizeOuter(0);

  const axes = svg.append("g").attr("class", "axes");
  const xAxisGroup = axes
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${bottomY})`)
    .call(xAxis);
  xAxisGroup.selectAll("text").style("font-size", "10px");
  const yAxisGroup = axes
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${leftX},0)`)
    .call(yAxis);
  yAxisGroup.selectAll("text").style("font-size", "10px");

  // Axis labels
  xAxisGroup
    .append("text")
    .attr("class", "x-label")
    .attr("x", 100)
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "currentColor")
    .text(xLabel);

  yAxisGroup
    .append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -100)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "currentColor")
    .text(yLabel);

  // Draw explicit axis lines with arrowheads at both ends so arrows are
  // visible even when the default axis path is minimal (ticks are 0).
  const axisLines = axes.append("g").attr("class", "axis-lines");

  // X axis line (left -> right)
  axisLines
    .append("line")
    .attr("class", "x-axis-line")
    .attr("x1", xScale.range()[0])
    .attr("x2", xScale.range()[1])
    .attr("y1", bottomY)
    .attr("y2", bottomY)
    .attr("stroke", "currentColor")
    .attr("stroke-width", 1.5)
  .attr("marker-end", "url(#arrow-end)");

  // Y axis line (drawn bottom -> top so arrow appears at the top outer end)
  axisLines
    .append("line")
    .attr("class", "y-axis-line")
    .attr("x1", leftX)
    .attr("x2", leftX)
    .attr("y1", yScale.range()[1])
    .attr("y2", yScale.range()[0])
    .attr("stroke", "currentColor")
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#arrow-end)");

  const link = svg
    .append("g")
    .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
    .attr("stroke-opacity", linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null
    )
    .attr(
      "stroke-linecap",
      typeof linkStrokeLinecap !== "function" ? linkStrokeLinecap : null
    )
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("marker-end", (d, i) => {
      if (typeof linkMarker === "function")
        return `url(#${(linkMarker as any)(d).type})`;
      if (linkMarker) return `url(#${linkMarker})`;
      return LM_default && LM_default[i] ? `url(#${LM_default[i]})` : null;
    })
    .attr("markerWidth", (d, i) => {
      if (typeof linkMarker === "function") return (linkMarker as any)(d).size;
      return LM_default && LM_default[i] ? 6 : 0;
    })
    .attr("markerHeight", (d, i) => {
      if (typeof linkMarker === "function") return (linkMarker as any)(d).size;
      return LM_default && LM_default[i] ? 6 : 0;
    });
  const node = svg
    .append("g")
    .selectAll<SVGCircleElement, SimulationNodeDatum>("circle")
    .data(nodes)
    .join("circle")
    .attr("fill", nodeFill)
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .attr("r", nodeRadius);

  // Add text labels for each node
  const labelGroup = svg.append("g");
  const nodeLabels = labelGroup
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((_, i) => (titles ? titles[i] : ""))
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("user-select", "none")
    .style("pointer-events", "none");

  function updateNodeStyles() {
    node
      .attr("stroke", (d: any) =>
        d.id === selectedId
          ? "orange"
          : typeof nodeStroke === "function"
          ? (nodeStroke as any)(d)
          : nodeStroke
      )
      .attr("stroke-width", (d: any) => {
        const base =
          typeof nodeStrokeWidth === "function"
            ? (nodeStrokeWidth as any)(d)
            : (nodeStrokeWidth as any) ?? 1.5;
        return d.id === selectedId ? base * 1.8 : base;
      });
  }

  node.on("click", function (event, d: any) {
    event.stopPropagation();
    const id = d.id;
    if (selectedId === id) selectedId = null;
    else selectedId = id;


    initializeForceLink();
    // restart the simulation so forces (which close over selectedId) re-evaluate
    if (simulation) simulation.alpha(0.1).restart();

    updateNodeStyles();
    if (nodeOnClick) nodeOnClick(d as any, selectedId === id);
  });

  node
    .on("mouseover", function (_: any, d: any) {
      if (d.id !== selectedId) {
        const el = d3.select(this as any);
        const base =
          typeof nodeStrokeWidth === "function"
            ? (nodeStrokeWidth as any)(d)
            : (nodeStrokeWidth as any) ?? 1.5;
        el.attr("stroke", "rgba(0,0,0,0.8)").attr("stroke-width", base * 1.4);
      }
    })
    .on("mouseout", function (_: any, d: any) {
      if (d.id !== selectedId) {
        const el = d3.select(this as any);
        el.attr(
          "stroke",
          typeof nodeStroke === "function" ? (nodeStroke as any)(d) : nodeStroke
        ).attr(
          "stroke-width",
          typeof nodeStrokeWidth === "function"
            ? (nodeStrokeWidth as any)(d)
            : (nodeStrokeWidth as any) ?? 1.5
        );
      }
    });

  // initialize styles
  updateNodeStyles();

  if (W) link.attr("stroke-width", (_, i) => W[i]);
  if (L) link.attr("stroke", (_, i) => L[i]);
  if (LC) link.attr("stroke-linecap", (_, i) => LC[i]);
  if (LM) link.attr("marker-end", (_, i) => `url(#${LM[i]})`);
  if (G) node.attr("fill", (_, i) => color(G[i]));
  if (R) node.attr("r", (_, i) => R[i]);
  // store computed fill and radius on each datum for use during tick updates
  node.each(function (d: any, i: number) {
    const computedFill = G ? color(G[i]) : typeof nodeFill === "function" ? (nodeFill as any)(d) : nodeFill;
    d.__fill = computedFill;
    d.__r = typeof nodeRadius === "function" ? (nodeRadius as any)(d) : (nodeRadius as number);
  });
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object"
      ? value.valueOf()
      : value;
  }

  function ticked() {
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        // Support function or number for nodeRadius
        const r =
          typeof nodeRadius === "function" ? nodeRadius(d.target) : nodeRadius;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.x;
        return d.target.x - (dx * r) / len;
      })
      .attr("y2", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const r =
          typeof nodeRadius === "function" ? nodeRadius(d.target) : nodeRadius;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.y;
        return d.target.y - (dy * r) / len;
      });

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    // Position labels: center them if they fit inside the node circle;
    // otherwise render the label to the right of the circle.
    nodeLabels.each(function (d: any) {
      const textEl = this as SVGTextElement;
      const txt = d3.select(textEl);
      const r = d.__r ?? (typeof nodeRadius === "function" ? (nodeRadius as any)(d) : (nodeRadius as number));

      // Temporarily place the label at the node position so getBBox() returns correct width.
      txt.attr("x", d.x).attr("y", d.y);

      let labelWidth = 0;
      try {
        const bbox = textEl.getBBox();
        labelWidth = bbox.width;
      } catch (e) {
        // getBBox can throw in some environments; fall back to 0 so label defaults to right placement
        labelWidth = 0;
      }

      const paddingForLabel = 4; // small padding inside the circle
      const gap = 6; // gap between circle edge and label when rendered outside

      if (labelWidth <= (r * 2 - paddingForLabel)) {
        // fits inside circle — center the label and choose contrasting text color
        txt.attr("text-anchor", "middle").attr("x", d.x);
        // determine fill contrast; default to currentColor if we can't parse
        let fillColor = d.__fill;
        if (fillColor == null) fillColor = typeof nodeFill === "function" ? (nodeFill as any)(d) : nodeFill;
        let useWhite = false;
        try {
          const c = d3.color(fillColor as any);
          if (c) {
            const rgb = c.rgb();
            // perceived luminance
            const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
            useWhite = lum < 140; // threshold — tweak if needed
          }
        } catch (e) {
          useWhite = false;
        }
        txt.style("fill", useWhite ? "white" : "currentColor");
        txt.style("font-weight", useWhite ? "bold" : "normal");
      } else {
        // doesn't fit — place to the right of the circle, use default text color
        txt.attr("text-anchor", "start").attr("x", d.x + r + gap).style("fill", "currentColor");
      }

      // always vertically center
      txt.attr("y", d.y).attr("alignment-baseline", "middle");
    });
  }

  return Object.assign(svg.node(), { scales: { color } });
}

export function ForceGraph<T, TLink = {}>(props: ForceGraphProps<T, TLink>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = props.nodes;
    const links = props.links;

    if (ref.current) {
      // Remove previous SVG if any
      ref.current.innerHTML = "";
      ref.current.appendChild(
        createD3ForceGraph<T, TLink>({ nodes, links }, props)
      );
    }
  }, [props.links, props.nodes]);

  return <div ref={ref} />;
}
