import { filterManager } from './filterManager.js';
import { categoryTags } from './tagConfig.js';
import { toggleBlockUse } from './circleToggle.js';

export const blockTemplate = (block, tab = "tab4") => {
    const viewState = block.viewState || 'expanded';

    const andTags = filterManager.getAndTags();
    const orTags  = filterManager.getOrTags();
    const selClass = tag =>
        andTags.includes(tag) ? 'selected' : orTags.includes(tag) ? 'selected-or' : '';

    const tabPredefinedTags = Object.entries(categoryTags)
        .filter(([_, data]) => data.tabs.includes(tab))
        .flatMap(([_, data]) => data.tags);

    const predefinedTagsByCategory = Object.fromEntries(
        Object.entries(categoryTags)
            .filter(([_, data]) => data.tabs.includes(tab))
            .map(([category, data]) => [
                category,
                Array.isArray(data.tags) ? data.tags.filter(tag => block.tags.includes(tag)) : []
            ])
    );

    const predefinedTagsHTML = Object.entries(predefinedTagsByCategory)
        .map(([category, tags]) =>
            tags.map(tag => {
                const tagClass = categoryTags[category]?.className || "tag-default";
                return `<span class="tag-button ${tagClass} ${selClass(tag)}" data-tag="${tag}">${tag}</span>`;
            }).join("")
        )
        .join("");

    const userTags = block.tags
        .filter(tag => !tabPredefinedTags.includes(tag))
        .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());

    const userTagsHTML = userTags.map(tag =>
        `<span class="tag-button tag-user ${selClass(tag)}" data-tag="${tag}">${tag}</span>`
    ).join("");

    const propertiesHTML = (viewState === 'expanded' && block.properties && block.properties.length > 0)
        ? `<div class="block-properties">${block.properties.map(p =>
            `<span class="block-property">${p}</span>`
          ).join("")}</div>`
        : "";

    const blockTypes = Array.isArray(block.blockType)
        ? block.blockType
        : (block.blockType ? [block.blockType] : []);

    const blockTypeHTML = blockTypes.map(bt =>
        `<span class="tag-button tag-characterType ${selClass(bt)}" data-tag="${bt}">${bt}</span>`
    ).join("");

    const hasAnyTags = blockTypeHTML !== "" || predefinedTagsHTML.trim() !== "" || userTagsHTML.trim() !== "";
    const tagSectionsHTML = hasAnyTags ? `
        <div class="block-tags">
            ${blockTypeHTML}
            ${predefinedTagsHTML}
            ${userTagsHTML}
        </div>
    ` : "";

    let bodyHTML = block.text || "";
    bodyHTML = bodyHTML
        .replace(/<div[^>]*>/gi, '')
        .replace(/^(&nbsp;|\s)+/gi, '')
        .replace(/<\/div>/gi, '<br>')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '<br>')
        .trim();

    const hasBody = bodyHTML.trim() !== "";

    const actionMenuHTML = `
        <div class="block-actions">
            <button class="action-button pin-button${block.pinned ? ' pin-active' : ''}" data-id="${block.id}" title="${block.pinned ? 'Unpin' : 'Pin'}">
                <img src="images/${block.pinned ? 'Pin_Icon_Blue' : 'Pin_Icon'}.svg" alt="Pin" />
            </button>
            <div class="block-actions-menu">
                <button class="actions-trigger" title="Actions">···</button>
                <div class="block-actions-reveal">
                    <button class="action-button remove-button red-button" data-id="${block.id}" title="Remove">×</button>
                    <button class="action-button duplicate-button blue-button" data-id="${block.id}" title="Copy">❐</button>
                    <button class="action-button edit-button orange-button" data-id="${block.id}" title="Edit">✎</button>
                </div>
            </div>
        </div>
    `;

    let content = "";
    if (viewState === 'expanded') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) =>
                `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
              ).join("")
            : "";
        content = `
            <div class="block-header">
                <div class="block-header-left">
                    <div class="block-title"><h4>${block.title}</h4></div>
                    ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                </div>
                ${actionMenuHTML}
            </div>
            ${tagSectionsHTML}
            ${propertiesHTML}
            ${ hasBody ? `<div class="block-body"><span>${bodyHTML}</span></div>` : "" }
        `;
    } else if (viewState === 'condensed') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) =>
                `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
              ).join("")
            : "";
        content = `
            <div class="block-header">
                <div class="block-title"><h4>${block.title}</h4></div>
                ${ usesHTML ? `<div class="block-uses">${usesHTML}</div>` : "" }
                ${actionMenuHTML}
            </div>
        `;
    } else if (viewState === 'minimized') {
        const usesHTML = block.uses
            ? block.uses.map((state, idx) =>
                `<span class="circle ${state ? 'unfilled' : ''}" onclick="toggleBlockUse('${block.id}', ${idx}, event, this)"></span>`
              ).join("")
            : "";
        content = `
            <div class="block-header">
                <div class="block-title-minimized"><h4>${block.title}</h4></div>
                ${usesHTML ? `<div class="block-uses">${usesHTML}</div>` : ""}
            </div>
        `;
    }

    return `
        <div class="block ${viewState}${block.pinned ? ' pinned' : ''}" data-id="${block.id}">
            ${content}
        </div>
    `;
};

// Mobile tap: toggle action menu open/closed
document.addEventListener('click', e => {
    const trigger = e.target.closest('.actions-trigger');
    if (trigger) {
        e.stopPropagation();
        const menu = trigger.closest('.block-actions-menu');
        const isOpen = menu.classList.contains('menu-open');
        document.querySelectorAll('.block-actions-menu.menu-open')
            .forEach(m => m.classList.remove('menu-open'));
        if (!isOpen) menu.classList.add('menu-open');
        return;
    }
    if (!e.target.closest('.block-actions-menu')) {
        document.querySelectorAll('.block-actions-menu.menu-open')
            .forEach(m => m.classList.remove('menu-open'));
    }
});