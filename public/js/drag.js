// ─── drag.js — Drag-to-reorder tasks within a category ───────────────────────
// Uses event delegation so it works regardless of when tasks are added.
// Tasks can only be reordered within their own category.

let dragSrc = null; // the .todo-item currently being dragged

/**
 * Enable drag-sort on a category container.
 * Uses event delegation — attach once to the category div.
 * Call this AFTER all task items have been appended.
 *
 * @param {HTMLElement} categoryEl — a .todo-category div
 */
export function enableDragSort(categoryEl) {
    // 1. Add drag handle + set draggable on every task item in this category
    categoryEl.querySelectorAll('.todo-item').forEach(item => {
        if (!item.querySelector('.drag-handle')) {
            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.textContent = '⠿';
            handle.title = 'Drag to reorder';
            item.prepend(handle);
        }
        item.setAttribute('draggable', 'true');
    });

    // 2. Attach all DnD events to the container (not individual items)
    categoryEl.addEventListener('dragstart', onDragStart);
    categoryEl.addEventListener('dragend',   onDragEnd);
    categoryEl.addEventListener('dragover',  onDragOver);
    categoryEl.addEventListener('dragleave', onDragLeave);
    categoryEl.addEventListener('drop',      onDrop);
}

// ─── Event handlers ───────────────────────────────────────────────────────────

function onDragStart(e) {
    const item = e.target.closest('.todo-item');
    if (!item) return;

    // Don't drag if user clicked the checkbox
    if (e.target.tagName === 'INPUT') { e.preventDefault(); return; }
    // Don't drag if user is inside an editable label
    if (e.target.isContentEditable || e.target.closest('[contenteditable="true"]')) {
        e.preventDefault(); return;
    }

    dragSrc = item;
    // Small delay so the ghost image is still the normal look
    requestAnimationFrame(() => item.classList.add('dragging'));

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}

function onDragEnd() {
    if (dragSrc) dragSrc.classList.remove('dragging');
    dragSrc = null;
    clearIndicators();
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.todo-item');
    if (!target || target === dragSrc) return;

    clearIndicators();

    const rect   = target.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    target.classList.add(before ? 'drop-above' : 'drop-below');
}

function onDragLeave(e) {
    // Only clear when we leave the category entirely
    const cat = e.currentTarget;
    if (!cat.contains(e.relatedTarget)) clearIndicators();
}

function onDrop(e) {
    e.preventDefault();

    const cat   = e.currentTarget;
    const above = cat.querySelector('.drop-above');
    const below = cat.querySelector('.drop-below');
    const target = above || below;

    clearIndicators();

    if (!dragSrc || !target || dragSrc === target) return;

    if (above) {
        cat.insertBefore(dragSrc, target);
    } else {
        target.after(dragSrc);
    }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function clearIndicators() {
    document.querySelectorAll('.drop-above, .drop-below')
        .forEach(el => el.classList.remove('drop-above', 'drop-below'));
}
