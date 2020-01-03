
//------------------------Create Map-------------------------------------------------------------------------------------------------------------------------------------------

var map = L.map("map");

// map settings
bounds = [[40.46554008834934, -74.75595705177238], [40.91560726799925, -73.6897545181533]];
map.setMaxBounds(bounds);
map.options.minZoom = 11;
map.options.maxZoom = 17;

// when publishing layer link in Mapbox, make sure to click Third Party > CARTO to get the right link
L.tileLayer("https://api.mapbox.com/styles/v1/jason-danforth/ck45xl2k6185n1cs6roy1gtid/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiamFzb24tZGFuZm9ydGgiLCJhIjoiY2syYjEwZzY1MXQ4dTNibzByeTVxdGdkNSJ9.77YDE0E7AwLjUoctWCDHeg", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  accessToken: API_KEY
}).addTo(map);

// This layer is for adding individual zipcode objects to. One on click, and one nearest neighbor 
var zipLayer = L.layerGroup();
map.addLayer(zipLayer);



//------------------------Add Raster Underlay-------------------------------------------------------------------------------------------------------------------------------------------

// Specify the layer for the zipcodes so that they show up on top
map.createPane('rasterLayer');
map.getPane('rasterLayer').style.zIndex = 0;

var imageUrl = "static/images/map_underlay_small.png",
imageBounds = [[40.49554008834934, -74.25595705177238], [40.91560726799925, -73.6997545181533]];

var rasterUnderlay = L.imageOverlay(imageUrl, imageBounds, {pane: "rasterLayer"}).addTo(map);

// Remove raster layer when zoomed in
map.on('zoomend', function () {
    if (map.getZoom() > 14.5) {
        map.removeLayer(rasterUnderlay);
    }
    if (map.getZoom() < 14.5)
    {
        map.addLayer(rasterUnderlay);
    }   
});



//------------------------add Zip Code geojson-------------------------------------------------------------------------------------------------------------------------------------------

// Specify the layer for the zipcodes so that they show up on top
map.createPane('zipLayer');
map.getPane('zipLayer').style.zIndex = 690;

// link to csv
var csvLink = "static/js/available_zipcodes.csv";

// generate array of available zipcodes in DB to filter geojson (i.e. you don't want objects on your map that don't correspond to rows in the DB)
var availableZips = [];
d3.csv(csvLink, function(error, data) {
    data.forEach(function(item) {
        availableZips.push(item.zipcodes);
    })
});

// link to zipcode data
var link2 = "static/geojson/zipcodes.geojson";


// outline by zipcode
d3.json(link2, function (data) {

    function zipFilter(feature) {
        var zipBool = availableZips.includes(feature.properties.postalCode);
        return zipBool; 
      }

    L.geoJson(data, {
        filter: zipFilter,
        pane: "zipLayer",
        style: function (feature) {
            return {
                color: "white",
                fillOpacity: 0,
                weight: 1
            };
        },
        // on each feature
        onEachFeature: function (feature, layer) {
            // set mouse events to change map styling
            layer.on({
                // event listener
                mouseover: function (event) {
                    layer = event.target;
                    layer.setStyle({
                        fillOpacity: 0.5,
                        weight: 4
                    });
                },
                // another function, mouse no longer over it
                mouseout: function (event) {
                    layer = event.target;
                    layer.setStyle({
                        fillOpacity: 0,
                        weight: 1
                    });
                },
                // When a feature (neighborhood) is clicked, it is enlarged to fit the screen
                click: function (event) {
                    zipCode = feature.properties.postalCode;
                    zipCode = zipCode.toString();
                    
                    updateZip(zipCode);
                }
            });
        }
    }).addTo(map);
});










//--------------------------Draw/Update Charts---------------------------------------------------------------------------------------------------------------------------------------

// Attribution: https://bl.ocks.org/SpaceActuary/97d70de639c9c1724f434a9c64cc1a68


