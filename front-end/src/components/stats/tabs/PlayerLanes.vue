<script setup>
import { defineProps, computed } from 'vue';
import { getWinRateClass, getWinRateBarClass, getKDAClass } from '../../../utils/styleUtils';
import { calculateKDA } from '../../../utils/calculators';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  }
});

// Fonction pour récupérer l'icône de la lane
const getLaneIcon = (lane) => {
  if (!lane) return '';
  const extension = lane === 'adc' ? 'png' : 'webp';
  try {
    return new URL(`../../../assets/${lane}.${extension}`, import.meta.url).href;
  } catch (error) {
    console.warn(`Icon not found for lane: ${lane}`);
    return '';
  }
};

// Computed property pour trier les lanes
const sortedLanes = computed(() => {
  if (!props.playerStats || !props.playerStats.statsByLane) return [];
  
  return Object.entries(props.playerStats.statsByLane)
    .sort((a, b) => b[1].gamesPlayed - a[1].gamesPlayed);
});
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Performance par lane</h3>
      
      <div v-if="sortedLanes.length > 0" class="space-y-4">
        <div v-for="[lane, stats] in sortedLanes" :key="lane" class="bg-white p-4 rounded shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <img :src="getLaneIcon(lane)" :alt="lane" class="w-8 h-8">
            <h4 class="text-lg font-medium text-gray-800 capitalize">{{ lane }}</h4>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gray-50 p-3 rounded">
              <p class="text-sm text-gray-600">Parties jouées</p>
              <p class="font-bold text-xl">{{ stats.gamesPlayed }}</p>
              <p class="text-xs text-gray-500">
                {{ ((stats.gamesPlayed / playerStats.gamesPlayed) * 100).toFixed(1) }}% du total
              </p>
            </div>
            
            <div class="bg-gray-50 p-3 rounded">
              <p class="text-sm text-gray-600">Win Rate</p>
              <p :class="getWinRateClass(stats.winRate)" class="font-bold text-xl">
                {{ (stats.winRate * 100).toFixed(1) }}%
              </p>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  :class="getWinRateBarClass(stats.winRate)" 
                  class="h-2 rounded-full"
                  :style="{width: `${Math.min(100, stats.winRate * 100)}%`}"
                ></div>
              </div>
            </div>
            
            <div class="bg-gray-50 p-3 rounded">
              <p class="text-sm text-gray-600">KDA</p>
              <div class="text-sm">
                <span class="font-medium">{{ stats.kills || 0 }}</span>
                <span class="text-gray-500">/</span>
                <span class="font-medium">{{ stats.deaths || 0 }}</span>
                <span class="text-gray-500">/</span>
                <span class="font-medium">{{ stats.assists || 0 }}</span>
              </div>
              <p :class="getKDAClass(calculateKDA(stats.kills, stats.deaths, stats.assists))" class="font-bold">
                {{ calculateKDA(stats.kills, stats.deaths, stats.assists) }} KDA
              </p>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-gray-500 text-sm">Aucune statistique par lane disponible</p>
    </div>
  </div>
</template>