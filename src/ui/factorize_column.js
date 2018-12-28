phantasus.factorizeColumn = function (vector) {
  var self = this;

  this.v = vector;
  if (vector.isFactorized()) {
    this.values = vector.getFactorLevels();
  } else {
    this.values = phantasus.VectorUtil.getSet(vector).values();
  }

  this.$dialog = $('<div style="background:white;" title="' + phantasus.factorizeColumn.prototype.toString() + '"></div>');
  this.$el = $([
    '<div class="container-fluid" style="height: 100%">',
    ' <div class="row" style="height: 100%">',
    '   <div data-name="configPane" class="col-xs-4">',
    '         <div class="form-group"><button name="move_up" type="button" class="btn btn-default btn-sm">Move selected up ↑</button></div>',
    '         <div class="form-group"><button name="move_down" type="button" class="btn btn-default btn-sm">Move selected down ↓</button></div>',
    '   </div>',
    '   <div class="col-xs-8 single-form-column" data-name="selector" style="height: 100%"></div>',
    ' </div>',
    '</div>',
    '</div>'].join('')
  );


  this.formBuilder = new phantasus.FormBuilder({
    formStyle: 'vertical'
  });

  [{
    name: 'values',
    options: this.values,
    value: null,
    multiple: true,
    type: 'select',
    style: 'height: 90%'
  }].forEach(function (a) {
    self.formBuilder.append(a);
  });

  var move_list = function (direction) {
    var $field = self.formBuilder.$form.find("[name=values]");
    var values = $field.val();

    if (direction === 'down') {
      var indexes = _.map(values, function (val) {
        return _.indexOf(self.values, val);
      }).sort(function (a,b) { return b - a; });

      _.each(indexes, function (index) {
        var a = self.values[index];
        var indexB = Math.min(index + 1, self.values.length - 1);
        var b = self.values[indexB];

        self.values[index] = b;
        self.values[indexB] = a;
      });
    } else {
      var indexes = _.map(values, function (val) {
        return _.indexOf(self.values, val);
      }).sort(function (a,b) { return a-b; });

      _.each(indexes, function (index) {
        var a = self.values[index];
        var indexB = Math.max(index - 1, 0);
        var b = self.values[indexB];

        self.values[index] = b;
        self.values[indexB] = a;
      });
    }

    self.formBuilder.setOptions('values', self.values);
  };

  var $button_up = this.$el.find('[name=move_up]');
  var $button_down = this.$el.find('[name=move_down]');

  $button_up.on('click', function () { move_list('up') });
  $button_down.on('click', function () { move_list('down') });

  this.selector = this.$el.find('[data-name=selector]');
  this.formBuilder.$form.appendTo(this.selector);
  this.$el.appendTo(this.$dialog);
  this.$dialog.dialog({
    open: function (event, ui) {
      $(this).css('overflow', 'hidden'); //this line does the actual hiding
    },
    close: function (event, ui) {
      self.$dialog.dialog('destroy').remove();
      event.stopPropagation();
    },
    buttons: {
      'Apply': function () {
        vector.factorize(self.values);
        self.$dialog.dialog('destroy').remove();
      },
      'Remove factor': function () {
        vector.defactorize();
        self.$dialog.dialog('destroy').remove();
      },
      'Cancel': function () {
        self.$dialog.dialog('destroy').remove();
      }
    },

    resizable: false,
    height: 400,
    width: 600
  });
};

phantasus.factorizeColumn.prototype = {
  toString: function () {
    return "Factorise";
  }
};
