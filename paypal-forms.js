(function (global) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function base() {
    var cfg = global.FIOON_PAYPAL || {};
    var here = location.pathname.replace(/\/[^/]*$/, '/');
    return { cfg: cfg, here: here };
  }
  function formHtml(tierKey) {
    var b = base(), cfg = b.cfg, t = cfg.tiers[tierKey];
    if (!cfg.email || !t) return '';
    var ret = new URL(cfg.returnUrl, b.here).href;
    var can = new URL(cfg.cancelUrl, b.here).href;
    return '<form class="paypal-form" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">' +
      '<input type="hidden" name="cmd" value="_xclick">' +
      '<input type="hidden" name="business" value="' + esc(cfg.email) + '">' +
      '<input type="hidden" name="item_name" value="' + esc(t.name) + '">' +
      '<input type="hidden" name="amount" value="' + esc(t.amount) + '">' +
      '<input type="hidden" name="currency_code" value="' + esc(cfg.currency) + '">' +
      '<input type="hidden" name="no_shipping" value="1">' +
      '<input type="hidden" name="no_note" value="1">' +
      '<input type="hidden" name="return" value="' + esc(ret) + '">' +
      '<input type="hidden" name="cancel_return" value="' + esc(can) + '">' +
      '<input type="hidden" name="rm" value="2">' +
      '<button class="solid pay-button" type="submit">Pay with PayPal</button>' +
      '</form>';
  }
  function mount(root) {
    var nodes = (root || document).querySelectorAll('[data-paypal-tier]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var html = formHtml(n.getAttribute('data-paypal-tier'));
      if (html) n.innerHTML = html;
    }
  }
  global.FioonPayPal = { formHtml: formHtml, mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(); });
  else mount();
})(window);
