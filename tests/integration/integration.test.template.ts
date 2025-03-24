/**
 * Integration test template for testing complete user flows.
 * These tests interact with the actual API endpoints and verify correct data flow.
 */
import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test data
const testEntity = {
  name: `Test Entity ${Date.now()}`, // Ensure unique name for each test run
  description: 'Created during integration testing'
};

/**
 * Helper to create HTTP client with auth token
 */
const getAuthenticatedClient = async (email: string, password: string) => {
  // Login to get auth token
  const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
    email,
    password
  });
  
  const token = loginResponse.data.access_token;
  
  // Create axios instance with auth header
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

describe('User Flow Integration Tests', () => {
  // Shared variables
  let client: any;
  let createdEntityId: string;
  
  // Setup before all tests
  beforeAll(async () => {
    // Create authenticated client
    // client = await getAuthenticatedClient('test@example.com', 'testpassword');
    
    // Any other setup needed
  }, TEST_TIMEOUT);
  
  // Cleanup after all tests
  afterAll(async () => {
    // Delete any test data created
    // if (createdEntityId) {
    //   await client.delete(`/api/entities/${createdEntityId}`);
    // }
    
    // Any other cleanup needed
  }, TEST_TIMEOUT);
  
  it('should create a new entity', async () => {
    // Skip this test if no client
    // if (!client) {
    //   console.warn('Skipping test due to missing client');
    //   return;
    // }
    
    // Create new entity
    // const response = await client.post('/api/entities', testEntity);
    
    // Verify response
    // expect(response.status).toBe(201);
    // expect(response.data).toHaveProperty('id');
    // expect(response.data.name).toBe(testEntity.name);
    
    // Store ID for later tests
    // createdEntityId = response.data.id;
  }, TEST_TIMEOUT);
  
  it('should retrieve the created entity', async () => {
    // Skip this test if entity wasn't created
    // if (!createdEntityId) {
    //   console.warn('Skipping test due to missing entity ID');
    //   return;
    // }
    
    // Get entity by ID
    // const response = await client.get(`/api/entities/${createdEntityId}`);
    
    // Verify response
    // expect(response.status).toBe(200);
    // expect(response.data).toHaveProperty('id', createdEntityId);
    // expect(response.data.name).toBe(testEntity.name);
  }, TEST_TIMEOUT);
  
  it('should update the entity', async () => {
    // Skip this test if entity wasn't created
    // if (!createdEntityId) {
    //   console.warn('Skipping test due to missing entity ID');
    //   return;
    // }
    
    // Updated data
    // const updatedData = {
    //   name: `Updated ${testEntity.name}`,
    //   description: 'Updated during integration testing'
    // };
    
    // Update entity
    // const response = await client.put(`/api/entities/${createdEntityId}`, updatedData);
    
    // Verify response
    // expect(response.status).toBe(200);
    // expect(response.data.name).toBe(updatedData.name);
    // expect(response.data.description).toBe(updatedData.description);
    
    // Verify with a GET request
    // const getResponse = await client.get(`/api/entities/${createdEntityId}`);
    // expect(getResponse.data.name).toBe(updatedData.name);
  }, TEST_TIMEOUT);
  
  it('should list entities with filters', async () => {
    // Skip this test if no client
    // if (!client) {
    //   console.warn('Skipping test due to missing client');
    //   return;
    // }
    
    // Get entities with filter
    // const response = await client.get('/api/entities', {
    //   params: {
    //     name: `Updated ${testEntity.name}` // Should match our updated entity
    //   }
    // });
    
    // Verify response
    // expect(response.status).toBe(200);
    // expect(response.data).toBeInstanceOf(Array);
    // expect(response.data.length).toBeGreaterThanOrEqual(1);
    
    // Find our entity in the results
    // const found = response.data.find((e: any) => e.id === createdEntityId);
    // expect(found).toBeDefined();
  }, TEST_TIMEOUT);
  
  it('should delete the entity', async () => {
    // Skip this test if entity wasn't created
    // if (!createdEntityId) {
    //   console.warn('Skipping test due to missing entity ID');
    //   return;
    // }
    
    // Delete entity
    // const response = await client.delete(`/api/entities/${createdEntityId}`);
    // expect(response.status).toBe(204);
    
    // Verify entity is gone
    // try {
    //   await client.get(`/api/entities/${createdEntityId}`);
    //   fail('Entity should not exist');
    // } catch (error: any) {
    //   expect(error.response.status).toBe(404);
    // }
    
    // Reset ID since entity is deleted
    // createdEntityId = '';
  }, TEST_TIMEOUT);
  
  it('should handle error cases gracefully', async () => {
    // Skip this test if no client
    // if (!client) {
    //   console.warn('Skipping test due to missing client');
    //   return;
    // }
    
    // Try to get non-existent entity
    // try {
    //   await client.get('/api/entities/non-existent-id');
    //   fail('Should have thrown an error');
    // } catch (error: any) {
    //   expect(error.response.status).toBe(404);
    //   expect(error.response.data).toHaveProperty('error');
    // }
    
    // Try to create invalid entity
    // try {
    //   await client.post('/api/entities', { invalid: 'data' });
    //   fail('Should have thrown a validation error');
    // } catch (error: any) {
    //   expect(error.response.status).toBe(422);
    //   expect(error.response.data).toHaveProperty('detail');
    // }
  }, TEST_TIMEOUT);
});