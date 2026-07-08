// Check Token & Get Current User Metadata
const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "login.html";
}

const payload = parseJwt(token);
const currentUserEmail = payload ? payload.sub : "";
const currentUserRole = payload ? payload.role : "USER";
const currentUserId = payload ? payload.id : null;
const currentUsername = payload ? payload.username : "";

// Set Header user metadata
document.getElementById("currentUser").innerText = currentUsername || currentUserEmail;
document.getElementById("userRole").innerText = currentUserRole;

// Global tab switching state
let activeTab = "dashboard";

function switchTab(tab) {
    activeTab = tab;

    // Update nav classes
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
        if (link.innerText.toLowerCase().includes(tab)) {
            link.classList.add("active");
        }
    });

    // Hide all sections
    document.querySelectorAll(".tab-section").forEach(sec => sec.classList.add("hidden"));

    // Show selected section
    const titleMap = {
        dashboard: "Dashboard",
        sessions: "Sessions",
        speakers: "Speakers",
        attendees: "Attendees",
        profile: "My Profile"
    };

    document.getElementById("tabTitle").innerText = titleMap[tab];

    if (tab === "dashboard") {
        document.getElementById("dashboardSection").classList.remove("hidden");
        loadDashboardData();
    } else if (tab === "sessions") {
        document.getElementById("sessionsSection").classList.remove("hidden");
        loadSessions();
    } else if (tab === "speakers") {
        document.getElementById("speakersSection").classList.remove("hidden");
        loadSpeakers();
    } else if (tab === "attendees") {
        document.getElementById("attendeesSection").classList.remove("hidden");
        loadAttendees();
    } else if (tab === "profile") {
        document.getElementById("profileSection").classList.remove("hidden");
        loadProfile();
    }
}

// Open / Close Modals
function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

// ----------------- SESSIONS SECTION -----------------
let sessionsList = [];

function renderSessions(list) {
    const grid = document.getElementById("sessionsGrid");
    grid.innerHTML = "";

    list.forEach(s => {
        const card = document.createElement("div");
        card.className = "item-card glass";

        const timeStr = `${s.startTime || 'N/A'} - ${s.endTime || 'N/A'}`;
        const attendeesStr = s.attendees && s.attendees.length > 0
            ? s.attendees.map(a => a.fullName).join(", ")
            : "None";

        card.innerHTML = `
            <div>
                <div class="item-title">${s.sessionName}</div>
                <div class="item-details">
                    <strong>Topic:</strong> ${s.topic || 'General'}<br>
                    <strong>Day:</strong> ${s.dayOfWeek || 'TBD'}<br>
                    <strong>Time:</strong> ${timeStr}<br>
                    <strong>Room/Note:</strong> ${s.roomNote || 'N/A'}<br>
                    <strong>Speaker:</strong> ${s.speakerName || 'None'}<br>
                    <strong>Attendees:</strong> ${attendeesStr}
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-small btn-edit" onclick="editSession(${s.id})">Edit</button>
                ${currentUserRole === 'ADMIN'
                    ? `<button class="btn-small btn-delete" onclick="deleteSession(${s.id})">Delete</button>`
                    : ""}
            </div>
        `;
        grid.appendChild(card);
    });
}
async function loadSessions() {
    try {
        const [sessions, speakers] = await Promise.all([
            apiRequest("/api/sessions"),
            apiRequest("/api/speakers")
        ]);

        sessionsList = sessions;
        speakersList = speakers;

        document.getElementById("sessionsSearch").value = "";
        renderSessions(sessionsList);
    } catch (err) {
        showToast("Error loading sessions: " + err.message, "error");
    }
}

function filterSessions() {
    const query = document.getElementById("sessionsSearch").value.toLowerCase().trim();

    if (!query) {
        renderSessions(sessionsList);
        return;
    }

    const filtered = sessionsList.filter(s =>
        (s.sessionName && s.sessionName.toLowerCase().includes(query)) ||
        (s.topic && s.topic.toLowerCase().includes(query)) ||
        (s.roomNote && s.roomNote.toLowerCase().includes(query)) ||
        (s.dayOfWeek && s.dayOfWeek.toLowerCase().includes(query))
    );

    renderSessions(filtered);
}

