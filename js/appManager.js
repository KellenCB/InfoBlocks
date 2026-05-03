// appManager.js
import { categoryTags, blockTypeConfig, BOOK_ACCENT_COLORS, DEFAULT_BOOK_ACCENT } from './tagConfig.js';
import { blockTemplate, sanitizeBlockHTML } from './blockTemplate.js';

import { applyInlineDiceRolls } from './diceRoller.js';
import { filterManager } from './filterManager.js';
import { blockActionsHandler } from './blockActionsHandler.js';

const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

export function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

/* ==================================================================*/
/* ================ USES FIELD (moved from overlayHandler) =========*/
/* ==================================================================*/

export function initUsesField(overlayElement, storageKeyPrefix, defaultSlots = 5) {
    let usesState = JSON.parse(localStorage.getItem(storageKeyPrefix)) || [];
  
    overlayElement.innerHTML = "";
  
    const usesRow = document.createElement("div");
    usesRow.classList.add("uses-row");

    const controlsContainer = document.createElement("div");
    controlsContainer.classList.add("uses-controls-container");

    const addButton = document.createElement("div");
    addButton.classList.add("circle", "circle-button", "circle-add");
    addButton.innerHTML = "+";
    addButton.addEventListener("click", () => {
        usesState.push(false);
        localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
        renderCircles();
    });
    controlsContainer.appendChild(addButton);

    const removeButton = document.createElement("div");
    removeButton.classList.add("circle", "circle-button", "circle-remove");
    removeButton.innerHTML = "−";
    removeButton.addEventListener("click", () => {
        if (usesState.length > 0) {
            usesState.pop();
            localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
            renderCircles();
        }
    });
    controlsContainer.appendChild(removeButton);

    const circlesContainer = document.createElement("div");
    circlesContainer.classList.add("uses-circles-container");

    function renderCircles() {
        circlesContainer.innerHTML = "";
        usesState.forEach((state, index) => {
            const circle = document.createElement("div");
            circle.classList.add("circle");
            if (state) circle.classList.add("unfilled");
            circle.addEventListener("click", () => {
                circle.classList.toggle("unfilled");
                usesState[index] = circle.classList.contains("unfilled");
                localStorage.setItem(storageKeyPrefix, JSON.stringify(usesState));
            });
            circlesContainer.appendChild(circle);
        });
    }
  
    renderCircles();

    usesRow.appendChild(controlsContainer);
    usesRow.appendChild(circlesContainer);
    overlayElement.appendChild(usesRow);
}

/* ==================================================================*/
/* ============ TEXT TOOLBAR (moved from overlayHandler) ============*/
/* ==================================================================*/

export function initToolbarForEditor(editor) {
      const toolbar = document.createElement('div');
      toolbar.className = 'text-toolbar';
      toolbar.innerHTML = `
        <button type="button" data-action="bold" data-tooltip="Bold"><i class="fas fa-bold"></i></button>
        <button type="button" data-action="italic" data-tooltip="Italic"><i class="fas fa-italic"></i></button>
        <button type="button" data-action="underline" data-tooltip="Underline"><i class="fas fa-underline"></i></button>
        <button type="button" data-action="link" data-tooltip="Link"><i class="fas fa-link"></i></button>
        <button type="button" data-action="insertUnorderedList" data-tooltip="Unordered List"><i class="fas fa-list-ul"></i></button>
        <button type="button" data-action="insertOrderedList" data-tooltip="Ordered List"><i class="fas fa-list-ol"></i></button>
        <button type="button" data-action="increaseFont" data-tooltip="Increase Font"><i class="fas fa-arrow-up"></i></button>
        <select id="font-size-select">
            <option value="1">10px</option>
            <option value="2">13px</option>
            <option value="3">16px</option>
            <option value="4">18px</option>
            <option value="5">24px</option>
            <option value="6">32px</option>
            <option value="7">48px</option>
        </select>
        <button type="button" data-action="decreaseFont" data-tooltip="Decrease Font"><i class="fas fa-arrow-down"></i></button>
        <button type="button" data-action="uppercase" data-tooltip="Uppercase">A↑</button>
        <button type="button" data-action="sentencecase" data-tooltip="Sentence case">Aa</button>
        <button type="button" data-action="lowercase" data-tooltip="Lowercase">a↓</button>
        <button type="button" data-action="removeStyling" data-tooltip="Remove styling">✕</button>
        <button type="button" data-action="findReplace" data-tooltip="Find and Replace">A→B</button>
      `;
  
      const wrapper = document.createElement('div');
      wrapper.className = 'editor-toolbar-wrapper';
      editor.parentNode.replaceChild(wrapper, editor);
      wrapper.appendChild(toolbar);
      wrapper.appendChild(editor);

      const frPanel = document.createElement('div');
      frPanel.className = 'find-replace-panel hidden';
      frPanel.innerHTML = `
        <div class="find-replace-row">
            <input type="text" class="fr-find" placeholder="Find..." />
            <input type="text" class="fr-replace" placeholder="Replace..." />
            <button type="button" class="fr-btn fr-find-next">Find Next</button>
            <button type="button" class="fr-btn fr-replace-one">Replace One</button>
            <button type="button" class="fr-btn fr-replace-all">Replace All</button>
            <button type="button" class="fr-btn fr-close">✕</button>
        </div>
        <div class="fr-feedback"></div>
      `;
      wrapper.insertBefore(frPanel, editor);

      let frMatches = [];
      let frIndex = -1;

      const frFind    = frPanel.querySelector('.fr-find');
      const frReplace = frPanel.querySelector('.fr-replace');
      const frFeedback = frPanel.querySelector('.fr-feedback');
      frFeedback.style.display = 'none';

      const clearFrHighlights = () => {
        editor.querySelectorAll('span.fr-highlight, span.fr-highlight-active').forEach(span => {
          span.replaceWith(...span.childNodes);
        });
        editor.normalize();
      };

      const findTextMatches = () => {
        const results = [];
        const query = frFind.value;
        if (!query) return results;
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const walk = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            let match;
            while ((match = regex.exec(text)) !== null) {
              results.push({ node, index: match.index, length: match[0].length });
            }
          } else {
            if (node.nodeType === Node.ELEMENT_NODE &&
                (node.classList.contains('fr-highlight') || node.classList.contains('fr-highlight-active'))) {
              results.push({ node: node.firstChild, index: 0, length: node.textContent.length });
              return;
            }
            node.childNodes.forEach(walk);
          }
        };
        walk(editor);
        return results;
      };

      const highlightAll = (activeIdx = -1) => {
        clearFrHighlights();
        if (frMatches.length === 0) return;
        [...frMatches].reverse().forEach(({ node, index, length }, reversedI) => {
          const actualI = frMatches.length - 1 - reversedI;
          if (!node || !node.parentNode) return;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + length);
          const span = document.createElement('span');
          span.className = actualI === activeIdx ? 'fr-highlight-active' : 'fr-highlight';
          range.surroundContents(span);
        });
        if (activeIdx >= 0) {
          const active = editor.querySelector('span.fr-highlight-active');
          if (active) active.scrollIntoView({ block: 'nearest' });
        }
      };

      const buildMatches = () => {
        clearFrHighlights();
        frMatches = findTextMatches();
        frIndex = -1;
        frFeedback.textContent = '';
        if (frMatches.length === 0) {
          if (frFind.value) frFeedback.textContent = 'No matches found';
        } else {
          frFeedback.textContent = `${frMatches.length} match${frMatches.length !== 1 ? 'es' : ''} found`;
          highlightAll();
        }
      };

      frFind.addEventListener('input', () => {
        if (!frFind.value) {
          clearFrHighlights();
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
          frFeedback.style.display = 'none';
          return;
        }
        frFeedback.style.display = '';
        buildMatches();
      });

      frPanel.querySelector('.fr-find-next').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frMatches = findTextMatches();
        if (frMatches.length === 0) { frFeedback.textContent = 'No matches found'; return; }
        frIndex = (frIndex + 1) % frMatches.length;
        highlightAll(frIndex);
        frFeedback.style.display = '';
        frFeedback.textContent = frIndex === frMatches.length - 1
          ? `Match ${frIndex + 1} of ${frMatches.length} — no more matches after this`
          : `Match ${frIndex + 1} of ${frMatches.length}`;
      });

      frPanel.querySelector('.fr-replace-one').addEventListener('mousedown', e => {
        e.preventDefault();
        if (frIndex < 0 || frMatches.length === 0) { frFeedback.textContent = 'Use Find Next to select a match first'; return; }
        const active = editor.querySelector('span.fr-highlight-active');
        if (!active) { frFeedback.textContent = 'Use Find Next to select a match first'; return; }
        const replacedIndex = frIndex;
        const replaceText = frReplace.value;
        active.textContent = replaceText;
        active.className = 'fr-highlight-active';
        editor.querySelectorAll('span.fr-highlight').forEach(span => span.replaceWith(...span.childNodes));
        editor.normalize();
        frMatches = findTextMatches();
        if (frMatches.length === 0) {
          frIndex = -1;
          frFeedback.textContent = 'No more matches';
          editor.querySelectorAll('span.fr-highlight-active').forEach(span => span.replaceWith(...span.childNodes));
          editor.normalize();
        } else {
          frIndex = replacedIndex - 1;
          if (frIndex < -1) frIndex = frMatches.length - 1;
          frFeedback.textContent = `${frMatches.length} match${frMatches.length !== 1 ? 'es' : ''} remaining — use Find Next to continue`;
          editor.querySelectorAll('span.fr-highlight').forEach(span => span.replaceWith(...span.childNodes));
          editor.normalize();
          frMatches = findTextMatches();
          [...frMatches].reverse().forEach(({ node, index, length }) => {
            if (!node || !node.parentNode) return;
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + length);
            const span = document.createElement('span');
            span.className = 'fr-highlight';
            range.surroundContents(span);
          });
        }
      });

      frPanel.querySelector('.fr-replace-all').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frMatches = findTextMatches();
        if (frMatches.length === 0) { frFeedback.textContent = 'No matches found'; return; }
        const count = frMatches.length;
        const replaceText = frReplace.value;
        [...frMatches].reverse().forEach(({ node, index, length }) => {
          if (!node || !node.parentNode) return;
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + length);
          const span = document.createElement('span');
          span.className = 'fr-highlight';
          range.surroundContents(span);
          span.textContent = replaceText;
        });
        editor.normalize();
        frMatches = [];
        frIndex = -1;
        frFeedback.textContent = `${count} replacement${count !== 1 ? 's' : ''} made`;
      });

      frPanel.querySelector('.fr-close').addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        e.preventDefault();
        clearFrHighlights();
        frPanel.classList.add('hidden');
        frMatches = [];
        frIndex = -1;
        frFeedback.textContent = '';
        frFeedback.style.display = 'none';
        frFind.value = '';
        frReplace.value = '';
      });

      const buttons = toolbar.querySelectorAll('button');
      const sizeSelect = toolbar.querySelector('#font-size-select');
  
      sizeSelect.addEventListener('change', () => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontSize', false, sizeSelect.value);
        updateToolbarState();
      });
  
      function updateToolbarState() {
        buttons.forEach(btn => {
          const action = btn.dataset.action;
          const active = document.queryCommandState(action);
          btn.classList.toggle('selected', active);
        });
        const sel = window.getSelection();
        if (sel.rangeCount && sel.toString()) {
          const node = sel.getRangeAt(0).startContainer.parentNode;
          const sizePx = window.getComputedStyle(node).fontSize;
          const map = { '10px':'1','13px':'2','16px':'3','18px':'4','24px':'5','32px':'6','48px':'7' };
          if (map[sizePx]) sizeSelect.value = map[sizePx];
        }
      }
  
      let activeTooltip = null;
      buttons.forEach(btn => {
        const tooltipText = btn.dataset.tooltip;
        if (tooltipText) {
          btn.addEventListener('mouseenter', () => {
            clearTimeout(btn._tooltipTimer);
            btn._tooltipTimer = setTimeout(() => {
              const tip = document.createElement('div');
              tip.classList.add('text-tooltip');
              tip.textContent = tooltipText;
              document.body.appendChild(tip);
              const rect = btn.getBoundingClientRect();
              tip.style.left = `${rect.left}px`;
              tip.style.top  = `${rect.bottom + 5}px`;
              activeTooltip = tip;
            }, 750);
          });
          btn.addEventListener('mouseleave', () => {
            clearTimeout(btn._tooltipTimer);
            if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
          });
        }

        btn.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
          const action = btn.dataset.action;
          if (action === 'link') {
            const url = prompt('Enter URL');
            if (url) document.execCommand('createLink', false, url.startsWith('http') ? url : `https://${url}`);
          } else if (action === 'increaseFont') {
            let idx = sizeSelect.selectedIndex;
            if (idx < sizeSelect.options.length - 1) { sizeSelect.selectedIndex = idx + 1; sizeSelect.dispatchEvent(new Event('change')); }
          } else if (action === 'decreaseFont') {
            let idx = sizeSelect.selectedIndex;
            if (idx > 0) { sizeSelect.selectedIndex = idx - 1; sizeSelect.dispatchEvent(new Event('change')); }
          } else if (action === 'removeStyling') {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const selectedText = range.toString();
            if (!selectedText) return;
            const frag = range.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(frag);
            tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
            tempDiv.querySelectorAll('p, div, li').forEach(el => { el.insertAdjacentText('afterend', '\n'); el.replaceWith(el.textContent); });
            tempDiv.querySelectorAll('ul, ol').forEach(el => el.replaceWith(el.textContent));
            tempDiv.querySelectorAll('*').forEach(el => el.replaceWith(el.textContent));
            const newFrag = document.createDocumentFragment();
            const lines = tempDiv.textContent.split('\n');
            lines.forEach((line, i) => {
              newFrag.appendChild(document.createTextNode(line));
              if (i < lines.length - 1) newFrag.appendChild(document.createElement('br'));
            });
            range.deleteContents();
            range.insertNode(newFrag);
          } else if (action === 'findReplace') {
            frPanel.classList.toggle('hidden');
            if (!frPanel.classList.contains('hidden')) {
              frFind.focus();
            } else {
              clearFrHighlights();
              frMatches = [];
              frIndex = -1;
              frFeedback.textContent = '';
            }
          } else if (['uppercase','sentencecase','lowercase'].includes(action)) {
            // fallback span-transform if needed
          } else {
            document.execCommand(action, false, null);
          }
          updateToolbarState();
        });
      });

      editor.addEventListener('keyup', updateToolbarState);
      editor.addEventListener('mouseup', updateToolbarState);

      editor.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !frPanel.classList.contains('hidden')) {
          e.stopPropagation();
          clearFrHighlights();
          frPanel.classList.add('hidden');
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
        }
      });

      frPanel.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          clearFrHighlights();
          frPanel.classList.add('hidden');
          frMatches = [];
          frIndex = -1;
          frFeedback.textContent = '';
          frFind.value = '';
          frReplace.value = '';
        }
      });

      editor.addEventListener('paste', e => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        let cleaned = '';
        if (html) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          tempDiv.querySelectorAll('*').forEach(el => {
            el.removeAttribute('style');
            el.removeAttribute('color');
            el.removeAttribute('face');
            el.removeAttribute('size');
            el.removeAttribute('bgcolor');
            el.removeAttribute('background');
            el.removeAttribute('class');
          });
          tempDiv.querySelectorAll('span').forEach(span => span.replaceWith(...span.childNodes));
          tempDiv.querySelectorAll('font').forEach(font => font.replaceWith(...font.childNodes));
          tempDiv.querySelectorAll('a').forEach(a => a.replaceWith(...a.childNodes));
          cleaned = tempDiv.innerHTML;
        } else {
          cleaned = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        }
        document.execCommand('insertHTML', false, cleaned);
        updateToolbarState();
      });

    return function teardown() {
        if (wrapper.parentNode) {
            wrapper.parentNode.replaceChild(editor, wrapper);
        }
    };
}

export function initDragToScroll() {
    let isDown   = false;
    let moved    = false;
    let startX, startY, scrollEl, initScrollLeft, initScrollTop;

    document.addEventListener('mousedown', e => {
        // Don't hijack drag on text-selectable content
        if (e.target.closest('.block-body, .block-title, .notes-card-description, .quest-objective-text')) return;
        const el = e.target.closest(
            '.pinned-blocks-zone, .results-section, .filter-section, .saving-throws-and-skills-column-wrapper, ' +
            '.session-log-viewer, .roll-results'
        );
        if (!el) return;
        isDown                 = true;
        scrollEl               = el;
        startX                 = e.clientX;
        startY                 = e.clientY;
        initScrollLeft         = el.scrollLeft;
        initScrollTop          = el.scrollTop;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        moved = true;
        scrollEl.scrollLeft = initScrollLeft - dx;
        scrollEl.scrollTop  = initScrollTop  - dy;
    });

    const onUp = () => {
        isDown = false;
        document.body.style.userSelect = '';
    };

    document.addEventListener('mouseup',    onUp);
    document.addEventListener('mouseleave', onUp);

    document.addEventListener('click', e => {
        if (moved) {
            e.stopPropagation();
            e.preventDefault();
            moved = false;
        }
    }, true);
}

export function initScrollFades(selector, topVar, bottomVar, handlerKey, delay = 0) {
    const run = () => {
        document.querySelectorAll(selector).forEach(el => {
            const check = () => {
                const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
                if (topVar) el.style.setProperty(topVar, Math.min(el.scrollTop / 42, 1));
                if (bottomVar) el.style.setProperty(bottomVar, Math.min(distanceFromBottom / 42, 1));
            };
            el.removeEventListener('scroll', el[handlerKey]);
            el[handlerKey] = check;
            el.addEventListener('scroll', check);
            check();
            // Re-check on element size changes (window resize)
            if (!el[handlerKey + '_ro']) {
                el[handlerKey + '_ro'] = new ResizeObserver(check);
                el[handlerKey + '_ro'].observe(el);
            }
            // Re-check on content changes (accordion toggle, blocks added/removed)
            if (!el[handlerKey + '_mo']) {
                let debounce = null;
                el[handlerKey + '_mo'] = new MutationObserver(() => {
                    clearTimeout(debounce);
                    debounce = setTimeout(check, 50);
                    // Also re-check after CSS transitions settle (accordion 0.3s, block 0.5s)
                    setTimeout(check, 350);
                    setTimeout(check, 600);
                });
                el[handlerKey + '_mo'].observe(el, {
                    childList: true, subtree: true,
                    attributes: true, attributeFilter: ['class', 'style']
                });
            }
        });
    };
    delay ? setTimeout(run, delay) : run();
}


export function setupSearchInput(inputEl, clearBtnEl, onInput, onClear) {
    if (!inputEl) return;
    if (clearBtnEl) clearBtnEl.style.opacity = inputEl.value ? '1' : '0';
    inputEl.addEventListener('input', () => {
        if (clearBtnEl) clearBtnEl.style.opacity = inputEl.value ? '1' : '0';
        onInput(inputEl.value);
    });
    clearBtnEl?.addEventListener('click', () => {
        inputEl.value = '';
        if (clearBtnEl) clearBtnEl.style.opacity = '0';
        onClear();
    });
}

/* ==================================================================*/
/* ============================== TABS ==============================*/
/* ==================================================================*/

const getActiveTab = () => {
  return document.querySelector(".tab-button.active")?.dataset.tab || "tab4";
};

/* ==================================================================*/
/* ======================== ACTION BUTTONS ==========================*/
/* ==================================================================*/

export const actionButtonHandlers = (() => {
  const attachActionButtonListeners = () => {

    const activeTab = getActiveTab();
    const tabSuffix = activeTab.replace("tab", "");

    const elements = {
      binButtons: document.querySelectorAll(".bin-button"),
      clearDataOverlay: document.querySelector(".cleardata-overlay"),
      confirmClearButton: document.getElementById("confirm_clear_button"),
    };

    if (elements.binButtons.length > 0 && elements.clearDataOverlay) {
      elements.binButtons.forEach(binButton => {
        binButton.addEventListener("click", () => {
          elements.clearDataOverlay.classList.add("show");
        });
      });
    }

    if (elements.confirmClearButton && elements.clearDataOverlay) {
      elements.confirmClearButton.onclick = () => {
        localStorage.clear();
        alert("All data has been cleared.");
        location.reload();
      };
    }

    console.log("✅ Action button event listeners attached");
  };

  return { attachActionButtonListeners };
})();


