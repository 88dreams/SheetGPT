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

  getContent: (path: string): Promise<string> => {
    console.log(`Document content request initiated for: ${path}`);
    
    // Always try special endpoint first for DEV_INTRO_TESTING.md
    if (path === 'DEV_INTRO_TESTING.md') {
      console.log('Using direct special endpoint for DEV_INTRO_TESTING.md');
      return request(`/docs/special/dev_intro_testing`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error('Special endpoint for DEV_INTRO_TESTING.md failed, using fallback content');
        
        // If all attempts fail, return hardcoded content as a last resort
        return `# Development and Testing Introduction

This is a fallback version of the document since the server couldn't load it.

## Testing Overview

This project uses Jest for frontend testing and pytest for backend testing.

* Frontend: React Testing Library with Jest
* Backend: pytest with SQLAlchemy test fixtures

## For more information

Please try again later when the document can be properly loaded.`;
      });
    }
    
    // First, look for problematic files that should use the special endpoint
    const knownProblematicFiles: Record<string, string> = {
      'architecture/API_ARCHITECTURE.md': 'api_architecture',
      'features/SMART_COLUMN.md': 'smart_column',
      'features/VIRTUALIZATION.md': 'virtualization',
      'maintenance/TROUBLESHOOTING.md': 'troubleshooting',
      'API_ARCHITECTURE.md': 'api_architecture',
      'SMART_COLUMN.md': 'smart_column',
      'VIRTUALIZATION.md': 'virtualization',
      'TROUBLESHOOTING.md': 'troubleshooting'
    };
    
    // Handle each problematic file with direct special endpoint
    // API_ARCHITECTURE.md
    if (path === 'architecture/API_ARCHITECTURE.md' || path === 'API_ARCHITECTURE.md') {
      console.log('Using direct special endpoint for API_ARCHITECTURE.md');
      return request(`/docs/special/api_architecture`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error('Special endpoint failed for API_ARCHITECTURE.md');
        return getFallbackContent('API_ARCHITECTURE.md');
      });
    }
    
    // SMART_COLUMN.md
    if (path === 'features/SMART_COLUMN.md' || path === 'SMART_COLUMN.md') {
      console.log('Using direct special endpoint for SMART_COLUMN.md');
      return request(`/docs/special/smart_column`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error('Special endpoint failed for SMART_COLUMN.md');
        return getFallbackContent('SMART_COLUMN.md');
      });
    }
    
    // VIRTUALIZATION.md
    if (path === 'features/VIRTUALIZATION.md' || path === 'VIRTUALIZATION.md') {
      console.log('Using direct special endpoint for VIRTUALIZATION.md');
      return request(`/docs/special/virtualization`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error('Special endpoint failed for VIRTUALIZATION.md');
        return getFallbackContent('VIRTUALIZATION.md');
      });
    }
    
    // TROUBLESHOOTING.md
    if (path === 'maintenance/TROUBLESHOOTING.md' || path === 'TROUBLESHOOTING.md') {
      console.log('Using direct special endpoint for TROUBLESHOOTING.md');
      return request(`/docs/special/troubleshooting`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error('Special endpoint failed for TROUBLESHOOTING.md');
        return getFallbackContent('TROUBLESHOOTING.md');
      });
    }
    
    // If it's another known problematic file, use the special endpoint
    if (knownProblematicFiles[path]) {
      const specialKey = knownProblematicFiles[path];
      console.log(`Using special document endpoint for ${path} -> ${specialKey}`);
      
      return request(`/docs/special/${specialKey}`, { 
        requiresAuth: true,
        responseType: 'text',
        headers: {
          'Accept': 'text/plain, text/markdown'
        }
      }).catch(error => {
        console.error(`Special endpoint failed for ${specialKey}`, error);
        
        // Fall back to standard approach if special endpoint fails
        console.log("Falling back to standard endpoint");
        return getContentStandard(path);
      });
    }
    
    // Otherwise use standard approach
    return getContentStandard(path);
  }
};

// Standard document content loading method
function getContentStandard(path: string): Promise<string> {
  // For URL encoding, we'll build the query parameter manually
  // with explicit encoding of each path segment
  const segments = path.split('/');
  const encodedSegments = segments.map(segment => encodeURIComponent(segment));
  const encodedPath = encodedSegments.join('/');
  
  console.log(`Standard document request for ${path}`);
  console.log(`Encoded path: ${encodedPath}`);
  
  return request(`/docs/content?path=${encodedPath}`, { 
    requiresAuth: true,
    responseType: 'text',
    headers: {
      'Accept': 'text/plain, text/markdown'
    }
  });
};

// Provide static fallback content for problematic files
function getFallbackContent(documentName: string): string {
  const filename = documentName.replace(/^.*[\\/]/, ''); // Extract just the filename
  
  // Generic fallback template
  const fallbackTemplate = (title: string) => `# ${title}

**Note: This is a fallback version of this document.**

The document could not be loaded from the server. 

## Content Temporarily Unavailable

The complete content of this document is temporarily unavailable due to technical issues.

* The document you requested was: \`${documentName}\`
* There was an issue loading this document
* Please try again later

## Alternative Documents

In the meantime, you might want to check these related documents:

* [README](/README)
* [Technical Description](/architecture/TECHNICAL_DESCRIPTION)
`;

  // Specific fallbacks for known documents
  const fallbacks: Record<string, string> = {
    'API_ARCHITECTURE.md': `# API Architecture

**Note: This is a fallback version of this document.**

The API architecture documentation is temporarily unavailable.

## Main API Components

- FastAPI backend with RESTful endpoints
- Authentication via JWT tokens
- PostgreSQL database with SQLAlchemy ORM
- Comprehensive error handling system

Please check back later for the complete documentation.`,

    'SMART_COLUMN.md': `# Smart Column Feature

**Note: This is a fallback version of this document.**

The Smart Column feature documentation is temporarily unavailable.

## Key Features

- Intelligent data type detection
- Automatic formatting of cell contents
- Support for relationship linking
- Custom rendering based on data type

Please check back later for the complete documentation.`,

    'VIRTUALIZATION.md': `# Virtualization

**Note: This is a fallback version of this document.**

The Virtualization documentation is temporarily unavailable.

## Performance Benefits

- Efficient rendering for large datasets
- Only renders visible rows in the viewport
- Improved scrolling performance
- Reduced memory usage

Please check back later for the complete documentation.`,

    'TROUBLESHOOTING.md': `# Troubleshooting Guide

**Note: This is a fallback version of this document.**

The Troubleshooting guide is temporarily unavailable.

## Common Issues

- Authentication problems
- Database connection issues
- Frontend rendering glitches
- API error responses

Please check back later for the complete troubleshooting guide.`,

    'DEV_INTRO_TESTING.md': `# Development and Testing Introduction

**Note: This is a fallback version of this document.**

The Development and Testing documentation is temporarily unavailable.

## Testing Framework

- Frontend: Jest with React Testing Library
- Backend: pytest with SQLAlchemy fixtures
- Integration testing with Playwright

Please check back later for the complete documentation.`
  };

  // Return specific fallback if available, otherwise use generic template
  return fallbacks[filename] || fallbackTemplate(filename.replace('.md', ''));
};

export default docsService;