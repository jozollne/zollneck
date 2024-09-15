import { defineStore } from 'pinia';
import axios from 'axios';


export const useScreenshotStore = defineStore('upload', {
    state: () => ({
    }),
    actions: {
        async takeAndSaveScreenshot(url: string, format: string, width: number | undefined, height: number | undefined, watermarkText: string, username: string, password: string) {
            const response = await axios.post(`https://zollneck.de/api/screenshot/makeScreenshot`, {
                url: url,
                format: format,
                width: width,
                height: height,
                watermarkText: watermarkText,
                auth: {
                    username: username,
                    password: password,
                },
            },
            );
            return response.data.screenshotUrl;
        },
    }
});