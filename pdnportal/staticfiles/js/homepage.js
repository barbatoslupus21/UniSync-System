document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const navbar = document.querySelector('.ryonan_navbar');
    const loginBtn = document.getElementById('loginBtn');
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const modalContainer = document.getElementById('modalContainer');
    const closeModal = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    const featureCards = document.querySelectorAll('.ryonan_feature_card');
    const ctaBtn = document.querySelector('.ryonan_cta_btn');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordField = document.getElementById('password');
    const eyeIcon = document.querySelector('.ryonan_eye_icon');
    const eyeOffIcon = document.querySelector('.ryonan_eye_off_icon');

    setupIntersectionObserver();
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    document.querySelectorAll('.ryonan_nav_link, .ryonan_mobile_nav_link').forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }
    
    if (ctaBtn) {
        ctaBtn.addEventListener('mouseenter', function() {
            const btnSvg = this.querySelector('svg');
            gsapButtonAnimation(btnSvg);
        });
        
        ctaBtn.addEventListener('click', function() {
            openModal();
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', openModal);
    }
    
    if (mobileLoginBtn) {
        mobileLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
            openModal();
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeModalFunction);
    }
    
    if (modalContainer) {
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                closeModalFunction();
            }
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (passwordToggle && passwordField) {
        passwordToggle.addEventListener('click', function() {
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                eyeIcon.style.display = 'none';
                eyeOffIcon.style.display = 'block';
            } else {
                passwordField.type = 'password';
                eyeIcon.style.display = 'block';
                eyeOffIcon.style.display = 'none';
            }
        });
    }


    function gsapButtonAnimation(element) {
        if (!element) return;
        
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }

    function setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const delay = card.dataset.delay || 0;
                    
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, parseInt(delay));

                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.1 });

        featureCards.forEach(card => {
            observer.observe(card);
        });
    }

    function smoothScroll(e) {
        e.preventDefault();

        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const targetPosition = targetElement.offsetTop;
            
            window.scrollTo({
                top: targetPosition - 80,
                behavior: 'smooth'
            });
        }
    }
    
    function openModal() {
        if (modalContainer) {
            modalContainer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeModalFunction() {
        if (modalContainer) {
            modalContainer.classList.remove('active');
            document.body.style.overflow = 'auto';
  
            if (errorMessage) {
                errorMessage.classList.remove('show');
            }
        }
    }
    
    function handleLogin(e) {
        submitBtn.classList.add('loading');
        submitBtn.querySelector('span').textContent = 'Logging in';
    }
});