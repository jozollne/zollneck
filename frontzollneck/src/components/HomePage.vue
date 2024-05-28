<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();
const videoVisible = ref(false);
const videoSource = '/Chipi.mp4';
const buttonVisible = ref(true);

onMounted(async () => {
    await authStore.checkUserToken();
});

function showVideo() {
    buttonVisible.value = false;
    videoVisible.value = true;
}
</script>

<template>
    <div class="flex align-items-center justify-content-center" style="height: 82vh;">
        <Button v-if="buttonVisible" label=":)" @click="showVideo"></Button>
        <video v-if="videoVisible" autoplay loop class="zoomin animation-duration-500 w-full h-full">
            <source :src="videoSource" type="video/mp4">
            Ihr Browser unterstützt das Video-Tag nicht.
        </video>
    </div>
    <div class="flex align-items-center justify-content-center">

    </div>
</template>

<style scoped>
video::-webkit-media-controls {
    display: none !important;
}

video::-moz-video-controls {
    display: none !important;
}

video::state(ms-video-controls) {
    display: none !important;
}
</style>