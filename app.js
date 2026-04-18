// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// Data storage keys
const INVENTORY_KEY = 'odr_inventory';
const TIMERS_KEY = 'odr_timers';

// Default rental object types with icons
const DEFAULT_TYPES = {
    canoe: { name: 'Canoe', icon: '🚣', isFilter: true, durationPresets: [1, 2, 3] },
    kayak: { name: 'Kayak', icon: '🛶', isFilter: true, durationPresets: [1, 2, 3] },
    bike: { name: 'Bike', icon: '🚴', isFilter: true, durationPresets: [1, 2, 3] },
    paddleboard: { name: 'Paddle Board', icon: '🏄', isFilter: true, durationPresets: [1, 2, 3] },
    paddleboat: { name: 'Paddle Boat', icon: '🚤', isFilter: true, durationPresets: [1, 2, 3] },
    cadillac: { name: 'Cadillac Bike', icon: '🚴‍♂️', isFilter: true, durationPresets: [1, 2, 3] },
    other: { name: 'Other', icon: '📦', isFilter: true, durationPresets: [1, 2, 3] }
};

const ICON_CHOICES = [
    { value: '🚣', label: 'Canoe' },
    { value: '🛶', label: 'Kayak' },
    { value: '🚴', label: 'Bike' },
    { value: '🚴‍♂️', label: 'Cadillac Bike' },
    { value: '🏄', label: 'Paddle Board' },
    { value: '🚤', label: 'Paddle Boat' },
    { value: '🛴', label: 'Scooter' },
    { value: '⛵', label: 'Sailboat' },
    { value: '🛶', label: 'SUP' },
    { value: '🛥️', label: 'Motor Boat' },
    { value: '📦', label: 'Other' }
];

function renderIconOptions(selected = '') {
    return ICON_CHOICES.map(choice => `
        <option value="${choice.value}"${choice.value === selected ? ' selected' : ''}>
            ${choice.value} ${choice.label}
        </option>
    `).join('');
}

// Load data from localStorage
let objectTypes = JSON.parse(localStorage.getItem('odr_object_types')) || Object.values(DEFAULT_TYPES).map(type => ({ ...type, id: type.name.toLowerCase().replace(/\s+/g, '') }));
let inventoryItems = JSON.parse(localStorage.getItem('odr_inventory_items')) || [];
let timers = JSON.parse(localStorage.getItem(TIMERS_KEY)) || [];

// DOM elements
const timersSection = document.getElementById('timers-section');
const availableSection = document.getElementById('available-section');
const setupSection = document.getElementById('setup-section');
const timersBtn = document.getElementById('timers-btn');
const availableBtn = document.getElementById('available-btn');
const setupBtn = document.getElementById('setup-btn');
const refreshBtn = document.getElementById('refresh-btn');
const timersList = document.getElementById('timers-list');
const filterButtons = document.getElementById('filter-buttons');
const availableSummary = document.getElementById('available-summary');
const availableGrid = document.getElementById('available-grid');
const addTimerBtn = document.getElementById('add-timer-btn');
const addTimerTopBtn = document.getElementById('add-timer-top-btn');
const addObjectTypeBtn = document.getElementById('add-object-type-btn');
const addInventoryItemBtn = document.getElementById('add-inventory-item-btn');
const objectTypesList = document.getElementById('object-types-list');
const inventoryItemsList = document.getElementById('inventory-items-list');

// Current filter
let currentFilter = null;

// Navigation
timersBtn?.addEventListener('click', () => switchSection('timers'));
availableBtn?.addEventListener('click', () => switchSection('available'));
setupBtn?.addEventListener('click', () => switchSection('setup'));
refreshBtn?.addEventListener('click', () => refreshFromStorage());

function switchSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.mdc-tab').forEach(b => b.classList.remove('mdc-tab--active'));
    if (addTimerBtn) {
        addTimerBtn.style.display = section === 'timers' ? 'inline-flex' : 'none';
    }

    if (section === 'timers') {
        timersSection.classList.add('active');
        timersBtn.classList.add('mdc-tab--active');
        renderTimers();
        renderFilters();
    } else if (section === 'available') {
        availableSection.classList.add('active');
        availableBtn.classList.add('mdc-tab--active');
        renderAvailableInventory();
    } else {
        setupSection.classList.add('active');
        setupBtn.classList.add('mdc-tab--active');
        renderObjectTypes();
        renderInventoryItems();
    }
}

function refreshFromStorage() {
    objectTypes = JSON.parse(localStorage.getItem('odr_object_types')) || Object.values(DEFAULT_TYPES).map(type => ({ ...type, id: type.name.toLowerCase().replace(/\s+/g, '') }));
    inventoryItems = JSON.parse(localStorage.getItem('odr_inventory_items')) || [];
    timers = JSON.parse(localStorage.getItem(TIMERS_KEY)) || [];
    
    const activeSection = document.querySelector('.section.active');
    if (activeSection.id === 'timers-section') {
        renderTimers();
        renderFilters();
    } else if (activeSection.id === 'available-section') {
        renderAvailableInventory();
    } else {
        renderObjectTypes();
        renderInventoryItems();
    }
}

// Render filters
function renderFilters() {
    filterButtons.innerHTML = '<div class="mdc-chip mdc-chip--selected" data-type="all"><div class="mdc-chip__text">All</div></div>';
    const types = objectTypes.filter(type => type.isFilter);
    types.forEach(typeData => {
        const chip = document.createElement('div');
        chip.className = 'mdc-chip';
        chip.dataset.type = typeData.id;
        chip.innerHTML = `<div class="mdc-chip__text">${typeData.icon} ${typeData.name}</div>`;
        filterButtons.appendChild(chip);
    });
    
    filterButtons.onclick = e => {
        const chip = e.target.closest('.mdc-chip');
        if (chip) {
            document.querySelectorAll('.mdc-chip').forEach(c => c.classList.remove('mdc-chip--selected'));
            chip.classList.add('mdc-chip--selected');
            currentFilter = chip.dataset.type === 'all' ? null : chip.dataset.type;
            renderTimers();
        }
    };
}

// Render timers
function renderTimers() {
    const filteredTimers = currentFilter ? timers.filter(t => t.typeId === currentFilter) : timers;
    
    filteredTimers.sort((a, b) => {
        const aTimeLeft = getTimeLeft(a);
        const bTimeLeft = getTimeLeft(b);
        return aTimeLeft - bTimeLeft;
    });

    // Filter out timers with invalid inventory references
    const validTimers = filteredTimers.filter(t => {
        const itemData = inventoryItems.find(item => item.id === t.inventoryId);
        return itemData !== undefined;
    });

    // Get current timer IDs in filtered list
    const filteredIds = new Set(validTimers.map(t => t.id));

    // Remove timers no longer in filtered list
    Array.from(timersList.querySelectorAll('[data-id]')).forEach(el => {
        if (!filteredIds.has(el.dataset.id)) {
            el.remove();
        }
    });

    // Update or create timer elements
    validTimers.forEach((timer, index) => {
        let timerEl = timersList.querySelector(`[data-id="${timer.id}"]`);
        if (!timerEl) {
            timerEl = createTimerElement(timer);
            timersList.appendChild(timerEl);
        } else {
            updateTimerDisplay(timerEl, timer);
            // Move to correct position if order changed
            if (timersList.children[index] !== timerEl) {
                timersList.insertBefore(timerEl, timersList.children[index]);
            }
        }
    });
}

function getActiveInventoryIds() {
    const now = Date.now();
    return new Set(
        timers
            .filter(timer => timer.inventoryId && timer.startTime <= now && timer.startTime + timer.duration > now)
            .map(timer => timer.inventoryId)
    );
}

