// filterManager.js  (replaces tagHandler.js)

import { categoryTags, blockTypeConfig } from './tagConfig.js';

// Inlined to avoid importing appManager (would cause circular dependency)
function stripHTML(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || tmp.innerText || '';
}

const normalizeTag = t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

// Registered once at startup from main.js — breaks the circular dependency
let _renderBlocks = null;
let _updateTags   = null;
let _getBlocks    = null;

// ── Filter state ───────────────────────────────────────────────────────────────
let selectedAndTagsByTab = {};
let selectedOrTagsByTab  = {};
let selectedNotTagsByTab = {};

export const filterManager = (() => {

    // ── Registration ───────────────────────────────────────────────────────────
    const registerRenderer = (renderFn, updateTagsFn, getBlocksFn) => {
        _renderBlocks = renderFn;
        _updateTags   = updateTagsFn;
        _getBlocks    = getBlocksFn;
    };

    // ── Getters / setters ──────────────────────────────────────────────────────
    const getAndTags      = (tab = 'tab4') => selectedAndTagsByTab[tab] ? [...selectedAndTagsByTab[tab]] : [];
    const getOrTags       = (tab = 'tab4') => selectedOrTagsByTab[tab]  ? [...selectedOrTagsByTab[tab]]  : [];
    const getNotTags      = (tab = 'tab4') => selectedNotTagsByTab[tab] ? [...selectedNotTagsByTab[tab]] : [];
    const getSelectedTags = (tab = 'tab4') => getAndTags(tab); // backward-compatible alias

    const setSelectedTags = (tab, tags) => {
        if (Array.isArray(tags)) selectedAndTagsByTab[tab] = [...tags];
    };

    const clearSelectedTags = (tab) => {
        selectedAndTagsByTab[tab] = [];
        selectedOrTagsByTab[tab]  = [];
        selectedNotTagsByTab[tab] = [];
    };

    // ── Apply selected/selected-or classes to the DOM ─────────────────────────
    // Called after every render so both the filter panel and block tags reflect
    // current state. appManager.updateTags() does NOT handle this — it just
    // builds the tag HTML without selected classes, keeping it free of any
    // filterManager dependency.
    const _applySelectionClasses = (activeTab) => {
        const tabNumber = activeTab.replace('tab', '');
        const andTags   = getAndTags(activeTab);
        const orTags    = getOrTags(activeTab);
        const notTags   = getNotTags(activeTab);

        const selectedBlockTypes = new Set(
            [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected`)]
                .map(b => b.dataset.tag)
        );
        const orBlockTypes = new Set(
            [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected-or`)]
                .map(b => b.dataset.tag)
        );
        const notBlockTypes = new Set(
            [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected-not`)]
                .map(b => b.dataset.tag)
        );

        const applyTo = (selector) => {
            document.querySelectorAll(selector).forEach(btn => {
                const tag = btn.dataset.tag;
                btn.classList.toggle('selected',     andTags.includes(tag) || selectedBlockTypes.has(tag));
                btn.classList.toggle('selected-or',  orTags.includes(tag)  || orBlockTypes.has(tag));
                btn.classList.toggle('selected-not', notTags.includes(tag) || notBlockTypes.has(tag));
            });
        };

        // Filter panel tags
        applyTo(`#dynamic_tags_section_${tabNumber} .tag-button`);
        // Rendered block tags
        applyTo(`#results_section_${tabNumber} .tag-button`);
        
        // Accordion chips (collapsed groups)
        document.getElementById(`dynamic_tags_section_${tabNumber}`)
            ?.querySelectorAll('.tag-accordion-group:not(.open)').forEach(group => {
                const body     = group.querySelector('.tag-accordion-body');
                if (!body) return;

                // Clear stale chips — from chips container (filter) or group root (overlay)
                const chipsContainer = group.querySelector('.tag-accordion-chips');
                if (chipsContainer) {
                    chipsContainer.innerHTML = '';
                } else {
                    group.querySelectorAll(':scope > .tag-accordion-chip').forEach(c => c.remove());
                }

                const tagClass = [...group.classList].find(c => c !== 'tag-accordion-group') || '';
                const target = chipsContainer || group;
                body.querySelectorAll('.tag-button.selected, .tag-button.selected-or, .tag-button.selected-not').forEach(btn => {
                    const chip = document.createElement('button');
                    chip.classList.add('tag-accordion-chip');
                    if (tagClass) chip.classList.add(tagClass);
                    if (btn.classList.contains('selected-or'))  chip.classList.add('selected-or');
                    if (btn.classList.contains('selected-not')) chip.classList.add('selected-not');
                    chip.dataset.tag = btn.dataset.tag;
                    chip.textContent = btn.dataset.tag;
                    target.appendChild(chip);
                });

            });
    };

    // ── Core filter + render ───────────────────────────────────────────────────
    const applyFilters = (tabNumber, skipTagUpdate = false) => {
        if (!_renderBlocks || !_updateTags || !_getBlocks) {
            console.warn('filterManager: registerRenderer() has not been called yet');
            return;
        }

        const activeTab = `tab${tabNumber}`;
        let blocks = _getBlocks(activeTab);

        // 1. Block-type filter (AND logic, driven by config)
        const tabBTConfig = blockTypeConfig[activeTab];
        if (tabBTConfig) {
            const andTypes = [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected`)]
                .map(b => b.dataset.tag);
            const orTypes  = [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected-or`)]
                .map(b => b.dataset.tag);
            const notTypes = [...document.querySelectorAll(`#character_type_tags_${tabNumber} .tag-button.selected-not`)]
                .map(b => b.dataset.tag);

            if (andTypes.length) {
                blocks = blocks.filter(block => {
                    const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                    return andTypes.every(t => types.includes(t));
                });
            }
            if (orTypes.length) {
                blocks = blocks.filter(block => {
                    const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                    return orTypes.some(t => types.includes(t));
                });
            }
            if (notTypes.length) {
                blocks = blocks.filter(block => {
                    const types = Array.isArray(block.blockType) ? block.blockType : (block.blockType ? [block.blockType] : []);
                    return !notTypes.some(t => types.includes(t));
                });
            }
        }

        // 2. AND tags — block must have ALL of these
        const andTags = getAndTags(activeTab);
        if (andTags.length) {
            blocks = blocks.filter(b =>
                andTags.every(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
            );
        }

        // 3. OR tags — block must have AT LEAST ONE of these
        const orTags = getOrTags(activeTab);
        if (orTags.length) {
            blocks = blocks.filter(b =>
                orTags.some(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
            );
        }

        // 3b. NOT tags — block must have NONE of these
        const notTags = getNotTags(activeTab);
        if (notTags.length) {
            blocks = blocks.filter(b =>
                !notTags.some(t => b.tags.some(bt => normalizeTag(bt) === normalizeTag(t)))
            );
        }

        // 4. Search query
        const query = document.getElementById(`search_input_${tabNumber}`)
            ?.value.trim().toLowerCase() || '';
        if (query) {
            blocks = blocks.filter(b =>
                b.title.toLowerCase().includes(query) ||
                stripHTML(b.text).toLowerCase().includes(query) ||
                (b.properties || []).some(p => p.toLowerCase().includes(query))
            );
        }

        _renderBlocks(activeTab, blocks, skipTagUpdate);
        if (!skipTagUpdate) _updateTags();
        _applySelectionClasses(activeTab);
        document.dispatchEvent(new CustomEvent('blocksRerendered', { detail: { tab: activeTab } }));
    };

    // ── Tag click handler (AND / OR / deselect via shift) ─────────────────────
    const handleTagClick = () => {
        document.addEventListener('click', e => {
            const target = e.target;
            if (
                !target.classList.contains('tag-button') ||
                target.closest('.block.condensed') ||
                target.closest('.block.inline-editing')
            ) return;

            const tabContent = target.closest('.tab-content');
            const activeTab = tabContent?.id || document.querySelector('.tab-button.active')?.dataset.tab || 'tab4';
            const tabNumber = activeTab.replace('tab', '');
            const tag = target.dataset.tag?.trim();
            if (!tag) return;

            // Block-type tags — handled via DOM classes directly (not state objects)
            const tabBTConfig = blockTypeConfig[activeTab];
            if (tabBTConfig && tabBTConfig.types.includes(tag)) {
                const btBtn = document.querySelector(
                    `#character_type_tags_${tabNumber} .tag-button[data-tag="${tag}"]`
                );
                if (btBtn) {
                    const inAnd = btBtn.classList.contains('selected');
                    const inOr  = btBtn.classList.contains('selected-or');
                    const inNot = btBtn.classList.contains('selected-not');

                    if (e.altKey) {
                        // alt-click: any state → NOT, unless already NOT → unselected
                        btBtn.classList.remove('selected', 'selected-or', 'selected-not');
                        if (!inNot) btBtn.classList.add('selected-not');
                    } else if (e.shiftKey) {
                        // shift-click: AND → OR, NOT → OR, OR → unselected, unselected → OR
                        btBtn.classList.remove('selected', 'selected-or', 'selected-not');
                        if (!inOr) btBtn.classList.add('selected-or');
                    } else {
                        // plain click: any state → unselected, unselected → AND
                        btBtn.classList.remove('selected', 'selected-or', 'selected-not');
                        if (!inAnd && !inOr && !inNot) btBtn.classList.add('selected');
                    }
                    applyFilters(tabNumber, true);
                }
                return;
            }

            // Normal tags — handled via state objects
            const andTags = getAndTags(activeTab);
            const orTags  = getOrTags(activeTab);
            const notTags = getNotTags(activeTab);
            const inAnd   = andTags.includes(tag);
            const inOr    = orTags.includes(tag);
            const inNot   = notTags.includes(tag);

            // Remove from all three arrays first — we'll add back to the right one
            selectedAndTagsByTab[activeTab] = andTags.filter(t => t !== tag);
            selectedOrTagsByTab[activeTab]  = orTags.filter(t => t !== tag);
            selectedNotTagsByTab[activeTab] = notTags.filter(t => t !== tag);

            if (e.altKey) {
                // alt-click: any state → NOT, unless already NOT → unselected
                if (!inNot) selectedNotTagsByTab[activeTab].push(tag);
            } else if (e.shiftKey) {
                // shift-click: AND → OR, NOT → OR, OR → unselected, unselected → OR
                if (!inOr) selectedOrTagsByTab[activeTab].push(tag);
            } else {
                // plain click: any state → unselected, unselected → AND
                if (!inAnd && !inOr && !inNot) selectedAndTagsByTab[activeTab].push(tag);
            }

            applyFilters(tabNumber, true);
        });
    };

    // Re-apply selected/selected-or classes whenever updateTags re-renders the
    // tag DOM. Placed inside the IIFE so _applySelectionClasses is in scope.
    document.addEventListener('tagsUpdated', e => {
        if (!_getBlocks) return; // renderer not registered yet
        _applySelectionClasses(e.detail.tab);
    });

    return {
        registerRenderer,
        getSelectedTags,
        getAndTags,
        getOrTags,
        getNotTags,
        setSelectedTags,
        clearSelectedTags,
        applyFilters,
        applySelectionClasses: _applySelectionClasses,
        handleTagClick,
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    filterManager.handleTagClick();
});