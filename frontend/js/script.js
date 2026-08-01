/**
 * RDJ 3D Jewelry - Clean Homepage Script
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
  
  // Panel elements for scroll reveal
  const panelInners = document.querySelectorAll('.panel-inner');

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

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
    return `images/home/${paddedIndex}.png`;
  }

  // Preload frames progressively to make the initial page load 4x faster!
  function preloadImages() {
    return new Promise((resolve) => {
      // Step 1: Divide frames into primary (every 4th frame) and secondary
      const primaryFrames = [];
      const secondaryFrames = [];
      
      for (let i = 1; i <= totalFrames; i++) {
        if (i === 1 || i === totalFrames || i % 4 === 0) {
          primaryFrames.push(i);
        } else {
          secondaryFrames.push(i);
        }
      }
      
      let loadedPrimaryCount = 0;
      
      // Load a frame
      function loadFrame(i) {
        return new Promise((frameResolve) => {
          const img = new Image();
          img.src = getFrameUrl(i);
          
          img.onload = () => {
            processImage(img, i, frameResolve);
          };
          
          img.onerror = () => {
            console.error(`Failed to load frame at: ${img.src}`);
            frameResolve();
          };
        });
      }
      
      // Process image to remove background
      function processImage(img, i, frameResolve) {
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
          
          for (let j = 0; j < data.length; j += 4) {
            const r = data[j];
            const g = data[j+1];
            const b = data[j+2];
            const maxVal = Math.max(r, g, b);
            
            if (maxVal < 24) {
              data[j+3] = 0; // Fully transparent
            } else if (maxVal < 32) {
              const ratio = (maxVal - 24) / (32 - 24);
              data[j+3] = Math.round(ratio * 255);
            }
          }
          offCtx.putImageData(imgData, 0, 0);
          
          const wmX = Math.round(0.85 * w);
          const wmY = Math.round(0.75 * h);
          offCtx.clearRect(wmX, wmY, w - wmX, h - wmY);
          
          images[i - 1] = offCanvas;
        } catch (e) {
          images[i - 1] = img;
        }
        frameResolve();
      }
      
      // Load primary frames first (this determines the preloader screen)
      const primaryPromises = primaryFrames.map(i => {
        return loadFrame(i).then(() => {
          loadedPrimaryCount++;
          const percent = Math.round((loadedPrimaryCount / primaryFrames.length) * 100);
          if (loadingBar) loadingBar.style.width = `${percent}%`;
          if (loadingText) loadingText.textContent = `Loading 3D asset... ${percent}%`;
        });
      });
      
      // Once all primary frames are loaded, resolve the promise so the site opens!
      Promise.all(primaryPromises).then(() => {
        resolve();
        
        // Step 2: Load secondary frames in the background after page reveal
        setTimeout(() => {
          loadSecondaryProgressively(secondaryFrames);
        }, 1000);
      });
    });
  }

  // Load secondary frames one by one in the background so it doesn't block the UI thread
  async function loadSecondaryProgressively(framesList) {
    for (const frameIndex of framesList) {
      await new Promise((frameResolve) => {
        const img = new Image();
        img.src = getFrameUrl(frameIndex);
        img.onload = () => {
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
            
            for (let j = 0; j < data.length; j += 4) {
              const r = data[j];
              const g = data[j+1];
              const b = data[j+2];
              const maxVal = Math.max(r, g, b);
              
              if (maxVal < 24) {
                data[j+3] = 0;
              } else if (maxVal < 32) {
                const ratio = (maxVal - 24) / (32 - 24);
                data[j+3] = Math.round(ratio * 255);
              }
            }
            offCtx.putImageData(imgData, 0, 0);
            
            const wmX = Math.round(0.85 * w);
            const wmY = Math.round(0.75 * h);
            offCtx.clearRect(wmX, wmY, w - wmX, h - wmY);
            
            images[frameIndex - 1] = offCanvas;
          } catch (e) {
            images[frameIndex - 1] = img;
          }
          frameResolve();
        };
        img.onerror = () => {
          frameResolve();
        };
      });
    }
  }

  // Reveal site after assets are loaded
  function revealSite() {
    isLoaded = true;
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
      
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

          // Dynamic background opacity transitions based on active section (scrubbed for perfect smoothness)
          // 1. Fade out as we scroll out of Hero
          ScrollTrigger.create({
            trigger: "#hero",
            start: "bottom center",
            end: "bottom top",
            scrub: true,
            onUpdate: self => {
              const opacity = 1.0 - (self.progress * 0.85); // fades from 1.0 to 0.15
              gsap.set(canvas, { opacity: opacity });
            }
          });

          // 2. Fade in as we scroll into Videos
          ScrollTrigger.create({
            trigger: "#videos",
            start: "top bottom",
            end: "top center",
            scrub: true,
            onUpdate: self => {
              const opacity = 0.15 + (self.progress * 0.85); // fades from 0.15 to 1.0
              gsap.set(canvas, { opacity: opacity });
            }
          });

          // 3. Fade out as we scroll out of Videos
          ScrollTrigger.create({
            trigger: "#videos",
            start: "bottom center",
            end: "bottom top",
            scrub: true,
            onUpdate: self => {
              const opacity = 1.0 - (self.progress * 0.8); // fades from 1.0 to 0.2
              gsap.set(canvas, { opacity: opacity });
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
  // (matches the premium rings page canvas resizing code)
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
    let img = images[imgIndex];
    
    // Fallback to nearest loaded frame if this frame is still loading in the background
    if (!img) {
      for (let offset = 1; offset < totalFrames; offset++) {
        const leftIndex = imgIndex - offset;
        const rightIndex = imgIndex + offset;
        if (leftIndex >= 0 && images[leftIndex]) {
          img = images[leftIndex];
          break;
        }
        if (rightIndex < totalFrames && images[rightIndex]) {
          img = images[rightIndex];
          break;
        }
      }
    }
    
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
  // (IntersectionObserver is kept to handle visibility changes smoothly)
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
    tempImg.src = 'images/Earnings/02.png';
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
        earringsImgElement.src = 'images/Earnings/02.png';
      }
    };
  }

  window.addEventListener('resize', resizeCanvas);

  // Preload frames and then reveal the site
  preloadImages().then(revealSite);
});
