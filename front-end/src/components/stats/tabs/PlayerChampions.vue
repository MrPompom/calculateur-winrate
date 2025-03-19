<script setup>
import { defineProps, ref, computed } from 'vue';
import { getWinRateClass, getWinRateBarClass, getKDAClass } from '../../../utils/styleUtils';
import { formatChampionDisplayName, getChampionImageUrl } from '../../../utils/formatters';
import { calculateKDA } from '../../../utils/calculators';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  }
});

// État local pour le filtre de recherche
const championsFilter = ref("");

// Computed property pour filtrer les champions
const filteredChampions = computed(() => {
  if (!props.playerStats || !props.playerStats.statsByChampion) return {};
  
  if (!championsFilter.value) return props.playerStats.statsByChampion;
  
  const filter = championsFilter.value.toLowerCase();
  return Object.fromEntries(
    Object.entries(props.playerStats.statsByChampion).filter(([champ]) => 
      formatChampionDisplayName(champ).toLowerCase().includes(filter)
    )
  );
});

// Computed property pour trier les champions
const sortedChampions = computed(() => {
  if (!filteredChampions.value) return [];
  
  return Object.entries(filteredChampions.value).sort((a, b) => {
    // Trier par nombre de parties décroissant par défaut
    return b[1].gamesPlayed - a[1].gamesPlayed;
  });
});

// Traitement de l'erreur d'image
const handleImageError = (event) => {
  // Fallback optional
};
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance par champion</h3>
      
      <!-- Recherche de champion -->
      <div class="mb-4">
        <input 
          v-model="championsFilter" 
          type="text" 
          placeholder="Rechercher un champion..." 
          class="w-full p-2 border rounded-md shadow-sm"
        />
      </div>
      
      <div v-if="sortedChampions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="[champion, stats] in sortedChampions" :key="champion" class="bg-white p-3 rounded shadow-sm">
          <div class="flex items-start gap-3">
            <img 
              :src="getChampionImageUrl(champion)" 
              :alt="formatChampionDisplayName(champion)" 
              class="w-12 h-12 rounded-lg object-cover" 
              @error="handleImageError"
            >
            <div class="flex-grow">
              <div class="flex justify-between items-start">
                <h4 class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</h4>
                <span class="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {{ stats.gamesPlayed }} parties
                </span>
              </div>
              
              <div class="mt-1 flex justify-between">
                <div>
                  <span class="text-xs text-gray-600">WR: </span>
                  <span :class="getWinRateClass(stats.winRate)" class="font-medium">
                    {{ (stats.winRate * 100).toFixed(1) }}%
                  </span>
                </div>
                <div>
                  <span class="text-xs text-gray-600">KDA: </span>
                  <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))" class="font-medium">
                    {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }}
                  </span>
                  <span class="text-xs text-gray-500 ml-1">
                    ({{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }})
                  </span>
                </div>
              </div>
              
              <div class="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  :class="getWinRateBarClass(stats.winRate)" 
                  class="h-1.5 rounded-full"
                  :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p v-else-if="Object.keys(playerStats.statsByChampion || {}).length === 0" class="text-gray-500 text-sm">
        Aucune statistique par champion disponible
      </p>
      <p v-else class="text-gray-500 text-sm">
        Aucun champion ne correspond à votre recherche.
      </p>
    </div>
  </div>
</template>