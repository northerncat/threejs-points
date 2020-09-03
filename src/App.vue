<template>
  <v-app>
    <v-main>
      <Scene />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Scene from "./components/Scene.vue";

@Component({
  components: {
    Scene,
  },
})
export default class App extends Vue {}
</script>

<style scoped>
#app {
  width: 100%;
  height: 100%;
}
</style>
