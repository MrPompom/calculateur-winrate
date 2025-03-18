<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const toast = useToast();

// Liste des configurations
const tournamentConfigs = ref([]);
const activeConfig = ref(null);
const isLoading = ref(true);
const isCreating = ref(false);

// Nouveau tournoi
const newTournamentName = ref('');
const regions = ['BR', 'EUNE', 'EUW', 'JP', 'LAN', 'LAS', 'NA', 'OCE', 'PBE', 'RU', 'TR', 'KR'];
const newTournamentRegion = ref('EUW');

// Options de génération de code
const teamSize = ref(5);
const spectatorTypes = ['ALL', 'LOBBYONLY', 'NONE'];
const spectatorType = ref('ALL');
const pickTypes = ['BLIND_PICK', 'DRAFT_MODE', 'TOURNAMENT_DRAFT', 'ALL_RANDOM'];
const pickType = ref('TOURNAMENT_DRAFT');
const mapTypes = ['SUMMONERS_RIFT', 'HOWLING_ABYSS'];
const mapType = ref('SUMMONERS_RIFT');

// Code généré
const tournamentCode = ref('');
const isGeneratingCode = ref(false);

// Chargement des configurations
const fetchConfigurations = async () => {
  isLoading.value = true;
  try {
    const response = await axios.get(`${API_URL}/api/tournament-config`);
    tournamentConfigs.value = response.data;
    
    // Trouver la configuration active
    activeConfig.value = tournamentConfigs.value.find(config => config.isActive);
  } catch (error) {
    console.error("Erreur lors du chargement des configurations:", error);
    toast.error("Impossible de charger les configurations de tournoi");
  } finally {
    isLoading.value = false;
  }
};

