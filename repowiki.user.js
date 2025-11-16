// ==UserScript==
// @name         RepoWiki Launcher
// @namespace    https://repowiki.local
// @version      1.0.0
// @description  Add a RepoWiki dropdown on GitHub repositories to open them in DeepWiki, CodeWiki, or ZRead
// @author       Codex
// @match        https://github.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BUTTON_ID = 'repowiki-actions';
  const PROVIDERS = [
    {
      id: 'deepwiki',
      label: 'Open in DeepWiki',
      buildUrl: (url) => {
        const deepUrl = new URL(url);
        deepUrl.protocol = 'https:';
        deepUrl.hostname = 'deepwiki.com';
        return deepUrl.toString();
      },
    },
    {
      id: 'codewiki',
      label: 'Open in CodeWiki',
      buildUrl: (url) => {
        const src = new URL(url);
        return `https://codewiki.google/github.com${src.pathname}${src.search}${src.hash}`;
      },
    },
    {
      id: 'zread',
      label: 'Open in ZRead.ai',
      buildUrl: (url) => {
        const src = new URL(url);
        return `https://zread.ai${src.pathname}${src.search}${src.hash}`;
      },
    },
  ];

  const style = document.createElement('style');
  style.textContent = `
    #${BUTTON_ID} {
      margin-right: 8px;
    }
    #${BUTTON_ID} details {
      display: inline-block;
    }
    #${BUTTON_ID} summary.btn-sm {
      display: inline-flex;
      align-items: center;
      cursor: pointer;
      padding-top: 3px;
      padding-bottom: 3px;
    }
    #${BUTTON_ID} summary::-webkit-details-marker {
      display: none;
    }
    #${BUTTON_ID} summary .dropdown-caret {
      display: inline-block;
      margin-left: 6px;
      border-top: 4px solid currentColor;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      width: 0;
      height: 0;
    }
    #${BUTTON_ID} .SelectMenu {
      position: absolute;
      right: 0;
      margin-top: 6px;
      z-index: 101;
    }
    #${BUTTON_ID} .SelectMenu-item {
      font-size: 13px;
    }
    #${BUTTON_ID} .SelectMenu-closeButton {
      border: none;
      background: transparent;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);

  function getRepoUrl() {
    const { pathname, origin, search, hash } = window.location;
    const match = pathname.match(/^\/[^/]+\/[^/]+/);
    if (!match) {
      return null;
    }
    return `${origin}${match[0]}${pathname.slice(match[0].length)}${search}${hash}`;
  }

  function createMenuItem(provider, detailsEl) {
    const link = document.createElement('a');
    link.className = 'SelectMenu-item';
    link.href = '#';
    link.role = 'menuitem';
    link.textContent = provider.label;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        const repoUrl = getRepoUrl();
        if (!repoUrl) {
          return;
        }
        const target = provider.buildUrl(repoUrl);
        window.open(target, '_blank');
      } catch (err) {
        console.error(`[RepoWiki] Failed to build URL for ${provider.id}`, err);
      } finally {
        detailsEl.removeAttribute('open');
      }
    });
    return link;
  }

  function buildDropdown() {
    const details = document.createElement('details');
    details.className = 'details-reset details-overlay position-relative';

    const summary = document.createElement('summary');
    summary.className = 'btn btn-sm';
    const label = document.createElement('span');
    label.textContent = 'RepoWiki';
    summary.appendChild(label);
    const caret = document.createElement('span');
    caret.className = 'dropdown-caret';
    summary.appendChild(caret);
    summary.setAttribute('aria-haspopup', 'menu');
    details.appendChild(summary);

    const menu = document.createElement('div');
    menu.className = 'SelectMenu';

    const modal = document.createElement('div');
    modal.className = 'SelectMenu-modal';

    const header = document.createElement('header');
    header.className = 'SelectMenu-header';
    const title = document.createElement('span');
    title.className = 'SelectMenu-title';
    title.textContent = 'Open with';
    header.appendChild(title);
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'SelectMenu-closeButton';
    close.setAttribute('aria-label', 'Close menu');
    close.addEventListener('click', () => details.removeAttribute('open'));
    header.appendChild(close);
    modal.appendChild(header);

    const list = document.createElement('div');
    list.className = 'SelectMenu-list';
    PROVIDERS.forEach((provider) => {
      list.appendChild(createMenuItem(provider, details));
    });
    modal.appendChild(list);
    menu.appendChild(modal);
    details.appendChild(menu);
    return details;
  }

  function injectButton() {
    const container = document.querySelector('ul.pagehead-actions');
    if (!container) {
      return;
    }
    const repoUrl = getRepoUrl();
    if (!repoUrl) {
      return;
    }

    const existing = document.getElementById(BUTTON_ID);
    if (existing && existing.parentElement === container) {
      return;
    }
    if (existing) {
      existing.remove();
    }

    const li = document.createElement('li');
    li.id = BUTTON_ID;
    li.appendChild(buildDropdown());
    container.insertBefore(li, container.firstChild);
  }

  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('load', injectButton);
  document.addEventListener('turbo:render', injectButton);
  injectButton();
})();
