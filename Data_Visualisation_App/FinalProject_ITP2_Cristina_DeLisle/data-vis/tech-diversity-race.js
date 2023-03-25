function TechDiversityRace() {

  // Name for the visualisation to appear in the menu bar.
  this.name = 'Tech Diversity: Race';

  // Each visualisation must have a unique ID with no special
  // characters.
  this.id = 'tech-diversity-race';

  // Property to represent whether data has been loaded.
  this.loaded = false;

  // This is for creating the animation effect.
  this.currentStatus = [];

  // Preload the data. This function is called automatically by the
  // gallery when a visualisation is added.
  this.preload = function() {
    var self = this;
    this.data = loadTable(
      './data/tech-diversity/race-2018.csv', 'csv', 'header',
      // Callback function to set the value
      // this.loaded to true.
      function(table) {
        self.loaded = true;
      });
  };

  this.setup = function() {
    if (!this.loaded) {
      return;
    }

    // Create a select DOM element.
    this.select = createSelect();
    this.select.position(350, 40);

    // Fill the options with all company names.
    var companies = this.data.columns;
    // First entry is empty.
    for (let i = 1; i < companies.length; i++) {
      this.select.option(companies[i]);
    }
  };

  this.destroy = function() {
    this.select.remove();
    this.currentStatus = [];
  };

  // Create a new pie chart object.
  this.pie = new PieChart(width / 2, height / 2, width * 0.4);

  this.draw = function() {
    if (!this.loaded) {
      console.log('Data not yet loaded');
      return;
    }

    // Get the value of the company we're interested in from the
    // select item.
    const companyName = this.select.value();

    const targetStatus = this.data.getColumn(companyName);

    // Convert all data strings to numbers.
    const targetStatusNum = stringsToNumbers(targetStatus);

    //Detects how many elements are in the pie chart and initializes the current status array with the
    //default status, so it will annimate
    if (this.currentStatus.length === 0){
    this.currentStatus = new Array(this.data.getRowCount());
    this.currentStatus.fill(40);
    }

    //Animates the pie chart
    for (var i = 0; i < this.currentStatus.length; i++) {
        this.currentStatus[i] += (targetStatusNum[i] - this.currentStatus[i]) / 40;
    }

    // Copy the row labels from the table (the first item of each row).
    const labels = this.data.getColumn(0);

    // Colour to use for each category.
    var colours = ['blue', 'red', 'green', 'pink', 'purple', 'yellow'];

    // Make a title.
    const title = 'Diversity @' + companyName;
    
    // Draw the pie chart!
    this.pie.draw(this.currentStatus, labels, colours, title);
  };
}
