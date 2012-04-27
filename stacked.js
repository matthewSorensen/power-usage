/* Stub this in for now... */
d3.json = function(_,call){
    call({ 
	"title" : "Electricty Production",
	"units" : "TWhr",
	"data" : {
	    "USA": {"wind": 400, "hydro": 23, "nuclear": 231, "coal": 21},
	    "Morocco": {"wind": 40, "hydro": 23, "nuclear": 1, "coal": 2},
	    "China": {"wind": 4100, "hydro": 213, "nuclear": 231, "coal": 12},
	    "Peru": {"hydro":1000},
	    "USSR": {"nuclear":1250,"coal":1250},
	    "Canukistan": {"maple syrup":500},
	    "Oregon": {"coal":250}
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
	.append("svg:g");

    d3.json(file, function(dat) {

	var data = simplifyData(dat),
	sectors = transposeToLayout(data),
	scale  = scales(dim, data, sectors),
	sector = svg.selectAll("g.sector")
	    .data(sectors)
	    .enter().append("svg:g")
	    .attr("class", "sector")
	    .style("stroke", function(_,i){return  d3.rgb(scale.sector(i)).darker();})
	    .style("fill", function(d, i) { return scale.sector(i); }),

	rect = sector.selectAll("rect")
	    .data(Object)
	    .enter().append("svg:rect")
	    .classed("box",true)
	    .attr("x", function(d) { return scale.country(d.x); })
	    .attr("y",function(d){
		return dim.height - (dim.margin + scale.energy['all'](d.y0) + scale.energy['all'](d.y));
	    })
	    .attr("height", function(d){return scale.energy['all'](d.y);})
	    .attr("width", scale.country.rangeBand()),
	
	label = svg.selectAll("text")
	    .data(scale.country.domain())
	    .enter().append("svg:text")
	    .attr("x", function(d) { return scale.country(d) + scale.country.rangeBand() / 2; })
	    .attr("y", dim.height- .75*dim.margin)
	    .attr("text-anchor", "middle")
	    .attr("dy", ".71em")
	    .text(function(d){return d;}),

	newScale = d3.scale.linear()
	    .domain([0,data.max])
	    .range([dim.height-dim.margin,dim.margin+dim.button]),

	axis = d3.svg.axis()
	    .scale(newScale)
	    .ticks(5)
	    .orient("right")
	    .tickFormat(function(n){
		return d3.format(" e")(n) + ' ' + dat.units;
	    });

	svg.append("g")
	    .attr("transform",translate(dim.width - dim.right - 1.75*dim.margin,0))
	    .attr("class","axis")
	    .call(axis);

	var button = svg.selectAll("g.button")
	    .data(data.sectors.concat(["all"]))
	    .enter()
	    .append("svg:g")
	    .classed("button",true)
	    .style("cursor","hand"),
	xoffset = dim.margin + 50;
	
	button.on("mousedown",animate(scale.energy['all'],dim));

	button.append("svg:rect")
	    .attr("x",function(d,i){return dim.margin+105*i})
	    .attr("y",0.5*dim.margin)
	    .attr("width",100)
	    .attr("height",dim.button)
	    .style("stroke", function(_,i){return  d3.rgb(scale.sector(i)).darker();})
	    .attr("fill",function(_,i){return scale.sector(i);});
	    
	button.append("svg:text")
	    .attr("x", function(_,i){
		return xoffset + 105*i;
	    })
	    .attr("y", 0.5*dim.margin)
	    .attr("text-anchor", "middle")
	    .attr("dy", 0.5*dim.button+2.5)
	    .style("fill",function(_,i){return contrast(scale.sector(i),3);})
	    .text(function(d){return d;});
    });
}

// * rescale the axis (hard - build a second set of scales for each...?)
function animate(scale,dim){
    return function(){
	var type = "";
	d3.select(this).each(function(d,_){type = d});
	
	if (type == "all") return unanimate();

	d3.selectAll(".button")
	    .transition()
	    .duration(750)
	    .style("opacity",function(d,_){
		return (d==type || d=="all")? 1 : 0.25;
	    });

	d3.selectAll(".box")
	    .transition()
	    .duration(750)
	    .attr("transform",function(d,i){
		return translate(0, d.sector == type?  scale(d.y0):(dim.margin + 100 +scale(d.y + d.y0)));

	    });
    };
}

function unanimate(){
    d3.selectAll(".box")
	.transition()
	.duration(500)
	.attr("transform","");
    d3.selectAll(".button")
	.transition()
	.duration(500)
	.style("opacity",1);
}


function defaultDim(dim){

    var height = dim.height || 500,
    width = dim.width || 960,
    margin = dim.margin || 20,
    button = 15,
    right = 50;
    return {
	height: height,
	width: width,
	margin: margin,
	right: right,
	button: button,
	chartHeight:  height - 2*margin - button,
	chartWidth:   width - 2*margin - right
    };}

function simplifyData(data){
    data = data.data;
    var countries = d3.keys(data);
    // Extract the maximum power use of any country, and a set of unique sectors of usage/consumption:
    var sectors = {},
    max = {"all": 
	   d3.max(d3.values(data).map(function(country){
	       d3.keys(country).map(function(sect){
		   sectors[sect] = 0;
	       });	
	       return d3.sum(d3.values(country));
	   }))};

    sectors = d3.keys(sectors);

    sectors.map(function(sel){
	max[sel] = d3.max(d3.values(data).map(function(d){return d[sel]}));
    });

    return {
	countries: countries,
	max: max,
	sectors: sectors,
	bars: data
    };}

function transposeToLayout(data){
    return d3.layout.stack()(data.sectors.map(function(type){
	return data.countries.map(function(country){
	    return {x: country, y: data.bars[country][type] || 0, sector:type};
	});}));}

function scales(dim,data,layout){
    var energy = {};
    d3.keys(data.max).map(function(sector){
	energy[sector] = d3.scale.linear().domain([0,data.max[sector]]).range([0,dim.chartHeight]);
    });
    return {
	country:  d3.scale.ordinal()
	    .rangeBands([0, dim.chartWidth],0.1)
	    .domain(layout[0].map(function(d) { return d.x; })),
	energy: energy,
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.Blues[9])
    };}

function translate(x,y){
    return "translate(" + x + "," + y + ")";
}

function contrast(c,f){
    var hsl = d3.hsl(c);
    return (hsl.l < 0.5)? (hsl.brighter(f)): (hsl.darker(f));
}


buildChart("body","",{});


