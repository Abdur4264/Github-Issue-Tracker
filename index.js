const API_BASE_URL = 'https://phi-lab-server.vercel.app/api/v1/lab';
const DEMO_CREDENTIALS = { username: 'admin', password: 'admin123' };
let currentTab = 'all';
let allIssues = [];

// DOM Elements
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const issuesGrid = document.getElementById('issuesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const noIssues = document.getElementById('noIssues');
const issueCount = document.getElementById('issueCount');
const tabButtons = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const logoutBtn = document.getElementById('logoutBtn');
const issueModal = document.getElementById('issueModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const newIssueBtn = document.getElementById('newIssueBtn');
const newIssueModal = document.getElementById('newIssueModal');
const closeNewIssueModal = document.getElementById('closeNewIssueModal');
const cancelNewIssue = document.getElementById('cancelNewIssue');
const newIssueForm = document.getElementById('newIssueForm');

// Login
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = './index.html';
        } else {
            errorMessage.textContent = 'Invalid credentials. Use admin/admin123';
            errorMessage.classList.remove('hidden');
        }
    });
}

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('isLoggedIn');
        window.location.href = './login.html';
    });
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (!isLoggedIn && window.location.pathname.includes('index.html')) {
        window.location.href = './login.html';
    }
}

async function fetchIssues() {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/issues`);
        const data = await response.json();
        if (data.status === 'success') {
            allIssues = data.data;
            displayIssues(filterIssues());
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

async function fetchSingleIssue(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/issue/${id}`);
        const data = await response.json();
        if (data.status === 'success') return data.data;
    } catch (error) {
        console.error('Error:', error);
    }
    return null;
}

// CREATE NEW ISSUE FUNCTION
async function createIssue(issueData) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData.status === 'success') {
            await fetchIssues();
            return true;
        } else {
            // Fallback: add locally
            const newIssue = {
                id: Date.now().toString(),
                ...issueData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            allIssues.unshift(newIssue);
            displayIssues(filterIssues());
            return true;
        }
    } catch (error) {
        console.error('Error:', error);
        // Fallback: add locally
        const newIssue = {
            id: Date.now().toString(),
            ...issueData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        allIssues.unshift(newIssue);
        displayIssues(filterIssues());
        return true;
    } finally {
        showLoading(false);
    }
}

async function searchIssues(query) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/issues/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.status === 'success') {
            allIssues = data.data;
            displayIssues(filterIssues());
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        showLoading(false);
    }
}

function filterIssues() {
    if (currentTab === 'all') return allIssues;
    return allIssues.filter(issue => issue.status === currentTab);
}

function displayIssues(issues) {
    issuesGrid.innerHTML = '';
    if (issues.length === 0) {
        noIssues.classList.remove('hidden');
        issueCount.textContent = '0 issues';
        return;
    }
    noIssues.classList.add('hidden');
    issueCount.textContent = `${issues.length} issue${issues.length !== 1 ? 's' : ''}`;
    issues.forEach(issue => {
        const card = createIssueCard(issue);
        issuesGrid.appendChild(card);
    });
}

