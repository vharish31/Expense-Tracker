import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const path = window.location.pathname;
        const url = error.config?.url || "";
        const msg = String(error.response?.data?.message || "").toLowerCase();
        const isPinOrPaymentError = msg.includes("pin") || url.includes("/payments") || url.includes("/set-pin");

        if (status === 401 && !path.includes("/login") && !path.includes("/register") && !isPinOrPaymentError) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default API;
