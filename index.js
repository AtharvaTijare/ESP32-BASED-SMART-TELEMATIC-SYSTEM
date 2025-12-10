// --- ELEMENT SELECTION ---
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const exploreBtn = document.getElementById('exploreBtn');
const closeBtn = document.querySelector('.close-btn');
const transitionOverlay = document.getElementById('transitionOverlay');

// Form elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTabBtn = document.getElementById('loginTabBtn');
const registerTabBtn = document.getElementById('registerTabBtn');
const formMessage = document.getElementById('formMessage');

// --- MODAL VISIBILITY ---
loginBtn.onclick = () => { loginModal.style.display = "block"; };
exploreBtn.onclick = () => { loginModal.style.display = "block"; };
closeBtn.onclick = () => { loginModal.style.display = "none"; };
window.onclick = (event) => {
    if (event.target == loginModal) {
        loginModal.style.display = "none";
    }
};

// --- FORM TAB SWITCHING ---
loginTabBtn.onclick = () => {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
    formMessage.textContent = '';
};

registerTabBtn.onclick = () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginTabBtn.classList.remove('active');
    registerTabBtn.classList.add('active');
    formMessage.textContent = '';
};

// --- REGISTRATION LOGIC (SIMULATED) ---
registerForm.onsubmit = function (event) {
    event.preventDefault();
    formMessage.textContent = '';
    formMessage.classList.remove('success');

    const email = registerForm.querySelector('input[type="email"]').value;
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value;

    if (pass !== confirmPass) {
        formMessage.textContent = 'Passwords do not match.';
        return;
    }

    // Get existing users from localStorage or create a new object
    let users = JSON.parse(localStorage.getItem('telemetrixUsers')) || {};

    if (users[email]) {
        formMessage.textContent = 'An account with this email already exists.';
    } else {
        // --- IMPORTANT ---
        // In a real app, you would HASH the password here using a library
        // like bcrypt before sending it to your server.
        // We are storing it as plain text for this demo ONLY.
        users[email] = pass;

        localStorage.setItem('telemetrixUsers', JSON.stringify(users));

        formMessage.textContent = 'Registration successful! Please log in.';
        formMessage.classList.add('success');

        // Switch back to login tab
        loginTabBtn.click();
    }
};

// --- LOGIN LOGIC (SIMULATED) ---
loginForm.onsubmit = function (event) {
    event.preventDefault();
    formMessage.textContent = '';
    formMessage.classList.remove('success');

    const email = loginForm.querySelector('input[type="email"]').value;
    const pass = loginForm.querySelector('input[type="password"]').value;

    let users = JSON.parse(localStorage.getItem('telemetrixUsers')) || {};

    // 1. Check if user exists
    if (!users[email]) {
        formMessage.textContent = 'User not found. Please register.';
    }
    // 2. Check if password matches
    // In a real app, your server would use bcrypt.compare()
    else if (users[email] !== pass) {
        formMessage.textContent = 'Incorrect password.';
    }
    // 3. Success!
    else {
        // --- LOGIN SUCCESSFUL ---
        // Store the logged-in user's ID
        localStorage.setItem('userId', email);

        loginModal.style.display = "none";
        transitionOverlay.classList.add('active');

        // Redirect after animation completes
        setTimeout(() => {
            // *** IMPORTANT: Make sure this points to your dashboard file ***
            window.location.href = "dashboard.html"; 
        }, 2000);
    }
};

// --- SMOOTH SCROLL FOR NAV LINKS ---
const navLinks = document.querySelectorAll('.nav-links a');
navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
            document.querySelector(targetId).scrollIntoView({ behavior: 'smooth' });
        }
    });
});