// appManager.js
import { categoryTags, blockTypeConfig } from './tagConfig.js';
import { blockTemplate } from './blockTemplate.js';
import { overlayHandler, initUsesField, initToolbarForEditor } from './overlayHandler.js';
import { applyInlineDiceRolls } from './diceRoller.js';
import { filterManager } from './filterManager.js';
import { blockActionsHandler } from './blockActionsHandler.js';

const normalizeTag = tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();

export function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

export function initDragToScroll() {
    let isDown   = false;
    let moved    = false;
    let startX, startY, scrollEl, initScrollLeft, initScrollTop;

    document.addEventListener('mousedown', e => {
        const el = e.target.closest(
            '.pinned-blocks-zone, .results-section:not(.character-sheet-results), .filter-section, .saving-throws-and-skills-column-wrapper, ' +
            '.qr-blocks-scroll, .qr-tags-scroll, .session-log-viewer, .roll-results'
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

export let selectedFilterTagsBeforeAdd = [];

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
        });
    };
    delay ? setTimeout(run, delay) : run();
}

export const CLEAR_SEARCH_SVG = `<svg class="clear-icon" viewBox="0 0 24 24" fill="none"><line x1="18" y1="6" x2="6" y2="18" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke-linecap="round"/></svg>`;

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
      addBlockOverlay: document.querySelector(".add-block-overlay"),
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
  let userBlocks = JSON.parse(localStorage.getItem("userBlocks")) || [];
  let title = localStorage.getItem("pageTitle") || "Information Blocks";

  // ── Session Log viewer state ─────────────────────────────────────
  let activeSessionLogBlockId = null;
  let sessionViewerEditMode   = false;
  let pendingEditMode         = false;
  let sessionListCollapsed    = localStorage.getItem('sessionListCollapsed') === 'true';

/* ==================================================================*/
/* ============================== TAGS ==============================*/
/* ==================================================================*/

  const renderTags = (tags, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    const predefinedTagsSet = new Set(Object.values(categoryTags).flatMap(data => data.tags));
    const userGeneratedTags = tags
      .filter(tag => !predefinedTagsSet.has(tag))
      .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase())
      .sort((a, b) => a.localeCompare(b));
    const predefinedTags = tags.filter(tag => predefinedTagsSet.has(tag));

    container.innerHTML = [...predefinedTags, ...userGeneratedTags]
      .map(tag => {
        const category = Object.entries(categoryTags).find(([_, data]) => data.tags.includes(tag));
        const tagClass = category ? category[1].className : "tag-user";
        return `<button class="tag-button ${tagClass}" data-tag="${tag}">${tag}</button>`;
      })
      .join("");

    console.log("✅ Final Rendered Tags");
  };

  // updateTags renders tag HTML without any selected-state classes.
  // filterManager._applySelectionClasses() applies those after every render.
  const updateTags = () => {
    const activeTab = getActiveTab();
    const tabSuffix = activeTab.replace("tab", "");

    function injectChipsForCollapsedGroups(container) {
      // Chips for collapsed accordion groups — selected state re-applied by filterManager
      container.querySelectorAll('.tag-accordion-group:not(.open)').forEach(group => {
        group.querySelector('.tag-accordion-pill')
          ?.querySelectorAll('.tag-accordion-chip').forEach(c => c.remove());
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
      html += `<button class="tag-accordion-pill" data-category="${category}">${label}</button>`;
      html += `<div class="tag-accordion-body" id="${category}_tags_list_${tabSuffix}">`;
      html += `<span class="tag-accordion-label">${label}</span>`;
      html += usedPredefined.map(tag =>
        `<button class="tag-button ${className}" data-tag="${tag}">${tag}</button>`
      ).join("");
      html += `</div></div>`;
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

      // Build body (same transforms as blockTemplate)
      let bodyHTML = block.text || '';
      bodyHTML = bodyHTML
          .replace(/<div[^>]*>/gi, '')
          .replace(/^(&nbsp;|\s)+/gi, '')
          .replace(/<\/div>/gi, '<br>')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/p>/gi, '<br>')
          .trim();

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
      initScrollFades('.results-section', null, '--results-fade-opacity', '_scrollFadeHandler');
      document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: 'tab7' } }));
  };  let renderAbortController = null;

