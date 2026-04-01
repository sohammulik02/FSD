/**
 * KUSUMTAI THAKARE BAHUUDHESH SANSTHA GHATANJI
 * School Website JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // ========== FAQ Modal Toggle ==========
    const faqModal = document.getElementById('faqModal');
    const faqToggle = document.getElementById('faqToggle');
    const faqClose = document.getElementById('faqClose');
    const faqOverlay = document.getElementById('faqOverlay');
    const faqQuestions = document.querySelectorAll('.faq-question');
    if (faqModal && faqToggle && faqClose && faqOverlay) {
        // Open FAQ modal
        faqToggle.addEventListener('click', function(e) {
            e.preventDefault();
            faqModal.classList.add('active');
            faqModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });
        
        // Close FAQ modal
        function closeFaqModal() {
            faqModal.classList.remove('active');
            faqModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
        
        faqClose.addEventListener('click', closeFaqModal);
        faqOverlay.addEventListener('click', closeFaqModal);
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && faqModal.classList.contains('active')) {
                closeFaqModal();
            }
        });
        
        // FAQ Accordion Toggle
        faqQuestions.forEach(function(button) {
            button.addEventListener('click', function() {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                
                // Close all other answers
                faqQuestions.forEach(function(otherButton) {
                    if (otherButton !== button) {
                        otherButton.setAttribute('aria-expanded', 'false');
                    }
                });
                
                // Toggle current answer
                this.setAttribute('aria-expanded', !isExpanded);
            });
        });
    }
    
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

    // ========== Enquiry Form Handling ===========
    const enquiryForm = document.getElementById('enquiryForm');
    const enquiryStatus = document.getElementById('enquiryStatus');

    if (enquiryForm && enquiryStatus) {
        enquiryForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            // Collect form data
            const payload = {
                fullName: document.getElementById('fullName').value,
                mobileNumber: document.getElementById('mobileNumber').value,
                emailId: document.getElementById('emailId').value,
                pinCode: document.getElementById('pinCode').value
            };

            // Show a sending indicator
            enquiryStatus.textContent = 'Submitting...';
            enquiryStatus.style.color = '';

            try {
                const response = await fetch('http://localhost:3000/api/enquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok) {
                    enquiryStatus.textContent = result.message || 'The backend rejected the request. Please check the submitted details.';
                    enquiryStatus.style.color = '#dc2626';
                    return;
                }

                if (result.success) {
                    enquiryStatus.textContent = 'Thanks for your enquiry! We will contact you soon.';
                    enquiryStatus.style.color = '#16a34a';
                    enquiryForm.reset();
                } else {
                    enquiryStatus.textContent = result.message || 'Something went wrong. Please try again.';
                    enquiryStatus.style.color = '#dc2626';
                }
            } catch (err) {
                enquiryStatus.textContent = 'Unable to reach the enquiry server at http://localhost:3000. Make sure the backend is running.';
                enquiryStatus.style.color = '#dc2626';
            }

            window.clearTimeout(enquiryStatus.hideTimer);
            enquiryStatus.hideTimer = window.setTimeout(function() {
                enquiryStatus.textContent = '';
                enquiryStatus.style.color = '';
            }, 5000);
        });
    }
    
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