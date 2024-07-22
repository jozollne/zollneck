import { defineStore } from 'pinia';
import router from '@/router';
import { useAuthStore } from './AuthStore';

export const useFunctionsStore = defineStore('functions', {
    state: () => ({
        oldRoute: '',
    }),
    actions: {
        goToHome() {
            router.push({ name: 'home' });
        },

        goToTest() {
            router.push({ name: 'test' });
        },

        goToAuth() {
            router.push({ name: 'auth' });
        },
        goToFileConvertor() {
            router.push({ name: 'fileConvertor' });
        },

        goToYoutubeVideo() {
            router.push({ name: 'youtubeVideo' });
        },
        logOut() {
            const authStore = useAuthStore();
            authStore.clearUserData();
            router.push({ name: 'home' });
        },
        goToDownload() {
            router.push({ name: 'download' });
        }
    }
});
