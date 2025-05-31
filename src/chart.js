import * as d3 from "d3";
import { Plot } from "@observablehq/plot";
import { CDData } from "../data.js";

// Function to create hierarchical data from events and edges
async function createHierarchy(eventsData, edgesData) {
  try {
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

    if (rootEvents.length === 0) {
      throw new Error("No root events found in the data");
    }

    return d3.hierarchy(eventMap.get(rootEvents[0].ID));
  } catch (error) {
    console.error("Error creating hierarchy:", error);
    throw error;
  }
}

export async function createChart() {
  try {
    const [eventsData, edgesData] = await Promise.all([
      d3.csv("./ressources/Dark_GD_Contest_Events.csv"),
      d3.csv("./ressources/Dark_GD_Contest_Edges.csv")
    ]);
    if (!eventsData || !edgesData) {
      throw new Error("Failed to load CSV data");
    }

    // Tree Layout Configuration
    const width = 12288;
    const height = 1200;
    const root = await createHierarchy(eventsData, edgesData);
    const dx = 20;
    const dy = width / (root.height + 1);

    const tree = d3.cluster().nodeSize([dx, dy]);

    root.sort((a, b) => a.data.date - b.data.date);
    tree(root);

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-dy / 3, x0 - dx, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 16px sans-serif;");

    // links (Edges) Visualization
    const link = svg.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 3)
      .selectAll()
      .data(root.links())
      .join("path")
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x))
      .attr("stroke-dasharray", d => d.target.data.edgeType === "dashed arrow" ? "10,10" : null);

    // Nodes Visualization
    const node = svg.append("g")
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .selectAll()
      .data(root.descendants())
      .join("g")
      .attr("transform", d => `translate(${d.y},${d.x})`);

    // Nodes by colors (important trigger : red, death : black, other : gray)
    node.append("circle")
      .attr("fill", d => {
        if (d.data.Important_Trigger === "TRUE") return "#ff0000";
        if (d.data.Death === "TRUE") return "#000000";
        return d.children ? "#555" : "#999";
      })
      .attr("r", 5);
  
    // Nodes by text (date, description, characters, edge type, edge description)
    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -8 : 8)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => `${d.data.Date} - ${d.data.Description.substring(0, 50)}...`)
      .attr("stroke", "white")
      .attr("paint-order", "stroke")
      .attr("font-weight", "bold");

      
    node.append("title")
      .text(d => `
        Date: ${d.data.Date}
        World: ${d.data.World}
        Description: ${d.data.Description}
        Characters: ${d.data.Characters}
        ${d.data.edgeType ? `\nEdge Type: ${d.data.edgeType}` : ''}
        ${d.data.edgeDescription ? `\nEdge Description: ${d.data.edgeDescription}` : ''}
      `);

    // Convert SVG to a data URL
    const svgString = new XMLSerializer().serializeToString(svg.node());
    const svgBlob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image element to load the SVG
    const img = new Image();
    img.onload = () => {
      // Create a canvas to draw the SVG
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw the SVG onto the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert canvas to image data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      
      // Update the cylindrical display data
      CDData[0].textureUrl = imageDataUrl;
    };
    img.src = svgUrl;

    return svg.node();
  } catch (error) {
    console.error("Error creating chart:", error);
    throw error;
  }
}

// Initialize the chart
createChart().then(svg => {
  document.body.appendChild(svg);
}).catch(error => {
  console.error("Failed to initialize chart:", error);
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