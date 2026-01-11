// ===== AUTH STATE MANAGEMENT =====
let currentUser = null;

// Listen for auth state changes
auth.onAuthStateChanged((user) => {
    hideLoading();

    if (user) {
        currentUser = user;
        showApp();
        initializeTracker();
    } else {
        currentUser = null;
        showAuth();
    }
});

// ===== UI TOGGLE FUNCTIONS =====
function hideLoading() {
    document.getElementById('loadingScreen').classList.add('hidden');
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    showLogin();
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    updateUserUI();
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    clearErrors();
}

function showSignup() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.remove('hidden');
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    clearErrors();
}

function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove('hidden');
}

function showSuccess(elementId, message) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.classList.remove('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.toggle-password i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function updateUserUI() {
    if (!currentUser) return;

    const name = currentUser.displayName || currentUser.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();

    document.getElementById('userName').textContent = name;
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('userEmailDisplay').textContent = currentUser.email;
}

function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');

    if (userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// ===== AUTH HANDLERS =====

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showError('loginError', getErrorMessage(error.code));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
    }
});

// Signup
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const btn = e.target.querySelector('button');

    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);

        // Update display name
        await result.user.updateProfile({ displayName: name });

        // Create user document in Firestore
        await db.collection('users').doc(result.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        showError('signupError', getErrorMessage(error.code));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Create Account</span><i class="fas fa-arrow-right"></i>';
    }
});

// Forgot Password
document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('resetEmail').value;
    const btn = e.target.querySelector('button');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await auth.sendPasswordResetEmail(email);
        showSuccess('resetSuccess', 'Password reset email sent! Check your inbox.');
    } catch (error) {
        showError('resetError', getErrorMessage(error.code));
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Send Reset Link</span><i class="fas fa-paper-plane"></i>';
    }
});

// Logout
async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Error message helper
function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/weak-password': 'Password is too weak (min 6 characters)',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/network-request-failed': 'Network error. Check your connection'
    };

    return messages[code] || 'An error occurred. Please try again.';
}

// Export data function
function exportData() {
    if (!tracker) return;

    const data = {
        habits: tracker.habits,
        history: tracker.history,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    document.getElementById('userDropdown').classList.add('hidden');
}

function showAccountSettings() {
    alert('Account settings coming soon!');
    document.getElementById('userDropdown').classList.add('hidden');
}