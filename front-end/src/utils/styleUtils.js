/**
 * Détermine la classe CSS pour le KDA (bon, moyen, mauvais)
 * @param {string|number} kda - KDA du joueur
 * @returns {string} Classe CSS pour le KDA
 */
export const getKDAClass = (kda) => {
    if (kda === 'Perfect') return 'text-purple-600 font-bold';
    const kdaNum = parseFloat(kda);
    if (kdaNum >= 4) return 'text-green-600 font-semibold';
    if (kdaNum >= 2.5) return 'text-blue-600';
    if (kdaNum >= 1) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  /**
   * Détermine la classe CSS pour le winrate
   * @param {number} winRate - Taux de victoire (0 à 1)
   * @returns {string} Classe CSS pour le winrate
   */
  export const getWinRateClass = (winRate) => {
    const rate = winRate * 100;
    if (rate >= 60) return 'text-green-600 font-semibold';
    if (rate >= 50) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  /**
   * Détermine la classe de couleur pour la barre de winrate
   * @param {number} winRate - Taux de victoire (0 à 1)
   * @returns {string} Classe CSS pour la barre de progression
   */
  export const getWinRateBarClass = (winRate) => {
    const rate = winRate * 100;
    if (rate >= 60) return 'bg-green-500';
    if (rate >= 50) return 'bg-blue-500';
    if (rate >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  /**
   * Détermine la classe CSS pour la tendance
   * @param {number} trend - Tendance de performance
   * @returns {string} Classe CSS pour la tendance
   */
  export const getTrendClass = (trend) => {
    if (trend > 0.1) return 'text-green-600';
    if (trend < -0.1) return 'text-red-600';
    return 'text-gray-600';
  };
  
  /**
   * Détermine si c'est un bon moment pour jouer
   * @param {Object} stats - Statistiques pour la période
   * @returns {boolean} Vrai si c'est un bon moment pour jouer
   */
  export const isBestPlayTime = (stats) => {
    if (!stats || stats.games < 5) return false;
    return stats.winRate >= 0.55; // Plus de 55% de winrate
  };