function openSessionModal(session = null) {

    document.getElementById("sessionForm").reset();
    document.getElementById("sessionId").value = "";

    const select = document.getElementById("sessionSpeaker");

    select.innerHTML =
        '<option value="">Select Speaker (None)</option>' +
        (speakersList || [])
            .map(sp => `<option value="${sp.id}">${sp.name}</option>`)
            .join("");

    if (session) {

        document.getElementById("sessionModalTitle").innerText = "Edit Session";
        document.getElementById("sessionId").value = session.id;
        document.getElementById("sessionName").value = session.sessionName || "";
        document.getElementById("sessionTopic").value = session.topic || "";
        document.getElementById("sessionDay").value = session.dayOfWeek || "";
        document.getElementById("sessionStart").value = session.startTime || "";
        document.getElementById("sessionEnd").value = session.endTime || "";
        document.getElementById("sessionRoom").value = session.roomNote || "";
        select.value = session.speakerId || "";

    } else {

        document.getElementById("sessionModalTitle").innerText = "Add Session";

    }

    openModal("sessionModal");
}

function editSession(id) {
    const session = sessionsList.find(s => s.id === id);

    if (session) {
        openSessionModal(session);
    }
}
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("sessionId").value;

    const body = {
        sessionName: document.getElementById("sessionName").value,
        topic: document.getElementById("sessionTopic").value,
        dayOfWeek: document.getElementById("sessionDay").value,
        startTime: document.getElementById("sessionStart").value,
        endTime: document.getElementById("sessionEnd").value,
        roomNote: document.getElementById("sessionRoom").value,
        speakerId: document.getElementById("sessionSpeaker").value
            ? parseInt(document.getElementById("sessionSpeaker").value)
            : null
    };

    try {

        if (id) {

            // UPDATE SESSION
            await apiRequest(`/api/sessions/${id}`, "PUT", body);
            showToast("Session updated successfully!");

        } else {

            // ADD SESSION
            await apiRequest("/api/sessions", "POST", body);
            showToast("Session added successfully!");

        }

        closeModal("sessionModal");
        loadSessions();

    } catch (err) {
        showToast(err.message, "error");
    }
});

async function deleteSession(id) {

    if (!confirm("Are you sure you want to delete this session?")) return;

    try {

        await apiRequest(`/api/sessions/${id}`, "DELETE");

        showToast("Session deleted successfully!");

        loadSessions();

    } catch (err) {
        showToast(err.message, "error");
    }
}

// ----------------- SPEAKERS SECTION -----------------

let speakersList = [];

function renderSpeakers(list) {

    const grid = document.getElementById("speakersGrid");
    grid.innerHTML = "";

    list.forEach(sp => {

        const card = document.createElement("div");
        card.className = "item-card glass";

        card.innerHTML = `
            <div>
                <div class="item-title">${sp.name}</div>

                <div class="item-details">
                    <strong>Email:</strong> ${sp.email}<br>
                    <strong>Expertise:</strong> ${sp.expertise || 'TBD'}<br>
                    <strong>Bio:</strong> ${sp.bio || 'No bio provided'}<br>
                    <strong>Sessions:</strong>
                    ${sp.sessions && sp.sessions.length > 0
                        ? sp.sessions.map(s => s.sessionName).join(", ")
                        : "None"}
                </div>
            </div>

            <div class="item-actions">
                <button class="btn-small btn-edit"
                    onclick="editSpeaker(${sp.id})">
                    Edit
                </button>

                ${currentUserRole === "ADMIN"
                    ? `<button class="btn-small btn-delete"
                        onclick="deleteSpeaker(${sp.id})">
                        Delete
                       </button>`
                    : ""}
            </div>
        `;

        grid.appendChild(card);
    });

}
async function loadSpeakers() {
    try {
        speakersList = await apiRequest("/api/speakers");
        document.getElementById("speakersSearch").value = "";
        renderSpeakers(speakersList);
    } catch (err) {
        showToast("Error loading speakers: " + err.message, "error");
    }
}