export const appManager = (() => {

  // ── Session Log viewer state ─────────────────────────────────────
  let activeSessionLogBlockId = null;
  let sessionViewerEditMode   = false;
  let pendingEditMode         = false;
  let sessionListCollapsed    = localStorage.getItem('sessionListCollapsed') === 'true';

  // ── Block expand/collapse animation ─────────────────────────────
  let pendingBlockAnim = null;

  const setPendingBlockAnim = (blockId, oldHeight) => {
      pendingBlockAnim = { blockId, oldHeight };
  };

const applyPendingBlockAnim = () => {
      if (!pendingBlockAnim) return;
      const { blockId, oldHeight } = pendingBlockAnim;
      pendingBlockAnim = null;

      const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
      if (!blockEl) return;

      const newHeight = blockEl.offsetHeight;
      if (Math.abs(newHeight - oldHeight) < 2) return;

      const isExpanding = newHeight > oldHeight;

      // Apply initial state synchronously — no rAF, so the browser
      // never paints the block at its natural size
      blockEl.style.height = oldHeight + 'px';
      blockEl.style.overflow = 'hidden';
      blockEl.style.transition = 'none';

      // Fade in everything except the header
      const fadeEls = [...blockEl.children].filter(el => !el.classList.contains('block-header'));
      fadeEls.forEach(el => {
          el.style.opacity = '0';
          el.style.transition = 'none';
      });

      // On expand: fade out condensed tags inside the header
      const condensedTags = isExpanding
          ? blockEl.querySelector('.block-tags-condensed')
          : null;
      if (condensedTags) {
          condensedTags.style.opacity = '1';
          condensedTags.style.transition = 'none';
      }

      void blockEl.offsetHeight; // force reflow to commit initial state

      // Now set transition and target — browser animates from initial to target
      blockEl.style.transition = 'height 0.5s ease';
      blockEl.style.height = newHeight + 'px';

      fadeEls.forEach(el => {
          el.style.transition = 'opacity 0.4s ease 0.1s';
          el.style.opacity = '1';
      });

      if (condensedTags) {
          condensedTags.style.transition = 'opacity 0.25s ease';
          condensedTags.style.opacity = '0';
      }

      const cleanup = () => {
          blockEl.style.height = '';
          blockEl.style.overflow = '';
          blockEl.style.transition = '';
          fadeEls.forEach(el => {
              el.style.opacity = '';
              el.style.transition = '';
          });
          if (condensedTags) {
              condensedTags.style.opacity = '';
              condensedTags.style.transition = '';
          }
      };
      blockEl.addEventListener('transitionend', (e) => {
          if (e.target === blockEl && e.propertyName === 'height') cleanup();
      }, { once: true });
      setTimeout(cleanup, 600);
  };

  /* ==================================================================*/
  /* ================ SHARED EDIT/ADD HELPERS =========================*/
  /* ==================================================================*/

  // Wire save/cancel buttons + Ctrl+Enter / Escape keyboard shortcuts.
  // Returns a teardown function to remove the keydown listener.
  const wireEditControls = (container, { saveSel, cancelSel, onSave, onCancel }) => {
      const keyHandler = (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); onSave(); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
      };
      container.querySelector(saveSel)?.addEventListener('click', (e) => { e.stopPropagation(); onSave(); });
      container.querySelector(cancelSel)?.addEventListener('click', (e) => { e.stopPropagation(); onCancel(); });
      container.addEventListener('keydown', keyHandler);
      return () => container.removeEventListener('keydown', keyHandler);
  };

  // Focus an element and place the cursor at the end of its content.
  const focusAndCursorToEnd = (el) => {
      if (!el) return;
      el.focus();
      if (el.textContent) {
          const range = document.createRange();
          const sel   = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
      }
  };

  // Animate a block element from oldHeight to its current height,
  // fading in children except those matching excludeClass.
  const animateHeightTransition = (blockEl, oldHeight, excludeClass = 'block-header') => {
      const newHeight = blockEl.offsetHeight;
      if (!oldHeight || Math.abs(newHeight - oldHeight) < 2) return;
      const fadeEls = [...blockEl.children].filter(el => !el.classList.contains(excludeClass));
      blockEl.style.height = oldHeight + 'px';
      blockEl.style.overflow = 'hidden';
      blockEl.style.transition = 'none';
      fadeEls.forEach(el => { el.style.opacity = '0'; el.style.transition = 'none'; });
      void blockEl.offsetHeight;
      blockEl.style.transition = 'height 0.5s ease';
      blockEl.style.height = newHeight + 'px';
      fadeEls.forEach(el => { el.style.transition = 'opacity 0.4s ease 0.1s'; el.style.opacity = '1'; });
      const cleanup = () => {
          blockEl.style.height = ''; blockEl.style.overflow = ''; blockEl.style.transition = '';
          fadeEls.forEach(el => { el.style.opacity = ''; el.style.transition = ''; });
      };
      blockEl.addEventListener('transitionend', (e) => {
          if (e.target === blockEl && e.propertyName === 'height') cleanup();
      }, { once: true });
      setTimeout(cleanup, 600);
  };

  // Build tag accordion + user tags HTML for tab9 edit/add forms.
  // blockTags = array of currently selected tags (empty for add).
  const buildTab9TagsHTML = (tab, blockTags = []) => {
      const predefinedTagList = Object.entries(categoryTags)
          .filter(([_, data]) => data.tabs.includes(tab))
          .flatMap(([_, data]) => data.tags);

      const userDefinedTags = [
          ...new Set(getBlocks(tab).flatMap(b => b.tags).map(t => t.toLowerCase()))
      ].filter(t => !predefinedTagList.map(pt => pt.toLowerCase()).includes(t))
       .map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
       .sort((a, b) => a.localeCompare(b));

      let html = '';
      Object.entries(categoryTags).forEach(([category, data]) => {
          if (!data.tabs.includes(tab)) return;
          const label = data.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          html += `<div class="tag-accordion-group ${data.className}" data-category="${category}">`;
          html += `<button class="tag-accordion-pill" data-category="${category}">${label}</button>`;
          html += `<div class="tag-accordion-body">`;
          html += `<span class="tag-accordion-label">${label}</span>`;
          html += data.tags.map(t =>
              `<button class="tag-button ${data.className}${blockTags.includes(t) ? ' selected' : ''}" data-tag="${t}">${t}</button>`
          ).join('');
          html += `</div></div>`;
      });

      html += `<div class="tag-category user-tags-edit">`;
      if (userDefinedTags.length > 0) {
          html += userDefinedTags.map(t =>
              `<button class="tag-button tag-user${blockTags.includes(t) ? ' selected' : ''}" data-tag="${t}">${t}</button>`
          ).join('');
      }
      html += `<span class="inline-edit-add-tag"></span>`;
      html += `</div>`;

      return html;
  };

  // Wire all interactive handlers on a tab9 inline edit/add form:
  // tag toggles, block type toggles, property editing, user tag add, uses field.
  const wireTab9FormHandlers = (blockEl, usesKey) => {
      // Uses field
      const usesContainer = blockEl.querySelector('.inline-edit-uses');
      if (usesContainer) initUsesField(usesContainer, usesKey);

      // Tag toggle
      blockEl.querySelector('.inline-edit-tags')?.addEventListener('click', (e) => {
          const btn = e.target.closest('.tag-button');
          if (btn) btn.classList.toggle('selected');
      });

      // Block type toggle
      blockEl.querySelector('.inline-edit-block-types')?.addEventListener('click', (e) => {
          const btn = e.target.closest('.tag-button');
          if (btn) btn.classList.toggle('selected');
      });

      // Properties editing
      const propsContainer = blockEl.querySelector('.inline-edit-properties');
      const newPropBtn = blockEl.querySelector('.inline-edit-new-prop');

      const createPropertyWrap = (text) => {
          const wrap = document.createElement('span');
          wrap.className = 'block-property-wrap';
          wrap.innerHTML = '<span class="block-property" contenteditable="true"></span><span class="property-remove-btn">×</span>';
          if (text) wrap.querySelector('.block-property').textContent = text;
          return wrap;
      };

      if (propsContainer) {
          if (newPropBtn) {
              newPropBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  const wrap = createPropertyWrap('');
                  newPropBtn.before(wrap);
                  wrap.querySelector('.block-property').focus();
              });
          }

          propsContainer.addEventListener('keydown', (e) => {
              const prop = e.target.closest('.block-property');
              if (!prop || prop.classList.contains('inline-edit-new-prop')) return;
              if (e.key === ',' || e.key === 'Enter') {
                  e.preventDefault();
                  const wrap = createPropertyWrap('');
                  prop.closest('.block-property-wrap').after(wrap);
                  wrap.querySelector('.block-property').focus();
              } else if (e.key === 'Backspace' && prop.textContent.trim() === '') {
                  e.preventDefault();
                  const wrap = prop.closest('.block-property-wrap');
                  const prev = wrap?.previousElementSibling;
                  wrap.remove();
                  if (prev) {
                      const prevProp = prev.querySelector?.('.block-property') || prev;
                      const range = document.createRange();
                      const sel = window.getSelection();
                      range.selectNodeContents(prevProp);
                      range.collapse(false);
                      sel.removeAllRanges();
                      sel.addRange(range);
                  }
              }
          });

          propsContainer.addEventListener('focusout', (e) => {
              const prop = e.target.closest('.block-property');
              if (!prop || prop.classList.contains('inline-edit-new-prop')) return;
              if (prop.textContent.trim() === '') prop.closest('.block-property-wrap')?.remove();
          });

          propsContainer.addEventListener('click', (e) => {
              if (e.target.classList.contains('property-remove-btn')) {
                  e.stopPropagation();
                  e.target.closest('.block-property-wrap')?.remove();
              }
          });
      }

      // User tag add button
      const addTagEl = blockEl.querySelector('.inline-edit-add-tag');
      if (addTagEl) {
          addTagEl.addEventListener('click', (e) => {
              e.stopPropagation();
              const input = document.createElement('span');
              input.className = 'inline-edit-tag-input';
              input.contentEditable = 'true';
              Object.assign(input.style, {
                  padding: '4px 10px', fontSize: '13px', borderRadius: '12px',
                  backgroundColor: 'color-mix(in srgb, var(--user-color) 18%, transparent)',
                  color: 'var(--gray-800)', display: 'inline-flex', alignItems: 'center',
                  minWidth: '20px', outline: 'none',
              });
              addTagEl.before(input);
              input.focus();

              const commit = () => {
                  const tagName = input.textContent.trim();
                  if (tagName) {
                      const normalized = tagName.charAt(0).toUpperCase() + tagName.slice(1).toLowerCase();
                      const existing = blockEl.querySelector(`.inline-edit-tags .tag-button[data-tag="${normalized}"]`);
                      if (existing) { existing.classList.add('selected'); }
                      else {
                          const newBtn = document.createElement('button');
                          newBtn.className = 'tag-button tag-user selected';
                          newBtn.dataset.tag = normalized;
                          newBtn.textContent = normalized;
                          input.before(newBtn);
                      }
                  }
                  input.remove();
              };

              input.addEventListener('focusout', commit);
              input.addEventListener('keydown', (ke) => {
                  if (ke.key === 'Enter' || ke.key === ',') { ke.preventDefault(); commit(); }
                  else if (ke.key === 'Escape') { ke.preventDefault(); input.remove(); }
              });
          });
      }

      // Inject chips into collapsed accordion groups with selected tags
      blockEl.querySelectorAll('.inline-edit-tags .tag-accordion-group:not(.open)').forEach(group => {
          const pill = group.querySelector('.tag-accordion-pill');
          const body = group.querySelector('.tag-accordion-body');
          if (!pill || !body) return;
          const tagClass = [...group.classList].find(c => c !== 'tag-accordion-group' && c !== 'open') || '';
          body.querySelectorAll('.tag-button.selected').forEach(btn => {
              const chip = document.createElement('button');
              chip.classList.add('tag-button', 'selected');
              if (tagClass) chip.classList.add(tagClass);
              chip.dataset.tag = btn.dataset.tag;
              chip.textContent = btn.dataset.tag;
              group.appendChild(chip);
          });
      });
  };

  // Validate and collect form data from a tab9 inline edit/add form.
  // Returns null if validation fails (alert shown).
  const collectTab9FormData = (blockEl, usesKey) => {
      const title = blockEl.querySelector('.inline-edit-title')?.textContent.trim();
      if (!title) { alert('A title is required.'); return null; }

      const body = blockEl.querySelector('.inline-edit-body');
      const text = body ? body.innerHTML.trim() : '';
      if (!text) { alert('Title and text are required.'); return null; }

      const selectedTypes = Array.from(blockEl.querySelectorAll('.inline-edit-block-types .tag-button.selected'))
          .map(b => b.dataset.tag);
      if (selectedTypes.length === 0) {
          alert('Please select a block type: ' + blockTypeConfig.tab9.types.join(', ') + '.');
          return null;
      }

      const selectedTags = Array.from(blockEl.querySelectorAll('.inline-edit-tags .tag-button.selected'))
          .map(b => b.dataset.tag.trim().toLowerCase());
      const combinedLower = [...new Set(selectedTags)];
      const predefinedMap = new Map(
          Object.values(categoryTags).flatMap(cat => cat.tags).map(t => [t.toLowerCase(), t])
      );
      const allTags = combinedLower.map(t => predefinedMap.get(t) || normalizeTag(t));

      const usesState = JSON.parse(localStorage.getItem(usesKey) || '[]');
      const properties = Array.from(blockEl.querySelectorAll('.inline-edit-properties .block-property-wrap .block-property'))
          .map(el => el.textContent.trim()).filter(p => p.length > 0);

      localStorage.removeItem(usesKey);

      return { title, text, blockType: selectedTypes, tags: allTags, uses: usesState, properties };
  };

  // Collapse animation: shrink height + fade content simultaneously on the
  const animateBlockCollapse = (blockEl, callback) => {
      const headerEl = blockEl.querySelector('.block-header');
      if (!headerEl) { callback(); return; }

      const oldHeight = blockEl.offsetHeight;
      const cs = getComputedStyle(blockEl);

      // Build condensed tags from selected tags and inject into header
      const selectedTags = blockEl.querySelectorAll('.block-tags .tag-button.selected, .block-tags .tag-button.selected-or');
      let previewContainer = null;
      if (selectedTags.length > 0) {
          previewContainer = document.createElement('div');
          previewContainer.className = 'block-tags block-tags-condensed';
          previewContainer.style.opacity = '0';
          previewContainer.style.transition = 'none';
          previewContainer.style.pointerEvents = 'none';
          selectedTags.forEach(tag => {
              const clone = tag.cloneNode(true);
              clone.style.fontSize = '12px';
              clone.style.padding = '2px 8px';
              previewContainer.appendChild(clone);
          });
          // Insert inside block-header-left (after title/uses) for correct flex positioning
          const headerLeft = headerEl.querySelector('.block-header-left');
          if (headerLeft) headerLeft.appendChild(previewContainer);
          else headerEl.appendChild(previewContainer);
      }

      const targetHeight = headerEl.offsetHeight
          + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
          + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);

      const fadeEls = [...blockEl.children].filter(el => !el.classList.contains('block-header'));

      // Set initial state
      blockEl.style.height = oldHeight + 'px';
      blockEl.style.overflow = 'hidden';
      blockEl.style.transition = 'none';
      fadeEls.forEach(el => { el.style.transition = 'none'; });
      void blockEl.offsetHeight;

      // Animate simultaneously
      blockEl.style.transition = 'height 0.5s ease';
      blockEl.style.height = targetHeight + 'px';
      fadeEls.forEach(el => {
          el.style.transition = 'opacity 0.35s ease';
          el.style.opacity = '0';
      });
      if (previewContainer) {
          previewContainer.style.transition = 'opacity 0.3s ease 0.15s';
          previewContainer.style.opacity = '1';
      }

      setTimeout(() => {
          callback();
      }, 520);
  };