function renderAvailableInventory() {
    const activeInventoryIds = getActiveInventoryIds();
    const availableItems = inventoryItems
        .filter(item => !activeInventoryIds.has(item.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    availableSummary.textContent = availableItems.length === 0
        ? 'No inventory is currently available.'
        : `${availableItems.length} item${availableItems.length === 1 ? '' : 's'} available`;

    availableGrid.innerHTML = '';

    if (availableItems.length === 0) {
        availableGrid.innerHTML = `
            <div class="available-empty">
                Everything is currently on an active timer.
            </div>
        `;
        return;
    }

    availableItems.forEach(item => {
        const typeData = objectTypes.find(type => type.id === item.typeId) || { icon: '?', name: 'Unknown' };
        const card = document.createElement('div');
        card.className = 'mdc-card available-card';
        card.innerHTML = `
            <div class="available-card-icon">${typeData.icon}</div>
            <div class="available-card-name">${item.name}</div>
            <div class="available-card-type">${typeData.name}</div>
        `;
        card.addEventListener('click', () => addTimerForItem(item.id));
        availableGrid.appendChild(card);
    });
}

function updateTimerDisplay(timerEl, timer) {
    const timeLeft = getTimeLeft(timer);
    const progress = Math.max(0, Math.min(100, (timer.duration - timeLeft) / timer.duration * 100));
    const isOvertime = timeLeft < 0;
    const isWarning = timeLeft <= 15 * 60 * 1000 && timeLeft > 0;

    let progressClass = 'green';
    if (isOvertime) progressClass = 'red';
    else if (isWarning) progressClass = 'yellow';

    const progressFill = timerEl.querySelector('.progress-fill');
    progressFill.style.width = progress + '%';
    progressFill.className = 'progress-fill ' + progressClass;

    const dueLabel = isOvertime ? `PAST DUE: ${formatTime(Math.abs(timeLeft))}` : formatTime(timeLeft);
    const timerTimeEl = timerEl.querySelector('.timer-time');
    timerTimeEl.textContent = dueLabel;
    timerTimeEl.className = 'timer-time' + (isOvertime ? ' overtime' : '');
}

function createTimerElement(timer) {
    const div = document.createElement('div');
    div.className = 'mdc-card timer-item';
    div.dataset.id = timer.id;
    
    const timeLeft = getTimeLeft(timer);
    const progress = Math.max(0, Math.min(100, (timer.duration - timeLeft) / timer.duration * 100));
    const isOvertime = timeLeft < 0;
    const isWarning = timeLeft <= 15 * 60 * 1000 && timeLeft > 0; // 15 minutes
    
    let progressClass = 'green';
    if (isOvertime) progressClass = 'red';
    else if (isWarning) progressClass = 'yellow';
    
    const itemData = inventoryItems.find(item => item.id === timer.inventoryId);
    const typeData = objectTypes.find(type => type.id === timer.typeId);
    const icon = typeData ? typeData.icon : '❓';
    const itemLabel = itemData ? itemData.name : 'Unknown item';
    const renterLabel = timer.renter ? `: ${timer.renter}` : '';
    const rentalDurationLabel = formatTime(timer.duration);
    const displayName = `${itemLabel}${renterLabel} · ${rentalDurationLabel}`;
    const dueLabel = isOvertime ? `PAST DUE: ${formatTime(Math.abs(timeLeft))}` : formatTime(timeLeft);
    
    div.innerHTML = `
        <div class="mdc-card__content">
            <div class="timer-header">
                <span class="timer-name"><span class="timer-icon">${icon}</span> ${displayName}</span>
                <span class="timer-time ${isOvertime ? 'overtime' : ''}">${dueLabel}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="delete-overlay">
            <button class="slide-action adjust-start">
                <span class="mdc-button__label">Adjust</span>
            </button>
            <button class="slide-action delete-btn">
                <span class="mdc-button__label">Delete</span>
            </button>
        </div>
    `;
    
    // Pointer events for swipe to delete and mouse drag support
    let justSwiped = false;
    
    div.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || e.pointerType === 'touch' || e.pointerType === 'pen') {
            e.preventDefault();
        }
    });
    
    // Button events
    div.querySelector('.adjust-start').addEventListener('click', e => {
        e.stopPropagation();
        adjustStartTime(timer.id);
    });
    div.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation();
        deleteTimer(timer.id);
    });
    
    // Toggle action buttons on div click
    div.addEventListener('click', e => {
        if (e.target.closest('.slide-action')) {
            return;
        }
        div.classList.toggle('expanded');
    });
    
    return div;
}

