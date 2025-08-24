import forceReturnToPos from "@/lib/force-return-to-pos";
import * as d3 from "d3";
import { type SimulationNodeDatum } from "d3";

import { useEffect, useRef } from "react";

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
  /** Function returning the unique id for a node. Defaults to the node's `id` field. */
  nodeId?: (d: ForceGraphNode<T>) => string | number;
  /** Function returning a group/category for a node used by ordinal color scales. */
  nodeGroup?: (d: ForceGraphNode<T>) => string | number;
  /** Ordered list of group keys used to construct the ordinal color scale. */
  nodeGroups?: Array<string | number>;
  /** Title accessor for nodes. Can be (d) => string or (d, i) => string. */
  nodeTitle?:
    | ((d: ForceGraphNode<T>) => string)
    | ((d: ForceGraphNode<T>, i: number) => string);
  /** Fill color for nodes, or accessor returning a color string. */
  nodeFill?: string | ((d: ForceGraphNode<T>) => string);
  /** Stroke color for nodes, or accessor returning a color string. */
  nodeStroke?: string | ((d: ForceGraphNode<T>) => string);
  /** Stroke width for nodes in pixels, or accessor returning a number. */
  nodeStrokeWidth?: number | ((d: ForceGraphNode<T>) => number);
  /** Stroke opacity for nodes (0..1). */
  nodeStrokeOpacity?: number;
  /** Node radius in pixels, or accessor returning a number. */
  nodeRadius?: number | ((d: ForceGraphNode<T>) => number);
  /** Per-node strength for many-body (repulsion/attraction), or constant. */
  nodeStrength?: number | ((d: ForceGraphNode<T>) => number);
  /**
   * Optional accessor to initialize node positions. Should return an object
   * with numeric { x, y } coordinates in the same coordinate space used by
   * the simulation (pixels by default). When provided, these coordinates are
   * assigned to the node objects before the simulation starts.
   */
  nodePosition?: (
    d: ForceGraphNode<T>,
    state: { width: number; height: number }
  ) => { x: number; y: number };
  /** Click handler for nodes. Receives the node datum and the selected flag. */
  nodeOnClick?: (d: ForceGraphNode<T>, selected: boolean) => void;
  /** Accessor returning the source identifier for a link. */
  linkSource?: (d: ForceGraphLink<TLink>) => any;
  /** Accessor returning the target identifier for a link. */
  linkTarget?: (d: ForceGraphLink<TLink>) => any;
  /** Link stroke color or accessor returning a color string. */
  linkStroke?: string | ((d: ForceGraphLink<TLink>) => string);
  /** Link stroke opacity (0..1). */
  linkStrokeOpacity?: number;
  /** Link stroke width in pixels or accessor. */
  linkStrokeWidth?: number | ((d: ForceGraphLink<TLink>) => number);
  /** Link stroke linecap or accessor. */
  linkStrokeLinecap?: string | ((d: ForceGraphLink<TLink>) => string);
  /** Stroke dasharray for links (e.g. "4 2") or accessor returning such a string. */
  linkStrokeStyle?: string | ((d: ForceGraphLink<TLink>) => string);
  /** Additional offset (pixels) to subtract from the link end so the line stops before the node edge. Can be a number or accessor. */
  linkEndOffset?: number | ((d: ForceGraphLink<TLink>) => number);
  /**
   * Link marker configuration. Either a marker id (string) applied to all
   * links, or an accessor returning { type: 'arrow' | 'none', size }.
   */
  linkMarker?:
    | string
    | ((d: ForceGraphLink<TLink>) => {
        type: "arrow-start" | "arrow-end" | "none";
        size: number;
      });
  /** Per-link strength (or accessor). When provided, link strength may be
   * gated by selection so only links touching the selected node are active. */
  linkStrength?: number | ((d: ForceGraphLink<TLink>) => number);
  /**
   * Global scale applied to per-axis strengths. Raw 0..1 values are often
   * too large for direct velocity application; tune this to make attractions
   * weaker/stronger. Default is small so 0..1 maps to gentle forces.
   */
  linkStrengthScale?: number;
  /**
   * Distance scale used to attenuate per-axis forces for long links. The
   * applied per-axis force will be multiplied by 1 / (1 + len / linkDistanceScale).
   */
  linkDistanceScale?: number;
  /** Colors used for the ordinal node color scale. */
  colors?: Array<string> | readonly string[];
  /** Width of the rendered SVG (pixels). */
  width?: number;
  /** Height of the rendered SVG (pixels). */
  height?: number;
  /** Label for the x axis. */
  xLabel?: string;
  /** Label for the y axis. */
  yLabel?: string;
  /** Margin reserved for axis labels and ticks. */
  axisMargin?: number;
  /** Promise which, when resolved, stops the simulation (invalidation hook). */
  invalidation?: Promise<any>;
};

