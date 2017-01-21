// Code is adapted from Kerry Rodden's "Zoomable sunburst with updating data" Block
// Which can be found at http://bl.ocks.org/kerryrodden/477c1bfb081b783f80ad



// Define Visualizer Size and Color
var width = 1000,
    height = 800,
    radius = Math.min(width, height) / 2 - 50;

var x = d3.scale.linear()
          .range([0, 2 * Math.PI]);

var y = d3.scale.sqrt()
          .range([0, radius]);

var color = d3.scale.category20c();

var svg = d3.select("body").append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

var partition = d3.layout.partition()
                  .sort(null)
                  .value(function(d) { return 1; });

var arc = d3.svg.arc()
            .startAngle( function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
            .endAngle(   function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
            .innerRadius(function(d) { return Math.max(0, y(d.y)); })
            .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });





// Original from sample
//----------------------------------------------------------

// Keep track of the node that is currently being displayed as the root.
// var node;
// d3.json("flare.json", function(error, root) {

//   console.log(root);

//   node = root;
//   var colorHolder
//   var path = svg.datum(root).selectAll("path")
//                 .data(partition.nodes)
//               .enter().append("path")
//                 .attr("d", arc)
//                 .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
//                 .on("click", click)
//                 .on("mousemove", function(d){d3.select("#currentNode").text(d.name)})
//                 .on("mouseout",  function() {d3.select("#currentNode").text("Current Node")})
//                 .each(stash);

//   d3.selectAll("input").on("change", function change() {
//     var value = this.value === "count"
//         ? function() { return 1; }
//         : function(d){ return d.size; };

//     path
//         .data(partition.value(value).nodes)
//       .transition()
//         .duration(1000)
//         .attrTween("d", arcTweenData);
//   });

//   function click(d) {
//     node = d;
//     path.transition()
//         .duration(400)
//         .attrTween("d", arcTweenZoom(d));
//   }

// });


//----------------------------------------------------------




// In progress 
// Nesting to get csv parsed data into usable hierarchy
// Working on getting the downloads to be summed and made into a field at each level of the hierarchy
//----------------------------------------------------------

var node;
d3.csv("statistics_mini.csv", function(error, root) {

  //Parsed but only 2 leveled data
  console.log(root);


  // Create heirarchy with degree level > year > degree name > articles
  var nestedData = d3.nest()
              .key(function(d) { return d.degree_level;}).sortKeys(d3.ascending)
              .key(function(d) { return d.year;}).sortKeys(d3.ascending)
              .key(function(d) { return d.degree_name;}).sortKeys(d3.ascending)
              .entries(root);


  node = root;

  console.log(nestedData);
  console.log(nestedData[0]);

  //Create paths to display the heirarchy
  var colorHolder
  var path = svg.datum(nestedData).selectAll("path")
                .data(partition.nodes)
              .enter().append("path")
                .attr("d", arc)
                .style("fill", function(d) { return color(d.key); })
                .on("click", click)
                .on("mousemove", function(d){d3.select("#currentNode").text("Will Display Block Info Here")})
                .on("mouseout",  function() {d3.select("#currentNode").text("Current Node")})
                .each(stash);




  d3.selectAll("input").on("change", function change() {
      var value = this.value === "count"
          ? function() { return 1; }
          : function(d){ return d.size; };

    path
        .data(partition.value(value).nodes)
      .transition()
        .duration(1000)
        .attrTween("d", arcTweenData);
  });

  function click(d) {
    node = d;
    path.transition()
        .duration(400)
        .attrTween("d", arcTweenZoom(d));
  }

});

//----------------------------------------------------------





d3.select(self.frameElement).style("height", height + "px");


// Setup for switching data: stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}


// When switching data: interpolate the arcs in data space.
// This ensures that data populates complete circumference
function arcTweenData(a, i) {
  var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  function tween(t) {
    var b = oi(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  }
  if (i == 0) {
   // If on the first arc, adjust the x domain to match the root node
   // at the current zoom level. (We only need to do this once.)
    var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
    return function(t) {
      x.domain(xd(t));
      return tween(t);
    };
  } else {
    return tween;
  }
}


// When zooming: interpolate the scales.
function arcTweenZoom(d) {
  var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, 1]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}

