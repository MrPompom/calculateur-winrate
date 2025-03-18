<script setup>
import { ref } from 'vue';
import TournamentConfigManager from './tournament/TournamentConfigManager.vue';
import ManualGameFetch from './tournament/ManualGameFetch.vue';
import { useToast } from 'vue-toastification';

const activeTab = ref('configuration');
const toast = useToast();
</script>

<template>
  <div class="max-w-6xl mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">
        Administration des tournois
      </h1>
      <div class="text-sm text-gray-600">
        <span class="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Environnement de test</span>
      </div>
    </div>

    <!-- Navigation par onglets -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex flex-wrap -mb-px">
        <button 
          @click="activeTab = 'configuration'" 
          class="py-2 px-4 text-center border-b-2 font-medium text-sm"
          :class="activeTab === 'configuration' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        >
          Configurations de tournoi
        </button>
        <button 
          @click="activeTab = 'games'" 
          class="py-2 px-4 text-center border-b-2 font-medium text-sm"
          :class="activeTab === 'games' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        >
          Parties de tournoi
        </button>
        <button 
          @click="activeTab = 'manual'" 
          class="py-2 px-4 text-center border-b-2 font-medium text-sm"
          :class="activeTab === 'manual' 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        >
          Récupération manuelle
        </button>
      </nav>
    </div>

    <!-- Contenu des onglets -->
    <div class="tab-content">
      <!-- Onglet Configurations -->
      <div v-if="activeTab === 'configuration'" class="bg-white rounded-lg shadow-md p-1">
        <TournamentConfigManager />
      </div>

      <!-- Onglet Parties de tournoi -->
      <div v-else-if="activeTab === 'games'" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Parties de tournoi</h2>
        <p class="text-gray-600">
          Cette section affichera la liste des parties de tournoi enregistrées.
        </p>
        
        <!-- Ici vous pourriez intégrer votre composant d'historique filtré pour les tournois -->
        <div class="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
          <p class="flex items-center text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            Pour voir les parties de tournoi, rendez-vous sur la page d'historique et sélectionnez "Parties de tournoi".
          </p>
        </div>
      </div>

      <!-- Onglet Récupération manuelle -->
      <div v-else-if="activeTab === 'manual'" class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Récupération manuelle de partie</h2>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <p class="flex items-center text-yellow-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            Utilisez cette fonctionnalité uniquement si le webhook ne récupère pas automatiquement les résultats de la partie.
          </p>
        </div>
        
        <!-- Formulaire de récupération manuelle -->
        <ManualGameFetch />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-content {
  min-height: 400px;
}
</style>