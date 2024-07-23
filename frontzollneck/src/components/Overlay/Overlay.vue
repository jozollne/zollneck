<template>
  <div class="app">
    <div class="fixed top-4 left-0 w-full z-5">
      <Header />
    </div>
    <div class="pt-7" style="min-height: 92vh;">
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
</script>
