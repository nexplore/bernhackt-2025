import * as d3 from "d3"

import { type SimulationNodeDatum } from "d3";

import React, { useRef, useEffect } from "react";


export type ForceGraphNode<T> = SimulationNodeDatum & { 
    id: string | number
 } & T;

export type ForceGraphLink<TLink = {}> = d3.SimulationLinkDatum<d3.SimulationNodeDatum & {id?: string | number}> & TLink;

type ForceGraphData<T, TLink = {}> = {
  nodes: Array<ForceGraphNode<T>>;
  links: Array<ForceGraphLink<TLink>>;
};

type ForceGraphOptions<T, TLink = {}> = {
  nodeId?: (d: ForceGraphNode<T>) => string | number;
  nodeGroup?: (d: ForceGraphNode<T>) => string | number;
  nodeGroups?: Array<string | number>;
  nodeTitle?: ((d: ForceGraphNode<T>) => string) | ((d: ForceGraphNode<T>, i: number) => string);
  nodeFill?: string | ((d: ForceGraphNode<T>) => string);
  nodeStroke?: string | ((d: ForceGraphNode<T>) => string);
  nodeStrokeWidth?: number | ((d: ForceGraphNode<T>) => number);
  nodeStrokeOpacity?: number;
  nodeRadius?: number | ((d: ForceGraphNode<T>) => number);
  nodeStrength?: number | ((d: ForceGraphNode<T>) => number);
  nodeOnClick?: (d: ForceGraphNode<T>, selected: boolean) => void;
  linkSource?: (d: ForceGraphLink<TLink>) => any;
  linkTarget?: (d: ForceGraphLink<TLink>) => any;
  linkStroke?: string | ((d: ForceGraphLink<TLink>) => string);
  linkStrokeOpacity?: number;
  linkStrokeWidth?: number | ((d: ForceGraphLink<TLink>) => number);
  linkStrokeLinecap?: string | ((d: ForceGraphLink<TLink>) => string);
  linkMarker?: string | ((d: ForceGraphLink<TLink>) => { type: 'arrow' | 'none', size: number }); // marker id or function
  linkStrength?: number | ((d: ForceGraphLink<TLink>) => number);
  // optional per-axis link strengths (applied as separate X/Y attraction components)
  linkStrengthX?: number | ((d: ForceGraphLink<TLink>) => number);
  linkStrengthY?: number | ((d: ForceGraphLink<TLink>) => number);
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


export type ForceGraphProps<T, TLink = {}> = 
{

}
&
ForceGraphData<T, TLink> & ForceGraphOptions<T, TLink>;


// Copyright 2021-2024 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
 function createD3ForceGraph<TData, TLink = {}>({
  nodes, // an iterable of node objects (typically [{id}, …])
  
  links // an iterable of link objects (typically [{source, target}, …])
}: ForceGraphData<TData, TLink>, {
  nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
  nodeGroup, // given d in nodes, returns an (ordinal) value for color
  nodeGroups, // an array of ordinal values representing the node groups
  nodeTitle, // given d in nodes, a title string
  nodeFill = "white", // node stroke fill (if not using a group color encoding)
  nodeStroke = "currentColor", // node stroke color
  nodeStrokeWidth = 1.5, // node stroke width, in pixels
  nodeStrokeOpacity = 1, // node stroke opacity
  nodeRadius = 5, // node radius, in pixels
  nodeStrength,
  linkSource = ({source}) => typeof source === 'number' || typeof source === 'string' ? source : source?.id, // given d in links, returns a node identifier string
  linkTarget = ({target}) => typeof target === 'number' || typeof target === 'string' ? target : target?.id, // given d in links, returns a node identifier string
  linkStroke = "#999", // link stroke color
  linkStrokeOpacity = 0.6, // link stroke opacity
  linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
  linkStrokeLinecap = "round", // link stroke linecap
  linkStrength,
  linkStrengthX,
  linkStrengthY,
  linkStrengthScale = 0.02,
  linkDistanceScale,
  nodeOnClick,
  linkMarker,
  xLabel = "x",
  yLabel = "y",
  axisMargin = 40,
  colors = d3.schemeTableau10, // an array of color strings, for the node groups
  width = 1000, // outer width, in pixels
  height = 800, // outer height, in pixels
  invalidation // when this promise resolves, stop the simulation
}: ForceGraphOptions<TData, TLink> = {}) {
  // Compute values.
  const N = d3.map(nodes, nodeId).map(intern);
  const R = typeof nodeRadius !== "function" ? null : d3.map(nodes, nodeRadius);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const titles = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);
  const LC = typeof linkStrokeLinecap !== "function" ? null : d3.map(links, linkStrokeLinecap);
  // compute marker mapping: if user provided a function, use it; if they
  // provided a string id, we'll use it for all links; otherwise, compute a
  // default per-link marker based on net per-axis attraction (arrow shown
  // when net attraction > 0).
  let LM: any = null;
  let LM_default: any = null;
  if (typeof linkMarker === "function") {
    LM = d3.map(links, d => linkMarker(d)?.type);
  } else if (!linkMarker) {
    const sxAcc = typeof linkStrengthX === 'function' ? linkStrengthX : () => (linkStrengthX as number) ?? 0;
    const syAcc = typeof linkStrengthY === 'function' ? linkStrengthY : () => (linkStrengthY as number) ?? 0;
    LM_default = d3.map(links, l => (sxAcc(l) + syAcc(l)) > 0 ? 'arrow' : null);
  }

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (node, i) => ({...node, id: N[i]}));
  links = d3.map(links, (link, i) => ({...link, source: LS[i], target: LT[i]}));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode =  nodeStrength || linkStrength ? d3.forceManyBody() : null;
  const forceLink = linkStrength ? d3.forceLink(links).id(({index: i}) => N[i]) : null;
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  // If user provided per-axis strengths, add a custom force that applies X/Y components
  let linkXYForce: any = null;
  if (linkStrengthX !== undefined || linkStrengthY !== undefined) {
  const strengthXAccessor = typeof linkStrengthX === 'function' ? linkStrengthX : () => (linkStrengthX as number) ?? 0;
  const strengthYAccessor = typeof linkStrengthY === 'function' ? linkStrengthY : () => (linkStrengthY as number) ?? 0;

  // choose a sensible distance scale fallback (use graph size if user didn't set one)
  const distanceScale = linkDistanceScale ?? Math.max(width, height, 200);

  function forceLinkXY(alpha: number) {
      for (let i = 0, n = links.length; i < n; ++i) {
        const l = links[i];
        const sid = l.source;
        const tid = l.target;
        const s: any = typeof sid === 'object' ? sid : nodes[sid];
        const t: any = typeof tid === 'object' ? tid : nodes[tid];
        if (s === undefined || t === undefined) continue;
  // apply global scaling so linkStrengthX/Y values in the 0..1 range
  // produce reasonable/visually-pleasing forces
        const kx = strengthXAccessor(l) * linkStrengthScale * alpha;
        const ky = strengthYAccessor(l) * linkStrengthScale * alpha;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
  // use displacement scaled by distanceScale so forces remain bounded
        // and small strengths have visible effect. negative kx/ky will
        // naturally act as repulsive (push apart).
        const factor = 1 / Math.max(distanceScale, 1);

// Make sure they are linked, means start <-> target are connected

        if (kx) {
          const fx = dx * factor * kx;
          // apply to source only: positive kx pulls source toward target,
          // negative kx pushes it away
          s.vx += fx;

        }
        if (ky) {
          const fy = dy * factor * ky;
          s.vy += fy;
        }
      }
    }

    // d3 force contract: provide initialize so simulation can call it if needed
    (forceLinkXY as any).initialize = function() { /* no-op */ };
    linkXYForce = forceLinkXY as any;
  }

  const simulation = d3.forceSimulation(nodes)
      .force("link", forceLink)
      .force("charge", forceNode)
      .force("center",  d3.forceCenter())
      .force('collide', d3.forceCollide().radius(nodeRadius))
      .on("tick", ticked);

  // attach the optional per-axis link force
  if (linkXYForce) simulation.force('linkXY', linkXYForce);

  const padding = axisMargin + 20;
  const svg = d3.create("svg")
      .attr("width", '100%')
      .attr("viewBox", [-width / 2 - padding, -height / 2 - padding, width + padding * 2, height + padding * 2])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic; max-height: 90vh");

  // Add arrow marker definition
  svg.append("defs").append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "current-color");

  // Add X and Y axes (legend) behind the graph, positioned at left and bottom edges
  const leftX = -width / 2 + axisMargin;
  const bottomY = height / 2 - axisMargin;

  const xScale = d3.scaleLinear()
    .domain([-width / 2, width / 2])
    .range([-width / 2, width / 2]);
  const yScale = d3.scaleLinear()
    .domain([-height / 2, height / 2])
    .range([-height / 2, height / 2]);

  const xAxis = d3.axisBottom(xScale).ticks(5).tickSizeOuter(0);
  const yAxis = d3.axisLeft(yScale).ticks(5).tickSizeOuter(0);

  const axes = svg.append("g").attr("class", "axes");
  const xAxisGroup = axes.append("g").attr("class", "x-axis").attr("transform", `translate(0,${bottomY})`).call(xAxis);
  xAxisGroup.selectAll("text").style("font-size", "10px");
  const yAxisGroup = axes.append("g").attr("class", "y-axis").attr("transform", `translate(${leftX},0)`).call(yAxis);
  yAxisGroup.selectAll("text").style("font-size", "10px");

  // Axis labels
  xAxisGroup.append("text")
    .attr("class", "x-label")
    .attr("x", 0)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "currentColor")
    .text(xLabel);

  yAxisGroup.append("text")
    .attr("class", "y-label")
    .attr("transform", "rotate(-90)")
    .attr("x", 0)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "currentColor")
    .text(yLabel);

  const link = svg.append("g")
      .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
      .attr("stroke-opacity", linkStrokeOpacity)
      .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
      .attr("stroke-linecap", typeof linkStrokeLinecap !== "function" ? linkStrokeLinecap : null)
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("marker-end", (d, i) => {
      if (typeof linkMarker === "function") return `url(#${(linkMarker as any)(d).type})`;
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
    })
    ;


  const node = svg.append("g")
    .selectAll<SVGCircleElement, SimulationNodeDatum>("circle")
    .data(nodes)
    .join("circle")
    .attr("fill", nodeFill)
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
  .attr("r", nodeRadius)
  .call(drag(simulation));

  // Add text labels for each node
  const labelGroup = svg.append("g");
  const nodeLabels = labelGroup
    .selectAll("text")
    .data(nodes)
    .join("text")
    .text((_, i) => titles ? titles[i] : "")
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .style("user-select", "none")
    .style("pointer-events", "none");

  // Single selection + hover support
  let selectedId: string | number | null = null;

  function updateNodeStyles() {
    node
      .attr('stroke', (d: any) => d.id === selectedId ? 'orange' : (typeof nodeStroke === 'function' ? (nodeStroke as any)(d) : nodeStroke))
      .attr('stroke-width', (d: any) => {
        const base = typeof nodeStrokeWidth === 'function' ? (nodeStrokeWidth as any)(d) : (nodeStrokeWidth as any) ?? 1.5;
        return d.id === selectedId ? base * 1.8 : base;
      });
  }

  node.on('click', function(event, d: any) {
    event.stopPropagation();
    const id = d.id;
    if (selectedId === id) selectedId = null; else selectedId = id;
    updateNodeStyles();
    if (nodeOnClick) nodeOnClick(d as any, selectedId === id);
  });

  node.on('mouseover', function(_: any, d: any) {
    if (d.id !== selectedId) {
      const el = d3.select(this as any);
      const base = typeof nodeStrokeWidth === 'function' ? (nodeStrokeWidth as any)(d) : (nodeStrokeWidth as any) ?? 1.5;
      el.attr('stroke', 'rgba(0,0,0,0.8)').attr('stroke-width', base * 1.4);
    }
  }).on('mouseout', function(_: any, d: any) {
    if (d.id !== selectedId) {
      const el = d3.select(this as any);
      el.attr('stroke', typeof nodeStroke === 'function' ? (nodeStroke as any)(d) : nodeStroke)
        .attr('stroke-width', typeof nodeStrokeWidth === 'function' ? (nodeStrokeWidth as any)(d) : (nodeStrokeWidth as any) ?? 1.5);
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
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  function ticked() {
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        // Support function or number for nodeRadius
        const r = typeof nodeRadius === "function" ? nodeRadius(d.target) : nodeRadius;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.x;
        return d.target.x - (dx * r) / len;
      })
      .attr("y2", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const r = typeof nodeRadius === "function" ? nodeRadius(d.target) : nodeRadius;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (!len) return d.target.y;
        return d.target.y - (dy * r) / len;
      });

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    nodeLabels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  }

  function drag(simulation) {    
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return Object.assign(svg.node(), {scales: {color}});
}