// Set initla input
var manPrev = [0.004749091612728957, 0.02021618988283336, 0.20107708958148293, 0.33372601860875495, 0.4303886444449339, 0.009753557315571416, .000089408553694525, 0.2703779363869448, 0.019466010671471135, 0.012880742845263667, 0.06559351396299633],
    outerPrev = [0.13928599588374238, 0.24135624599990063, 0.14304300010295457, 0.2575431884131981, 0.16868239994799133, 0.04753541814163875, 0.0025537515105740986, 0.1265333870557079, 0.02789482654070388, 0.03550047111561127, 0.03247988612623857],
    manFAR = 0.5644702134886085,
    outerFAR = 0.14513290996211148,
    n = 11;

var chartColors = ["#FFDD80", "#ff9100", "#bf360c", "#ff5252", "#c51162", "#7b1fa2", "#ba68c8", "#0d47a1", "#00bfa5", "#607d8b", "#263238"];

var width = 325,
    height = 325,
    outerRadius = 160,
    innerRadius = 75;

var radiusScale = d3.scaleLinear()
    .domain([0, 1]) // input value
    .range([innerRadius+5, outerRadius]); // remapped output value

var arc = d3.arc().innerRadius(innerRadius);

var pie = d3.pie()
    .sort(null);

var svg_manhattan = d3.select(".chart_1").append("svg")
    .attr("width", width)
    .attr("height", height);

var svg_outer = d3.select(".chart_2").append("svg")
    .attr("width", width)
    .attr("height", height);

svg_manhattan.selectAll(".arc")
    .data(arcs(manPrev, manPrev))
    .enter().append("g")
    .attr("class", "arc")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .append("path")
    .attr("fill", function(d, i) { return chartColors[i]; })
    .attr("d", arc);

svg_outer.selectAll(".arc")
    .data(arcs(outerPrev, outerPrev))
    .enter().append("g")
    .attr("class", "arc")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .append("path")
    .attr("fill", function(d, i) { return chartColors[i]; })
    .attr("d", arc);

function arcs(firstArray, secondArray, firstFAR, secondFAR) {
    var arcs0 = pie(firstArray),
        arcs1 = pie(secondArray),
        i = -1,
        arc,
        outerRad0 = radiusScale(firstFAR),
        outerRad1 = radiusScale(secondFAR);

    while (++i < n) {
        arc = arcs0[i];
        arc.outerRadius = outerRad0;
        arc.next = arcs1[i];
        arc.next.outerRadius = outerRad1; 
    }

    return arcs0;
}

function tweenArc(b) {
    return function(a, i) {
      var d = b.call(this, a, i), i = d3.interpolate(a, d);
      for (var k in d) a[k] = d[k]; // update data
      return function(t) { return arc(i(t)); };
    };
  }








function change_manhattan(dictObj) {

    var manNext = Object.values(dictObj.manhattan.values).map(data => data.GFA);
    var nextFAR = dictObj.manhattan.FAR;

    function transitionManhattan(manNext) {

        var path = svg_manhattan.selectAll(".arc > path")
            .data(arcs(manPrev, manNext, manFAR, nextFAR));
        
        var t2 = path.transition()
                    .duration(1000)
              .attrTween("d", tweenArc(function(d, i) {
                //console.log("i: ", i, "d: ", d, "d.next: ", d.next)
                return {
                  startAngle: d.next.startAngle,
                  endAngle: d.next.endAngle,
                  outerRadius: d.next.outerRadius
                };
              }));
      
        manPrev = manNext;
        manFAR = nextFAR;
      }
        
    transitionManhattan(manNext);
};



function change_outer(dictObj) {

    var outerNext = Object.values(dictObj.outer.values).map(data => data.GFA);
    var nextFAR = dictObj.outer.FAR;

    function transitionOuter(outerNext) {

        var path = svg_outer.selectAll(".arc > path")
            .data(arcs(outerPrev, outerNext, outerFAR, nextFAR));
        
        var t2 = path.transition()
                    .duration(1000)
              .attrTween("d", tweenArc(function(d, i) {
                //console.log("i: ", i, "d: ", d, "d.next: ", d.next)
                return {
                  startAngle: d.next.startAngle,
                  endAngle: d.next.endAngle,
                  outerRadius: d.next.outerRadius
                };
              }));
      
        outerPrev = outerNext;
        outerFAR = nextFAR;
      }
        
    transitionOuter(outerNext);
};











