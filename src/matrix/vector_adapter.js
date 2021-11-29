phantasus.VectorAdapter = function (v) {
  if (v == null) {
    throw 'vector is null';
  }
  this.v = v;
};
phantasus.VectorAdapter.prototype = {
  setValue: function (i, value) {
    this.v.setValue(i, value);
  },
  getValue: function (i) {
    return this.v.getValue(i);
  },
  getProperties: function () {
    return this.v.getProperties();
  },
  size: function () {
    return this.v.size();
  },
  getName: function () {
    return this.v.getName();
  },
  setName: function (name) {
    this.v.setName(name);
  },
  isFactorized: function () {
    return this.v.isFactorized();
  },
  getFactorLevels: function () {
    return this.v.getFactorLevels();
  },
  factorize: function (levels) {
    return this.v.factorize(levels);
  },
  defactorize: function () {
    return this.v.defactorize();
  },
  getDatatype: function(){
    return this.v.getDatatype();
  },
  setDatatype: function(datatype){
    return this.v.setDatatype(datatype);
  },
  getArray: function(){
    return this.v.getArray();
  }
};
