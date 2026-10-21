(function (window, document) {
  'use strict';

  var BAG_KEY = 'petal-bag-v3';
  var products = Array.isArray(window.PETAL_PRODUCTS) ? window.PETAL_PRODUCTS : [];
  var settings = window.PETAL_SETTINGS || {};
  var bag = readBag();
  var quoteItems = [];
  var quoteRequest = 0;
  var currency = settings.currency || 'USD';
  var itemsNode = document.getElementById('checkout-items');
  var messageNode = document.getElementById('quote-message');
  var retryNode = document.getElementById('quote-retry');
  var summaryNode = document.getElementById('checkout-summary');
  var countryNode = document.getElementById('checkout-country');

  function readBag() {
    try {
      var value = JSON.parse(window.localStorage.getItem(BAG_KEY) || '[]');
      if (!Array.isArray(value)) return [];
      return value.filter(function (item) {
        return item && typeof item.id === 'string' && typeof item.variant === 'string' && typeof item.size === 'string' && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99;
      });
    } catch (error) {
      return [];
    }
  }

  function findProduct(item) { return products.find(function (product) { return product.offerId === item.id; }); }
  function findVariant(product, id) { return product && Array.isArray(product.variants) ? product.variants.find(function (variant) { return variant.id === id; }) : null; }
  function findSize(product, id) { return product && Array.isArray(product.sizes) ? product.sizes.find(function (size) { return size.id === id; }) : null; }
  function imageFor(product, variant) { return (variant && variant.image) || (product && product.image) || ''; }
  function money(value, code) {
    var amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: code || currency }).format(amount); } catch (error) { return String(amount); }
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function text(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value == null ? '' : String(value);
    return node;
  }
  function safeImage(source, fallback) {
    var value = String(source || fallback || '');
    if (value && !/^(?:javascript|data|vbscript):/i.test(value)) return value;
    return fallback || '';
  }

  function renderItems(rows) {
    clear(itemsNode);
    if (!rows.length) {
      itemsNode.appendChild(text('p', 'checkout-empty', 'Your bag is empty. Return to the collection to choose a little something.'));
      var link = document.createElement('a');
      link.href = 'index.html#shop';
      link.textContent = 'Explore the collection →';
      itemsNode.appendChild(link);
      return;
    }
    rows.forEach(function (row) {
      var item = row.source || row;
      var product = findProduct(item);
      var variant = findVariant(product, item.variant);
      var size = findSize(product, item.size);
      var card = document.createElement('article');
      card.className = 'checkout-item';
      var image = document.createElement('img');
      image.src = safeImage(row.image || imageFor(product, variant), '');
      image.alt = String(row.name || (product && product.name) || 'FiOON product');
      image.loading = 'lazy';
      card.appendChild(image);
      var details = document.createElement('div');
      details.appendChild(text('h3', '', row.name || (product && product.name) || 'FiOON product'));
      details.appendChild(text('p', '', (row.size || (size && size.label) || item.size || 'Size to confirm') + ' · Qty ' + String(row.quantity || item.qty)));
      if (!row.name && variant && variant.name) details.appendChild(text('p', '', variant.name));
      card.appendChild(details);
      var price = row.unitPrice != null ? row.unitPrice : null;
      card.appendChild(text('strong', 'checkout-item-price', price == null ? 'Estimate pending' : money(price, quoteItems.currency)));
      itemsNode.appendChild(card);
    });
  }

  function setMessage(value, error) {
    messageNode.textContent = value || '';
    messageNode.classList.toggle('is-error', Boolean(error));
  }

  function quotePayload() {
    return {
      items: bag.map(function (item) {
        return { productId: item.id, variantId: item.variant, sizeId: item.size, quantity: item.qty };
      }),
      country: countryNode.value
    };
  }

  function renderQuote(data) {
    quoteItems = Array.isArray(data.items) ? data.items : [];
    currency = data.currency || currency;
    renderItems(quoteItems.map(function (item) { return { ...item, source: { id: item.productId, variant: '', size: item.size, qty: item.quantity } }; }));
    document.getElementById('quote-subtotal').textContent = money(data.subtotal, currency);
    document.getElementById('quote-shipping').textContent = money(data.shipping, currency);
    document.getElementById('quote-total').textContent = money(data.total, currency);
    summaryNode.hidden = false;
    setMessage('Order estimate updated. Destination availability, delivery timing and taxes are not guaranteed.', false);
    retryNode.hidden = true;
  }

  function requestQuote() {
    if (!bag.length) { renderItems([]); summaryNode.hidden = true; setMessage('Add a product before requesting an order estimate.', false); retryNode.hidden = true; return; }
    var requestId = ++quoteRequest;
    setMessage('Preparing your order estimate…', false);
    retryNode.hidden = true;
    summaryNode.hidden = true;
    fetch('/api/checkout/quote', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(quotePayload())
    }).then(function (response) {
      if (!response.ok) throw new Error('Quote request failed');
      return response.json();
    }).then(function (data) {
      if (requestId !== quoteRequest) return;
      if (!data || !Array.isArray(data.items) || data.currency == null) throw new Error('Quote response was incomplete');
      renderQuote(data);
    }).catch(function () {
      if (requestId !== quoteRequest) return;
      renderItems(bag.map(function (item) { return { source: item }; }));
      setMessage('Live checkout is not switched on for this preview, so no order was placed. Email 1145635941@qq.com with the item and size you want and we will send you an order estimate.', true);
      retryNode.hidden = false;
    });
  }

  countryNode.addEventListener('change', requestQuote);
  retryNode.addEventListener('click', requestQuote);
  document.getElementById('delivery-form').addEventListener('submit', function (event) { event.preventDefault(); });
  renderItems(bag.map(function (item) { return { source: item }; }));
  requestQuote();
})(window, document);
