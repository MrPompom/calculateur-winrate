<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const toast = useToast();

const gameId = ref('');
const tournamentCode = ref('');
const platformId = ref('EUW1');
const isFetching = ref(false);

const platforms = [
  { value: 'EUW1', label: 'Europe Ouest (EUW)' },
  { value: 'EUNE1', label: 'Europe Nord & Est (EUNE)' },
  { value: 'NA1', label: 'Amérique du Nord (NA)' },
  { value: 'KR', label: 'Corée (KR)' },
  { value: 'BR1', label: 'Brésil (BR)' },
  { value: 'LA1', label: 'Amérique Latine Nord (LAN)' },
  { value: 'LA2', label: 'Amérique Latine Sud (LAS)' },
  { value: 'OC1', label: 'Océanie (OCE)' },
  { value: 'TR1', label: 'Turquie (TR)' },
  { value: 'JP1', label: 'Japon (JP)' },
  { value: 'RU', label: 'Russie (RU)' }
];

// Récupérer manuellement une partie de tournoi
const fetchTournamentGame = async () => {
  if (!gameId.value) {
    toast.warning("Veuillez saisir un ID de match");
    return;
  }
  
  isFetching.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/tournament/fetch-game`, {
      gameId: gameId.value,
      tournamentCode: tournamentCode.value,
      platformId: platformId.value
    });
    
    if (response.data.success) {
      toast.success("Partie récupérée avec succès");
      
      // Réinitialiser le formulaire
      gameId.value = '';
      tournamentCode.value = '';
    } else {
      toast.error(response.data.message || "Échec de la récupération de la partie");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de la partie:", error);
    toast.error(`Erreur: ${error.response?.data?.message || error.message}`);
  } finally {
    isFetching.value = false;
  }
};
</script>

<template>
  <div class="manual-game-fetch">
    <form @submit.prevent="fetchTournamentGame" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="gameId" class="block text-sm font-medium text-gray-700 mb-1">ID de la partie *</label>
          <input 
            id="gameId"
            v-model="gameId" 
            type="text" 
            required
            placeholder="ID de la partie (ex: 6789012345)" 
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">ID numérique de la partie (visible dans l'URL du match)</p>
        </div>
        
        <div>
          <label for="tournamentCode" class="block text-sm font-medium text-gray-700 mb-1">Code de tournoi (optionnel)</label>
          <input 
            id="tournamentCode"
            v-model="tournamentCode" 
            type="text" 
            placeholder="Code de tournoi utilisé" 
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">Code qui a été utilisé pour créer la partie</p>
        </div>
      </div>
      
      <div>
        <label for="platformId" class="block text-sm font-medium text-gray-700 mb-1">Plateforme *</label>
        <select 
          id="platformId"
          v-model="platformId" 
          required
          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option v-for="platform in platforms" :key="platform.value" :value="platform.value">
            {{ platform.label }}
          </option>
        </select>
        <p class="text-xs text-gray-500 mt-1">Serveur sur lequel la partie a été jouée</p>
      </div>
      
      <div class="flex items-center space-x-4 pt-2">
        <button 
          type="submit"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isFetching || !gameId"
        >
          <span v-if="isFetching" class="inline-block animate-spin mr-1">⟳</span>
          Récupérer la partie
        </button>
        
        <button 
          type="button"
          @click="gameId = ''; tournamentCode = ''"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Effacer
        </button>
      </div>
    </form>
    
    <div class="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 class="text-lg font-medium text-gray-800 mb-2">Comment trouver l'ID de partie ?</h3>
      <ul class="list-disc pl-5 space-y-2 text-gray-600">
        <li>Ouvrez le client League of Legends et accédez à l'historique des parties</li>
        <li>Trouvez la partie de tournoi que vous souhaitez récupérer</li>
        <li>Cliquez sur le bouton "Voir détails"</li>
        <li>Regardez l'URL dans votre navigateur, elle devrait contenir un numéro de partie (exemple: <code>https://matchhistory.euw.leagueoflegends.com/match-details/EUW1/<strong>6789012345</strong>?gameHash=abc123</code>)</li>
        <li>Le numéro est l'ID de partie à utiliser</li>
      </ul>
      
      <p class="mt-4 text-sm text-gray-500">Note: Pour les parties récentes, vous pouvez également utiliser des outils tiers comme op.gg, u.gg ou porofessor.gg pour trouver l'ID de partie.</p>
    </div>
  </div>
</template>