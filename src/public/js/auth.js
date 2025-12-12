const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'dashboard.html';
    }

    // Toggle Forms
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.style.display = 'none';
        loginCard.style.display = 'block';
    });

    // Login logic
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.data.token);
                window.location.href = 'dashboard.html';
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur de connexion');
        }
    });

    // Register logic
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const company = document.getElementById('reg-company').value;

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, company })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.data.token);
                window.location.href = 'dashboard.html';
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Erreur lors de l\'inscription');
        }
    });
});
