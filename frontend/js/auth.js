// Auto-redirect if already authenticated
const existingToken = localStorage.getItem('token');
const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
if (existingToken && existingUser && existingUser.role) {
  redirectByRole(existingUser.role);
}

let authMode = 'login'; // 'login' or 'register'

// 1. Toggle between Sign In and Create Account
window.toggleAuthMode = function() {
  const usernameGroup = document.getElementById('usernameGroup');
  const usernameInput = document.getElementById('username');
  const btnText = document.getElementById('btnText');
  const toggleText = document.getElementById('toggleText');
  const toggleBtn = document.getElementById('toggleBtn');

  if (authMode === 'login') {
    // Switch to REGISTER mode
    authMode = 'register';
    usernameGroup.classList.remove('hidden');
    usernameInput.setAttribute('required', 'true');
    btnText.textContent = 'Create Customer Account';
    toggleText.textContent = 'Already have an account?';
    toggleBtn.textContent = 'Sign In';
  } else {
    // Switch back to LOGIN mode
    authMode = 'login';
    usernameGroup.classList.add('hidden');
    usernameInput.removeAttribute('required');
    btnText.textContent = 'Sign In to Bistro';
    toggleText.textContent = "Don't have an account?";
    toggleBtn.textContent = 'Create an account';
  }
};

// 3. Form Submit Listener: Handles Login & Sign Up
const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // 👈 Stops default browser page reload

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const username = document.getElementById('username')?.value.trim();

    hideError();

    try {
      if (authMode === 'login') {
        // --- 1. LOGIN REQUEST ---
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Invalid email or password');
        }

        // Save JWT token and user info in browser memory
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role
        }));

        console.log('✅ Logged in successfully:', data);

        // Redirect based on role
        redirectByRole(data.role);

      } else {
        // --- 2. SIGN UP (REGISTER) REQUEST ---
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        alert(`🎉 Account created for ${data.username}! Signing you in...`);

        // Automatically log in the new customer
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('user', JSON.stringify({
          id: loginData.id,
          username: loginData.username,
          email: loginData.email,
          role: loginData.role
        }));

        redirectByRole(loginData.role);
      }

    } catch (err) {
      showError(err.message);
    }
  });
}

// 4. Role Router: Sends each role to their dedicated portal
function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = '/admin.html';
  } else if (role === 'waiter' || role === 'cashier') {
    window.location.href = '/staff.html';
  } else {
    // Customer
    window.location.href = '/';
  }
}

// 5. Helpers for Error Alert Banner
function showError(message) {
  const alertBox = document.getElementById('errorAlert');
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
  }
}

function hideError() {
  const alertBox = document.getElementById('errorAlert');
  if (alertBox) {
    alertBox.classList.add('hidden');
  }
}

// 6. Fast Demo Login Shortcut
window.fillDemoCredentials = function(role) {
  if (authMode !== 'login') window.toggleAuthMode();
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  if (!emailInput || !passwordInput) return;

  if (role === 'admin') {
    emailInput.value = 'admin@restaurant.com';
    passwordInput.value = 'admin123';
  } else if (role === 'waiter') {
    emailInput.value = 'waiter@restaurant.com';
    passwordInput.value = 'waiter123';
  } else if (role === 'cashier') {
    emailInput.value = 'cashier@restaurant.com';
    passwordInput.value = 'cashier123';
  }
};


