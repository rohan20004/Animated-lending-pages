/**
 * NSJ 3D Jewelry - Clean Homepage Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const preloader = document.getElementById('preloader');
  const loadingBar = document.getElementById('loading-bar');
  const loadingText = document.getElementById('loading-text');
  const mainHeader = document.getElementById('main-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  // Panel elements for scroll reveal
  const panelInners = document.querySelectorAll('.panel-inner');

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

  // Mobile navigation toggle
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      mobileToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close mobile nav when clicking links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // Navbar scroll background transitions
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      mainHeader.classList.add('scrolled');
    } else {
      mainHeader.classList.remove('scrolled');
    }
  });

  // Reveal Homepage (simulated short preloader for smooth transition)
  function revealSite() {
    if (loadingBar) loadingBar.style.width = '100%';
    if (loadingText) loadingText.textContent = 'Polishing the experience... 100%';
    
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
      
      initScrollRevealObserver();
      
      const mm = gsap.matchMedia();
      
      mm.add({
        reduceMotion: "(prefers-reduced-motion: reduce)",
        allowMotion: "(prefers-reduced-motion: no-preference)"
      }, (context) => {
        const { reduceMotion } = context.conditions;
        
        if (!reduceMotion) {
          // Initialize Lenis Smooth Scroll
          const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium easing
            smoothWheel: true
          });
          
          lenis.on('scroll', ScrollTrigger.update);
          
          gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
          });
          
          gsap.ticker.lagSmoothing(0);
          
          // Custom data-speed parallax implementation via ScrollTrigger
          gsap.utils.toArray('[data-speed]').forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 1;
            const yTranslation = (speed - 1) * 150;
            gsap.to(el, {
              y: yTranslation,
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top bottom",
                end: "bottom top",
                scrub: true
              }
            });
          });
        }
      });
    }, 600);
  }

  // Scroll reveal helper
  function initScrollRevealObserver() {
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -10% 0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        } else {
          entry.target.classList.remove('visible');
        }
      });
    }, observerOptions);

    panelInners.forEach(panel => {
      observer.observe(panel);
    });
  }

  // Process Earrings category image to remove background and make it transparent
  const earringsImgElement = document.querySelector('img[alt="Earrings"]');
  if (earringsImgElement) {
    const tempImg = new Image();
    tempImg.src = 'Earnings/02.png';
    tempImg.onload = () => {
      const offCanvas = document.createElement('canvas');
      const w = tempImg.naturalWidth;
      const h = tempImg.naturalHeight;
      offCanvas.width = w;
      offCanvas.height = h;
      
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(tempImg, 0, 0);
      
      try {
        const imgData = offCtx.getImageData(0, 0, w, h);
        const data = imgData.data;
        
        // Loop through pixels and make the dark background transparent
        for (let j = 0; j < data.length; j += 4) {
          const r = data[j];
          const g = data[j+1];
          const b = data[j+2];
          const maxVal = Math.max(r, g, b);
          
          if (maxVal < 25) {
            data[j+3] = 0; // Fully transparent
          } else if (maxVal < 36) {
            const ratio = (maxVal - 25) / (36 - 25);
            data[j+3] = Math.round(ratio * 255);
          }
        }
        offCtx.putImageData(imgData, 0, 0);
        
        // Clear watermark in bottom right corner
        const wmX = Math.round(0.87 * w);
        const wmY = Math.round(0.78 * h);
        offCtx.clearRect(wmX, wmY, w - wmX, h - wmY);
        
        earringsImgElement.src = offCanvas.toDataURL();
      } catch (e) {
        console.error("Error processing category image:", e);
        earringsImgElement.src = 'Earnings/02.png';
      }
    };
  }

  // Start revealing the site
  revealSite();
});
