<template>
  <div class="flex align-items-center justify-content-center" style="height: 82vh;">
    <Button @click="downloadZip" label="Nordschleife Download"></Button>
  </div>
</template>

<script setup lang="ts">

const downloadZip = () => {
  const path = '/ks_nord_v20231124_v2.zip'; // Pfad zur ZIP-Datei im public-Verzeichnis
  const link = document.createElement('a');
  link.href = path;
  link.download = 'ks_nord_v20231124_v2.zip'; // Name der heruntergeladenen Datei
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>