export function ForceGraph<T, TLink = {}>(props: ForceGraphProps<T, TLink>) {
    const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = props.nodes;
    const links = props.links;

    if (ref.current) {
      // Remove previous SVG if any
      ref.current.innerHTML = "";
      ref.current.appendChild(createD3ForceGraph<T, TLink>({ nodes, links }, props));
    }
  }, [props.links, props.nodes]);

  return <div ref={ref} />;
}



type SampleNode = {
    id: string;
    group: string;
    x: number; // feasibility
    y: number; // viability
    size: number; // desirability
    benefit: number; 

}

type SampleLink = {
    source: string;
    target: string;
    attractionX: number;
    attractionY: number;
}


export const SampleForceGraph: React.FC = () => {
    const data: ForceGraphData<SampleNode, SampleLink> = {
      nodes: [
        // x: feasiblity
        // y: viablity
        // size: desirability
        // color: benefit
        // framing parameters: MUST
        // Green shadow: Universal Synergy
        { id: "1", group: "A", x: 200, y: 300, size: 5, benefit: 0.8 },
        { id: "2", group: "B", x: 100, y: 500, size: 6, benefit: 0 },
        { id: "3", group: "A", x: 300, y: 400, size: 3, benefit: -0.6 },
        { id: "4", group: "B", x: 150, y: 600, size: 8, benefit: .1 },
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

    return <ForceGraph
        xLabel="Feasibility"
        yLabel="Viability"
      nodes={data.nodes}
      links={data.links} 
      linkStrength={link => attractionDist(link) / 100}
      // linkStrengthX={link => link.attractionX }
      // linkStrengthY={link => link.attractionY  }
      linkMarker={link => attractionDist(link) > 0 ? { type: "arrow", size: 6 } : { type: "none", size: 0 }}
      linkStroke={link => attractionDist(link) > 0.01 ? "green" : attractionDist(link) < 0.01 ? "red" : "gray"}

      nodeRadius={node => node.size * 5}
      nodeTitle={node => node.group}  
      nodeFill={node => {
    // node.sentiment: -1 (red), 0 (white), 1 (green)
    if (node.benefit <= 0) {
      // Blend from red to white
      return d3.interpolateRgb("red", "white")(node.benefit + 1);
    } else {
      // Blend from white to green
      return d3.interpolateRgb("white", "green")(node.benefit);
    }
  }}
    
    />;
};

function attractionDist(link: SampleLink) {
  return Math.sign(link.attractionX + link.attractionY) * Math.sqrt(link.attractionX ** 2 + link.attractionY ** 2);
}