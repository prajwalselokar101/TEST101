// DOM Elements
const canvas = document.getElementById('scrolly-canvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');
const loadPercentageEl = document.getElementById('load-percentage');
const scrollContainer = document.getElementById('scrolly-container');
const appleNav = document.getElementById('apple-nav');
const scrollProgressBar = document.getElementById('scroll-progress-bar');
const soundToggle = document.getElementById('sound-toggle');
const ambientAudio = document.getElementById('ambient-audio');
const navLinks = document.querySelectorAll('.nav-link');

// Configuration
const totalFrames = 240;
const images = [];
let loadedCount = 0;
let isLoaded = false;

// Scrolling & Animation State
let scrollProgress = 0;
let easedProgress = 0;
const lerpSpeed = 0.08; // Decreasing this makes scroll buttery smooth, increasing makes it more responsive
let lastRenderedFrameIndex = -1;

// Define active ranges for each story beat (0.0 to 1.0 progress)
const beats = [
  { id: 'beat-intro', start: 0.0, end: 0.15 },
  { id: 'beat-engineering', start: 0.15, end: 0.40 },
  { id: 'beat-anc', start: 0.40, end: 0.65 },
  { id: 'beat-sound', start: 0.65, end: 0.85 },
  { id: 'beat-cta', start: 0.85, end: 1.0 }
];

// Preload Images
function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      
      // Vite resolves public assets from root, so /assets/frames/ is mapped to public/assets/frames/
      img.src = `/assets/frames/ezgif-frame-${frameNum}.jpg`;
      
      img.onload = () => {
        loadedCount++;
        const pct = Math.round((loadedCount / totalFrames) * 100);
        loadPercentageEl.textContent = `${pct}%`;
        
        if (loadedCount === totalFrames) {
          isLoaded = true;
          resolve();
        }
      };
      
      img.onerror = (err) => {
        console.error(`Failed to load frame ${frameNum}:`, err);
        loadedCount++;
        const pct = Math.round((loadedCount / totalFrames) * 100);
        loadPercentageEl.textContent = `${pct}%`;
        
        if (loadedCount === totalFrames) {
          isLoaded = true;
          resolve();
        }
      };
      
      images.push(img);
    }
  });
}

// Adjust Canvas Resolution for High-DPI Displays (Retina screens)
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Re-scale the context to draw in normal pixels
  ctx.scale(dpr, dpr);
  
  // Re-draw current frame immediately on resize
  if (isLoaded) {
    const frameIndex = Math.round(easedProgress * (totalFrames - 1));
    renderFrame(frameIndex);
  }
}

// Render a single image frame centered and scaled to fit (contain scale)
function renderFrame(index) {
  if (index < 0 || index >= totalFrames || !images[index]) return;
  
  const img = images[index];
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvas.width / dpr;
  const canvasHeight = canvas.height / dpr;
  
  // Get aspect ratios
  const canvasRatio = canvasWidth / canvasHeight;
  const imgRatio = img.width / img.height;
  
  let drawWidth, drawHeight;
  
  if (canvasRatio > imgRatio) {
    // Canvas is wider than image
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgRatio;
  } else {
    // Canvas is taller than image
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
  }
  
  // Apply a subtle scale factor (88%) to create a premium frame margin
  const paddingFactor = 0.88;
  drawWidth *= paddingFactor;
  drawHeight *= paddingFactor;
  
  const x = (canvasWidth - drawWidth) / 2;
  const y = (canvasHeight - drawHeight) / 2;
  
  // Clear with exact frame background color RGB: 1, 1, 1
  ctx.fillStyle = '#010101';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw the image
  ctx.drawImage(img, x, y, drawWidth, drawHeight);
  
  lastRenderedFrameIndex = index;
}

// Calculate Scroll Progress
function updateScrollProgress() {
  const containerRect = scrollContainer.getBoundingClientRect();
  const totalScrollable = scrollContainer.offsetHeight - window.innerHeight;
  
  // Bound scroll progress between 0 and 1
  const relativeScrollY = Math.max(0, -containerRect.top);
  scrollProgress = Math.min(1, Math.max(0, relativeScrollY / totalScrollable));
}

// Update Active Text Section Overlays based on scroll progress
function updateOverlays(progress) {
  beats.forEach((beat) => {
    const el = document.getElementById(beat.id);
    if (!el) return;
    
    // Check if progress is inside this beat's active range
    if (progress >= beat.start && progress <= beat.end) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

// Update Sticky/Translucent Navbar Class and Progress Bar
function updateNavbar() {
  const scrollY = window.scrollY;
  
  // Add background blur and shadow after slight scroll
  if (scrollY > 50) {
    appleNav.classList.add('scrolled');
  } else {
    appleNav.classList.remove('scrolled');
  }
  
  // Update progress bar width
  scrollProgressBar.style.width = `${scrollProgress * 100}%`;
  
  // Update active nav links based on scroll section
  let activeNavId = 'overview';
  
  if (scrollProgress >= 0.15 && scrollProgress < 0.40) {
    activeNavId = 'technology';
  } else if (scrollProgress >= 0.40 && scrollProgress < 0.65) {
    activeNavId = 'anc';
  } else if (scrollProgress >= 0.65 && scrollProgress < 0.85) {
    activeNavId = 'technology'; // Maps Sound back to technology
  } else if (scrollProgress >= 0.85) {
    activeNavId = 'buy';
  }
  
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === `#${activeNavId}` || (href === '#' && activeNavId === 'overview')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Smooth Animation Loop using Lerp (Linear Interpolation)
function animate() {
  // Linearly interpolate the progress for buttery smooth scroll animations
  easedProgress += (scrollProgress - easedProgress) * lerpSpeed;
  
  // Bound check
  if (Math.abs(easedProgress - scrollProgress) < 0.0001) {
    easedProgress = scrollProgress;
  }
  
  // Calculate target frame index
  const targetFrameIndex = Math.round(easedProgress * (totalFrames - 1));
  
  // Render frame only if index has changed (avoids unnecessary rendering pipeline updates)
  if (targetFrameIndex !== lastRenderedFrameIndex) {
    renderFrame(targetFrameIndex);
  }
  
  // Update text overlays based on eased progress (makes text fades smooth too)
  updateOverlays(easedProgress);
  
  requestAnimationFrame(animate);
}

// Sound Experience Setup
function initSound() {
  soundToggle.classList.remove('hidden');
  soundToggle.classList.add('visible');
  
  // Low ambient volume
  ambientAudio.volume = 0.15;
  
  soundToggle.addEventListener('click', () => {
    if (ambientAudio.paused) {
      ambientAudio.play().then(() => {
        soundToggle.classList.add('playing');
        soundToggle.querySelector('.sound-text').textContent = 'SOUND OFF';
      }).catch((err) => {
        console.error('Audio play blocked:', err);
      });
    } else {
      ambientAudio.pause();
      soundToggle.classList.remove('playing');
      soundToggle.querySelector('.sound-text').textContent = 'SOUND ON';
    }
  });
}

// Initialize Everything
async function init() {
  // Listen to resize
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  // Update scroll bounds initially
  updateScrollProgress();
  
  // Preload frames
  await preloadImages();
  
  // Hide loader
  loader.classList.add('fade-out');
  
  // Enable audio controls
  initSound();
  
  // Trigger initial renders
  resizeCanvas();
  
  // Listen to scroll events
  window.addEventListener('scroll', () => {
    updateScrollProgress();
    updateNavbar();
  }, { passive: true });
  
  // Start smooth animation loop
  animate();
}

// Run Initialization
window.addEventListener('DOMContentLoaded', init);
