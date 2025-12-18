// Preload critical components and data
export const preloadCriticalResources = () => {
  // Preload critical CSS
  const criticalCSS = [
    '/static/css/main.css',
    // Add other critical CSS files
  ];

  criticalCSS.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });

  // Preload critical JavaScript chunks
  const criticalJS = [
    // Add critical JS chunks that should be preloaded
  ];

  criticalJS.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  });
};

// Prefetch non-critical resources
export const prefetchResources = () => {
  // Prefetch likely-to-be-visited pages
  const likelyPages = [
    '/dash/manage_students',
    '/dash/view_attendance',
    '/dash/all_staff_management',
    '/dash/admin_certificate_manager'
  ];

  likelyPages.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  });
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Run immediately
  preloadCriticalResources();
  
  // Run after initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefetchResources);
  } else {
    prefetchResources();
  }
  
  // Optimize images
  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading is supported
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
};