function getTimeLeft(timer) {
    const now = Date.now();
    const endTime = timer.startTime + timer.duration;
    return endTime - now;
}

function formatTime(ms) {
    const totalMinutes = Math.ceil(Math.abs(ms) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Timer management
function addTimer() {
    const modal = createTimerModal();
    document.body.appendChild(modal);
}

function addTimerForItem(itemId) {
    const modal = createTimerModal(itemId);
    document.body.appendChild(modal);
}

function createTimerModal(preselectedItemId = null) {
    const activeInventoryIds = getActiveInventoryIds();
    const availableInventoryItems = inventoryItems.filter(item => !activeInventoryIds.has(item.id));
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Timer</h3>
            <form id="timer-form">
                <div class="form-group">
                    <label>Inventory Item:</label>
                    <select id="timer-inventory" required>
                        ${availableInventoryItems.length > 0 ? availableInventoryItems.map(item => {
                            const type = objectTypes.find(type => type.id === item.typeId) || { icon: '❓', name: 'Unknown' };
                            const selected = preselectedItemId === item.id ? ' selected' : '';
                            return '<option value="' + item.id + '"' + selected + '>' + type.icon + ' ' + item.name + ' (' + type.name + ')</option>';
                        }).join('') : '<option value="" disabled selected>No inventory items available</option>'}
                    </select>
                </div>
                <div class="form-group">
                    <label>Renter / Label:</label>
                    <input type="text" id="timer-renter" placeholder="e.g., Jason">
                </div>
                <div class="form-group">
                    <label>Duration:</label>
                    <select id="timer-duration"></select>
                </div>
                <div class="form-group" id="custom-duration-group" style="display: none;">
                    <label>Custom Hours:</label>
                    <input type="number" id="custom-hours" min="0" max="24">
                    <label>Custom Minutes:</label>
                    <input type="number" id="custom-minutes" min="0" max="59">
                </div>
                <div class="form-group">
                    <label>Start Time:</label>
                    <select id="start-time">
                        <option value="now">Now</option>
                        <option value="5min">In 5 minutes</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div class="form-group" id="custom-start-group" style="display: none;">
                    <input type="datetime-local" id="custom-start">
                </div>
                <div class="modal-buttons">
                    <button type="button" id="cancel-timer" class="mdc-button cancel-timer">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Add Timer</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    
    const form = modal.querySelector('#timer-form');
    const inventorySelect = modal.querySelector('#timer-inventory');
    const renterInput = modal.querySelector('#timer-renter');
    const durationSelect = modal.querySelector('#timer-duration');
    const customDurationGroup = modal.querySelector('#custom-duration-group');
    const startSelect = modal.querySelector('#start-time');
    const customStartGroup = modal.querySelector('#custom-start-group');
    
    function populateDurationOptions() {
        const selectedInventory = inventoryItems.find(item => item.id === inventorySelect.value);
        const selectedType = selectedInventory ? objectTypes.find(type => type.id === selectedInventory.typeId) : null;
        const presets = selectedType?.durationPresets || [1, 2, 3];
        durationSelect.innerHTML = presets.map(hours => `<option value="${hours * 3600000}">${hours} hour${hours === 1 ? '' : 's'}</option>`).join('') + '<option value="custom">Custom</option>';
        customDurationGroup.style.display = 'none';
    }
    
    if (inventorySelect) {
        inventorySelect.addEventListener('change', populateDurationOptions);
    }
    populateDurationOptions();
    
    durationSelect.addEventListener('change', () => {
        customDurationGroup.style.display = durationSelect.value === 'custom' ? 'block' : 'none';
    });
    
    startSelect.addEventListener('change', () => {
        customStartGroup.style.display = startSelect.value === 'custom' ? 'block' : 'none';
    });
    
    form.addEventListener('submit', e => {
        e.preventDefault();
        const inventoryId = modal.querySelector('#timer-inventory').value;
        const currentActiveInventoryIds = getActiveInventoryIds();
        if (!inventoryId || currentActiveInventoryIds.has(inventoryId)) {
            alert('That inventory item already has an active timer.');
            return;
        }
        const inventoryItem = inventoryItems.find(item => item.id === inventoryId);
        const typeId = inventoryItem ? inventoryItem.typeId : '';
        const renter = renterInput.value;
        let duration = parseInt(durationSelect.value);
        
        if (durationSelect.value === 'custom') {
            const hours = parseInt(modal.querySelector('#custom-hours').value) || 0;
            const minutes = parseInt(modal.querySelector('#custom-minutes').value) || 0;
            duration = (hours * 60 + minutes) * 60 * 1000;
        }
        
        let startTime = Date.now();
        if (startSelect.value === '5min') {
            startTime += 5 * 60 * 1000;
        } else if (startSelect.value === 'custom') {
            startTime = new Date(modal.querySelector('#custom-start').value).getTime();
        }
        
        const timer = {
            id: Date.now().toString(),
            inventoryId,
            typeId,
            renter,
            duration,
            startTime
        };
        
        timers.push(timer);
        saveTimers();
        renderTimers();
        renderAvailableInventory();
        modal.remove();
    });
    
    modal.querySelector('#cancel-timer').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    
    return modal;
}

function adjustStartTime(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Adjust Start Time</h3>
            <form id="adjust-form">
                <div class="form-group">
                    <label>New Start Time (today):</label>
                    <input type="time" id="new-start" required>
                </div>
                <div class="modal-buttons">
                    <button type="button" id="set-now" class="mdc-button mdc-button--outlined">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Set to Now</span>
                    </button>
                    <button type="button" id="cancel-adjust" class="mdc-button cancel-adjust">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Update</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    
    const input = modal.querySelector('#new-start');
    const startDate = new Date(timer.startTime);
    if (!isNaN(startDate.getTime())) {
        input.value = startDate.toTimeString().slice(0, 5);
    } else {
        input.value = new Date().toTimeString().slice(0, 5); // Default to now
    }
    
    modal.querySelector('#set-now').addEventListener('click', () => {
        input.value = new Date().toISOString().slice(0, 16);
    });
    
    modal.querySelector('#adjust-form').addEventListener('submit', e => {
        e.preventDefault();
        const today = new Date().toDateString();
        const newStartTime = new Date(today + ' ' + input.value).getTime();
        if (isNaN(newStartTime)) {
            alert('Invalid time. Please enter a valid time.');
            return;
        }
        timer.startTime = newStartTime;
        saveTimers();
        renderTimers();
        renderAvailableInventory();
        modal.remove();
    });
    
    modal.querySelector('#cancel-adjust').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

function stopTimer(id) {
    timers = timers.filter(t => t.id !== id);
    saveTimers();
    renderTimers();
    renderAvailableInventory();
}

function deleteTimer(id) {
    timers = timers.filter(t => t.id !== id);
    saveTimers();
    renderTimers();
    renderAvailableInventory();
}

// Inventory and object type management
function renderObjectTypes() {
    objectTypesList.innerHTML = '';
    objectTypes.forEach(type => {
        const div = document.createElement('div');
        div.className = 'mdc-card inventory-item';
        div.innerHTML = `
            <div class="mdc-card__content inventory-item-row">
                <div>
                    <div class="inventory-name">${type.icon} ${type.name}</div>
                    <div class="inventory-id">${type.id}</div>
                    <div class="inventory-meta">${type.isFilter ? 'Visible in timer filters' : 'Hidden from timer filters'}</div>
                    <div class="inventory-meta">Durations: ${type.durationPresets.join(', ')} hour(s)</div>
                </div>
                <div class="inventory-actions">
                    <button class="mdc-button mdc-button--outlined edit-type" data-id="${type.id}">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Edit</span>
                    </button>
                    <button class="mdc-button mdc-button--outlined btn-danger delete-type" data-id="${type.id}">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Delete</span>
                    </button>
                </div>
            </div>
        `;
        objectTypesList.appendChild(div);
    });

    document.querySelectorAll('.edit-type').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.closest('.mdc-button').dataset.id;
            editObjectType(id);
        });
    });

    document.querySelectorAll('.delete-type').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.closest('.mdc-button').dataset.id;
            objectTypes = objectTypes.filter(type => type.id !== id);
            inventoryItems = inventoryItems.filter(item => item.typeId !== id);
            timers = timers.filter(timer => timer.typeId !== id);
            saveObjectTypes();
            saveInventoryItems();
            saveTimers();
            renderObjectTypes();
            renderInventoryItems();
            renderFilters();
            renderTimers();
            renderAvailableInventory();
        });
    });
}