function filterSpeakers() {
    const query = document.getElementById("speakersSearch").value.toLowerCase().trim();

    if (!query) {
        renderSpeakers(speakersList);
        return;
    }

    const filtered = speakersList.filter(sp =>
        (sp.name && sp.name.toLowerCase().includes(query)) ||
        (sp.email && sp.email.toLowerCase().includes(query)) ||
        (sp.expertise && sp.expertise.toLowerCase().includes(query)) ||
        (sp.bio && sp.bio.toLowerCase().includes(query))
    );

    renderSpeakers(filtered);
}

function openSpeakerModal(speaker = null) {

    document.getElementById("speakerForm").reset();
    document.getElementById("speakerId").value = "";

    if (speaker) {

        document.getElementById("speakerModalTitle").innerText = "Edit Speaker";
        document.getElementById("speakerId").value = speaker.id;
        document.getElementById("speakerName").value = speaker.name || "";
        document.getElementById("speakerEmail").value = speaker.email || "";
        document.getElementById("speakerExpertise").value = speaker.expertise || "";
        document.getElementById("speakerBio").value = speaker.bio || "";

    } else {

        document.getElementById("speakerModalTitle").innerText = "Add Speaker";

    }

    openModal("speakerModal");
}

function editSpeaker(id) {

    const speaker = speakersList.find(s => s.id === id);

    if (speaker) {
        openSpeakerModal(speaker);
    }
}

document.getElementById("speakerForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const id = document.getElementById("speakerId").value;

    const body = {
        name: document.getElementById("speakerName").value,
        email: document.getElementById("speakerEmail").value,
        expertise: document.getElementById("speakerExpertise").value,
        bio: document.getElementById("speakerBio").value
    };

    try {

        if (id) {

            // UPDATE SPEAKER
            await apiRequest(`/api/speakers/${id}`, "PUT", body);
            showToast("Speaker updated successfully!");

        } else {

            // ADD SPEAKER
            await apiRequest("/api/speakers", "POST", body);
            showToast("Speaker added successfully!");

        }

        closeModal("speakerModal");
        loadSpeakers();

    } catch (err) {
        showToast(err.message, "error");
    }
});

async function deleteSpeaker(id) {

    if (!confirm("Are you sure you want to delete this speaker?")) return;

    try {

        await apiRequest(`/api/speakers/${id}`, "DELETE");

        showToast("Speaker deleted successfully!");
        loadSpeakers();

    } catch (err) {
        showToast(err.message, "error");
    }
}
// ----------------- ATTENDEES SECTION -----------------

let attendeesList = [];

function renderAttendees(list) {

    const grid = document.getElementById("attendeesGrid");
    grid.innerHTML = "";

    list.forEach(a => {

        const card = document.createElement("div");
        card.className = "item-card glass";

        const badgeClass = `badge badge-${(a.registrationType || "GENERAL").toLowerCase()}`;
        const assocSession = sessionsList.find(s => s.id === a.sessionId);
        const sessionNameStr = assocSession ? assocSession.sessionName : "None";

        card.innerHTML = `
            <div>
                <div class="item-title">${a.fullName}</div>

                <div class="item-details">
                    <strong>Email:</strong> ${a.email}<br>
                    <strong>Session:</strong> ${sessionNameStr}<br>
                    <span class="${badgeClass}">
                        ${a.registrationType || "GENERAL"}
                    </span>
                </div>
            </div>

            <div class="item-actions">
                <button class="btn-small btn-edit"
                    onclick="editAttendee(${a.id})">
                    Edit
                </button>

                ${currentUserRole === "ADMIN"
                    ? `<button class="btn-small btn-delete"
                        onclick="deleteAttendee(${a.id})">
                        Delete
                       </button>`
                    : ""}
            </div>
        `;

        grid.appendChild(card);
    });
}

