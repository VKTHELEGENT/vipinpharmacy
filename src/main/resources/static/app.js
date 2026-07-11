/**
 * MediFlow - Pharmacy Manager Frontend Logic
 * Supports Hybrid Modes:
 * - Online: Java Spring Boot & MySQL Relational DB
 * - Offline Fallback: LocalStorage database emulation (no running server required)
 */

// --- Pre-seeded fallback data ---
const SEED_USERS = [
    { username: 'patient1', password: 'patient123', email: 'patient1@example.com', role: 'PATIENT' },
    { username: 'patient2', password: 'patient123', email: 'patient2@example.com', role: 'PATIENT' },
    { username: 'faculty1', password: 'faculty123', email: 'faculty1@example.com', role: 'FACULTY' },
    { username: 'patient_admin', password: 'admin123', email: 'admin@example.com', role: 'PATIENT' },
    { username: 'admin', password: 'faculty123', email: 'admin@example.com', role: 'FACULTY' }
];

const SEED_MEDICINES = [
    { id: 1, name: 'Paracetamol', quantity: 20, available: true, details: 'Pain reliever and fever reducer. Dosage: 500mg tablets. Take 1-2 tablets every 4-6 hours as needed.' },
    { id: 2, name: 'Ibuprofen', quantity: 14, available: true, details: 'Anti-inflammatory medication. Dosage: 200mg tablets. Take with food. Maximum 1200mg per day.' },
    { id: 3, name: 'Amoxicillin', quantity: 25, available: true, details: 'Antibiotic for bacterial infections. Dosage: 250mg capsules. Take as prescribed by doctor.' },
    { id: 4, name: 'Aspirin', quantity: 12, available: true, details: 'Blood thinner and pain reliever. Dosage: 75-100mg tablets. Take as directed by doctor.' },
    { id: 5, name: 'Cetirizine', quantity: 30, available: true, details: 'Antihistamine for allergies. Dosage: 10mg tablets. Take one tablet daily as needed.' },
    { id: 6, name: 'Montasulac', quantity: 25, available: true, details: 'It is medicine used for treating asthma and allergy symptoms.' },
    { id: 7, name: 'Dollo-650', quantity: 18, available: true, details: 'Medicine used as pain killer and also fever relief. Dosage: 650mg. Take after food, maintaining 6-8 hr gaps.' },
    { id: 8, name: 'Fruticote', quantity: 6, available: false, details: 'Used to maintain glucose levels in blood and body. Consumed before food.' }
];

// --- Application Global State ---
let APP_STATE = {
    mode: 'auto',             // 'online' | 'offline'
    sessionUser: null,        // { username: string, type: 'patient'|'faculty' }
    activeRoleTab: 'patient', // 'patient' | 'faculty'
    patientMode: 'login',     // 'login' | 'register'
    deleteTargetId: null,     // id of medicine marked for deletion
    isCollapsibleAddMedOpen: false
};

// --- LocalStorage Database Controllers (Offline Mode fallback) ---
function getLocalMedicines() {
    if (!localStorage.getItem('mediflow_medicines')) {
        localStorage.setItem('mediflow_medicines', JSON.stringify(SEED_MEDICINES));
    }
    return JSON.parse(localStorage.getItem('mediflow_medicines'));
}

function saveLocalMedicines(meds) {
    localStorage.setItem('mediflow_medicines', JSON.stringify(meds));
}

function getLocalUsers() {
    if (!localStorage.getItem('mediflow_users')) {
        localStorage.setItem('mediflow_users', JSON.stringify(SEED_USERS));
    }
    return JSON.parse(localStorage.getItem('mediflow_users'));
}

function saveLocalUsers(users) {
    localStorage.setItem('mediflow_users', JSON.stringify(users));
}

function getMockSession() {
    const session = sessionStorage.getItem('mediflow_mock_session');
    return session ? JSON.parse(session) : null;
}

