
phantasus.ReproduceTool = function (project) {
  var _this = this;

  this.$el = $('<div class="container-fluid">'
    + '<div class="row">'
    + '<div data-name="controlPane" class="col-xs-2">'
    + '<button id="copy_btn" class="btn btn-default btn-sm">Copy to clipboard</button>'
    + '<button id="save_env_btn" style="margin-top:15px; display: none" class="btn btn-default btn-sm">Save environment</button>'
    + '</div>'
    + '<div class="col-xs-10"><div data-name="codePane"></div></div>'
    + '<div class=""></div>'
    + '</div></div>');

  this.codePane = this.$el.find('[data-name=codePane]');
  this.copyBtn = this.$el.find('#copy_btn');
  this.saveEnvBtn = this.$el.find('#save_env_btn');

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
};
phantasus.ReproduceTool.prototype = {
  experimentalWarning: true,
  toString: function () {
    return 'Reproduce in R code';
  },
  execute: function (project) {
    this.codePane.empty();
    phantasus.Util.createLoadingEl().appendTo(this.codePane);

    var _this = this;
    var dataset = project.getFullDataset();

    dataset.getESSession().then(function (esSession) {
      ocpu.call('reproduceInR/print', {
        sessionName: esSession.key
      }, function (newSession) {
        var text = JSON.parse(newSession.txt)[0];
        text = '# docker image: dzenkova/phantasus:' + PHANTASUS_BUILD + '\n' + text;

        var textarea = $('<textarea style="height: 100%; width: 100%; resize: none;" id="codeArea" readonly>' + text + '</textarea>');
        _this.codePane.empty();
        textarea.appendTo(_this.codePane);

        _this.saveEnvBtn.off();
        _this.saveEnvBtn.on('click', function () {
          window.open(newSession.getLoc() + 'R/env/rda', '_blank');
        });
        _this.saveEnvBtn.css('display', 'block');
      }).fail(function () {
        throw new Error('Failed to reproduce in R. See console');
      });
    });
  }
};
