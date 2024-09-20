<template>
  <Toast position="bottom-center" />
  <Toast position="bottom-center" group="sessionExpired" @close="onClose">
            <template #message="slotProps">
                <div class="flex flex-column align-items-start" style="flex: 1">
                    <div class="flex align-items-center gap-2">
                        <span class="font-bold text-2xl">{{slotProps.message.summary}}</span>
                    </div>
                    <div class="text-base my-3 text-900">{{ slotProps.message.detail }}</div>
                    <Button class="p-button-sm" label="Neuladen" @click="onReload()"></Button>
                </div>
            </template>
        </Toast>

  <div class="app">
    <div class="fixed top-4 left-0 w-full z-5">
      <Header />
    </div>
    <div class="pt-7">
      <RouterView />
    </div>
    <div>
      <Divider />
      <Footer />
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '@/components/Overlay/Header.vue'
import Footer from '@/components/Overlay/Footer.vue'
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const toast = useToast();
const visible = ref(false);

const onClose = () => {
    visible.value = false;
}

const onReload = () => {
    location.reload();
    toast.removeGroup('sessionExpired');
    visible.value = false;
}

</script>