async function loadAttendees() {

    try {

        if (sessionsList.length === 0) {
            sessionsList = await apiRequest("/api/sessions");
        }

        attendeesList = await apiRequest("/api/attendees");

        document.getElementById("attendeesSearch").value = "";

        renderAttendees(attendeesList);

    } catch (err) {

        showToast("Error loading attendees: " + err.message, "error");

    }
}

function filterAttendees() {

    const query = document.getElementById("attendeesSearch").value
        .toLowerCase()
        .trim();

    if (!query) {
        renderAttendees(attendeesList);
        return;
    }

    const filtered = attendeesList.filter(a => {

        const assocSession = sessionsList.find(s => s.id === a.sessionId);
        const sessionNameStr = assocSession ? assocSession.sessionName : "";

        return (
            (a.fullName && a.fullName.toLowerCase().includes(query)) ||
            (a.email && a.email.toLowerCase().includes(query)) ||
            (a.registrationType &&
                a.registrationType.toLowerCase().includes(query)) ||
            sessionNameStr.toLowerCase().includes(query)
        );
    });

    renderAttendees(filtered);
}

function editAttendee(id) {

    const attendee = attendeesList.find(a => a.id === id);

    if (attendee) {
        openAttendeeModal(attendee);
    }
}function openAttendeeModal(attendee = null) {

    document.getElementById("attendeeForm").reset();
    document.getElementById("attendeeId").value = "";

    const sessionSelect = document.getElementById("attendeeSession");

    sessionSelect.innerHTML = '<option value="">No Session</option>';

    sessionsList.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.sessionName;
        sessionSelect.appendChild(opt);
    });

    if (attendee) {

        document.getElementById("attendeeModalTitle").innerText = "Edit Attendee";
        document.getElementById("attendeeId").value = attendee.id;
        document.getElementById("attendeeName").value = attendee.fullName || "";
        document.getElementById("attendeeEmail").value = attendee.email || "";
        document.getElementById("attendeeType").value = attendee.registrationType || "GENERAL";
        sessionSelect.value = attendee.sessionId || "";

    } else {

        document.getElementById("attendeeModalTitle").innerText = "Add Attendee";

    }

    openModal("attendeeModal");
}

document.getElementById("attendeeForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const id = document.getElementById("attendeeId").value;

    const body = {
        fullName: document.getElementById("attendeeName").value,
        email: document.getElementById("attendeeEmail").value,
        registrationType: document.getElementById("attendeeType").value,
        sessionId: document.getElementById("attendeeSession").value
            ? parseInt(document.getElementById("attendeeSession").value)
            : null
    };

    try {

        if (id) {

            // UPDATE ATTENDEE
            await apiRequest(`/api/attendees/${id}`, "PUT", body);
            showToast("Attendee updated successfully!");

        } else {

            // ADD ATTENDEE
            await apiRequest("/api/attendees", "POST", body);
            showToast("Attendee added successfully!");

        }

        closeModal("attendeeModal");
        loadAttendees();

    } catch (err) {
        showToast(err.message, "error");
    }
});

async function deleteAttendee(id) {

    if (!confirm("Are you sure you want to delete this attendee?")) return;

    try {

        await apiRequest(`/api/attendees/${id}`, "DELETE");

        showToast("Attendee deleted successfully!");

        loadAttendees();

    } catch (err) {

        showToast(err.message, "error");

    }
}
// ----------------- PROFILE SECTION -----------------

let cachedUserObject = null;

