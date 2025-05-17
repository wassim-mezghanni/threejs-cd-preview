import * as d3 from "d3";
import { Plot } from "@observablehq/plot";

// Function to create hierarchical data from events and edges
async function createHierarchy(eventsData, edgesData) {
    
  // Create a map of events 
  const eventMap = new Map(eventsData.map(d => [d.ID, { 
    ...d, 
    children: [],
    date: new Date(d.Date.split('-').reverse().join('-')), 
    world: d.World,
    description: d.Description,
    characters: d.Characters
  }]));
  
  
  edgesData.forEach(edge => {
    const source = eventMap.get(edge.Source);
    const target = eventMap.get(edge.Target);
    if (source && target) {
      source.children.push({
        ...target,
        edgeType: edge.Type,
        edgeDescription: edge.Description
      });
    }
  });

  
  const targetIds = new Set(edgesData.map(d => d.Target));
  const rootEvents = eventsData.filter(d => !targetIds.has(d.ID));

  return d3.hierarchy(eventMap.get(rootEvents[0].ID));
}


export async function createChart() {
  // Load the CSV data
  const [eventsData, edgesData] = await Promise.all([
    d3.csv("/Users/wassim/threejs-cd-preview/ressources/Dark_GD_Contest_Events.csv"),
    d3.csv("/Users/wassim/threejs-cd-preview/ressources/Dark_GD_Contest_Edges.csv")
  ]);

  const width = 1200;
  const root = await createHierarchy(eventsData, edgesData);
  const dx = 10;
  const dy = width / (root.height + 1);

 
  const tree = d3.cluster().nodeSize([dx, dy]);

  // Sort the tree and apply the layout
  root.sort((a, b) => a.data.date - b.data.date);
  tree(root);

 
  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  
  const height = x1 - x0 + dx * 2;

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-dy / 3, x0 - dx, width, height])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  // Add links
  const link = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)
    .selectAll()
    .data(root.links())
    .join("path")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x))
    .attr("stroke-dasharray", d => d.target.data.edgeType === "dashed arrow" ? "5,5" : null);

  
  const node = svg.append("g")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .selectAll()
    .data(root.descendants())
    .join("g")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  
  node.append("circle")
    .attr("fill", d => {
      if (d.data.Important_Trigger === "TRUE") return "#ff0000";
      if (d.data.Death === "TRUE") return "#000000";
      return d.children ? "#555" : "#999";
    })
    .attr("r", 2.5);

  
  node.append("text")
    .attr("dy", "0.31em")
    .attr("x", d => d.children ? -6 : 6)
    .attr("text-anchor", d => d.children ? "end" : "start")
    .text(d => `${d.data.Date} - ${d.data.Description.substring(0, 30)}...`)
    .attr("stroke", "white")
    .attr("paint-order", "stroke");

  
  node.append("title")
    .text(d => `
      Date: ${d.data.Date}
      World: ${d.data.World}
      Description: ${d.data.Description}
      Characters: ${d.data.Characters}
      ${d.data.edgeType ? `\nEdge Type: ${d.data.edgeType}` : ''}
      ${d.data.edgeDescription ? `\nEdge Description: ${d.data.edgeDescription}` : ''}
    `);

  return svg.node();
}


createChart().then(svg => {
  document.body.appendChild(svg);
});

Plot.plot({
  axis: null,
  margin: 10,
  marginLeft: 40,
  marginRight: 160,
  width: 928,
  height: 2500,
  marks: [
    Plot.cluster(flare, {path: "name", delimiter: "."})
  ]
})