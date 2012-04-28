function id(x){return x;}
function translate(x,y){
    return "translate(" + x + "," + y + ")";
}
function contrast(c,f){
    var hsl = d3.hsl(c);
    return hsl.l < 0.5? hsl.brighter(f): hsl.darker(f);
}
function centerInBand(scale){
    return function(i){
	return scale(i) + 0.5*scale.rangeBand(); 
    };
}

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
		.style("fill", function(d, i) { return scales.sector(i); }),	    
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
		});

	    target.append("g")
		.attr("transform",translate(sizes.width - sizes.right - 1.75*sizes.margin,0))
		.classed("axis",true)
		.call(axis);

	    target.selectAll("text")
		.data(scales.country.domain())
		.enter().append("svg:text")
		.attr("x", function(_,i) { return scales.country(i) + scales.country.rangeBand() / 2; })
		.attr("y", sizes.height- .75*sizes.margin)
		.attr("text-anchor", "middle")
		.attr("dy", ".71em")
		.text(id);
	    
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
		.style("fill",function(_,i){return contrast(scales.sector(i),3);})
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
	    setTimeout(function(){draw('all');},600);
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
	    .rangeBands([sizes.margin, sizes.width - sizes.margin - sizes.right],0.1)
	    .domain(data.countries),
	energy: energy,
	// This is slightly poor - we need to match the colorbrewer's size to sector length.
	sector: d3.scale.ordinal().domain(data.sectors).range(colorbrewer.Blues[9]),
	// Buttons!
	button: d3.scale.ordinal()
	    .domain(data.sectors)
	    .rangeBands([sizes.margin,sizes.width-sizes.margin],0.05)
    };}

var m = multibar().source({ 
    "title" : "Electricty Production by year",
    "units" : "GWhr",
    "data" : 
    {"2007":{"Natural Gas":313785,"Other":727,"Renwables":8953,"Coal":1490985,"Nuclear":427555,"Petroleum":40720,"Hydro":226734},"2006":{"Natural Gas":282088,"Other":730,"Renwables":6588,"Coal":1471421,"Nuclear":425341,"Petroleum":40903,"Hydro":261864},"2005":{"Natural Gas":238204,"Other":653,"Renwables":4945,"Coal":1484855,"Nuclear":436296,"Petroleum":69722,"Hydro":245553},"2004":{"Natural Gas":199662,"Other":841,"Renwables":3692,"Coal":1513641,"Nuclear":475682,"Petroleum":73694,"Hydro":245546},"2003":{"Natural Gas":186967,"Other":762,"Renwables":3421,"Coal":1500281,"Nuclear":458829,"Petroleum":69930,"Hydro":249622},"2002":{"Natural Gas":229639,"Other":686,"Renwables":3089,"Coal":1514670,"Nuclear":507380,"Petroleum":59124,"Hydro":242302},"2001":{"Natural Gas":264434,"Other":486,"Renwables":1666,"Coal":1560146,"Nuclear":534207,"Petroleum":78908,"Hydro":197804},"2000":{"Natural Gas":290715,"Other":0,"Renwables":2241,"Coal":1696619,"Nuclear":705433,"Petroleum":72180,"Hydro":253155},"1998":{"Natural Gas":309222,"Other":0,"Renwables":7206,"Coal":1807480,"Nuclear":673702,"Petroleum":110158,"Hydro":308844},"1999":{"Natural Gas":296381,"Other":0,"Renwables":3716,"Coal":1767679,"Nuclear":725036,"Petroleum":86929,"Hydro":299914},"2009":{"Natural Gas":349166,"Other":579,"Renwables":14617,"Coal":1322092,"Nuclear":417275,"Petroleum":25217,"Hydro":247198},"2008":{"Natural Gas":320190,"Other":591,"Renwables":11308,"Coal":1466395,"Nuclear":424256,"Petroleum":28124,"Hydro":229645}},
    "sources":["http://205.254.135.24/electricity/monthly/epm_table_grapher.cfm?t=epmt_1_1"]});

var n  = multibar().source({ 
    "title" : "Electricty Production by month",
    "units" : "GWhr",
    "data" : {"March":{"Natural Gas":66169,"Other":1893,"Renwables":16811,"Coal":134717,"Nuclear":65662,"Petroleum":2453,"Hydro":31737},"May":{"Natural Gas":75769,"Other":1815,"Renwables":17777,"Coal":137493,"Nuclear":57017,"Petroleum":2198,"Hydro":33105},"June":{"Natural Gas":91096,"Other":1951,"Renwables":17435,"Coal":158308,"Nuclear":65270,"Petroleum":2439,"Hydro":32253},"April":{"Natural Gas":70529,"Other":1831,"Renwables":18352,"Coal":124293,"Nuclear":54547,"Petroleum":2279,"Hydro":31629},"August":{"Natural Gas":119646,"Other":1964,"Renwables":13965,"Coal":171472,"Nuclear":71339,"Petroleum":2407,"Hydro":26320},"October":{"Natural Gas":79078,"Other":1847,"Renwables":16729,"Coal":126872,"Nuclear":63354,"Petroleum":1934,"Hydro":20036},"February":{"Natural Gas":65852,"Other":1551,"Renwables":16224,"Coal":138295,"Nuclear":64789,"Petroleum":2201,"Hydro":24687},"December":{"Natural Gas":86606,"Other":1987,"Renwables":17063,"Coal":132706,"Nuclear":71837,"Petroleum":2000,"Hydro":24715},"September":{"Natural Gas":91377,"Other":1831,"Renwables":13135,"Coal":141220,"Nuclear":66849,"Petroleum":2248,"Hydro":21500},"November":{"Natural Gas":75637,"Other":1826,"Renwables":18478,"Coal":121197,"Nuclear":64474,"Petroleum":1723,"Hydro":21374},"January":{"Natural Gas":74458,"Other":1752,"Renwables":14930,"Coal":170983,"Nuclear":72743,"Petroleum":3268,"Hydro":26148},"July":{"Natural Gas":120377,"Other":2083,"Renwables":14094,"Coal":176709,"Nuclear":72345,"Petroleum":3011,"Hydro":31570}},
    "sources":["http://205.254.135.24/electricity/monthly/epm_table_grapher.cfm?t=epmt_1_1"]});

d3.select("body")
    .append("svg:svg")
    .attr("width",960)
    .attr("height",500)
    .call(m);
d3.select("body")
    .append("svg:svg")
    .attr("width",960)
    .attr("height",500)
    .call(n);
