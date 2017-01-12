// Code is adapted from Kerry Rodden's "Zoomable sunburst with updating data" Block
// Which can be found at http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad
// And Joshuah Latimore’s Block "JsonToPartiontion"
// Found here http://bl.ocks.org/jsl6906/ad15363febc1be45301b


var margin = {top: 400, right: 480, bottom: 350, left: 480},
    radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) - 10;

var hue = d3.scale.category20();

// var luminance = d3.scale.sqrt()
//     .domain([0, 1e6])
//     .clamp(true)
//     .range([90, 20]);

var svg = d3.select("body").append("svg")
    .attr("width", margin.left + margin.right)
    .attr("height", margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var partition = d3.layout.partition()
    .sort(function(a, b) { return d3.ascending(a.name, b.name); })
    .size([2 * Math.PI, radius]);

var arc = d3.svg.arc()
    .startAngle( function(d) { return d.x; })
    .endAngle(   function(d) { return d.x + d.dx - 0.01 / (d.depth + 0.5); })
    .innerRadius(function(d) { return radius / 3 * d.depth; })
    .outerRadius(function(d) { return radius / 3 * (d.depth + 1) - 1; });




d3.csv('statistics_1000.csv', function (error, data) {

  // Create proper hierarchy from the flat data with nest
  // The order will change based on user selection in radio boxes
  var root = { "key": "Articles", "values": d3.nest()
    .key(function(d) { return d.degree_level; })
    .key(function(d) { return d.degree_name; })
    .key(function(d) { return d.year; })
    .key(function(d) { return d.title; })
    .rollup(function(leaves) { return d3.sum(leaves, function(d) { return + d.downloads; }); })
    .entries(data)
  };
// sortKeys(function(a,b) {return (a.downloads < b.downloads) ? a : b;})
// sortKeys(function(a,b) { return priority_order.indexOf(a) - priority_order.indexOf(b); })



  // Rename object keys/values generated from d3.nest() to name/children
  renameKeys(root);
  console.log(root);


  // Compute the initial layout on the entire tree to sum sizes.
  // Also compute the full name and fill color for each node,
  // and stash the children so they can be restored as we descend.
  partition
      .value(function(d) { return d.size; })
      .nodes(root)
      .forEach(function(d) {
        d._children = d.children;
        d.downloads = d.value;
        d.key = key(d);
        d.fill = fill(d);
      });


  // Redefine the value function to use the previously-computed sum.
  partition
      .children(function(d, depth) { return depth < 2 ? d._children : null; })
      .value(function(d) { return d.downloads; });



  // Draw clickable center svg to zoom out
  var center = svg.append("circle")
      .attr("r", radius / 3)
      .style("fill", "white")
      .on("click", zoomOut);

  center.append("title").text("zoom out");


 
  var download_count = svg.append("text")
        .attr("x",margin.right - margin.left)
        .attr("y",margin.top - margin.bottom - 40)
        .attr("font-size", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "gray")
        .text("");



  console.log(root);

  // Draw Nodes
  var path = svg.selectAll("path")
      .data(partition.nodes(root).slice(1))
    .enter().append("path")
      .attr("d", arc)
      .style("fill", function(d) { return d.fill; })
      .on("mouseover", function(d){d3.select("#currentNode").text(d.parent.name + " -> " + d.name + " Downloads: " + d.downloads); download_count.text(d.downloads);})
      .on("mouseout",  function() {d3.select("#currentNode").text("Current Node"); download_count.text("");})
      .each(function(d) { this._current = updateArc(d); })
      .on("click", zoomIn);

  function zoomIn(p) {
    if (p.depth > 1) p = p.parent;
    if (!p.children) return;
    zoom(p, p);
  }

  function zoomOut(p) {
    if (!p.parent) return;
    zoom(p.parent, p);
  }



  function MouseOver(n){

  }

  function nodeMouseOut(n){

  }



  // Zoom to the specified new root.
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

    d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function() {
      path.exit().transition()
          .style("fill-opacity", function(d) { return d.depth === 1 + (root === p) ? 1 : 0; })
          .attrTween("d", function(d) { return arcTween.call(this, exitArc(d)); })
          .remove();

      path.enter().append("path")
          .style("fill-opacity", function(d) { return d.depth === 2 - (root === p) ? 1 : 0; })
          .style("fill", function(d) { return d.fill; })
          .on("mouseover", function(d){d3.select("#currentNode").text(d.parent.name + " -> " + d.name + " Downloads: " + d.downloads); download_count.text(d.downloads);})
          .on("mouseout",  function() {d3.select("#currentNode").text("Current Node"); download_count.text("");})
          .on("click", zoomIn)
          .each(function(d) { this._current = enterArc(d); });

      path.transition()
          .style("fill-opacity", 1)
          .attrTween("d", function(d) { return arcTween.call(this, updateArc(d)); });
    });
  }
});


function renameKeys(d) {
  d.name = d.key; delete d.key;
  if (typeof d.values === "number") d.size = d.values;
  else d.values.forEach(renameKeys), d.children = d.values;
  delete d.values;
}

function key(d) {
  var k = [], p = d;
  while (p.depth) k.push(p.name), p = p.parent;
  return k.reverse().join(".");
}




function fill(d) {
  if (d.depth <= 1) //First Level (ignoring 0th level that is the object that contains all the data)
  {
    var fill_info = d3.hcl(hue(d.key));
    fill_info.c *= 1.5;
    fill_info.l *= .8;
    return fill_info;
  }
  else //Return lighter color of similar hue as parent
  {
    colorAdjust = d3.scale.linear().domain([0,d.parent.children.length]).range([0,30])
    var fill_info = d3.hcl(d.parent.fill);
    fill_info.l *= 1.12;
    fill_info.h += colorAdjust(d.parent.children.indexOf(d));
    return fill_info;
  }

}

function arcTween(b) {
  var i = d3.interpolate(this._current, b);
  this._current = i(0);
  return function(t) {
    return arc(i(t));
  };
}

function updateArc(d) {
  return {depth: d.depth, x: d.x, dx: d.dx};
}