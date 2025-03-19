<script setup>
import { defineProps, computed } from 'vue';
import { getWinRateClass, getWinRateBarClass, getKDAClass } from '../../../utils/styleUtils';
import { formatChampionDisplayName, getChampionImageUrl } from '../../../utils/formatters';
import { calculateKDA } from '../../../utils/calculators';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  }
});

// Computed properties pour les champions
const mostPlayedChampions = computed(() => {
  if (!props.playerStats || !props.playerStats.statsByChampion) return [];
  
  return Object.entries(props.playerStats.statsByChampion)
    .sort((a, b) => b[1].gamesPlayed - a[1].gamesPlayed)
    .slice(0, 3); // Top 3
});

const bestWinrateChampions = computed(() => {
  if (!props.playerStats || !props.playerStats.statsByChampion) return [];
  
  return Object.entries(props.playerStats.statsByChampion)
    .filter(([_, stats]) => stats.gamesPlayed >= 3) // Au moins 3 parties pour être significatif
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 3); // Top 3
});

// Traitement de l'erreur d'image
const handleImageError = (event) => {
  // Fallback optional
};
</script>

<template>
  <div class="space-y-6">
    <!-- Statistiques globales -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Statistiques Globales</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-3 rounded shadow-sm">
          <p class="text-sm text-gray-600">Parties jouées</p>
          <p class="font-bold text-2xl text-gray-800">{{ playerStats.gamesPlayed || 0 }}</p>
        </div>
        
        <div class="bg-white p-3 rounded shadow-sm">
          <p class="text-sm text-gray-600">Win Rate</p>
          <div class="flex items-center">
            <span :class="getWinRateClass(playerStats.winRate)" class="font-bold text-2xl mr-2">
              {{ (playerStats.winRate * 100).toFixed(1) }}%
            </span>
            <span class="text-sm text-gray-500">
              ({{ Math.round(playerStats.winRate * playerStats.gamesPlayed) }}W {{ playerStats.gamesPlayed - Math.round(playerStats.winRate * playerStats.gamesPlayed) }}L)
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              :class="getWinRateBarClass(playerStats.winRate)" 
              class="h-2 rounded-full"
              :style="{width: `${Math.min(100, playerStats.winRate * 100)}%`}"
            ></div>
          </div>
        </div>
        
        <div class="bg-white p-3 rounded shadow-sm">
          <p class="text-sm text-gray-600">KDA Global</p>
          <div class="flex items-center gap-1 mt-1">
            <span class="font-medium">{{ playerStats.totalKills || 0 }}</span>
            <span class="text-gray-500">/</span>
            <span class="font-medium">{{ playerStats.totalDeaths || 0 }}</span>
            <span class="text-gray-500">/</span>
            <span class="font-medium">{{ playerStats.totalAssists || 0 }}</span>
            <span class="ml-2 text-sm" :class="getKDAClass(calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0))">
              ({{ calculateKDA(playerStats.totalKills || 0, playerStats.totalDeaths || 0, playerStats.totalAssists || 0) }})
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Champions les plus joués -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Champions les plus joués</h3>
      
      <div v-if="mostPlayedChampions.length > 0" class="space-y-3">
        <div v-for="[champion, stats] in mostPlayedChampions" :key="champion" class="bg-white p-3 rounded shadow-sm flex items-center">
          <img 
            :src="getChampionImageUrl(champion)" 
            :alt="formatChampionDisplayName(champion)" 
            class="w-12 h-12 rounded-lg object-cover mr-4"
            @error="handleImageError"
          >
          <div class="flex-grow">
            <div class="flex justify-between">
              <span class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</span>
              <span :class="getWinRateClass(stats.winRate)">
                {{ (stats.winRate * 100).toFixed(1) }}% WR
              </span>
            </div>
            <div class="text-sm text-gray-600">
              {{ stats.gamesPlayed }} parties | 
              <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))">
                {{ stats.kills }}/{{ stats.deaths }}/{{ stats.assists }} ({{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA)
              </span>
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
      <p v-else class="text-gray-500 text-sm">Aucun champion joué</p>
    </div>
    
    <!-- Meilleurs Win Rates -->
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Meilleurs Win Rates (min. 3 parties)</h3>
      
      <div v-if="bestWinrateChampions.length > 0" class="space-y-3">
        <div v-for="[champion, stats] in bestWinrateChampions" :key="champion" class="bg-white p-3 rounded shadow-sm flex items-center">
          <img 
            :src="getChampionImageUrl(champion)" 
            :alt="formatChampionDisplayName(champion)" 
            class="w-12 h-12 rounded-lg object-cover mr-4"
            @error="handleImageError"
          >
          <div class="flex-grow">
            <div class="flex justify-between">
              <span class="font-semibold text-gray-800">{{ formatChampionDisplayName(champion) }}</span>
              <span :class="getWinRateClass(stats.winRate)" class="font-bold">
                {{ (stats.winRate * 100).toFixed(1) }}% WR
              </span>
            </div>
            <div class="text-sm text-gray-600">
              {{ stats.gamesPlayed }} parties | 
              <span :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))">
                {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA
              </span>
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
      <p v-else class="text-gray-500 text-sm">Aucun champion avec au moins 3 parties</p>
    </div>
  </div>
</template>