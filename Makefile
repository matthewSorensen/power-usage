bundle.js: d3.js colorbrewer.js energyData.js stacked.js main.js
	cat $^ | uglifyjs  -nm --unsafe -o $@
clean:
	rm bundle.js