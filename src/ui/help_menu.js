phantasus.HelpMenu = function () {
  var html = [];
  html.push('<div class="btn-group">');
  html.push('<button type="button" class="btn btn-default btn-xxs' +
    ' dropdown-toggle"' +
    ' data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">');
  // html.push('<svg width="14px" height="14px" style="inline-block;vertical-align:middle;"><g><rect x="0" y="0" width="14" height="6" style="fill:#ca0020;stroke:none"></rect><rect x="0" y="7" width="14" height="6" style="fill:#0571b0;stroke:none"></rect></g></svg>');
  html.push('<img style="padding-right:2px" src="phantasus_logo_16.png"></img>');
  html.push('<span class="fa fa-caret-down"></span>');
  html.push('</button>');
  html
    .push('<ul class="dropdown-menu dropdown-menu-right" role="menu">');
  html.push('<li><a data-name="contact" href="#">Contact</a></li>');

  html.push('<li><a data-name="tutorial" href="#">Tutorial</a></li>');
  html.push('<li><a data-name="source" href="#">Source Code</a></li>');
  html.push('<li><a data-name="about" href="#">About</a></li>');

  html.push('</ul>');
  html.push('</div>');
  this.$el = $(html.join(''));
  this.$el.find('[data-name=contact]').on('click', function (e) {
    phantasus.FormBuilder.showInModal({
      title: 'Contact',
      html: 'Please email us at alsergbox@gmail.com',
      focus: document.activeElement
    });
    e.preventDefault();
  });
  this.$el.find('[data-name=tutorial]').on('click', function (e) {
    window
    .open('phantasus-tutorial.html');
    e.preventDefault();

  });

  this.$el.find('[data-name=source]').on('click', function (e) {
    window.open('https://github.com/ctlab/phantasus');
    e.preventDefault();

  });

  this.$el.find('[data-name=about]').on('click', function (e) {
    var $div = $([
      '<div>',
      'Phantasus version: ' + PHANTASUS_VERSION + ', build: ' + PHANTASUS_BUILD + '<br/>',
      'Changelog available at: <a href="https://raw.githubusercontent.com/ctlab/phantasus/master/NEWS" target="_blank">Github</a><br/>',
      'Source Code available at: <a href="http://github.com/ctlab/phantasus" target="_blank">Github</a>',
      '</div>'
    ].join('\n'));

    phantasus.FormBuilder.showInModal({
      title: 'About Phantasus',
      close: 'Close',
      html: $div,
    });
    e.preventDefault();

  });
};
