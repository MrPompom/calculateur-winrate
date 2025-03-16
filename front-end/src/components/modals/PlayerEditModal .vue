<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';

const props = defineProps({
  player: Object,
  isOpen: Boolean
});

const emit = defineEmits(['close', 'update-player', 'sync-riot']);

const toast = useToast();
const isLoading = ref(false);
const riotSyncLoading = ref(false);

// Données éditables avec valeurs par défaut
const editedPlayer = ref({
  name: props.player?.name || '',
  riotId: props.player?.riotId || '',
  riotTag: props.player?.riotTag || '',
  region: props.player?.region || 'EUW'
});

// Liste des régions
const regions = [
  { value: 'EUW', label: 'Europe Ouest' },
  { value: 'EUNE', label: 'Europe Nord-Est' },
  { value: 'NA', label: 'Amérique du Nord' },
  { value: 'KR', label: 'Corée' },
  { value: 'BR', label: 'Brésil' },
  { value: 'JP', label: 'Japon' },
  { value: 'RU', label: 'Russie' },
  { value: 'OCE', label: 'Océanie' },
  { value: 'TR', label: 'Turquie' },
  { value: 'LAN', label: 'Amérique Latine Nord' },
  { value: 'LAS', label: 'Amérique Latine Sud' }
];

// Vérification des champs obligatoires
const isValid = computed(() => {
  return editedPlayer.value.name.trim() !== '';
});

// Formatter le riot ID complet
const formattedRiotId = computed(() => {
  if (!editedPlayer.value.riotId) return '';
  return editedPlayer.value.riotTag 
    ? `${editedPlayer.value.riotId}#${editedPlayer.value.riotTag}` 
    : editedPlayer.value.riotId;
});

// Synchroniser avec les props quand elles changent
watch(() => props.player, (newPlayer) => {
  if (newPlayer) {
    editedPlayer.value = {
      name: newPlayer.name || '',
      riotId: newPlayer.riotId || '',
      riotTag: newPlayer.riotTag || '',
      region: newPlayer.region || 'EUW'
    };
  }
}, { immediate: true });

// Sauvegarder les modifications
const saveChanges = () => {
  if (!isValid.value) {
    toast.error("Le nom du joueur est obligatoire");
    return;
  }
  
  isLoading.value = true;
  // Émettre l'événement pour mettre à jour le joueur
  emit('update-player', {
    id: props.player._id,
    ...editedPlayer.value
  });
  
  // La fermeture et réinitialisation seront gérées par le composant parent
  // après que la mise à jour ait été effectuée avec succès
};

// Synchroniser avec l'API Riot
const syncWithRiot = () => {
  if (!editedPlayer.value.riotId) {
    toast.error("Veuillez entrer un Riot ID pour synchroniser");
    return;
  }
  
  riotSyncLoading.value = true;
  
  // Émettre l'événement pour synchroniser avec Riot
  emit('sync-riot', {
    id: props.player._id,
    riotId: editedPlayer.value.riotId,
    riotTag: editedPlayer.value.riotTag,
    region: editedPlayer.value.region
  });
  
  // La mise à jour de l'UI sera gérée par le composant parent
};

// Annuler les modifications
const cancelEdit = () => {
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800">Modifier le joueur</h2>
        <button @click="cancelEdit" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- Nom du joueur (obligatoire) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nom du joueur *</label>
          <input 
            v-model="editedPlayer.name" 
            type="text" 
            class="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nom affiché dans l'application"
          />
        </div>
        
        <!-- Paramètres Riot Games -->
        <div class="bg-gray-50 p-3 rounded-md">
          <h3 class="text-md font-medium text-gray-800 mb-2">Paramètres Riot Games</h3>
          
          <div class="flex gap-2 mb-2">
            <div class="flex-grow">
              <label class="block text-sm font-medium text-gray-700 mb-1">Riot ID</label>
              <input 
                v-model="editedPlayer.riotId" 
                type="text" 
                class="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Pseudo"
              />
            </div>
            <div class="w-24">
              <label class="block text-sm font-medium text-gray-700 mb-1">Tag</label>
              <input 
                v-model="editedPlayer.riotTag" 
                type="text" 
                class="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tag"
              />
            </div>
          </div>
          
          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Région</label>
            <select 
              v-model="editedPlayer.region" 
              class="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option v-for="region in regions" :key="region.value" :value="region.value">
                {{ region.label }}
              </option>
            </select>
          </div>
          
          <div v-if="formattedRiotId" class="text-sm text-gray-600 mb-2">
            Riot ID complet: <span class="font-medium">{{ formattedRiotId }}</span>
          </div>
          
          <button 
            @click="syncWithRiot" 
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center justify-center"
            :disabled="!editedPlayer.riotId || riotSyncLoading"
          >
            <span v-if="riotSyncLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            <span>{{ riotSyncLoading ? "Synchronisation..." : "Synchroniser avec l'API Riot" }}</span>
          </button>
        </div>
      </div>
      
      <div class="flex justify-end gap-3 mt-6">
        <button 
          @click="cancelEdit" 
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
        >
          Annuler
        </button>
        <button 
          @click="saveChanges" 
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
          :disabled="!isValid || isLoading"
        >
          <span v-if="isLoading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
          <span>{{ isLoading ? "Enregistrement..." : "Enregistrer" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>