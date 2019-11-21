
phantasus.DatasetHistory = function () {};

phantasus.DatasetHistory.prototype = {
  STORAGE_KEY: 'dataset_history',
  STORAGE_LIMIT: 10,

  render: function ($parent) {
    var _this = this;

    $parent.empty();
    $('<h4>Or select dataset from your history </h4>').appendTo($parent);

    var currentHistory = this.get();

    if (!_.size(currentHistory)) {
      var $example = $('<h5>But apparently there is no datasets in your history. <a href="#" id="example-dataset">Open example dataset</a></h5>');
      var $example_button = $example.find('#example-dataset');

      $example_button.on('click', function () {
        _this.trigger('open',
          {
            "file":"GSE53986",
            "options":{
              "interactive":true,
              "isGEO":true
            }
          }
        );
      });

      $example.appendTo($parent);
    } else {
      var ul = $('<ul></ul>');
      _.each(currentHistory, function (elem, idx) {
        var li = $('<li title="' + elem.name + _this.datasetTypeToString(elem) +'"><a href="#" data-idx="' + idx + '">' + elem.name + _this.datasetTypeToString(elem) +'</a></li>');
        li.appendTo(ul);
      });
      ul.appendTo($parent);

      ul.on('click', 'a', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var clickedIndex = $(evt.target).data('idx');

        _this.remove(clickedIndex);
        _this.trigger('open', currentHistory[clickedIndex].openParameters);
      });
    }
  },

  store: function (options) {
    var current = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    current.unshift({name: options.name, openParameters: options.openParameters, description: options.description});
    current.length = Math.min(current.length, this.STORAGE_LIMIT);
    current = _.uniq(current, function (elem) { return elem.name; });

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));

    this.trigger('changed');
  },

  remove: function (idx) {
    var current = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    current.splice(idx, 1);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));
  },

  get: function () {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  },

  datasetTypeToString: function (datasetHistory) {
    if (datasetHistory.description) {
      return " - " + datasetHistory.description;
    } else {
      return " - unknown dataset";
    }
  }
};

phantasus.Util.extend(phantasus.DatasetHistory, phantasus.Events);

phantasus.datasetHistory = new phantasus.DatasetHistory();