function saveMockSession(user) {
    if (user) {
        sessionStorage.setItem('mediflow_mock_session', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('mediflow_mock_session');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Load theme settings
    initTheme();

    // Attach event listeners
    initEventHandlers();

    // Verify connection to Java server
    checkSession();
});

// --- Server API Queries & Connectivity Testing ---
async function checkSession() {
    try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const data = await response.json();
            APP_STATE.mode = 'online';
            APP_STATE.sessionUser = { username: data.username, type: data.type };
            updateHeaderUserMenu();
            navigateToScreen(data.type);
            console.log("Connected to Java Back-end: MySQL Relational mode active.");
        } else if (response.status === 404) {
            // API endpoints are not available on this server, fall back to offline database
            throw new Error("404 API not found");
        } else {
            // Server responds but session is missing, keep online
            APP_STATE.mode = 'online';
            navigateToScreen('auth');
        }
    } catch (error) {
        console.warn("Backend server not responding. Falling back to local offline mode:", error);
        APP_STATE.mode = 'offline';
        
        // Retrieve mock session
        const mockUser = getMockSession();
        if (mockUser) {
            APP_STATE.sessionUser = mockUser;
            updateHeaderUserMenu();
            navigateToScreen(mockUser.type);
        } else {
            navigateToScreen('auth');
        }
        
        showToast("Running Local Mode", "No backend server detected. Simulating via browser LocalStorage.", "info");
    }
}

// --- Event Handlers & Core Bindings ---
function initEventHandlers() {
    // Autohide patient search suggestions when clicking outside
    document.addEventListener('click', (e) => {
        const autocomplete = document.getElementById('patient-search-autocomplete');
        const input = document.getElementById('patient-search-input');
        if (autocomplete && input && !autocomplete.contains(e.target) && e.target !== input) {
            autocomplete.style.display = 'none';
        }
    });

    // Connect autocomplete search inputs
    const patSearchInput = document.getElementById('patient-search-input');
    if (patSearchInput) {
        patSearchInput.addEventListener('input', () => {
            handlePatientSearchAutocomplete(patSearchInput.value);
        });
    }

    // Connect custom delete confirmation button
    const confirmDeleteBtn = document.getElementById('delete-confirm-btn-trigger');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            executeMedicineDelete();
        });
    }

    // Connect Theme Switcher
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', nextTheme);
            localStorage.setItem('mediflow_theme', nextTheme);
            updateThemeIcons(nextTheme);
            showToast("Theme Updated", `Switched to ${nextTheme} skin mode.`, 'info');
        });
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('mediflow_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcons(savedTheme);
}

function updateThemeIcons(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    if (sunIcon && moonIcon) {
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
}

// --- Navigation Engine ---
function navigateToScreen(target) {
    // Hide all viewports
    document.querySelectorAll('.app-screen-view').forEach(view => {
        view.classList.remove('visible');
    });

    let modeText = APP_STATE.mode === 'online' ? 'Cloud Server Connected' : 'Offline LocalStorage';

    if (target === 'auth') {
        document.getElementById('screen-auth').classList.add('visible');
        resetLoginForm();
    } else if (target === 'forgot') {
        document.getElementById('screen-forgot-pwd').classList.add('visible');
        resetForgotForm();
    } else if (target === 'patient') {
        document.getElementById('screen-patient-dashboard').classList.add('visible');
        document.getElementById('patient-dashboard-welcome-msg').textContent = `Welcome back! Checked access token verified for ${APP_STATE.sessionUser.username}. (${modeText})`;
        renderPatientDashboard();
    } else if (target === 'faculty') {
        document.getElementById('screen-faculty-dashboard').classList.add('visible');
        document.getElementById('faculty-dashboard-welcome-msg').textContent = `Staff Member: ${APP_STATE.sessionUser.username}. Session Active. (${modeText})`;
        renderFacultyDashboard();
    }
}

function handleLogoClick(e) {
    e.preventDefault();
    if (APP_STATE.sessionUser) {
        navigateToScreen(APP_STATE.sessionUser.type === 'patient' ? 'patient' : 'faculty');
    } else {
        navigateToScreen('auth');
    }
}

function updateHeaderUserMenu() {
    const menuEl = document.getElementById('header-user-menu');
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    const logoutBtn = document.getElementById('header-logout-btn');

    if (APP_STATE.sessionUser) {
        menuEl.style.display = 'flex';
        avatarEl.textContent = APP_STATE.sessionUser.username[0].toUpperCase();
        nameEl.textContent = `${APP_STATE.sessionUser.username} (${APP_STATE.sessionUser.type})`;
        
        logoutBtn.onclick = async () => {
            if (APP_STATE.mode === 'online') {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                    console.error("Logout fetch error", e);
                }
            } else {
                saveMockSession(null);
            }
            APP_STATE.sessionUser = null;
            menuEl.style.display = 'none';
            showToast("Logged Out", "Session ended successfully.", "info");
            navigateToScreen('auth');
        };
    } else {
        menuEl.style.display = 'none';
    }
}

