phantasus.GradientColorSupplier = function () {
  phantasus.AbstractColorSupplier.call(this);
  this._updateScale();
};
phantasus.GradientColorSupplier.prototype = {
  createInstance: function () {
    return new phantasus.GradientColorSupplier();
  },
  getColor: function (row, column, value) {
    if (isNaN(value)) {
      return this.missingColor;
    }
    var min = this.min;
    var max = this.max;
    var colors = this.colors;
    if (value <= min) {
      return colors[0];
    } else if (value >= max) {
      return colors[colors.length - 1];
    }
    var fraction = phantasus.SteppedColorSupplier.linearScale(value, min,
        max, 0, 100) / 100;
    return this.colorScale(fraction);
  },
  setFractions: function (options) {
    phantasus.AbstractColorSupplier.prototype.setFractions.call(this,
      options);
    this._updateScale();
  },
  _updateScale: function () {
    this.colorScale = d3.scale.linear().domain(this.fractions).range(
      this.colors).clamp(true);
  }
};
phantasus.Util.extend(phantasus.GradientColorSupplier,
  phantasus.AbstractColorSupplier);
