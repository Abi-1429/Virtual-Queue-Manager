// Authentication-specific functions (for auth.html only)
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
});

function initializeAuth() {
    // Check if we're on auth page - if already logged in, redirect
    if (window.location.pathname.includes('auth.html')) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                checkUserRoleAndRedirect(user);
            }
        });
    }

    // Tab switching (only on auth page)
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');

    if (loginTab && registerTab) {
        loginTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLogin();
        });

        registerTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegister();
        });
    }

    // Form handlers
    const loginFormElement = document.getElementById('loginFormElement');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', handleLogin);
    }

    const registerFormElement = document.getElementById('registerFormElement');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', handleRegister);
    }
}

function switchToLogin() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab && loginForm && registerForm) {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function switchToRegister() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginTab && registerTab && loginForm && registerForm) {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

async function checkUserRoleAndRedirect(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userRole = userData.role || 'customer';
            
            if (userRole === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        } else {
            await createUserDocument(user);
            window.location.href = 'user-dashboard.html';
        }
    } catch (error) {
        console.error('Error checking user role:', error);
        window.location.href = 'user-dashboard.html';
    }
}

async function createUserDocument(user, additionalData = {}) {
    try {
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: user.displayName || additionalData.name || 'User',
            email: user.email,
            role: additionalData.role || 'customer',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            ...additionalData
        });
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const messageDiv = document.getElementById('authMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await createUserDocument(user, { name: email.split('@')[0] });
            messageDiv.innerHTML = `<div class="alert alert-success">Welcome! Account setup complete. Redirecting...</div>`;
        } else {
            messageDiv.innerHTML = `<div class="alert alert-success">Login successful! Redirecting...</div>`;
        }
        
        setTimeout(() => {
            checkUserRoleAndRedirect(user);
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = error.message;
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
        }
        
        messageDiv.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const messageDiv = document.getElementById('authMessage');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await createUserDocument(user, { name: name });

        messageDiv.innerHTML = `<div class="alert alert-success">Registration successful! Redirecting...</div>`;
        
        setTimeout(() => {
            window.location.href = 'user-dashboard.html';
        }, 1000);

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = error.message;
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/password accounts are not enabled. Please contact administrator.';
        }
        
        messageDiv.innerHTML = `<div class="alert alert-danger">${errorMessage}</div>`;
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}