// --- Auth Tabs toggles ---
function switchAuthTab(role) {
    APP_STATE.activeRoleTab = role;
    
    document.getElementById('btn-tab-patient').classList.toggle('active', role === 'patient');
    document.getElementById('btn-tab-faculty').classList.toggle('active', role === 'faculty');

    const titleEl = document.getElementById('auth-title');
    const descEl = document.getElementById('auth-desc');
    const modeSelector = document.getElementById('group-patient-mode');

    if (role === 'patient') {
        titleEl.textContent = "Patient Access";
        descEl.textContent = "Sign in to check medicine availability and stock details.";
        modeSelector.style.display = 'flex';
        switchPatientMode(APP_STATE.patientMode);
    } else {
        titleEl.textContent = "Faculty Access Secure Portal";
        descEl.textContent = "Pharmacy managers login to restock database, verify catalog, or customize details.";
        modeSelector.style.display = 'none';
        document.getElementById('group-register-email').style.display = 'none';
        document.getElementById('btn-auth-submit').textContent = "Access Portal Dashboard";
    }
    
    document.getElementById('auth-password').value = '';
}

function switchPatientMode(mode) {
    APP_STATE.patientMode = mode;
    const emailGroup = document.getElementById('group-register-email');
    const submitBtn = document.getElementById('btn-auth-submit');

    if (mode === 'login') {
        emailGroup.style.display = 'none';
        submitBtn.textContent = "Sign In To Account";
    } else {
        emailGroup.style.display = 'block';
        submitBtn.textContent = "Create Brand New Account";
    }
}

function resetLoginForm() {
    document.getElementById('auth-form').reset();
    switchAuthTab('patient');
    switchPatientMode('login');
}

// --- Auth submissions (Dual modes support) ---
async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const email = document.getElementById('auth-email').value.trim();
    
    if (!username || !password) {
        showToast("Missing Inputs", "Please enter both username and password.", "warning");
        return;
    }

    if (APP_STATE.mode === 'online') {
        // ONLINE MODE (RELIANT ON JAVA / MYSQL SERVER)
        try {
            if (APP_STATE.activeRoleTab === 'patient' && APP_STATE.patientMode === 'register') {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, email, role: 'PATIENT' })
                });
                const data = await res.json();
                if (res.ok) {
                    APP_STATE.sessionUser = { username: data.username, type: data.type };
                    updateHeaderUserMenu();
                    showToast("Account Created", "Successfully registered inside MySQL DB.", "success");
                    navigateToScreen('patient');
                } else {
                    showToast("Register Failed", data.error || "Username may already be taken.", "danger");
                }
            } else {
                const role = APP_STATE.activeRoleTab.toUpperCase(); 
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role })
                });
                const data = await res.json();
                if (res.ok) {
                    APP_STATE.sessionUser = { username: data.username, type: data.type };
                    updateHeaderUserMenu();
                    showToast("Success", "Authenticated via SQL database.", "success");
                    navigateToScreen(data.type);
                } else {
                    showToast("Access Denied", data.error || "Invalid credentials.", "danger");
                }
            }
        } catch (err) {
            console.error("Auth submit error:", err);
            showToast("Server Connection Failed", "Check your MySQL connection settings in properties.", "danger");
        }
    } else {
        // OFFLINE MODE FALLBACK (LOCAL STORAGE)
        const localUsers = getLocalUsers();
        const role = APP_STATE.activeRoleTab.toUpperCase();

        if (APP_STATE.activeRoleTab === 'patient' && APP_STATE.patientMode === 'register') {
            // Register inside local storage
            const userExists = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === 'PATIENT');
            if (userExists) {
                showToast("Register Failed", "Username is already taken.", "danger");
                return;
            }
            const newUser = { username, password, email, role: 'PATIENT' };
            localUsers.push(newUser);
            saveLocalUsers(localUsers);

            APP_STATE.sessionUser = { username, type: 'patient' };
            saveMockSession(APP_STATE.sessionUser);
            updateHeaderUserMenu();
            showToast("Account Created (Offline)", "Successfully registered in LocalStorage config.", "success");
            navigateToScreen('patient');
        } else {
            // Login Validation Offline
            const matchedUser = localUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password && u.role === role);
            if (matchedUser) {
                APP_STATE.sessionUser = { username: matchedUser.username, type: role.toLowerCase() };
                saveMockSession(APP_STATE.sessionUser);
                updateHeaderUserMenu();
                showToast("Success", "Authenticated via LocalStorage cache.", "success");
                navigateToScreen(role.toLowerCase());
            } else {
                showToast("Access Denied", "Incorrect credentials or account role mismatch.", "danger");
            }
        }
    }
}

