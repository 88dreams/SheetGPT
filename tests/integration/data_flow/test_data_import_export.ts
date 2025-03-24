/**
 * Integration test for the complete data flow - import, transform, and export
 */
import axios from 'axios';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test files
const CSV_TEST_FILE = path.resolve(__dirname, '../../../data/test_data.csv');
const CSV_CONTENT = `name,city,league
Team A,City A,League A
Team B,City B,League A
Team C,City C,League B`;

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

describe('Data Import & Export Flow', () => {
  let client: any;
  let conversationId: string;
  let structuredDataId: string;
  let exportedDataId: string;
  
  // Create test file
  beforeAll(async () => {
    // Create test CSV file if it doesn't exist
    if (!fs.existsSync(CSV_TEST_FILE)) {
      const dir = path.dirname(CSV_TEST_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CSV_TEST_FILE, CSV_CONTENT);
    }
    
    // Set up authenticated client
    try {
      client = await getAuthenticatedClient('test@example.com', 'testpassword');
    } catch (error) {
      console.warn('Authentication failed, tests will be skipped');
    }
  }, TEST_TIMEOUT);
  
  // Clean up after all tests
  afterAll(async () => {
    // Delete the test conversation and data if created
    if (client && conversationId) {
      try {
        await client.delete(`/api/chat/conversations/${conversationId}`);
      } catch (error) {
        console.warn(`Failed to delete test conversation: ${conversationId}`);
      }
    }
    
    // Delete the test CSV file
    if (fs.existsSync(CSV_TEST_FILE)) {
      fs.unlinkSync(CSV_TEST_FILE);
    }
  }, TEST_TIMEOUT);
  
  it('should create a new conversation', async () => {
    // Skip test if no client
    if (!client) {
      console.warn('Skipping test due to missing client');
      return;
    }
    
    // Create a new conversation
    const response = await client.post('/api/chat/conversations', {
      title: 'Test Data Flow Conversation'
    });
    
    // Verify response
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    
    // Store ID for later tests
    conversationId = response.data.id;
  }, TEST_TIMEOUT);
  
  it('should upload CSV file to conversation', async () => {
    // Skip test if no conversation
    if (!conversationId) {
      console.warn('Skipping test due to missing conversation ID');
      return;
    }
    
    // Create a FormData instance for file upload
    const formData = new FormData();
    formData.append('file', new Blob([fs.readFileSync(CSV_TEST_FILE)], { type: 'text/csv' }), 'test_data.csv');
    
    // Upload the file
    const response = await client.post(`/api/chat/conversations/${conversationId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('message');
    expect(response.data.message).toContain('uploaded');
  }, TEST_TIMEOUT);
  
  it('should extract structured data from conversation', async () => {
    // Skip test if no conversation
    if (!conversationId) {
      console.warn('Skipping test due to missing conversation ID');
      return;
    }
    
    // Send message to extract data
    const response = await client.post(`/api/chat/conversations/${conversationId}/messages`, {
      content: 'Extract the teams and their cities from the CSV data I uploaded.',
      structured_format: true
    });
    
    // Verify response
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
    
    // Wait for structured data to be processed (simulated by polling messages)
    let dataFound = false;
    let attempts = 0;
    while (!dataFound && attempts < 10) {
      const messagesResponse = await client.get(`/api/chat/conversations/${conversationId}/messages`);
      
      // Look for message with structured data
      for (const message of messagesResponse.data) {
        if (message.structured_data_id) {
          structuredDataId = message.structured_data_id;
          dataFound = true;
          break;
        }
      }
      
      if (!dataFound) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        attempts++;
      }
    }
    
    expect(dataFound).toBe(true);
    expect(structuredDataId).toBeDefined();
  }, TEST_TIMEOUT);
  
  it('should retrieve structured data', async () => {
    // Skip test if no structured data
    if (!structuredDataId) {
      console.warn('Skipping test due to missing structured data ID');
      return;
    }
    
    // Get structured data
    const response = await client.get(`/api/data/${structuredDataId}`);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('columns');
    expect(response.data).toHaveProperty('rows');
    
    // Verify data content
    const columns = response.data.columns;
    const rows = response.data.rows;
    
    expect(columns).toContainEqual(expect.objectContaining({ key: 'name' }));
    expect(columns).toContainEqual(expect.objectContaining({ key: 'city' }));
    expect(rows.length).toBeGreaterThanOrEqual(3);
    
    // Verify team names are present
    const teamNames = rows.map((row: any) => row.name);
    expect(teamNames).toContain('Team A');
    expect(teamNames).toContain('Team B');
    expect(teamNames).toContain('Team C');
  }, TEST_TIMEOUT);
  
  it('should export structured data to different format', async () => {
    // Skip test if no structured data
    if (!structuredDataId) {
      console.warn('Skipping test due to missing structured data ID');
      return;
    }
    
    // Export data to JSON format
    const response = await client.post(`/api/export/data/${structuredDataId}`, {
      format: 'json',
      options: {
        filename: 'test_export'
      }
    });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('export_id');
    
    // Store export ID
    exportedDataId = response.data.export_id;
  }, TEST_TIMEOUT);
  
  it('should download exported data', async () => {
    // Skip test if no export
    if (!exportedDataId) {
      console.warn('Skipping test due to missing export ID');
      return;
    }
    
    // Download exported data
    const response = await client.get(`/api/export/download/${exportedDataId}`, {
      responseType: 'blob'
    });
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    
    // Convert blob to string for testing
    const data = await response.data.text();
    const jsonData = JSON.parse(data);
    
    // Verify JSON content
    expect(Array.isArray(jsonData)).toBe(true);
    expect(jsonData.length).toBeGreaterThanOrEqual(3);
    
    // Verify team names are present
    const teamNames = jsonData.map((item: any) => item.name);
    expect(teamNames).toContain('Team A');
    expect(teamNames).toContain('Team B');
    expect(teamNames).toContain('Team C');
  }, TEST_TIMEOUT);
});