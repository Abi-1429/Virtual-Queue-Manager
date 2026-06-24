// Map functionality with email integration
let map;
let markers = [];
let currentUser = null;
let locations = [];

// Default coordinates for Madurai
const MADURAI_CENTER = [9.9252, 78.1198];

// Initialize map
async function initMap() {
    await checkAuth();
    currentUser = await getCurrentUserData();
    
    // Initialize Leaflet map centered on Madurai
    map = L.map('map').setView(MADURAI_CENTER, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    await loadLocations();
    setupEventListeners();
}

function setupEventListeners() {
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterLocations);
    }
    
    // Search functionality
    const searchLocation = document.getElementById('searchLocation');
    if (searchLocation) {
        searchLocation.addEventListener('input', filterLocations);
    }
}

async function loadLocations() {
    try {
        const locationsSnapshot = await db.collection('locations').get();
        
        if (locationsSnapshot.empty) {
            // If no locations exist, create some sample locations for Madurai
            await createSampleLocations();
            // Reload locations after creating samples
            const newSnapshot = await db.collection('locations').get();
            locations = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
            locations = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        displayLocations(locations);
        addMarkersToMap(locations);
        updateLocationCount(locations.length);
        
    } catch (error) {
        console.error('Error loading locations:', error);
        showToast('Error loading locations', 'error');
    }
}

// Create sample locations for Madurai if none exist
async function createSampleLocations() {
    const sampleLocations = [
        {
            name: "Apollo Hospital",
            address: "Tamildhagam, Anna Nagar, Madurai",
            category: "hospital",
            lat: 9.9399,
            lng: 78.1211,
            waitTime: "20",
            services: ["General Consultation", "Emergency", "Lab Test"],
            distance: "2.1"
        },
        {
            name: "State Bank of India",
            address: "West Tower, West Masi Street, Madurai",
            category: "bank",
            lat: 9.9197,
            lng: 78.1194,
            waitTime: "15",
            services: ["Savings Account", "Loan", "Cash Deposit"],
            distance: "1.5"
        },
        {
            name: "Madurai Medical College",
            address: "Panagal Road, Madurai",
            category: "hospital",
            lat: 9.9280,
            lng: 78.1168,
            waitTime: "25",
            services: ["General Checkup", "Specialist Consultation"],
            distance: "0.8"
        },
        {
            name: "ICICI Bank",
            address: "Bypass Road, Koodal Nagar, Madurai",
            category: "bank",
            lat: 9.9350,
            lng: 78.1250,
            waitTime: "10",
            services: ["Personal Banking", "Business Banking"],
            distance: "3.2"
        },
        {
            name: "Cafe Coffee Day",
            address: "Fashion Park Complex, Madurai",
            category: "cafe",
            lat: 9.9220,
            lng: 78.1220,
            waitTime: "5",
            services: ["Coffee", "Snacks", "Desserts"],
            distance: "1.8"
        },
        {
            name: "Starbucks",
            address: "Vishaal De Mall, Madurai",
            category: "cafe",
            lat: 9.9300,
            lng: 78.1280,
            waitTime: "8",
            services: ["Coffee", "Tea", "Bakery"],
            distance: "2.5"
        }
    ];

    try {
        for (const location of sampleLocations) {
            await db.collection('locations').add(location);
        }
        console.log('Sample locations created successfully');
        showToast('Sample locations loaded successfully!', 'success');
    } catch (error) {
        console.error('Error creating sample locations:', error);
        showToast('Error creating sample locations', 'error');
    }
}

function displayLocations(locations) {
    const container = document.getElementById('locationsList');
    
    if (!container) return;
    
    if (locations.length === 0) {
        container.innerHTML = `
            <div class="text-center p-4">
                <i class="fas fa-map-marker-alt fa-2x text-muted mb-3"></i>
                <p class="text-muted">No locations found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = locations.map(location => `
        <div class="location-card p-3" onclick="showLocationModal('${location.id}')">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="fw-bold mb-1">${location.name}</h6>
                    <p class="text-muted small mb-1">${location.address}</p>
                    <span class="category-badge ${getCategoryClass(location.category)}">
                        ${getCategoryIcon(location.category)} ${location.category}
                    </span>
                </div>
                <div class="text-end">
                    <small class="text-muted">${location.distance || '1.2'} km</small>
                    <div class="mt-1">
                        <span class="badge bg-primary">${location.waitTime || '15'} min</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function addMarkersToMap(locations) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    locations.forEach(location => {
        // Validate coordinates
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lng);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Invalid coordinates for location: ${location.name}`, location);
            return; // Skip this location
        }
        
        // Ensure coordinates are within reasonable bounds for Madurai
        if (lat < 9.8 || lat > 10.0 || lng < 78.0 || lng > 78.3) {
            console.warn(`Coordinates out of bounds for Madurai: ${location.name}`, { lat, lng });
            return; // Skip this location
        }
        
        const marker = L.marker([lat, lng])
            .addTo(map)
            .bindPopup(`
                <div class="p-2">
                    <h6 class="fw-bold">${location.name}</h6>
                    <p class="mb-1 small">${location.address}</p>
                    <p class="mb-2 small text-muted">${location.category}</p>
                    <button class="btn btn-primary btn-sm w-100" onclick="showLocationModal('${location.id}')">
                        View Details
                    </button>
                </div>
            `);
        markers.push(marker);
    });
    
    // Adjust map view to show all markers if we have valid markers
    if (markers.length > 0) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function filterLocations() {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchLocation = document.getElementById('searchLocation');
    
    if (!categoryFilter || !searchLocation) return;
    
    const category = categoryFilter.value;
    const searchTerm = searchLocation.value.toLowerCase();
    
    let filteredLocations = locations;
    
    if (category !== 'all') {
        filteredLocations = filteredLocations.filter(loc => loc.category === category);
    }
    
    if (searchTerm) {
        filteredLocations = filteredLocations.filter(loc => 
            loc.name.toLowerCase().includes(searchTerm) || 
            (loc.address && loc.address.toLowerCase().includes(searchTerm))
        );
    }
    
    displayLocations(filteredLocations);
    addMarkersToMap(filteredLocations);
    updateLocationCount(filteredLocations.length);
}

function updateLocationCount(count) {
    const locationCount = document.getElementById('locationCount');
    if (locationCount) {
        locationCount.textContent = count;
    }
}

function getCategoryClass(category) {
    const classes = {
        'hospital': 'hospital-badge',
        'bank': 'bank-badge', 
        'cafe': 'cafe-badge'
    };
    return classes[category] || 'hospital-badge';
}

function getCategoryIcon(category) {
    const icons = {
        'hospital': '🏥',
        'bank': '🏦',
        'cafe': '☕'
    };
    return icons[category] || '📍';
}

async function showLocationModal(locationId) {
    try {
        const locationDoc = await db.collection('locations').doc(locationId).get();
        if (!locationDoc.exists) {
            showToast('Location not found', 'error');
            return;
        }
        
        const location = { id: locationDoc.id, ...locationDoc.data() };
        
        // Update modal content
        const modalLocationName = document.getElementById('modalLocationName');
        const modalLocationInfo = document.getElementById('modalLocationInfo');
        
        if (modalLocationName && modalLocationInfo) {
            modalLocationName.textContent = location.name;
            modalLocationInfo.innerHTML = `
                <div class="mb-3">
                    <p class="mb-1"><strong>Address:</strong> ${location.address}</p>
                    <p class="mb-1"><strong>Category:</strong> ${location.category}</p>
                    <p class="mb-1"><strong>Current Wait:</strong> ${location.waitTime || '15'} minutes</p>
                    <p class="mb-0"><strong>Services:</strong> ${location.services ? location.services.join(', ') : 'General Service'}</p>
                </div>
            `;
        }
        
        // Populate services dropdown
        const serviceSelect = document.getElementById('serviceSelect');
        if (serviceSelect) {
            const services = location.services || ['General Service'];
            serviceSelect.innerHTML = services.map(service => 
                `<option value="${service}">${service}</option>`
            ).join('');
            
            // Store current location ID for joinQueue function
            serviceSelect.setAttribute('data-location-id', locationId);
        }
        
        // Show modal
        const modalElement = document.getElementById('locationModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
    } catch (error) {
        console.error('Error loading location details:', error);
        showToast('Error loading location details', 'error');
    }
}

// Join queue function with email integration
async function joinQueue() {
    const serviceSelect = document.getElementById('serviceSelect');
    if (!serviceSelect) {
        showToast('Service selection not available', 'error');
        return;
    }
    
    const serviceType = serviceSelect.value;
    const locationId = serviceSelect.getAttribute('data-location-id');
    
    if (!locationId || !serviceType) {
        showToast('Please select a service', 'error');
        return;
    }
    
    try {
        const userData = await getCurrentUserData();
        if (!userData) {
            showToast('Please log in to join queue', 'error');
            return;
        }
        
        // Join queue with email notification
        const queueData = await joinQueueWithEmail(locationId, serviceType, userData);
        
        // Close modal
        const modalElement = document.getElementById('locationModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        
        // Redirect to track page
        setTimeout(() => {
            window.location.href = `track.html?ticket=${queueData.ticketId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error joining queue:', error);
        showToast('Error joining queue. Please try again.', 'error');
    }
}

// Initialize map when page loads
if (document.getElementById('map')) {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        initMap();
    }
}