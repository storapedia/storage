// admin/js/reviews.js

// =====================================================================
// REVIEWS & TESTIMONIALS LOGIC
// =====================================================================
function fetchAndRenderTestimonials() {
    allTestimonials = [];
    db.ref('testimonials').once('value', snapshot => {
        snapshot.forEach(child => allTestimonials.push({id: child.key, ...child.val()}));
        // Only render if on the correct page to avoid unnecessary work
        if (document.getElementById('page-reviews').classList.contains('active')) {
            renderTestimonials();
        }
    });
}

function renderReviews() {
    const container = document.getElementById('user-reviews-container');
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';
    
    const reviews = [];
    // Collect reviews from all locations
    allLocations.forEach(loc => {
        if (loc.reviews) {
            Object.entries(loc.reviews).forEach(([reviewId, review]) => {
                // Attach locationId to the review object for reply functionality
                reviews.push({ id: reviewId, locationId: loc.id, locationName: loc.name, ...review });
            });
        }
    });

    if (reviews.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 p-4">No user reviews.</p>`;
        return;
    }

    container.innerHTML = reviews.sort((a,b) => b.timestamp - a.timestamp).map(review => {
        const user = allUsers[review.userId];
        const userName = user?.name || 'Unknown User';
        const stars = generateStarsHtml(review.rating);
        // Ensure review.replies is checked before trying to map
        const repliesHtml = review.replies ? Object.values(review.replies).map(r => `
            <div class="bg-gray-100 p-2 rounded-md text-sm mt-1">
                <strong>${r.name || 'Admin'}</strong>: ${r.text}
                ${r.timestamp ? `<span class="text-gray-500 ml-2">(${new Date(r.timestamp).toLocaleDateString('en-US')})</span>` : ''}
            </div>
        `).join('') : '';

        return `
            <div class="review-card bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <div class="font-semibold text-gray-800">${userName}</div>
                        <div class="text-xs text-gray-500">${review.locationName} | ${new Date(review.timestamp).toLocaleDateString('en-US')}</div>
                    </div>
                    <div class="text-yellow-500">${stars}</div>
                </div>
                <p class="text-sm mt-2 text-gray-700">${review.comment}</p>
                <div class="mt-2 space-y-1">
                    ${repliesHtml}
                </div>
                <button class="reply-review-btn text-xs text-primary-600 mt-2 hover:underline" 
                        data-location-id="${review.locationId}" 
                        data-review-id="${review.id}" 
                        data-user-id="${review.userId}">
                    Reply
                </button>
            </div>
        `;
    }).join('');
    // Attach event listeners after rendering
    document.querySelectorAll('.reply-review-btn').forEach(btn => btn.addEventListener('click', handleReviewReply));
}

