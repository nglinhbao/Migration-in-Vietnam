function init() {
    let totalShowed = false

    let yearRange = [1, 100, 500, 1000, 2000, 10000, 50000];
    let totalRange = [1, 10000, 20000, 50000, 100000, 300000, 500000, 1000000];

    const colorScale = d3.scaleThreshold()
            .domain(yearRange)
            .range(d3.schemeBlues[8]);
    const totalColorRange = d3.scaleThreshold()
            .domain(totalRange)
            .range(d3.schemeGreens[9]);

    let allData = new Map();

    for (let year = 2000; year <= 2020; year++) {
        let promise = d3.csv("./data/emigration.csv").then(function (data) {
            let yearData = new Map();
            data.forEach(function (d) {
                yearData.set(d.code, +d[year.toString()]);
            });
            allData.set(year, yearData);
        });
    }

    //draw legends
    const drawLengend = (dataset) => {
        const svg2 = d3.select("#legend")
                .append("svg")
                .attr("width", 500)
                .attr("height", 100);

        svg2.selectAll("rect")
            .data(dataset)
            .enter()
            .append("rect")
            .attr("x", (d,i) => {
                return i*60
            })
            .attr("y", (d,i) => {
                return 30
            })
            .attr("width",100)
            .attr("height", 20)
            .attr("fill", (d) => {
                if (!totalShowed) {
                    return colorScale(d)
                }
                else {
                    return totalColorRange(d)
                }
            })

        svg2.selectAll("text.label")
            .data(dataset)
            .enter()
            .append("text")
            .text((d) => d.toLocaleString('en-US'))
            .attr("x", (d,i) => {
                return i*60
            })
            .attr("y", (d,i) => {
                return 30-5
            })
            .attr("fill", 'black');
    }

    const DrawLine = (tooltip, svg, d) => {
        var lineData = [];

        allData = new Map([...allData.entries()].sort((a, b) => a[0] - b[0]));

        allData.forEach(function (yearData, year) {
            if (yearData.has(d.id)) {
                var value = yearData.get(d.id);
                lineData.push({ x: year, y: value });
            }
        });

        var xScale = d3.scaleLinear()
            .domain(d3.extent(lineData, function(d) { return d.x; }))
            .range([0, 140]);

        var yScale = d3.scaleLinear()
            .domain(d3.extent(lineData, function(d) { return d.y; }))
            .range([140, 0]);

        var line = d3.line()
            .x(function(d) { return xScale(d.x) })
            .y(function(d) { return yScale(d.y); });

        var xAxis = d3.axisBottom(xScale)
            .ticks(2)
            .tickFormat(d3.format(".0f")); // Specify the custom tick format without comma separator                    
        var yAxis = d3.axisRight(yScale).ticks(5); // Specify the number of y-axis ticks
        
        var svg = tooltip.append("svg")
            .attr("width", 220)
            .attr("height", 220);

        // Append a group element for the x-axis
        var xAxisGroup = svg.append("g")
            .attr("transform", "translate(35, 170)") // Adjust the positioning of the x-axis
            .call(xAxis);

        // Append text label for x-axis
        xAxisGroup.append("text")
            .attr("dx", "-10")
            .attr("dy", "0")
            .style("text-anchor", "end")
            .attr("fill", "white")
            .text("Year");

        // Append a group element for the y-axis
        var yAxisGroup = svg.append("g")
            .attr("transform", "translate(175, 30)") // Adjust the positioning of the y-axis
            .call(yAxis);

        // Append text label for y-axis
        yAxisGroup.append("text")
            .attr("dx", "+30")
            .attr("dy", "-20")
            .style("text-anchor", "end")
            .attr("fill", "white")
            .text("People");

        // Append the line to the SVG
        svg.append("path")
            .datum(lineData)
            .attr("class", "line")
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "white")
            .attr("transform", "translate(35, 20)");
    }


    //draw map
    const drawMap = (year) => {
        // The svg
        const svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

        // Map and projection
        const path = d3.geoPath();
        const projection = d3.geoMercator()
            .center([0, 30])
            .scale(140)
            .translate([width / 2, height / 2]);

        // Data and color scale
        let data = new Map();
        
        // A function that change this tooltip when the leaves a point: just need to set opacity to 0 again
        const mouseleave = function(event,d) {
            d3.select(this)
                .style("stroke", "none")
            // tooltip.style("opacity", 0)
        }

        // Load external data and boot
        Promise.all([
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
        d3.csv("./data/emigration.csv", function(d) {
            data.set(d.code, +d[year])
        })
        ]).then(function(loadData){
            const topo = loadData[0]
            // Draw the map
            const mapGroup = svg.append("g")
            mapGroup.selectAll("path")
                .data(topo.features)
                .join("path")
                // draw each country
                .attr("d", d3.geoPath()
                    .projection(projection)
                )
                // set the color of each country
                .attr("fill", function (d) {
                    if  (d.id == "VNM") { return "red" }
                    d.total = data.get(d.id) || 0;
                    if (!totalShowed) {
                        return colorScale(d.total)
                    }
                    else {
                        return totalColorRange(d.total)
                    }
                })
            
  
                // add hover effect
                .on("mouseover", function(event, d) {
    
                    const country = d3.select(this).datum();
                    //add border
                    d3.select(this)
                        .style("stroke", "#333")
                        .style("stroke-width", 1)
                    //add tooltip
                    tooltip.style("opacity", 1)
                        .html(`<h3>${country.properties.name}:</h3>${country.total === 0 ? 'N/A' : country.total.toLocaleString("en-US")}` + "<h3>Line Chart Goes Here</h3>")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 30) + "px"); 

                    DrawLine(tooltip, svg, d);
                })

                .on("mouseleave", mouseleave)
                .on("mouseout", function(d) {       
                    d3.select("#tooltip")       
                       .style("opacity", 0);   
          1      });

                const tooltip = d3.select(".center")
                                .append("div")
                                .attr("id", "tooltip")
                                .style("opacity", 0)
                                .style("stroke", "none");   
        }
    )}

    drawMap(2000)
    drawLengend(yearRange)
    totalShowed = true;
    totalShowed = false;

    const yearSlider = document.getElementById('yearSlider')
    const yearLabel = document.getElementById('yearLabel')
    
    //slider
    yearSlider.addEventListener('input', () => {
        totalShowed = false;
        const selectedYear = parseInt(yearSlider.value);
        yearLabel.textContent = 'Select a year: ' + selectedYear;
        let element = document.getElementById("tooltip");
        element.remove();
        let legendElement = document.getElementById('legend');
        legendElement.innerHTML = '';
        drawLengend(yearRange)
        drawMap(selectedYear)
    })

    //show total
    const totalButton = document.getElementById('totalButton')
    totalButton.addEventListener('click', () => {
        yearLabel.textContent = 'Current total population';

        let element = document.getElementById("tooltip");
        element.remove();
        let legendElement = document.getElementById('legend');
        legendElement.innerHTML = '';
        totalShowed = true
        drawLengend(totalRange)
        drawMap('Total')
        //move slider to the end
        yearSlider.value = yearSlider.max;
    })
}

window.onload = init; 

