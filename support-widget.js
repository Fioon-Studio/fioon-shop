/* FiOON support widget. The server owns the session through its cookie. */
(function (window, document) {
  'use strict';

  var CONTACT = '1145635941@qq.com';
  var root;
  var state = { open: false, pending: false, retryMessage: '' };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setStatus(text, kind) {
    var status = root.querySelector('[data-support-status]');
    status.textContent = text || '';
    status.className = 'support-status' + (kind ? ' is-' + kind : '');
  }

  function addMessage(role, text, meta) {
    var row = el('article', 'support-message support-message-' + role);
    row.setAttribute('data-support-role', role);
    var label = role === 'user' ? 'You' : 'FiOON AI support';
    row.appendChild(el('p', 'support-message-label', label));
    row.appendChild(el('p', 'support-message-text', String(text || '')));
    if (meta && Array.isArray(meta.sources) && meta.sources.length) {
      var sources = el('ul', 'support-sources');
      meta.sources.forEach(function (source) {
        if (!source || !source.title || !source.url) return;
        var url = String(source.url);
        if (!/^(https?:\/\/|\/|\.\/)/i.test(url)) return;
        var li = el('li');
        var link = el('a', '', String(source.title));
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        li.appendChild(link);
        sources.appendChild(li);
      });
      if (sources.childNodes.length) row.appendChild(sources);
    }
    root.querySelector('[data-support-messages]').appendChild(row);
    row.scrollIntoView({ block: 'nearest' });
  }

  function setBusy(busy) {
    state.pending = busy;
    var input = root.querySelector('[data-support-input]');
    var send = root.querySelector('[data-support-send]');
    input.disabled = busy;
    send.disabled = busy;
    send.textContent = busy ? 'Sending…' : 'Send';
  }

  function send(message) {
    var text = String(message || '').trim();
    if (!text || state.pending) return;
    addMessage('user', text);
    root.querySelector('[data-support-input]').value = '';
    setStatus('Connecting…', 'loading');
    setBusy(true);
    state.retryMessage = text;
    var productNode = document.querySelector('main [data-product-id], main[data-product-id]');
    var productId = productNode && productNode.getAttribute('data-product-id');
    if (!productId) productId = (window.location.pathname.match(/^\/products\/(\d+(?:-v\d+)?)\.html$/) || [])[1];
    var payload = { message: text };
    if (productId) payload.productId = productId;
    fetch('/api/support', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error('Support request failed');
      return response.json();
    }).then(function (data) {
      if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Support response was incomplete');
      addMessage('assistant', data.reply, data);
      setStatus(data.notice || (data.provider === 'catalog' ? 'Reply from product information.' : 'AI reply from product information.'), 'success');
      state.retryMessage = '';
    }).catch(function () {
      setStatus('Live chat is offline on this preview.', 'error');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      addMessage('assistant', 'Live chat is offline on this preview. Email us at 1145635941@qq.com and we will answer the same day.');
      var retry = root.querySelector('[data-support-retry]');
      retry.hidden = false;
    }).finally(function () {
      setBusy(false);
    });
  }

  function resetSession() {
    if (state.pending) return;
    setStatus('Resetting conversation…', 'loading');
    fetch('/api/support/session', { method: 'DELETE', credentials: 'include', headers: { Accept: 'application/json' } })
      .then(function (response) { if (!response.ok) throw new Error('Reset failed'); })
      .then(function () {
        root.querySelector('[data-support-messages]').replaceChildren();
        root.querySelector('[data-support-retry]').hidden = true;
        state.retryMessage = '';
        addMessage('assistant', 'Hello — ask us about fit, care, delivery, or a product.');
        setStatus('New conversation', 'success');
      })
      .catch(function () { setStatus('Could not reset this conversation. Please try again.', 'error'); });
  }

  function mount() {
    if (root || !document.body) return;
    root = el('section', 'support-widget');
    root.setAttribute('aria-label', 'FiOON AI support');
    var toggle = el('button', 'support-launcher', 'AI support');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'support-panel');
    var panel = el('div', 'support-panel');
    panel.id = 'support-panel';
    panel.hidden = true;
    var header = el('header', 'support-header');
    var heading = el('div');
    heading.appendChild(el('p', 'support-eyebrow', 'FiOON')); 
    heading.appendChild(el('h2', '', 'AI support'));
    heading.appendChild(el('p', 'support-note', 'Product questions, thoughtfully answered. Chat is kept for up to an hour. Please do not share payment details.'));
    header.appendChild(heading);
    var close = el('button', 'support-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close AI support');
    header.appendChild(close);
    panel.appendChild(header);
    var messages = el('div', 'support-messages');
    messages.setAttribute('data-support-messages', '');
    panel.appendChild(messages);
    var status = el('p', 'support-status');
    status.setAttribute('data-support-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    panel.appendChild(status);
    var form = el('form', 'support-form');
    var input = el('textarea', 'support-input');
    input.setAttribute('data-support-input', '');
    input.rows = 2;
    input.maxLength = 1000;
    input.required = true;
    input.placeholder = 'Ask about fit, care or a product…';
    input.setAttribute('aria-label', 'Message FiOON AI support');
    var actions = el('div', 'support-actions');
    var sendButton = el('button', 'support-send', 'Send');
    sendButton.type = 'submit';
    sendButton.setAttribute('data-support-send', '');
    var resetButton = el('button', 'support-reset', 'Reset conversation');
    resetButton.type = 'button';
    resetButton.setAttribute('data-support-reset', '');
    actions.appendChild(sendButton);
    actions.appendChild(resetButton);
    form.appendChild(input);
    form.appendChild(actions);
    panel.appendChild(form);
    var retry = el('button', 'support-retry', 'Retry');
    retry.type = 'button';
    retry.hidden = true;
    retry.setAttribute('data-support-retry', '');
    panel.appendChild(retry);
    var handoff = el('p', 'support-handoff');
    handoff.appendChild(document.createTextNode('Need a person? '));
    var email = el('a', '', CONTACT);
    email.href = 'mailto:' + CONTACT;
    handoff.appendChild(email);
    panel.appendChild(handoff);
    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);
    addMessage('assistant', 'Hello — ask us about fit, care, delivery, or a product.');
    toggle.addEventListener('click', function () {
      state.open = !state.open;
      panel.hidden = !state.open;
      toggle.setAttribute('aria-expanded', String(state.open));
      if (state.open) input.focus();
    });
    close.addEventListener('click', function () { state.open = false; panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); });
    form.addEventListener('submit', function (event) { event.preventDefault(); send(input.value); });
    resetButton.addEventListener('click', resetSession);
    retry.addEventListener('click', function () { retry.hidden = true; send(state.retryMessage); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state.open) {
        state.open = false;
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  window.FiOONSupport = { mount: mount, open: function () { mount(); root.querySelector('.support-launcher').click(); } };
})(window, document);
