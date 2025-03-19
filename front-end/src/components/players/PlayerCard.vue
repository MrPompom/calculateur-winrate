<script setup>
import { defineProps, defineEmits } from 'vue';
import { getWinRateClass, getWinRateBarClass } from '../../utils/styleUtils';

const props = defineProps({
  player: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select']);
</script>

<template>
  <li 
    @click="$emit('select', player)"
    class="cursor-pointer p-3 rounded-md shadow-sm hover:bg-gray-100 transition flex justify-between items-center"
    :class="{'bg-blue-50 border-l-4 border-blue-500': isSelected}"
  >
    <div class="flex flex-col">
      <span class="text-gray-800 font-medium">{{ player.name }}</span>
      <span class="text-xs text-gray-500">{{ player.gamesPlayed || 0 }} games</span>
      <!-- Afficher le Riot ID s'il existe -->
      <span v-if="player.riotId" class="text-xs text-gray-400">
        {{ player.riotId }}{{ player.riotTag ? `#${player.riotTag}` : '' }}
      </span>
    </div>
    
    <div class="flex flex-col items-end">
      <span :class="getWinRateClass(player.winRate)">
        {{ (player.winRate * 100).toFixed(1) }}%
      </span>
      <div class="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
        <div 
          :class="getWinRateBarClass(player.winRate)" 
          class="h-1.5 rounded-full"
          :style="{width: `${Math.min(100, player.winRate * 100)}%`}"
        ></div>
      </div>
    </div>
  </li>
</template>