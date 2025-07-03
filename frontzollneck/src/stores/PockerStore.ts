import { defineStore } from 'pinia';
import axios from 'axios';
import type { PockerEntry } from '@/components/Objects/PockerObject';

export const usePockerStore = defineStore('pocker', {
    state: () => ({
        entries: [] as PockerEntry[],
    }),
    actions: {
        async addDay(buyIn: number, payOut: number, dateJoin?: Date, dateLeave?: Date, location?: string) {
            const response = await axios.post(`https://zollneck.de/api/pocker/add-day`, {
                buyIn: buyIn,
                payOut: payOut,
                dateJoin: dateJoin,
                dateLeave: dateLeave,
                location: location
            });
            this.getAll();
            return response.data;
        },

        async getAll() {
            const response = await axios.get(`https://zollneck.de/api/pocker/get-all`);
            this.entries = response.data
            return;
        },
    }
});
