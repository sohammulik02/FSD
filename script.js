/**
 * KUSUMTAI THAKARE BAHUUDHESH SANSTHA GHATANJI
 * School Website JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // ========== Mobile Menu Toggle ==========
    const menuToggle = document.getElementById('menuToggle');
    const navMobile = document.getElementById('navMobile');
    const navLinksMobile = document.querySelectorAll('.nav-link-mobile');
    
    // Toggle mobile menu
    menuToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        navMobile.classList.toggle('active');
        
        // Update ARIA attribute
        const isExpanded = this.classList.contains('active');
        this.setAttribute('aria-expanded', isExpanded);
    });
    
    // Close mobile menu when a link is clicked
    navLinksMobile.forEach(function(link) {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            navMobile.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    });
    
    // ========== Sticky Header on Scroll ==========
    const header = document.getElementById('header');
    let lastScrollY = window.scrollY;
    
    function handleScroll() {
        const currentScrollY = window.scrollY;
        
        // Add/remove scrolled class for shadow effect
        if (currentScrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollY = currentScrollY;
    }
    
    // Throttle scroll events for better performance
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    // ========== FAQ Accordion ==========
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(function(question) {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(function(item) {
                item.classList.remove('active');
                item.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });
            
            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
            }
        });
        
        // Keyboard accessibility
        question.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // ========== Smooth Scroll for Anchor Links ==========
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                // Account for fixed header height
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // ========== Close Mobile Menu on Outside Click ==========
    document.addEventListener('click', function(e) {
        const isMenuToggle = e.target.closest('.menu-toggle');
        const isNavMobile = e.target.closest('.nav-mobile');
        
        if (!isMenuToggle && !isNavMobile && navMobile.classList.contains('active')) {
            menuToggle.classList.remove('active');
            navMobile.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });
    
    // ========== Close Mobile Menu on Window Resize ==========
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth >= 768) {
                menuToggle.classList.remove('active');
                navMobile.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        }, 250);
    });
});