function renderInventoryItems() {
    inventoryItemsList.innerHTML = '';
    inventoryItems.forEach(item => {
        const typeData = objectTypes.find(type => type.id === item.typeId) || { icon: '❓', name: 'Unknown' };
        const div = document.createElement('div');
        div.className = 'mdc-card inventory-item';
        div.innerHTML = `
            <div class="mdc-card__content inventory-item-row">
                <div>
                    <div class="inventory-name">${item.name}</div>
                    <div class="inventory-meta">Type: ${typeData.icon} ${typeData.name}</div>
                </div>
                <div class="inventory-actions">
                    <button class="mdc-button mdc-button--outlined edit-inventory-item" data-id="${item.id}">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Edit</span>
                    </button>
                    <button class="mdc-button mdc-button--outlined btn-danger delete-inventory-item" data-id="${item.id}">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Delete</span>
                    </button>
                </div>
            </div>
        `;
        inventoryItemsList.appendChild(div);
    });

    document.querySelectorAll('.edit-inventory-item').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.closest('.mdc-button').dataset.id;
            editInventoryItem(id);
        });
    });

    document.querySelectorAll('.delete-inventory-item').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = e.target.closest('.mdc-button').dataset.id;
            inventoryItems = inventoryItems.filter(item => item.id !== id);
            timers = timers.filter(timer => timer.inventoryId !== id);
            saveInventoryItems();
            saveTimers();
            renderInventoryItems();
            renderTimers();
            renderAvailableInventory();
        });
    });
}

