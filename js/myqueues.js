// My Queues functionality with email integration
let currentUser = null;

async function initMyQueues() {
    await checkAuth();
    currentUser = await getCurrentUserData();
    
    loadActiveTickets();
    loadHistoryTickets();
    setupRealTimeUpdates();
}

async function loadActiveTickets() {
    try {
        const activeSnapshot = await db.collection('queues')
            .where('userId', '==', currentUser.uid)
            .where('status', 'in', ['waiting', 'serving'])
            .orderBy('createdAt', 'desc')
            .get();
            
        const activeTickets = activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayActiveTickets(activeTickets);
        
    } catch (error) {
        console.error('Error loading active tickets:', error);
        document.getElementById('activeTicketsList').innerHTML = `
            <div class="alert alert-danger">Error loading active queues</div>
        `;
    }
}

async function loadHistoryTickets() {
    try {
        const historySnapshot = await db.collection('queues')
            .where('userId', '==', currentUser.uid)
            .where('status', 'in', ['completed', 'no-show'])
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
            
        const historyTickets = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayHistoryTickets(historyTickets);
        
    } catch (error) {
        console.error('Error loading history tickets:', error);
        document.getElementById('historyTicketsList').innerHTML = `
            <div class="alert alert-danger">Error loading queue history</div>
        `;
    }
}

function displayActiveTickets(tickets) {
    const container = document.getElementById('activeTicketsList');
    
    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h5>No Active Queues</h5>
                <p class="text-muted">You don't have any active queues at the moment.</p>
                <a href="map.html" class="btn btn-primary">Join a Queue</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tickets.map(ticket => `
        <div class="queue-card">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h6 class="fw-bold mb-1">${ticket.service}</h6>
                    <p class="text-muted mb-1">${ticket.locationName}</p>
                    <small class="text-muted">Ticket: ${ticket.ticketId}</small>
                </div>
                <div class="col-md-3 text-center">
                    <span class="status-badge ${getStatusClass(ticket.status)}">
                        ${ticket.status.toUpperCase()}
                    </span>
                    <br>
                    <small class="text-muted">Position: ${ticket.position}</small>
                </div>
                <div class="col-md-3 text-end">
                    <a href="track.html?ticket=${ticket.ticketId}" class="btn btn-primary btn-sm">
                        <i class="fas fa-eye me-1"></i>Track
                    </a>
                </div>
            </div>
            ${ticket.estimatedWait ? `
                <div class="mt-2">
                    <small class="text-muted">Estimated wait: ${ticket.estimatedWait}</small>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function displayHistoryTickets(tickets) {
    const container = document.getElementById('historyTicketsList');
    
    if (tickets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <h5>No Queue History</h5>
                <p class="text-muted">Your queue history will appear here.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tickets.map(ticket => `
        <div class="queue-card">
            <div class="row align-items-center">
                <div class="col-md-6">
                    <h6 class="fw-bold mb-1">${ticket.service}</h6>
                    <p class="text-muted mb-1">${ticket.locationName}</p>
                    <small class="text-muted">Ticket: ${ticket.ticketId}</small>
                </div>
                <div class="col-md-3 text-center">
                    <span class="status-badge ${getStatusClass(ticket.status)}">
                        ${ticket.status.toUpperCase()}
                    </span>
                    <br>
                    <small class="text-muted">
                        ${ticket.completedAt ? formatDate(ticket.completedAt.toDate()) : 'N/A'}
                    </small>
                </div>
                <div class="col-md-3 text-end">
                    <small class="text-muted">
                        Joined: ${formatDate(ticket.createdAt.toDate())}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusClass(status) {
    const classes = {
        'waiting': 'status-waiting',
        'serving': 'status-serving', 
        'completed': 'status-completed',
        'no-show': 'status-no-show'
    };
    return classes[status] || 'status-waiting';
}

function formatDate(date) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function setupRealTimeUpdates() {
    // Real-time listener for queue updates
    db.collection('queues')
        .where('userId', '==', currentUser.uid)
        .onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'modified') {
                    const newData = change.doc.data();
                    const oldData = change.doc.data();
                    
                    // Check if position changed significantly
                    if (newData.position <= 3 && newData.position !== oldData.position) {
                        // Send position update email via Resend
                        try {
                            await sendQueueEmailNotification(
                                newData, 
                                currentUser, 
                                'positionUpdate', 
                                { oldPosition: oldData.position }
                            );
                        } catch (error) {
                            console.error('Failed to send position update email:', error);
                        }
                    }
                    
                    // Check if status changed to serving
                    if (newData.status === 'serving' && oldData.status === 'waiting') {
                        // Send ready for service email via Resend
                        try {
                            await sendQueueEmailNotification(
                                newData, 
                                currentUser, 
                                'readyForService'
                            );
                        } catch (error) {
                            console.error('Failed to send ready email:', error);
                        }
                    }
                    
                    // Check if status changed to completed
                    if (newData.status === 'completed' && oldData.status !== 'completed') {
                        // Send service completed email via Resend
                        try {
                            await sendQueueEmailNotification(
                                newData, 
                                currentUser, 
                                'serviceCompleted'
                            );
                        } catch (error) {
                            console.error('Failed to send completion email:', error);
                        }
                    }
                }
            });
            
            // Reload both lists
            loadActiveTickets();
            loadHistoryTickets();
        });
}