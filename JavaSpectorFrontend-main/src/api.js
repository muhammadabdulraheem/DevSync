import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default api;
