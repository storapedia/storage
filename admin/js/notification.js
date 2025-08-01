// admin/js/notification.js

// Global variable to store admin notifications
let allAdminNotifications = [];

// Fungsi untuk mengupdate badge notifikasi di header
function updateNotificationBadge(count) {
    const notificationArea = document.getElementById('notification-area');
    const notificationCount = document.getElementById('notification-count');

    if (count > 0) {
        notificationCount.textContent = count;
        notificationArea.classList.remove('hidden'); // Show the notification area
        notificationCount.classList.remove('hidden'); // Show the badge
    } else {
        notificationCount.textContent = '0';
        notificationCount.classList.add('hidden'); // Hide the badge
        notificationArea.classList.add('hidden'); // Hide the notification area if 0
    }
}

// Fungsi untuk menampilkan popup notifikasi
function openNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    const listContainer = document.getElementById('notifications-list-container');
    
    // Tampilkan notifikasi yang diurutkan terbaru
    if (allAdminNotifications.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-sm text-center">No new notifications.</p>';
    } else {
        listContainer.innerHTML = allAdminNotifications.map(notif => {
            let badgeColor = 'bg-gray-200 text-gray-700';
            let icon = 'fas fa-info-circle';
            let messageTitle = 'New Activity';

            switch (notif.type) {
                case 'new_booking':
                    badgeColor = 'bg-green-100 text-green-700';
                    icon = 'fas fa-box';
                    messageTitle = 'New Booking';
                    break;
                case 'checked_in':
                    badgeColor = 'bg-blue-100 text-blue-700';
                    icon = 'fas fa-sign-in-alt';
                    messageTitle = 'User Checked In';
                    break;
                case 'checked_out':
                    badgeColor = 'bg-purple-100 text-purple-700';
                    icon = 'fas fa-sign-out-alt';
                    messageTitle = 'User Checked Out';
                    break;
                case 'cancelled_booking':
                    badgeColor = 'bg-red-100 text-red-700';
                    icon = 'fas fa-times-circle';
                    messageTitle = 'Booking Cancelled';
                    break;
                case 'chat_message':
                    badgeColor = 'bg-yellow-100 text-yellow-700';
                    icon = 'fas fa-comment-dots';
                    messageTitle = 'New Chat Message';
                    break;
            }

            const readClass = notif.read ? 'opacity-60 bg-gray-50' : 'bg-white font-semibold';

            return `
                <div class="p-3 rounded-lg border border-gray-200 ${readClass} flex items-start space-x-3 transition-all duration-200">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${badgeColor}">
                        <i class="${icon} text-sm"></i>
                    </div>
                    <div class="flex-grow">
                        <p class="text-sm text-gray-800">${messageTitle}: ${notif.message}</p>
                        <p class="text-xs text-gray-500 mt-1">${new Date(notif.timestamp).toLocaleString()}</p>
                    </div>
                    <button onclick="markAdminNotificationAsRead('${notif.id}')" class="flex-shrink-0 text-xs text-blue-600 hover:underline">Mark as Read</button>
                </div>
            `;
        }).join('');
    }

    modal.classList.remove('hidden'); // Tampilkan modal
}

// Fungsi untuk menutup popup notifikasi
function closeNotificationsModal() {
    const modal = document.getElementById('notifications-modal');
    modal.classList.add('hidden'); // Sembunyikan modal
}

// Fungsi untuk menandai notifikasi individu sebagai sudah dibaca
function markAdminNotificationAsRead(notificationId) {
    db.ref(`notifications/admin/${notificationId}/read`).set(true)
        .then(() => {
            console.log(`Notification ${notificationId} marked as read.`);
            // Tidak perlu refresh halaman, listener Firebase akan otomatis update UI
        })
        .catch(error => console.error("Error marking notification as read:", error));
}

// Fungsi untuk menandai semua notifikasi sebagai sudah dibaca
function markAllAdminNotificationsAsRead() {
    const updates = {};
    allAdminNotifications.forEach(notif => {
        if (!notif.read) {
            updates[`/notifications/admin/${notif.id}/read`] = true;
        }
    });

    if (Object.keys(updates).length > 0) {
        db.ref().update(updates)
            .then(() => Swal.fire('Success', 'All activities marked as read!', 'success'))
            .catch(error => Swal.fire('Error', 'Failed to mark all as read.', 'error'));
    } else {
        Swal.fire('Info', 'No unread activities to mark.', 'info');
    }
}

// Event Listeners for Notification UI
document.addEventListener('DOMContentLoaded', () => {
    const notificationButton = document.getElementById('notification-button');
    const closeNotificationsModalButton = document.getElementById('close-notifications-modal');
    const markAllReadButton = document.getElementById('mark-all-read-btn');

    if (notificationButton) {
        notificationButton.addEventListener('click', openNotificationsModal);
    }
    if (closeNotificationsModalButton) {
        closeNotificationsModalButton.addEventListener('click', closeNotificationsModal);
    }
    if (markAllReadButton) {
        markAllReadButton.addEventListener('click', markAllAdminNotificationsAsRead);
    }
});