function editObjectType(id) {
    const type = objectTypes.find(entry => entry.id === id);
    if (!type) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Rental Object Type</h3>
            <form id="object-type-edit-form">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="object-type-name" value="${type.name}" required>
                </div>
                <div class="form-group">
                    <label>Icon:</label>
                    <select id="object-type-icon" required>
                        ${renderIconOptions(type.icon)}
                    </select>
                </div>
                <div class="form-group">
                    <label>Show as filter:</label>
                    <input type="checkbox" id="object-type-filter" ${type.isFilter ? 'checked' : ''}>
                </div>
                <div class="form-group">
                    <label>Duration presets (hours, comma separated):</label>
                    <input type="text" id="object-type-durations" value="${type.durationPresets.join(',')}">
                </div>
                <div class="modal-buttons">
                    <button type="button" class="mdc-button cancel-edit-object-type">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Save</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#object-type-edit-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        type.name = modal.querySelector('#object-type-name').value;
        type.icon = modal.querySelector('#object-type-icon').value;
        type.isFilter = modal.querySelector('#object-type-filter').checked;
        type.durationPresets = modal.querySelector('#object-type-durations').value.split(',').map(v => parseInt(v.trim())).filter(Number.isFinite);
        saveObjectTypes();
        renderObjectTypes();
        renderFilters();
        renderAvailableInventory();
        modal.remove();
    });

    modal.querySelector('.cancel-edit-object-type').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

