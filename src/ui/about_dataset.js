phantasus.aboutDataset = function (options) {
  var _this = this;
  this.project = options.project;
  var dataset = this.project.getFullDataset();

  var deepMapper = function (value, index) {
    if (!value.values) {
      return _.map(value, deepMapper).join('');
    }

    return '<tr><td>' + index.toString() + '</td><td>' + value.values.toString() + '</td></tr>';
  };

  var experimentData = _.map(dataset.getExperimentData(), deepMapper).join('');

  var $dialog = $('<div style="background:white;" title="' + phantasus.aboutDataset.prototype.toString() + '"></div>');
  this.$el = $([
    '<div class="container-fluid">',
      '<div class="row" style="height: 100%">',
      '<div data-name="experiment-data" class="col-xs-12">',
        '<label for="experiment-data-table">Experiment data</label>',
        '<table id="experiment-data-table" class="table table-hover table-striped table-condensed">',
          '<tr><th>Name</th><th>Value</th></tr>',
          experimentData,
        '</table>',
      '</div>',
    '</div></div>'].join(''));

  this.$el.appendTo($dialog);
  $dialog.dialog({
    dialogClass: 'phantasus',
    close: function (event, ui) {
      event.stopPropagation();
      $(this).dialog('destroy');
    },

    resizable: true,
    height: 580,
    width: 900
  });
  this.$dialog = $dialog;
};

phantasus.aboutDataset.prototype = {
  toString: function () {
    return 'About dataset';
  }
};