export type ForceGraphProps<T, TLink = {}> = {} & ForceGraphData<T, TLink> &
  ForceGraphOptions<T, TLink>;

/**
 * Force-directed graph generator using D3.
 **/
function createD3ForceGraph<TData, TLink = {}>(
  { nodes, links }: ForceGraphData<TData, TLink>,
  {
    nodeId = (d) => d.id,
    nodeGroup,
    nodeGroups,
    nodeTitle,
    nodeFill = "white",
    nodeStroke = "currentColor",
    nodeStrokeWidth = 1.5,
    nodeStrokeOpacity = 1,
    nodeRadius = 5,
    nodeStrength,
    nodePosition,
    linkSource = ({ source }) =>
      typeof source === "number" || typeof source === "string"
        ? source
        : source?.id,
    linkTarget = ({ target }) =>
      typeof target === "number" || typeof target === "string"
        ? target
        : target?.id,
    linkStroke = "#999",
    linkStrokeOpacity = 0.6,
    linkStrokeWidth = 1.5,
    linkStrokeStyle,
    linkStrokeLinecap = "round",
    linkStrength,
    nodeOnClick,
    linkMarker,
    linkEndOffset = 0,
    xLabel = "x",
    yLabel = "y",
    axisMargin = 40,
    colors = d3.schemeTableau10,
    width = 1000,
    height = 800,
    invalidation,
  }: ForceGraphOptions<TData, TLink> = {}
) {
  // If a nodePosition accessor is provided, call it for each node to
  // initialize the node.x and node.y properties before the simulation
  // begins. The accessor must return numeric { x, y } values in the same
  // coordinate space as the simulation (pixels by default).
  if (typeof nodePosition === "function") {
    nodes.forEach((n) => {
      try {
        const p = nodePosition(n, { width, height });
        if (p && typeof p.x === "number") n.x = p.x;
        if (p && typeof p.y === "number") n.y = height - p.y;
      } catch (e) {
        // Do not let a buggy accessor break the graph rendering; log a
        // warning and continue.
        // eslint-disable-next-line no-console
        console.warn("nodePosition accessor threw:", e);
      }
    });
  }

  const nodesIntern = d3.map(nodes, nodeId).map(intern);
  const nodesRadiusIntern =
    typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const linkSourcesIntern = d3.map(links, linkSource).map(intern);
  const linkTargetsIntern = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => nodesIntern[i];
  const titles = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const nodeGroupsIntern =
    nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const lineStrokeWidths =
    typeof linkStrokeWidth !== "function"
      ? null
      : d3.map(links, linkStrokeWidth);
  const lineStrokes =
    typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);
  const lineStrokeLineCaps =
    typeof linkStrokeLinecap !== "function"
      ? null
      : d3.map(links, linkStrokeLinecap);
  const lineStrokeStyles =
    typeof linkStrokeStyle !== "function"
      ? null
      : d3.map(links, linkStrokeStyle as any);

  // Compute per-link marker types. If `linkMarker` is a function, evaluate
  // it per-link to obtain dynamic marker type/size. If `linkMarker` is a
  // string, use that marker id for all links. Otherwise compute a default
  // per-link marker (e.g. arrows only when net attraction is positive).
  let linkMarkers: Array<string | null> = null;
  let linkMarkerDefaults: Array<string | null> = null;
  if (typeof linkMarker === "function") {
    linkMarkers = d3.map(links, (d) => linkMarker(d)?.type);
  } else if (!linkMarker) {
    const sxAcc = 0;
    const syAcc = 0;
    linkMarkerDefaults = d3.map(links, (_) =>
      sxAcc + syAcc > 0 ? "arrow" : null
    );
  }

  // Replace immutable input arrays with mutable shallow copies used by D3.
  nodes = d3.map(nodes, (node, i) => ({ ...node, id: nodesIntern[i] }));
  links = d3.map(links, (link, i) => ({
    ...link,
    source: linkSourcesIntern[i],
    target: linkTargetsIntern[i],
    // store a per-link computed end offset for use during tick updates
    endOffset:
      typeof linkEndOffset === "function"
        ? (linkEndOffset as any)(link)
        : (linkEndOffset as number),
  }));

  // Compute default domains for ordinal scales if not provided.
  if (nodeGroupsIntern && nodeGroups === undefined)
    nodeGroups = d3.sort(nodeGroupsIntern);

  // Construct visual scales (e.g., ordinal color scale) used by the graph.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct forces used by the simulation. Maintain `selectedId` so link
  // strength can depend on the currently selected node.
  let selectedId: string | number | null = null;

  const forceNode = nodeStrength || linkStrength ? d3.forceManyBody() : null;
  const forceLink = linkStrength
    ? d3.forceLink(links).id(({ index: i }) => nodesIntern[i])
    : null;
  // Create a custom force that nudges nodes toward their starting positions
  // (does not directly modify velocities). This helps nodes relax back to
  // their initialized layout when selection changes.

  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  // Wrap the provided `linkStrength` accessor so it only returns a non-zero
  // strength when the link's target matches the selected node id. This
  // closure over `selectedId` allows strengths to change when selection
  // changes and the simulation is restarted.
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
        // Only apply strength to links whose target equals the selected id
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
    .force("startingPositions", startingPositions)
    .on("tick", ticked);

  const padding = axisMargin + 20;
  const svg = d3
    .create("svg")
    .attr("width", "100%")
    .attr("viewBox", [0, 0, width + padding * 2, height + padding * 2])
    .attr(
      "style",
      "max-width: 100%; height: auto; height: intrinsic; max-height: 90vh"
    );

  // Add arrow marker definitions used by axis lines and links. We add both
  // start and end variants so `marker-start` and `marker-end` work
  // consistently.
  const defs = svg.append("defs");

  // Arrow marker for marker-end (points forward).
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

  // Arrow marker for marker-start (points backward).
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

  // Add X and Y axes (legend) behind the graph. Axes are positioned along
  // the left and bottom edges of the graph viewport.
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

  // Axis labels placed near the axis lines.
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

  // Draw explicit axis lines with arrowheads so arrows remain visible even
  // when axis tick marks are suppressed.
  const axisLines = axes.append("g").attr("class", "axis-lines");

  // X axis line (left to right).
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

  // Y axis line is drawn bottom-to-top so the arrowhead appears at the top
  // end of the axis.
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
    .attr(
      "stroke-dasharray",
      typeof linkStrokeStyle !== "function" ? linkStrokeStyle : null
    )
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
      return linkMarkerDefaults && linkMarkerDefaults[i]
        ? `url(#${linkMarkerDefaults[i]})`
        : null;
    })
    .attr("markerWidth", (d, i) => {
      if (typeof linkMarker === "function") return (linkMarker as any)(d).size;
      return linkMarkerDefaults && linkMarkerDefaults[i] ? 6 : 0;
    })
    .attr("markerHeight", (d, i) => {
      if (typeof linkMarker === "function") return (linkMarker as any)(d).size;
      return linkMarkerDefaults && linkMarkerDefaults[i] ? 6 : 0;
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

  // Add text labels for each node and manage their layout during ticks.
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

  // Initialize node/link styles based on options and selection.
  updateNodeStyles();

  if (lineStrokeWidths)
    link.attr("stroke-width", (_, i) => lineStrokeWidths[i]);
  if (lineStrokes) link.attr("stroke", (_, i) => lineStrokes[i]);
  if (lineStrokeLineCaps)
    link.attr("stroke-linecap", (_, i) => lineStrokeLineCaps[i]);
  if (lineStrokeStyles)
    link.attr(
      "stroke-dasharray",
      (_: any, i: number) => lineStrokeStyles[i] as string
    );
  if (linkMarkers) link.attr("marker-end", (_, i) => `url(#${linkMarkers[i]})`);
  if (nodeGroupsIntern) node.attr("fill", (_, i) => color(nodeGroupsIntern[i]));
  if (nodesRadiusIntern) node.attr("r", (_, i) => nodesRadiusIntern[i]);
  // Store derived visual properties (computed fill and radius) on each
  // datum for use during tick updates and label placement.
  node.each(function (d: any, i: number) {
    const computedFill = nodeGroupsIntern
      ? color(nodeGroupsIntern[i])
      : typeof nodeFill === "function"
      ? (nodeFill as any)(d)
      : nodeFill;
    d.__fill = computedFill;
    d.__r =
      typeof nodeRadius === "function"
        ? (nodeRadius as any)(d)
        : (nodeRadius as number);
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
        const extra = (d.endOffset ?? 0) as number;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.x;
        return d.target.x - (dx * (r + extra)) / len;
      })
      .attr("y2", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const r =
          typeof nodeRadius === "function" ? nodeRadius(d.target) : nodeRadius;
        const extra = (d.endOffset ?? 0) as number;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.y;
        return d.target.y - (dy * (r + extra)) / len;
      });

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    // Position labels on each tick: center the label if it fits inside
    // the node circle; otherwise, place it to the right of the node.
    nodeLabels.each(function (d: any) {
      const textEl = this as SVGTextElement;
      const txt = d3.select(textEl);
      const r =
        d.__r ??
        (typeof nodeRadius === "function"
          ? (nodeRadius as any)(d)
          : (nodeRadius as number));

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

      if (labelWidth <= r * 2 - paddingForLabel) {
        // fits inside circle — center the label and choose contrasting text color
        txt.attr("text-anchor", "middle").attr("x", d.x);
        // determine fill contrast; default to currentColor if we can't parse
        let fillColor = d.__fill;
        if (fillColor == null)
          fillColor =
            typeof nodeFill === "function" ? (nodeFill as any)(d) : nodeFill;
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
        if (useWhite) {
          // white text on dark fill -> thin black outline
          txt.style("fill", "white");
          txt.style("stroke", "black");
          txt.style("stroke-width", "1px");
        } else {
          // dark/black text -> thick white outline for readability over links
          txt.style("fill", "currentColor");
          txt.style("stroke", "white");
          txt.style("stroke-width", "2px");
        }
        txt
          .attr("paint-order", "stroke fill")
          .style("stroke-linejoin", "round");
      } else {
        // doesn't fit — place to the right of the circle, use default text color with white outline
        txt
          .attr("text-anchor", "start")
          .attr("x", d.x + r + gap)
          .style("fill", "currentColor");
        txt
          .style("stroke", "white")
          .style("stroke-width", "6px")
          .attr("paint-order", "stroke fill")
          .style("stroke-linejoin", "round");
      }

      // always vertically center
      txt.attr("y", d.y).attr("alignment-baseline", "middle");
    });
  }

  return Object.assign(svg.node(), { scales: { color } });
}

/**
 * React component wrapping the D3 force graph generator.
 */
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
