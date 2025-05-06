const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const userProfile = document.getElementById('user-profile');
const dropdownMenu = document.getElementById('dropdown-menu');
const mobileToggle = document.getElementById('mobile-toggle');
const mainContent = document.querySelector('.main-content');
const toastContainer = document.getElementById('toast-container');

function isMobile() {
    return window.innerWidth <= 768;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!isMobile()) {
        sidebar.classList.add('minimized');
        mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
    } else {
        sidebar.classList.remove('minimized');
        sidebar.classList.add('mobile-hidden');
        mainContent.style.marginLeft = '0';
    }
    
    if (document.querySelector('.bar-chart')) {
        initializeChartBars();
    }
    
    if (document.querySelector('.stats-card')) {
        setTimeout(animateOnScroll, 500);
    }
});

mobileToggle.addEventListener('click', function() {
    this.classList.toggle('active');
    
    sidebar.classList.toggle('mobile-visible');
    
    if (sidebar.classList.contains('mobile-visible')) {
        sidebar.classList.remove('minimized');
        sidebar.classList.remove('mobile-hidden');
        
        const icon = this.querySelector('i');
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-left');
        
        this.style.transition = 'left 0.3s ease';

    } else {

        sidebar.classList.add('mobile-hidden');

        const icon = this.querySelector('i');
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
        
        this.style.transition = 'left 0.3s ease';
        
    }
});

sidebarToggle.addEventListener('click', function() {
    if (!isMobile()) {
        toggleSidebar();
    }
});

const logo = document.querySelector('.logo-container');
logo.addEventListener('click', function() {
    if (!isMobile() && sidebar.classList.contains('minimized')) {
        toggleSidebar();
    }
});

function toggleSidebar() {
    sidebar.classList.toggle('minimized');
    
    if (sidebar.classList.contains('minimized')) {
        mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
    } else {
        mainContent.style.marginLeft = 'var(--sidebar-width-expanded)';
    }
    positionDropdown();
}

userProfile.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
    
    positionDropdown();
    
    if (dropdownMenu.classList.contains('active')) {
        dropdownMenu.style.animation = 'none';
        setTimeout(() => {
            dropdownMenu.style.animation = 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        }, 10);
    }
});

function positionDropdown() {
    if (!isMobile() && sidebar.classList.contains('minimized') && dropdownMenu.classList.contains('active')) {
        const userProfileRect = userProfile.getBoundingClientRect();
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.left = (userProfileRect.right + 5) + 'px';
        dropdownMenu.style.bottom = (window.innerHeight - userProfileRect.bottom) + 'px';
        dropdownMenu.style.width = '200px'; 
        dropdownMenu.style.position = 'absolute';
        dropdownMenu.style.left = '0';
        dropdownMenu.style.bottom = '100%';
        dropdownMenu.style.width = '100%';
    }
}

document.addEventListener('click', function() {
    if (dropdownMenu.classList.contains('active')) {
        dropdownMenu.classList.remove('active');
    }
});

mainContent.addEventListener('click', function() {
    if (isMobile() && sidebar.classList.contains('mobile-visible')) {
        sidebar.classList.remove('mobile-visible');
        sidebar.classList.add('mobile-hidden');
        
        mobileToggle.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
    }
});

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {

        sidebar.classList.remove('mobile-visible');
        sidebar.classList.remove('mobile-hidden');
        mobileToggle.classList.remove('active');

        const icon = mobileToggle.querySelector('i');
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');

        sidebar.classList.add('minimized');
        mainContent.style.marginLeft = 'var(--sidebar-width-minimized)';
    } else {
        mainContent.style.marginLeft = '0';
        
        if (!sidebar.classList.contains('mobile-visible')) {
            sidebar.classList.remove('minimized');
            sidebar.classList.add('mobile-hidden');
        }
    }
    
    if (dropdownMenu.classList.contains('active')) {
        positionDropdown();
    }
});

mobileToggle.addEventListener('mouseenter', function() {
    this.style.opacity = '1';
});

mobileToggle.addEventListener('mouseleave', function() {
    if (!this.classList.contains('active')) {
        this.style.opacity = '0.5';
    }
});

function initializeChartBars() {
    const bars = document.querySelectorAll('.bar');

    bars.forEach((bar, index) => {
        bar.style.animationDelay = `${index * 0.1}s`;
    });
}

function animateOnScroll() {
    const statsCards = document.querySelectorAll('.stats-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    statsCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
}

// Toast notification functionality
function createToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${iconClass} toast-icon"></i>
            <span>${message}</span>
        </div>
        <button class="close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);

    toast.style.animation = 'slideInRight 0.3s ease, fadeOut 0.3s ease ' + (duration - 300) + 'ms forwards';
    
    const closeBtn = toast.querySelector('.close-btn');
    closeBtn.addEventListener('click', function() {
        removeToast(toast);
    });
    
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
        toast.remove();
    }, 300);
}

document.addEventListener('DOMContentLoaded', function() {
    const existingToasts = document.querySelectorAll('.toast[data-auto-dismiss="true"]');
    existingToasts.forEach(toast => {
        const closeBtn = toast.querySelector('.close-btn');
        closeBtn.addEventListener('click', function() {
            removeToast(toast);
        });
        
        setTimeout(() => {
            removeToast(toast);
        }, 3000);
    });
});

const style = document.createElement('style');
style.textContent = `
    @keyframes bounceIn {
        0% {
            opacity: 0;
            transform: translateY(10px);
        }
        60% {
            opacity: 1;
            transform: translateY(-5px);
        }
        80% {
            transform: translateY(2px);
        }
        100% {
            transform: translateY(0);
        }
    }
    
    @keyframes bounceIcon {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-5px);
        }
    }
`;
document.head.appendChild(style);

const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        if (!this.classList.contains('active')) {
            const icon = this.querySelector('svg');
            if (icon) {
                icon.style.animation = 'none';
                setTimeout(() => {
                    icon.style.animation = 'bounceIcon 0.5s ease';
                }, 10);
            }
            
            if (isMobile()) {
                sidebar.classList.remove('mobile-visible');
                sidebar.classList.add('mobile-hidden');
                mobileToggle.classList.remove('active');
                
                const toggleIcon = mobileToggle.querySelector('i');
                toggleIcon.classList.remove('fa-chevron-left');
                toggleIcon.classList.add('fa-chevron-right');
            }
        }
    });
});