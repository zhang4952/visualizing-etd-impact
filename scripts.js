//=========================================================================================
// Code is adapted from Kerry Rodden's "Zoomable sunburst with updating data" Block
// Which can be found at http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
// And Joshuah Latimore’s Block "JsonToPartiontion"
// Found here http://bl.ocks.org/jsl6906/ad15363febc1be45301b
//
// Author: Luke Goertzen
// Purpose: JS and D3 for ETD Visualization App
//=========================================================================================




//=========================================================================================
// Setup 
//=========================================================================================

var margin = {top: 400, right: 480, bottom: 350, left: 330},
    radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 10;

var hue = d3.scale.category20();

var luminance = d3.scale.sqrt()
    .domain([0, 1e6])
    .clamp(true)
    .range([90, 20]);

var svg = d3.select("body").append("svg")
    .attr("width",  margin.left + margin.right + 300)
    .attr("height", margin.top  + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var partition = d3.layout.partition()
    .sort(function(a, b) { return d3.descending(a.arcSize, b.arcSize); })
    .size([2 * Math.PI, radius]);

var arc = d3.svg.arc()
    .startAngle( function(d) { return d.x; })
    .endAngle(   function(d) { return d.x + d.dx - 0.0001 / (d.depth + 0.5); })
    .innerRadius(function(d) { return radius / 3 * d.depth; })
    .outerRadius(function(d) { return radius / 3 * (d.depth + 1) - 1; });

var center;
var download_count;
var path_details;
var nodeIndicators;
var pathLevel;
var path;


//=========================================================================================
// Parse CSC, Draw SVG and handle transistions
//=========================================================================================
d3.csv('statistics_1000.csv', function (error, data) {

  populateFilterList(getAllDegreeNames(data));  // Create options in filter drop-down menu
  root = formatPartition(data);                 // Turn csv data array into properly formatted hierarchy for sunburst graph
  createInfoLabels();                           // Creates elements to display relevant info about current node
  initialDrawGraph();                           // Inital draw paths for node blocks


});  










//=========================================================================================
// Formats csv to be used in partition, with
// d3.nest() and some restructuring of the tree
// in order to maintain good comprehension of visualization 
//=========================================================================================
function formatPartition(data) {

  // Nest function - 3 options for the user to choose from
  var root = nestLevel_Name_Year(data);

  renameKeys(root);                   // Rename object keys/values generated from d3.nest() to name/children
  sumChildrenDownLoads(root);         // Recursively calculate the sum of downloads for each node
  groupByDownloads(root);             // Group children if there are too many for a clean graph
  countThesis(root);                  // Recursively count the number of theses for each node

  // Compute the initial layout on the entire tree 
  partition
      .value(function(d) { return d.size; })
      .nodes(root)
      .forEach(function(d) {
        d._children = d.children;     // Some functions use _children 
        d.key = key(d);               // Create key for node
        d.trueDepth = d.depth;        // TrueDepth wont change based on zoom, unlike depth
        d.fill = fill(d);             // Assign the node a color 
      });

  // Redefine the value function to use the previously-computed sum.
  // Change the 'depth < 2' to change max levels shown at once
  partition
      .children(function(d, depth) { return depth < 2 ? d._children : null; })
      .value(function(d) { return d.arcSize; });

  return root;
}


//=========================================================================================
// Set of functions to change how d3.nest() creates the tree hierarchy
// The order will change based on user selection between 3 options
//=========================================================================================
// Sort Degree_Level > Degree_Name > Year
function nestLevel_Name_Year(data) {
  return { "key": "All Articles", "values": d3.nest()
    .key(function(d) { return d.degree_level; })
    .key(function(d) { return d.degree_name; })
    .key(function(d) { return d.year; })
    .key(function(d) { return d.title; })
    .rollup(function(leaves) { return d3.sum(leaves, function(d) { return + d.downloads; }); })
    .entries(data) };
}

// Sort Degree_Level > Year > Degree_Name
function nestLevel_Year_Name(data) {
  return { "key": "All Articles", "values": d3.nest()
    .key(function(d) { return d.degree_level; })
    .key(function(d) { return d.year; })
    .key(function(d) { return d.degree_name; })
    .key(function(d) { return d.title; })
    .rollup(function(leaves) { return d3.sum(leaves, function(d) { return + d.downloads; }); })
    .entries(data) };
}

// Sort Year > Degree_Level > Degree_Name
function nestYear_Level_Name(data) {
    return { "key": "All Articles", "values": d3.nest()
    .key(function(d) { return d.year; })
    .key(function(d) { return d.degree_level; })
    .key(function(d) { return d.degree_name; })
    .key(function(d) { return d.title; })
    .rollup(function(leaves) { return d3.sum(leaves, function(d) { return + d.downloads; }); })
    .entries(data) };
}


//=========================================================================================
// If a node has more than 10 children, keep first 9 as is, 
// Put rest in an 'Other' block as a child of that node
// If already an 'Other' block, break up children into chunks of 16 or less
//=========================================================================================
function groupByDownloads(root) {
  // Make sure 'root' is an object and has children
  if ((typeof root === 'object') && (root !== null) && (root.hasOwnProperty("children"))) {

    // Node has more than 10 chilren and is not already an 'Other' block
    if ((root.children.length > 10) && (root.name.indexOf('Other') == -1)) {
      
      // /Creat object node to hold the excess nodes
      var other = {};
      other.name = "Other " + root.name;
      
      // Split children, keep first 9 in root and put the rest into Other
      root.children.sort(function(a,b) { return b.downloads - a.downloads });
      other.children = root.children.slice(9);
      root.children  = root.children.slice(0,9);

      // Find and set total number of downloads in Others
      var otherDownloadCount = 0;
      for (i in other.children) 
        otherDownloadCount += other.children[i].downloads; 
      other.downloads = otherDownloadCount;

      // Set other's arcSize to be the same size of 9th child of root - this keeps it as smallest/last node when displayed
      // Remainder is the amount of arcSize removed from 'Other' and needs to be distributed to other 9 blocks, proportionally
      other.arcSize = root.children[8].downloads;
      var remainder = otherDownloadCount - other.arcSize;

      // Reduce the arcsize of other's children as well,
      for (i in other.children) 
        other.children[i].arcSize *= other.arcSize/root.downloads;

      // Add the remainder (i.e. sumDownloads(other.children) - other.arcSize) to the first 9 children of root
      // This keeps arc size ratios more consistent with download count
      for (i = 0; i < 9; i++)
        root.children[i].arcSize += Math.round(remainder * (root.children[i].downloads/(root.downloads - otherDownloadCount))); 

      // Make Other a child of the current node
      root.children.push(other);
    } 
    // Node has more than 16 children and is an 'Other' block
    // Puts the many children of an 'Other' block into more managable chunks of size 16 or less
    else if ((root.name.indexOf('Other') != -1) && (root.children.length > 16)) {
        groupOthers(root);
    }

    // Recursively group downloads in child nodes
    for (i in root.children)
      groupByDownloads(root.children[i]);
  }
}

// Groups nodes that are already children of an 'Other' block
function groupOthers(root) {
  var childCount   = root.children.length
  var numSubBlocks = Math.ceil(childCount/16);
  var subBlocks    = [];
  var rootArcSize  = root.arcSize;

  for (i = 0; i < numSubBlocks; i++) {
    var temp  = {};
    temp.name = root.name + " Group " + (i+1);

    // Extract last 16 of root
    temp.children = root.children.slice(0,16);
    root.children = root.children.slice(16);

    // Sum downloads and arc sizes
    var tempDownloadCount = 0, tempArcSize = 0;
    for (child in temp.children) {
      tempDownloadCount += temp.children[child].downloads; 
      tempArcSize       += temp.children[child].arcSize;
    }
    temp.downloads = tempDownloadCount;
    temp.arcSize   = Math.round(rootArcSize/numSubBlocks);

    // Gives children equal sized arcSize
    for (child in temp.children)
      temp.children[child].arcSize = Math.round(temp.arcSize/temp.children.length);

    // Add group to array
    subBlocks.push(temp);
  }
  // Replace root's children with and grouped version
  root.children = subBlocks;
}


//=========================================================================================
// Calculate download counts for each node in the tree recursively
//=========================================================================================
function sumChildrenDownLoads(node) {
  if (node.hasOwnProperty("children")) {
    var sum = 0;
    for (i in node.children) 
      sum += sumChildrenDownLoads(node.children[i]);  
    node.downloads = node.arcSize = sum;
    return sum;
  } 
  else return node.downloads = node.arcSize = node.size;
}


//=========================================================================================
// Calculate theses counts for each node in the tree recursively
//=========================================================================================
function countThesis(node) { 
  if (node.hasOwnProperty("children")) {
    var sum = 0;
    for (i in node.children) 
      sum += countThesis(node.children[i]);  
    node.thesesCount = sum;
    return sum;
  } 
  else return 1;
}


//=========================================================================================
// Populates filter list with degree_names
// Nest will only keep articles of that degree name
// That degree becomes root, followed by year
// Maybe add secondary option to check if user wants only a particular degree level
//=========================================================================================

// Adds degree names to filter dropdown menu
function populateFilterList(names) {
  var filterMenu = document.getElementById("FilterMenu");
  for (i in names) {
    var option   = document.createElement('option');
    option.text  = names[i];
    option.value = 1;
    filterMenu.add(option, 0);
  }
}

// Gets the degree names from the parsed csv
function getAllDegreeNames(data) {
  var names = [];
  for (i in data)
    names.push(cleanText(data[i].degree_name.slice(data[i].degree_name.lastIndexOf("in ") + 3)));
  return uniqueDegreeNames(names).sort();
}

// Remove Duplicate Degree Names
function uniqueDegreeNames(array) {
  var seen = {};
  return array.filter(function(item) {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
}
                            
// Cleans the text and makes it more uniform                  //Remember this when filtering out articles
function cleanText(string) {
  return string
          .replace('&', 'and', 'g')
          .replace(/(\r\n|\n|\r|,\s|\t])/gm, ' ')
          .replace('Sciences', 'Science')
          .replace(/ *\([^)]*\) */g, "");
          // .replace(/[^a-zA-z ]/gi,' ');
}



//=========================================================================================
// Rename the keys created by d3.nest() into more descriptive names
//=========================================================================================
function renameKeys(d) {
  d.name = d.key; delete d.key;
  if (typeof d.values === "number")  d.size = d.values;
  else d.values.forEach(renameKeys), d.children = d.values;
  delete d.values;
}


//=========================================================================================
// Creates the key for nodes
//=========================================================================================
function key(d) {
  var k = [], p = d;
  while (p.depth) k.push(p.name), p = p.parent;
  return k.reverse().join(".");
}


//=========================================================================================
// Calculate color for nodes based on parent nodes when relevant
//=========================================================================================
function fill(d) {
  if (d.trueDepth <= 1) { 
    var fill_info = d3.hcl(hue(d.key));
    fill_info.c  *= 1.5;
    fill_info.l  *= .75;
  }
  else { 
    var colorAdjust = d3.scale.linear().domain([0,d.parent.children.length]).range([-20,25]);
    var fill_info   = d3.hcl(d.parent.fill);
    fill_info.l    *= 1.1;
    fill_info.h    += colorAdjust(d.parent.children.indexOf(d));
  } 
  return fill_info;
}


//=========================================================================================
// Interpolate the arcs in data space
//=========================================================================================
function arcTween(b) {
  var i = d3.interpolate(this._current, b);
  this._current = i(0);
  return function(t) { return arc(i(t)); };
}


//=========================================================================================
// Update arc properties / coordinates
//=========================================================================================
function updateArc(d) {
  return { depth: d.depth, x: d.x, dx: d.dx };
}


//=========================================================================================
// Controls how graph zooms in and out
//=========================================================================================
function zoomIn(p) {
  if (p.depth > 1) p = p.parent;
  if (!p.children) return;
  zoom(p, p);
}

function zoomOut(p) {
  if (!p.parent) return;
  zoom(p.parent, p);
}


//=========================================================================================
// Handles zooming functionality
//=========================================================================================
function zoom(root, p) {
  if (document.documentElement.__transition__) return;

  // Rescale outside angles to match the new layout.
  var enterArc,
      exitArc,
      outsideAngle = d3.scale.linear().domain([0, 2 * Math.PI]);

  function insideArc(d) {
    return p.key > d.key
        ? {depth: d.depth - 1, x: 0, dx: 0} : p.key < d.key
        ? {depth: d.depth - 1, x: 2 * Math.PI, dx: 0}
        : {depth: 0, x: 0, dx: 2 * Math.PI};
  }

  function outsideArc(d) {
    return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
  }

  center.datum(root);

  // When zooming in, arcs enter from the outside and exit to the inside.
  // Entering outside arcs start from the old layout.
  if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]);

  path = path.data(partition.nodes(root).slice(1), function(d) { return d.key; });

  // When zooming out, arcs enter from the inside and exit to the outside.
  // Exiting outside arcs transition to the new layout.
  if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

  // Draw new paths and remove old ones
  d3.transition().duration(750).each(function() {
    path.exit().transition()
        .style("fill-opacity", function(d) { return d.depth === 1 + (root === p) ? 1 : 0; })
        .attrTween("d", function(d) { return arcTween.call(this, exitArc(d)); })
        .remove();

    path.enter().append("path")
        .style("fill-opacity", function(d) { return d.depth === 2 - (root === p) ? 1 : 0; })
        .style("fill",   function(d) { return d.fill; })
        .on("mouseover", function(d) { return nodeMouseOver(d); } )
        .on("mouseout",  function(d) { return nodeMouseOut(d); })
        .on("click", zoomIn)
        .each(function(d) { this._current = enterArc(d); });

    path.transition()
        .style("fill-opacity", 1)
        .attrTween("d", function(d) { return arcTween.call(this, updateArc(d)); });
  });
}


