function NetworkData() {

  // Name for the visualisation to appear in the menu bar.
  this.name = 'Network data';

  // Each visualisation must have a unique ID with no special
  // characters.
  this.id = 'network-data';

  const valueNames = [ 'packet_loss', 'latency', 'bandwidth'];
  const valuePrettyNames = [ 'Loss', "Lag", "BW" ];
  const valueColors = [ color(255,0,0), color(0,0,255), color(0,255,0) ];
  const dataSets = {
    'France to Sweden': './data/Network/FranceToSweden.csv',
    'France to USA': './data/Network/FranceToUSA.csv',
    'Phone 4G': './data/Network/Phone4G.csv',
    'Same Datacenter': './data/Network/SameDataCenter.csv'
  };
  this.currentChoice = 'Phone 4G';

  function scaleValues (data) {
    const scale = [];
    for (var i = 0; i < valueNames.length; i++) {
      if (valueNames[i] === 'bandwidth') {
        // We are going to scale bandwidth based on 1Mb/s, 10Mb/s, 100Mb/s, 1Gb/s or 10Gb/s
        // Number is kb/s
        var bwScale = 0.1;
        const bwMax = max(data.getColumn(valueNames[i]));
        while (bwScale < bwMax) {
          bwScale *= 10;
        }
        scale.push([ 0, bwScale ]);
      } else {
        scale.push([ 0, max(data.getColumn(valueNames[i])) ]);
      }
    }
    return scale;
  }

  const formatInfoBox = function (time, values) {
    // Time is expressed as a number of 10 second intervals since the epoch, so multiply by 10000
    // to get the date when this sample was collected
    return (new Date(time * 10 * 1000)).toISOString().replace(/\.[0-9]+Z/, '').replace('T', ' ') + '\n' +
    'Loss: ' + values[0] + '%\n' +
    'Latency: ' + values[1] + 'ms\n' +
    'Bandwidth: ' + values[2] + 'Mb/s';
  };

  // our data source sometimes has 0 latency entries if there is missing data, so we just use the previous value
  const preprocessData = function (d) {
    let lastLatency = 50;
    for (let i = 1; i < d.getRowCount(); i++) {
      let lat = d.getNum(i, 'latency');
      if (lat === 0) {
        d.setNum(i, 'latency', lastLatency);
      } else {
        lastLatency = lat;
      }

      // Convert loss to a percentage of all packets so that the loss bar will look correct.
      const loss = d.getNum(i, 'packet_loss');
      d.setNum(i, 'packet_loss', Math.floor((loss / 65535) * 25 * 100) / 100);
    }
  };

  // This is how wide the bar chart at the left side is
  var chartBoundaryX = 150;

  // Title to display above the plot and style applied to it.
  fill(0);
  textSize(12);
  textFont('Georgia');
  textStyle(NORMAL);
  this.title = 'NETWORK DATA ANALYSIS';

  // Names and color for each axis. 
  fill(0);
  this.xAxisLabel = 'TIME';
  //I'm using a helper function to draw the axis label. 
  //We don't want a label here because we are showing multiple graphs on the same chart.
  this.yAxisLabel = '';

  var marginSize = 35;

  // Layout object to store all common plot layout parameters and
  // methods.
  this.layout = {
    marginSize: marginSize,

    // Locations of margin positions. Left and bottom have double margin
    // size due to axis and tick labels.
    leftMargin: marginSize * 2 + chartBoundaryX,
    rightMargin: width - marginSize,
    topMargin: marginSize,
    bottomMargin: height - marginSize * 2,
    pad: 5,

    plotWidth: function() {
      return this.rightMargin - this.leftMargin;
    },

    plotHeight: function() {
      return this.bottomMargin - this.topMargin;
    },

    // Boolean to enable / disable background grid.
    grid: false,

    // Number of axis tick labels to draw so that they are not drawn on
    // top of one another.
    numXTickLabels: 15,
    numYTickLabels: 10,
  };

  // Property to represent whether data has been loaded.
  this.loaded = false;

  // Preload the data. This function is called automatically by the
  // gallery when a visualisation is added.
  this.preload = function() {
    var self = this;
    this.data = loadTable(
      dataSets[this.currentChoice], 'csv', 'header',
      // Callback function to set the value
      // this.loaded to true.
      function (table) {
        preprocessData(table);
        self.reSetup();
        self.loaded = true;
      }
    );
  };

  this.reSetup = function () { 
    // Set min and max times: assumes data is sorted by date.
    window.data = this.data;

    this.startTime = this.data.getNum(0, 'time');
    this.endTime = this.data.getNum(this.data.getRowCount() - 1, 'time');

    // Find min and max latency, packet loss and bandwidth for mapping to canvas height.
    this.scale = scaleValues(this.data);
  
    configureBarData(this.scale);
  };

  this.setup = function() {
    // Font defaults.
    textSize(16);

    // Create a select DOM element.
    this.select = createSelect();
    this.select.position(800, 600);

    // Fill the options with all survey answers.
    const questions = Object.keys(dataSets);
    // First entry is empty.
    for (let i = 0; i < questions.length; i++) {
      this.select.option(questions[i]);
    }
    this.select.value(this.currentChoice);
  };

  this.destroy = function() {
    this.select.remove();
  };

  function mapHeight (value, scale, layout) {
    return map(value,
               scale[0],
               scale[1],
               layout.bottomMargin, // Smaller latency at bottom.
               layout.topMargin);   // Bigger latency at top.
  }

  this.graphLine = function (previous, current, scale, valueNum) {
    if(previous.values[valueNum] === 0 && current.values[valueNum] === 0){
      return;
    }
    stroke(valueColors[valueNum]);
    line(this.mapTimeToWidth(previous.time),
         mapHeight(previous.values[valueNum], scale[valueNum], this.layout),
         this.mapTimeToWidth(current.time),
         mapHeight(current.values[valueNum], scale[valueNum], this.layout));
    stroke(color(0,0,0));
  };

  this.draw = function() {
    if (!this.loaded) {
      return;
    }

    if (this.currentChoice !== this.select.value()) {
      this.loaded = false;
      this.currentChoice = this.select.value();
      this.preload();
      return;
    }

    // Draw the title above the plot.
    this.drawTitle();

    // Draw x and y axis.
    drawAxis(this.layout);

    // Draw x and y axis labels.
    drawAxisLabels(this.xAxisLabel,
                   this.yAxisLabel,
                   this.layout);

    // Plot alllatencies between startTime and endTime using the width
    // of the canvas minus margins.
    var previous;
    var numTimes = this.endTimes - this.startTimes;

    // Loop over all rows and draw a line from the previous value to
    // the current.
    for (var i = 0; i < this.data.getRowCount(); i++) {

      // Create an object to store data for the current time.
      var current = {
        // Convert strings to numbers.
        'time': this.data.getNum(i, 'time'),
        'values': []
      };
      for (var j = 0; j < valueNames.length; j++) {
        current.values.push(this.data.getNum(i, valueNames[j]));
      }

      if (previous) {
        // Draw line segment connecting previous time to current time
        for (var k = 0; k < valueNames.length; k++) {
          this.graphLine(previous, current, this.scale, k);
        }
        // The number of x-axis labels to skip so that only
        // numXTickLabels are drawn.
        var xLabelSkip = ceil(numTimes / this.layout.numXTickLabels);

        // Draw the tick label marking the start of the previous time.
        if (i % xLabelSkip === 0) {
          drawXAxisTickLabel(previous.time, this.layout,
                             this.mapTimeToWidth.bind(this));
        }
      }

      // Assign current time to previous time so that it is available
      // during the next iteration of this loop to give us the start
      // position of the next line segment.
      previous = current;
    }

    //Call drawBars function after the the lines are graphed, so that the info-box is shown on top of the lines
    this.drawBars();

  };

  this.drawTitle = function() {
    fill(0);
    noStroke();
    textAlign('center', 'center');

    text(this.title,
         (this.layout.plotWidth() / 2) + this.layout.leftMargin,
         this.layout.topMargin - (this.layout.marginSize / 2));
  };

  this.mapTimeToWidth = function(value) {
    return map(value,
               this.startTime,
               this.endTime,
               this.layout.leftMargin,   // Draw left-to-right from margin.
               this.layout.rightMargin);
  };

  this.mapWidthToTime = function(value) {
    return map(value,
               this.layout.leftMargin,
               this.layout.rightMargin,
               this.startTime,
               this.endTime);
  };

  //Resource: Code for the Bar chart adapted from https://glitch.com/edit/#!/p5js-interactive-bar-graph?path=sketch.js%3A70%3A0 

  const marginTop = 15;
  const marginLeft = 40;
  const graphWidth = chartBoundaryX - 30;
  const graphHeight = 470;
  var dataShown;
  const barScale = 4;
  const numTicks = 4;
  const vTickScale = barScale/numTicks; //each tick translates to this much increase in rating
  const leftShift = 45;
  const topShift = 20;
  const tickSpacing = 90;

  function configureBarData(scale) {
    dataShown = scale.map(function (s) {
      // This is kind of a hack, it's nice ot use a log scale because numbers like lag can
      // be in the range of single digits to hundreds or even thousands of milliseconds.
      // but near zero we want to switch to a normal scale, so actually this is a log scale
      // with 0.1 as the bottom point and we fake it and pretend it's zero. For the purposes
      // of the graph, it gives the viewer a reasonable intuition of the scale of the accompanying
      // line graph so it solves the problem.
      return Math.max(0, Math.log10(s[1] + 1) );
    });
    //console.log(dataShown, scale);
  }

  function barsVerticalAxis() {
    line(marginLeft+leftShift, marginTop+topShift, marginLeft+leftShift, marginTop+topShift+graphHeight);
    for (var t=1; t<= numTicks; t++) {
      const tickY = marginTop+topShift+graphHeight-tickSpacing*t;
      line(marginLeft+leftShift-5, tickY, marginLeft+leftShift, tickY);
      // This bar chart needs to be a log scale, but I don't want to modify the bar chart logic
      // so I'm going to change how it prints numbers and then I will modify the input data by taking
      // the log base 10.
      noStroke();
      text(Math.pow(10, vTickScale*t - 1), marginLeft+leftShift-topShift-15, tickY);
      stroke(1);
    }
  }

  function barsHorizontalAxis() {
    line(marginLeft+leftShift, marginTop+topShift+graphHeight, marginLeft+leftShift+graphWidth, marginTop+topShift+graphHeight);
    const hTickInt = graphWidth/(valuePrettyNames.length);
    for (var t=0; t<valuePrettyNames.length; t++) {
      fill(0);
      line(marginLeft+leftShift+t*hTickInt+hTickInt/2, marginTop+topShift+graphHeight,
        marginLeft+leftShift+t*hTickInt+hTickInt/2, marginTop+topShift+graphHeight+5);
      noStroke();
      text(valuePrettyNames[t], marginLeft+leftShift+t*hTickInt+hTickInt/2, marginTop+topShift+graphHeight+25);
      stroke(1);
    }
  }
  
  function bars() {
    const hTickInt = graphWidth/(valuePrettyNames.length);
    for (var t=0; t<valuePrettyNames.length; t++) {
      fill(valueColors[t]);
      rect(marginLeft+leftShift+t*hTickInt-0.4*hTickInt/2+hTickInt/2, marginTop+topShift+graphHeight,
        0.4*hTickInt, -tickSpacing*dataShown[t]/vTickScale);
    }
  }

  this.drawBars = function() {
    //draw vertical axis
    barsVerticalAxis();
    
    //draw horizontal axis
    barsHorizontalAxis();
    
    //draw bars
    bars();

    this.addInfoBox();
  };

  this.addInfoBox = function() {
    if (mouseX>this.layout.leftMargin && mouseY<this.layout.bottomMargin){
      const time = Math.floor( this.mapWidthToTime(mouseX) );
      let xVal;
      let elemAtTime;
      // We need to scan the table for the element which has the time
      //console.log(this.data.getRowCount());
      for (let i = 0; i < this.data.getRowCount(); i++) {
        // The dataset has some holes in it, times for which there is no value
        // To deal with this, we just take anything less than or equal to the
        // correct time.
        if (this.data.getNum(i, 'time') <= time) {
          elemAtTime = valueNames.map(function (vn) {
            return this.data.getNum(i, vn);
          });
          xVal = this.mapTimeToWidth(time);
        } else {
          break;
        }
      }

      fill(255, 253, 208);
      rect(xVal, mouseY, -200, 80);
      fill(0,0,0);
      textAlign(LEFT);
      text(formatInfoBox(time, elemAtTime), xVal-180, mouseY+40);
      line(xVal, this.layout.topMargin, xVal, this.layout.bottomMargin);
    }
  };
}