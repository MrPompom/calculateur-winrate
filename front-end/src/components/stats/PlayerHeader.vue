<script setup>
import { defineProps, defineEmits } from 'vue';
import { getWinRateClass } from '../../utils/styleUtils';

const props = defineProps({
  playerStats: {
    type: Object,
    required: true
  },
  selectedPlayer: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['edit']);
</script>

<template>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-800">{{ playerStats.name }}</h2>
      <!-- Afficher le Riot ID s'il existe -->
      <p v-if="selectedPlayer.riotId" class="text-sm text-gray-500">
        Riot ID: {{ selectedPlayer.riotId }}{{ selectedPlayer.riotTag ? `#${selectedPlayer.riotTag}` : '' }}
        <span v-if="selectedPlayer.region" class="text-xs text-gray-400 ml-1">({{ selectedPlayer.region }})</span>
      </p>
    </div>
    
    <div class="flex items-center gap-3">
      <span class="text-sm mr-2">Global WR:</span>
      <span :class="getWinRateClass(playerStats.winRate)" class="text-xl">
        {{ (playerStats.winRate * 100).toFixed(1) }}%
      </span>
      
      <!-- Bouton d'édition -->
      <button 
        @click="$emit('edit')" 
        class="ml-2 p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition"
        title="Modifier le joueur"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  </div>
</template>