/* ==================================================================*/
/* ============================== TAGS ==============================*/
/* ==================================================================*/

  // updateTags renders tag HTML without any selected-state classes.
  // filterManager._applySelectionClasses() applies those after every render.
  const updateTags = () => {
    const activeTab = getActiveTab();
    const tabSuffix = activeTab.replace("tab", "");

    function injectChipsForCollapsedGroups(container) {
      // Clear stale chips from collapsed accordion groups
      // (selected state re-applied by filterManager._applySelectionClasses)
      container.querySelectorAll('.tag-accordion-group:not(.open) .tag-accordion-chips').forEach(chips => {
        chips.innerHTML = '';
      });
    }

    const usedTags = getTags(activeTab);

    const allPredefined = Object.entries(categoryTags)
      .filter(([_, data]) => data.tabs.includes(activeTab))
      .flatMap(([_, data]) => data.tags);

    const userGeneratedTags = usedTags
      .filter(tag => !allPredefined.includes(tag))
      .sort((a, b) => a.localeCompare(b));

    const fromDOM = [...(document.getElementById(`dynamic_tags_section_${tabSuffix}`)
      ?.querySelectorAll('.tag-accordion-group.open') || [])]
      .map(g => g.dataset.category);
    const fromStorage = JSON.parse(localStorage.getItem(`accordionOpen_${activeTab}`) || '[]');
    const currentlyOpen = new Set(fromDOM.length ? fromDOM : fromStorage);

    let html = "";

    Object.keys(categoryTags).forEach(category => {
      if (!categoryTags[category].tabs.includes(activeTab)) return;
      const usedPredefined = categoryTags[category].tags.filter(tag => usedTags.includes(tag));
      if (usedPredefined.length === 0) return;

      const label     = categoryTags[category].label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const className = categoryTags[category].className;
      const isOpen    = currentlyOpen.has(category);
      const openClass = isOpen ? ' open' : '';

      html += `<div class="tag-accordion-group ${className}${openClass}" data-category="${category}">`;
      html += `<div class="tag-accordion-header" data-category="${category}">`;
      html += `<span class="tag-accordion-name">${label}</span>`;
      html += `<span class="tag-accordion-chips"></span>`;
      html += `<span class="tag-accordion-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg></span>`;
      html += `</div>`;
      html += `<div class="tag-accordion-body" id="${category}_tags_list_${tabSuffix}">`;
      html += `<div class="tag-accordion-body-inner">`;
      html += usedPredefined.map(tag =>
        `<button class="tag-button ${className}" data-tag="${tag}">${tag}</button>`
      ).join("");
      html += `</div></div></div>`;
    });

    if (userGeneratedTags.length > 0) {
      html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}">`;
      html += userGeneratedTags.map(tag =>
        `<button class="tag-button tag-user" data-tag="${tag}">${tag}</button>`
      ).join("");
      html += `</div>`;
    } else {
      html += `<div class="tag-category user-tags" id="user_tags_${tabSuffix}"></div>`;
    }

    const unifiedContainer = document.getElementById(`dynamic_tags_section_${tabSuffix}`);
    if (unifiedContainer) {
      unifiedContainer.innerHTML = html;
      injectChipsForCollapsedGroups(unifiedContainer);
      localStorage.setItem(`accordionOpen_${activeTab}`, JSON.stringify([...currentlyOpen]));
    }

    console.log(`✅ Tags updated for ${activeTab}`);
    document.dispatchEvent(new CustomEvent('tagsUpdated', { detail: { tab: activeTab } }));
  };

  const getTags = (tab = getActiveTab()) => {
    const predefinedTags = new Set(Object.values(categoryTags).flatMap(cat => cat.tags));
    const usedTags = new Set();
    const blocks = getBlocks(tab);
    blocks.forEach(block => {
      block.tags.forEach(tag => {
        if (predefinedTags.has(tag)) {
          usedTags.add(tag);
        } else {
          usedTags.add(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
        }
      });
    });
    return Array.from(usedTags);
  };

  // Toggle filter panel open/closed.
  document.addEventListener('click', e => {
    const button = e.target.closest('.toggle-filter-button, .filter-open-btn');
    if (!button) return;
    const tabId = button.dataset.tab;
    const filterAndResults = button.closest('.filter-and-results')
        || (tabId ? document.getElementById(tabId)?.querySelector('.filter-and-results') : null);
    if (!filterAndResults) return;

    const wrapper = filterAndResults.querySelector('.filter-section-wrapper');
    wrapper?.classList.toggle('filter-panel-closed');

    const isNowClosed = wrapper?.classList.contains('filter-panel-closed');
    if (tabId) localStorage.setItem(`filterVisible_${tabId}`, (!isNowClosed).toString());
  });

  // ── Session Log: toggle list panel ──────────────────────────────
  const toggleSessionList = () => {
      sessionListCollapsed = !sessionListCollapsed;
      localStorage.setItem('sessionListCollapsed', sessionListCollapsed);
      document.querySelector('.session-log-list-column')
          ?.classList.toggle('session-log-list-collapsed', sessionListCollapsed);
  };

  // ── Session Log: generate next auto-title from most recent block ─
  const generateNextSessionTitle = () => {
      const blocks = getBlocks('tab7');
      if (blocks.length === 0) return 'New Session:';
      const lastTitle = blocks[0].title.trim();
      const match = lastTitle.match(/(\d+)/);
      if (!match) return 'New Session:';
      const nextNum  = parseInt(match[1], 10) + 1;
      const before   = lastTitle.slice(0, match.index);
      const after    = lastTitle.slice(match.index + match[1].length);
      const colon    = after.match(/^\s*:/) ? ':' : '';
      return `${before}${nextNum}${colon}`;
  };

  // ── Session Log: save any pending viewer edits to localStorage ───
  const saveCurrentViewerEdits = () => {
      if (!sessionViewerEditMode || !activeSessionLogBlockId) return;
      const viewer  = document.getElementById('session_log_viewer');
      if (!viewer) return;
      const titleEl = viewer.querySelector('.session-viewer-title');
      const bodyEl  = viewer.querySelector('#session_viewer_body');
      if (!titleEl || !bodyEl) return;
      const blocks = getBlocks('tab7');
      const block  = blocks.find(b => b.id === activeSessionLogBlockId);
      if (block) {
          saveBlock(
              'tab7',
              titleEl.textContent.trim() || block.title,
              bodyEl.innerHTML.trim(),
              block.tags,
              [],
              [],
              block.blockType,
              activeSessionLogBlockId
          );
      }
      sessionViewerEditMode = false;
  };

  // ── Session Log: render the viewer panel ─────────────────────────
  const renderSessionViewer = (blockId) => {
      const viewer = document.getElementById('session_log_viewer');
      if (!viewer) return;

      const blocks = getBlocks('tab7');
      const block  = blocks.find(b => b.id === blockId);
      if (!block) return;

      activeSessionLogBlockId = blockId;

      // Highlight active block in list
      document.querySelectorAll('#results_section_7 .block').forEach(b => {
          b.classList.toggle('session-log-active', b.getAttribute('data-id') === blockId);
      });

      const bodyHTML = sanitizeBlockHTML(block.text);

      viewer.innerHTML = `
          <div class="session-viewer-header">
              <button class="session-list-open-btn session-viewer-edit-btn" title="Show list">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 18l6-6-6-6"/>
                  </svg>
              </button>
              <h4 class="session-viewer-title">${block.title}</h4>
              <div class="session-viewer-header-actions">
                  <button class="session-viewer-delete-btn" data-id="${block.id}" title="Delete">×</button>
                  <button class="session-viewer-edit-btn" id="session_edit_toggle" title="Edit">                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 15.5V19h3.5l9.94-9.94-3.5-3.5L4 15.5zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.5 3.5 1.83-1.83z"/>
                      </svg>
                  </button>
              </div>
          </div>
          <div class="session-viewer-body" id="session_viewer_body">${bodyHTML}</div>
      `;

      applyInlineDiceRolls(viewer, 'tab7');

      initScrollFades('#session_log_viewer', '--viewer-fade-top-opacity', '--viewer-fade-bottom-opacity', '_viewerFadeHandler');
      document.dispatchEvent(new CustomEvent('sessionViewerRendered', { detail: { tab: 'tab7' } }));
      const editBtn   = viewer.querySelector('#session_edit_toggle');
      const deleteBtn = viewer.querySelector('.session-viewer-delete-btn');
      const openBtn   = viewer.querySelector('.session-list-open-btn');
      if (openBtn) openBtn.addEventListener('click', toggleSessionList);

      if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const overlay = document.querySelector('.remove-block-overlay');
              if (!overlay) return;
              const confirmBtn = document.getElementById('confirm_remove_button');
              const cancelBtn  = document.getElementById('cancel_remove_button');
              overlay.classList.add('show');

              const onConfirm = () => {
                  sessionViewerEditMode  = false;
                  const removedBlock     = removeBlock(blockId, 'tab7');
                  activeSessionLogBlockId = null;
                  overlay.classList.remove('show');
                  confirmBtn.removeEventListener('click', onConfirm);
                  cancelBtn.removeEventListener('click', onCancel);
                  import('./blockActionsHandler.js').then(({ blockActionsHandler }) => {
                      blockActionsHandler.recordLastDeleted('tab7', removedBlock);
                  });
                  renderSessionLog();
              };
              
              const onCancel = () => {
                  overlay.classList.remove('show');
                  confirmBtn.removeEventListener('click', onConfirm);
                  cancelBtn.removeEventListener('click', onCancel);
              };

              confirmBtn.addEventListener('click', onConfirm);
              cancelBtn.addEventListener('click', onCancel);
          });
      }

      if (pendingEditMode) {
          pendingEditMode = false;
          requestAnimationFrame(() => editBtn.click());
      }

      const titleEl = viewer.querySelector('.session-viewer-title');
      const bodyEl  = viewer.querySelector('#session_viewer_body');
      let snapshot = null;
      let enforceList = null;
      let viewerToolbarTeardown = null;

      const exitSave = () => {
          sessionViewerEditMode   = false;
          editBtn.classList.remove('active');
          if (viewerToolbarTeardown) { viewerToolbarTeardown(); viewerToolbarTeardown = null; }
          titleEl.contentEditable = 'false';
          bodyEl.contentEditable  = 'false';
          titleEl.removeEventListener('keydown', keydownHandler);
          bodyEl.removeEventListener('keydown', keydownHandler);
          if (enforceList) bodyEl.removeEventListener('input', enforceList);

          const newTitle     = titleEl.textContent.trim() || block.title;
          const newText      = bodyEl.innerHTML.trim();
          const latestBlocks = getBlocks('tab7');
          const latestBlock  = latestBlocks.find(b => b.id === blockId);
          if (latestBlock) {
              saveBlock(
                  'tab7', newTitle, newText,
                  latestBlock.tags,
                  [],
                  [],
                  latestBlock.blockType,
                  blockId
              );
          }

        const deleteBtn = viewer.querySelector('.session-viewer-delete-btn');
          if (deleteBtn) {
              deleteBtn.classList.remove('visible');
              setTimeout(() => {
                  applyInlineDiceRolls(viewer, 'tab7');
                  import('./filterManager.js').then(({ filterManager }) => {
                      filterManager.applyFilters('7');
                  });
              }, 200);
          } else {
              applyInlineDiceRolls(viewer, 'tab7');
              import('./filterManager.js').then(({ filterManager }) => {
                  filterManager.applyFilters('7');
              });
          }
      };

      const exitDiscard = () => {
          sessionViewerEditMode   = false;
          editBtn.classList.remove('active');
          titleEl.contentEditable = 'false';
          bodyEl.contentEditable  = 'false';
          titleEl.removeEventListener('keydown', keydownHandler);
          bodyEl.removeEventListener('keydown', keydownHandler);
          if (enforceList) bodyEl.removeEventListener('input', enforceList);
          if (viewerToolbarTeardown) { viewerToolbarTeardown(); viewerToolbarTeardown = null; }

          if (snapshot) {
              titleEl.textContent = snapshot.title;
              bodyEl.innerHTML    = snapshot.body;
          }

          const deleteBtn = viewer.querySelector('.session-viewer-delete-btn');
          if (deleteBtn) {
              deleteBtn.classList.remove('visible');
              setTimeout(() => {
                  applyInlineDiceRolls(viewer, 'tab7');
              }, 200);
          } else {
              applyInlineDiceRolls(viewer, 'tab7');
          }
      };

      let lastEscapeTime = 0;
      const keydownHandler = (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              e.stopPropagation();
              exitSave();
          } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              const now = Date.now();
              if (now - lastEscapeTime < 400) {
                  lastEscapeTime = 0;
                  exitDiscard();
              } else {
                  lastEscapeTime = now;
              }
          }
      };

      editBtn.addEventListener('click', () => {
          if (!sessionViewerEditMode) {
              // ── Enter edit mode ──────────────────────────────────
              sessionViewerEditMode = true;
              editBtn.classList.add('active');

              snapshot = {
                  title: titleEl.textContent,
                  body:  bodyEl.innerHTML,
              };

              // Strip inline dice buttons back to plain text
              bodyEl.querySelectorAll('.inline-dice-roll').forEach(btn => {
                  btn.replaceWith(document.createTextNode(btn.title));
              });
              bodyEl.normalize();

              titleEl.contentEditable = 'true';
              bodyEl.contentEditable  = 'true';

              titleEl.addEventListener('keydown', keydownHandler);
              bodyEl.addEventListener('keydown', keydownHandler);

              enforceList = () => {
                  if (!bodyEl.querySelector('ul, ol')) {
                      bodyEl.innerHTML = '<ul><li></li></ul>';
                      const li = bodyEl.querySelector('li');
                      if (li) {
                          const range = document.createRange();
                          const sel   = window.getSelection();
                          range.selectNodeContents(li);
                          range.collapse(false);
                          sel.removeAllRanges();
                          sel.addRange(range);
                      }
                  }
              };
              bodyEl.addEventListener('input', enforceList);
              viewerToolbarTeardown = initToolbarForEditor(bodyEl);

              viewer.querySelector('.session-viewer-delete-btn')?.classList.add('visible');

              titleEl.focus();

              const range = document.createRange();
              const sel   = window.getSelection();
              range.selectNodeContents(titleEl);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);

          } else {
              exitSave();
          }
      });
  };

  // ── Session Log: render the condensed block list ─────────────────
  const renderSessionLog = (filteredBlocks = null) => {
      // Auto-save any in-progress viewer edit before re-rendering
      if (sessionViewerEditMode) saveCurrentViewerEdits();

      const resultsSection = document.getElementById('results_section_7');
      if (!resultsSection) return;

      const allBlocks     = getBlocks('tab7');
      const displayBlocks = filteredBlocks || allBlocks;

      resultsSection.innerHTML = '';

      document.querySelector('.session-log-list-column')
          ?.classList.toggle('session-log-list-collapsed', sessionListCollapsed);
      const closeBtn = document.getElementById('session_list_toggle');
      if (closeBtn) {
          closeBtn.classList.toggle('hidden', sessionListCollapsed);
          closeBtn.onclick = toggleSessionList;
      }

  const addBtn = document.getElementById('add_block_button_7');
      if (addBtn) {
          addBtn.onclick = () => {
              // Save any in-progress edits to the CURRENT block before switching
              if (sessionViewerEditMode) {
                  saveCurrentViewerEdits();
                  sessionViewerEditMode = false;
              }
              const newBlock = {
                  id:         crypto.randomUUID(),
                  title:      generateNextSessionTitle(),
                  text:       '<ul><li><br></li></ul>',
                  tags:       [],
                  uses:       [],
                  properties: [],
                  blockType:  null,
                  timestamp:  Date.now(),
                  viewState:  'expanded'
              };
              const stored = JSON.parse(localStorage.getItem('userBlocks_tab7') || '[]');
              stored.unshift(newBlock);
              localStorage.setItem('userBlocks_tab7', JSON.stringify(stored));
              pendingEditMode         = true;
              activeSessionLogBlockId = newBlock.id;
              renderSessionLog();
          };
      }

      if (displayBlocks.length === 0) {
          const p = document.createElement('p');
          p.classList.add('results-placeholder');
          p.textContent = 'Use the + button to add session logs here…';
          p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
          resultsSection.appendChild(p);
      } else {
          const pinnedBlocks = displayBlocks.filter(b => b.pinned);
          const normalBlocks = displayBlocks.filter(b => !b.pinned);

          if (pinnedBlocks.length > 0) {
              const pinnedHTML = pinnedBlocks
                  .map(b => blockTemplate({ ...b, viewState: 'session-log', uses: null }, 'tab7'))
                  .join('');
              resultsSection.insertAdjacentHTML('beforeend',
                  `<div class="pinned-blocks-zone-wrapper"><div class="pinned-blocks-zone">${pinnedHTML}</div></div>`);
          }

          normalBlocks.forEach(block => {
              resultsSection.insertAdjacentHTML('beforeend',
                  blockTemplate({ ...block, viewState: 'session-log', uses: null }, 'tab7'));
          });
      }

      // Wire click-to-view on every block
      resultsSection.querySelectorAll('.block:not(.permanent-block)').forEach(blockEl => {
          blockEl.addEventListener('click', function(e) {
              if (e.target.closest('.block-actions')  ||
                  e.target.closest('.actions-trigger') ||
                  e.target.closest('.pin-button')) return;

              const clickedId = blockEl.getAttribute('data-id');
              // Already editing this same block — do nothing
              if (clickedId === activeSessionLogBlockId && sessionViewerEditMode) return;

              if (sessionViewerEditMode) {
                  const prevId = activeSessionLogBlockId;
                  saveCurrentViewerEdits();
                  const listTitle = resultsSection.querySelector(
                      `.block[data-id="${prevId}"] .block-title h4`
                  );
                  if (listTitle) {
                      const fresh = getBlocks('tab7').find(b => b.id === prevId);
                      if (fresh) listTitle.textContent = fresh.title;
                  }
              }

              renderSessionViewer(clickedId);
          });
      });

      // Show viewer: keep the current block if it's still in the list,
      // otherwise fall back to the newest (first) block.
      const viewer = document.getElementById('session_log_viewer');
      if (displayBlocks.length > 0) {
          const idToShow = (activeSessionLogBlockId &&
              displayBlocks.find(b => b.id === activeSessionLogBlockId))
              ? activeSessionLogBlockId
              : displayBlocks[0].id;
          renderSessionViewer(idToShow);
      } else if (viewer) {
          viewer.innerHTML = '<p class="session-viewer-placeholder">No entries found</p>';
      }

      updateTags();
      attachDynamicTooltips();
      document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: 'tab7' } }));
  };