function addObjectType() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Rental Object Type</h3>
            <form id="object-type-form">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="object-type-name" required>
                </div>
                <div class="form-group">
                    <label>Icon:</label>
                    <select id="object-type-icon" required>
                        ${renderIconOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>Show as filter:</label>
                    <input type="checkbox" id="object-type-filter" checked>
                </div>
                <div class="form-group">
                    <label>Duration presets (hours, comma separated):</label>
                    <input type="text" id="object-type-durations" value="1,2,3">
                </div>
                <div class="modal-buttons">
                    <button type="button" id="cancel-add-object-type" class="mdc-button cancel-add-object-type">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Add</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#object-type-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = modal.querySelector('#object-type-name').value;
        const icon = modal.querySelector('#object-type-icon').value;
        const isFilter = modal.querySelector('#object-type-filter').checked;
        const durationPresets = modal.querySelector('#object-type-durations').value.split(',').map(v => parseInt(v.trim())).filter(Number.isFinite);
        const id = name.toLowerCase().replace(/\s+/g, '');
        objectTypes.push({ id, name, icon, isFilter, durationPresets: durationPresets.length ? durationPresets : [1,2,3] });
        saveObjectTypes();
        renderObjectTypes();
        renderFilters();
        renderAvailableInventory();
        modal.remove();
    });

    modal.querySelector('#cancel-add-object-type').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

function editInventoryItem(id) {
    const item = inventoryItems.find(entry => entry.id === id);
    if (!item) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Inventory Item</h3>
            <form id="inventory-item-edit-form">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="inventory-item-name" value="${item.name}" required>
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select id="inventory-item-type" required>
                        ${objectTypes.map(type => `<option value="${type.id}"${type.id === item.typeId ? ' selected' : ''}>${type.icon} ${type.name}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="mdc-button cancel-edit-inventory-item">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Save</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#inventory-item-edit-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        item.name = modal.querySelector('#inventory-item-name').value;
        item.typeId = modal.querySelector('#inventory-item-type').value;
        saveInventoryItems();
        renderInventoryItems();
        renderAvailableInventory();
        modal.remove();
    });

    modal.querySelector('.cancel-edit-inventory-item').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

function addInventoryItem() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Add Inventory Item</h3>
            <form id="inventory-item-form">
                <div class="form-group">
                    <label>Name:</label>
                    <input type="text" id="inventory-item-name" placeholder="e.g., Canoe 2" required>
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select id="inventory-item-type" required>
                        ${objectTypes.map(type => `<option value="${type.id}">${type.icon} ${type.name}</option>`).join('')}
                    </select>
                </div>
                <div class="modal-buttons">
                    <button type="button" id="cancel-add-inventory-item" class="mdc-button cancel-add-inventory-item">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Cancel</span>
                    </button>
                    <button type="submit" class="mdc-button mdc-button--raised btn-primary">
                        <span class="mdc-button__ripple"></span>
                        <span class="mdc-button__label">Add</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = modal.querySelector('#inventory-item-form');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = modal.querySelector('#inventory-item-name').value;
        const typeId = modal.querySelector('#inventory-item-type').value;
        const id = `${typeId}-${Date.now()}`;
        inventoryItems.push({ id, typeId, name });
        saveInventoryItems();
        renderInventoryItems();
        renderAvailableInventory();
        modal.remove();
    });

    modal.querySelector('#cancel-add-inventory-item').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
}

function saveObjectTypes() {
    localStorage.setItem('odr_object_types', JSON.stringify(objectTypes));
}

function saveInventoryItems() {
    localStorage.setItem('odr_inventory_items', JSON.stringify(inventoryItems));
}

// Save functions
function saveTimers() {
    localStorage.setItem(TIMERS_KEY, JSON.stringify(timers));
}

// Event listeners
addTimerBtn?.addEventListener('click', addTimer);
addTimerTopBtn?.addEventListener('click', addTimer);
addObjectTypeBtn?.addEventListener('click', addObjectType);
addInventoryItemBtn?.addEventListener('click', addInventoryItem);

// Update the active live view every second so timers and availability stay current.
setInterval(() => {
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;

    if (activeSection.id === 'timers-section') {
        renderTimers();
    } else if (activeSection.id === 'available-section') {
        renderAvailableInventory();
    }
}, 1000);

// Initial render
renderObjectTypes();
renderInventoryItems();
renderAvailableInventory();
switchSection('timers');