//-------------------------Create Legend------------------------------------------------------------------------------------------------------------------------------------------------
// https://www.d3-graph-gallery.com/graph/custom_legend.html

function makeLegend(dictObj) {

    // Clean previous legend
    var node = document.getElementsByClassName("legend")[0];
    node.innerHTML = "";

    // select the svg area
    var svgLegend = d3.select(".legend");
    
    // create a list of keys
    var legendKeys = Object.values(dictObj.manhattan.values).map(data => data.label);
    var legendColors = Object.values(dictObj.manhattan.values).map(data => data.color);
    
    // Add one dot in the legend for each name.
    var size = 15;
    var spacing = 1;
    var boxes = svgLegend.selectAll("mydots").data(legendKeys);
    
    boxes.enter()
        .append("rect")
        .merge(boxes)
        .attr("x", 100)
        .attr("y", function(d,i){ return i*(size + spacing)}) // 100 is where the first dot appears. 25 is the distance between dots
        .attr("width", size)
        .attr("height", size)
        .style("fill", function(d,i){ return legendColors[i]});

    
    // Add one dot in the legend for each name.
    svgLegend.selectAll("mylabels")
        .data(legendKeys)
        .enter()
        .append("text")
            .attr("x", 100 + size*1.2)
            .attr("y", function(d,i){ return i*(size + spacing) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
            .style("fill", function(d,i){ return legendColors[i]})
            .text(function(d){ return d})
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle");

    // Resize SVG to account for legend
    var svgHeight = legendKeys.length * (size + spacing);
    document.getElementsByClassName("legend")[0].setAttribute("height", `${svgHeight}px`);

}














//-----------------------------Update Data------------------------------------------------------------------------------------------------------------------------------------------

function doTheThing(dictObj, zipcodeInput) {
    
    // Clear previous zipcode opbects
    zipLayer.clearLayers();

    //console.log(dictObj);
    var zipcodeManhattan = dictObj.manhattan.zipcode;
    var zipcodeOuter = dictObj.outer.zipcode;
    var neighborhoodManhattan = dictObj.manhattan.neighborhood;
    var neighborhoodOuter = dictObj.outer.neighborhood;
    var boroughManhattan = dictObj.manhattan.borough;
    var boroughOuter = dictObj.outer.borough;
    d3.select(".zip_manhattan").text(`Zipcode: ${zipcodeManhattan}`);
    d3.select(".zip_outer").text(`Zipcode: ${zipcodeOuter}`);
    d3.select(".neighborhood_manhattan").text(neighborhoodManhattan);
    d3.select(".neighborhood_outer").text(neighborhoodOuter);
    d3.select(".borough_manhattan").text(boroughManhattan);
    d3.select(".borough_outer").text(boroughOuter);

    //---------------Update the legend----------------------------
    makeLegend(dictObj);

    //---------------Plot chart based on zipcode_dict-------------
    change_manhattan(dictObj);
    change_outer(dictObj);

    //---------------Zoom to target zipcode-----------------------

    // Specify the layer for the zipcodes so that they show up on top
    map.createPane('targetZipLayer');
    map.getPane('targetZipLayer').style.zIndex = 590;
    
    // find target zipcode
    var zipLink = "static/geojson/zipcodes.geojson";

    // Close previous popups and zipcode source/target layers
    map.closePopup();


    d3.json(zipLink, function(error, data) {
        
        var objects = data.features;

        // Keep track of all coordinates for source and target zipcodes to create bounding box afterwards
        var xCoordTotal = [];
        var yCoordTotal = [];

        // average coords will be used to place popups, but in case of multiple geojsons for one zip (this is common) just choose one
        var xAverageManhattan = [];
        var yAverageManhattan = [];
        var xAverageOuter = [];
        var yAverageOuter = [];
        var manhattanNeighborhoodName = [];
        var outerNeighborhoodName = [];

        var i;
        for (i = 0; i < objects.length; i++) {
            var object = objects[i];
            var objectZip = object.properties.postalCode;

            // Manage outer borough zipcodes
            if (objectZip == zipcodeOuter) {

                outerNeighborhoodName.push(object.properties.PO_NAME);

                xCoord = [];
                yCoord = [];

                var j;
                for (j = 0; j < object.geometry.coordinates[0].length; j++) {
                    xCoord.push(object.geometry.coordinates[0][j][1]);
                    yCoord.push(object.geometry.coordinates[0][j][0]);
                    xCoordTotal.push(object.geometry.coordinates[0][j][1]);
                    yCoordTotal.push(object.geometry.coordinates[0][j][0]);
                }

                var xAverage = xCoord.reduce((a,b) => a + b, 0) / xCoord.length;
                xAverageOuter.push(xAverage);
                var yAverage = yCoord.reduce((a,b) => a + b, 0) / yCoord.length;
                yAverageOuter.push(yAverage);

                // Create zipcode object
                var zipObj = L.geoJson(object, {
                    pane: "zipLayer",
                    style: function (feature) {
                        return {
                            color: "white",
                            fillOpacity: 0.75,
                            weight: 3
                        };
                    }
                });
                
                // Add zipcode object to zipcode layer
                zipLayer.addLayer(zipObj);
            }

            // manage manhattan zipcodes
            if (objectZip == zipcodeManhattan) {

                manhattanNeighborhoodName.push(object.properties.PO_NAME);

                xCoord = [];
                yCoord = [];

                var k;
                for (k = 0; k < object.geometry.coordinates[0].length; k++) {
                    xCoord.push(object.geometry.coordinates[0][k][1]);
                    yCoord.push(object.geometry.coordinates[0][k][0]);
                    xCoordTotal.push(object.geometry.coordinates[0][k][1]);
                    yCoordTotal.push(object.geometry.coordinates[0][k][0]);
                }

                var xAverage = xCoord.reduce((a,b) => a + b, 0) / xCoord.length;
                xAverageManhattan.push(xAverage);
                var yAverage = yCoord.reduce((a,b) => a + b, 0) / yCoord.length;
                yAverageManhattan.push(yAverage);

                // Create zipcode object
                var zipObj = L.geoJson(object, {
                    pane: "zipLayer",
                    style: function (feature) {
                        return {
                            color: "white",
                            fillOpacity: 0.75,
                            weight: 3
                        };
                    }
                });
                
                // Add zipcode object to zipcode layer
                zipLayer.addLayer(zipObj);
            }
        } 
        
        L.popup()
            .setLatLng([xAverageManhattan[0], yAverageManhattan[0]])
            .setContent(`<h6>${manhattanNeighborhoodName[0]}<h6>`)
            .addTo(map);

        L.popup()
            .setLatLng([xAverageOuter[0], yAverageOuter[0]])
            .setContent(`<h6>${outerNeighborhoodName[0]}<h6>`)
            .addTo(map);

        // Find bounding box and adjust so that zoom centers on most visible part of window
        var xMax = Math.max.apply(Math, xCoordTotal) + 0.01;
        var yMax = Math.max.apply(Math, yCoordTotal) - 0.05;
        var xMin = Math.min.apply(Math, xCoordTotal);
        var yMin = Math.min.apply(Math, yCoordTotal) - 0.05;

        var corner1 = L.latLng(xMin, yMin);
        var corner2 = L.latLng(xMax, yMax);
        var newBounds = L.latLngBounds(corner1, corner2);
        map.fitBounds(newBounds);

    });
};



//--------------------------AJAX---------------------------------------------------------------------------------------------------------------------------------------

function updateZip(zipcode) {

    req = $.ajax({
        url: `/api/zipcode/${zipcode}`,
        type: "Post"
    });

    req.done(function(data) {
        doTheThing(data, zipcode)
    });
}

