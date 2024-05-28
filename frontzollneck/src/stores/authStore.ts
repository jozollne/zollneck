import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        isAuthenticated: localStorage.getItem('userToken') !== null,
    }),
    actions: {
        async registerUser(email: string, password: string, username: string, firstName: string, lastName: string) {
            try {
                await axios.post('https://zollneck.de/api/auth/create', {
                    email, password, username, firstName, lastName
                });
            } catch (error) {
                // Fehlerbehandlung, falls die Anfrage fehlschlägt oder die Serverantwort einen Fehler anzeigt
                console.error('Fehler bei der Registrierung:', error);
                throw error; // Oder eine benutzerfreundliche Fehlermeldung anzeigen
            }
        },
        
        async setUserToken(email: string, password: string) {
            try {
                const response = await axios.post('https://zollneck.de/api/auth/login', { email, password });
                if (response.data.token) {
                    this.isAuthenticated = true;
                    localStorage.setItem('userToken', response.data.token);
                    localStorage.setItem('userAccount', response.data.username);
                }
            } catch (error) {
                this.isAuthenticated = false;
                throw error;
            }
        },
        clearUserData() {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userAccount');
            this.isAuthenticated = false;
        },
        async checkUserToken() {
            try {
                await axios.get('https://zollneck.de/api/auth/check-token', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    }
                });
                this.isAuthenticated = true;
                return true;
            } catch {
                this.clearUserData();
                return false;
            }
        }
    },
});
