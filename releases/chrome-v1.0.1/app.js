// Check if we're in Gmail inbox
function isInGmailInbox() {
  return (
    window.location.href.includes("mail.google.com") &&
    (window.location.hash.includes("#inbox") ||
      window.location.hash === "" ||
      window.location.hash === "#")
  );
}

// Helper function to find elements in shadow DOM
function findInShadowRoot(root, selector) {
  // Try direct query first
  const directMatch = root.querySelector(selector);
  if (directMatch) return directMatch;
  
  // If not found, search in shadow roots
  const shadowRoots = Array.from(root.querySelectorAll('*'))
    .filter(el => el.shadowRoot)
    .map(el => el.shadowRoot);
    
  for (const shadowRoot of shadowRoots) {
    const found = findInShadowRoot(shadowRoot, selector);
    if (found) return found;
  }
  
  return null;
}

// Find and click delete button
function triggerDelete(event) {
  console.log('Starting delete action...');
  
  // Prevent the default delete key behavior
  event?.preventDefault();
  
  // Try multiple selectors to find the delete button in different Gmail views
  const selectors = [
    // Main inbox view
    '.T-I[data-tooltip="Delete"][role="button"]',
    // Alternative view
    '[role="button"][title*="Delete" i]',
    // Mobile view
    '[data-tooltip*="delete" i]',
    // Another common pattern
    'div[role="button"][aria-label*="Delete" i]',
    // Fallback to any element with delete in tooltip or aria-label
    '[data-tooltip*="delete" i], [aria-label*="delete" i]'
  ];
  
  let deleteButton = null;
  for (const selector of selectors) {
    deleteButton = document.querySelector(selector);
    if (deleteButton) {
      console.log('Found delete button with selector:', selector);
      break;
    }
  }
  
  if (!deleteButton) {
    console.log('Delete button not found with any selector');
    return false;
  }
  
  console.log('Found delete button, attempting to click...');
  
  try {
    // Create a more complete click simulation
    function simulateClick(element) {
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;
      
      const events = [
        // Mouse down
        new MouseEvent('mousedown', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX,
          clientY
        }),
        // Focus (if element is focusable)
        new FocusEvent('focusin', {
          view: window,
          bubbles: true
        }),
        // Mouse up
        new MouseEvent('mouseup', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX,
          clientY
        }),
        // Click
        new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX,
          clientY
        })
      ];
      
      // Dispatch all events
      events.forEach(event => {
        element.dispatchEvent(event);
      });
      
      // Also try the native click
      if (typeof element.click === 'function') {
        element.click();
      }
    }
    
    console.log('Simulating click on delete button');
    simulateClick(deleteButton);
    
    // Also try clicking the first child element
    if (deleteButton.firstElementChild) {
      console.log('Trying to click the first child element');
      simulateClick(deleteButton.firstElementChild);
    }
    
    return true;
    
  } catch (error) {
    console.error('Error during delete action:', error);
    return false;
  }
  
  console.log('No delete button found with any selector');
  return false;
}

// Handle keypress events
function handleKeyPress(event) {
  if (!isInGmailInbox()) return;

  // Check for Delete key (keyCode 46) or 'd' key
  if (event.key === "Delete" || event.key === "d") {
    // Avoid triggering when typing in input fields
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.isContentEditable
    ) {
      return;
    }

    event.preventDefault();
    if (triggerDelete(event)) {
      console.log("Delete action triggered");
    }
  }
}

// Initialize when DOM is ready
function init() {
  document.addEventListener("keydown", handleKeyPress);
  console.log("Gmail delete key handler initialized");
}

// Handle Gmail's dynamic loading
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}