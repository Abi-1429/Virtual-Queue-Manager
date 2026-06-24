// Firebase Configuration and Core Functions with Resend Integration
const firebaseConfig = {
    apiKey: "AIzaSyAXvjL_U0g_U5hF8XcIWLpkwyh1PWMx03o",
    authDomain: "virtual-queue-manager.firebaseapp.com",
    projectId: "virtual-queue-manager",
    storageBucket: "virtual-queue-manager.firebasestorage.app",
    messagingSenderId: "50053786489",
    appId: "1:50053786489:web:3dff3072decd2f174fdda8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Core Authentication Functions (available everywhere)
function checkAuth() {
    return new Promise((resolve, reject) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                window.location.href = 'auth.html';
            }
        });
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Get current user data
async function getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Toast notification function (available everywhere)
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Add to container
    const container = document.getElementById('toastContainer') || createToastContainer();
    container.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

// Queue Management with Resend Email Integration
async function joinQueueWithEmail(locationId, serviceType, userData) {
    try {
        // Generate ticket ID
        const ticketId = 'T' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        
        // Get location data
        const locationDoc = await db.collection('locations').doc(locationId).get();
        const locationData = locationDoc.data();
        
        // Create queue entry
        const queueData = {
            ticketId: ticketId,
            userId: userData.uid,
            userName: userData.name,
            userEmail: userData.email,
            locationId: locationId,
            locationName: locationData.name,
            service: serviceType,
            position: await getNextPosition(locationId, serviceType),
            status: 'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            estimatedWait: calculateEstimatedWait(await getQueueLength(locationId, serviceType))
        };
        
        // Save to Firestore
        await db.collection('queues').doc(ticketId).set(queueData);
        
        // Send welcome email using Resend
        if (typeof sendWelcomeEmail !== 'undefined') {
            sendWelcomeEmail(queueData, userData).then(result => {
                if (result.success) {
                    console.log('Welcome email sent successfully via Resend');
                } else {
                    console.error('Failed to send welcome email:', result.error);
                }
            }).catch(error => {
                console.error('Error sending welcome email:', error);
            });
        }
        
        // Show success message
        showToast(`Queue joined successfully! Your ticket: ${ticketId}`, 'success');
        
        return queueData;
        
    } catch (error) {
        console.error('Error joining queue:', error);
        showToast('Error joining queue. Please try again.', 'error');
        throw error;
    }
}

async function getNextPosition(locationId, serviceType) {
    const queuesSnapshot = await db.collection('queues')
        .where('locationId', '==', locationId)
        .where('service', '==', serviceType)
        .where('status', 'in', ['waiting', 'serving'])
        .get();
    
    return queuesSnapshot.size + 1;
}

async function getQueueLength(locationId, serviceType) {
    const queuesSnapshot = await db.collection('queues')
        .where('locationId', '==', locationId)
        .where('service', '==', serviceType)
        .where('status', 'in', ['waiting', 'serving'])
        .get();
    
    return queuesSnapshot.size;
}

function calculateEstimatedWait(queueLength) {
    const avgServiceTime = 5; // minutes per person
    return `${queueLength * avgServiceTime} minutes`;
}

// Email notification functions for real-time updates
async function sendQueueEmailNotification(queueData, userData, emailType, additionalData = {}) {
    if (!userData || !userData.email) {
        console.warn('No user email available for notification');
        return { success: false, error: 'No user email' };
    }

    try {
        let result;
        
        switch (emailType) {
            case 'positionUpdate':
                if (typeof sendPositionUpdateEmail !== 'undefined') {
                    result = await sendPositionUpdateEmail(queueData, userData, additionalData.oldPosition);
                }
                break;
                
            case 'readyForService':
                if (typeof sendReadyForServiceEmail !== 'undefined') {
                    result = await sendReadyForServiceEmail(queueData, userData);
                }
                break;
                
            case 'serviceCompleted':
                if (typeof sendServiceCompletedEmail !== 'undefined') {
                    result = await sendServiceCompletedEmail(queueData, userData);
                }
                break;
                
            default:
                console.warn('Unknown email type:', emailType);
                return { success: false, error: 'Unknown email type' };
        }
        
        if (result && result.success) {
            console.log(`${emailType} email sent successfully via Resend`);
            return { success: true };
        } else {
            console.error(`Failed to send ${emailType} email:`, result?.error);
            return { success: false, error: result?.error };
        }
        
    } catch (error) {
        console.error(`Error sending ${emailType} email:`, error);
        return { success: false, error: error.message };
    }
}