// --- Forgot/Reset Password logic ---
function resetForgotForm() {
    document.getElementById('forgot-step-email').style.display = 'block';
    document.getElementById('forgot-step-reset').style.display = 'none';
    document.getElementById('forgot-email').value = '';
    document.getElementById('reset-code').value = '';
    document.getElementById('reset-new-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
}

async function handleForgotEmailSubmit(e) {
    e.preventDefault();
    const userRole = document.getElementById('forgot-user-role').value;
    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
        showToast("Missing Email", "Please enter your registered email.", "warning");
        return;
    }

    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, userType: userRole })
            });
            const data = await res.json();
            if (res.ok) {
                document.getElementById('forgot-step-email').style.display = 'none';
                document.getElementById('forgot-step-reset').style.display = 'block';
                const feedbackEl = document.getElementById('forgot-code-alert-status');
                feedbackEl.innerHTML = `⚠️ Verification Code Emulated!<br>Email: <b>${email}</b><br>Code: <b style="font-size:1.15rem; color:var(--text-primary); background:rgba(255,255,255,0.7); padding:0.1rem 0.5rem; border-radius:4px;">${data.code}</b>`;
                showToast("Verify Code Sent", "Code displayed on page.", "success");
            } else {
                showToast("Email Error", data.error || "Email not found.", "danger");
            }
        } catch (err) {
            console.error(err);
            showToast("Connection Problem", "Server connection timed out.", "danger");
        }
    } else {
        // Offline Forgot flow
        const localUsers = getLocalUsers();
        const userExists = localUsers.find(u => u.email === email && u.role === userRole.toUpperCase());
        if (!userExists) {
            showToast("Email Error", "No registered account matches this email & role.", "danger");
            return;
        }

        const mockCode = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem('mediflow_forgot_code', JSON.stringify({ email, code: mockCode, expires: Date.now() + 600000, username: userExists.username }));

        document.getElementById('forgot-step-email').style.display = 'none';
        document.getElementById('forgot-step-reset').style.display = 'block';
        const feedbackEl = document.getElementById('forgot-code-alert-status');
        feedbackEl.innerHTML = `⚠️ Local Verification Code Emulated!<br>Email: <b>${email}</b><br>Code: <b style="font-size:1.15rem; color:var(--text-primary); background:rgba(255,255,255,0.7); padding:0.1rem 0.5rem; border-radius:4px;">${mockCode}</b>`;
        showToast("Code Generated", "Validation code generated locally.", "success");
    }
}

async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;
    const confirmPassword = document.getElementById('reset-confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast("Mismatched inputs", "Passwords do not match.", "warning");
        return;
    }

    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword, confirmPassword })
            });
            const data = await res.json();
            if (res.ok) {
                showToast("Password Saved", "Reset completed. Please login.", "success");
                navigateToScreen('auth');
            } else {
                showToast("Reset Failed", data.error || "Verify token invalid.", "danger");
            }
        } catch (err) {
            console.error(err);
            showToast("System Error", "Reset password service experienced an error.", "danger");
        }
    } else {
        // Offline Reset flow
        const codeRecord = JSON.parse(localStorage.getItem('mediflow_forgot_code'));
        if (!codeRecord || codeRecord.email !== email || codeRecord.code !== code || Date.now() > codeRecord.expires) {
            showToast("Reset Failed", "Invalid or expired verification code.", "danger");
            return;
        }

        const localUsers = getLocalUsers();
        const userObj = localUsers.find(u => u.username === codeRecord.username);
        if (userObj) {
            userObj.password = newPassword;
            saveLocalUsers(localUsers);
            localStorage.removeItem('mediflow_forgot_code');
            showToast("Password Saved (Offline)", "Credential changed locally. Please login.", "success");
            navigateToScreen('auth');
        } else {
            showToast("Error", "Internal user lookup failure.", "danger");
        }
    }
}