/* ==================================================================*/
/* ============================= BLOCKS =============================*/
/* ==================================================================*/

  /* ==================================================================*/
  /* ====================== QUICK-REF PANEL ===========================*/
  /* ==================================================================*/

  const QR_CHAR_TABS    = new Set(['tab4', 'tab8']);
  const QR_ACTION_TAGS  = ['Action', 'Reaction', 'Bonus action', 'Free action', 'Check', 'Save'];
  const QR_ABILITY_TAGS = ['Buff', 'Debuff', 'Heal', 'Movement', 'Ranged', 'Melee', 'Spell', 'Utility', 'AC'];

  // Per-tab filter state — persists across re-renders (e.g. when tab9 changes in landscape)
  const qrState = {};

  const getQrState = (charTab) => {
    if (!qrState[charTab]) qrState[charTab] = { query: '', expandedIds: new Set() };
    return qrState[charTab];
  };

  const renderBlocks = (tab = getActiveTab(), filteredBlocks = null) => {
    console.log("🔍 Checking tab value:", tab, typeof tab);

    if (renderAbortController) renderAbortController.abort();
    renderAbortController = new AbortController();
    const signal = renderAbortController.signal;

    if (typeof tab !== "string") {
      console.error("❌ Error: 'tab' should be a string but got:", tab);
      tab = "tab4";
    }

        // ── Session Log has its own render path ──────────────────────────
    if (tab === 'tab7') {
        renderSessionLog(filteredBlocks);
        return;
    }

        // ── Character sheet tabs get the quick-ref panel ──────────────────
    if (QR_CHAR_TABS.has(tab)) {
        renderQuickRef(tab);
        return;
    }

    const tabSuffix  = tab.replace("tab", "");
    const sectionId  = `results_section_${tabSuffix}`;
    const resultsSection = document.getElementById(sectionId);
    if (!resultsSection) return;

    const _filterTabs  = new Set(['tab3', 'tab6', 'tab7', 'tab9']);
    const _openBtnHTML = _filterTabs.has(tab)
        ? `<button class="filter-open-btn" data-tab="${tab}" title="Show filters">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"/>
              </svg>
          </button>`
        : '';

resultsSection.innerHTML = `
      <div id="results_header_${tabSuffix}" class="results-header">
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
      </div>
    `;
        
    const addBtn = document.getElementById(`results_header_${tabSuffix}`)
      .querySelector('#add_block_button');
    if (addBtn) {
      addBtn.onclick = () => {
        overlayHandler.initializeOverlayTagHandlers("add_block_overlay_tags");
        document.querySelector('.add-block-overlay').classList.add('show');
      };
    }

    const settingsBtn  = document.getElementById(`results-settings_${tabSuffix}`);
    const viewDropdown = document.getElementById(`view-toggle-dropdown_${tabSuffix}`);
    const activeTab    = tab;
    const savedView    = localStorage.getItem(`activeViewState_${activeTab}`) || "condensed";

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

    document.addEventListener("click", closeDropdowns, { signal });

    viewDropdown.querySelectorAll(".view-toggle-item").forEach(item => {
      const state = item.dataset.state;
      item.classList.toggle("selected", state === savedView);
      item.addEventListener("click", e => {
        e.stopPropagation();
        closeDropdowns();
        updateBlocksViewState(state);
        viewDropdown.querySelectorAll(".view-toggle-item")
          .forEach(i => i.classList.toggle("selected", i === item));
        viewDropdown.classList.add("hidden");
      });
    });

    const sortBtn       = document.getElementById(`results-sort-btn_${tabSuffix}`);
    const sortDropdown  = document.getElementById(`sort-dropdown_${tabSuffix}`);
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

    if (tab === "tab6") {
      const permanentItems  = [
        { id: "perm1", defaultValue: "00" },
        { id: "perm2", defaultValue: "00" },
        { id: "perm3", defaultValue: "00" }
      ];
      const colorClasses = { perm1: "gold-bg", perm2: "silver-bg", perm3: "copper-bg" };

      let permanentHTML = "";
      permanentItems.forEach(({ id, defaultValue }) => {
        const savedValue = localStorage.getItem(`permanentItem_${id}`) || defaultValue;
        permanentHTML += `
          <div class="block minimized permanent-block ${colorClasses[id]}" data-id="${id}">
            <h4 class="permanent-title" contenteditable="true">${savedValue}</h4>
          </div>
        `;
      });
      resultsSection.insertAdjacentHTML("beforeend", `<div class="permanent-items-container">${permanentHTML}</div>`);
    }

    const allBlocks     = getBlocks(tab);
    const pinnedBlocks  = allBlocks.filter(b => b.pinned);
    const displayBlocks = (filteredBlocks || allBlocks).filter(b => !b.pinned);

    console.log(`📦 Blocks to render for ${tab}:`, displayBlocks);

    if (pinnedBlocks.length > 0) {
      const pinnedHTML = pinnedBlocks.map(b => blockTemplate(b, tab)).join('');
      resultsSection.insertAdjacentHTML('beforeend', `<div class="pinned-blocks-zone-wrapper"><div class="pinned-blocks-zone">${pinnedHTML}</div></div>`);
    }

    if (displayBlocks.length === 0 && pinnedBlocks.length === 0) {
      const p = document.createElement('p');
      p.classList.add('results-placeholder');
      p.textContent = 'Use the + button to add items here…';
      p.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;opacity:0.25;';
      resultsSection.appendChild(p);
    }

    displayBlocks.forEach(block => {
      resultsSection.insertAdjacentHTML('beforeend', blockTemplate(block, tab));
    });

    applyInlineDiceRolls(resultsSection, tab);
    console.log(`✅ UI updated: Blocks re-rendered for ${tab}`);

    if (tab === "tab6") {
      resultsSection.querySelectorAll(".permanent-title").forEach(titleEl => {
        titleEl.addEventListener("blur", () => {
          const blockId = titleEl.parentElement.getAttribute("data-id");
          localStorage.setItem(`permanentItem_${blockId}`, titleEl.textContent.trim());
        });
      });
    }

    // Click-to-toggle view for non-permanent blocks
    document.querySelectorAll(`#${sectionId} .block:not(.permanent-block)`)
      .forEach(blockEl => {
        blockEl.addEventListener("click", function(e) {
          const validTargets = ['.block', '.block-header', '.block-header-left'];
          const isEmptySpace = validTargets.some(sel =>
            e.target === blockEl.querySelector(sel) || e.target === blockEl
          );
          if (!isEmptySpace) return;

          const blockId    = blockEl.getAttribute("data-id");
          const blocksArr  = getBlocks(tab);
          const targetBlock = blocksArr.find(b => b.id === blockId);
          if (!targetBlock) return;

          if (targetBlock.viewState === "expanded") {
            const activeState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
            targetBlock.viewState = activeState;
          } else {
            targetBlock.viewState = "expanded";
          }

          localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(blocksArr));

          // Re-run filters through filterManager so OR/AND state and search are preserved
          import('./filterManager.js').then(({ filterManager }) => {
            filterManager.applyFilters(tabSuffix);
          });
        });
      });

    updateTags();
    attachDynamicTooltips();
    initScrollFades('.results-section',              null,                        '--results-fade-opacity',      '_scrollFadeHandler');
    initScrollFades('.filter-section',               '--filter-fade-top-opacity', '--filter-fade-bottom-opacity','_filterFadeHandler', 100);
    initScrollFades('.saving-throws-and-skills-column-wrapper', '--skills-fade-top-opacity', '--skills-fade-bottom-opacity', '_skillsFadeHandler', 100);
    initScrollFades('.roll-results', '--dice-fade-top-opacity', '--dice-fade-bottom-opacity', '_diceFadeHandler', 100);

    // When tab9 changes, refresh any currently-visible quick-ref panels
    if (tab === 'tab9') {
      QR_CHAR_TABS.forEach(charTab => {
        const tabEl = document.getElementById(charTab);
        if (tabEl && tabEl.style.display !== 'none') renderQuickRef(charTab);
      });
    }
  };

  /* ==================================================================*/
  /* ================== QUICK-REF HELPER FUNCTIONS ====================*/
  /* ==================================================================*/

  const buildQrBlockHTML = (block, expanded) => {
    const usesHTML = block.uses
      ? block.uses.map(state =>
          `<span class="circle ${state ? 'unfilled' : 'filled'}"></span>`
        ).join('')
      : '';

    const headerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <div class="block-title"><h4>${block.title}</h4></div>
          ${usesHTML ? `<div class="block-uses">${usesHTML}</div>` : ''}
        </div>
      </div>`;

    if (!expanded) return headerHTML;

    const blockTypes = Array.isArray(block.blockType)
      ? block.blockType
      : (block.blockType ? [block.blockType] : []);

    const blockTypeHTML = blockTypes
      .map(bt => `<button class="tag-button tag-characterType" data-tag="${bt}">${bt}</button>`)
      .join('');

    const tabPredefinedTags = Object.entries(categoryTags)
      .filter(([, data]) => data.tabs.includes('tab9'))
      .flatMap(([, data]) => data.tags);

    const predefinedTagsHTML = Object.entries(categoryTags)
      .filter(([, data]) => data.tabs.includes('tab9'))
      .flatMap(([, data]) =>
        data.tags
          .filter(tag => block.tags.includes(tag))
          .map(tag => `<button class="tag-button ${data.className}" data-tag="${tag}">${tag}</button>`)
      ).join('');

    const userTagsHTML = block.tags
      .filter(t => !tabPredefinedTags.includes(t))
      .map(t => `<button class="tag-button tag-user" data-tag="${t}">${t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}</button>`)
      .join('');

    const hasAnyTags = blockTypeHTML || predefinedTagsHTML || userTagsHTML;
    const tagsHTML = hasAnyTags
      ? `<div class="block-tags">${blockTypeHTML}${predefinedTagsHTML}${userTagsHTML}</div>`
      : '';

    const propertiesHTML = block.properties && block.properties.length > 0
      ? `<div class="block-properties">${block.properties.map(p => `<span class="block-property">${p}</span>`).join('')}</div>`
      : '';

    let bodyText = block.text || '';
    bodyText = bodyText
      .replace(/<div[^>]*>/gi, '')
      .replace(/^(&nbsp;|\s)+/gi, '')
      .replace(/<\/div>/gi, '<br>')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '<br>')
      .trim();
    const bodyHTML = bodyText ? `<div class="block-body"><span>${bodyText}</span></div>` : '';

    return headerHTML + tagsHTML + propertiesHTML + bodyHTML;
  };

  const refilterQr = (charTab) => {
    const state    = getQrState(charTab);
    const tabSuffix = charTab.replace('tab', '');
    const blocksDiv = document.getElementById(`qr_blocks_${tabSuffix}`);
    if (!blocksDiv) return;

    let filtered = getBlocks('tab9');

    if (state.query) {
      const q = state.query.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        stripHTML(b.text || '').toLowerCase().includes(q) ||
        (b.properties || []).some(p => p.toLowerCase().includes(q))
      );
    }

    const andTags = filterManager.getAndTags(charTab);
    const orTags  = filterManager.getOrTags(charTab);

    const tab9Types      = blockTypeConfig['tab9']?.types || [];
    const andBlockTypes  = andTags.filter(t => tab9Types.includes(t));
    const orBlockTypes   = orTags.filter(t => tab9Types.includes(t));
    const regularAndTags = andTags.filter(t => !tab9Types.includes(t));
    const regularOrTags  = orTags.filter(t => !tab9Types.includes(t));

    if (regularAndTags.length > 0) {
      filtered = filtered.filter(b =>
        regularAndTags.every(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
      );
    }
    if (regularOrTags.length > 0) {
      filtered = filtered.filter(b =>
        regularOrTags.some(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
      );
    }
    if (andBlockTypes.length > 0) {
      filtered = filtered.filter(b => {
        const types = Array.isArray(b.blockType) ? b.blockType : (b.blockType ? [b.blockType] : []);
        return andBlockTypes.every(t => types.includes(t));
      });
    }
    if (orBlockTypes.length > 0) {
      filtered = filtered.filter(b => {
        const types = Array.isArray(b.blockType) ? b.blockType : (b.blockType ? [b.blockType] : []);
        return orBlockTypes.some(t => types.includes(t));
      });
    }

    blocksDiv.innerHTML = '';

    if (filtered.length === 0) {
      const p = document.createElement('p');
      p.classList.add('results-placeholder');
      p.style.cssText = 'text-align:center;opacity:0.25;padding:30px 0;';
      p.textContent = 'No matching abilities';
      blocksDiv.appendChild(p);
      return;
    }

    filtered.forEach(block => {
      const expanded = state.expandedIds.has(block.id);
      const el = document.createElement('div');
      el.className = `block ${expanded ? 'expanded' : 'condensed'}`;
      el.dataset.qrId = block.id;
      el.innerHTML = buildQrBlockHTML(block, expanded);
      blocksDiv.appendChild(el);
    });
    applyInlineDiceRolls(blocksDiv, charTab);
    filterManager.applySelectionClasses(charTab);
    initScrollFades('.qr-blocks-scroll', '--qr-fade-top-opacity', '--qr-fade-bottom-opacity', '_qrScrollFadeHandler');
  };

  const wireQrEvents = (section, charTab, tabSuffix) => {
    const state     = getQrState(charTab);
    const searchEl  = document.getElementById(`qr_search_${tabSuffix}`);
    const clearEl   = document.getElementById(`qr_clear_${tabSuffix}`);
    const blocksDiv = document.getElementById(`qr_blocks_${tabSuffix}`);

    setupSearchInput(
      searchEl,
      clearEl,
      (value) => { state.query = value; refilterQr(charTab); },
      ()      => { state.query = '';    refilterQr(charTab); }
    );

    // Delegated listener on blocks area — expand/collapse only; tag clicks handled by filterManager
    blocksDiv?.addEventListener('click', e => {
      if (e.target.closest('.tag-button[data-tag]')) return;

      // Expand / collapse block on header / empty space click
      const blockEl = e.target.closest('.block[data-qr-id]');
      if (!blockEl) return;
      const validTargets = ['.block', '.block-header', '.block-header-left', '.block-title'];
      const isEmptySpace = validTargets.some(sel => {
        const node = blockEl.querySelector(sel);
        return e.target === blockEl || e.target === node;
      });
      if (!isEmptySpace) return;

      const id    = blockEl.dataset.qrId;
      const block = getBlocks('tab9').find(b => b.id === id);
      if (!block) return;

      const isExpanded = blockEl.classList.contains('expanded');
      if (isExpanded) {
        state.expandedIds.delete(id);
        blockEl.classList.replace('expanded', 'condensed');
      } else {
        state.expandedIds.add(id);
        blockEl.classList.replace('condensed', 'expanded');
      }
      blockEl.innerHTML = buildQrBlockHTML(block, !isExpanded);
      if (!isExpanded) {
          applyInlineDiceRolls(blockEl, charTab);
          filterManager.applySelectionClasses(charTab);
      }
      document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: charTab } }));
    });

    // Horizontal fades on tag scroll row
    const tagsScroll  = section.querySelector('.qr-tags-scroll');
    const tagsWrapper = section.querySelector('.qr-tags-scroll-wrapper');

    const updateTagFades = () => {
      if (!tagsScroll || !tagsWrapper) return;
      const left    = tagsScroll.scrollLeft;
      const maxLeft = tagsScroll.scrollWidth - tagsScroll.clientWidth;
      tagsWrapper.style.setProperty('--qr-tags-fade-left',  Math.min(left / 30, 1));
      tagsWrapper.style.setProperty('--qr-tags-fade-right', Math.min((maxLeft - left) / 30, 1));
    };

    tagsScroll?.addEventListener('scroll', updateTagFades);
    updateTagFades();

    // Redirect vertical wheel to horizontal scroll when hovering over tag row
    tagsWrapper?.addEventListener('wheel', e => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        tagsScroll.scrollLeft += e.deltaY;
        updateTagFades();
      }
    }, { passive: false });
  };

  const renderQuickRef = (charTab) => {
    const tabSuffix = charTab.replace('tab', '');
    const section   = document.getElementById(`results_section_${tabSuffix}`);
    if (!section) return;

    const state = getQrState(charTab);

  const andTags = filterManager.getAndTags(charTab);
    const orTags  = filterManager.getOrTags(charTab);

    const actionPillsHTML = QR_ACTION_TAGS.map(tag =>
      `<button class="tag-button tag-actionType${andTags.includes(tag) ? ' selected' : orTags.includes(tag) ? ' selected-or' : ''}" data-tag="${tag}">${tag}</button>`
    ).join('');

    const abilityPillsHTML = QR_ABILITY_TAGS.map(tag =>
      `<button class="tag-button tag-abilityType${andTags.includes(tag) ? ' selected' : orTags.includes(tag) ? ' selected-or' : ''}" data-tag="${tag}">${tag}</button>`
    ).join('');
    
    section.innerHTML = `
      <div class="qr-filter-row">
        <div class="search-container" style="width:160px;flex-shrink:0;">
          <input id="qr_search_${tabSuffix}" class="search_input" type="text" placeholder="Search…" value="${state.query}" />
          <button class="clear-search" id="qr_clear_${tabSuffix}">
            ${CLEAR_SEARCH_SVG}
          </button>
        </div>
        <div class="qr-tags-scroll-wrapper">
          <div class="qr-tags-scroll" id="qr_tags_${tabSuffix}">
            <div class="vertical-break" style="height:22px;flex-shrink:0;"></div>
            ${actionPillsHTML}
            <div class="vertical-break" style="height:22px;flex-shrink:0;"></div>
            ${abilityPillsHTML}
          </div>
        </div>
      </div>
      <div class="qr-blocks-scroll" id="qr_blocks_${tabSuffix}"></div>
    `;

    refilterQr(charTab);
    wireQrEvents(section, charTab, tabSuffix);
    initScrollFades('.qr-blocks-scroll', '--qr-fade-top-opacity', '--qr-fade-bottom-opacity', '_qrScrollFadeHandler', 100);
    initScrollFades('.saving-throws-and-skills-column-wrapper', '--skills-fade-top-opacity', '--skills-fade-bottom-opacity', '_skillsFadeHandler', 100);
  };


  const loadBlocks = () => {
    const savedBlocks = localStorage.getItem("userBlocks");
    if (savedBlocks) {
      const parsedBlocks = JSON.parse(savedBlocks);
      if (Array.isArray(parsedBlocks)) {
        userBlocks = parsedBlocks;
        console.log("Blocks loaded from localStorage:", userBlocks);
        return;
      }
    }
    console.log("No valid 'userBlocks' found in localStorage");
  };

  let currentSortMode = "newest";

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

  const clearToggleClasses = () => {
    document.getElementById("view_condensed_button")?.classList.remove("active");
    document.getElementById("view_minimized_button")?.classList.remove("active");
  };

  document.getElementById("view_expanded_button")?.addEventListener("click", () => {
    updateBlocksViewState("expanded");
  });
  document.getElementById("view_condensed_button")?.addEventListener("click", () => {
    updateBlocksViewState("condensed");
    clearToggleClasses();
    document.getElementById("view_condensed_button")?.classList.add("active");
  });
  document.getElementById("view_minimized_button")?.addEventListener("click", () => {
    updateBlocksViewState("minimized");
    clearToggleClasses();
    document.getElementById("view_minimized_button")?.classList.add("active");
  });

  const tab = getActiveTab();
  const savedViewState = localStorage.getItem(`activeViewState_${tab}`) || "condensed";
  document
    .querySelectorAll(`#view-toggle-dropdown_${tab.replace("tab","")} .view-toggle-item`)
    .forEach(item => {
      item.classList.toggle(item.dataset.state === savedViewState);
    });

/* =================================================================*/
/* ======================== DATA MANAGEMENT ========================*/
/* =================================================================*/

  const saveBlock = (tab, blockTitle, text, tags, uses, properties = [], blockType = null, blockId = null, timestamp = null) => {
    if (!blockTitle || (tab !== "tab6" && !text)) {
      console.error(tab === "tab6" ? "❌ Block title is required for Tab 6" : "❌ Block title and text are required");
      return false;
    }

    let userBlocks = getBlocks(tab);

    if (blockId) {
      const blockIndex = userBlocks.findIndex(block => block.id === blockId);
      if (blockIndex !== -1) {
        userBlocks[blockIndex] = {
          ...userBlocks[blockIndex],
          title: blockTitle, text, tags, uses, properties, blockType,
          timestamp: userBlocks[blockIndex].timestamp || Date.now()
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

      userBlocks.unshift({
        id: crypto.randomUUID(),
        title: blockTitle, text,
        tags: formattedTags,
        uses, properties,
        blockType: blockType || null,
        timestamp: timestamp || Date.now(),
        viewState: "expanded"
      });
    }

    localStorage.setItem(`userBlocks_${tab}`, JSON.stringify(userBlocks));
    return true;
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

  const clearFilters = () => {
    const activeTab   = getActiveTab();
    const tabNumber   = activeTab.replace("tab", "");
    const searchInput = document.getElementById(`search_input_${tabNumber}`);
    if (searchInput) searchInput.value = "";
    // Use dynamic import to avoid circular dependency
    import('./filterManager.js').then(({ filterManager }) => {
      filterManager.clearSelectedTags(activeTab);
      filterManager.applyFilters(tabNumber);
    });
  };

  const clearData = () => {
    userBlocks = [];
    title      = "Information Blocks";
    localStorage.removeItem("userBlocks");
    localStorage.removeItem("pageTitle");
    document.querySelectorAll(".circle").forEach(circle => circle.classList.remove("filled"));
    document.querySelector("header.title-section h1").textContent = "INFORMATION BLOCKS";
    renderBlocks([]);
    updateTags();
  };

  return {
    getActiveTab,
    renderBlocks,
    renderQuickRef,
    loadBlocks,
    getBlocks,
    updateBlocksViewState,
    updateViewToggleDropdown,
    renderTags,
    updateTags,
    getTags,
    saveBlock,
    removeBlock,
    restoreBlock,
    clearFilters,
    clearData,
  };
})();