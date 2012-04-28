function id(x){return x;}
function translate(x,y){
    return "translate(" + x + "," + y + ")";
}

function contrast(c,f){
    var hsl = d3.hsl(c);
    return hsl.l < 0.5? hsl.brighter(f): hsl.darker(f);
}

function multibar(){
    function chart(f){
	(arguments.length >0) && f(chart);
	return chart;
    }

    var sizes = {margin: 20, right: 50, button: 15, height: 500, width: 960},
    svg = null, source = null, data = null,scales = null, axis = null;

    chart.size = function(attr,val){
	switch(arguments.length){
	case 2: sizes[attr] = val;
	case 1: return sizes[attr];
	}
	return chart;
    };
    /* Target an existing svg - either from a selector, or the svg object. */
    chart.target = function(sel){
	if(!arguments.length) return svg;
	svg = (typeof(sel)=="string") ? d3.select(sel) : sel;
	sizes.width  = svg.attr("width");
	sizes.height = svg.attr("height");
	source = svg.attr("data-source") || source;
	svg = svg.append("svg:g");
	return chart;
    };
    /* Build an svg, instead of using the existing one */
    chart.insert_svg = function(sel){
	svg = d3.select(sel).append("svg:svg")
	    .attr("width", sizes.width)
	    .attr("height", sizes.height)
	    .append("svg:g");
	return chart;
    };
    chart.source = function(src){
	if(!arguments.length) return source;
	source = src;
	return chart;
    };
    chart.data = function(dat){
	if(!arguments.length) return data;
	data = dat;
	return chart;
    };
    chart.redraw = function(type){	
	scale = scales.energy[type];
	d3.selectAll(".button")
	    .transition()
	    .duration(750)
	    .style("opacity",function(button){
		if(button == "all") return 1;
		return (button==type || type=="all")? 1:0.25;
	    });
	
	d3.selectAll(".box")
	    .transition().duration(750)
	    .attr("y",function(d){
		switch(type){
		case "all":    return  sizes.height - (sizes.margin + scale(d.y0) + scale(d.y));
		case d.sector: return sizes.height - sizes.margin - scale(d.y);
		default:       return sizes.height *2;		
		}
	    }).attr("height", function(d){
		return (type == "all" || d.sector == type)? scale(d.y):0;
	    });

	axis.scale(axis.scale().domain(scale.domain()));
	d3.select(".axis").transition().call(axis);	

	return chart;
    };

    chart.load = function(call){
	var args = arguments.length,
	onData = function(raw_data){
	    sizes  = completeSizes(sizes);
	    data   = completeData(raw_data);
	    layout = transpose(data);
	    scales = buildScales(sizes,data,layout);	    
	    
	    var sector = svg.selectAll("g.sector")
		.data(layout)
		.enter().append("svg:g")
		.classed("sector",true)
		.style("stroke", function(_,i){return  d3.rgb(scales.sector(i)).darker();})
		.style("fill", function(d, i) { return scales.sector(i); }),	    
	    rect = sector.selectAll("rect")
		.data(Object)
		.enter().append("svg:rect")
		.classed("box",true)
		.attr("x", function(d) { return scales.country(d.x); })
		.attr("height",20)
		.attr("width", scales.country.rangeBand()),
	    button = svg.selectAll("g.button")
		.data(data.sectors.concat(["all"]))
		.enter()
		.append("svg:g")
		.classed("button",true)
		.style("cursor","hand"),
	    xoffset = sizes.margin + 50;
	    
	    svg.selectAll("text")
		.data(scales.country.domain())
		.enter().append("svg:text")
		.attr("x", function(d) { return scales.country(d) + scales.country.rangeBand() / 2; })
		.attr("y", sizes.height- .75*sizes.margin)
		.attr("text-anchor", "middle")
		.attr("dy", ".71em")
		.text(id);
	    axis = d3.svg.axis()
		.scale(d3.scale.linear().range([sizes.height - sizes.margin, sizes.margin+sizes.button]))
		.ticks(5)
		.orient("right")
		.tickFormat(function(n){
		    return d3.format(" e")(n) + ' ' + data.units;
		});
	    svg.append("g")
		.attr("transform",translate(sizes.width - sizes.right - 1.75*sizes.margin,0))
		.classed("axis",true)
		.call(axis);
	    button.on("mousedown",function(){
		d3.select(this).each(chart.redraw);
	    });
	    button.append("svg:rect")
		.attr("x",function(d,i){return sizes.margin+105*i})
		.attr("y",0.5*sizes.margin)
		.attr("width",100)
		.attr("height",sizes.button)
		.style("stroke", function(_,i){return  d3.rgb(scales.sector(i)).darker();})
		.attr("fill",function(_,i){return scales.sector(i);});
	    button.append("svg:text")
		.attr("x", function(_,i){
		    return xoffset + 105*i;
		})
		.attr("y", 0.5*sizes.margin)
		.attr("text-anchor", "middle")
		.attr("dy", 0.5*sizes.button+2.5)
		.style("fill",function(_,i){return contrast(scales.sector(i),3);})
		.text(id);

	    chart.redraw("all")(args == 1? call : id);
	};
	(data && (onData(data)||true)) || d3.json(source,onData);
	return chart;
    }

    return chart;
}
/* Calculate various dimensions and data indexes/totals that we'll need */
function completeSizes(sizes){
    sizes.chartHeight = sizes.height - 2*sizes.margin - sizes.button;
    sizes.chartWidth  = sizes.width  - 2*sizes.margin - sizes.right;
    return sizes;
}
function completeData(data){
    var perCountry = data.data, sectors = {}, max;
    data.countries = d3.keys(perCountry);
    // First iterate throught every country and compute their total power use
    // At the same time, this finds all sectors and puts them in sectors
    max = {"all":
	   d3.max(d3.values(perCountry).map(function(country){
	       d3.keys(country).map(function(sect){
		   sectors[sect] = 0;
	       });	
	       return d3.sum(d3.values(country));
	   }))};
    // Then go throught all the sectors and find the max for each sector:
    data.sectors = d3.keys(sectors);
    data.sectors.map(function(sec){
	max[sec] = d3.max(d3.values(perCountry).map(function(d){return d[sec]}));
    });
    data.max = max;
    return data;
}
/* Juggle a bunch of indexes, and transpose the data into a bunch of layers */
function transpose(data){
    return d3.layout.stack()(data.sectors.map(function(type){
	return data.countries.map(function(country){
	    return {x: country, y: data.data[country][type] || 0, sector:type};
	});}));}
/* Generate all of the scales we'll need - for x (country), y(power - for each sector and total), and color */
function buildScales(sizes,data,layout){
    var energy = {};
    d3.keys(data.max).map(function(sector){
	energy[sector] = d3.scale.linear().domain([0,data.max[sector]]).range([0,sizes.chartHeight]);
    });
    return {
	country:  d3.scale.ordinal()
	    .rangeBands([0, sizes.chartWidth],0.1)
	    .domain(layout[0].map(function(d) { return d.x; })),
	energy: energy,
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.Blues[9])
    };}

multibar().insert_svg("body").data({ 
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
    }}).load();

