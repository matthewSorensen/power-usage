function id(x){return x;}
function translate(x,y){
    return "translate(" + x + "," + y + ")";
}
function contrast(c){
    var hsl = d3.hsl(c);
    return hsl.l < 0.5? hsl.brighter(2): hsl.darker(3);
}
function centerInBand(scale){
    return function(i){
	return scale(i) + 0.5*scale.rangeBand(); 
    };
}

function labelsFit(s){
    var max = d3.max(s.domain().map(function(d){
	return d.length * 10;
    }));
    return s.rangeBand() > max;
}

function labelMod(s){

    var max = d3.max(s.domain().map(function(d){
	return d.length * 10;
    })),
    band = s.rangeBand();

    return (max > band) ? Math.ceil(max/band) : 1;
}

var redrawDelay = 500;

function multibar(){
    var sizes = {button: 15, right: 50, margin: 20}, source = '';
    function chart(target){
	function onData(data){
	    sizes = completeSizes(sizes,target);
	    var layout = transpose(data),
	        scales = buildScales(sizes,data,layout);

	    var sector = target.selectAll("g.sector")
		.data(layout)
		.enter().append("svg:g")
		.classed("sector",true)
		.style("stroke", function(_,i){return  d3.rgb(scales.sector(i)).darker();})
		.style("fill", function(_, i) { return scales.sector(i); }),	    
	    rect = sector.selectAll("rect")
		.data(Object)
		.enter().append("svg:rect")
		.classed("box",true)
		.attr("x", function(d) { return scales.country(d.x); })
		.attr("height",20)
		.attr("width", scales.country.rangeBand())
	    button = target.selectAll("g.button")
		.data(data.sectors)
		.enter()
		.append("svg:g")
		.classed("button",true)
		.style("cursor","hand"),
	    axis = d3.svg.axis()
		.scale(d3.scale.linear().range([sizes.height - sizes.margin, sizes.margin+sizes.button]))
		.ticks(5)
		.orient("right")
		.tickFormat(function(n){
		    return d3.format(" e")(n) + ' ' + data.units;
		}),
	    mod = labelMod(scales.country);
	   
	    target.selectAll("text")
		.data(scales.country.domain())
		.enter()
		.append("svg:text")
		.filter(function(d,i){
		    return !(i % mod);
		})
		.attr("x", centerInBand(scales.country))
		.attr("y", sizes.height- .75*sizes.margin)
		.attr("text-anchor", "middle")
		.attr("dy", ".71em")
		.text(id);

	    target.append("g")
		.attr("transform",translate(sizes.width - sizes.right - 1.75*sizes.margin,0))
		.classed("axis",true)
		.call(axis);
	    
	    button.append("svg:rect")
		.attr("x",scales.button)
		.attr("y",0.5*sizes.margin)
		.attr("width",scales.button.rangeBand())
		.attr("height",sizes.button)
		.style("stroke", function(_,i){return  d3.rgb(scales.sector(i)).darker();})
		.attr("fill",function(_,i){return scales.sector(i);});

	    button.append("svg:text")
		.attr("x", centerInBand(scales.button))
		.attr("y", 0.5*sizes.margin)
		.attr("text-anchor", "middle")
		.attr("dy", 0.5*sizes.button+2.5)
		.style("fill",function(i){return contrast(scales.sector(i));})
		.text(id);

	    function draw (type){	
		scale = scales.energy[type];
		target.selectAll(".button")
		    .transition()
		    .duration(500)
		    .style("opacity",function(button){
			if(button == "all") return 1;
			return (button==type || type=="all")? 1:0.25;
		    });
		
		target.selectAll(".box")
		    .transition().duration(500)
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
		target.selectAll(".axis").transition().call(axis);
	    }
	    draw('all');
	    // This is an ugly hack, but there's some weird data-aliasing bug that's really evil. So just redraw...
	    setTimeout(function(){draw('all');},redrawDelay += 100);
	    
	    button.on("mousedown",draw);
	}
	if(typeof(source)=="string"){
	    if(source == '') source = target.attr("data-source");
	    d3.json(source,function(raw_data){
		onData(completeData(source));
	    });
	}else
	    onData(completeData(source));
    }
    // Expose a modicum of configurability.
    chart.size   = function(key,val){ sizes[key] = val; return chart; };
    chart.source = function(dat){source = dat; return chart;};
    return chart;
}
/* Calculate various dimensions and data indexes/totals that we'll need */
function completeSizes(sizes,target){
    sizes.height = target.attr("height") * 1;
    sizes.width  = target.attr("width") * 1;
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
    data.sectors = d3.keys(sectors);
    
    // Then go throught all the sectors and find the max for each sector:
    data.sectors.map(function(sec){
	max[sec] = d3.max(d3.values(perCountry).map(function(d){return d[sec]}));
    });
    
    data.sectors = ["all"].concat(data.sectors);
    
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
	    .domain(data.countries),
	energy: energy,
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.Blues[9]),
	// Buttons!
	button: d3.scale.ordinal()
	    .domain(data.sectors)
	    .rangeBands([sizes.margin,sizes.width-sizes.margin],0.05)
    };}
