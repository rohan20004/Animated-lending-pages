/**
 * RDJ 3D Jewelry - Royal Emperor Rings Scroll-telling Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const preloader = document.getElementById('preloader');
  const loadingBar = document.getElementById('loading-bar');
  const loadingText = document.getElementById('loading-text');
  const mainHeader = document.getElementById('main-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  const canvas = document.getElementById('scroll-canvas');
  const ctx = canvas.getContext('2d');
  const panelInners = document.querySelectorAll('.panel-inner');

  // Animation & Frame Configuration
  const totalFrames = 79; // 02.png to 80.png (skipping blank 01.png)
  const images = [];
  let loadedCount = 0;
  let scrollState = { frame: 1 };
  let lastDrawnFrame = -1;
  let isLoaded = false;

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

  // Generate padded frame filename (skipping the blank 01.png)
  function getFrameUrl(index) {
    const paddedIndex = String(index + 1).padStart(2, '0');
    return `rings/${paddedIndex}.png`;
  }

  // Preload and process all frames to make background transparent
  function preloadImages() {
    return new Promise((resolve) => {
      let loadedImagesCount = 0;
      for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        img.src = getFrameUrl(i);
        
        img.onload = () => {
          // Create offscreen canvas to process the image and remove background
          const offCanvas = document.createElement('canvas');
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          offCanvas.width = w;
          offCanvas.height = h;
          
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0);
          
          try {
            const imgData = offCtx.getImageData(0, 0, w, h);
            const data = imgData.data;
            
            // Loop through pixels and make the R=16 background transparent
            for (let j = 0; j < data.length; j += 4) {
              const r = data[j];
              const g = data[j+1];
              const b = data[j+2];
              const maxVal = Math.max(r, g, b);
              
              if (maxVal < 24) {
                data[j+3] = 0; // Fully transparent
              } else if (maxVal < 32) {
                // Feather the edges
                const ratio = (maxVal - 24) / (32 - 24);
                data[j+3] = Math.round(ratio * 255);
              }
            }
            offCtx.putImageData(imgData, 0, 0);
            
            // Clear the watermark in the bottom-right corner (approx 85% width, 75% height)
            const wmX = Math.round(0.85 * w);
            const wmY = Math.round(0.75 * h);
            const wmW = w - wmX;
            const wmH = h - wmY;
            offCtx.clearRect(wmX, wmY, wmW, wmH);
            
            images[i - 1] = offCanvas;
          } catch (e) {
            console.error("Error processing image background:", e);
            images[i - 1] = img; // Fallback to raw image
          }
          
          loadedImagesCount++;
          loadedCount = loadedImagesCount;
          updateLoadingProgress();
          if (loadedImagesCount === totalFrames) {
            resolve();
          }
        };

        img.onerror = () => {
          console.error(`Failed to load frame at: ${img.src}`);
          loadedImagesCount++;
          loadedCount = loadedImagesCount;
          updateLoadingProgress();
          if (loadedImagesCount === totalFrames) {
            resolve();
          }
        };
      }
    });
  }

  // Update preloader UI
  function updateLoadingProgress() {
    const percent = Math.round((loadedCount / totalFrames) * 100);
    if (loadingBar) loadingBar.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = `Loading 3D asset... ${percent}%`;
  }

  // Reveal site after assets are loaded
  function revealSite() {
    isLoaded = true;
    setTimeout(() => {
      preloader.classList.add('fade-out');
      
      // Initialize layout
      resizeCanvas();
      
      initScrollRevealObserver();
      
      // Force initial draw of first frame
      scrollState.frame = 1;
      drawFrame(1);
      
      // Initialize GSAP matchMedia for motion preferences
      const mm = gsap.matchMedia();
      
      mm.add({
        reduceMotion: "(prefers-reduced-motion: reduce)",
        allowMotion: "(prefers-reduced-motion: no-preference)"
      }, (context) => {
        const { reduceMotion } = context.conditions;
        
        if (reduceMotion) {
          // Reduced motion: draw first frame and do not smooth-scroll
          scrollState.frame = 1;
          drawFrame(1);
        } else {
          // Normal motion: Initialize Lenis Smooth Scroll
          const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // premium easing
            smoothWheel: true
          });
          
          // Connect Lenis to GSAP ScrollTrigger
          lenis.on('scroll', ScrollTrigger.update);
          
          gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
          });
          
          gsap.ticker.lagSmoothing(0);
          
          // Animate the frames along with the scroll position using ScrollTrigger scrub
          gsap.to(scrollState, {
            frame: totalFrames,
            ease: "none",
            scrollTrigger: {
              trigger: "body",
              start: "top top",
              end: "bottom bottom",
              scrub: 1.2, // Smoothly scrub canvas frames
              onUpdate: () => {
                const frameToDraw = Math.round(scrollState.frame);
                if (frameToDraw !== lastDrawnFrame) {
                  drawFrame(frameToDraw);
                }
              }
            }
          });
          
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
          
          // Refresh ScrollTrigger to ensure accurate page height calculations
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 200);
        }
      });
    }, 600);
  }

  // Scale canvas for high-DPI viewports with performance limits
  function resizeCanvas() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    const frameToDraw = Math.round(scrollState.frame);
    drawFrame(frameToDraw);
  }

  // Draw specific image frame onto canvas
  function drawFrame(frameIndex) {
    const imgIndex = Math.min(totalFrames, Math.max(1, frameIndex)) - 1;
    const img = images[imgIndex];
    if (!img) return;

    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;
    if (imgWidth === 0 || imgHeight === 0) return;
    if (img.tagName === 'IMG' && !img.complete) return;

    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const canvasWidth = canvas.width / dpr;
    const canvasHeight = canvas.height / dpr;

    // Clear canvas to prevent trails
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const canvasRatio = canvasWidth / canvasHeight;
    const imgRatio = imgWidth / imgHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > canvasRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    lastDrawnFrame = frameIndex;
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

  window.addEventListener('resize', resizeCanvas);

  preloadImages().then(revealSite);
});
