/**
 * Calcule le KDA pour affichage
 * @param {number} kills - Nombre de kills
 * @param {number} deaths - Nombre de morts
 * @param {number} assists - Nombre d'assists
 * @returns {string} KDA calculé
 */
export const calculateKDA = (kills, deaths, assists) => {
    if (deaths === 0) return 'Perfect';
    return ((kills + assists) / deaths).toFixed(2);
  };
  
  /**
   * Calcule le pourcentage pour la barre de maîtrise
   * @param {number} points - Points de maîtrise
   * @returns {number} Pourcentage pour la barre de progression
   */
  export const calculateMasteryPercentage = (points) => {
    const maxPoints = 1500000; // ~1.5M comme maximum raisonnable
    return Math.min(100, (points / maxPoints) * 100);
  };
  
  /**
   * Calcule la variation en pourcentage entre deux valeurs
   * @param {number} current - Valeur actuelle
   * @param {number} previous - Valeur précédente
   * @returns {number} Variation en pourcentage
   */
  export const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0;
    return (current - previous) / previous;
  };
  
  /**
   * Calcule le winrate en pourcentage
   * @param {number} wins - Nombre de victoires
   * @param {number} total - Nombre total de parties
   * @returns {number} Winrate en pourcentage
   */
  export const calculateWinRate = (wins, total) => {
    if (total === 0) return 0;
    return (wins / total) * 100;
  };