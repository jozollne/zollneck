<script setup lang="ts">
import RegisterPage from '../Auth/RegisterPage.vue';
import LoginPage from '../Auth/LoginPage.vue';

</script>

<template>
  <div class="flex flex-column md:flex-row" style="min-height: 90vh;">
    <div class="w-full md:w-5 flex flex-column align-items-center justify-content-center gap-3 py-5">
      <LoginPage></LoginPage>
    </div>
    <div class="w-full md:w-2">
        <Divider layout="vertical" class="hidden md:flex"></Divider>
        <Divider layout="horizontal" class="flex md:hidden"></Divider>
    </div>
    <div class="w-full md:w-5 flex align-items-center justify-content-center py-5">
        <RegisterPage></RegisterPage>
    </div>
  </div>
  <div class="text-300">
    Felder mit * sind erforderlich
  </div>
</template>

<style scoped></style>