// --- Patient Dashboard logic ---
async function renderPatientDashboard() {
    let meds = [];
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch('/api/medicines');
            if (res.ok) meds = await res.json();
        } catch (err) {
            console.error("Fetch medicines online failed", err);
        }
    } else {
        meds = getLocalMedicines();
    }

    const lowStock = meds.filter(m => m.quantity < 18);

    // 1. Populate Stock warning list
    const banner = document.getElementById('patient-low-stock-alert-banner');
    const lowStockList = document.getElementById('patient-low-stock-list');
    
    if (lowStockList) {
        lowStockList.innerHTML = '';
        if (lowStock.length > 0) {
            banner.style.display = 'block';
            lowStock.forEach(m => {
                const li = document.createElement('li');
                li.textContent = `📍 ${m.name} - Only ${m.quantity} strips left in inventory.`;
                lowStockList.appendChild(li);
            });
        } else {
            banner.style.display = 'none';
        }
    }

    // 2. Populate Grid View
    const grid = document.getElementById('patient-meds-grid');
    if (grid) {
        grid.innerHTML = '';
        if (meds.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-secondary);">No medicines found in catalog.</div>`;
            return;
        }

        meds.forEach(m => {
            const card = document.createElement('div');
            const isLowStock = m.quantity < 18;
            const isOutOfStock = m.quantity === 0;
            
            card.className = `med-card ${isOutOfStock ? 'out-of-stock-border' : (isLowStock ? 'low-stock-warning-border' : '')} fade-in-anim`;
            card.onclick = () => openMedicineDetailsModal(m.id);

            const badgeElement = m.available 
                ? `<span class="badge badge-success">Available</span>` 
                : `<span class="badge badge-danger">Out of Stock</span>`;

            card.innerHTML = `
                <div class="med-card-info">
                    <h4>${m.name}</h4>
                    <div class="med-card-row">
                        <span class="med-card-label">Current Stock:</span>
                        <span class="med-card-val">${m.quantity} Strips</span>
                    </div>
                    <div class="med-card-row">
                        <span class="med-card-label">Order Availability:</span>
                        <span class="med-card-val">${badgeElement}</span>
                    </div>
                </div>
                ${isLowStock && !isOutOfStock ? `<div class="low-stock-warning">⚠️ Restock Alert (Low Stock)</div>` : ''}
                ${isOutOfStock ? `<div class="low-stock-warning" style="color:var(--danger)">🚫 OUT OF STOCK</div>` : ''}
            `;
            grid.appendChild(card);
        });
    }
}

