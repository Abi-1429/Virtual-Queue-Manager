// Track queue functionality
let currentTicket = null;
let unsubscribe = null;

async function initTrack() {
    await checkAuth();
    
    // Check for ticket in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket');
    
    if (ticketId) {
        document.getElementById('ticketIdInput').value = ticketId;
        trackTicketById(ticketId);
    }
    
    loadMyTickets();
}

async function trackTicket() {
    const ticketId = document.getElementById('ticketIdInput').value.trim();
    
    if (!ticketId) {
        showToast('Please enter a ticket ID', 'error');
        return;
    }
    
    trackTicketById(ticketId);
}

async function trackTicketById(ticketId) {
    try {
        // Unsubscribe from previous listener
        if (unsubscribe) {
            unsubscribe();
        }
        
        const ticketDoc = await db.collection('queues').doc(ticketId).get();
        
        if (!ticketDoc.exists) {
            showToast('Ticket not found', 'error');
            return;
        }
        
        currentTicket = { id: ticketDoc.id, ...ticketDoc.data() };
        displayTicketInfo(currentTicket);
        
        // Set up real-time listener
        unsubscribe = db.collection('queues').doc(ticketId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const updatedTicket = { id: doc.id, ...doc.data() };
                    currentTicket = updatedTicket;
                    displayTicketInfo(updatedTicket);
                    
                    // Show notification for status changes
                    if (updatedTicket.status === 'serving') {
                        showToast('It\'s your turn! Please proceed to the counter.', 'success');
                    }
                }
            });
            
    } catch (error) {
        console.error('Error tracking ticket:', error);
        showToast('Error tracking ticket', 'error');
    }
}

function displayTicketInfo(ticket) {
    const queueInfo = document.getElementById('queueInfo');
    const ticketDetails = document.getElementById('ticketDetails');
    const queueProgress = document.getElementById('queueProgress');
    const queueStats = document.getElementById('queueStats');
    
    // Show queue info section
    queueInfo.style.display = 'block';
    
    // Calculate progress
    let progressWidth = 0;
    let progressClass = 'bg-warning';
    
    if (ticket.status === 'waiting') {
        progressWidth = Math.min((ticket.position / 10) * 100, 80);
    } else if (ticket.status === 'serving') {
        progressWidth = 90;
        progressClass = 'bg-info';
    } else if (ticket.status === 'completed') {
        progressWidth = 100;
        progressClass = 'bg-success';
    }
    
    // Update progress bar
    queueProgress.style.width = `${progressWidth}%`;
    queueProgress.className = `progress-bar ${progressClass}`;
    
    // Update ticket details
    ticketDetails.innerHTML = `
        <div class="row">
            <div class="col-6">
                <strong>Ticket ID:</strong><br>
                <span class="text-primary fw-bold">${ticket.ticketId}</span>
            </div>
            <div class="col-6">
                <strong>Current Position:</strong><br>
                <span class="fs-4 fw-bold">#${ticket.position}</span>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <strong>Location:</strong> ${ticket.locationName}<br>
                <strong>Service:</strong> ${ticket.service}<br>
                <strong>Status:</strong> <span class="status-badge ${getStatusClass(ticket.status)}">${ticket.status.toUpperCase()}</span>
            </div>
        </div>
    `;
    
    // Update queue stats
    const waitTime = ticket.createdAt ? 
        Math.round((new Date() - ticket.createdAt.toDate()) / 60000) : 0;
    
    queueStats.innerHTML = `
        <div class="row text-center">
            <div class="col-4">
                <div class="fw-bold text-primary">${ticket.position}</div>
                <small class="text-muted">Position</small>
            </div>
            <div class="col-4">
                <div class="fw-bold text-warning">${waitTime}</div>
                <small class="text-muted">Minutes</small>
            </div>
            <div class="col-4">
                <div class="fw-bold text-info">${ticket.estimatedWait || '15-20'}</div>
                <small class="text-muted">Est. Wait</small>
            </div>
        </div>
    `;
}

async function loadMyTickets() {
    try {
        const user = await getCurrentUserData();
        const ticketsSnapshot = await db.collection('queues')
            .where('userId', '==', user.uid)
            .where('status', 'in', ['waiting', 'serving'])
            .orderBy('createdAt', 'desc')
            .get();
            
        const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayMyTickets(tickets);
        
    } catch (error) {
        console.error('Error loading my tickets:', error);
    }
}

function displayMyTickets(tickets) {
    const container = document.getElementById('myTicketsList');
    const section = document.getElementById('myTicketsSection');
    const noTickets = document.getElementById('noTicketsMessage');
    
    if (tickets.length === 0) {
        section.style.display = 'none';
        noTickets.style.display = 'block';
        return;
    }
    
    section.style.display = 'block';
    noTickets.style.display = 'none';
    
    container.innerHTML = tickets.map(ticket => `
        <div class="queue-item p-3 mb-2" onclick="trackTicketById('${ticket.ticketId}')">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="fw-bold mb-1">${ticket.service}</h6>
                    <p class="text-muted mb-0 small">${ticket.locationName}</p>
                </div>
                <div class="text-end">
                    <span class="badge bg-primary">#${ticket.position}</span>
                    <br>
                    <small class="text-muted">${ticket.ticketId}</small>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusClass(status) {
    const classes = {
        'waiting': 'status-waiting',
        'serving': 'status-serving',
        'completed': 'status-completed'
    };
    return classes[status] || 'status-waiting';
}

// Initialize when page loads
if (document.getElementById('ticketIdInput')) {
    initTrack();
}