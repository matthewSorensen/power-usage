window.onload = function(){
    d3.select("#allcountries")
	.append("svg:svg")
	.attr("width",960)
	.attr("height",500)
	.call(multibar().data(data));

    var small = {};

    "Peru Dominican Morocco Senegal".split(' ').map(function(tiny){
	small[tiny] = data[tiny];
    });

    d3.select("#smallcountries")
	.append("svg:svg")
	.attr("width",960)
	.attr("height",500)
	.call(multibar().data(small))
};