// --- Patient Autocomplete search ---
async function handlePatientSearchAutocomplete(query) {
    const dropdown = document.getElementById('patient-search-autocomplete');
    if (!dropdown) return;

    query = query.toLowerCase().trim();
    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    let matches = [];
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`);
            if (res.ok) matches = await res.json();
        } catch (err) {
            console.error(err);
        }
    } else {
        const localMeds = getLocalMedicines();
        matches = localMeds.filter(m => m.name.toLowerCase().includes(query) || (m.details && m.details.toLowerCase().includes(query)));
    }

    dropdown.innerHTML = '';
    if (matches.length > 0) {
        dropdown.style.display = 'block';
        matches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'autocomplete-row';
            div.innerHTML = `
                <span>${m.name}</span>
                <span class="qty-pill">${m.quantity} strips</span>
            `;
            div.onclick = () => {
                openMedicineDetailsModal(m.id);
                document.getElementById('patient-search-input').value = m.name;
                dropdown.style.display = 'none';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'block';
        dropdown.innerHTML = `<div style="padding:0.75rem 1.25rem; font-size:0.9rem; color:var(--text-secondary);">No results match "${query}"</div>`;
    }
}

// --- Faculty Control Center rendering ---
async function renderFacultyDashboard() {
    const query = document.getElementById('faculty-search-input').value.trim();
    let meds = [];

    if (APP_STATE.mode === 'online') {
        try {
            const requestUrl = query ? `/api/medicines/search?q=${encodeURIComponent(query)}` : '/api/medicines';
            const res = await fetch(requestUrl);
            if (res.ok) meds = await res.json();
        } catch (err) {
            console.error("Faculty fetch online failed", err);
        }
    } else {
        const localMeds = getLocalMedicines();
        meds = query 
            ? localMeds.filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
            : localMeds;
    }

    const lowStock = meds.filter(m => m.quantity < 18);

    // 1. Populate Stock warning list
    const banner = document.getElementById('faculty-low-stock-alert-banner');
    const lowStockList = document.getElementById('faculty-low-stock-list');
    
    if (lowStockList) {
        lowStockList.innerHTML = '';
        if (lowStock.length > 0) {
            banner.style.display = 'block';
            lowStock.forEach(m => {
                const li = document.createElement('li');
                li.textContent = `🚨 ${m.name} - Only ${m.quantity} strips in archive. Restock requested immediately.`;
                lowStockList.appendChild(li);
            });
        } else {
            banner.style.display = 'none';
        }
    }

    // 2. Count metrics
    document.getElementById('faculty-inv-counter').textContent = `Total Loaded: ${meds.length}`;

    // 3. Grid elements rendering
    const grid = document.getElementById('faculty-meds-grid');
    if (grid) {
        grid.innerHTML = '';
        if (meds.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--text-secondary);">Search matches no items.</div>`;
            return;
        }

        meds.forEach(m => {
            const card = document.createElement('div');
            const isLowStock = m.quantity < 18;
            const isOutOfStock = m.quantity === 0;

            card.className = `med-card ${isOutOfStock ? 'out-of-stock-border' : (isLowStock ? 'low-stock-warning-border' : '')} fade-in-anim`;
            card.style.cursor = 'default';

            card.innerHTML = `
                <div class="med-card-info" onclick="openMedicineDetailsModal(${m.id})" style="cursor:pointer; margin-bottom: 0.5rem;" title="Click to view full details">
                    <h4 style="display:flex; justify-content:space-between; align-items:center;">
                        <span>${m.name}</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </h4>
                    <p style="font-size:0.825rem; color:var(--text-muted); white-space: nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom: 0.5rem;">${m.details || 'No catalog details provided.'}</p>
                </div>
                
                <div class="med-card-row" style="margin-top: 0.25rem;">
                    <span class="med-card-label">Active Visibility:</span>
                    <div class="custom-toggle-switch ${m.available ? 'active' : ''}" onclick="toggleAvailability(${m.id}, ${m.available})">
                        <div class="toggle-slider-outer">
                            <div class="toggle-slider-inner"></div>
                        </div>
                        <span class="toggle-label-span">${m.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                </div>

                <div class="qty-action-block">
                    <div class="qty-control-wrapper">
                        <span class="med-card-label" style="flex:1;">Inventory Count:</span>
                        <button class="qty-btn" onclick="modifyQuantityStep(${m.id}, ${m.quantity}, -1)">–</button>
                        <input type="number" class="qty-input-box" id="qty-input-${m.id}" value="${m.quantity}" min="0" onchange="modifyQuantityInput(${m.id}, this.value)">
                        <button class="qty-btn" onclick="modifyQuantityStep(${m.id}, ${m.quantity}, 1)">+</button>
                    </div>

                    <div class="card-action-keys">
                        <button class="btn btn-secondary btn-small" style="flex:1;" onclick="openEditMedicineModal(${m.id})">Edit Details</button>
                        <button class="btn btn-danger btn-small" onclick="promptDeleteMedicine(${m.id}, '${m.name}')">Delete</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
}

function handleFacultySearchInput() {
    renderFacultyDashboard();
}

// --- Faculty Collapsible toggle ---
function toggleAddMedicineCollapsible() {
    const body = document.getElementById('body-collapsible-add-med');
    const header = document.getElementById('header-collapsible-add-med');
    
    APP_STATE.isCollapsibleAddMedOpen = !APP_STATE.isCollapsibleAddMedOpen;
    
    if (APP_STATE.isCollapsibleAddMedOpen) {
        body.classList.add('open');
        header.classList.add('open');
    } else {
        body.classList.remove('open');
        header.classList.remove('open');
    }
}

// --- Register new medicine ---
async function handleRegisterMedicineSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('add-med-name').value.trim();
    const quantity = parseInt(document.getElementById('add-med-qty').value);
    const details = document.getElementById('add-med-details').value.trim();
    const available = document.getElementById('add-med-available').checked;

    if (!name) {
        showToast("Input Required", "Please provide a valid product name.", "warning");
        return;
    }

    const qtyVal = isNaN(quantity) ? 0 : quantity;

    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch('/api/medicines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, quantity: qtyVal, details, available })
            });

            if (res.ok) {
                showToast("Product Registered", `"${name}" saved to MySQL.`, "success");
                document.getElementById('add-medicine-form').reset();
                toggleAddMedicineCollapsible();
                renderFacultyDashboard();
            } else {
                showToast("Create Failed", "Unauthorized or database error.", "danger");
            }
        } catch (err) {
            console.error(err);
            showToast("Error", "Server connection failed.", "danger");
        }
    } else {
        // Offline creation
        const localMeds = getLocalMedicines();
        const nextId = localMeds.length > 0 ? Math.max(...localMeds.map(m => m.id)) + 1 : 1;
        const newMed = { id: nextId, name, quantity: qtyVal, details, available };
        localMeds.push(newMed);
        saveLocalMedicines(localMeds);

        showToast("Product Registered (Local)", `"${name}" saved to cache.`, "success");
        document.getElementById('add-medicine-form').reset();
        toggleAddMedicineCollapsible();
        renderFacultyDashboard();
    }
}

// --- Medicine updates ---
async function toggleAvailability(id, currentStat) {
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ available: !currentStat })
            });
            if (res.ok) {
                renderFacultyDashboard();
                showToast("Visibility Changed", "Stock visibility adjusted.", "success");
            } else {
                showToast("Action Forbidden", "Access denied.", "danger");
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        // Offline Toggle
        const localMeds = getLocalMedicines();
        const item = localMeds.find(m => m.id === id);
        if (item) {
            item.available = !currentStat;
            saveLocalMedicines(localMeds);
            renderFacultyDashboard();
            showToast("Visibility Changed (Local)", "Stock visibility adjusted.", "success");
        }
    }
}

async function modifyQuantityStep(id, currentQty, step) {
    const nextVal = currentQty + step;
    if (nextVal < 0) return;
    
    await updateQuantityValueOnServer(id, nextVal);
}

async function modifyQuantityInput(id, value) {
    const nextVal = parseInt(value);
    if (isNaN(nextVal) || nextVal < 0) {
        showToast("Invalid Input", "Quantity must be positive integer.", "warning");
        renderFacultyDashboard();
        return;
    }
    
    await updateQuantityValueOnServer(id, nextVal);
}

async function updateQuantityValueOnServer(id, quantity) {
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            });
            if (res.ok) {
                renderFacultyDashboard();
                showToast("Quantity Saved", "Inventory count modified.", "success");
            } else {
                showToast("Sync Error", "Unable to update quantity.", "danger");
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        // Offline update
        const localMeds = getLocalMedicines();
        const item = localMeds.find(m => m.id === id);
        if (item) {
            item.quantity = quantity;
            saveLocalMedicines(localMeds);
            renderFacultyDashboard();
            showToast("Quantity Saved (Local)", "Inventory count modified.", "success");
        }
    }
}

// --- Modals Overlays controllers ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function closeModalWhenClickedOutside(e, modalId) {
    if (e.target.id === modalId) {
        closeModal(modalId);
    }
}

// --- Medicine details popups ---
async function openMedicineDetailsModal(id) {
    let item = null;
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`);
            if (res.ok) item = await res.json();
        } catch (err) {
            console.error(err);
        }
    } else {
        const localMeds = getLocalMedicines();
        item = localMeds.find(m => m.id === id);
    }

    if (!item) {
        showToast("Error", "Could not fetch medicine details.", "danger");
        return;
    }

    const statusBadge = document.getElementById('modal-detail-available-badge');
    
    if (item.available) {
        statusBadge.textContent = "AVAILABLE";
        statusBadge.className = "badge badge-success";
    } else {
        statusBadge.textContent = "OUT OF STOCK";
        statusBadge.className = "badge badge-danger";
    }

    document.getElementById('modal-detail-name').textContent = item.name;
    document.getElementById('modal-detail-quantity').textContent = item.quantity;
    document.getElementById('modal-detail-description').textContent = item.details || "No composition details available.";

    const warnLine = document.getElementById('modal-detail-warning-line');
    if (item.quantity < 18) {
        warnLine.style.display = 'inline-flex';
        warnLine.textContent = `⚠️ LOW STOCK LEVEL: ${item.quantity} STRIPS`;
    } else {
        warnLine.style.display = 'none';
    }

    openModal('modal-med-details');
}

