import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        isAuthenticated: localStorage.getItem('userToken') !== null,
        userRoles: JSON.parse(localStorage.getItem('userRoles') ?? '[]') as string[],
        username: localStorage.getItem('username') ?? '',
    }),
    actions: {
        async registerUser(email: string, password: string, username: string, firstName: string, lastName: string, why: string) {
            try {
                await axios.post('https://zollneck.de/api/auth/create', {
                    email, password, username, firstName, lastName, why
                });
            } catch (error) {
                console.error('Fehler bei der Registrierung:', error);
                throw error;
            }
        },
        
        async setUserToken(email: string, password: string) {
            try {
                const response = await axios.post('https://zollneck.de/api/auth/login', { email, password });
                if (response.data.token) {
                    this.isAuthenticated = true;
                    localStorage.setItem('userToken', response.data.token);

                    const payload = JSON.parse(atob(response.data.token.split('.')[1]));
                    this.userRoles = payload.roles;
                    localStorage.setItem('userRoles', JSON.stringify(payload.roles));

                    this.username = payload.username;
                    localStorage.setItem('username', payload.username);
                }
            } catch (error) {
                this.isAuthenticated = false;
                throw error;
            }
        },

        clearUserData() {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userRoles');
            localStorage.removeItem('username');
            this.isAuthenticated = false;
            this.userRoles = [];
            this.username = '';
        },

        async checkUserToken() {
            const token = localStorage.getItem('userToken');
            if (!token) {
                this.clearUserData();
                return false;
            }
            try {
                await axios.get('https://zollneck.de/api/auth/check-token', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                this.isAuthenticated = true;

                const payload = JSON.parse(atob(token.split('.')[1]));
                this.userRoles = payload.roles;
                localStorage.setItem('userRoles', JSON.stringify(payload.roles));

                this.username = payload.username; 
                localStorage.setItem('username', payload.username);

                return true;
            } catch {
                this.clearUserData();
                return false;
            }
        }
    },
});
