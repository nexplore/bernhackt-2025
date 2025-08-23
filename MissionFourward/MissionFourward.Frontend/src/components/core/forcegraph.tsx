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
  const LM = typeof linkMarker !== "function" ? null : d3.map(links, d => linkMarker(d)?.type);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (node, i) => ({...node, id: N[i]}));
  links = d3.map(links, (link, i) => ({...link, source: LS[i], target: LT[i]}));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id(({index: i}) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3.forceSimulation(nodes)
      .force("link", forceLink)
      .force("charge", forceNode)
      .force("center",  d3.forceCenter())
      .force('collide', d3.forceCollide().radius(nodeRadius))
      .on("tick", ticked);

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
    .attr("marker-end", typeof linkMarker === "function"
      ? (d) => `url(#${linkMarker(d).type})`
      : linkMarker ? `url(#${linkMarker})` : "url(#arrow)")
    .attr("markerWidth", typeof linkMarker === "function"
      ? (d) => linkMarker(d).size : 12)
    .attr("markerHeight", typeof linkMarker === "function"
      ? (d) => linkMarker(d).size : 12)
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

  node.on('mouseover', function(event, d: any) {
    if (d.id !== selectedId) {
      const el = d3.select(this as any);
      const base = typeof nodeStrokeWidth === 'function' ? (nodeStrokeWidth as any)(d) : (nodeStrokeWidth as any) ?? 1.5;
      el.attr('stroke', 'rgba(0,0,0,0.8)').attr('stroke-width', base * 1.4);
    }
  }).on('mouseout', function(event, d: any) {
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
    attraction: number;
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
        { source: "1", target: "2", attraction: 0.5 },
        { source: "2", target: "3", attraction: 1.2 },
        { source: "3", target: "4", attraction: -0.1 },
      ],
    };

    return <ForceGraph
        xLabel="Feasibility"
        yLabel="Viability"
      nodes={data.nodes}
      links={data.links} 
      linkStrength={link => link.attraction / 50 }
      linkMarker={link => link.attraction > 0 ? { type: "arrow", size: 6 } : { type: "none", size: 0 }}
      linkStroke={link => link.attraction > 0.1 ? "green" : link.attraction < 0.1 ? "red" : "gray"}

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