// =============================================================
// Premium Budget Tracker - Core Application Logic
// Handles CRUD operations, Theme toggling, LocalStorage, CSV/JSON
// export/import, and Chart.js visualization.
// =============================================================
// --- Constants & Config ---
const CATEGORIES = {
    income: [
        { value: 'salary', label: 'Salary', icon: 'briefcase' },
        { value: 'freelance', label: 'Freelance', icon: 'code' },
        { value: 'investment', label: 'Investment', icon: 'trending-up' },
        { value: 'gift', label: 'Gift', icon: 'gift' },
        { value: 'other', label: 'Other Income', icon: 'plus-circle' }
    ],
    expense: [
        { value: 'food', label: 'Food & Dining', icon: 'utensils' },
        { value: 'rent', label: 'Rent & Housing', icon: 'home' },
        { value: 'utilities', label: 'Utilities & Bills', icon: 'zap' },
        { value: 'entertainment', label: 'Entertainment', icon: 'tv' },
        { value: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
        { value: 'transport', label: 'Transport', icon: 'car' },
        { value: 'healthcare', label: 'Healthcare & Fitness', icon: 'activity' },
        { value: 'other', label: 'Other Expense', icon: 'help-circle' }
    ]
};
// Theme configuration colors for Chart.js
const CHART_THEME_COLORS = {
    'aurora-dark': ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e', '#a855f7', '#64748b'],
    'nordic-light': ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f43f5e', '#8b5cf6', '#94a3b8'],
    'cyberpunk': ['#db2777', '#06b6d4', '#eab308', '#a855f7', '#ec4899', '#f43f5e', '#10b981', '#64748b'],
    'emerald-forest': ['#10b981', '#eab308', '#059669', '#34d399', '#f59e0b', '#f43f5e', '#0d9488', '#a7f3d0']
};
// --- App State ---
let transactions = [];
let budgetGoal = 1000.00;
let currentTheme = 'aurora-dark';
let editingTransactionId = null;
let categoryChartInstance = null;
// --- DOM Elements ---
const form = document.getElementById('transaction-form');
const editIdInput = document.getElementById('edit-id');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const descriptionInput = document.getElementById('description');
const typeExpenseRadio = document.getElementById('type-expense');
const typeIncomeRadio = document.getElementById('type-income');
const formActionTitle = document.getElementById('form-action-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const submitBtn = document.getElementById('submit-btn');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const balanceIndicator = document.getElementById('balance-indicator');
const transactionListEl = document.getElementById('transaction-list');
const noTransactionsEl = document.getElementById('no-transactions');
const searchInput = document.getElementById('search-input');
const filterTypeSelect = document.getElementById('filter-type');
const filterCategorySelect = document.getElementById('filter-category');
const goalProgressBar = document.getElementById('goal-progress-bar');
const goalSpentEl = document.getElementById('goal-spent');
const goalLimitEl = document.getElementById('goal-limit');
const setBudgetBtn = document.getElementById('set-budget-btn');
// Modal Elements
const budgetModal = document.getElementById('budget-modal');
const closeBudgetModalBtn = document.getElementById('close-budget-modal');
const cancelBudgetModalBtn = document.getElementById('cancel-budget-modal');
const saveBudgetModalBtn = document.getElementById('save-budget-modal');
const budgetGoalInput = document.getElementById('budget-goal-input');
// Theme selectors
const themeButtons = document.querySelectorAll('.theme-btn');
// Data operations
const exportCsvBtn = document.getElementById('export-csv-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const importFileInput = document.getElementById('import-file');
const clearAllBtn = document.getElementById('clear-all-btn');
// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load local storage data
    loadFromLocalStorage();
    
    // Set default date to today
    setDefaultDate();
    
    // Setup form categories
    updateCategoryOptions('expense');
    
    // Add Event Listeners
    setupEventListeners();
    
    // Render Dashboard UI
    renderApp();
    
    // Re-initialize Lucide Icons
    lucide.createIcons();
});
// --- Event Listeners ---
function setupEventListeners() {
    // Type change toggle
    typeExpenseRadio.addEventListener('change', () => updateCategoryOptions('expense'));
    typeIncomeRadio.addEventListener('change', () => updateCategoryOptions('income'));
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', cancelEditing);
    
    // Filters & Search
    searchInput.addEventListener('input', renderTransactions);
    filterTypeSelect.addEventListener('change', () => {
        updateFilterCategoryOptions();
        renderTransactions();
    });
    filterCategorySelect.addEventListener('change', renderTransactions);
    
    // Theme Selector
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });
    
    // Modal controls
    setBudgetBtn.addEventListener('click', openBudgetModal);
    closeBudgetModalBtn.addEventListener('click', closeBudgetModal);
    cancelBudgetModalBtn.addEventListener('click', closeBudgetModal);
    saveBudgetModalBtn.addEventListener('click', saveBudgetGoal);
    window.addEventListener('click', (e) => {
        if (e.target === budgetModal) closeBudgetModal();
    });
    
    // Data operations
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportJsonBtn.addEventListener('click', exportToJSON);
    importFileInput.addEventListener('change', importFromJSON);
    clearAllBtn.addEventListener('click', clearAllData);
}
// Set default date input as today
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}
// --- Category Select population ---
function updateCategoryOptions(type) {
    const list = CATEGORIES[type];
    categorySelect.innerHTML = '';
    
    list.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        categorySelect.appendChild(option);
    });
}
// Update the filter dropdown categories dynamically
function updateFilterCategoryOptions() {
    const selectedType = filterTypeSelect.value;
    filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
    
    let list = [];
    if (selectedType === 'all') {
        list = [...CATEGORIES.income, ...CATEGORIES.expense];
    } else {
        list = CATEGORIES[selectedType];
    }
    
    // Deduplicate categories if needed
    const unique = [];
    const map = new Map();
    for (const item of list) {
        if(!map.has(item.value)){
            map.set(item.value, true);
            unique.push(item);
        }
    }
    
    unique.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        filterCategorySelect.appendChild(option);
    });
}
// --- Theme Management ---
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    
    // Update theme button active classes
    themeButtons.forEach(btn => {
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    localStorage.setItem('spend_tracker_theme', theme);
    
    // Update chart colors if chart is instantiated
    if (categoryChartInstance) {
        updateChartColors();
    }
}
// --- Modal Handlers ---
function openBudgetModal() {
    budgetGoalInput.value = budgetGoal;
    budgetModal.classList.add('show');
}
function closeBudgetModal() {
    budgetModal.classList.remove('show');
}
function saveBudgetGoal() {
    const val = parseFloat(budgetGoalInput.value);
    if (!isNaN(val) && val > 0) {
        budgetGoal = val;
        localStorage.setItem('spend_tracker_budget_goal', budgetGoal.toString());
        closeBudgetModal();
        renderApp();
    }
}
// --- CRUD Operations ---
// Add / Edit submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const date = dateInput.value;
    const description = descriptionInput.value.trim();
    const type = typeExpenseRadio.checked ? 'expense' : 'income';
    
    if (isNaN(amount) || amount <= 0 || !description) return;
    
    if (editingTransactionId !== null) {
        // Edit flow
        const idx = transactions.findIndex(t => t.id === editingTransactionId);
        if (idx !== -1) {
            transactions[idx] = {
                id: editingTransactionId,
                description,
                amount,
                type,
                category,
                date
            };
        }
        cancelEditing();
    } else {
        // Add Flow
        const newTransaction = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            description,
            amount,
            type,
            category,
            date
        };
        transactions.push(newTransaction);
    }
    
    saveToLocalStorage();
    renderApp();
    
    // Reset fields, maintain default date
    form.reset();
    setDefaultDate();
    typeExpenseRadio.checked = true;
    updateCategoryOptions('expense');
    
    // Re-initialize icons
    lucide.createIcons();
}
// Trigger Edit Mode
function startEditing(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;
    
    editingTransactionId = id;
    editIdInput.value = id;
    amountInput.value = t.amount;
    descriptionInput.value = t.description;
    dateInput.value = t.date;
    
    if (t.type === 'income') {
        typeIncomeRadio.checked = true;
        updateCategoryOptions('income');
    } else {
        typeExpenseRadio.checked = true;
        updateCategoryOptions('expense');
    }
    
    categorySelect.value = t.category;
    
    // Style Form header and buttons
    formActionTitle.textContent = "Edit Transaction";
    cancelEditBtn.classList.remove('hidden');
    submitBtn.innerHTML = '<i data-lucide="check"></i> Save Changes';
    submitBtn.classList.remove('primary-btn');
    submitBtn.classList.add('primary-btn'); // keep it styled nice
    
    // Scroll to form smoothly
    document.querySelector('.transaction-form-card').scrollIntoView({ behavior: 'smooth' });
    lucide.createIcons();
}
// Cancel Editing
function cancelEditing() {
    editingTransactionId = null;
    editIdInput.value = '';
    form.reset();
    setDefaultDate();
    typeExpenseRadio.checked = true;
    updateCategoryOptions('expense');
    
    formActionTitle.textContent = "Add Transaction";
    cancelEditBtn.classList.add('hidden');
    submitBtn.innerHTML = '<i data-lucide="plus"></i> Add Transaction';
    lucide.createIcons();
}
// Delete transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        
        if (editingTransactionId === id) {
            cancelEditing();
        }
        
        saveToLocalStorage();
        renderApp();
    }
}
// --- Main App Redraw & Calculations ---
function renderApp() {
    // 1. Calculate Summary figures
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpense += t.amount;
        }
    });
    
    const balance = totalIncome - totalExpense;
    
    // 2. Render summary values
    totalBalanceEl.textContent = formatCurrency(balance);
    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    
    // Style balance text and trend indicator
    if (balance < 0) {
        totalBalanceEl.className = 'stat-val text-danger';
        balanceIndicator.className = 'trend-indicator negative text-danger';
        balanceIndicator.innerHTML = '<i data-lucide="trending-down"></i> Deficit';
    } else if (balance > 0) {
        totalBalanceEl.className = 'stat-val text-success';
        balanceIndicator.className = 'trend-indicator text-success';
        balanceIndicator.innerHTML = '<i data-lucide="trending-up"></i> Surplus';
    } else {
        totalBalanceEl.className = 'stat-val';
        balanceIndicator.className = 'trend-indicator text-muted';
        balanceIndicator.innerHTML = '<i data-lucide="minus"></i> Balanced';
    }
    
    // 3. Render Budget Limit Panel
    goalLimitEl.textContent = formatCurrency(budgetGoal);
    goalSpentEl.textContent = formatCurrency(totalExpense);
    
    let budgetPercentage = 0;
    if (budgetGoal > 0) {
        budgetPercentage = Math.min((totalExpense / budgetGoal) * 100, 100);
    }
    
    goalProgressBar.style.width = `${budgetPercentage}%`;
    
    // Set Budget Goal colors based on limit warning
    if (budgetPercentage >= 95) {
        goalProgressBar.className = 'goal-progress danger';
    } else if (budgetPercentage >= 75) {
        goalProgressBar.className = 'goal-progress warning';
    } else {
        goalProgressBar.className = 'goal-progress';
    }
    
    // 4. Update filters and render transactions list
    updateFilterCategoryOptions();
    renderTransactions();
    
    // 5. Render analytics chart
    renderCharts(totalExpense);
    
    // Re-initialize Lucide Icons
    lucide.createIcons();
}
// Render filtered transactions list
function renderTransactions() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    const typeFilter = filterTypeSelect.value;
    const categoryFilter = filterCategorySelect.value;
    
    // Sort transactions by date descending, then ID descending
    const sorted = [...transactions].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateB - dateA !== 0) return dateB - dateA;
        return b.id.localeCompare(a.id);
    });
    
    const filtered = sorted.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchQuery) || 
                              t.category.toLowerCase().includes(searchQuery) ||
                              t.amount.toString().includes(searchQuery);
                              
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
        
        return matchesSearch && matchesType && matchesCategory;
    });
    
    transactionListEl.innerHTML = '';
    
    if (filtered.length === 0) {
        noTransactionsEl.classList.remove('hidden');
    } else {
        noTransactionsEl.classList.add('hidden');
        
        filtered.forEach(t => {
            const item = document.createElement('li');
            item.className = `transaction-item ${t.type}`;
            
            // Format Date
            const formattedDate = formatDate(t.date);
            const categoryObj = getCategoryObject(t.type, t.category);
            const iconName = categoryObj ? categoryObj.icon : 'help-circle';
            const categoryLabel = categoryObj ? categoryObj.label : t.category;
            
            item.innerHTML = `
                <div class="item-left">
                    <div class="category-icon-bg ${t.category}" title="${categoryLabel}">
                        <i data-lucide="${iconName}"></i>
                    </div>
                    <div class="item-details">
                        <span class="item-desc">${escapeHTML(t.description)}</span>
                        <div class="item-meta">
                            <span class="item-date">${formattedDate}</span>
                            <span class="dot"></span>
                            <span class="item-cat">${categoryLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="item-right">
                    <span class="item-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </span>
                    <div class="item-actions">
                        <button class="action-btn edit" onclick="startEditing('${t.id}')" title="Edit">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteTransaction('${t.id}')" title="Delete">
                            <i data-lucide="trash"></i>
                        </button>
                    </div>
                </div>
            `;
            transactionListEl.appendChild(item);
        });
    }
}
// --- Chart Rendering ---
function renderCharts(totalExpense) {
    const canvas = document.getElementById('categoryChart');
    const placeholder = document.getElementById('no-chart-data');
    
    // Only show the chart if there is expense data
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    if (expenseTransactions.length === 0) {
        canvas.classList.add('hidden');
        placeholder.classList.remove('hidden');
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
            categoryChartInstance = null;
        }
        return;
    }
    
    canvas.classList.remove('hidden');
    placeholder.classList.add('hidden');
    
    // Group expense by category label
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
        const catLabel = getCategoryLabel('expense', t.category);
        categoryTotals[catLabel] = (categoryTotals[catLabel] || 0) + t.amount;
    });
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = CHART_THEME_COLORS[currentTheme] || CHART_THEME_COLORS['aurora-dark'];
    
    // If instance already exists, update data and redraw
    if (categoryChartInstance) {
        categoryChartInstance.data.labels = labels;
        categoryChartInstance.data.datasets[0].data = data;
        categoryChartInstance.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
        categoryChartInstance.data.datasets[0].borderColor = getComputedStyle(document.body).getPropertyValue('--bg-card') || '#161d31';
        categoryChartInstance.update();
    } else {
        const ctx = canvas.getContext('2d');
        const cardBgColor = getComputedStyle(document.body).getPropertyValue('--bg-card') || '#161d31';
        const textPrimaryColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#f8fafc';
        
        categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: cardBgColor,
                    borderWidth: 2,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textPrimaryColor,
                            font: {
                                family: 'Plus Jakarta Sans',
                                size: 11,
                                weight: '500'
                            },
                            boxWidth: 12,
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                const percent = ((val / totalExpense) * 100).toFixed(1);
                                return ` ${context.label}: $${val.toFixed(2)} (${percent}%)`;
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}
// Update chart theme colors when user toggles theme
function updateChartColors() {
    if (!categoryChartInstance) return;
    const colors = CHART_THEME_COLORS[currentTheme];
    const textPrimaryColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#f8fafc';
    const cardBgColor = getComputedStyle(document.body).getPropertyValue('--bg-card') || '#161d31';
    
    categoryChartInstance.data.datasets[0].backgroundColor = colors.slice(0, categoryChartInstance.data.labels.length);
    categoryChartInstance.data.datasets[0].borderColor = cardBgColor;
    categoryChartInstance.options.plugins.legend.labels.color = textPrimaryColor;
    categoryChartInstance.update();
}
// --- Import & Export Operations ---
// 1. Export as CSV
function exportToCSV() {
    if (transactions.length === 0) {
        alert('No data to export.');
        return;
    }
    
    const headers = ['ID', 'Date', 'Description', 'Type', 'Category', 'Amount ($)'];
    const csvRows = [headers.join(',')];
    
    transactions.forEach(t => {
        const row = [
            t.id,
            t.date,
            `"${t.description.replace(/"/g, '""')}"`, // Quote strings and escape double quotes
            t.type,
            t.category,
            t.amount.toFixed(2)
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SmartSpend_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// 2. Export as JSON
function exportToJSON() {
    if (transactions.length === 0) {
        alert('No data to export.');
        return;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `SmartSpend_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// 3. Import JSON Backup
function importFromJSON(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            
            // Basic structure validation
            if (Array.isArray(imported) && imported.every(item => item.id && item.description && item.amount && item.type && item.category && item.date)) {
                if (confirm(`Are you sure you want to import ${imported.length} transactions? This will overwrite your current logs.`)) {
                    transactions = imported;
                    saveToLocalStorage();
                    renderApp();
                    alert('Data imported successfully!');
                }
            } else {
                alert('Invalid file format. Please upload a valid JSON backup file created by this application.');
            }
        } catch (err) {
            alert('Error parsing JSON file. Please check that the file is not corrupted.');
        }
    };
    reader.readAsText(file);
    // Reset file input value
    importFileInput.value = '';
}
// 4. Reset/Clear Data
function clearAllData() {
    if (confirm('CRITICAL: Are you sure you want to reset the application? This will permanently delete all logged transactions and reset your budget targets.')) {
        transactions = [];
        budgetGoal = 1000.00;
        localStorage.removeItem('spend_tracker_transactions');
        localStorage.removeItem('spend_tracker_budget_goal');
        
        cancelEditing();
        renderApp();
    }
}
// --- Helper Functions ---
function formatCurrency(num) {
    return '$' + Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    return dateStr;
}
function getCategoryObject(type, val) {
    return CATEGORIES[type].find(c => c.value === val);
}
function getCategoryLabel(type, val) {
    const obj = getCategoryObject(type, val);
    return obj ? obj.label : val;
}
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
// --- Local Storage Integration ---
function saveToLocalStorage() {
    localStorage.setItem('spend_tracker_transactions', JSON.stringify(transactions));
}
function loadFromLocalStorage() {
    const rawTransactions = localStorage.getItem('spend_tracker_transactions');
    if (rawTransactions) {
        try {
            transactions = JSON.parse(rawTransactions);
        } catch(e) {
            transactions = [];
        }
    } else {
        // Load mock/starter data to populate dashboard immediately with beautiful details
        loadMockData();
    }
    
    const rawGoal = localStorage.getItem('spend_tracker_budget_goal');
    if (rawGoal) {
        budgetGoal = parseFloat(rawGoal);
    }
    
    const rawTheme = localStorage.getItem('spend_tracker_theme');
    if (rawTheme) {
        setTheme(rawTheme);
    } else {
        setTheme('aurora-dark'); // default theme
    }
}
// Pre-populate with beautiful mock data on first load to show off the UI & Charts
function loadMockData() {
    const now = new Date();
    const formatDateStr = (daysAgo) => {
        const d = new Date();
        d.setDate(now.getDate() - daysAgo);
        return d.toISOString().split('T')[0];
    };
    
    transactions = [
        { id: 'mock1', description: 'Monthly Salary', amount: 3200.00, type: 'income', category: 'salary', date: formatDateStr(10) },
        { id: 'mock2', description: 'UX/UI Freelance Design Project', amount: 850.00, type: 'income', category: 'freelance', date: formatDateStr(3) },
        { id: 'mock3', description: 'Apartment Monthly Rent', amount: 1200.00, type: 'expense', category: 'rent', date: formatDateStr(9) },
        { id: 'mock4', description: 'Whole Foods Grocery Shopping', amount: 154.30, type: 'expense', category: 'food', date: formatDateStr(7) },
        { id: 'mock5', description: 'Electricity & Gas Bills', amount: 112.50, type: 'expense', category: 'utilities', date: formatDateStr(6) },
        { id: 'mock6', description: 'AMC Movie Theater Tickets', amount: 45.00, type: 'expense', category: 'entertainment', date: formatDateStr(4) },
        { id: 'mock7', description: 'Nike Running Sneakers', amount: 120.00, type: 'expense', category: 'shopping', date: formatDateStr(2) },
        { id: 'mock8', description: 'Uber Rides & Gas Refill', amount: 65.80, type: 'expense', category: 'transport', date: formatDateStr(1) }
    ];
    saveToLocalStorage();
}