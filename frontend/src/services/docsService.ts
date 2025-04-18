import { request } from '../utils/apiClient';

export interface DocItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocItem[];
}

export interface DocContent {
  content: string;
  path: string;
}

export const docsService = {
  getStructure: (): Promise<DocItem[]> =>
    request('/docs/structure', { 
      requiresAuth: true,
      headers: {
        'Accept': 'application/json'
      }
    }),

  getContent: (path: string): Promise<string> =>
    request(`/docs/content?path=${encodeURIComponent(path)}`, { 
      requiresAuth: true,
      responseType: 'text',
      headers: {
        'Accept': 'text/plain, text/markdown'
      }
    })
};

export default docsService;