// Créer une nouvelle configuration
const createConfiguration = async () => {
  if (!newTournamentName.value.trim()) {
    toast.warning("Veuillez saisir un nom de tournoi");
    return;
  }
  
  isCreating.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/tournament-config`, {
      name: newTournamentName.value,
      region: newTournamentRegion.value
    });
    
    if (response.data.success) {
      toast.success("Configuration de tournoi créée avec succès");
      newTournamentName.value = '';
      await fetchConfigurations();
    } else {
      toast.error(response.data.message || "Échec de la création de la configuration");
    }
  } catch (error) {
    console.error("Erreur lors de la création de la configuration:", error);
    toast.error(`Erreur: ${error.response?.data?.message || error.message}`);
  } finally {
    isCreating.value = false;
  }
};

// Activer une configuration
const activateConfiguration = async (configId) => {
  try {
    const response = await axios.put(`${API_URL}/api/tournament-config/${configId}/activate`);
    
    if (response.data.success) {
      toast.success("Configuration de tournoi activée");
      await fetchConfigurations();
    } else {
      toast.error(response.data.message || "Échec de l'activation de la configuration");
    }
  } catch (error) {
    console.error("Erreur lors de l'activation de la configuration:", error);
    toast.error(`Erreur: ${error.response?.data?.message || error.message}`);
  }
};

// Supprimer une configuration
const deleteConfiguration = async (configId) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette configuration ?")) {
    return;
  }
  
  try {
    const response = await axios.delete(`${API_URL}/api/tournament-config/${configId}`);
    
    if (response.data.success) {
      toast.success("Configuration de tournoi supprimée");
      await fetchConfigurations();
    } else {
      toast.error(response.data.message || "Échec de la suppression de la configuration");
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la configuration:", error);
    toast.error(`Erreur: ${error.response?.data?.message || error.message}`);
  }
};

// Générer un code de tournoi
const generateTournamentCode = async () => {
  if (!activeConfig.value) {
    toast.warning("Aucune configuration de tournoi active disponible");
    return;
  }
  
  isGeneratingCode.value = true;
  try {
    const response = await axios.post(`${API_URL}/api/tournament-config/code`, {
      teamSize: parseInt(teamSize.value),
      spectatorType: spectatorType.value,
      pickType: pickType.value,
      mapType: mapType.value
    });
    
    if (response.data.success && response.data.tournamentCodes && response.data.tournamentCodes.length > 0) {
      tournamentCode.value = response.data.tournamentCodes[0];
      toast.success("Code de tournoi généré avec succès");
    } else {
      toast.error("Échec de la génération du code de tournoi");
    }
  } catch (error) {
    console.error("Erreur lors de la génération du code:", error);
    toast.error(`Erreur: ${error.response?.data?.message || error.message}`);
  } finally {
    isGeneratingCode.value = false;
  }
};

// Copier le code de tournoi dans le presse-papier
const copyTournamentCode = () => {
  if (!tournamentCode.value) return;
  
  navigator.clipboard.writeText(tournamentCode.value).then(() => {
    toast.success("Code de tournoi copié dans le presse-papier");
  }, () => {
    toast.error("Impossible de copier le code");
  });
};

// Formater la date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(fetchConfigurations);
</script>

<template>
  <div class="tournament-config bg-white p-4 rounded-lg shadow-md">
    <h3 class="text-xl font-semibold text-gray-800 mb-4">Configurations de tournoi</h3>
    
    <!-- État de chargement -->
    <div v-if="isLoading" class="text-center py-4">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mb-2"></div>
      <p class="text-gray-600">Chargement des configurations...</p>
    </div>
    
    <!-- Configuration active -->
    <div v-else-if="activeConfig" class="mb-6 p-4 border-2 border-green-500 rounded-lg bg-green-50">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-semibold text-green-800">Configuration active</h4>
          <p class="text-lg font-medium mt-1">{{ activeConfig.name }}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-2 py-1 text-xs rounded-full" 
                :class="activeConfig.isTest ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'">
            {{ activeConfig.isTest ? 'Test' : 'Production' }}
          </span>
          <p class="text-sm text-gray-600 mt-1">Région: {{ activeConfig.region }}</p>
        </div>
      </div>
      
      <div class="mt-2 text-sm text-gray-600">
        <p>ID Fournisseur: <span class="font-mono">{{ activeConfig.providerId }}</span></p>
        <p>ID Tournoi: <span class="font-mono">{{ activeConfig.tournamentId }}</span></p>
        <p>Dernière utilisation: {{ formatDate(activeConfig.lastUsed) }}</p>
      </div>
    </div>
    
    <div v-else class="mb-6 p-4 border rounded-lg bg-yellow-50">
      <p class="text-yellow-700">Aucune configuration active. Créez-en une nouvelle ou activez une configuration existante.</p>
    </div>
    
    <!-- Génération de code de tournoi -->
    <div class="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 class="font-medium mb-3">Générer un code de tournoi</h4>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Taille d'équipe</label>
          <select 
            v-model="teamSize" 
            class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="n in 5" :key="`team-${n}`" :value="n">{{ n }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Type de spectateurs</label>
          <select 
            v-model="spectatorType" 
            class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="type in spectatorTypes" :key="`spec-${type}`" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Type de sélection</label>
          <select 
            v-model="pickType" 
            class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="type in pickTypes" :key="`pick-${type}`" :value="type">{{ type }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Map</label>
          <select 
            v-model="mapType" 
            class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="type in mapTypes" :key="`map-${type}`" :value="type">{{ type }}</option>
          </select>
        </div>
      </div>
      
      <div class="flex items-center">
        <button 
          @click="generateTournamentCode" 
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          :disabled="isGeneratingCode || !activeConfig"
        >
          <span v-if="isGeneratingCode" class="inline-block animate-spin mr-1">⟳</span>
          Générer un code
        </button>
      </div>
      
      <!-- Code généré -->
      <div v-if="tournamentCode" class="mt-4 p-3 border-2 border-green-500 rounded-md bg-white">
        <h5 class="font-medium text-green-700 mb-2">Code de tournoi généré :</h5>
        <div class="flex items-center">
          <code class="bg-gray-100 p-2 border rounded font-mono text-lg flex-grow">{{ tournamentCode }}</code>
          <button 
            @click="copyTournamentCode" 
            class="ml-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            title="Copier le code"
          >
            📋
          </button>
        </div>
      </div>
    </div>
    
    <!-- Créer une nouvelle configuration -->
    <div class="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 class="font-medium mb-3">Créer une nouvelle configuration</h4>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-600 mb-1">Nom du tournoi</label>
          <input 
            v-model="newTournamentName" 
            type="text" 
            placeholder="Nom du tournoi" 
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-1">Région</label>
          <select 
            v-model="newTournamentRegion" 
            class="w-full px-2 py-1 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option v-for="region in regions" :key="`region-${region}`" :value="region">{{ region }}</option>
          </select>
        </div>
      </div>
      
      <div class="flex items-center">
        <button 
          @click="createConfiguration" 
          class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          :disabled="isCreating"
        >
          <span v-if="isCreating" class="inline-block animate-spin mr-1">⟳</span>
          Créer configuration
        </button>
      </div>
    </div>
    
    <!-- Liste des configurations -->
    <div v-if="tournamentConfigs.length > 0" class="p-4 border rounded-lg">
      <h4 class="font-medium mb-3">Configurations disponibles</h4>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IDs</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisé</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="config in tournamentConfigs" :key="config._id" 
                :class="{'bg-green-50': config.isActive}">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium" :class="{'text-green-700': config.isActive}">
                  {{ config.name }}
                </div>
                <div class="text-sm text-gray-500">{{ config.region }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-block px-2 py-1 text-xs rounded-full" 
                      :class="config.isTest ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'">
                  {{ config.isTest ? 'Test' : 'Production' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-500">
                  <div>Provider: <span class="font-mono">{{ config.providerId }}</span></div>
                  <div>Tournoi: <span class="font-mono">{{ config.tournamentId }}</span></div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(config.lastUsed) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  v-if="!config.isActive"
                  @click="activateConfiguration(config._id)" 
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Activer
                </button>
                <button 
                  @click="deleteConfiguration(config._id)" 
                  class="text-red-600 hover:text-red-900"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div v-else-if="!isLoading" class="text-center py-4 text-gray-500">
      Aucune configuration de tournoi disponible
    </div>
  </div>
</template>