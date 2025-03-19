<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import PlayerCard from './PlayerCard.vue';

const props = defineProps({
  players: {
    type: Array,
    required: true
  },
  selectedPlayer: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  },
  sortOption: {
    type: String,
    default: 'winRate'
  },
  sortDirection: {
    type: String,
    default: 'desc'
  },
  isRecalculating: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select-player', 'search', 'change-sort', 'recalculate']);

const localSearchQuery = ref(props.searchQuery);

// Émettre l'événement search lorsque localSearchQuery change
watch(localSearchQuery, (newValue) => {
  emit('search', newValue);
});

// Handler pour la sélection d'un joueur
const handleSelectPlayer = (player) => {
  emit('select-player', player);
};
</script>

<template>
  <div class="w-full lg:w-1/3 bg-white p-4 rounded-lg shadow-md order-2 lg:order-1">
    <div class="flex flex-col h-full">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Liste des Joueurs</h2>
      
      <!-- Recherche et filtres -->
      <div class="mb-4">
        <input 
          v-model="localSearchQuery" 
          type="text" 
          placeholder="Rechercher un joueur..." 
          class="w-full p-2 border rounded-md shadow-sm"
        />
      </div>
      
      <!-- Options de tri -->
      <div class="flex justify-between text-sm text-gray-600 mb-2 px-2">
        <button @click="$emit('change-sort', 'name')" class="flex items-center hover:text-blue-600">
          Nom
          <span v-if="sortOption === 'name'" class="ml-1">
            {{ sortDirection === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button @click="$emit('change-sort', 'winRate')" class="flex items-center hover:text-blue-600">
          Win Rate
          <span v-if="sortOption === 'winRate'" class="ml-1">
            {{ sortDirection === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
        <button @click="$emit('change-sort', 'gamesPlayed')" class="flex items-center hover:text-blue-600">
          Games
          <span v-if="sortOption === 'gamesPlayed'" class="ml-1">
            {{ sortDirection === 'asc' ? '↑' : '↓' }}
          </span>
        </button>
      </div>
      
      <!-- Liste des joueurs avec état de chargement -->
      <div v-if="loading" class="flex-grow flex items-center justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
      
      <div v-else-if="errorMessage && players.length === 0" class="flex-grow flex items-center justify-center">
        <p class="text-red-500 text-center">{{ errorMessage }}</p>
      </div>
      
      <div v-else-if="players.length === 0 && searchQuery" class="flex-grow flex items-center justify-center">
        <p class="text-gray-500 text-center">Aucun joueur ne correspond à votre recherche.</p>
      </div>
      
      <div v-else class="flex-grow overflow-y-auto max-h-[calc(100vh-350px)] pr-1">
        <transition-group name="list" tag="ul" class="space-y-2">
          <PlayerCard 
            v-for="player in players" 
            :key="player._id"
            :player="player"
            :is-selected="selectedPlayer && selectedPlayer._id === player._id"
            @select="handleSelectPlayer"
          />
        </transition-group>
      </div>
      
      <!-- Bouton de recalcul -->
      <button 
        @click="$emit('recalculate')" 
        class="w-full px-4 py-2 bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-700 transition mt-4 flex items-center justify-center"
        :disabled="isRecalculating"
      >
        <span v-if="isRecalculating" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
        <span>{{ isRecalculating ? "Recalcul en cours..." : "Recalculer toutes les statistiques" }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>