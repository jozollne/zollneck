<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

let key = ref('')

const secretMethod = async () => {
    const response = await axios.get("https://zollneck.de/api/auth/secret", {
        headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
    });
    key.value = response.data;
};
</script>

<template>
    <div class="flex flex-column align-items-center justify-content-center gap-3" style="min-height: 82vh">
        <div class="p-float-label">
            <InputText v-model="key" id="reward" required style="width: 400px;" />
            <label v-if="key != ''" for="reward">QUEST COMPLETE, HERE IS YOUR REWARD!</label>
        </div>
        <Button label="PRESS HERE TO FINISH QUEST AND CLAIM REWARD!" @click="secretMethod"></Button>
    </div>
</template>