// --- Edit details forms ---
async function openEditMedicineModal(id) {
    let item = null;
    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`);
            if (res.ok) item = await res.json();
        } catch (err) {
            console.error(err);
        }
    } else {
        const localMeds = getLocalMedicines();
        item = localMeds.find(m => m.id === id);
    }

    if (item) {
        document.getElementById('edit-med-id').value = item.id;
        document.getElementById('edit-med-name').value = item.name;
        document.getElementById('edit-med-details').value = item.details;
        openModal('modal-edit-med');
    }
}

async function handleEditMedicineSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-med-id').value);
    const name = document.getElementById('edit-med-name').value.trim();
    const details = document.getElementById('edit-med-details').value.trim();

    if (!name) {
        showToast("Invalid Name", "Naming conventions required.", "warning");
        return;
    }

    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, details })
            });

            if (res.ok) {
                closeModal('modal-edit-med');
                renderFacultyDashboard();
                showToast("Product Modified", "MySQL database updated.", "success");
            } else {
                showToast("Edit Forbidden", "Check credentials status.", "danger");
            }
        } catch (err) {
            console.error(err);
            showToast("Error", "Update query failed.", "danger");
        }
    } else {
        // Offline Edit
        const localMeds = getLocalMedicines();
        const item = localMeds.find(m => m.id === id);
        if (item) {
            item.name = name;
            item.details = details;
            saveLocalMedicines(localMeds);
            closeModal('modal-edit-med');
            renderFacultyDashboard();
            showToast("Product Modified (Local)", "Cache records updated.", "success");
        }
    }
}

// --- Delete stock item ---
function promptDeleteMedicine(id, name) {
    APP_STATE.deleteTargetId = id;
    document.getElementById('delete-confirm-prompt-msg').innerHTML = `Are you sure you want to permanently delete <b style="color:var(--text-primary)">"${name}"</b> from inventory database records?<br>This action cannot be undone.`;
    openModal('modal-delete-confirm');
}

async function executeMedicineDelete() {
    const id = APP_STATE.deleteTargetId;
    if (id === null) return;

    if (APP_STATE.mode === 'online') {
        try {
            const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
            if (res.ok) {
                closeModal('modal-delete-confirm');
                APP_STATE.deleteTargetId = null;
                renderFacultyDashboard();
                showToast("Stock Item Deleted", "Medicine deleted successfully from MySQL.", "success");
            } else {
                showToast("Forbidden Operation", "Check your staff credentials.", "danger");
            }
        } catch (err) {
            console.error(err);
            showToast("Error", "Server delete query failed.", "danger");
        }
    } else {
        // Offline delete
        const localMeds = getLocalMedicines();
        const nextMeds = localMeds.filter(m => m.id !== id);
        saveLocalMedicines(nextMeds);
        closeModal('modal-delete-confirm');
        APP_STATE.deleteTargetId = null;
        renderFacultyDashboard();
        showToast("Stock Item Deleted (Local)", "Medicine removed from local cache.", "success");
    }
}

// --- Custom Toast Popup system ---
function showToast(title, desc, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'warning') {
        iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else if (type === 'danger') {
        iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else { // info
        iconSvg = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }
    
    toast.innerHTML = `
        <div class="toast-icon-svg">${iconSvg}</div>
        <div class="toast-msg-container">
            <div class="toast-title-text">${title}</div>
            <div class="toast-desc-text">${desc}</div>
        </div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
        <div class="toast-marker-line"></div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('closing');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }
    }, 3500);
}