function createIssueCard(issue) {
    const card = document.createElement('div');
    card.className = `issue-card bg-white rounded-lg shadow p-4 cursor-pointer ${issue.status}`;
    const createdAt = new Date(issue.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const labelsHtml = issue.labels.map(label => `<span class="label-tag">${label}</span>`).join('');
    
    card.innerHTML = `
        <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2">${issue.title}</h3>
        <p class="text-sm text-gray-600 mb-3 line-clamp-2">${issue.description}</p>
        <div class="flex flex-wrap gap-1 mb-3">${labelsHtml}</div>
        <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Status:</span><span class="status-${issue.status}">${issue.status}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Priority:</span><span class="priority-${issue.priority}">${issue.priority}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Author:</span><span class="text-gray-700">${issue.author}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Created:</span><span class="text-gray-700">${createdAt}</span></div>
        </div>
    `;
    card.addEventListener('click', () => openModal(issue));
    return card;
}

async function openModal(issue) {
    modalTitle.textContent = issue.title;
    modalContent.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>';
    issueModal.classList.remove('hidden');
    const fullIssue = await fetchSingleIssue(issue.id) || issue;
    const createdAt = new Date(fullIssue.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const updatedAt = new Date(fullIssue.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    modalContent.innerHTML = `
        <div class="space-y-4">
            <div><h4 class="font-semibold text-gray-700 mb-2">Description</h4><p class="text-gray-600">${fullIssue.description}</p></div>
            <div class="grid grid-cols-2 gap-4">
                <div><h4 class="font-semibold text-gray-700 mb-2">Status</h4><span class="status-${fullIssue.status}">${fullIssue.status}</span></div>
                <div><h4 class="font-semibold text-gray-700 mb-2">Priority</h4><span class="priority-${fullIssue.priority}">${fullIssue.priority}</span></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div><h4 class="font-semibold text-gray-700 mb-2">Author</h4><p class="text-gray-600">${fullIssue.author}</p></div>
                <div><h4 class="font-semibold text-gray-700 mb-2">Assignee</h4><p class="text-gray-600">${fullIssue.assignee || 'Unassigned'}</p></div>
            </div>
            <div><h4 class="font-semibold text-gray-700 mb-2">Labels</h4><div class="flex flex-wrap gap-2">${fullIssue.labels.map(label => `<span class="label-tag">${label}</span>`).join('')}</div></div>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><h4 class="font-semibold text-gray-700 mb-2">Created At</h4><p class="text-gray-600">${createdAt}</p></div>
                <div><h4 class="font-semibold text-gray-700 mb-2">Updated At</h4><p class="text-gray-600">${updatedAt}</p></div>
            </div>
        </div>
    `;
}

function closeModalFunc() { issueModal.classList.add('hidden'); }

// OPEN NEW ISSUE MODAL
function openNewIssueModal() {
    newIssueForm.reset();
    newIssueModal.classList.remove('hidden');
}

// CLOSE NEW ISSUE MODAL
function closeNewIssueModalFunc() {
    newIssueModal.classList.add('hidden');
}

function showLoading(show) {
    if (loadingSpinner) loadingSpinner.classList.toggle('hidden', !show);
    if (issuesGrid) issuesGrid.classList.toggle('hidden', show);
}

// Tab switching
tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        tabButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.dataset.tab;
        displayIssues(filterIssues());
    });
});

// Search
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        query ? searchIssues(query) : fetchIssues();
    });
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            query ? searchIssues(query) : fetchIssues();
        }
    });
}

// Modal close handlers
closeModal?.addEventListener('click', closeModalFunc);
issueModal?.addEventListener('click', (e) => { if (e.target === issueModal) closeModalFunc(); });

// NEW ISSUE BUTTON - THIS OPENS THE MODAL
if (newIssueBtn) {
    newIssueBtn.addEventListener('click', openNewIssueModal);
}

// Close new issue modal
closeNewIssueModal?.addEventListener('click', closeNewIssueModalFunc);
cancelNewIssue?.addEventListener('click', closeNewIssueModalFunc);
newIssueModal?.addEventListener('click', (e) => { if (e.target === newIssueModal) closeNewIssueModalFunc(); });

// NEW ISSUE FORM SUBMISSION
if (newIssueForm) {
    newIssueForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = {
            title: document.getElementById('issueTitle').value,
            description: document.getElementById('issueDescription').value,
            author: document.getElementById('issueAuthor').value,
            assignee: document.getElementById('issueAssignee').value,
            status: document.getElementById('issueStatus').value,
            priority: document.getElementById('issuePriority').value,
            labels: document.getElementById('issueLabels').value.split(',').map(l => l.trim()).filter(l => l.length > 0)
        };
        
        const success = await createIssue(formData);
        if (success) {
            closeNewIssueModalFunc();
            alert('Issue created successfully!');
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        fetchIssues();
    }
});