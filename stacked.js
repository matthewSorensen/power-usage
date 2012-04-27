/* Stub this in for now... */
d3.json = function(_,call){
    call({ 
	"title" : "Electricty Production",
	"units" : "TWhr",
	"data" : {
	    "USA": {"wind": 400, "hydro": 23, "nuclear": 231, "coal": 21},
	    "Morocco": {"wind": 40, "hydro": 23, "nuclear": 1, "coal": 2},
	    "China": {"wind": 4100, "hydro": 213, "nuclear": 231, "coal": 12},
	    "Peru": {"hydro":1000}
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
	.attr("height", dim.height)
	.append("svg:g")
	.attr("transform", translate(dim.margin, dim.height - dim.margin));

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

	newScale = scale.energy.copy(),
	newRange = newScale.range(),

	axis = d3.svg.axis()
	    .scale(newScale.range([newRange[1],newRange[0]]))
	    .ticks(5)
	    .orient("right")
	    .tickFormat(function(n){
		return d3.format(" e")(n) + ' ' + dat.units;
	    });

	svg.append("g")
	    .attr("transform",translate(dim.width - 2*dim.margin - dim.right,-dim.height + 2*dim.margin))
	    .attr("class","axis")
	    .call(axis);

	var button = svg.selectAll("rect.button")
	    .data(data.sectors)
	    .enter()
	    .append("svg:rect")
	    .attr("class","button")
	    .attr("x",function(d,i){return dim.margin+105*i})
	    .attr("y",2*dim.margin - dim.height)
	    .attr("rx",5)
	    .attr("width",100)
	    .attr("height",30)
	    .attr("fill",function(_,i){return scale.sector(i);});

    });
}

function defaultDim(dim){
    return {
	height: dim.height || 500,
	width: dim.width || 960,
	margin: dim.margin || 20,
	right: 50

    };}

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
    };}

function transposeToLayout(data){
    return d3.layout.stack()(data.sectors.map(function(type){
	return data.countries.map(function(country){
	    return {x: country, y: data.bars[country][type] || 0};
	});}));}

function scales(dim,data,layout){
    return {
	country:  d3.scale.ordinal()
	    .rangeBands([0, dim.width - 2*dim.margin - dim.right],0.1)
	    .domain(layout[0].map(function(d) { return d.x; })),
	energy: d3.scale.linear()
	    .range([0, dim.height - 2*dim.margin])
	    .domain([0,d3.max(layout[layout.length - 1], function(d) { return d.y0 + d.y; })]),
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.GnBu[9])
    };}

function translate(x,y){
    return "translate(" + x + "," + y + ")";
}



buildChart("body","",{});