async function loadProfile() {

    try {

        let profileUser = null;

        if (currentUserRole === "ADMIN") {

            const allUsers = await apiRequest("/api/user");
            profileUser = allUsers.find(u => u.id == currentUserId);

        }

        if (!profileUser) {

            profileUser = {
                id: currentUserId,
                userName: currentUsername,
                email: currentUserEmail,
                role: currentUserRole
            };

        }

        cachedUserObject = profileUser;

        document.getElementById("profileUsername").value = profileUser.userName || "";
        document.getElementById("profileEmail").value = profileUser.email || "";
        document.getElementById("profilePassword").value = "";

    } catch (err) {

        showToast("Error loading profile: " + err.message, "error");

    }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const body = {
        userName: document.getElementById("profileUsername").value,
        email: document.getElementById("profileEmail").value,
        role: currentUserRole
    };

    const newPass = document.getElementById("profilePassword").value;

    if (newPass) {
        body.passWord = newPass;
    }

    try {

        await apiRequest(`/api/user/${currentUserId}`, "PUT", body);

        showToast("Profile updated successfully!");

        document.getElementById("currentUser").innerText = body.userName;

        if (body.email !== currentUserEmail) {

            showToast("Email changed. Please login again.", "success");

            setTimeout(() => {
                logout();
            }, 2000);

        }

    } catch (err) {

        showToast(err.message, "error");

    }
});

// ----------------- GLOBAL ACTIONS -----------------

function logout() {

    localStorage.removeItem("token");
    window.location.href = "login.html";

}

// ----------------- DASHBOARD SECTION -----------------

async function loadDashboardData() {

    try {

        const [sessions, speakers, attendees] = await Promise.all([

            apiRequest("/api/sessions"),
            apiRequest("/api/speakers"),
            apiRequest("/api/attendees")

        ]);

        sessionsList = sessions;
        speakersList = speakers;
        attendeesList = attendees;

        document.getElementById("totalSessions").innerText = sessionsList.length;
        document.getElementById("totalSpeakers").innerText = speakersList.length;
        document.getElementById("totalAttendees").innerText = attendeesList.length;

        document.getElementById("dashboardSearch").value = "";

        renderDashboardExplore();

    } catch (err) {

        showToast("Error loading dashboard data: " + err.message, "error");

    }
}
function renderDashboardExplore() {
    handleDashboardSearch();
}

function handleDashboardSearch() {

    const search = document.getElementById("dashboardSearch").value.toLowerCase().trim();

    const sessionContainer = document.getElementById("dashboardSessionsList");
    const speakerContainer = document.getElementById("dashboardSpeakersList");
    const attendeeContainer = document.getElementById("dashboardAttendeesList");

    sessionContainer.innerHTML = "";
    speakerContainer.innerHTML = "";
    attendeeContainer.innerHTML = "";

    const filteredSessions = sessionsList.filter(s =>
        !search ||
        (s.sessionName && s.sessionName.toLowerCase().includes(search)) ||
        (s.topic && s.topic.toLowerCase().includes(search))
    );

    const filteredSpeakers = speakersList.filter(s =>
        !search ||
        (s.name && s.name.toLowerCase().includes(search)) ||
        (s.email && s.email.toLowerCase().includes(search))
    );

    const filteredAttendees = attendeesList.filter(a =>
        !search ||
        (a.fullName && a.fullName.toLowerCase().includes(search)) ||
        (a.email && a.email.toLowerCase().includes(search))
    );

    document.getElementById("matchSessionsCount").innerText = filteredSessions.length;
    document.getElementById("matchSpeakersCount").innerText = filteredSpeakers.length;
    document.getElementById("matchAttendeesCount").innerText = filteredAttendees.length;

    filteredSessions.forEach(s => {
        sessionContainer.innerHTML += `
            <div class="search-item">
                <strong>${s.sessionName}</strong><br>
                ${s.topic || ""}
            </div>
        `;
    });

    filteredSpeakers.forEach(s => {
        speakerContainer.innerHTML += `
            <div class="search-item">
                <strong>${s.name}</strong><br>
                ${s.email}
            </div>
        `;
    });

    filteredAttendees.forEach(a => {
        attendeeContainer.innerHTML += `
            <div class="search-item">
                <strong>${a.fullName}</strong><br>
                ${a.email}
            </div>
        `;
    });
}

// Initial Loading
switchTab("dashboard");
