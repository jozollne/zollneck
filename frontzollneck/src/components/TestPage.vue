<template>
    <div class="" style="height: 200vh;">
        <Button @click="scrollTo('about')"></Button>
        Testseite :)
        <Image src="/liegen.jpg" width="600" preview class="hidden xl:block"></Image>
    </div>
    <div id="about" class="flex align-items-center justify-content-center">
        about
        <Image src="/liegen.jpg" width="600" preview class="hidden xl:block"></Image>
    </div>
</template>

<script setup lang="ts">
const scrollTo = (id: string) => {
    const scrollTo = document.getElementById(id);
    if (scrollTo) {
        scrollTo.scrollIntoView({ behavior: 'smooth' });
    }
};
</script>
