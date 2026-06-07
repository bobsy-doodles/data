/**
 * Main JavaScript
 * Handles form submission and user interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    const registrationForm = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');

    if (registrationForm) {
        registrationForm.addEventListener('submit', handleFormSubmit);
    }
});

/**
 * Handle registration form submission
 */
function handleFormSubmit(event) {
    event.preventDefault();

    // Get form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const age = document.getElementById('age').value;
    const consent = document.getElementById('consent').checked;

    // Validate data
    if (!name || !email || !age || !consent) {
        alert('Please fill in all fields and accept the privacy policy');
        return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Validate age
    if (age < 13) {
        alert('You must be at least 13 years old to participate');
        return;
    }

    // Store user data in tracker
    const userData = {
        name: name,
        email: email,
        age: parseInt(age),
        registrationTime: new Date().toISOString()
    };

    tracker.storeUserData(userData);

    // Send initial data to server
    sendUserRegistration(userData);

    // Show success message
    showSuccessMessage();

    // Reset form
    registrationForm.reset();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show success message
 */
function showSuccessMessage() {
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'block';
        // Hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
}

/**
 * Send user registration to server
 */
async function sendUserRegistration(userData) {
    try {
        // Send registration data to server
        const response = await fetch('/api/register-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...userData,
                sessionId: tracker.sessionId,
                registrationTime: new Date().toISOString()
            })
        });

        if (response.ok) {
            console.log('Registration sent to server');
        } else {
            console.error('Failed to send registration:', response.status);
        }
    } catch (error) {
        console.error('Error sending registration:', error);
        // Continue anyway - data is tracked locally
    }
}

/**
 * Utility: Get all collected data (for testing/debugging)
 */
async function viewCollectedData() {
    const data = await tracker.getAllData();
    console.log('Collected Data:', data);
    console.table(data);
}

/**
 * Utility: Export data as JSON file
 */
function downloadUserData() {
    tracker.exportData();
}

/**
 * Utility: Clear all stored data
 */
function clearAllData() {
    if (confirm('Are you sure you want to delete all stored data? This action cannot be undone.')) {
        tracker.clearData();
        alert('All data has been cleared');
    }
}

/**
 * Debug: Log current session data
 */
async function debugSessionData() {
    const data = await tracker.getAllData();
    console.group('DEBUG: Session Data');
    console.log('Session ID:', data.sessionId);
    console.log('User Data:', data.userData);
    console.log('Behavioral Data:', data.behavioral);
    console.log('Technical Data:', data.technical);
    console.log('Session Info:', data.session);
    console.groupEnd();
    return data;
}

// Make utilities available in console
window.dataTrackerUtils = {
    viewData: viewCollectedData,
    exportData: downloadUserData,
    clearData: clearAllData,
    debugSession: debugSessionData
};

console.log('Data Tracker initialized. Use dataTrackerUtils.* to access utilities:');
console.log('- dataTrackerUtils.viewData() - View collected data');
console.log('- dataTrackerUtils.exportData() - Download data as JSON');
console.log('- dataTrackerUtils.clearData() - Clear all stored data');
console.log('- dataTrackerUtils.debugSession() - Debug session data');
