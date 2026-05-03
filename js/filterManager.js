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

        // Filter panel tags — instant (exclude chips, they're managed by the diff below)
        applyTo(`#dynamic_tags_section_${tabNumber} .tag-accordion-body .tag-button, #dynamic_tags_section_${tabNumber} .tag-category.user-tags .tag-button`);

        // Non-condensed block tags — instant
        applyTo(`#results_section_${tabNumber} .block:not(.condensed) .tag-button`);

        // ── Condensed block tags: animated width transitions ────────────
        // Departing tags shrink in-flow (flex slides neighbors naturally).
        // Arriving tags grow from 0 (flex pushes neighbors naturally).
        // No ghosts, no FLIP, no position calculations needed.
        const resultsSection = document.getElementById(`results_section_${tabNumber}`);
        if (resultsSection) {
            resultsSection.querySelectorAll('.block.condensed .block-tags-condensed .tag-button').forEach(btn => {
                const tag = btn.dataset.tag;
                const shouldSelect    = andTags.includes(tag) || selectedBlockTypes.has(tag);
                const shouldSelectOr  = orTags.includes(tag)  || orBlockTypes.has(tag);
                const shouldSelectNot = notTags.includes(tag) || notBlockTypes.has(tag);
                const wasVisible  = btn.classList.contains('selected') || btn.classList.contains('selected-or');
                const willBeVisible = shouldSelect || shouldSelectOr;

                if (wasVisible && !willBeVisible) {
                    // ── Departing: shrink width + height + fade out ──
                    const w = btn.offsetWidth;
                    const h = btn.offsetHeight;
                    btn.style.width = w + 'px';
                    btn.style.height = h + 'px';
                    btn.style.overflow = 'hidden';
                    btn.style.boxSizing = 'border-box';
                    btn.style.flexShrink = '0';
                    void btn.offsetHeight;
                    btn.style.transition = 'width 0.2s ease, height 0.2s ease, padding 0.2s ease, margin 0.2s ease, opacity 0.18s ease';
                    btn.style.width = '0';
                    btn.style.height = '0';
                    btn.style.padding = '0';
                    btn.style.margin = '0 -2px';
                    btn.style.opacity = '0';
                    setTimeout(() => {
                        btn.classList.remove('selected', 'selected-or', 'selected-not');
                        btn.removeAttribute('style');
                    }, 250);

                } else if (!wasVisible && willBeVisible) {
                    // ── Arriving: grow width + height + fade in ──
                    btn.classList.toggle('selected',     shouldSelect);
                    btn.classList.toggle('selected-or',  shouldSelectOr);
                    btn.classList.toggle('selected-not', shouldSelectNot);
                    const naturalWidth = btn.offsetWidth;
                    const naturalHeight = btn.offsetHeight;
                    btn.style.maxWidth = '0px';
                    btn.style.maxHeight = '0px';
                    btn.style.overflow = 'hidden';
                    btn.style.opacity = '0';
                    btn.style.padding = '0';
                    void btn.offsetHeight;
                    btn.style.transition = 'max-width 0.2s ease, max-height 0.2s ease, opacity 0.18s ease 0.04s, padding 0.2s ease';
                    btn.style.maxWidth = naturalWidth + 'px';
                    btn.style.maxHeight = naturalHeight + 'px';
                    btn.style.opacity = '1';
                    btn.style.padding = '';
                    setTimeout(() => btn.removeAttribute('style'), 250);

                } else {
                    // ── No visibility change — instant toggle ──
                    btn.classList.toggle('selected',     shouldSelect);
                    btn.classList.toggle('selected-or',  shouldSelectOr);
                    btn.classList.toggle('selected-not', shouldSelectNot);
                }
            });
        }
        
        // Accordion chips (collapsed groups) — diff with width+opacity animation
        document.getElementById(`dynamic_tags_section_${tabNumber}`)
            ?.querySelectorAll('.tag-accordion-group:not(.open)').forEach(group => {
                const body     = group.querySelector('.tag-accordion-body');
                if (!body) return;

                const chipsContainer = group.querySelector('.tag-accordion-chips');
                if (!chipsContainer) return;

                const tagClass = [...group.classList].find(c => c !== 'tag-accordion-group') || '';

                // Build ordered list of tags that should have chips (matches body tag order)
                const desiredChips = [];
                body.querySelectorAll('.tag-button.selected, .tag-button.selected-or, .tag-button.selected-not').forEach(btn => {
                    const state = btn.classList.contains('selected-or') ? 'selected-or'
                                : btn.classList.contains('selected-not') ? 'selected-not'
                                : 'selected';
                    desiredChips.push({ tag: btn.dataset.tag, state });
                });
                const desiredSet = new Set(desiredChips.map(d => d.tag));

                // Map existing chips
                const existingChips = new Map();
                chipsContainer.querySelectorAll('.tag-button').forEach(chip => {
                    existingChips.set(chip.dataset.tag, chip);
                });

                // Remove chips that should no longer exist (shrink + fade, keep selected style)
                existingChips.forEach((chip, tag) => {
                    if (!desiredSet.has(tag)) {
                        chip.classList.add('chip-removing');
                        const w = chip.offsetWidth;
                        const h = chip.offsetHeight;
                        chip.style.width = w + 'px';
                        chip.style.height = h + 'px';
                        chip.style.overflow = 'hidden';
                        chip.style.boxSizing = 'border-box';
                        chip.style.flexShrink = '0';
                        void chip.offsetHeight;
                        chip.style.transition = 'width 0.2s ease, height 0.2s ease, padding 0.2s ease, margin 0.2s ease, opacity 0.18s ease';
                        chip.style.width = '0';
                        chip.style.height = '0';
                        chip.style.padding = '0';
                        chip.style.margin = '0 -2px';
                        chip.style.opacity = '0';
                        setTimeout(() => chip.remove(), 250);
                    }
                });

                // Add or update chips
                desiredChips.forEach(({ tag, state }) => {
                    const existing = existingChips.get(tag);
                    if (existing && !existing.classList.contains('chip-removing')) {
                        // Update state class if changed
                        existing.classList.remove('selected', 'selected-or', 'selected-not');
                        existing.classList.add(state);
                    } else if (!existing) {
                        // Create new chip
                        const chip = document.createElement('button');
                        chip.classList.add('tag-button', state);
                        if (tagClass) chip.classList.add(tagClass);
                        chip.dataset.tag = tag;
                        chip.textContent = tag;
                        chipsContainer.appendChild(chip);
                    }
                });

                // Reorder non-removing chips to match body tag order
                desiredChips.forEach(({ tag }) => {
                    const chip = chipsContainer.querySelector(`.tag-button[data-tag="${tag}"]:not(.chip-removing)`);
                    if (chip) chipsContainer.appendChild(chip);
                });

                // Animate newly created chips (grow + fade in)
                desiredChips.forEach(({ tag }) => {
                    const chip = chipsContainer.querySelector(`.tag-button[data-tag="${tag}"]`);
                    if (!chip || existingChips.has(tag)) return;
                    const naturalWidth = chip.offsetWidth;
                    const naturalHeight = chip.offsetHeight;
                    chip.style.maxWidth = '0px';
                    chip.style.maxHeight = '0px';
                    chip.style.overflow = 'hidden';
                    chip.style.opacity = '0';
                    chip.style.padding = '0';
                    void chip.offsetHeight;
                    chip.style.transition = 'max-width 0.2s ease, max-height 0.2s ease, opacity 0.18s ease 0.04s, padding 0.2s ease';
                    chip.style.maxWidth = naturalWidth + 'px';
                    chip.style.maxHeight = naturalHeight + 'px';
                    chip.style.opacity = '1';
                    chip.style.padding = '';
                    setTimeout(() => chip.removeAttribute('style'), 250);
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
        // When !skipTagUpdate, renderBlocks already calls updateTags → tagsUpdated → _applySelectionClasses
        // When skipTagUpdate, we need to call it directly since tagsUpdated won't fire
        if (skipTagUpdate) _applySelectionClasses(activeTab);
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