/* ==================================================================*/
/* ======================= INVENTORY RENDER =========================*/
/* ==================================================================*/

  const INVENTORY_SECTION_ORDER = [
      "Consumables",
      "Weapons",
      "Armor & clothing",
      "Magic & curiosities",
      "Tools",
      "Scrap & parts",
      "Keys",
      "Documents"
  ];

  // Which item types auto-check "equipable" in the overlay
  const INVENTORY_AUTO_EQUIPABLE_TYPES = new Set(["Weapons", "Armor & clothing"]);

  // Currently-active block in the viewer
  let activeInventoryBlockId = null;
  let inventoryEditMode = false;

  const getInventoryAttunementMax = () => {
      const raw = localStorage.getItem('tab6_attunement_max');
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 3;
  };

  const setInventoryAttunementMax = (n) => {
      const v = Math.max(0, parseInt(n, 10) || 0);
      localStorage.setItem('tab6_attunement_max', String(v));
  };

  // Toggle attuned state. Safety: can only be true if requiresAttunement.
  const toggleInventoryAttuned = (blockId) => {
      const blocks = getBlocks('tab6');
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return;
      if (!blocks[idx].requiresAttunement) return;
      blocks[idx].attuned = !blocks[idx].attuned;
      localStorage.setItem('userBlocks_tab6', JSON.stringify(blocks));
      import('./filterManager.js').then(({ filterManager }) => {
          filterManager.applyFilters('6');
      });
  };

  // External setter used by duplicate-block flow to auto-select the copy
  const setActiveInventoryBlock = (id) => { activeInventoryBlockId = id; };

  // Toggle equipped state. Safety: can only be true if equipable.
  const toggleInventoryEquipped = (blockId) => {
      const blocks = getBlocks('tab6');
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return;
      if (!blocks[idx].equipable) return;
      blocks[idx].equipped = !blocks[idx].equipped;
      localStorage.setItem('userBlocks_tab6', JSON.stringify(blocks));
      import('./filterManager.js').then(({ filterManager }) => {
          filterManager.applyFilters('6');
      });
  };

  const isInventorySectionCollapsed = (key) =>
      localStorage.getItem(`tab6_section_collapsed_${key}`) === 'true';

  const setInventorySectionCollapsed = (key, collapsed) =>
      localStorage.setItem(`tab6_section_collapsed_${key}`, collapsed ? 'true' : 'false');

  const buildInventorySectionHeader = (title, count, key) => {
      const collapsed = isInventorySectionCollapsed(key);
      return `
          <div class="inventory-section-header${collapsed ? ' inventory-collapsed' : ''}" data-section-key="${key}">
              <div class="inventory-section-left">
                  <h3 class="inventory-section-title">${title}</h3>
                  <span class="inventory-section-count">${count}</span>
              </div>
          </div>
      `;
  };

  const buildInventorySubLabel = (label, key) => {
      const collapsed = isInventorySectionCollapsed(key);
      return `<p class="inventory-sub-label${collapsed ? ' inventory-collapsed' : ''}" data-section-key="${key}">${label}</p>`;
  };

  // Each rendered inventory block is always minimized, clickable into viewer.
  const renderInventoryBlock = (block) => {
      const activeClass   = (block.id === activeInventoryBlockId) ? ' inventory-block-active' : '';
      const equippedClass = (block.equipped === true) ? ' inventory-block-equipped' : '';
      const attunedClass  = (block.attuned === true)  ? ' inventory-block-attuned'  : '';
      const html = blockTemplate({ ...block, viewState: 'minimized' }, 'tab6');
      return html.replace(
          /<div class="block ([^"]+)" data-id="([^"]+)">/,
          `<div class="block $1${activeClass}${equippedClass}${attunedClass}" data-id="$2">`
      );
  };

  const renderInventoryViewer = (blockId) => {
      const viewer = document.getElementById('inventory_viewer');
      if (!viewer) return;

      if (!blockId) {
          viewer.innerHTML = '<p class="inventory-viewer-placeholder">Select an item to view</p>';
          return;
      }

      const blocks = getBlocks('tab6');
      const block  = blocks.find(b => b.id === blockId);
      if (!block) {
          viewer.innerHTML = '<p class="inventory-viewer-placeholder">Select an item to view</p>';
          return;
      }

      activeInventoryBlockId = blockId;

      const bodyHTML = sanitizeBlockHTML(block.text);

      const usesHTML = (block.uses && block.uses.length > 0)
          ? `<div class="block-uses" style="margin-bottom:12px;">${block.uses.map((state, idx) =>
              `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
            ).join("")}</div>`
          : "";

      const newContentHTML = `
          <div class="inventory-viewer-content">
              <div class="inventory-viewer-header">
                  <h4 class="inventory-viewer-title">${block.title}</h4>
                  <div class="block-actions">
                      <div class="block-actions-menu">
                          <div class="block-actions-reveal">
                              <button class="action-button remove-button red-button" data-id="${block.id}" title="Remove">×</button>
                              <button class="action-button duplicate-button blue-button" data-id="${block.id}" title="Copy">❐</button>
                              <button class="action-button edit-button orange-button" data-id="${block.id}" title="Edit">✎</button>
                          </div>
                          <button class="actions-trigger" title="Actions">···</button>
                      </div>
                  </div>
              </div>
              ${usesHTML}
              <div class="inventory-viewer-body">${bodyHTML}</div>
          </div>
      `;

      // If there's existing content, fade it out, then swap; otherwise just swap
      const existing = viewer.querySelector('.inventory-viewer-content, .inventory-viewer-placeholder');
      const doSwap = () => {
          viewer.innerHTML = newContentHTML;
          // Force reflow so the new content's 0 → 1 transition fires
          const fresh = viewer.querySelector('.inventory-viewer-content');
          if (fresh) {
              fresh.style.opacity = '0';
              void fresh.offsetWidth;
              fresh.style.opacity = '';
          }
          applyInlineDiceRolls(viewer, 'tab6');
          document.querySelectorAll('#results_section_6 .block').forEach(b => {
              b.classList.toggle('inventory-block-active', b.getAttribute('data-id') === blockId);
          });
      };
      if (existing && existing.classList.contains('inventory-viewer-content')) {
          existing.classList.add('fading');
          setTimeout(doSwap, 200);
      } else {
          doSwap();
      }
      return;

  };

  // ── Inventory viewer: in-place edit / add ─────────────────────────

  const buildInventoryInserts = (block) => {
      const reqAtt   = block?.requiresAttunement === true;
      const equipable = block?.equipable === true;
      const attuned  = block?.attuned === true;
      const equipped = block?.equipped === true;

      const chainSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/></svg>`;
      const handSVG  = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.5c-.83 0-1.5.67-1.5 1.5v6H10V4c0-.83-.67-1.5-1.5-1.5S7 3.17 7 4v8.5l-1.8-1.9c-.6-.6-1.55-.6-2.15 0-.6.6-.6 1.55 0 2.15l4.2 4.3c1.3 1.35 3.1 2.2 5.1 2.2h1.4c3.87 0 7-3.13 7-7V7c0-.83-.67-1.5-1.5-1.5S18 6.17 18 7v3.5h-.5V5c0-.83-.67-1.5-1.5-1.5S14.5 4.17 14.5 5v4.5h-.5V3c0-.83-.67-1.5-1.5-1.5z"/></svg>`;

      const currentType = block
          ? (Array.isArray(block.blockType) ? block.blockType[0] : block.blockType) || ''
          : '';

      const tabBTConfig = blockTypeConfig.tab6;
      const blockTypeHTML = `<div class="inline-edit-block-types">${tabBTConfig.types.map(type =>
          `<button class="tag-button ${tabBTConfig.className}${type === currentType ? ' selected' : ''}" data-tag="${type}">${type}</button>`
      ).join('')}</div>`;

      const togglesHTML = `
          <div class="inventory-edit-toggles">
              <div class="inventory-toggle-pair">
                  <label class="inv-toggle inv-toggle-attune">
                      <input type="checkbox" id="requires_attunement_viewer"${reqAtt ? ' checked' : ''} />
                      <span class="inv-track"><span class="inv-thumb"></span></span>
                      <span>Requires attunement</span>
                  </label>
                  <button type="button" class="inv-state-btn inv-state-chain" id="attuned_btn_viewer" data-on="${attuned}" title="Attune">
                      ${chainSVG}<span>Attuned to</span>
                  </button>
              </div>
              <div class="inventory-toggle-pair">
                  <label class="inv-toggle inv-toggle-equip">
                      <input type="checkbox" id="equipable_viewer"${equipable ? ' checked' : ''} />
                      <span class="inv-track"><span class="inv-thumb"></span></span>
                      <span>Equipable</span>
                  </label>
                  <button type="button" class="inv-state-btn inv-state-hand" id="equipped_btn_viewer" data-on="${equipped}" title="Equip">
                      ${handSVG}<span>Equipped</span>
                  </button>
              </div>
          </div>
      `;

      return { blockTypeHTML, togglesHTML };
  };

  const wireInventoryToggles = (container) => {
      const requiresEl  = container.querySelector('#requires_attunement_viewer');
      const equipableEl = container.querySelector('#equipable_viewer');
      const attunedBtn  = container.querySelector('#attuned_btn_viewer');
      const equippedBtn = container.querySelector('#equipped_btn_viewer');
      const blockTypesContainer = container.querySelector('.inline-edit-block-types');

      const syncStateButtons = () => {
          if (attunedBtn)  attunedBtn.classList.toggle('inv-state-on',  attunedBtn.dataset.on === 'true');
          if (equippedBtn) equippedBtn.classList.toggle('inv-state-on', equippedBtn.dataset.on === 'true');
      };
      syncStateButtons();

      if (requiresEl) {
          requiresEl.addEventListener('change', () => {
              if (!requiresEl.checked && attunedBtn) attunedBtn.dataset.on = 'false';
              syncStateButtons();
          });
      }
      if (equipableEl) {
          equipableEl.addEventListener('change', () => {
              if (!equipableEl.checked && equippedBtn) equippedBtn.dataset.on = 'false';
              equipableEl.dataset.userTouched = 'true';
              syncStateButtons();
          });
      }
      if (attunedBtn) {
          attunedBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const turningOn = attunedBtn.dataset.on !== 'true';
              attunedBtn.dataset.on = turningOn ? 'true' : 'false';
              if (turningOn && requiresEl && !requiresEl.checked) {
                  requiresEl.checked = true;
                  requiresEl.dispatchEvent(new Event('change'));
              }
              syncStateButtons();
          });
      }
      if (equippedBtn) {
          equippedBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const turningOn = equippedBtn.dataset.on !== 'true';
              equippedBtn.dataset.on = turningOn ? 'true' : 'false';
              if (turningOn && equipableEl && !equipableEl.checked) {
                  equipableEl.checked = true;
                  equipableEl.dispatchEvent(new Event('change'));
              }
              syncStateButtons();
          });
      }

      // Block type tag buttons (single-select) + auto-equipable
      if (blockTypesContainer) {
          blockTypesContainer.addEventListener('click', (e) => {
              const btn = e.target.closest('.tag-button');
              if (!btn) return;
              const wasSel = btn.classList.contains('selected');
              blockTypesContainer.querySelectorAll('.tag-button').forEach(b => b.classList.remove('selected'));
              if (!wasSel) btn.classList.add('selected');
              // Auto-equipable logic
              if (equipableEl && equipableEl.dataset.userTouched !== 'true') {
                  const sel = blockTypesContainer.querySelector('.tag-button.selected');
                  if (sel && INVENTORY_AUTO_EQUIPABLE_TYPES.has(sel.dataset.tag)) {
                      equipableEl.checked = true;
                      equipableEl.dispatchEvent(new Event('change'));
                      equipableEl.dataset.userTouched = '';
                  } else if (sel) {
                      equipableEl.checked = false;
                      equipableEl.dispatchEvent(new Event('change'));
                      equipableEl.dataset.userTouched = '';
                  }
              }
          });
      }
  };

  const collectInventoryFormData = (viewer) => {
      const titleEl    = viewer.querySelector('.inventory-viewer-title');
      const bodyEl     = viewer.querySelector('.inventory-viewer-body');

      const newTitle = titleEl?.textContent.trim();
      if (!newTitle) { alert('A title is required.'); return null; }

      const selectedTypeBtn = viewer.querySelector('.inline-edit-block-types .tag-button.selected');
      const blockType = selectedTypeBtn?.dataset.tag || null;
      if (!blockType) {
          alert('Please select an item type: ' + blockTypeConfig.tab6.types.join(', ') + '.');
          return null;
      }

      const newBody = bodyEl ? bodyEl.innerHTML.trim() : '';

      const requiresAttunement = !!viewer.querySelector('#requires_attunement_viewer')?.checked;
      const equipable          = !!viewer.querySelector('#equipable_viewer')?.checked;
      const attuned            = viewer.querySelector('#attuned_btn_viewer')?.dataset.on === 'true';
      const equipped           = viewer.querySelector('#equipped_btn_viewer')?.dataset.on === 'true';

      return {
          title: newTitle,
          text: newBody,
          blockType,
          inventoryExtras: {
              requiresAttunement,
              equipable,
              attuned:  requiresAttunement ? attuned  : false,
              equipped: equipable          ? equipped : false
          }
      };
  };

  const enterInventoryEdit = (blockId) => {
      if (inventoryEditMode) return;
      const viewer = document.getElementById('inventory_viewer');
      if (!viewer) return;

      const blocks = getBlocks('tab6');
      const block  = blocks.find(b => b.id === blockId);
      if (!block) return;

      inventoryEditMode = true;
      activeInventoryBlockId = blockId;

      const content = viewer.querySelector('.inventory-viewer-content');
      if (!content) {
          // No content yet — render viewer first, then re-enter
          inventoryEditMode = false;
          renderInventoryViewer(blockId);
          requestAnimationFrame(() => enterInventoryEdit(blockId));
          return;
      }

      viewer.classList.add('editing');

      // ── Remove action buttons ──
      const actionsEl = content.querySelector('.block-actions');
      if (actionsEl) actionsEl.remove();

      // ── Remove properties display ──
      const propsEl = content.querySelector('.inventory-viewer-properties');
      if (propsEl) propsEl.remove();

      // ── Make title editable ──
      const titleEl = content.querySelector('.inventory-viewer-title');
      if (titleEl) titleEl.contentEditable = 'true';

      // ── Make body editable + strip dice rolls ──
      const bodyEl = content.querySelector('.inventory-viewer-body');
      if (bodyEl) {
          bodyEl.querySelectorAll('.inline-dice-roll').forEach(btn => {
              btn.replaceWith(document.createTextNode(btn.title));
          });
          bodyEl.normalize();
          bodyEl.contentEditable = 'true';
      }

      // ── Replace uses with editable uses field ──
      const usesKey = `inventory_viewer_uses_${blockId}`;
      localStorage.setItem(usesKey, JSON.stringify(block.uses || []));
      const existingUses = content.querySelector('.block-uses');
      const usesField = document.createElement('div');
      usesField.className = 'uses-field inline-edit-uses';
      usesField.style.marginBottom = '12px';
      if (existingUses) {
          existingUses.replaceWith(usesField);
      } else {
          // Insert before body if no uses existed
          if (bodyEl) bodyEl.before(usesField);
      }
      initUsesField(usesField, usesKey);

      // ── Insert save/cancel into header ──
      const headerEl = content.querySelector('.inventory-viewer-header');
      const controls = document.createElement('div');
      controls.className = 'inline-edit-controls inventory-edit-fade-in';
      controls.innerHTML = `
          <button class="button green-button inventory-edit-save">Save</button>
          <button class="button red-button inventory-edit-cancel">Cancel</button>
      `;
      headerEl.appendChild(controls);

      // ── Insert block type buttons + toggles after header ──
      const { blockTypeHTML, togglesHTML } = buildInventoryInserts(block);

      const insertWrapper = document.createElement('div');
      insertWrapper.className = 'inventory-edit-inserts inventory-edit-fade-in';
      insertWrapper.innerHTML = blockTypeHTML + togglesHTML;
      headerEl.after(insertWrapper);

      // ── Animate new elements in ──
      requestAnimationFrame(() => {
          content.querySelectorAll('.inventory-edit-fade-in').forEach(el => {
              el.classList.add('visible');
          });
      });

      // ── Wire toggle / block type handlers ──
      wireInventoryToggles(content);

      // ── Highlight active block in list ──
      document.querySelectorAll('#results_section_6 .block').forEach(b => {
          b.classList.toggle('inventory-block-active', b.getAttribute('data-id') === blockId);
      });

      // ── Save / Cancel ──
      let removeKeyHandler;
      const doSave = () => {
          const data = collectInventoryFormData(viewer);
          if (!data) return;
          removeKeyHandler();
          const usesState = JSON.parse(localStorage.getItem(usesKey) || '[]');
          localStorage.removeItem(usesKey);
          const latestBlock = getBlocks('tab6').find(b => b.id === blockId);
          saveBlock('tab6', data.title, data.text, latestBlock?.tags || [], usesState, [], data.blockType, blockId, block.timestamp, data.inventoryExtras);
          inventoryEditMode = false;
          viewer.classList.remove('editing');
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('6'));
      };

      const doCancel = () => {
          removeKeyHandler();
          localStorage.removeItem(usesKey);
          inventoryEditMode = false;
          viewer.classList.remove('editing');
          renderInventoryViewer(blockId);
      };

      removeKeyHandler = wireEditControls(viewer, {
          saveSel: '.inventory-edit-save', cancelSel: '.inventory-edit-cancel',
          onSave: doSave, onCancel: doCancel,
      });

      focusAndCursorToEnd(titleEl);
  };

  const startInventoryAdd = () => {
      if (inventoryEditMode) return;
      const viewer = document.getElementById('inventory_viewer');
      if (!viewer) return;

      inventoryEditMode = true;

      const { blockTypeHTML, togglesHTML } = buildInventoryInserts(null);

      const usesKey = 'inventory_viewer_uses_new';
      localStorage.setItem(usesKey, JSON.stringify([]));

      const formHTML = `
          <div class="inventory-viewer-content">
              <div class="inventory-viewer-header">
                  <h4 contenteditable="true" class="inventory-viewer-title inline-edit-title"></h4>
                  <div class="inline-edit-controls">
                      <button class="button green-button inventory-edit-save">Save</button>
                      <button class="button red-button inventory-edit-cancel">Cancel</button>
                  </div>
              </div>
              <div class="inventory-edit-inserts">
                  ${blockTypeHTML}
                  ${togglesHTML}
              </div>
              <div class="uses-field inline-edit-uses"></div>
              <div class="inventory-viewer-body" contenteditable="true"></div>
          </div>
      `;

      const existing = viewer.querySelector('.inventory-viewer-content, .inventory-viewer-placeholder');
      const doSwap = () => {
          viewer.innerHTML = formHTML;
          viewer.classList.add('editing');
          const fresh = viewer.querySelector('.inventory-viewer-content');
          if (fresh) { fresh.style.opacity = '0'; void fresh.offsetWidth; fresh.style.opacity = ''; }

          // Uses field
          const usesContainer = viewer.querySelector('.inline-edit-uses');
          if (usesContainer) {
              initUsesField(usesContainer, usesKey);
          }

          wireInventoryToggles(viewer);

          let removeKeyHandler;
          const doSave = () => {
              const data = collectInventoryFormData(viewer);
              if (!data) return;
              removeKeyHandler();
              const usesState = JSON.parse(localStorage.getItem(usesKey) || '[]');
              localStorage.removeItem(usesKey);
              const newId = saveBlock('tab6', data.title, data.text, [], usesState, [], data.blockType, null, null, data.inventoryExtras);
              inventoryEditMode = false;
              viewer.classList.remove('editing');
              if (typeof newId === 'string') activeInventoryBlockId = newId;
              import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('6'));
          };

          const doCancel = () => {
              removeKeyHandler();
              localStorage.removeItem(usesKey);
              inventoryEditMode = false;
              viewer.classList.remove('editing');
              if (activeInventoryBlockId) {
                  renderInventoryViewer(activeInventoryBlockId);
              } else {
                  viewer.innerHTML = '<p class="inventory-viewer-placeholder">Select an item to view</p>';
              }
          };

          removeKeyHandler = wireEditControls(viewer, {
              saveSel: '.inventory-edit-save', cancelSel: '.inventory-edit-cancel',
              onSave: doSave, onCancel: doCancel,
          });

          const titleEl = viewer.querySelector('.inline-edit-title');
          if (titleEl) titleEl.focus();
      };

      if (existing && existing.classList.contains('inventory-viewer-content')) {
          existing.classList.add('fading');
          setTimeout(doSwap, 200);
      } else {
          doSwap();
      }
  };

  const renderInventory = (filteredBlocks = null) => {
      const resultsSection = document.getElementById('results_section_6');
      if (!resultsSection) return;

      const allBlocks     = getBlocks('tab6');
      const displayBlocks = filteredBlocks || allBlocks;

      const attunedCount = allBlocks.filter(b => b.attuned === true).length;
      const attunedMax   = getInventoryAttunementMax();
      const overAttuned  = attunedCount > attunedMax;

      // Coin pouches
      const pouches = [
          { id: 'perm1', cls: 'gold-bg',   defaultValue: '00' },
          { id: 'perm2', cls: 'silver-bg', defaultValue: '00' },
          { id: 'perm3', cls: 'copper-bg', defaultValue: '00' },
      ];
      const pouchesHTML = pouches.map(({ id, cls, defaultValue }) => {
          const v = localStorage.getItem(`permanentItem_${id}`) || defaultValue;
          return `<div class="block minimized permanent-block ${cls}" data-id="${id}"><h4 class="permanent-title" contenteditable="true">${v}</h4></div>`;
      }).join('');

      const chainSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/></svg>`;
      const attunePillHTML = `
          <div class="inventory-attune-wrap">
              <span class="inventory-attune-label">Attuned</span>
              <span class="inventory-attune-pill${overAttuned ? ' over' : ''}">
                  ${chainSVG}
                  <span class="inventory-attune-current">${attunedCount}</span>
                  <span class="inventory-attune-sep">/</span>
                  <span class="inventory-attune-max" contenteditable="true" data-storage-key="tab6_attunement_max">${attunedMax}</span>
              </span>
          </div>
      `;

      // Results section layout: search row + sort/add controls + top bar + sections
      resultsSection.innerHTML = `
          <div class="inventory-search-row">
              <div class="search-container">
                  <input id="search_input_6" class="search_input" type="text" placeholder="Search..." />
                  <button id="clear_search_button_6" class="clear-search">
                      <svg class="clear-icon" viewBox="0 0 24 24" fill="none">
                          <line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round"/>
                      </svg>
                  </button>
              </div>
              <button id="results-sort-btn_6" class="results-settings">
                  <img src="./images/Sort_Icon.svg" alt="Sort icon">
              </button>
              <div id="sort-dropdown_6" class="sort-dropdown hidden">
                  <button class="sort-item" data-sort="newest">Newest</button>
                  <button class="sort-item" data-sort="oldest">Oldest</button>
                  <button class="sort-item" data-sort="alpha">A‑Z</button>
                  <button class="sort-item" data-sort="unalpha">Z-A</button>
              </div>
              <button id="add_block_button" class="add-block-button green-button">+</button>
          </div>
          <div class="inventory-top-bar">
              <div class="inventory-pouches">${pouchesHTML}</div>
              ${attunePillHTML}
          </div>
          <div id="inventory-sections-host"></div>
      `;

      const host = document.getElementById('inventory-sections-host');

      // Equipped / Attuned section (top) — grouped by Item Type in the same
      // order as the main sections below
      const topSectionBlocks = displayBlocks.filter(b => b.equipped === true || b.attuned === true);
      if (topSectionBlocks.length > 0) {
          const sortedTopBlocks = [];
          INVENTORY_SECTION_ORDER.forEach(typeName => {
              topSectionBlocks
                  .filter(b => b.blockType === typeName)
                  .forEach(b => sortedTopBlocks.push(b));
          });
          // Any unrecognised types go at the end, preserving input order
          topSectionBlocks
              .filter(b => !INVENTORY_SECTION_ORDER.includes(b.blockType))
              .forEach(b => sortedTopBlocks.push(b));

          const topKey = 'equipped-attuned';
          host.insertAdjacentHTML('beforeend', buildInventorySubLabel('Equipped / Attuned', topKey));
          const row = document.createElement('div');
          row.className = 'inventory-row';
          if (isInventorySectionCollapsed(topKey)) row.classList.add('inventory-collapsed');
          row.dataset.sectionKey = topKey;
          row.innerHTML = `<div class="inventory-row-inner">${sortedTopBlocks.map(b => renderInventoryBlock(b)).join('')}</div>`;
          host.appendChild(row);
      }

      // Item Type sections
      INVENTORY_SECTION_ORDER.forEach(typeName => {
          const typeBlocks = displayBlocks.filter(b => b.blockType === typeName);
          if (typeBlocks.length === 0) return;
          const key = typeName;
          host.insertAdjacentHTML('beforeend', buildInventorySectionHeader(typeName, typeBlocks.length, key));
          const row = document.createElement('div');
          row.className = 'inventory-row';
          if (isInventorySectionCollapsed(key)) row.classList.add('inventory-collapsed');
          row.dataset.sectionKey = key;
          row.innerHTML = `<div class="inventory-row-inner">${typeBlocks.map(b => renderInventoryBlock(b)).join('')}</div>`;
          host.appendChild(row);
      });

      const uncategorised = displayBlocks.filter(b =>
          !INVENTORY_SECTION_ORDER.includes(b.blockType)
      );
      if (uncategorised.length > 0) {
          const uncatKey = 'uncategorised';
          host.insertAdjacentHTML('beforeend', buildInventorySectionHeader('Uncategorised', uncategorised.length, uncatKey));
          const row = document.createElement('div');
          row.className = 'inventory-row';
          if (isInventorySectionCollapsed(uncatKey)) row.classList.add('inventory-collapsed');
          row.dataset.sectionKey = uncatKey;
          row.innerHTML = `<div class="inventory-row-inner">${uncategorised.map(b => renderInventoryBlock(b)).join('')}</div>`;
          host.appendChild(row);
      }

      if (displayBlocks.length === 0) {
          const p = document.createElement('p');
          p.classList.add('results-placeholder');
          p.textContent = 'Use the + button to add items here…';
          p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
          resultsSection.appendChild(p);
      }

      wireInventoryHeaderControls();

      // Wire search input — preserve value/focus/caret across re-renders
      const searchInput = document.getElementById('search_input_6');
      const clearSearchBtn = document.getElementById('clear_search_button_6');
      if (searchInput) {
          // Restore previous value if this is a re-render during typing
          const preservedValue = window._inventorySearchState?.value || '';
          const hadFocus = window._inventorySearchState?.hadFocus || false;
          const caretPos = window._inventorySearchState?.caretPos ?? preservedValue.length;
          if (preservedValue) searchInput.value = preservedValue;
          if (hadFocus) {
              searchInput.focus();
              try { searchInput.setSelectionRange(caretPos, caretPos); } catch (_) {}
          }

          const capture = () => {
              window._inventorySearchState = {
                  value: searchInput.value,
                  hadFocus: document.activeElement === searchInput,
                  caretPos: searchInput.selectionStart
              };
          };

          setupSearchInput(
              searchInput,
              clearSearchBtn,
              () => {
                  capture();
                  import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('6'));
              },
              () => {
                  window._inventorySearchState = { value: '', hadFocus: true, caretPos: 0 };
                  import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('6'));
              }
          );
      }

      // Coin pouches blur save
      resultsSection.querySelectorAll('.permanent-title').forEach(titleEl => {
          titleEl.addEventListener('blur', () => {
              const blockId = titleEl.parentElement.getAttribute('data-id');
              localStorage.setItem(`permanentItem_${blockId}`, titleEl.textContent.trim());
          });
      });

      // Attunement max editable
      const maxEl = resultsSection.querySelector('.inventory-attune-max');
      if (maxEl) {
          const commit = () => {
              const n = parseInt(maxEl.textContent.trim(), 10);
              if (!Number.isFinite(n) || n < 0) {
                  maxEl.textContent = String(getInventoryAttunementMax());
                  return;
              }
              setInventoryAttunementMax(n);
              renderInventory(filteredBlocks);
          };
          maxEl.addEventListener('blur', commit);
          maxEl.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') { e.preventDefault(); maxEl.blur(); }
              if (e.key === 'Escape') {
                  maxEl.textContent = String(getInventoryAttunementMax());
                  maxEl.blur();
              }
          });
      }

      // Chain-icon click → toggle attuned
      resultsSection.querySelectorAll('.block-attune-chain').forEach(el => {
          el.addEventListener('click', (e) => {
              e.stopPropagation();
              const id = el.getAttribute('data-id');
              if (id) toggleInventoryAttuned(id);
          });
      });

      // Hand-icon click → toggle equipped
      resultsSection.querySelectorAll('.block-equip-hand').forEach(el => {
          el.addEventListener('click', (e) => {
              e.stopPropagation();
              const id = el.getAttribute('data-id');
              if (id) toggleInventoryEquipped(id);
          });
      });

      // Block click → open in viewer, or deselect if already selected
      resultsSection.querySelectorAll('.block:not(.permanent-block)').forEach(blockEl => {
          blockEl.addEventListener('click', (e) => {
              if (inventoryEditMode) return;
              if (e.target.closest('.block-actions')  ||
                  e.target.closest('.actions-trigger') ||
                  e.target.closest('.pin-button')      ||
                  e.target.closest('.block-attune-chain') ||
                  e.target.closest('.block-equip-hand')) return;
              if (e.target.classList.contains('circle')) return;
              const id = blockEl.getAttribute('data-id');
              if (!id) return;
              if (id === activeInventoryBlockId) {
                  // Deselect with fade
                  activeInventoryBlockId = null;
                  document.querySelectorAll('#results_section_6 .block').forEach(b => {
                      b.classList.remove('inventory-block-active');
                  });
                  const viewer = document.getElementById('inventory_viewer');
                  const existing = viewer?.querySelector('.inventory-viewer-content');
                  const clear = () => {
                      if (viewer) viewer.innerHTML = '<p class="inventory-viewer-placeholder">Select an item to view</p>';
                  };
                  if (existing) {
                      existing.classList.add('fading');
                      setTimeout(clear, 400);
                  } else {
                      clear();
                  }
              } else {
                  renderInventoryViewer(id);
              }
          });

          // Paired hover — light up every rendered copy of the same block
          const id = blockEl.getAttribute('data-id');
          blockEl.addEventListener('mouseenter', () => {
              if (!id) return;
              resultsSection.querySelectorAll(`.block[data-id="${id}"]`).forEach(el => {
                  if (el !== blockEl) el.classList.add('inventory-hover-pair');
              });
          });
          blockEl.addEventListener('mouseleave', () => {
              if (!id) return;
              resultsSection.querySelectorAll(`.block[data-id="${id}"]`).forEach(el => {
                  el.classList.remove('inventory-hover-pair');
              });
          });
      });

      // Render viewer for the currently-active block, if it's still present.
      // If we're in edit mode, don't touch the viewer — the form is still active.
      if (!inventoryEditMode) {
          const viewer = document.getElementById('inventory_viewer');
          const stillPresent = activeInventoryBlockId &&
              displayBlocks.find(b => b.id === activeInventoryBlockId);
          if (stillPresent) {
              renderInventoryViewer(activeInventoryBlockId);
          } else {
              activeInventoryBlockId = null;
              if (viewer) viewer.innerHTML = '<p class="inventory-viewer-placeholder">Select an item to view</p>';
          }
      }

      // Section header click → toggle collapse
      host.querySelectorAll('.inventory-section-header, .inventory-sub-label').forEach(headerEl => {
          headerEl.addEventListener('click', () => {
              const key = headerEl.dataset.sectionKey;
              if (!key) return;
              const row = host.querySelector(`.inventory-row[data-section-key="${key}"]`);
              const nowCollapsed = !headerEl.classList.contains('inventory-collapsed');
              headerEl.classList.toggle('inventory-collapsed', nowCollapsed);
              if (row) row.classList.toggle('inventory-collapsed', nowCollapsed);
              setInventorySectionCollapsed(key, nowCollapsed);
          });
      });

      applyInlineDiceRolls(resultsSection, 'tab6');
      attachDynamicTooltips();
      document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: 'tab6' } }));
  };

  const wireInventoryHeaderControls = () => {
      const sortBtn      = document.getElementById('results-sort-btn_6');
      const sortDropdown = document.getElementById('sort-dropdown_6');
      const addBtn       = document.getElementById('add_block_button');

      if (!sortBtn || !sortDropdown) return;

      const closeAll = () => {
          sortDropdown.classList.add('hidden');
      };

      sortBtn.addEventListener('click', e => {
          e.stopPropagation();
          const wasOpen = !sortDropdown.classList.contains('hidden');
          closeAll();
          if (!wasOpen) {
              const rect = sortBtn.getBoundingClientRect();
              sortDropdown.style.top  = `${rect.bottom + 5}px`;
              sortDropdown.style.left = `${rect.left}px`;
              sortDropdown.classList.remove('hidden');
          }
      });

      document.addEventListener('click', closeAll, { once: true });

      const savedSort = localStorage.getItem('activeSortOrder_tab6') || 'newest';
      sortDropdown.querySelectorAll('.sort-item').forEach(item => {
          const mode = item.dataset.sort;
          item.classList.toggle('selected', mode === savedSort);
          item.addEventListener('click', e => {
              e.stopPropagation();
              localStorage.setItem('activeSortOrder_tab6', mode);
              closeAll();
              import('./filterManager.js').then(({ filterManager }) => {
                  filterManager.applyFilters('6');
              });
          });
      });

      if (addBtn) {
          addBtn.onclick = () => {
              if (inventoryEditMode) return;
              startInventoryAdd();
          };
      }
  };

/* ==================================================================*/
  /* ======================= NOTES / TAB3 RENDER ======================*/
  /* ==================================================================*/

  const TAB3_SECTION_ORDER  = ["Quest", "Map", "Book", "Notes"];
  const TAB3_SECTION_LABELS = {
      "Quest": "Quests",
      "Map":   "Maps",
      "Book":  "Books",
      "Notes": "Notes"
  };

  const isTab3SectionCollapsed = (key) =>
      localStorage.getItem(`tab3_section_collapsed_${key}`) === 'true';

  const setTab3SectionCollapsed = (key, collapsed) =>
      localStorage.setItem(`tab3_section_collapsed_${key}`, collapsed ? 'true' : 'false');

  // Currently-active block in the notes viewer
  let activeNotesBlockId = null;
  let notesEditMode = false;

  // ── Notes wide/narrow responsive mode ──────────────────────────
  const NOTES_WIDE_BREAKPOINT = 700;
  let notesWideMode = false;
  let notesResizeObserver = null;

  const initNotesResizeObserver = () => {
      if (notesResizeObserver) return;
      const layout = document.querySelector('.notes-layout');
      if (!layout) return;

      // Set initial mode synchronously so the first render is correct
      notesWideMode = layout.offsetWidth >= NOTES_WIDE_BREAKPOINT;
      layout.classList.toggle('notes-wide-mode', notesWideMode);

      notesResizeObserver = new ResizeObserver(entries => {
          const width = entries[0].contentRect.width;
          const wasWide = notesWideMode;
          notesWideMode = width >= NOTES_WIDE_BREAKPOINT;
          layout.classList.toggle('notes-wide-mode', notesWideMode);

          if (wasWide !== notesWideMode) {
              // Cancel any active edit — the layout is about to change
              if (notesEditMode) {
                  notesEditMode = false;
                  const viewer = document.getElementById('notes_viewer');
                  if (viewer) viewer.classList.remove('editing');
              }
              const blocks = getBlocks('tab3');
              if (notesWideMode) {
                  // Narrow → wide: move inline-expanded block to viewer
                  let blockToView = null;
                  blocks.forEach(b => {
                      if (b.viewState === 'expanded') {
                          blockToView = b.id;
                          b.viewState = 'condensed';
                      }
                  });
                  if (blockToView) {
                      localStorage.setItem('userBlocks_tab3', JSON.stringify(blocks));
                      activeNotesBlockId = blockToView;
                  }
              } else {
                  // Wide → narrow: move viewer block to inline-expanded
                  if (activeNotesBlockId) {
                      const block = blocks.find(b => b.id === activeNotesBlockId);
                      if (block && getTab3BlockType(block) !== 'Map') {
                          blocks.forEach(b => {
                              if (b.viewState === 'expanded') b.viewState = 'condensed';
                          });
                          block.viewState = 'expanded';
                          localStorage.setItem('userBlocks_tab3', JSON.stringify(blocks));
                      }
                      activeNotesBlockId = null;
                  }
              }
              import('./filterManager.js').then(({ filterManager }) => {
                  filterManager.applyFilters('3');
              });
          }
      });
      notesResizeObserver.observe(layout);
  };

  // External setter used by duplicate-block flow to auto-select the copy
  const setActiveNotesBlock = (id) => { activeNotesBlockId = id; };

  // Helper: get first block type from a block
  const getTab3BlockType = (b) => {
      if (Array.isArray(b.blockType) && b.blockType.length > 0) return b.blockType[0];
      return b.blockType || null;
  };

  const buildTab3SectionHeader = (title, count, key) => {
      const collapsed = isTab3SectionCollapsed(key);
      return `
          <div class="tab3-section-header${collapsed ? ' tab3-collapsed' : ''}" data-section-key="${key}">
              <div class="tab3-section-left">
                  <h3 class="tab3-section-title">${title}</h3>
                  <span class="tab3-section-count">${count}</span>
              </div>
          </div>
      `;
  };

  // Location helpers — blank/null/"N/A" all bucket under the same "N/A" key
  const TAB3_NA_LOCATION_KEY = 'N/A';
  const normalizeLocation = (loc) => {
      if (loc === null || loc === undefined) return TAB3_NA_LOCATION_KEY;
      const s = String(loc).trim();
      if (s === '' || s.toLowerCase() === 'n/a') return TAB3_NA_LOCATION_KEY;
      return s;
  };

  const getTab3ActiveLocation = () => localStorage.getItem('tab3_active_location') || '';
  const setTab3ActiveLocation = (loc) => {
      if (loc) localStorage.setItem('tab3_active_location', loc);
      else     localStorage.removeItem('tab3_active_location');
  };

  const buildTab3LocationPillsHTML = (counts, activeLocation) => {
      if (counts.size === 0) return '';

      // Sort: alpha, N/A last
      const entries = Array.from(counts.entries()).sort((a, b) => {
          if (a[0] === TAB3_NA_LOCATION_KEY) return 1;
          if (b[0] === TAB3_NA_LOCATION_KEY) return -1;
          return a[0].localeCompare(b[0]);
      });

      const total = Array.from(counts.values()).reduce((s, n) => s + n, 0);
      const allPill = `<button class="tab3-location-pill${activeLocation === '' ? ' selected' : ''}" data-location="">All · ${total}</button>`;

      const pills = entries.map(([loc, count]) =>
          `<button class="tab3-location-pill${activeLocation === loc ? ' selected' : ''}" data-location="${loc}">${loc} · ${count}</button>`
      ).join('');

      const pinSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

      return `
          <div class="tab3-location-row">
              <div class="tab3-location-header">
                  ${pinSVG}
                  <span class="tab3-location-label">Location</span>
              </div>
              <div class="tab3-location-pills">
                  ${allPill}${pills}
              </div>
          </div>
      `;
  };

  // ── Close the notes viewer ──────────────────────────────────────
  const closeNotesViewer = () => {
      const wasActive = activeNotesBlockId;
      activeNotesBlockId = null;
      const layout = document.querySelector('.notes-layout');
      const viewer = document.getElementById('notes_viewer');

      document.querySelectorAll('#results_section_3 .block').forEach(b => {
          b.classList.remove('notes-block-active');
      });

      if (notesWideMode) {
          // Wide mode: keep viewer visible, show placeholder
          if (viewer) viewer.innerHTML = '<p class="notes-viewer-placeholder">Select an item to view</p>';
      } else {
          // Narrow mode: slide out
          if (layout) layout.classList.remove('notes-viewer-open');
          if (viewer && wasActive) {
              setTimeout(() => {
                  if (!activeNotesBlockId) viewer.innerHTML = '';
              }, 300);
          }
      }
  };

  // ── Map link confirmation popup ─────────────────────────────────
  const showMapLinkPopup = (url, clickEvent) => {
      // Remove any existing popup
      document.getElementById('map-link-popup')?.remove();

      const popup = document.createElement('div');
      popup.id = 'map-link-popup';
      popup.className = 'map-link-popup';

      const linkSVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

      popup.innerHTML = `
          <a class="map-link-popup-action" href="${url}" target="_blank" rel="noopener">
              ${linkSVG}
              <span>Open in new tab</span>
          </a>
      `;
      document.body.appendChild(popup);

      // Position above the click point
      const popupRect = popup.getBoundingClientRect();
      let top  = clickEvent.clientY - popupRect.height - 10;
      let left = clickEvent.clientX - (popupRect.width / 2);

      // Keep within viewport
      if (top < 4) top = clickEvent.clientY + 14;
      if (left < 4) left = 4;
      if (left + popupRect.width > window.innerWidth - 4) {
          left = window.innerWidth - popupRect.width - 4;
      }

      popup.style.top  = `${top}px`;
      popup.style.left = `${left}px`;
      popup.classList.add('visible');

      // Dismiss helpers
      let fadeTimer = null;
      const dismiss = () => {
          clearTimeout(fadeTimer);
          popup.classList.remove('visible');
          setTimeout(() => popup.remove(), 400);
          document.removeEventListener('mousedown', onOutside);
          document.removeEventListener('mousemove', onFirstMove);
      };
      const startFadeTimer = () => {
          clearTimeout(fadeTimer);
          fadeTimer = setTimeout(dismiss, 600);
      };
      const cancelFadeTimer = () => clearTimeout(fadeTimer);

      // Dismiss on outside click
      const onOutside = (e) => {
          if (!popup.contains(e.target)) dismiss();
      };
      setTimeout(() => document.addEventListener('mousedown', onOutside), 0);

      // Dismiss after link is clicked
      popup.querySelector('a').addEventListener('click', () => {
          setTimeout(dismiss, 100);
      });

      // Hover: cancel timer while hovering, restart when leaving
      popup.addEventListener('mouseenter', cancelFadeTimer);
      popup.addEventListener('mouseleave', startFadeTimer);

      // Start fade timer once the mouse first moves away from the click area
      const onFirstMove = (e) => {
          const r = popup.getBoundingClientRect();
          const pad = 12;
          if (e.clientX < r.left - pad || e.clientX > r.right + pad ||
              e.clientY < r.top - pad  || e.clientY > r.bottom + pad) {
              startFadeTimer();
              document.removeEventListener('mousemove', onFirstMove);
          }
      };
      setTimeout(() => document.addEventListener('mousemove', onFirstMove), 50);
  };

  // ── Render a block into the notes viewer ─────────────────────────
  const renderNotesViewer = (blockId) => {
      const viewer = document.getElementById('notes_viewer');
      const layout = document.querySelector('.notes-layout');
      if (!viewer) return;

      if (!blockId) {
          closeNotesViewer();
          return;
      }

      const blocks = getBlocks('tab3');
      const block  = blocks.find(b => b.id === blockId);
      if (!block) {
          closeNotesViewer();
          return;
      }

      activeNotesBlockId = blockId;

      // In narrow mode, slide open (wide mode CSS keeps viewer always visible)
      if (!notesWideMode && layout) layout.classList.add('notes-viewer-open');

      // Render the block expanded — blockTemplate handles body, tags, and
      // includes the .block-actions menu with edit/duplicate/remove buttons.
      const blockHTML = blockTemplate({ ...block, viewState: 'expanded' }, 'tab3');

      const newContentHTML = `<div class="notes-viewer-content">${blockHTML}</div>`;

      const existing = viewer.querySelector('.notes-viewer-content, .notes-viewer-placeholder');
      const doSwap = () => {
          viewer.innerHTML = newContentHTML;
          const fresh = viewer.querySelector('.notes-viewer-content');
          if (fresh) {
              fresh.style.opacity = '0';
              void fresh.offsetWidth;
              fresh.style.opacity = '';
          }
          applyInlineDiceRolls(viewer, 'tab3');
          document.querySelectorAll('#results_section_3 .block').forEach(b => {
              b.classList.toggle('notes-block-active', b.getAttribute('data-id') === blockId);
          });
      };
      if (existing && existing.classList.contains('notes-viewer-content')) {
          existing.classList.add('fading');
          setTimeout(doSwap, 200);
      } else {
          doSwap();
      }
  };

  // ── Main render function for tab3 ───────────────────────────────
  const renderNotes = (filteredBlocks = null) => {
      const resultsSection = document.getElementById('results_section_3');
      if (!resultsSection) return;

      initNotesResizeObserver();

      const allBlocks        = getBlocks('tab3');
      const prelocationFiltered = (filteredBlocks || allBlocks);

      // Count blocks per location
      const locationCounts = new Map();
      prelocationFiltered.forEach(b => {
          const loc = normalizeLocation(b.location);
          locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
      });

      // Clear stale active location if it no longer matches any blocks
      let activeLocation = getTab3ActiveLocation();
      if (activeLocation && !locationCounts.has(activeLocation)) {
          setTab3ActiveLocation('');
          activeLocation = '';
      }

      // Apply location filter
      const displayBlocks = activeLocation
          ? prelocationFiltered.filter(b => normalizeLocation(b.location) === activeLocation)
          : prelocationFiltered;

      // Header — just the add button (sort/view dropdowns removed in 9a)
      resultsSection.innerHTML = `
          <div id="results_header_3" class="results-header">
            <div id="header-controls_3" class="header-controls">
              <button id="add_block_button" class="add-block-button green-button">+</button>
            </div>
          </div>
          ${buildTab3LocationPillsHTML(locationCounts, activeLocation)}
          <div id="tab3-sections-host"></div>
      `;

      const host = document.getElementById('tab3-sections-host');

      // ── List block renderer ──────────────────────────────────────
      // Wide mode: all blocks condensed; clicked block shown in viewer.
      // Narrow mode: non-Map blocks can expand inline (accordion).
      const renderNotesListBlock = (b) => {
          const type = getTab3BlockType(b);
          let listViewState;
          if (notesWideMode) {
              // Wide: always condensed in list, viewer shows detail
              listViewState = 'condensed';
          } else {
              // Narrow: all non-Map types can expand inline
              listViewState = (type === 'Map') ? 'condensed' : (b.viewState || 'condensed');
          }
          const activeClass = (b.id === activeNotesBlockId) ? ' notes-block-active' : '';
          const html = blockTemplate({ ...b, viewState: listViewState }, 'tab3');
          return html.replace(
              /<div class="block ([^"]+)" data-id="([^"]+)">/,
              `<div class="block $1${activeClass}" data-id="$2">`
          );
      };

      // ── Group blocks by type into sections ───────────────────────
      const blocksByType = {};
      TAB3_SECTION_ORDER.forEach(t => { blocksByType[t] = []; });
      const uncategorised = [];

      displayBlocks.forEach(b => {
          const t = getTab3BlockType(b);
          if (t && blocksByType[t]) blocksByType[t].push(b);
          else uncategorised.push(b);
      });

      TAB3_SECTION_ORDER.forEach(typeName => {
          const sectionBlocks = blocksByType[typeName];
          if (sectionBlocks.length === 0) return;

          host.insertAdjacentHTML('beforeend',
              buildTab3SectionHeader(TAB3_SECTION_LABELS[typeName], sectionBlocks.length, typeName));

          const sectionDiv = document.createElement('div');
          sectionDiv.className = 'tab3-section';
          if (typeName === 'Map')  sectionDiv.classList.add('tab3-section-maps');
          if (typeName === 'Book') sectionDiv.classList.add('tab3-section-books');
          if (isTab3SectionCollapsed(typeName)) sectionDiv.classList.add('tab3-collapsed');
          sectionDiv.dataset.sectionKey = typeName;
          const blockHTML = sectionBlocks.map(renderNotesListBlock).join('');
          sectionDiv.innerHTML = `<div class="tab3-section-inner">${blockHTML}</div>`;
          host.appendChild(sectionDiv);
      });

      if (uncategorised.length > 0) {
          host.insertAdjacentHTML('beforeend',
              buildTab3SectionHeader('Uncategorised', uncategorised.length, 'uncategorised'));
          const sectionDiv = document.createElement('div');
          sectionDiv.className = 'tab3-section';
          if (isTab3SectionCollapsed('uncategorised')) sectionDiv.classList.add('tab3-collapsed');
          sectionDiv.dataset.sectionKey = 'uncategorised';
          sectionDiv.innerHTML = uncategorised.map(renderNotesListBlock).join('');
          host.appendChild(sectionDiv);
      }

      if (displayBlocks.length === 0) {
          const p = document.createElement('p');
          p.classList.add('results-placeholder');
          p.textContent = activeLocation
              ? `No blocks tagged with location "${activeLocation}".`
              : 'Use the + button to add items here…';
          p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
          resultsSection.appendChild(p);
      }

      wireNotesHeaderControls();

      // ── Section header collapse ──────────────────────────────────
      host.querySelectorAll('.tab3-section-header').forEach(headerEl => {
          headerEl.addEventListener('click', () => {
              const key = headerEl.dataset.sectionKey;
              if (!key) return;
              const sec = host.querySelector(`.tab3-section[data-section-key="${key}"]`);
              const nowCollapsed = !headerEl.classList.contains('tab3-collapsed');
              headerEl.classList.toggle('tab3-collapsed', nowCollapsed);
              if (sec) sec.classList.toggle('tab3-collapsed', nowCollapsed);
              setTab3SectionCollapsed(key, nowCollapsed);
          });
      });

      // ── Location pill click ──────────────────────────────────────
      resultsSection.querySelectorAll('.tab3-location-pill').forEach(pill => {
          pill.addEventListener('click', () => {
              setTab3ActiveLocation(pill.dataset.location || '');
              import('./filterManager.js').then(({ filterManager }) => {
                  filterManager.applyFilters('3');
              });
          });
      });



      // ── Block click routing (by type) ────────────────────────────
      resultsSection.querySelectorAll('.block:not(.permanent-block)').forEach(blockEl => {
          blockEl.addEventListener('click', function(e) {
              if (e.target.closest('.block-actions')   ||
                  e.target.closest('.actions-trigger')  ||
                  e.target.closest('.quest-status-pill') ||
                  e.target.closest('.quest-objective')) return;
              if (e.target.classList.contains('circle')) return;
              if (notesEditMode) return;

              const id = blockEl.getAttribute('data-id');
              if (!id) return;

              const blocksArr   = getBlocks('tab3');
              const targetBlock = blocksArr.find(b => b.id === id);
              if (!targetBlock) return;

              const type = getTab3BlockType(targetBlock);

              // ── Map: show popup to open URL in new tab ──────────
              if (type === 'Map') {
                  if (targetBlock.url) showMapLinkPopup(targetBlock.url, e);
                  return;
              }

              if (notesWideMode) {
                  // ── Wide mode: open/close/swap viewer for any type ──
                  if (id === activeNotesBlockId) {
                      closeNotesViewer();
                  } else {
                      renderNotesViewer(id);
                  }
              } else {
                  // ── Narrow mode: accordion inline expansion ─────────
                  // For expanded blocks, only collapse via header tap
                  if (!blockEl.classList.contains('condensed')) return;

                  // Accordion: collapse any other expanded block first
                  blocksArr.forEach(b => {
                      if (b.id !== id && b.viewState === 'expanded') {
                          b.viewState = 'condensed';
                      }
                  });

                  targetBlock.viewState = targetBlock.viewState === 'expanded'
                      ? 'condensed' : 'expanded';

                  setPendingBlockAnim(id, blockEl.offsetHeight);
                  localStorage.setItem('userBlocks_tab3', JSON.stringify(blocksArr));

                  import('./filterManager.js').then(({ filterManager }) => {
                      filterManager.applyFilters('3');
                  });
              }
          });
      });

      // Track drag vs click on expanded blocks (for text selection)
      resultsSection.querySelectorAll('.block:not(.permanent-block)').forEach(blockEl => {
          let startX, startY;
          blockEl.addEventListener('mousedown', (e) => {
              startX = e.clientX;
              startY = e.clientY;
              blockEl._wasDrag = false;
          });
          blockEl.addEventListener('mouseup', (e) => {
              const dx = Math.abs(e.clientX - startX);
              const dy = Math.abs(e.clientY - startY);
              blockEl._wasDrag = (dx > 4 || dy > 4);
          });
      });

      // ── Header tap to collapse expanded blocks ───────────────────
      resultsSection.querySelectorAll('.block:not(.permanent-block) .block-header').forEach(headerEl => {
          let mdX, mdY, mdFired = false;
          headerEl.addEventListener('mousedown', (e) => {
              mdX = e.clientX;
              mdY = e.clientY;
              mdFired = true;
          });
          headerEl.addEventListener('mouseup', (e) => {
              if (!mdFired) return;
              mdFired = false;
              // Wide mode: blocks don't expand inline, nothing to collapse
              if (notesWideMode) return;
              const blockEl = headerEl.closest('.block');
              if (!blockEl || blockEl.classList.contains('condensed')) return;
              const dx = Math.abs(e.clientX - mdX);
              const dy = Math.abs(e.clientY - mdY);
              if (dx > 4 || dy > 4) return;
              if (e.target.closest('.block-actions') || e.target.closest('.actions-trigger')) return;

              const id = blockEl.getAttribute('data-id');
              const blocksArr = getBlocks('tab3');
              const targetBlock = blocksArr.find(b => b.id === id);
              if (!targetBlock) return;

              const type = getTab3BlockType(targetBlock);
              if (type === 'Map') return;

              targetBlock.viewState = 'condensed';
              localStorage.setItem('userBlocks_tab3', JSON.stringify(blocksArr));
              animateBlockCollapse(blockEl, () => {
                  import('./filterManager.js').then(({ filterManager }) => {
                      filterManager.applyFilters('3');
                  });
              });
          });
      });

      // ── Click on empty list space → close viewer ─────────────────
      resultsSection.addEventListener('click', (e) => {
          if (notesEditMode) return;
          if (!e.target.closest('.block') &&
              !e.target.closest('.tab3-section-header') &&
              !e.target.closest('.tab3-location-pill') &&
              !e.target.closest('.results-header') &&
              !e.target.closest('.add-block-button')) {
              closeNotesViewer();
          }
      });

      applyInlineDiceRolls(resultsSection, 'tab3');
      updateTags();
      attachDynamicTooltips();
      document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: 'tab3' } }));
      initQuestStatusDropdown();

      // ── Wire quest status pill clicks in the viewer too ──────────
      const notesViewerEl = document.getElementById('notes_viewer');
      if (notesViewerEl && !notesViewerEl._questPillDelegationBound) {
          notesViewerEl.addEventListener('click', (e) => {
              const pill = e.target.closest('.quest-status-pill');
              if (!pill) return;
              if (notesEditMode) return;
              e.stopPropagation();
              const dropdown = document.getElementById('quest-status-dropdown');
              if (!dropdown) return;
              const rect = pill.getBoundingClientRect();
              dropdown.style.top  = `${rect.bottom + 5}px`;
              dropdown.style.left = `${rect.left}px`;
              dropdown.dataset.blockId = pill.dataset.id;
              const currentStatus = pill.dataset.status;
              dropdown.querySelectorAll('.quest-status-item').forEach(it => {
                  it.classList.toggle('selected', it.dataset.status === currentStatus);
              });
              dropdown.classList.remove('hidden');
              setTimeout(() => {
                  const closeDropdown = () => dropdown.classList.add('hidden');
                  document.addEventListener('click', closeDropdown, { once: true });
              }, 0);
          });
          notesViewerEl._questPillDelegationBound = true;
      }

      // ── Viewer: mode-dependent ────────────────────────────────────
      const viewer = document.getElementById('notes_viewer');
      if (notesEditMode) {
          // Editing in progress — don't touch the viewer or inline form
      } else if (notesWideMode) {
          // Wide mode: viewer is always visible
          const stillPresent = activeNotesBlockId &&
              displayBlocks.find(b => b.id === activeNotesBlockId);
          if (stillPresent) {
              renderNotesViewer(activeNotesBlockId);
          } else {
              if (activeNotesBlockId) activeNotesBlockId = null;
              if (viewer) viewer.innerHTML = '<p class="notes-viewer-placeholder">Select an item to view</p>';
              document.querySelectorAll('#results_section_3 .block').forEach(b => {
                  b.classList.remove('notes-block-active');
              });
          }
      } else {
          // Narrow mode: viewer hidden by CSS — just clean up state
          if (activeNotesBlockId) {
              activeNotesBlockId = null;
              const layout = document.querySelector('.notes-layout');
              if (layout) layout.classList.remove('notes-viewer-open');
          }
          if (viewer) viewer.innerHTML = '';
      }

      applyPendingBlockAnim();
  };

  // ── Wire the add button in the results header ───────────────────
  const wireNotesHeaderControls = () => {
      const addBtn = document.getElementById('add_block_button');
      if (addBtn) {
          addBtn.onclick = () => startNotesAdd();
      }
  };

  // ── Notes viewer/inline: shared edit & add helpers ─────────────

  const NOTES_QUEST_STATUSES = [
      { value: 'active',      label: 'Active' },
      { value: 'on hold',     label: 'On hold' },
      { value: 'not started', label: 'Not started' },
      { value: 'completed',   label: 'Completed' },
      { value: 'failed',      label: 'Failed' },
  ];

  // Build all the inner form HTML for a notes edit/add form.
  // `block` is the existing block on edit, null on add.
  const buildNotesEditFormHTML = (block) => {
      const isEdit = !!block;
      const tab = 'tab3';

      // ── Block type buttons (single-select) ──
      const tabBTConfig = blockTypeConfig[tab];
      const currentTypes = isEdit
          ? (Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []))
          : ['Notes'];
      const blockTypeHTML = tabBTConfig.types.map(type =>
          `<button class="tag-button ${tabBTConfig.className}${currentTypes.includes(type) ? ' selected' : ''}" data-tag="${type}">${type}</button>`
      ).join('');

      // ── Current type for initial field visibility ──
      const selType   = currentTypes[0] || 'Notes';
      const showQuest = selType === 'Quest';
      const showMap   = selType === 'Map';
      const showBook  = selType === 'Book';
      const showDesc  = selType === 'Book' || selType === 'Notes';
      const showBody  = selType !== 'Map';

      // ── Location ──
      const location = isEdit ? (block.location || '') : '';

      // ── URL (Map) ──
      const url = isEdit ? (block.url || '') : '';

      // ── Description (Book, Notes) ──
      const description = isEdit ? (block.description || '') : '';

      // ── Accent swatches (Book) ──
      const bookColor = isEdit ? (block.bookColor || DEFAULT_BOOK_ACCENT) : DEFAULT_BOOK_ACCENT;
      const swatchesHTML = BOOK_ACCENT_COLORS.map(c => `
          <button type="button"
              class="book-accent-swatch${c.id === bookColor ? ' selected' : ''}"
              data-color-id="${c.id}"
              style="background-color:${c.hex};"
              title="${c.label}"
              aria-label="${c.label}"></button>
      `).join('');

      // ── Status pills (Quest) ──
      const status = isEdit ? (block.status || 'active') : 'active';
      const statusHTML = NOTES_QUEST_STATUSES.map(s =>
          `<button type="button" class="quest-status-pill status-${s.value.replace(/\s+/g, '-')}${status === s.value ? ' selected' : ''}" data-status="${s.value}"><span class="quest-status-dot"></span>${s.label}</button>`
      ).join('');

      // ── Objectives editor rows (Quest) ──
      const objectives = isEdit && Array.isArray(block.objectives) ? block.objectives : [];
      const objectivesHTML = objectives.map(o => `
          <div class="quest-objective-editor-row" data-done="${o.done ? 'true' : 'false'}">
              <input type="text" class="quest-objective-input" placeholder="Objective…" value="${(o.text || '').replace(/"/g, '&quot;')}" />
              <button type="button" class="quest-objective-remove" title="Remove">×</button>
          </div>
      `).join('');

      // ── Body ──
      const bodyHTML = sanitizeBlockHTML(isEdit ? block.text : '');

      // ── Title ──
      const title = isEdit ? block.title : '';

      // ── Assemble type-specific fields ──
      const fieldsHTML = `
          <div class="notes-edit-fields">
              <div class="quest-overlay-field">
                  <label class="quest-overlay-label">Location</label>
                  <input type="text" class="notes-edit-location quest-overlay-input" placeholder="e.g. Ionia — leave blank for none" value="${location.replace(/"/g, '&quot;')}" />
              </div>
              <div class="quest-overlay-field map-only-field" style="display:${showMap ? '' : 'none'};">
                  <label class="quest-overlay-label">Link URL</label>
                  <input type="url" class="notes-edit-url quest-overlay-input" placeholder="https://example.com" value="${url.replace(/"/g, '&quot;')}" />
              </div>
              <div class="quest-overlay-field desc-only-field" style="display:${showDesc ? '' : 'none'};">
                  <label class="quest-overlay-label">Description</label>
                  <input type="text" class="notes-edit-description quest-overlay-input" placeholder="Short description shown on the card" maxlength="200" value="${description.replace(/"/g, '&quot;')}" />
              </div>
              <div class="quest-overlay-field book-only-field" style="display:${showBook ? '' : 'none'};">
                  <label class="quest-overlay-label">Accent colour</label>
                  <div class="notes-edit-swatches book-accent-swatches">${swatchesHTML}</div>
              </div>
              <div class="quest-overlay-field quest-only-field" style="display:${showQuest ? '' : 'none'};">
                  <label class="quest-overlay-label">Status</label>
                  <div class="notes-edit-status quest-status-button-row">${statusHTML}</div>
              </div>
              <div class="quest-overlay-field quest-only-field" style="display:${showQuest ? '' : 'none'};">
                  <label class="quest-overlay-label">Objectives</label>
                  <div class="notes-edit-objectives quest-objectives-editor">${objectivesHTML}</div>
                  <button type="button" class="notes-edit-add-objective quest-add-objective-btn">+ Add objective</button>
              </div>
          </div>
      `;

      return { title, blockTypeHTML, fieldsHTML, bodyHTML, showBody };
  };

  // Wire up all interactive behaviour within a notes edit form container.
  const wireNotesEditBehaviour = (container) => {
      // ── Block type single-select + field visibility ──
      const blockTypesContainer = container.querySelector('.inline-edit-block-types');
      const questOnlyFields = container.querySelectorAll('.quest-only-field');
      const bookOnlyFields  = container.querySelectorAll('.book-only-field');
      const descOnlyFields  = container.querySelectorAll('.desc-only-field');
      const mapOnlyFields   = container.querySelectorAll('.map-only-field');
      const bodyWrap        = container.querySelector('.notes-edit-body-wrap');

      const updateFieldVisibility = () => {
          const sel = blockTypesContainer?.querySelector('.tag-button.selected');
          const type = sel?.dataset.tag || '';
          const isQuest = type === 'Quest';
          const isMap   = type === 'Map';
          const isBook  = type === 'Book';
          const isDesc  = isBook || type === 'Notes';

          questOnlyFields.forEach(f => f.style.display = isQuest ? '' : 'none');
          bookOnlyFields.forEach(f => f.style.display = isBook ? '' : 'none');
          descOnlyFields.forEach(f => f.style.display = isDesc ? '' : 'none');
          mapOnlyFields.forEach(f => f.style.display = isMap ? '' : 'none');

          // Hide body editor (and its toolbar wrapper) for Map
          if (bodyWrap) bodyWrap.style.display = isMap ? 'none' : '';
      };

      if (blockTypesContainer) {
          blockTypesContainer.addEventListener('click', (e) => {
              const btn = e.target.closest('.tag-button');
              if (!btn) return;
              const wasSel = btn.classList.contains('selected');
              blockTypesContainer.querySelectorAll('.tag-button').forEach(b => b.classList.remove('selected'));
              if (!wasSel) btn.classList.add('selected');
              updateFieldVisibility();
          });
      }

      // ── Status pill mutual exclusion ──
      const statusRow = container.querySelector('.notes-edit-status');
      if (statusRow) {
          statusRow.addEventListener('click', (e) => {
              const pill = e.target.closest('.quest-status-pill');
              if (!pill) return;
              e.preventDefault();
              statusRow.querySelectorAll('.quest-status-pill').forEach(p => p.classList.remove('selected'));
              pill.classList.add('selected');
          });
      }

      // ── Objectives add / remove / Enter-to-add ──
      const objectivesEditor = container.querySelector('.notes-edit-objectives');
      const addObjectiveBtn  = container.querySelector('.notes-edit-add-objective');

      const renderObjectiveRow = (text = '', done = false) => {
          const row = document.createElement('div');
          row.className = 'quest-objective-editor-row';
          row.dataset.done = done ? 'true' : 'false';
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'quest-objective-input';
          input.placeholder = 'Objective…';
          input.value = text;
          row.appendChild(input);
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'quest-objective-remove';
          removeBtn.title = 'Remove';
          removeBtn.textContent = '×';
          row.appendChild(removeBtn);
          return row;
      };

      if (addObjectiveBtn && objectivesEditor) {
          addObjectiveBtn.addEventListener('click', (e) => {
              e.preventDefault();
              const row = renderObjectiveRow('', false);
              objectivesEditor.appendChild(row);
              row.querySelector('.quest-objective-input').focus();
          });
      }

      if (objectivesEditor) {
          objectivesEditor.addEventListener('click', (e) => {
              const rmBtn = e.target.closest('.quest-objective-remove');
              if (!rmBtn) return;
              e.preventDefault();
              rmBtn.closest('.quest-objective-editor-row')?.remove();
          });
          objectivesEditor.addEventListener('keydown', (e) => {
              if (e.key !== 'Enter' || !e.target.classList.contains('quest-objective-input')) return;
              e.preventDefault();
              const row = renderObjectiveRow('', false);
              e.target.closest('.quest-objective-editor-row').after(row);
              row.querySelector('.quest-objective-input').focus();
          });
      }

      // ── Accent swatch selection ──
      const swatchContainer = container.querySelector('.notes-edit-swatches');
      if (swatchContainer) {
          swatchContainer.addEventListener('click', (e) => {
              const btn = e.target.closest('.book-accent-swatch');
              if (!btn) return;
              e.preventDefault();
              swatchContainer.querySelectorAll('.book-accent-swatch').forEach(s => s.classList.remove('selected'));
              btn.classList.add('selected');
          });
      }

      // ── Rich text toolbar on body ──
      const bodyEl = container.querySelector('.notes-edit-body');
      if (bodyEl) {
          initToolbarForEditor(bodyEl);
          // Placeholder toggle (mirrors initCEPlaceholder)
          const updatePlaceholder = () => {
              const txt = bodyEl.textContent.replace(/\u200B/g, '').trim();
              bodyEl.classList.toggle('empty', txt === '');
          };
          bodyEl.addEventListener('input', updatePlaceholder);
          bodyEl.addEventListener('focus', updatePlaceholder);
          bodyEl.addEventListener('blur', updatePlaceholder);
          updatePlaceholder();
      }

      // Run initial visibility pass (toolbar wrapper now exists)
      updateFieldVisibility();
  };

  // Read + validate form data from a notes edit container.
  // Returns object on success, null on validation failure.
  const collectNotesFormData = (container) => {
      const titleEl = container.querySelector('.notes-edit-title');
      const newTitle = titleEl?.textContent.trim();
      if (!newTitle) { alert('A title is required.'); return null; }

      // Block type
      const selectedTypeBtn = container.querySelector('.inline-edit-block-types .tag-button.selected');
      const blockType = selectedTypeBtn?.dataset.tag || null;
      if (!blockType) {
          alert('Please select a block type: ' + blockTypeConfig.tab3.types.join(', ') + '.');
          return null;
      }

      // Body
      const bodyEl = container.querySelector('.notes-edit-body');
      const newBody = bodyEl ? bodyEl.innerHTML.trim() : '';
      const textOptional = blockType === 'Quest' || blockType === 'Map';
      if (!textOptional && !newBody) {
          alert('Title and text are required.');
          return null;
      }

      // Location
      const loc = container.querySelector('.notes-edit-location')?.value.trim() || null;

      // Build tab3Extras
      const tab3Extras = { location: loc };

      if (blockType === 'Quest') {
          const selPill = container.querySelector('.notes-edit-status .quest-status-pill.selected');
          tab3Extras.status = selPill?.dataset.status || 'active';
          const rows = container.querySelectorAll('.notes-edit-objectives .quest-objective-editor-row');
          tab3Extras.objectives = Array.from(rows).map(row => ({
              text: row.querySelector('.quest-objective-input')?.value.trim() || '',
              done: row.dataset.done === 'true'
          })).filter(o => o.text !== '');
      }
      if (blockType === 'Book') {
          tab3Extras.description = container.querySelector('.notes-edit-description')?.value.trim() || '';
          const selSwatch = container.querySelector('.notes-edit-swatches .book-accent-swatch.selected');
          tab3Extras.bookColor = selSwatch?.dataset.colorId || DEFAULT_BOOK_ACCENT;
      }
      if (blockType === 'Notes') {
          tab3Extras.description = container.querySelector('.notes-edit-description')?.value.trim() || '';
      }
      if (blockType === 'Map') {
          const urlVal = container.querySelector('.notes-edit-url')?.value.trim() || '';
          if (!urlVal) { alert('A link URL is required for Map blocks.'); return null; }
          tab3Extras.url = urlVal;
      }

      const text = blockType === 'Map' ? '' : newBody;

      return { title: newTitle, text, blockType, tab3Extras };
  };

  // Assemble the full edit form HTML used by both viewer and inline modes.
  const assembleNotesEditFormInner = (block) => {
      const { title, blockTypeHTML, fieldsHTML, bodyHTML, showBody } = buildNotesEditFormHTML(block);

      return `
          <div class="notes-edit-header">
              <h4 contenteditable="true" class="notes-edit-title">${title}</h4>
              <div class="inline-edit-controls">
                  <button class="button green-button notes-edit-save">Save</button>
                  <button class="button red-button notes-edit-cancel">Cancel</button>
              </div>
          </div>
          <div class="notes-edit-inserts">
              <div class="inline-edit-block-types">${blockTypeHTML}</div>
              ${fieldsHTML}
          </div>
          <div class="notes-edit-body-wrap" style="display:${showBody ? '' : 'none'};">
              <div contenteditable="true" class="notes-edit-body" data-placeholder="Enter block text here...">${bodyHTML}</div>
          </div>
      `;
  };

  // ── Wide mode: edit in viewer ──────────────────────────────────
  const enterNotesViewerEdit = (blockId) => {
      if (notesEditMode) return;
      const viewer = document.getElementById('notes_viewer');
      if (!viewer) return;

      const blocks = getBlocks('tab3');
      const block  = blocks.find(b => b.id === blockId);
      if (!block) return;

      // If viewer doesn't have content, render first then re-enter
      if (!viewer.querySelector('.notes-viewer-content')) {
          renderNotesViewer(blockId);
          requestAnimationFrame(() => enterNotesViewerEdit(blockId));
          return;
      }

      notesEditMode = true;
      activeNotesBlockId = blockId;
      viewer.classList.add('editing');

      const formHTML = `<div class="notes-viewer-content notes-edit-form">${assembleNotesEditFormInner(block)}</div>`;

      const existing = viewer.querySelector('.notes-viewer-content, .notes-viewer-placeholder');
      const doSwap = () => {
          viewer.innerHTML = formHTML;
          const content = viewer.querySelector('.notes-edit-form');
          if (content) { content.style.opacity = '0'; void content.offsetWidth; content.style.opacity = ''; }

          wireNotesEditBehaviour(viewer);

          // Highlight active block in list
          document.querySelectorAll('#results_section_3 .block').forEach(b => {
              b.classList.toggle('notes-block-active', b.getAttribute('data-id') === blockId);
          });

          // Save / Cancel
          let removeKeyHandler;
          const doSave = () => {
              const data = collectNotesFormData(viewer);
              if (!data) return;
              removeKeyHandler();
              const latestBlock = getBlocks('tab3').find(b => b.id === blockId);
              saveBlock('tab3', data.title, data.text, latestBlock?.tags || [], [], [], data.blockType, blockId, block.timestamp, null, data.tab3Extras);
              notesEditMode = false;
              viewer.classList.remove('editing');
              import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('3'));
          };

          const doCancel = () => {
              removeKeyHandler();
              notesEditMode = false;
              viewer.classList.remove('editing');
              renderNotesViewer(blockId);
          };

          removeKeyHandler = wireEditControls(viewer, {
              saveSel: '.notes-edit-save', cancelSel: '.notes-edit-cancel',
              onSave: doSave, onCancel: doCancel,
          });

          focusAndCursorToEnd(viewer.querySelector('.notes-edit-title'));
      };

      if (existing && existing.classList.contains('notes-viewer-content')) {
          existing.classList.add('fading');
          setTimeout(doSwap, 200);
      } else {
          doSwap();
      }
  };

  // ── Wide mode: add in viewer ───────────────────────────────────
  const startNotesViewerAdd = () => {
      if (notesEditMode) return;
      const viewer = document.getElementById('notes_viewer');
      const layout = document.querySelector('.notes-layout');
      if (!viewer) return;

      notesEditMode = true;

      // In narrow mode slide open (shouldn't happen but safety)
      if (!notesWideMode && layout) layout.classList.add('notes-viewer-open');

      const formHTML = `<div class="notes-viewer-content notes-edit-form">${assembleNotesEditFormInner(null)}</div>`;

      const existing = viewer.querySelector('.notes-viewer-content, .notes-viewer-placeholder');
      const doSwap = () => {
          viewer.innerHTML = formHTML;
          viewer.classList.add('editing');
          const content = viewer.querySelector('.notes-edit-form');
          if (content) { content.style.opacity = '0'; void content.offsetWidth; content.style.opacity = ''; }

          wireNotesEditBehaviour(viewer);

          // Clear active highlight
          document.querySelectorAll('#results_section_3 .block').forEach(b => b.classList.remove('notes-block-active'));

          // Save / Cancel
          let removeKeyHandler;
          const doSave = () => {
              const data = collectNotesFormData(viewer);
              if (!data) return;
              removeKeyHandler();
              const newId = saveBlock('tab3', data.title, data.text, [], [], [], data.blockType, null, null, null, data.tab3Extras);
              notesEditMode = false;
              viewer.classList.remove('editing');
              if (typeof newId === 'string') activeNotesBlockId = newId;
              import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('3'));
          };

          const doCancel = () => {
              removeKeyHandler();
              notesEditMode = false;
              viewer.classList.remove('editing');
              if (activeNotesBlockId) {
                  renderNotesViewer(activeNotesBlockId);
              } else {
                  viewer.innerHTML = '<p class="notes-viewer-placeholder">Select an item to view</p>';
              }
          };

          removeKeyHandler = wireEditControls(viewer, {
              saveSel: '.notes-edit-save', cancelSel: '.notes-edit-cancel',
              onSave: doSave, onCancel: doCancel,
          });

          const titleEl = viewer.querySelector('.notes-edit-title');
          if (titleEl) titleEl.focus();
      };

      if (existing && existing.classList.contains('notes-viewer-content')) {
          existing.classList.add('fading');
          setTimeout(doSwap, 200);
      } else {
          doSwap();
      }
  };

  // ── Narrow mode: edit inline ───────────────────────────────────
  const enterNotesInlineEdit = (blockId, skipAnim = false) => {
      if (notesEditMode) return;
      const tab = 'tab3';
      const blocksArr = getBlocks(tab);
      const block = blocksArr.find(b => b.id === blockId);
      if (!block) return;

      // If not expanded, expand first then re-enter
      if (block.viewState !== 'expanded') {
          const oldHeight = document.querySelector(`.block[data-id="${blockId}"]`)?.offsetHeight || 0;
          block.viewState = 'expanded';
          // Collapse any other expanded block
          blocksArr.forEach(b => { if (b.id !== blockId && b.viewState === 'expanded') b.viewState = 'condensed'; });
          localStorage.setItem('userBlocks_tab3', JSON.stringify(blocksArr));
          import('./filterManager.js').then(({ filterManager }) => {
              filterManager.applyFilters('3');
              requestAnimationFrame(() => {
                  enterNotesInlineEdit(blockId, true);
                  const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
                  if (blockEl) animateHeightTransition(blockEl, oldHeight);
              });
          });
          return;
      }

      const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
      if (!blockEl) return;

      notesEditMode = true;
      const oldHeight = blockEl.offsetHeight;

      blockEl.classList.add('inline-editing');
      blockEl.innerHTML = assembleNotesEditFormInner(block);

      wireNotesEditBehaviour(blockEl);

      // Save / Cancel
      let removeKeyHandler;
      const doSave = () => {
          const data = collectNotesFormData(blockEl);
          if (!data) return;
          removeKeyHandler();
          const latestBlock = getBlocks(tab).find(b => b.id === blockId);
          saveBlock(tab, data.title, data.text, latestBlock?.tags || [], [], [], data.blockType, blockId, block.timestamp, null, data.tab3Extras);
          notesEditMode = false;
          setPendingBlockAnim(blockId, blockEl.offsetHeight);
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('3'));
      };

      const doCancel = () => {
          removeKeyHandler();
          notesEditMode = false;
          setPendingBlockAnim(blockId, blockEl.offsetHeight);
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('3'));
      };

      removeKeyHandler = wireEditControls(blockEl, {
          saveSel: '.notes-edit-save', cancelSel: '.notes-edit-cancel',
          onSave: doSave, onCancel: doCancel,
      });

      focusAndCursorToEnd(blockEl.querySelector('.notes-edit-title'));

      if (!skipAnim) animateHeightTransition(blockEl, oldHeight, 'notes-edit-header');
  };

  // ── Narrow mode: add inline ────────────────────────────────────
  const startNotesInlineAdd = () => {
      if (notesEditMode) return;
      notesEditMode = true;

      const blockEl = document.createElement('div');
      blockEl.className = 'block expanded inline-editing';
      blockEl.setAttribute('data-id', 'new-notes-inline-add');

      blockEl.innerHTML = assembleNotesEditFormInner(null);

      // Insert after the results header / location row
      const resultsSection = document.getElementById('results_section_3');
      if (!resultsSection) return;
      const host = document.getElementById('tab3-sections-host');
      if (host) {
          host.prepend(blockEl);
      } else {
          resultsSection.appendChild(blockEl);
      }

      blockEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      wireNotesEditBehaviour(blockEl);

      // Save / Cancel
      let removeKeyHandler;
      const doSave = () => {
          const data = collectNotesFormData(blockEl);
          if (!data) return;
          removeKeyHandler();
          saveBlock('tab3', data.title, data.text, [], [], [], data.blockType, null, null, null, data.tab3Extras);
          notesEditMode = false;
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('3'));
      };

      const doCancel = () => {
          removeKeyHandler();
          notesEditMode = false;
          blockEl.remove();
      };

      removeKeyHandler = wireEditControls(blockEl, {
          saveSel: '.notes-edit-save', cancelSel: '.notes-edit-cancel',
          onSave: doSave, onCancel: doCancel,
      });

      const titleEl = blockEl.querySelector('.notes-edit-title');
      if (titleEl) titleEl.focus();
  };

  // ── Dispatchers ────────────────────────────────────────────────
  const enterNotesEdit = (blockId) => {
      if (notesEditMode) return;
      if (notesWideMode) {
          enterNotesViewerEdit(blockId);
      } else {
          enterNotesInlineEdit(blockId);
      }
  };

  const startNotesAdd = () => {
      if (notesEditMode) return;
      if (notesWideMode) {
          startNotesViewerAdd();
      } else {
          startNotesInlineAdd();
      }
  };

  const initQuestStatusDropdown = () => {
      const resultsSection = document.getElementById('results_section_3');
      if (!resultsSection) return;

      // Create the shared dropdown once, attached to document.body so it can
      // overlay blocks (which have overflow:hidden)
      let dropdown = document.getElementById('quest-status-dropdown');
      if (!dropdown) {
          dropdown = document.createElement('div');
          dropdown.id = 'quest-status-dropdown';
          dropdown.className = 'quest-status-dropdown hidden';
          dropdown.innerHTML = `
              <button class="quest-status-item" data-status="active">Active</button>
              <button class="quest-status-item" data-status="on hold">On hold</button>
              <button class="quest-status-item" data-status="not started">Not started</button>
              <button class="quest-status-item" data-status="completed">Completed</button>
              <button class="quest-status-item" data-status="failed">Failed</button>
          `;
          document.body.appendChild(dropdown);
      }

      const closeDropdown = () => dropdown.classList.add('hidden');

      // Dropdown item click → update status + re-render (bound once)
      if (!dropdown._itemClickBound) {
          dropdown.addEventListener('click', (e) => {
              const item = e.target.closest('.quest-status-item');
              if (!item) return;
              e.stopPropagation();

              const newStatus = item.dataset.status;
              const blockId   = dropdown.dataset.blockId;
              if (!blockId) { closeDropdown(); return; }

              const blocks = JSON.parse(localStorage.getItem('userBlocks_tab3')) || [];
              const block  = blocks.find(b => b.id === blockId);
              if (!block) { closeDropdown(); return; }

              block.status = newStatus;
              localStorage.setItem('userBlocks_tab3', JSON.stringify(blocks));
              closeDropdown();

              import('./filterManager.js').then(({ filterManager }) => {
                  filterManager.applyFilters('3');
              });
          });
          dropdown._itemClickBound = true;
      }

      // Status pill click → position + open dropdown (bound once per resultsSection)
      if (!resultsSection._questPillDelegationBound) {
          resultsSection.addEventListener('click', (e) => {
              const pill = e.target.closest('.quest-status-pill');
              if (!pill) return;
              if (notesEditMode) return;
              e.stopPropagation();

              const rect = pill.getBoundingClientRect();
              dropdown.style.top  = `${rect.bottom + 5}px`;
              dropdown.style.left = `${rect.left}px`;
              dropdown.dataset.blockId = pill.dataset.id;

              const currentStatus = pill.dataset.status;
              dropdown.querySelectorAll('.quest-status-item').forEach(it => {
                  it.classList.toggle('selected', it.dataset.status === currentStatus);
              });

              dropdown.classList.remove('hidden');

              // One-shot close on next outside click
              setTimeout(() => {
                  document.addEventListener('click', closeDropdown, { once: true });
              }, 0);
          });
          resultsSection._questPillDelegationBound = true;
      }
  };


/* ==================================================================*/
/* ============================= BLOCKS =============================*/
/* ==================================================================*/

  // ── Pinned-block drag-to-reorder (pointer events for touch + mouse) ──
  // The pin button doubles as the drag handle: click = unpin, drag = reorder.
  // A 4px movement threshold distinguishes the two gestures.
  const PINNED_DRAG_THRESHOLD = 4;

  const initPinnedDragReorder = (zone) => {
      if (!zone || zone.querySelectorAll('.block.pinned').length < 2) return;
      if (zone._dragInitialized) return;
      zone._dragInitialized = true;

      let dragState = null;

      zone.addEventListener('pointerdown', (e) => {
          const pinBtn = e.target.closest('.pin-button');
          if (!pinBtn) return;
          const block = pinBtn.closest('.block.pinned');
          if (!block) return;

          e.preventDefault();

          dragState = {
              block,
              pinBtn,
              startX: e.clientX,
              startY: e.clientY,
              didDrag: false,
              placeholder: null,
              pointerId: e.pointerId
          };

          zone.setPointerCapture(e.pointerId);
      });

      zone.addEventListener('pointermove', (e) => {
          if (!dragState) return;
          const { block, startX, startY } = dragState;

          if (!dragState.didDrag) {
              const dx = Math.abs(e.clientX - startX);
              const dy = Math.abs(e.clientY - startY);
              if (dx < PINNED_DRAG_THRESHOLD && dy < PINNED_DRAG_THRESHOLD) return;

              // Crossed threshold — enter drag mode
              dragState.didDrag = true;

              const rect = block.getBoundingClientRect();

              const placeholder = document.createElement('div');
              placeholder.className = 'pinned-drag-placeholder';
              placeholder.style.height = rect.height + 'px';
              block.parentNode.insertBefore(placeholder, block);
              dragState.placeholder = placeholder;

              dragState.offsetY = e.clientY - rect.top;
              dragState.offsetX = e.clientX - rect.left;
              dragState.lastInsertBefore = undefined;

              // Move block to body with fixed positioning so it doesn't
              // affect the zone's scroll height
              block.classList.add('dragging');
              block.style.width = rect.width + 'px';
              block.style.position = 'fixed';
              block.style.top = rect.top + 'px';
              block.style.left = rect.left + 'px';
              block.style.zIndex = '100000';
              block.style.margin = '0';
              document.body.appendChild(block);
          }

          // Already in drag mode — reposition (viewport coords)
          block.style.top = (e.clientY - dragState.offsetY) + 'px';

          const siblings = [...zone.querySelectorAll('.block.pinned:not(.dragging)')];
          const dragMidY = e.clientY;
          let insertBefore = null;
          for (const sib of siblings) {
              const sibRect = sib.getBoundingClientRect();
              if (dragMidY < sibRect.top + sibRect.height * 0.35) {
                  insertBefore = sib;
                  break;
              }
          }

          // Only animate when the insertion point actually changes
          if (insertBefore !== dragState.lastInsertBefore) {
              dragState.lastInsertBefore = insertBefore;

              // FLIP: capture old positions
              const oldPositions = siblings.map(sib => ({
                  el: sib,
                  top: sib.getBoundingClientRect().top
              }));

              // Move placeholder to new position
              if (insertBefore) {
                  zone.insertBefore(dragState.placeholder, insertBefore);
              } else {
                  zone.appendChild(dragState.placeholder);
              }

              // FLIP: animate from old to new positions
              oldPositions.forEach(({ el, top: oldTop }) => {
                  const newTop = el.getBoundingClientRect().top;
                  const delta = oldTop - newTop;
                  if (Math.abs(delta) > 1) {
                      el.style.transition = 'none';
                      el.style.transform = `translateY(${delta}px)`;
                      void el.offsetHeight;
                      el.style.transition = 'transform 0.2s ease';
                      el.style.transform = '';
                  }
              });
          }
      });

      const endDrag = () => {
          if (!dragState) return;
          const { block, placeholder, didDrag, pinBtn } = dragState;

          if (didDrag && placeholder) {
              // Move block back into the zone from document.body
              zone.insertBefore(block, placeholder);
              placeholder.remove();

              block.classList.remove('dragging');
              block.style.position = '';
              block.style.top = '';
              block.style.left = '';
              block.style.width = '';
              block.style.zIndex = '';
              block.style.margin = '';

              // Clean up any residual FLIP styles on siblings
              zone.querySelectorAll('.block.pinned').forEach(b => {
                  b.style.transform = '';
                  b.style.transition = '';
              });

              const activeTab = getActiveTab();
              const newOrder = [...zone.querySelectorAll('.block.pinned')]
                  .map(b => b.getAttribute('data-id'));
              localStorage.setItem(`pinnedBlockOrder_${activeTab}`, JSON.stringify(newOrder));

          } else if (!didDrag && pinBtn) {
              // No movement — treat as a click to unpin
              dragState = null;
              pinBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              return;
          }

          dragState = null;
      };

      zone.addEventListener('pointerup', endDrag);
      zone.addEventListener('pointercancel', endDrag);
  };

  const renderBlocks = (tab = getActiveTab(), filteredBlocks = null, skipTagUpdate = false) => {
    console.log("🔍 Checking tab value:", tab, typeof tab);

    if (typeof tab !== "string") {
      console.error("❌ Error: 'tab' should be a string but got:", tab);
      tab = "tab4";
    }

// ── Session Log has its own render path ──────────────────────────
    if (tab === 'tab7') {
        renderSessionLog(filteredBlocks);
        return;
    }

        // ── Inventory has its own sectioned render path ───────────────────
    if (tab === 'tab6') {
        renderInventory(filteredBlocks);
        return;
    }

            // ── Notes has its own sectioned render path ───────────────────────
    if (tab === 'tab3') {
        renderNotes(filteredBlocks);
        return;
    }

    // ── Character sheet tabs have no block results ────────────────────
    if (tab === 'tab4' || tab === 'tab8') {
        initScrollFades('.saving-throws-and-skills-column-wrapper', '--skills-fade-top-opacity', '--skills-fade-bottom-opacity', '_skillsFadeHandler', 100);
        return;
    }

    const tabSuffix  = tab.replace("tab", "");
    const sectionId  = `results_section_${tabSuffix}`;
    const resultsSection = document.getElementById(sectionId);
    if (!resultsSection) return;

    // ── HEADER: create once, skip on subsequent renders ──────────────
    if (!resultsSection.querySelector('.results-header')) {

      const _filterTabs  = new Set(['tab3', 'tab6', 'tab7', 'tab9']);
      const _openBtnHTML = _filterTabs.has(tab)
          ? `<button class="filter-open-btn" data-tab="${tab}" title="Show filters">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            </button>`
          : '';

      const headerEl = document.createElement('div');
      headerEl.id = `results_header_${tabSuffix}`;
      headerEl.className = 'results-header';
      headerEl.innerHTML = `
        <div id="header-controls_${tabSuffix}" class="header-controls">
          <button id="results-sort-btn_${tabSuffix}" class="results-settings">
            <img src="./images/Sort_Icon.svg" alt="Sort icon">
          </button>
          <div id="sort-dropdown_${tabSuffix}" class="sort-dropdown hidden">
            <button class="sort-item" data-sort="newest">Newest</button>
            <button class="sort-item" data-sort="oldest">Oldest</button>
            <button class="sort-item" data-sort="alpha">A‑Z</button>
            <button class="sort-item" data-sort="unalpha">Z-A</button>
          </div>
          <button id="results-settings_${tabSuffix}" class="results-settings">
            <img src="./images/View_Icon.svg" alt="View‑state icon">
          </button>
          <div id="view-toggle-dropdown_${tabSuffix}" class="view-toggle-dropdown hidden">
            <button class="view-toggle-item" data-state="expanded">Expand</button>
            <button class="view-toggle-item" data-state="condensed">Condense</button>
            <button class="view-toggle-item" data-state="minimized">Minimize</button>
          </div>
          <button id="add_block_button" class="add-block-button green-button">+</button>
          ${_openBtnHTML}
        </div>
      `;
      resultsSection.prepend(headerEl);

      // ── Wire add button ──
      const addBtn = headerEl.querySelector('#add_block_button');
      if (addBtn) {
        addBtn.onclick = () => {
          if (tab === 'tab9') startInlineAdd();
        };
      }

      // ── Wire view dropdown ──
      const settingsBtn  = document.getElementById(`results-settings_${tabSuffix}`);
      const viewDropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
      const sortBtn      = document.getElementById(`results-sort-btn_${tabSuffix}`);
      const sortDropdown = document.getElementById(`sort-dropdown_${tabSuffix}`);

      const closeDropdowns = () => {
        viewDropdown.classList.add("hidden");
        sortDropdown.classList.add("hidden");
      };

      settingsBtn.addEventListener("click", e => {
        e.stopPropagation();
        const wasOpen = !viewDropdown.classList.contains("hidden");
        closeDropdowns();
        if (!wasOpen) {
          const rect = settingsBtn.getBoundingClientRect();
          viewDropdown.style.top  = `${rect.bottom + 5}px`;
          viewDropdown.style.left = `${rect.left}px`;
          viewDropdown.classList.remove("hidden");
        }
      });

      document.addEventListener("click", closeDropdowns);

      const savedView = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
      viewDropdown.querySelectorAll(".view-toggle-item").forEach(item => {
        const state = item.dataset.state;
        item.classList.toggle("selected", state === savedView);
        item.addEventListener("click", e => {
          e.stopPropagation();
          closeDropdowns();
          updateBlocksViewState(state);
          viewDropdown.querySelectorAll(".view-toggle-item")
            .forEach(i => i.classList.toggle("selected", i === item));
        });
      });

      // ── Wire sort dropdown ──
      const savedSortMode = localStorage.getItem(`activeSortOrder_${tab}`) || "newest";

      sortBtn.addEventListener("click", e => {
        e.stopPropagation();
        const wasOpen = !sortDropdown.classList.contains("hidden");
        closeDropdowns();
        if (!wasOpen) {
          const rect = sortBtn.getBoundingClientRect();
          sortDropdown.style.top  = `${rect.bottom + 5}px`;
          sortDropdown.style.left = `${rect.left}px`;
          sortDropdown.classList.remove("hidden");
        }
      });

      sortDropdown.querySelectorAll(".sort-item").forEach(item => {
        const mode = item.dataset.sort;
        item.classList.toggle("selected", mode === savedSortMode);
        item.addEventListener("click", e => {
          e.stopPropagation();
          localStorage.setItem(`activeSortOrder_${tab}`, mode);
          sortDropdown.querySelectorAll(".sort-item")
            .forEach(i => i.classList.toggle("selected", i === item));
          sortDropdown.classList.add("hidden");
          renderBlocks(tab, getBlocks(tab));
          updateTags();
          updateViewToggleDropdown(tabSuffix);
        });
      });

      // ── Event delegation: block expand/collapse toggle ──
      resultsSection.addEventListener("click", function(e) {
        const blockEl = e.target.closest('.block:not(.permanent-block)');
        if (!blockEl || !resultsSection.contains(blockEl)) return;

        if (e.target.closest('.block-actions') || e.target.closest('.actions-trigger')) return;
        if (e.target.classList.contains('circle')) return;
        if (blockEl.classList.contains('inline-editing')) return;

        if (!blockEl.classList.contains('condensed')) {
          const validTargets = ['.block', '.block-header', '.block-header-left'];
          const isEmptySpace = validTargets.some(sel =>
            e.target === blockEl.querySelector(sel) || e.target === blockEl
          );
          if (!isEmptySpace) return;
        }

        const blockId    = blockEl.getAttribute("data-id");
        const blocksArr  = getBlocks(tab);
        const targetBlock = blocksArr.find(b => b.id === blockId);
        if (!targetBlock) return;

        const isCollapsing = targetBlock.viewState === "expanded";

        if (isCollapsing) {
          const activeState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
          targetBlock.viewState = activeState;
        } else {
          targetBlock.viewState = "expanded";
        }

        localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));

        const doRerender = () => {
            import('./filterManager.js').then(({ filterManager }) => {
                filterManager.applyFilters(tabSuffix);
            });
        };

        if (isCollapsing) {
            animateBlockCollapse(blockEl, doRerender);
        } else {
            setPendingBlockAnim(blockId, blockEl.offsetHeight);
            doRerender();
        }
      });
    } // end header creation

    // ── BLOCK DATA ──────────────────────────────────────────────────
    const allBlocks     = getBlocks(tab);
    const pinnedBlocks  = allBlocks.filter(b => b.pinned);
    const displayBlocks = (filteredBlocks || allBlocks).filter(b => !b.pinned);

    const pinnedOrder = JSON.parse(localStorage.getItem(`pinnedBlockOrder_${tab}`) || '[]');
    pinnedBlocks.sort((a, b) => {
        const ai = pinnedOrder.indexOf(a.id);
        const bi = pinnedOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });

    console.log(`📦 Blocks to render for ${tab}:`, displayBlocks);

    // ── MAP EXISTING DOM BLOCKS ─────────────────────────────────────
    const existingDisplayEls = new Map();
    resultsSection.querySelectorAll(':scope > .block[data-id]').forEach(el => {
        if (!el.classList.contains('block-removing')) {
            existingDisplayEls.set(el.getAttribute('data-id'), el);
        }
    });

    const existingPinnedEls = new Map();
    const oldPinnedZone = resultsSection.querySelector('.pinned-blocks-zone');
    if (oldPinnedZone) {
        oldPinnedZone.querySelectorAll('.block[data-id]').forEach(el => {
            if (!el.classList.contains('block-removing')) {
                existingPinnedEls.set(el.getAttribute('data-id'), el);
            }
        });
    }

    // ── IDENTIFY & ANIMATE ORPHANS FIRST ────────────────────────────
    // Mark departing blocks before the sync loop so they collapse in-place
    // and the sync loop can skip over them when checking positions.
    const displayIdSet = new Set(displayBlocks.map(b => b.id));
    existingDisplayEls.forEach((el, id) => {
        if (!displayIdSet.has(id) && !el.classList.contains('inline-editing')) {
            el.classList.add('block-removing');
            const h = el.offsetHeight;
            el.style.maxHeight = h + 'px';
            el.style.overflow = 'hidden';
            el.style.pointerEvents = 'none';
            void el.offsetHeight;
            el.style.transition = 'opacity 0.35s ease, max-height 0.5s ease 0.1s, margin 0.5s ease 0.1s, padding 0.5s ease 0.1s';
            el.style.opacity = '0';
            el.style.maxHeight = '0';
            el.style.marginTop = '0';
            el.style.marginBottom = '0';
            el.style.paddingTop = '0';
            el.style.paddingBottom = '0';
            console.log('🗑️ Animating block removal:', id);
            setTimeout(() => el.remove(), 650);
        }
    });

    // ── SYNC PINNED ZONE ────────────────────────────────────────────
    let pinnedWrapper = resultsSection.querySelector('.pinned-blocks-zone-wrapper');
    if (pinnedBlocks.length > 0) {
        if (!pinnedWrapper) {
            pinnedWrapper = document.createElement('div');
            pinnedWrapper.className = 'pinned-blocks-zone-wrapper';
            pinnedWrapper.innerHTML = '<div class="pinned-blocks-zone"></div>';
            const header = resultsSection.querySelector('.results-header');
            if (header) header.after(pinnedWrapper);
            else resultsSection.prepend(pinnedWrapper);
        }
        const pinnedZone = pinnedWrapper.querySelector('.pinned-blocks-zone');

        pinnedBlocks.forEach(block => {
            const el = existingPinnedEls.get(block.id);
            const viewState = block.viewState || 'condensed';
            if (el && el.classList.contains(viewState)) {
                pinnedZone.appendChild(el);
                existingPinnedEls.delete(block.id);
            } else {
                if (el) { el.remove(); existingPinnedEls.delete(block.id); }
                pinnedZone.insertAdjacentHTML('beforeend', blockTemplate(block, tab));
            }
        });

        existingPinnedEls.forEach(el => {
            el.classList.add('block-removing');
            const h = el.offsetHeight;
            el.style.maxHeight = h + 'px';
            el.style.overflow = 'hidden';
            el.style.pointerEvents = 'none';
            void el.offsetHeight;
            el.style.transition = 'opacity 0.35s ease, max-height 0.5s ease 0.1s, margin 0.5s ease 0.1s, padding 0.5s ease 0.1s';
            el.style.opacity = '0';
            el.style.maxHeight = '0';
            el.style.marginTop = '0';
            el.style.marginBottom = '0';
            el.style.paddingTop = '0';
            el.style.paddingBottom = '0';
            setTimeout(() => el.remove(), 650);
        });

        initPinnedDragReorder(pinnedZone);
    } else if (pinnedWrapper) {
        pinnedWrapper.remove();
    }

    // ── SYNC DISPLAY BLOCKS (position-aware, skips departing blocks) ──
    let prevEl = resultsSection.querySelector('.pinned-blocks-zone-wrapper')
              || resultsSection.querySelector('.results-header');

    displayBlocks.forEach(block => {
        const el = existingDisplayEls.get(block.id);
        const viewState = block.viewState || 'condensed';

        if (el && el.classList.contains(viewState) && !el.classList.contains('block-removing')) {
            existingDisplayEls.delete(block.id);
            // Find expected next sibling, skipping over departing blocks
            let expectedNext = prevEl ? prevEl.nextElementSibling : resultsSection.firstElementChild;
            while (expectedNext && expectedNext.classList.contains('block-removing')) {
                expectedNext = expectedNext.nextElementSibling;
            }
            if (el !== expectedNext) {
                if (prevEl) prevEl.after(el);
                else resultsSection.prepend(el);
            }
            prevEl = el;
        } else if (el && !el.classList.contains('block-removing')) {
            // View state changed — rebuild instantly (collapse/expand animation is handled separately)
            existingDisplayEls.delete(block.id);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = blockTemplate(block, tab);
            const newEl = wrapper.firstElementChild;
            el.replaceWith(newEl);
            prevEl = newEl;
        } else if (!el) {
            // Genuinely new block — create with expand + fade in
            const wrapper = document.createElement('div');
            wrapper.innerHTML = blockTemplate(block, tab);
            const newEl = wrapper.firstElementChild;
            if (prevEl) prevEl.after(newEl);
            else resultsSection.prepend(newEl);
            const naturalHeight = newEl.scrollHeight;
            newEl.style.overflow = 'hidden';
            newEl.style.maxHeight = '0';
            newEl.style.opacity = '0';
            newEl.style.marginTop = '0';
            newEl.style.marginBottom = '0';
            newEl.style.paddingTop = '0';
            newEl.style.paddingBottom = '0';
            void newEl.offsetHeight;
            requestAnimationFrame(() => {
                newEl.style.transition = 'max-height 0.5s ease, opacity 0.4s ease 0.1s, margin 0.5s ease, padding 0.5s ease';
                newEl.style.maxHeight = naturalHeight + 'px';
                newEl.style.opacity = '1';
                newEl.style.marginTop = '0';
                newEl.style.marginBottom = '8px';
                newEl.style.paddingTop = '10px';
                newEl.style.paddingBottom = '10px';
                const cleanup = () => {
                    newEl.style.maxHeight = '';
                    newEl.style.overflow = '';
                    newEl.style.transition = '';
                    newEl.style.opacity = '';
                    newEl.style.marginTop = '';
                    newEl.style.marginBottom = '';
                    newEl.style.paddingTop = '';
                    newEl.style.paddingBottom = '';
                };
                newEl.addEventListener('transitionend', (e) => {
                    if (e.target === newEl && e.propertyName === 'max-height') cleanup();
                }, { once: true });
                setTimeout(cleanup, 600);
            });
            prevEl = newEl;
        }
    });

    // ── PLACEHOLDER ─────────────────────────────────────────────────
    let placeholder = resultsSection.querySelector('.results-placeholder');
    if (displayBlocks.length === 0 && pinnedBlocks.length === 0) {
      if (!placeholder) {
        placeholder = document.createElement('p');
        placeholder.classList.add('results-placeholder');
        placeholder.textContent = 'Use the + button to add items here…';
        placeholder.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
        resultsSection.appendChild(placeholder);
      }
    } else if (placeholder) {
      placeholder.remove();
    }

    // ── FADE OVERLAY (always last child for sticky bottom) ────────
    let fadeEl = resultsSection.querySelector('.results-fade');
    if (!fadeEl) {
        fadeEl = document.createElement('div');
        fadeEl.className = 'results-fade';
    }
    resultsSection.appendChild(fadeEl);

    // Control fade visibility based on actual overflow
    const updateFade = () => {
        const scrollableAmount = resultsSection.scrollHeight - resultsSection.clientHeight;
        if (scrollableAmount <= 5) {
            fadeEl.style.opacity = '0';
            return;
        }
        const distanceFromBottom = resultsSection.scrollHeight - resultsSection.scrollTop - resultsSection.clientHeight;
        fadeEl.style.opacity = Math.min(distanceFromBottom / 42, 1);
    };
    resultsSection.removeEventListener('scroll', resultsSection._resultsFadeHandler);
    resultsSection._resultsFadeHandler = updateFade;
    resultsSection.addEventListener('scroll', updateFade);
    updateFade();
    // Track scrollHeight changes during block animations (~700ms)
    if (resultsSection._fadeRAF) cancelAnimationFrame(resultsSection._fadeRAF);
    const startTime = performance.now();
    const trackFade = (now) => {
        updateFade();
        if (now - startTime < 700) resultsSection._fadeRAF = requestAnimationFrame(trackFade);
    };
    resultsSection._fadeRAF = requestAnimationFrame(trackFade);
    // Re-check on element size changes (window resize)
    if (!resultsSection._fadeResizeObserver) {
        resultsSection._fadeResizeObserver = new ResizeObserver(updateFade);
        resultsSection._fadeResizeObserver.observe(resultsSection);
    }
    // Re-check on content changes (blocks added/removed, style changes)
    if (!resultsSection._fadeMutationObserver) {
        let debounce = null;
        resultsSection._fadeMutationObserver = new MutationObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(updateFade, 50);
            setTimeout(updateFade, 350);
            setTimeout(updateFade, 600);
        });
        resultsSection._fadeMutationObserver.observe(resultsSection, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
    }

    applyInlineDiceRolls(resultsSection, tab);
    console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);

    if (!skipTagUpdate) updateTags();
    attachDynamicTooltips();
    initScrollFades('.filter-section',               '--filter-fade-top-opacity', '--filter-fade-bottom-opacity','_filterFadeHandler', 100);
    initScrollFades('.saving-throws-and-skills-column-wrapper', '--skills-fade-top-opacity', '--skills-fade-bottom-opacity', '_skillsFadeHandler', 100);
    initScrollFades('.roll-results', '--dice-fade-top-opacity', '--dice-fade-bottom-opacity', '_diceFadeHandler', 100);

    applyPendingBlockAnim();
  };

  const getBlocks = (tab = getActiveTab()) => {
    const storedBlocks  = localStorage.getItem(`userBlocks_${tab}`);
    const parsedBlocks  = storedBlocks ? JSON.parse(storedBlocks) : [];
    const sortMode      = localStorage.getItem(`activeSortOrder_${tab}`) || "newest";

    if (sortMode === "newest")  parsedBlocks.sort((a, b) => b.timestamp - a.timestamp);
    else if (sortMode === "oldest")  parsedBlocks.sort((a, b) => a.timestamp - b.timestamp);
    else if (sortMode === "alpha")   parsedBlocks.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === "unalpha") parsedBlocks.sort((a, b) => b.title.localeCompare(a.title));

    return parsedBlocks;
  };

/* ==================================================================*/
/* ========================== VIEWSTATES ============================*/
/* ==================================================================*/

  const updateBlocksViewState = (newState) => {
    const activeTab = getActiveTab();
    let blocks      = getBlocks(activeTab);

    blocks.forEach(b => b.viewState = newState);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(blocks));
    if (newState !== "expanded") {
      localStorage.setItem(`activeViewState_${activeTab}`, newState);
    }

    import('./filterManager.js').then(({ filterManager }) => {
        filterManager.applyFilters(activeTab.replace('tab', ''));
    });
  };

  function updateViewToggleDropdown(tabSuffix) {
    const dropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
    if (!dropdown) return;
    const activeTab = `tab${tabSuffix}`;
    const saved     = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";
    dropdown.querySelectorAll(".view-toggle-item").forEach(item => {
      item.classList.toggle("selected", item.dataset.state === saved);
    });
  }

/* =================================================================*/
/* ======================== DATA MANAGEMENT ========================*/
/* =================================================================*/

const saveBlock = (tab, blockTitle, text, tags, uses, properties = [], blockType = null, blockId = null, timestamp = null, inventoryExtras = null, tab3Extras = null) => {
    const blockTypesArr = Array.isArray(blockType) ? blockType : (blockType ? [blockType] : []);
    const textOptional  = tab === "tab6" || (tab === "tab3" && (blockTypesArr.includes("Quest") || blockTypesArr.includes("Map")));
    if (!blockTitle || (!textOptional && !text)) {
      console.error(textOptional ? "❌ Block title is required" : "❌ Block title and text are required");
      return false;
    }

    let userBlocks = getBlocks(tab);
    let newId = null;

    if (blockId) {
      const blockIndex = userBlocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        userBlocks[blockIndex] = {
          ...userBlocks[blockIndex],
          title: blockTitle, text, tags, uses, properties, blockType,
          timestamp: userBlocks[blockIndex].timestamp || Date.now(),
          ...(inventoryExtras || {}),
          ...(tab3Extras || {})
        };
      } else {
        console.error(`❌ Block with ID "${blockId}" not found in tab ${tab}.`);
        return false;
      }
    } else {
      const predefinedTagsMap = new Map(
        Object.values(categoryTags).flatMap(cat => cat.tags).map(tag => [tag.toLowerCase(), tag])
      );
      const formattedTags = tags.map(tag => {
        const predefined = predefinedTagsMap.get(tag.toLowerCase());
        return predefined || (tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
      });

      newId = crypto.randomUUID();
      userBlocks.unshift({
        id: newId,
        title: blockTitle, text,
        tags: formattedTags,
        uses, properties,
        blockType: blockType || null,
        timestamp: timestamp || Date.now(),
        viewState: "expanded",
        ...(inventoryExtras || {}),
        ...(tab3Extras || {})
      });
    }

    localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
    return blockId ? true : newId;
  };

  const removeBlock = (blockId, tabOverride = null) => {
    if (!blockId) return null;
    const activeTab  = tabOverride || getActiveTab();
    const userBlocks = getBlocks(activeTab);
    const idx        = userBlocks.findIndex(b => b.id === blockId);
    if (idx === -1) return null;
    const [removed]  = userBlocks.splice(idx, 1);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(userBlocks));
    return removed;
  };

  const restoreBlock = (block) => {
    if (!block) return false;
    const activeTab  = getActiveTab();
    const userBlocks = getBlocks(activeTab);
    userBlocks.unshift(block);
    localStorage.setItem(`userBlocks_${activeTab}`, JSON.stringify(userBlocks));
    return true;
  };
  
/* ==================================================================*/
/* =========================== TOOLTIPS =============================*/
/* ==================================================================*/

  let activeTooltip = null;

  function tooltipMouseEnter(e) {
    const el = e.currentTarget;
    if (el.scrollWidth <= el.clientWidth) return;
    clearTimeout(el._tooltipTimer);
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
    el._tooltipTimer = setTimeout(() => {
      const tip = document.createElement('div');
      tip.classList.add('text-tooltip');
      tip.textContent = el.textContent;
      document.body.appendChild(tip);
      const rect = el.getBoundingClientRect();
      tip.style.left = `${rect.left}px`;
      tip.style.top  = `${rect.bottom + 5}px`;
      activeTooltip = tip;
    }, 750);
  }

  function tooltipMouseLeave(e) {
    const el = e.currentTarget;
    clearTimeout(el._tooltipTimer);
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
  }

  function attachTooltipHandlers(nodes) {
    nodes.forEach(el => {
      el.removeEventListener('mouseenter', tooltipMouseEnter);
      el.removeEventListener('mouseleave', tooltipMouseLeave);
      el.addEventListener('mouseenter', tooltipMouseEnter);
      el.addEventListener('mouseleave', tooltipMouseLeave);
    });
  }

  ['scroll', 'resize', 'blur'].forEach(evt =>
    window.addEventListener(evt, () => {
      if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
    })
  );

  function attachDynamicTooltips() {
    attachTooltipHandlers(document.querySelectorAll('.block-title h4, .action-name, .action-description'));
  }

/* ==================================================================*/
/* ======================== HELPER FUNCTIONS ========================*/
/* ==================================================================*/

  // ── Inline block editing (tab9) ──────────────────────────────────
  let inlineEditState = null;

  const enterInlineEdit = (blockId, skipAnim = false) => {
      const tab = 'tab9';
      const blocksArr = getBlocks(tab);
      const block = blocksArr.find(b => b.id === blockId);
      if (!block) return;

      // If not expanded, expand first then re-enter — animate directly
      // to the edit-form height (not the intermediate expanded height)
      if (block.viewState !== 'expanded') {
          const oldHeight = document.querySelector(`.block[data-id="${blockId}"]`)?.offsetHeight || 0;
          block.viewState = 'expanded';
          localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));
          // Don't call setPendingBlockAnim — we animate after the edit form is in place
          import('./filterManager.js').then(({ filterManager }) => {
              filterManager.applyFilters('9');
              requestAnimationFrame(() => {
                  enterInlineEdit(blockId, true);
                  const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
                  if (blockEl) animateHeightTransition(blockEl, oldHeight);
              });
          });
          return;
      }

      const blockEl = document.querySelector(`.block[data-id="${blockId}"]`);
      if (!blockEl) return;

      // Capture height before replacing content for expand animation
      const oldHeight = blockEl.offsetHeight;

      // Snapshot for cancel
      inlineEditState = {
          blockId,
          snapshot: {
              title: block.title,
              text: block.text,
              tags: [...(block.tags || [])],
              blockType: Array.isArray(block.blockType) ? [...block.blockType] : (block.blockType ? [block.blockType] : []),
              uses: block.uses ? [...block.uses] : [],
              properties: block.properties ? [...block.properties] : [],
          }
      };

      blockEl.classList.add('inline-editing');

      const blockTags = block.tags || [];
      const blockTypes = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);

      // Block type buttons HTML
      const tabBTConfig = blockTypeConfig[tab];
      const blockTypeHTML = tabBTConfig
          ? tabBTConfig.types.map(type =>
              `<button class="tag-button ${tabBTConfig.className}${blockTypes.includes(type) ? ' selected' : ''}" data-tag="${type}">${type}</button>`
            ).join('')
          : '';

      const tagsHTML = buildTab9TagsHTML(tab, blockTags);

      const bodyHTML = sanitizeBlockHTML(block.text);

      const usesKey = `inline_edit_uses_${blockId}`;
      localStorage.setItem(usesKey, JSON.stringify(block.uses || []));

      blockEl.innerHTML = `
              <div class="block-header">
                  <div class="block-header-left">
                      <div class="block-title"><h4 contenteditable="true" class="inline-edit-title">${block.title}</h4></div>
                  </div>
                  <div class="inline-edit-controls">
                      <button class="button green-button inline-edit-save">Save</button>
                      <button class="button red-button inline-edit-cancel">Cancel</button>
                  </div>
              </div>
              <div class="inline-edit-block-types">${blockTypeHTML}</div>
              <div class="uses-field inline-edit-uses"></div>
              <div class="inline-edit-tags">${tagsHTML}</div>
              <div class="block-properties inline-edit-properties">${(block.properties || []).map(p =>
                  `<span class="block-property-wrap"><span class="block-property" contenteditable="true">${p}</span><span class="property-remove-btn">×</span></span>`
              ).join('')}<span class="block-property inline-edit-new-prop"></span></div>
              <div class="block-body"><span contenteditable="true" class="inline-edit-body">${bodyHTML}</span></div>
      `;

      wireTab9FormHandlers(blockEl, usesKey);

      // ── Save / Cancel ──
      const doSave = () => {
          const data = collectTab9FormData(blockEl, usesKey);
          if (!data) return;
          inlineEditState = null;
          saveBlock(tab, data.title, data.text, data.tags, data.uses, data.properties, data.blockType, blockId, block.timestamp);
          setPendingBlockAnim(blockId, blockEl.offsetHeight);
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('9'));
      };

      const doCancel = () => {
          inlineEditState = null;
          setPendingBlockAnim(blockId, blockEl.offsetHeight);
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters('9'));
      };

      wireEditControls(blockEl, {
          saveSel: '.inline-edit-save', cancelSel: '.inline-edit-cancel',
          onSave: doSave, onCancel: doCancel,
      });

      focusAndCursorToEnd(blockEl.querySelector('.inline-edit-title'));

      if (!skipAnim) animateHeightTransition(blockEl, oldHeight);
  };

    const startInlineAdd = () => {
      const tab = 'tab9';

      const tabBTConfig = blockTypeConfig[tab];
      const blockTypeHTML = tabBTConfig
          ? tabBTConfig.types.map(type =>
              `<button class="tag-button ${tabBTConfig.className}" data-tag="${type}">${type}</button>`
            ).join('')
          : '';

      const tagsHTML = buildTab9TagsHTML(tab);

      const usesKey = `inline_add_uses_new`;
      localStorage.setItem(usesKey, JSON.stringify([]));

      const blockEl = document.createElement('div');
      blockEl.className = 'block expanded inline-editing';
      blockEl.setAttribute('data-id', 'new-inline-add');

      blockEl.innerHTML = `
              <div class="block-header">
                  <div class="block-header-left">
                      <div class="block-title"><h4 contenteditable="true" class="inline-edit-title"></h4></div>
                  </div>
                  <div class="inline-edit-controls">
                      <button class="button green-button inline-edit-save">Save</button>
                      <button class="button red-button inline-edit-cancel">Cancel</button>
                  </div>
              </div>
              <div class="inline-edit-block-types">${blockTypeHTML}</div>
              <div class="uses-field inline-edit-uses"></div>
              <div class="inline-edit-tags">${tagsHTML}</div>
              <div class="block-properties inline-edit-properties"><span class="block-property inline-edit-new-prop"></span></div>
              <div class="block-body"><span contenteditable="true" class="inline-edit-body"></span></div>
      `;

      const tabSuffix = tab.replace('tab', '');
      const resultsSection = document.getElementById(`results_section_${tabSuffix}`);
      if (!resultsSection) return;
      const pinnedZone = resultsSection.querySelector('.pinned-blocks-zone-wrapper');
      if (pinnedZone) { pinnedZone.after(blockEl); } else { resultsSection.prepend(blockEl); }

      blockEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      wireTab9FormHandlers(blockEl, usesKey);

      const doSave = () => {
          const data = collectTab9FormData(blockEl, usesKey);
          if (!data) return;
          saveBlock(tab, data.title, data.text, data.tags, data.uses, data.properties, data.blockType);
          import('./filterManager.js').then(({ filterManager }) => filterManager.applyFilters(tabSuffix));
      };

      const doCancel = () => {
          localStorage.removeItem(usesKey);
          blockEl.remove();
      };

      wireEditControls(blockEl, {
          saveSel: '.inline-edit-save', cancelSel: '.inline-edit-cancel',
          onSave: doSave, onCancel: doCancel,
      });

      const titleInput = blockEl.querySelector('.inline-edit-title');
      if (titleInput) titleInput.focus();
  };

  return {
    getActiveTab,
    renderBlocks,
    getBlocks,
    updateBlocksViewState,
    updateViewToggleDropdown,
    updateTags,
    getTags,
    saveBlock,
    removeBlock,
    restoreBlock,
    setActiveInventoryBlock,
    setActiveNotesBlock,
    enterInlineEdit,
    startInlineAdd,
    enterInventoryEdit,
    startInventoryAdd,
    enterNotesEdit,
    startNotesAdd,
  };
})();