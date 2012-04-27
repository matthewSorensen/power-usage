/* Stub this in for now... */
d3.json = function(_,call){
    call({ 
	"title" : "Electricty Production",
	"units" : "TWhr",
	"data" : {
	    "USA": {"wind": 400, "hydro": 23, "nuclear": 231, "coal": 21},
	    "Morocco": {"wind": 40, "hydro": 23, "nuclear": 1, "coal": 2},
	    "China": {"wind": 4100, "hydro": 213, "nuclear": 231, "coal": 12}
	},
	"sources":{
	    "USA": "http://en.wikipedia.org/wiki/Electricity_generation",
	    "Morocco":"http://en.wikipedia.org/wiki/Electricity_generation",
	    "China":"http://en.wikipedia.org/wiki/Electricity_generation"
	}});};

/* End the stub method */


function buildChart(target,file){
    var chart = {};

    // This gets parameterized latter:
    chart.dimension = {x:500,y:500};

    chart.svg = d3.select(target)
	.append("svg")
	.attr("class", "chart")
	.attr("width",  chart.dimension.x)
	.attr("height", chart.dimension.y)
	.append("g")
	.attr("transform", "translate(10,15)");
    d3.json(file,function(dat){
	chart.countries = d3.keys(dat.data);
	chart.max = d3.max(d3.values(dat.data).map(function(country){
	    return d3.sum(d3.values(country));
	}));
	// Now calculate sectors.
	var sectors = {};
	d3.values(dat.data).map(function(country){
	    d3.keys(country).map(function(sect){
		sectors[sect] = 0;
	    });
	});
	chart.sectors = d3.keys(sectors);
	
	// Then set up various scales (x,y, and color for sectors):
	chart.y = d3.scale.linear()
	    .domain([0,chart.max])
	    .range([0,chart.dimension.y]);
	
	chart.x = d3.scale.ordinal()
	    .domain(chart.countries)
	    .rangeBands([0,chart.dimension.x],0.25);

	chart.sector_colors = d3.scale.ordinal()
	    .domain(chart.sectors)
	    .range(colorbrewer.GnBu[9]);


	chart.test = [{"country":"USA","total":1000},{"country":"Morocco","total":2200},{"country":"China","total":2013}];


	chart.svg.selectAll("rect")
	    .data(chart.test)
	    .enter().append("rect")
	    .attr("y",0)
	    .attr("width", chart.x.rangeBand())
	    .attr("x",function(d){ return chart.x(d["country"]);})
	    .attr("height", function(d){ return chart.y(d["total"]);});
	
/*

	chart.svg.selectAll("rect")
	    .data(chart.test)
	    .enter().append("rect")
	    .attr("x", chart.x)
	    .attr("width", 20)
	    .attr("height", chart.y);
*/
	
    });
}



buildChart("body","");

    
