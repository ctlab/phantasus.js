/**
 * An ordered collection of values.
 *
 * Creates a new vector with the given name and size.
 *
 * @param name
 *            the vector name
 * @param size
 *            the number of elements in this vector
 * @constructor
 */
phantasus.Vector = function (name, size) {
  this.array = [];
  this.levels = null;
  phantasus.AbstractVector.call(this, name, size);
};
/**
 * @static
 */
phantasus.Vector.fromArray = function (name, array) {
  var v = new phantasus.Vector(name, array.length);
  v.array = array;
  return v;
};
phantasus.Vector.prototype = {
  /**
   * @ignore
   * @param value
   */
  push: function (value) {
    this.array.push(value);
  },
  /**
   * Sets the value at the specified index.
   *
   * @param index
   *            the index
   * @param value
   *            the value
   */
  setValue: function (index, value) {
    this.defactorize();
    this.array[index] = value;
  },
  getValue: function (index) {
    return this.array[index];
  },
  /**
   * @ignore
   * @param name
   */
  setName: function (name) {
    this.name = name;
  },
  /**
   * @ignore
   * @param array
   * @returns {phantasus.Vector}
   */
  setArray: function (array) {
    this.defactorize();

    this.array = array;
    return this;
  },


  factorize: function (levels) {
    if (!levels || _.size(levels) === 0 || !_.isArray(levels)) {
      return this.defactorize();
    }

    if (this.isFactorized()) {
      this.defactorize();
    }

    var uniqueValuesInVector = _.uniq(this.array);

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
    if (this.isPhantasusFactor()){
      this.getProperties().set(phantasus.VectorKeys.IS_PHANTASUS_FACTOR,false);
    } 
      this.levels = null;

  },

  isFactorized: function () {
    return _.size(this.levels)  > 0;
  },
  isPhantasusFactor: function(){
    return this.getProperties().get(phantasus.VectorKeys.IS_PHANTASUS_FACTOR)?true:false;
  },

  getFactorLevels: function () {
    return this.levels;
  },
  getDatatype: function(){
    return this.getProperties().get(phantasus.VectorKeys.DATA_TYPE);
  },
  setDatatype: function(datatype){
    this.getProperties().set(phantasus.VectorKeys.DATA_TYPE, datatype);
  },
   getArray: function(){
    return this.array;
  }
  
};
phantasus.Util.extend(phantasus.Vector, phantasus.AbstractVector);
