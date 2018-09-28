phantasus.MaximumMeanProbe = function(probes) {
  return phantasus.MaximumUnivariateFunction(probes, phantasus.Mean);
};

phantasus.MaximumMeanProbe.toString = function() {
  return "Maximum Mean Probe";
};

phantasus.MaximumMeanProbe.rString = function() {
  return "mean";
};

phantasus.MaximumMeanProbe.selectOne = true;

phantasus.MaximumMedianProbe = function(probes) {
  return phantasus.MaximumUnivariateFunction(probes, phantasus.Median);
};

phantasus.MaximumMedianProbe.toString = function() {
  return "Maximum Median Probe";
};

phantasus.MaximumMedianProbe.rString = function() {
  return "fastMedian";
};

phantasus.MaximumMedianProbe.selectOne = true;

phantasus.MaximumUnivariateFunction = function(rowView, fun) {
  // console.log("MaximumUnivariateFunction args", rowView, fun);
  var curMax = Number.NEGATIVE_INFINITY;
  var curIndex = -1;
  for (var i = 0; i < rowView.dataset.getRowCount(); i++) {
    rowView.setIndex(i);
    var mean = fun(rowView);
    if (mean > curMax) {
      curMax = mean;
      curIndex = i;
    }
  }
  return {
    value : curMax,
    index : curIndex
  }
};
