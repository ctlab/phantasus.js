phantasus.SlicedVector = function (v, indices) {
  phantasus.VectorAdapter.call(this, v);
  this.indices = indices;
  this.levels = null;
};
phantasus.SlicedVector.prototype = {
  setValue: function (i, value) {
    this.v.setValue(this.indices[i], value);
  },
  getValue: function (i) {
    return this.v.getValue(this.indices[i]);
  },
  size: function () {
    return this.indices.length;
  },

  factorize: function (levels) {
    if (!levels || _.size(levels) === 0 || !_.isArray(levels)) {
      return this.defactorize();
    }

    if (this.isFactorized()) {
      this.defactorize();
    }

    var uniqueValuesInVector = _.uniq(phantasus.VectorUtil.getSet(this).values());

    var allLevelsArePresent = levels.every(function (value) {
      return _.indexOf(uniqueValuesInVector, value) !== -1; // all levels are present in current array
    }) && uniqueValuesInVector.every(function (value) {
      return _.indexOf(levels, value) !== -1; // all current values present in levels
    });


    if (!allLevelsArePresent) {
      throw Error('Cannot factorize vector. Invalid levels');
    }

    this.levels = levels;
  },

  defactorize: function () {
    if (!this.isFactorized()) {
      return;
    }

    this.levels = null;
  },

  isFactorized: function () {
    return _.size(this.levels)  > 0;
  },

  getFactorLevels: function () {
    return this.levels;
  }
};
phantasus.Util.extend(phantasus.SlicedVector, phantasus.VectorAdapter);