//=========================================================================================
// Define the behavior of the page based on hover over blocks
//=========================================================================================

// Define behavior of elements based on mouseover
function nodeMouseOver(n) {
  download_count.text(n.downloads);

  // Update the information of the path indicators
  var i = 3, level = 'n';
  for (; i > n.trueDepth; i--) {
    pathLevel[i-1].text("");
    nodeIndicators[i-1].style('fill', 'lightgray');
  }
  for (; i > 0; i--) {
    pathLevel[i-1].text(eval(level+'.name'));
    nodeIndicators[i-1].style('fill', eval(level+'.fill'));
    level += '.parent';
  }
}

// Define behavior of elements based on mouseout
function nodeMouseOut(n) {}


//=========================================================================================
// Creates elements to display relevant info about current node
//=========================================================================================
function createInfoLabels() {
 // Draw clickable center svg to zoom out
  center = svg.append('circle')
      .attr('r', radius / 3)
      .style('fill', 'white')
      .on('click', zoomOut);

  // Put a total download count in the center                     //Change info that is displayed here
  download_count = svg.append('text')
      .attr('x', margin.right - margin.left - 150)
      .attr('y', margin.top - margin.bottom - 40)
      .attr('font-size', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'gray')
      .text('');

  // Group for displaying path to current node
  path_details = svg.append("g").attr("transform","translate("+450+","+00+")");
  
  // Colored indicators next to details for clarity
  nodeIndicators = [];
  for (i = 0; i < 3; i++) {
    nodeIndicators.push(path_details.append("circle")
        .attr("r", 15)
        .attr("cy",0 + 50*i)
        .style("fill","lightgray"));
  }

  // Display the path to current node
  pathLevel = [];
  for (i = 0; i < 3; i++) {
    pathLevel.push(path_details.append("text")
        .attr("x", 30)
        .attr("y",5+ 50*i)
        .attr("font-size", 20)
        .attr("text-anchor", "left")
        .style("fill", "gray"));
  }
}


//=========================================================================================
// Inital draw paths for node blocks
//=========================================================================================
function initialDrawGraph() {
  path = svg.selectAll("path")
      .data(partition.nodes(root).slice(1))
    .enter().append("path")
      .attr("d", arc)
      .style("fill",   function(d){ return d.fill; })
      .on("mouseover", function(d){ return nodeMouseOver(d); } )
      .on("mouseout",  function(d){ return nodeMouseOut(d); })
      .each(function(d) { this._current = updateArc(d); })
      .on("click", zoomIn);
}

