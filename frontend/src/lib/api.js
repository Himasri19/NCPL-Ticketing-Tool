import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Axios instance with credentials (httpOnly cookie)
export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export { BACKEND_URL };