function renderTestimonials() {
    const container = document.getElementById('testimonials-container');
    container.innerHTML = '<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-2xl text-primary-500"></i></div>';

    if (allTestimonials.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 p-4">No testimonials.</p>`;
        return;
    }

    container.innerHTML = allTestimonials.map(t => {
        return `
            <div class="testimonial-card bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <p class="text-sm italic text-gray-700">"${t.text}"</p>
                <p class="font-semibold text-sm mt-2 text-right text-gray-800"> - ${t.author || 'N/A'}</p>
                <div class="mt-2 flex justify-end items-center space-x-2">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${t.visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${t.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <button class="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-gray-100" title="Edit Testimonial" onclick="openTestimonialModal('${t.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-gray-500 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100" title="${t.visible ? 'Hide' : 'Show'} Testimonial" onclick="toggleTestimonialVisibility('${t.id}', ${t.visible})">
                        <i class="fas fa-eye${t.visible ? '' : '-slash'}"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-gray-100" title="Delete Testimonial" onclick="deleteItem('testimonials', '${t.id}', 'testimonial')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add button for new testimonial
    const addTestimonialButton = document.createElement('button');
    addTestimonialButton.id = 'add-testimonial-btn';
    addTestimonialButton.className = 'mt-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold py-2 px-4 rounded-full shadow-md hover:from-primary-600 hover:to-primary-700 transition flex items-center gap-2 mx-auto block';
    addTestimonialButton.innerHTML = '<i class="fas fa-plus"></i> Add New Testimonial';
    addTestimonialButton.onclick = () => openTestimonialModal();
    container.appendChild(addTestimonialButton);
}

async function handleReviewReply(e) {
    const { locationId, reviewId, userId } = e.currentTarget.dataset;
    const user = allUsers[userId];
    if (!user) return Swal.fire('Error', 'User not found for this review.', 'error');
    
    const { value: replyText } = await Swal.fire({
        title: `Reply to Review from ${user.name}`,
        input: 'textarea',
        inputPlaceholder: 'Type your reply here...',
        showCancelButton: true,
        confirmButtonText: 'Send Reply',
        customClass: {
            popup: 'swal2-popup-custom-width' // Custom class for responsiveness
        }
    });

    if (replyText) {
        try {
            // Ensure auth.currentUser.uid is available (admin must be logged in)
            const adminId = auth.currentUser ? auth.currentUser.uid : 'admin_default_id'; 
            const adminName = auth.currentUser ? (allUsers[adminId]?.name || 'Admin') : 'Admin'; // Get admin name if available

            const replyRef = db.ref(`storageLocations/${locationId}/reviews/${reviewId}/replies`).push();
            await replyRef.set({
                userId: adminId,
                name: adminName,
                text: replyText,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            Swal.fire('Success', 'Reply sent successfully!', 'success');
        } catch (error) {
            Swal.fire('Error', 'Failed to send reply.', 'error');
        }
    }
}

async function openTestimonialModal(testimonialId = null) {
    let testimonial = {};
    if (testimonialId) {
        const snapshot = await db.ref(`testimonials/${testimonialId}`).once('value');
        testimonial = snapshot.val() || {};
        // console.log("Editing testimonial:", testimonial); // Debug
    }
    const isEdit = !!testimonialId;

    Swal.fire({
        title: isEdit ? 'Edit Testimonial' : 'Add New Testimonial',
        html: `
            <input id="swal-testimonial-author" class="swal2-input" placeholder="Author Name" value="${testimonial.author || ''}">
            <input id="swal-testimonial-location" class="swal2-input" placeholder="Location (Optional)" value="${testimonial.location || ''}">
            <textarea id="swal-testimonial-text" class="swal2-textarea" placeholder="Testimonial Text">${testimonial.text || ''}</textarea>
            <label class="block text-sm font-medium text-gray-700 mt-2">Visibility</label>
            <select id="swal-testimonial-visible" class="swal2-input">
                <option value="true" ${testimonial.visible !== false ? 'selected' : ''}>Visible</option>
                <option value="false" ${testimonial.visible === false ? 'selected' : ''}>Hidden</option>
            </select>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save',
        customClass: {
            popup: 'swal2-popup-custom-width' // Custom class for responsiveness
        },
        preConfirm: () => {
            const author = document.getElementById('swal-testimonial-author').value;
            const location = document.getElementById('swal-testimonial-location').value;
            const text = document.getElementById('swal-testimonial-text').value;
            const visible = document.getElementById('swal-testimonial-visible').value === 'true';

            if (!author || !text) {
                Swal.showValidationMessage('Author and text are required.');
                return false;
            }
            return { author, location, text, visible };
        }
    }).then(result => {
        if (result.isConfirmed) {
            const data = result.value;
            const ref = testimonialId ? db.ref(`testimonials/${testimonialId}`) : db.ref('testimonials').push();
            ref.set(data)
                .then(() => Swal.fire('Success', 'Testimonial saved!', 'success'))
                .catch(err => Swal.fire('Error', err.message, 'error'));
        }
    });
}

function toggleTestimonialVisibility(testimonialId, currentVisibility) {
    Swal.fire({
        title: `Change visibility for this testimonial?`,
        text: `It will be set to ${!currentVisibility ? 'Visible' : 'Hidden'}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, change it!'
    }).then(result => {
        if (result.isConfirmed) {
            db.ref(`testimonials/${testimonialId}/visible`).set(!currentVisibility)
                .then(() => Swal.fire('Success', 'Testimonial visibility changed.', 'success'))
                .catch(err => Swal.fire('Error', err.message, 'error'));
        }
    });
}
