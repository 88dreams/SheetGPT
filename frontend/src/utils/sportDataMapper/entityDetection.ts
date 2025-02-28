import { EntityType, ENTITY_TYPES } from './entityTypes';

/**
 * Detects the most likely entity type based on the source fields and their values
 */
export const detectEntityType = (
  sourceFields: string[], 
  sourceFieldValues: Record<string, any>
): EntityType | null => {
  if (!sourceFields.length) return null;
  
  // Check for field values
  const fieldValues = Object.values(sourceFieldValues).map(v => 
    typeof v === 'string' ? v.toLowerCase() : String(v).toLowerCase()
  );
  
  // League detection - check for league-specific fields and values
  const hasLeagueField = sourceFields.some(field => 
    field.toLowerCase() === 'league'
  );
  
  const hasLeagueNameField = sourceFields.some(field => 
    field.toLowerCase().includes('league') || 
    field.toLowerCase().includes('conference') || 
    field.toLowerCase().includes('division')
  );
  
  const hasLeagueValue = Object.values(sourceFieldValues).some(value => 
    typeof value === 'string' && (
      value.toLowerCase().includes('league') || 
      value.toLowerCase().includes('nfl') || 
      value.toLowerCase().includes('nba') || 
      value.toLowerCase().includes('mlb') ||
      value.toLowerCase().includes('nhl') ||
      value.toLowerCase().includes('premier') ||
      value.toLowerCase().includes('conference') ||
      value.toLowerCase().includes('division')
    )
  );
  
  // Stadium detection - check for stadium-specific fields and values
  const hasStadiumField = sourceFields.some(field => 
    field.toLowerCase() === 'stadium'
  );
  
  const hasStadiumNameField = sourceFields.some(field => 
    field.toLowerCase().includes('stadium') || 
    field.toLowerCase().includes('arena') || 
    field.toLowerCase().includes('venue')
  );
  
  const hasStadiumValue = Object.values(sourceFieldValues).some(value => 
    typeof value === 'string' && (
      value.toLowerCase().includes('stadium') || 
      value.toLowerCase().includes('arena') || 
      value.toLowerCase().includes('center') ||
      value.toLowerCase().includes('garden')
    )
  );
  
  // Prioritize League over Stadium if both are detected
  if (hasLeagueField || (hasLeagueNameField && hasLeagueValue)) {
    console.log('Detected entity type: league based on League field or value');
    return 'league';
  } else if (hasStadiumField || (hasStadiumNameField && hasStadiumValue)) {
    console.log('Detected entity type: stadium based on Stadium field or value');
    return 'stadium';
  } else {
    const recommended = getRecommendedEntityType(sourceFields, sourceFieldValues);
    console.log('Recommended entity type:', recommended);
    return recommended;
  }
};

/**
 * Get entity type recommendation based on source fields and values
 */
export const getRecommendedEntityType = (
  sourceFields: string[], 
  sourceFieldValues: Record<string, any>
): EntityType | null => {
  if (!sourceFields.length) return null;
  
  // League detection - check for league-specific fields and values
  const hasLeagueName = sourceFields.some(field => 
    field.toLowerCase().includes('league') || 
    field.toLowerCase() === 'name' ||
    field.toLowerCase().includes('conference') ||
    field.toLowerCase().includes('division')
  );
  
  const hasLeagueSport = sourceFields.some(field => 
    field.toLowerCase().includes('sport') || 
    field.toLowerCase() === 'type' ||
    field.toLowerCase().includes('category')
  );
  
  const hasLeagueLocation = sourceFields.some(field => 
    field.toLowerCase().includes('country') || 
    field.toLowerCase().includes('region') || 
    field.toLowerCase().includes('continent')
  );
  
  // Check if values contain league indicators
  const hasLeagueValueIndicators = Object.values(sourceFieldValues).some(value => 
    typeof value === 'string' && (
      value.toLowerCase().includes('league') || 
      value.toLowerCase().includes('nfl') || 
      value.toLowerCase().includes('nba') || 
      value.toLowerCase().includes('mlb') ||
      value.toLowerCase().includes('nhl') ||
      value.toLowerCase().includes('premier') ||
      value.toLowerCase().includes('conference') ||
      value.toLowerCase().includes('division')
    )
  );
  
  // If we have strong league indicators, return league type immediately
  if ((hasLeagueName && (hasLeagueSport || hasLeagueLocation)) || 
      (hasLeagueValueIndicators && (hasLeagueSport || hasLeagueLocation))) {
    return 'league';
  }
  
  // Stadium detection - check for stadium-specific fields and values
  const hasStadiumName = sourceFields.some(field => 
    field.toLowerCase().includes('stadium') || 
    field.toLowerCase().includes('arena') || 
    field.toLowerCase().includes('center') ||
    field.toLowerCase().includes('venue')
  );
  
  const hasStadiumLocation = sourceFields.some(field => 
    field.toLowerCase().includes('city') || 
    field.toLowerCase().includes('state') || 
    field.toLowerCase().includes('country')
  );
  
  const hasStadiumDetails = sourceFields.some(field => 
    field.toLowerCase().includes('capacity') || 
    field.toLowerCase().includes('year') || 
    field.toLowerCase().includes('opened')
  );
  
  // Check if values contain stadium indicators
  const hasStadiumValueIndicators = Object.values(sourceFieldValues).some(value => 
    typeof value === 'string' && (
      value.toLowerCase().includes('stadium') || 
      value.toLowerCase().includes('arena') || 
      value.toLowerCase().includes('center') || 
      value.toLowerCase().includes('field') ||
      value.toLowerCase().includes('park')
    )
  );
  
  // If we have strong stadium indicators, return stadium type immediately
  if ((hasStadiumName && (hasStadiumLocation || hasStadiumDetails)) || 
      (hasStadiumValueIndicators && hasStadiumLocation)) {
    return 'stadium';
  }
  
  // Calculate a score for each entity type based on field matches
  const scores = ENTITY_TYPES.map(entityType => {
    const requiredFields = entityType.requiredFields || [];
    
    // Count exact and partial matches
    let exactMatches = 0;
    let partialMatches = 0;
    
    requiredFields.forEach(requiredField => {
      // Check for exact matches in source field keys
      const hasExactMatch = sourceFields.some(sourceField => 
        sourceField.toLowerCase() === requiredField.toLowerCase()
      );
      
      if (hasExactMatch) {
        exactMatches++;
      } else {
        // Check for partial matches
        const hasPartialMatch = sourceFields.some(sourceField => 
          sourceField.toLowerCase().includes(requiredField.toLowerCase()) ||
          requiredField.toLowerCase().includes(sourceField.toLowerCase())
        );
        
        if (hasPartialMatch) {
          partialMatches++;
        }
      }
    });
    
    // Calculate score - exact matches are worth more than partial matches
    const score = (exactMatches * 2) + partialMatches;
    
    // Special case for stadium - boost score if we have location data
    let finalScore = score;
    if (entityType.id === 'stadium' && hasStadiumLocation) {
      finalScore += 3;
    }
    
    // Special case for league - boost score if we have sport data
    if (entityType.id === 'league' && hasLeagueSport) {
      finalScore += 3;
    }
    
    return {
      entityType: entityType.id,
      score: finalScore
    };
  });
  
  // Sort by score in descending order
  scores.sort((a, b) => b.score - a.score);
  
  // Return the entity type with the highest score, if any
  return scores.length > 0 && scores[0].score > 0 ? scores[0].entityType as EntityType : null;
}; 