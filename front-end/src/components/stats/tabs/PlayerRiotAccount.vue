<script setup>
import { defineProps, ref } from 'vue';
import { getWinRateClass, getWinRateBarClass, getKDAClass } from '../../../utils/styleUtils';
import { formatChampionDisplayName, getChampionImageUrl, formatMasteryPoints } from '../../../utils/formatters';
import { calculateMasteryPercentage } from '../../../utils/calculators';
import { syncPlayerWithRiot, getPlayerStats } from '../../../services/api_service';
import { useToast } from 'vue-toastification';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  }
});

const toast = useToast();
const isRiotSyncing = ref(false);

// Traitement de l'erreur d'image
const handleImageError = (event) => {
  // Fallback optional
};

// Fonction pour rafraîchir les données Riot
const refreshRiotData = async () => {
  const playerData = props.playerStats;
  if (!playerData || !playerData.riotId || isRiotSyncing.value) return;
  
  isRiotSyncing.value = true;
  try {
    // Afficher une notification toast pour indiquer la synchronisation
    const syncToast = toast.info("Synchronisation des données Riot en cours...", {
      timeout: false,
      closeButton: false
    });
    
    // Appeler l'API pour synchroniser les données
    const result = await syncPlayerWithRiot({ 
      id: playerData._id,
      name: playerData.name,
      riotId: playerData.riotId,
      riotTag: playerData.riotTag,
      region: playerData.region || "EUW" // Région par défaut si non définie
    });
    
    // Fermer la notification toast
    toast.dismiss(syncToast);
    
    if (result.success) {
      // Rafraîchir les données après synchronisation
      const updatedStats = await getPlayerStats(playerData.name);
      
      // Mettre à jour localement les données (événement custom pour mise à jour globale)
      Object.assign(props.playerStats, updatedStats);
      
      toast.success("Données Riot synchronisées avec succès!");
    } else {
      toast.error(result.message || "Échec de la synchronisation avec Riot Games");
    }
  } catch (error) {
    console.error("Erreur lors de la synchronisation Riot:", error);
    toast.error("Erreur lors de la synchronisation avec Riot Games");
  } finally {
    isRiotSyncing.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div v-if="playerStats.riotAccountId" class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Informations du compte Riot</h3>
      <button 
        @click="refreshRiotData"
        class="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition flex items-center gap-1 text-sm mb-4"
        :disabled="isRiotSyncing"
      >
        <svg v-if="isRiotSyncing" class="animate-spin h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{{ isRiotSyncing ? 'Synchronisation...' : 'Actualiser' }}</span>
      </button>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Basic Riot Account Info -->
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Compte</h4>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Riot ID:</span>
              <span class="font-medium">{{ playerStats.riotId }}#{{ playerStats.riotTag }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Région:</span>
              <span class="font-medium">{{ playerStats.region }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Niveau d'invocateur:</span>
              <span class="font-medium">{{ playerStats.summonerLevel }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Dernière synchronisation:</span>
              <span class="text-sm text-gray-500">{{ new Date(playerStats.lastSyncDate).toLocaleString() }}</span>
            </div>
          </div>
        </div>
        
        <!-- Ranked Info -->
        <div v-if="playerStats.soloRank" class="bg-white p-4 rounded shadow-sm">
          <h4 class="text-md font-medium text-gray-700 mb-3">Classement Solo/Duo</h4>
          <div class="flex items-center mb-3">
            <div class="p-2 rounded-lg bg-gradient-to-b" 
                :class="{
                  'from-gray-300 to-gray-500': playerStats.soloRank.tier === 'IRON',
                  'from-gray-300 to-gray-400': playerStats.soloRank.tier === 'SILVER',
                  'from-yellow-300 to-yellow-500': playerStats.soloRank.tier === 'GOLD',
                  'from-blue-300 to-blue-500': playerStats.soloRank.tier === 'PLATINUM',
                  'from-blue-200 to-blue-400': playerStats.soloRank.tier === 'DIAMOND',
                  'from-blue-300 via-purple-400 to-purple-500': playerStats.soloRank.tier === 'MASTER',
                  'from-purple-300 via-purple-500 to-purple-700': playerStats.soloRank.tier === 'GRANDMASTER',
                  'from-red-300 via-red-500 to-red-700': playerStats.soloRank.tier === 'CHALLENGER',
                }"
            >
              <div class="text-white font-bold text-xl px-3 py-1 text-center">
                {{ playerStats.soloRank.tier }} {{ playerStats.soloRank.rank }}
              </div>
            </div>
            <div class="ml-3">
              <div class="text-lg font-semibold">{{ playerStats.soloRank.leaguePoints }} LP</div>
              <div class="text-sm text-gray-600">
                {{ playerStats.soloRank.wins }}W {{ playerStats.soloRank.losses }}L
                <span class="ml-1 font-medium" 
                      :class="getWinRateClass(playerStats.soloRank.wins / (playerStats.soloRank.wins + playerStats.soloRank.losses))">
                  ({{ ((playerStats.soloRank.wins / (playerStats.soloRank.wins + playerStats.soloRank.losses)) * 100).toFixed(1) }}%)
                </span>
              </div>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" 
                :style="{width: `${Math.min(100, (playerStats.soloRank.leaguePoints / 100) * 100)}%`}">
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Top Champions by Mastery -->
    <div v-if="playerStats.topChampions && playerStats.topChampions.length > 0" class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Top 5 Champions par Maîtrise</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="champion in playerStats.topChampions" :key="champion.championId" class="bg-white p-3 rounded shadow-sm flex items-center">
          <img 
            :src="getChampionImageUrl(champion.championName)" 
            :alt="formatChampionDisplayName(champion.championName)" 
            class="w-12 h-12 rounded-lg object-cover mr-3"
            @error="handleImageError"
          >
          <div class="flex-grow">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion.championName) }}</div>
                <div class="text-xs text-gray-500">Dernière partie: {{ new Date(champion.lastPlayTime).toLocaleDateString() }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium">Niveau {{ champion.championLevel }}</div>
                <div class="text-xs text-gray-600">{{ formatMasteryPoints(champion.championPoints) }} points</div>
              </div>
            </div>
            <div class="w-full mt-1 bg-gray-200 rounded-full h-1.5">
              <div class="bg-purple-500 h-1.5 rounded-full" 
                  :style="{width: `${calculateMasteryPercentage(champion.championPoints)}%`}">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Ranked Champions Stats -->
    <div v-if="playerStats.rankedChampions && playerStats.rankedChampions.length > 0" class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Champions en Classé</h3>
      
      <div class="space-y-3">
        <div v-for="champion in playerStats.rankedChampions" :key="champion.championId" class="bg-white p-3 rounded shadow-sm flex items-center">
          <img 
            :src="getChampionImageUrl(champion.championName)" 
            :alt="formatChampionDisplayName(champion.championName)" 
            class="w-12 h-12 rounded-lg object-cover mr-4"
            @error="handleImageError"
          >
          <div class="flex-grow">
            <div class="flex justify-between">
              <span class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion.championName) }}</span>
              <span :class="getWinRateClass(champion.winRate)">
                {{ (champion.winRate * 100).toFixed(1) }}% WR
              </span>
            </div>
            <div class="text-sm">
              <span class="text-gray-600">{{ champion.games }} parties | </span>
              <span :class="getKDAClass(champion.kda)">
                {{ champion.kills }}/{{ champion.deaths }}/{{ champion.assists }} ({{ champion.kda.toFixed(2) }} KDA)
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                :class="getWinRateBarClass(champion.winRate)" 
                class="h-1.5 rounded-full"
                :style="{width: `${Math.min(100, champion.winRate * 100)}%`}"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="!playerStats.riotId" class="flex items-center justify-center h-64">
      <div class="text-center">
        <p class="text-gray-500 mb-3">Aucune information Riot disponible pour ce joueur.</p>
        <button 
          @click="$emit('edit')" 
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Lier un compte Riot
        </button>
      </div>
    </div>
  </div>
</template>