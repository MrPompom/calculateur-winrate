<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <header class="bg-gray-900 text-white shadow-lg sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Desktop Navigation -->
        <div class="hidden md:flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
              EgoMeter
            </h1>
          </div>
          
          <nav class="flex items-center space-x-4">
            <router-link 
              to="/" 
              class="nav-link"
              :class="{ 'router-link-active-blue': $route.path === '/' }"
              exact
            >
              <span class="icon-wrapper bg-blue-500 hover:bg-blue-400">🏆</span>
              <span>Ajouter une game</span>
            </router-link>
            
            <router-link 
              to="/stats" 
              class="nav-link"
              :class="{ 'router-link-active-green': $route.path === '/stats' }"
            >
              <span class="icon-wrapper bg-green-500 hover:bg-green-400">📊</span>
              <span>Voir les stats</span>
            </router-link>
            
            <router-link 
              to="/history" 
              class="nav-link"
              :class="{ 'router-link-active-yellow': $route.path === '/history' }"
            >
              <span class="icon-wrapper bg-yellow-500 hover:bg-yellow-400">📜</span>
              <span>Historique</span>
            </router-link>
            
            <router-link 
              to="/teamcreation" 
              class="nav-link"
              :class="{ 'router-link-active-purple': $route.path === '/teamcreation' }"
            >
              <span class="icon-wrapper bg-purple-500 hover:bg-purple-400">🎮</span>
              <span>Créer Équipes</span>
            </router-link>
          </nav>
        </div>
        
        <!-- Mobile Navigation -->
        <div class="md:hidden">
          <div class="flex justify-between items-center h-14">
            <h1 class="text-xl font-bold text-blue-400">
              EgoMeter
            </h1>
            
            <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-white hover:text-blue-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div v-if="mobileMenuOpen" class="py-2 space-y-1">
              <router-link 
                to="/" 
                class="block text-white px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 flex items-center"
                :class="{ 'bg-blue-700': $route.path === '/' }"
                exact
                @click="mobileMenuOpen = false"
              >
                <span class="mr-3 text-lg">🏆</span>
                Ajouter une game
              </router-link>
              
              <router-link 
                to="/stats" 
                class="block text-white px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 flex items-center"
                :class="{ 'bg-green-700': $route.path === '/stats' }"
                @click="mobileMenuOpen = false"
              >
                <span class="mr-3 text-lg">📊</span>
                Voir les stats
              </router-link>
              
              <router-link 
                to="/history" 
                class="block text-white px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 flex items-center"
                :class="{ 'bg-yellow-700': $route.path === '/history' }"
                @click="mobileMenuOpen = false"
              >
                <span class="mr-3 text-lg">📜</span>
                Historique
              </router-link>
              
              <router-link 
                to="/teamcreation" 
                class="block text-white px-3 py-3 rounded-md text-base font-medium hover:bg-gray-800 flex items-center"
                :class="{ 'bg-purple-700': $route.path === '/teamcreation' }"
                @click="mobileMenuOpen = false"
              >
                <span class="mr-3 text-lg">🎮</span>
                Créer Équipes
              </router-link>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <main class="flex-grow p-4 sm:p-6">
      <div class="max-w-7xl mx-auto">
        <router-view v-slot="{ Component }">
          <transition 
            name="page" 
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
    
    <footer class="bg-gray-800 text-white text-center py-4 text-sm">
      <p>© {{ new Date().getFullYear() }} EgoMeter - Suivez vos statistiques de jeu</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const mobileMenuOpen = ref(false);
</script>

<style scoped>
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 9999px;
  margin-right: 0.5rem;
  transition: all 0.3s;
}

.router-link-active-blue {
  background-color: rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.router-link-active-green {
  background-color: rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.1);
}

.router-link-active-yellow {
  background-color: rgba(245, 158, 11, 0.2);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.1);
}

.router-link-active-purple {
  background-color: rgba(139, 92, 246, 0.2);
  box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.1);
}

/* Transitions de page */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>