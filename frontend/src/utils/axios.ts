import axios from "axios";

axios.defaults.baseURL = "http://localhost:8000";
const instance = axios.create();
instance.interceptors.request.use(function (config) {
  const token = localStorage.getItem("access_token");
  config.headers.Authorization = !!token ? `Bearer ${token}` : "";
  return config;
});

axios.interceptors.response.use((response) => {
    if (response.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
    }
    return response;
}, (error) => {
    console.log("Unexpected error", error);
    return Promise.reject(error);
});

export default instance;
