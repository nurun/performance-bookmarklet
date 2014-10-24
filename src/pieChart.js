//Logic for Request pie charts

function createPieChart(data, size){
	//inpired by http://jsfiddle.net/da5LN/62/

	var chart = newElementNs("svg:svg", {
		width : "100%",
		height : "100%",
		viewBox : "0 0 " + size + " " + size
	})

	var unit = (Math.PI * 2) / 100,
		startAngle = 0; // init startAngle

	var createWedge = function(id, size, percentage, labelTxt, colour){
		var radius = size/2,
			endAngle = startAngle + (percentage * unit - 0.001),
			labelAngle = startAngle + (percentage/2 * unit - 0.001),
			x1 = radius + radius * Math.sin(startAngle),
			y1 = radius - radius * Math.cos(startAngle),
			x2 = radius + radius * Math.sin(endAngle),
			y2 = radius - radius * Math.cos(endAngle),
			x3 = radius + radius * 0.85 * Math.sin(labelAngle),
			y3 = radius - radius * 0.85 * Math.cos(labelAngle),
			big = (endAngle - startAngle > Math.PI) ? 1 : 0;

		var d = "M " + radius + "," + radius +	// Start at circle center
				" L " + x1 + "," + y1 +				// Draw line to (x1,y1)
				" A " + radius + "," + radius +	// Draw an arc of radius r
				" 0 " + big + " 1 " +				// Arc details...
				x2 + "," + y2 +						// Arc goes to to (x2,y2)
				" Z";								// Close path back to (cx,cy)

		var path = newElementNs("path", {
			id : id,
			d : d,
			fill : colour
		});

		path.appendChild(newElementNs("title", {
			text : labelTxt
		})); // Add tile to wedge path
		path.addEventListener("mouseover", function(evt){
			evt.target.setAttribute("fill", "#ccc");
			document.getElementById(evt.target.getAttribute("id") + "-table").style.backgroundColor = "#ccc";
		});
		path.addEventListener("mouseout", function(evt){
			evt.target.setAttribute("fill", colour);
			document.getElementById(evt.target.getAttribute("id") + "-table").style.backgroundColor = "transparent";
		});

		startAngle = endAngle;
		if(percentage > 10){

			var wedgeLabel = newElementNs("text", {
				text : labelTxt,
				y : y3
			}, "pointer-events: none; text-shadow: 0 0 2px #fff;");

			if(labelAngle < Math.PI){
				wedgeLabel.setAttribute("x", x3 - getNodeTextWidth(wedgeLabel));
			}else{
				wedgeLabel.setAttribute("x", x3);
			}

			return { path: path, wedgeLabel: wedgeLabel};
		}			
		return { path: path };
	};
	
	//setup chart
	var labelWrap = newElementNs("g", {}, "pointer-events: none;");
	console.log(labelWrap);

	//loop through data and create wedges
	data.forEach(function(dataObj){
		var wedgeAndLabel = createWedge(dataObj.id, size, dataObj.perc, dataObj.label + " (" + dataObj.count + ")", getRandomColor());
		chart.appendChild(wedgeAndLabel.path);

		if(wedgeAndLabel.wedgeLabel){
			labelWrap.appendChild(wedgeAndLabel.wedgeLabel);
		}
	});

	// foreground circle
	chart.appendChild(newElementNs("circle", {
		cx : size/2,
		cy : size/2,
		r : size*0.05,
		fill : "#fff"
	}));
	chart.appendChild(labelWrap);
	return chart;
};

var createTable = function(title, data){
	//create table
	var tableHolder = newTag("div", {}, "float:left; width:100%; overflow-x:auto");
	var table = newTag("table", {}, "float:left; width:100%;");
	var thead = newTag("thead");
	var tbody = newTag("tbody");
	thead.appendChild(newTag("th", {text : title}, "text-align: left; padding:0 0.5em 0 0;"));
	thead.appendChild(newTag("th", {text : "Requests"}, "text-align: left; padding:0 0.5em 0 0;"));
	thead.appendChild(newTag("th", {text : "Percentage"}, "text-align: left; padding:0 0.5em 0 0;"));
	table.appendChild(thead);

	data.forEach(function(y){
		var row = newTag("tr", {id : y.id + "-table"});
		row.appendChild(newTag("td", {text : y.label}));
		row.appendChild(newTag("td", {text : y.count}));
		row.appendChild(newTag("td", {text : y.perc.toPrecision(2) + "%"}));
		tbody.appendChild(row);
	});

	table.appendChild(tbody);
	tableHolder.appendChild(table);

	return tableHolder;
};

