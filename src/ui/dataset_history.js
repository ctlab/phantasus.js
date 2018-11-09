
phantasus.DatasetHistory = function () {};

phantasus.DatasetHistory.prototype = {
  STORAGE_KEY: 'dataset_history',
  STORAGE_LIMIT: 5,

  render: function ($parent) {
    var _this = this;

    $parent.empty();
    $('<h4>Or select dataset from your history </h4>').appendTo($parent);

    var currentHistory = this.get();

    if (!_.size(currentHistory)) {
      $('<h5>But apparently there is no datasets in your history. Great time to start new journey</h5>').appendTo($parent);
    } else {
      var ul = $('<ul></ul>');
      _.each(currentHistory, function (elem, idx) {
        var li = $('<li><a href="#" data-idx="' + idx + '">' + elem.name + _this.datasetTypeToString(elem.options.dataset) +'</a></li>');
        li.appendTo(ul);
      });
      ul.appendTo($parent);

      ul.on('click', 'a', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        var clickedIndex = $(evt.target).data('idx');

        _this.remove(clickedIndex);
        _this.trigger('open', currentHistory[clickedIndex].options);
      });
    }
  },

  store: function (datasetOpenOptions) {
    var current = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    current.unshift({name: datasetOpenOptions.dataset.file, options: datasetOpenOptions});
    current.length = Math.min(current.length, this.STORAGE_LIMIT);

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

  datasetTypeToString: function (dataset) {
    if (dataset.options.isGEO) {
      return " - GEO dataset";
    } else if (dataset.options.preloaded) {
      return " - preloaded dataset";
    } else {
      return " - unknown dataset";
    }
  }
};

phantasus.Util.extend(phantasus.DatasetHistory, phantasus.Events);
