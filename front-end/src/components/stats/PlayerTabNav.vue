<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  selectedTab: {
    type: String,
    required: true
  },
  playerStats: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['change-tab']);

const changeTab = (tab) => {
  emit('change-tab', tab);
};
</script>

<template>
  <div class="border-b border-gray-200 mb-6">
    <nav class="flex space-x-4 overflow-x-auto">
      <button 
        @click="changeTab('overview')" 
        class="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
        :class="selectedTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
      >
        Aperçu
      </button>
      
      <button 
        @click="changeTab('lanes')" 
        class="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
        :class="selectedTab === 'lanes' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
      >
        Lanes ({{ Object.keys(playerStats.statsByLane || {}).length || 0 }})
      </button>
      
      <button 
        @click="changeTab('champions')" 
        class="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
        :class="selectedTab === 'champions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
      >
        Champions ({{ Object.keys(playerStats.statsByChampion || {}).length || 0 }})
      </button>
      
      <button 
        @click="changeTab('trends')" 
        class="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
        :class="selectedTab === 'trends' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
      >
        Tendances
      </button>
      
      <button 
        v-if="playerStats.riotAccountId"
        @click="changeTab('riotAccount')" 
        class="px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
        :class="selectedTab === 'riotAccount' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'"
      >
        Compte Riot
      </button>
    </nav>
  </div>
</template>