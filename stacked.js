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

function buildChart(selector,file,dim){
    dim = defaultDim(dim);
    var svg = d3.select(selector).append("svg:svg")
	.attr("width", dim.width)
	.attr("height", dim.hight)
	.append("svg:g")
	.attr("transform", "translate(" + dim.left + "," + (dim.hight - dim.top) + ")");

    d3.json(file, function(dat) {

	var data = simplifyData(dat),
	sectors = transposeToLayout(data),
	scale  = scales(dim, data, sectors),
	
	sector = svg.selectAll("g.sector")
	    .data(sectors)
	    .enter().append("svg:g")
	    .attr("class", "sector")
	    .style("fill", function(d, i) { return scale.sector(i); }),

	rect = sector.selectAll("rect")
	    .data(Object)
	    .enter().append("svg:rect")
	    .attr("x", function(d) { return scale.country(d.x); })
	    .attr("y", function(d) { return -(scale.energy(d.y0)) - scale.energy(d.y); })
	    .attr("height", function(d) { return scale.energy(d.y); })
	    .attr("width", scale.country.rangeBand()),
	
	label = svg.selectAll("text")
	    .data(scale.country.domain())
	    .enter().append("svg:text")
	    .attr("x", function(d) { return scale.country(d) + scale.country.rangeBand() / 2; })
	    .attr("y", 6)
	    .attr("text-anchor", "middle")
	    .attr("dy", ".71em")
	    .text(function(d){return d;}),

	rule = svg.selectAll("g.rule")
	    .data(scale.energy.ticks(5))
	    .enter().append("svg:g")
	    .attr("class", "rule")
	    .attr("transform", function(d) { return "translate(0," + -(scale.energy(d)) + ")"; });
	
	rule.append("svg:line")
	    .attr("x2", dim.width - dim.right - dim.left)
	    .style("stroke", function(d) { return d ? "#fff" : "#000"; })
	    .style("stroke-opacity", function(d) { return d ? .7 : null; });
	
	rule.append("svg:text")
	    .attr("x", dim.width - dim.right - dim.left + 6)
	    .attr("dy", ".35em")
	.text(d3.format(",d"));
    });
}

function defaultDim(dim){
    return {
	hight: dim.hight || 500,
	width: dim.width || 960,
	top:   dim.top   || 20,
	bottom: dim.bottom || 30,
	right: dim.right || 50,
	left:  dim.left  || 20
    };
}

function simplifyData(data){
    data = data.data;
    var countries = d3.keys(data);
    // Extract the maximum power use of any country, and a set of unique sectors of usage/consumption:
    var sectors = {},
    max = d3.max(d3.values(data).map(function(country){
	d3.keys(country).map(function(sect){
	    sectors[sect] = 0;
	});	
	return d3.sum(d3.values(country));
    }));
    return {
	countries: countries,
	max: max,
	sectors: d3.keys(sectors),
	bars: data
    };
}

function transposeToLayout(data){
    return d3.layout.stack()(data.sectors.map(function(type){
	return data.countries.map(function(country){
	    return {x: country, y: data.bars[country][type] || 0};
	});
    }));
}

function scales(dim,data,layout){
    return {
	country:  d3.scale.ordinal()
	    .rangeBands([0, dim.width - dim.right - dim.left])
	    .domain(layout[0].map(function(d) { return d.x; })),
	energy: d3.scale.linear()
	    .range([0, dim.hight - dim.top - dim.bottom])
	    .domain([0, d3.max(layout[layout.length - 1], function(d) { return d.y0 + d.y; })]),
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.GnBu[9])
    };

}


buildChart("body","",{});