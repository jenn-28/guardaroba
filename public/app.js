document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn, .nav-switch-btn');
    const formRegister = document.getElementById('registrarse');
    const formLogin = document.getElementById('iniciar_sesion');
    const introRegister = document.querySelector('.intro-register');
    const introLogin = document.querySelector('.intro-login');
    const topTextSwitch = document.getElementById('text-switch');
    const topBtnSwitch = document.querySelector('.nav-switch-btn');
    const bottomBtnRegister = document.querySelector('.tab-btn[data-target="register"]');
    const bottomBtnLogin = document.querySelector('.tab-btn[data-target="login"]');

    //const para visibilidad de password
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('new_password');
    const eyeOpen = document.querySelector('.eye-open');
    const eyeClosed = document.querySelector('.eye-closed');

    //Funcion para botones switch de login y register
    function switchView(target) {
        if (target === 'register') {
            formRegister.classList.add('active');
            formLogin.classList.remove('active');

            introRegister.classList.add('active-intro');
            introLogin.classList.remove('active-intro');

            bottomBtnRegister.classList.add('active');
            bottomBtnLogin.classList.remove('active');

            topTextSwitch.textContent = '¿Ya tienes cuenta?';
            topBtnSwitch.textContent = 'Inicia sesión';
            topBtnSwitch.setAttribute('data-target', 'login');
        } else {
            formLogin.classList.add('active');
            formRegister.classList.remove('active');

            introLogin.classList.add('active-intro');
            introRegister.classList.remove('active-intro');

            bottomBtnLogin.classList.add('active');
            bottomBtnRegister.classList.remove('active');

            topTextSwitch.textContent = '¿Eres nuevo aquí?';
            topBtnSwitch.textContent = 'Crear cuenta';
            topBtnSwitch.setAttribute('data-target', 'register');
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const target = button.getAttribute('data-target');
            switchView(target);
        });
    });

    //Funcion para visibilidad de password
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            // Alternar tipo de input entre 'password' y 'text'
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

            // Alternar la visibilidad de los íconos
            if (isPassword) {
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
            } else {
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
            }
        });
    }

});