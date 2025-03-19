/**
 * Formate le nom d'un champion pour l'affichage
 * @param {string} champ - Nom du champion
 * @returns {string} Nom formaté pour l'affichage
 */
export const formatChampionDisplayName = (champ) => {
    if (!champ) return 'Inconnu';
    // Remplacer les underscores par des espaces pour l'affichage
    return champ.replace(/_/g, ' ');
  };
  
  /**
   * Formate le nom d'un champion pour les images
   * @param {string} champ - Nom du champion
   * @returns {string} Nom formaté pour les images
   */
  export const formatChampionImageName = (champ) => {
    if (!champ) return 'Default';
    
    // Cas spéciaux connus
    const specialCases = {
      'Wukong': 'MonkeyKing',
      "Vel'Koz": 'Velkoz',
      "Cho'Gath": 'Chogath',
      "Kai'Sa": 'Kaisa',
      "Kha'Zix": 'Khazix',
      "Kog'Maw": 'KogMaw',
      "Rek'Sai": 'RekSai',
      "Nunu & Willump": 'Nunu',
      "Renata Glasc": 'Renata',
      "Dr. Mundo": 'DrMundo',
      "Tahm Kench": 'TahmKench',
      "Twisted Fate": 'TwistedFate',
      "Master Yi": 'MasterYi',
      "Miss Fortune": 'MissFortune',
      "Jarvan IV": 'JarvanIV',
      "Lee Sin": 'LeeSin',
      "Aurelion Sol": 'AurelionSol',
      "Xin Zhao": 'XinZhao'
    };
  
    // Transformer les underscores en espaces pour rechercher dans le dictionnaire
    const champWithSpaces = champ.replace(/_/g, ' ');
    
    // Vérifier si c'est un cas spécial (avec les espaces corrects)
    if (specialCases[champWithSpaces]) {
      return specialCases[champWithSpaces];
    }
  
    // Sinon appliquer la logique standard
    return champWithSpaces
      .replace(/\s+/g, '')   // Supprime les espaces
      .replace(/'/g, '')     // Supprime les apostrophes
      .replace(/\./g, '')    // Supprime les points
      .replace(/&/g, '');    // Supprime les &
  };
  
  /**
   * Obtient l'URL de l'image du champion
   * @param {string} champion - Nom du champion
   * @returns {string} URL de l'image
   */
  export const getChampionImageUrl = (champion) => {
    return `https://ddragon.leagueoflegends.com/cdn/15.5.1/img/champion/${formatChampionImageName(champion)}.png`;
  };
  
  /**
   * Formate les points de maîtrise (ex: 1,011,737 -> 1.01M)
   * @param {number} points - Points de maîtrise
   * @returns {string} Points formatés
   */
  export const formatMasteryPoints = (points) => {
    if (points >= 1000000) {
      return (points / 1000000).toFixed(2) + 'M';
    } else if (points >= 1000) {
      return (points / 1000).toFixed(1) + 'K';
    }
    return points;
  };
  
  /**
   * Formate le nom du jour
   * @param {string} day - Numéro du jour (0-6)
   * @returns {string} Nom du jour
   */
  export const formatDayName = (day) => {
    const days = {
      '0': 'Dimanche',
      '1': 'Lundi',
      '2': 'Mardi',
      '3': 'Mercredi',
      '4': 'Jeudi',
      '5': 'Vendredi',
      '6': 'Samedi'
    };
    return days[day] || day;
  };
  
  /**
   * Formate l'heure
   * @param {string} hour - Heure (0-23)
   * @returns {string} Heure formatée
   */
  export const formatHour = (hour) => {
    return `${hour}h - ${(parseInt(hour) + 1) % 24}h`;
  };
  
  /**
   * Formate la tendance
   * @param {number} trend - Tendance de performance
   * @returns {string} Tendance formatée
   */
  export const formatTrend = (trend) => {
    if (trend > 0.1) return `↗️ En hausse (+${(trend * 100).toFixed(1)}%)`;
    if (trend < -0.1) return `↘️ En baisse (${(trend * 100).toFixed(1)}%)`;
    return "→ Stable";
  };