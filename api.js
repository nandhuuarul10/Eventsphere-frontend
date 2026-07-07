const API_BASE = "https://backend-repository-ak74.onrender.com/";

async function apiRequest(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
        return;
    }
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "An error occurred");
    }
    
    const contentType = response.headers.get("content-type");
    return contentType && contentType.includes("application/json") ? response.json() : response.text();
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function showToast(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
