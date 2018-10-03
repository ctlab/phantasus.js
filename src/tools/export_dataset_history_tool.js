
phantasus.ExportDatasetHistory = function (project) {
  var _this = this;


  this.$el = $('<div class="container-fluid">'
    + '<div class="row">'
    + '<div data-name="controlPane" class="col-xs-2"><button id="copy_btn" class="btn btn-default btn-sm">Copy to clipboard</button></div>'
    + '<div class="col-xs-10"><div data-name="codePane"></div></div>'
    + '<div class=""></div>'
    + '</div></div>');

  this.codePane = this.$el.find('[data-name=codePane]');
  this.copyBtn = this.$el.find('#copy_btn');

  this.copyBtn.on('click', function () {
    _this.codePane.find('textarea').select();
    document.execCommand('copy');
    _this.codePane.find('textarea').blur();
  });

  var $dialog = $('<div style="background:white;" title="' + this.toString() + '"></div>');
  this.$el.appendTo($dialog);
  $dialog.dialog({
    close: function (event, ui) {
      $dialog.dialog('destroy').remove();
      event.stopPropagation();
    },

    resizable: true,
    height: 620,
    width: 950
  });

  this.execute(project);

  if (this.experimentalWarning) {
    phantasus.FormBuilder.showInModal({
      title: 'Warning',
      html: 'Please note: this is experimental a feature yet.',
      z: 10000
    });
    this.experimentalWarning = false;
  }
};
phantasus.ExportDatasetHistory.prototype = {
  experimentalWarning: true,
  toString: function () {
    return 'EXPERIMENTAL: Export Dataset to R code';
  },
  execute: function (project) {
    this.codePane.empty();
    phantasus.Util.createLoadingEl().appendTo(this.codePane);

    var _this = this;
    var dataset = project.getFullDataset();

    dataset.getESSession().then(function (esSession) {
      ocpu.call('exportDatasetHistory', {
        sessionName: esSession.key,
        esVariable: dataset.getESVariable()
      }, function (newSession) {
        newSession.getMessages(function (a) {
          console.log(a);
        });
        newSession.getObject(function (success) {
          var text = JSON.parse(success)[0];

          var textarea = $('<textarea style="height: 100%; width: 100%; resize: none;" id="codeArea" readonly>' + text + '</textarea>');
          _this.codePane.empty();
          textarea.appendTo(_this.codePane);
        });
      }).fail(function () {
        throw new Error('Failed to export dataset to R. See console');
      });
    });
  }
};