//crunch the resources data into something easier to work with
allRessourcesCalc = resources.map(function(currR, i, arr){
	var urlFragments = currR.name.match(/:\/\/(.[^/]+)([^?]*)\??(.*)/),
		maybeFileName = urlFragments[2].split("/").pop(),
		fileExtension = maybeFileName.substr((Math.max(0, maybeFileName.lastIndexOf(".")) || Infinity) + 1);
	
	var currRes = {
		name : currR.name,
		domain : urlFragments[1],
		initiatorType : currR.initiatorType || fileExtension || "SourceMap or Not Defined",
		fileExtension : fileExtension || "XHR or Not Defined",
		loadtime : currR.duration,
		isLocalDomain : urlFragments[1] === location.host
	};

	if(currR.requestStart){
		currRes.requestStartDelay = currR.requestStart - currR.startTime;
		currRes.dns = currR.domainLookupEnd - currR.domainLookupStart;
		currRes.tcp = currR.connectEnd - currR.connectStart;
		currRes.ttfb = currR.responseStart - currR.startTime;
		currRes.requestDuration = currR.responseStart - currR.requestStart;
	}
	if(currR.secureConnectionStart){
		currRes.ssl = currR.connectEnd - currR.secureConnectionStart;
	}

	if(currRes.isLocalDomain){
		localResources.push(currRes);
	}else{
		externalResources.push(currRes);
	}

	return currRes;
});

//get counts
var fileExtensionCounts = getItemCount(allRessourcesCalc.map(function(currR, i, arr){
	return currR.initiatorType;
}), "fileType");

var fileExtensionCountLocalExt = getItemCount(allRessourcesCalc.map(function(currR, i, arr){
	return currR.initiatorType + " " + (currR.isLocalDomain ? "(local)" : "(extenal)");
}), "fileType");

var requestsByDomain = getItemCount(allRessourcesCalc.map(function(currR, i, arr){
	return currR.domain;
}), "domain");



// create a chart and table section
var setupChart = function(title, data){
	var chartHolder = newTag("div", {}, "float:left; width:28%; margin: 0 5.3333% 0 0;");
	chartHolder.appendChild(newTag("h1", {text : title}, "font:bold 16px/18px sans-serif; margin:1em 0;"));
	chartHolder.appendChild(createPieChart(data, 400));
	chartHolder.appendChild(newTag("p", {text : "total requests: (" + resources.length + ")"}));
	chartHolder.appendChild(createTable(title, data));
	outputHolder.appendChild(chartHolder);
};


// init data for charts

var requestsUnit = resources.length / 100;
setupChart("Requests by Domain", requestsByDomain.map(function(domain){
	domain.perc = domain.count / requestsUnit;
	domain.label = domain.domain;
	domain.id = "reqByDomain-" + domain.label.replace(/[^a-zA-Z]/g, "-");
	return domain;
}));

setupChart("Requests by Type (local/external domain)", fileExtensionCountLocalExt.map(function(fileType){
	fileType.perc = fileType.count / requestsUnit;
	fileType.label = fileType.fileType;
	fileType.id = "reqByTypeLocEx-" + fileType.label.replace(/[^a-zA-Z]/g, "-");
	return fileType;
}));

setupChart("Requests by Type", fileExtensionCounts.map(function(fileType){
	fileType.perc = fileType.count / requestsUnit;
	fileType.label = fileType.fileType;
	fileType.id = "reqByType-" + fileType.label.replace(/[^a-zA-Z]/g, "-");
	return fileType;
}));