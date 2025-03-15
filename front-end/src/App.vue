<template>
  <header class="bg-gray-900 text-white shadow-md">
    <div class="max-w-6xl mx-auto flex justify-between items-center p-4">
      <h1 class="text-2xl font-bold text-blue-400">EgoMeter</h1>
      
      <nav class="flex gap-4">
        <router-link 
          to="/" 
          class="nav-link"
          active-class="bg-blue-500"
        >
          🏆 Ajouter une game
        </router-link>
        <router-link 
          to="/stats" 
          class="nav-link"
          active-class="bg-green-500"
        >
          📊 Voir les stats
        </router-link>
        <router-link 
          to="/history" 
          class="nav-link"
          active-class="bg-yellow-500"
        >
          📜 Historique
        </router-link>
        <router-link 
          to="/teamcreation" 
          class="nav-link"
          active-class="bg-purple-500"
        >
          🎮 Team Creation
        </router-link>
      </nav>
    </div>
  </header>

  <main class="p-6 max-w-6xl mx-auto">
    <router-view />
  </main>
</template>

<style scoped>
.nav-link {
  text-decoration: none;
  color: white;
  font-weight: bold;
  padding: 10px 14px;
  border-radius: 6px;
  transition: background 0.3s ease-in-out;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
