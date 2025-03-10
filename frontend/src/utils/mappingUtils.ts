import { api } from './api';
import sportsDatabaseService, { EntityType } from '../services/SportsDatabaseService';

export async function handleSaveToDatabase(entityType: EntityType, data: any): Promise<any> {
  try {
    // Direct call to create/update entity - let backend handle the logic
    return await sportsDatabaseService.createEntity(entityType, data);
  } catch (error) {
    console.error(`Error saving to database:`, error);
    throw error;
  }
} 