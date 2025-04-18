import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import { FaFolder, FaFile, FaChevronRight, FaHome, FaSearch } from 'react-icons/fa';
import '../../styles/markdown.css';

interface DocItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocItem[];
}

interface DocContent {
  content: string;
  path: string;
}

// List of files that should be hidden from the documentation browser
const hiddenFiles = [
  'REFACTORING_PLAN.md', 
  'ENTITYLIST_REFACTORING.md', 
  'ENTITYLIST_TESTING.md', 
  'AWS_DEPLOYMENT.md'
];

// Check if a file is in the hidden list
const isHiddenFile = (path: string): boolean => {
  return hiddenFiles.some(hiddenFile => 
    path.toLowerCase().endsWith(hiddenFile.toLowerCase())
  );
};

// Define priority ordering for specific documents
const priorityDocs = [
  'README.md',
  'NEW_AGENT.md',
  'TECHNICAL_DESCRIPTION.md',
  'API_ARCHITECTURE.md',
  'CLAUDE_API_INTEGRATION.md'
];

const formatTitle = (name: string): string => {
  // Replace underscores with spaces
  let formattedTitle = name.replace(/_/g, ' ');
  
  // First apply standard capitalization to each word
  formattedTitle = formattedTitle
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Only convert exactly "Api" to "API" and "Ci Cd" to "CI CD"
  // Use word boundaries to ensure we only modify exact matches
  formattedTitle = formattedTitle
    .replace(/\bApi\b/g, 'API')
    .replace(/\bCi Cd\b/g, 'CI CD');
  
  return formattedTitle;
};

const DocumentationBrowser: React.FC = () => {
  const { '*': docPath } = useParams<{ '*': string }>();
  const navigate = useNavigate();
  const [docTree, setDocTree] = useState<DocItem[]>([]);
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DocItem[]>([]);

  // Fetch documentation structure
  useEffect(() => {
    const fetchDocTree = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('auth_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        console.log("Fetching documentation structure with token:", !!token);
        console.log("API base URL from window:", window.location.origin);
        
        // Determine API URL based on environment
        let apiUrl = '/api/v1/docs/structure';
        
        // Add retries for production environment
        let retries = 0;
        const maxRetries = 3;
        let success = false;
        let response;
        
        while (!success && retries < maxRetries) {
          try {
            console.log(`Attempt ${retries + 1} to fetch docs structure from: ${apiUrl}`);
            response = await fetch(apiUrl, { 
              headers,
              credentials: 'include',
              // Adding cache control to avoid stale responses
              cache: 'no-cache'
            });
            
            if (response.ok) {
              success = true;
            } else {
              console.warn(`Attempt ${retries + 1} failed with status: ${response.status}`);
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
              retries++;
            }
          } catch (fetchError) {
            console.error(`Fetch error on attempt ${retries + 1}:`, fetchError);
            retries++;
            if (retries < maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
            }
          }
        }
        
        if (success && response) {
          // Parse the response JSON
          let data: DocItem[];
          try {
            data = await response.json();
            console.log("Documentation structure loaded successfully:", data);
          } catch (jsonError) {
            console.error("Error parsing JSON response:", jsonError);
            console.log("Raw response:", await response.text());
            setIsLoading(false);
            return;
          }
          
          // Recursive function to filter items
          const filterHiddenFiles = (items: DocItem[]): DocItem[] => {
            return items
              .filter(item => {
                // If it's a file, check if it's in the hidden list
                if (item.type === 'file') {
                  return !isHiddenFile(item.path);
                }
                return true; // Keep all directories
              })
              .map(item => {
                // If it's a directory with children, filter its children
                if (item.type === 'directory' && item.children) {
                  return {
                    ...item,
                    children: filterHiddenFiles(item.children)
                  };
                }
                return item;
              })
              // Filter out empty directories after their children have been filtered
              .filter(item => !(item.type === 'directory' && item.children && item.children.length === 0));
          };
          
          // Filter hidden files first
          const filteredData = filterHiddenFiles(data);
          
          // Function to get priority index (lower = higher priority)
          const getPriorityIndex = (path: string): number => {
            const fileName = path.split('/').pop() || '';
            const index = priorityDocs.findIndex(doc => 
              doc.toLowerCase() === fileName.toLowerCase()
            );
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
          };
          
          // Custom sort function to prioritize specific documents
          const customSort = (a: DocItem, b: DocItem): number => {
            // First check if either item is in the priority list
            if (a.type === 'file' && b.type === 'file') {
              const priorityA = getPriorityIndex(a.path);
              const priorityB = getPriorityIndex(b.path);
              
              // If both are priority docs, sort by priority order
              if (priorityA < Number.MAX_SAFE_INTEGER && priorityB < Number.MAX_SAFE_INTEGER) {
                return priorityA - priorityB;
              }
              
              // If only one is a priority doc, it goes first
              if (priorityA < Number.MAX_SAFE_INTEGER) return -1;
              if (priorityB < Number.MAX_SAFE_INTEGER) return 1;
            }
            
            // Default sort: directories first, then alphabetically
            if (a.type === 'directory' && b.type !== 'directory') return -1;
            if (a.type !== 'directory' && b.type === 'directory') return 1;
            
            return a.name.localeCompare(b.name);
          };
          
          // Function to sort the tree recursively
          const sortTree = (items: DocItem[]): DocItem[] => {
            // Sort the current level
            const sortedItems = [...items].sort(customSort);
            
            // Recursively sort children
            return sortedItems.map(item => {
              if (item.type === 'directory' && item.children) {
                return {
                  ...item,
                  children: sortTree(item.children)
                };
              }
              return item;
            });
          };
          
          // Apply sorting to the filtered data
          const sortedData = sortTree(filteredData);
          console.log("Filtered and sorted documentation structure:", sortedData);
          
          // Set the tree state
          setDocTree(sortedData);
        } else {
          console.error('Failed to fetch documentation structure after retries');
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching documentation structure:', error);
        setIsLoading(false);
      }
    };

    fetchDocTree();
  }, []);

  // Fetch document content when path changes
  useEffect(() => {
    const fetchDocument = async () => {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const requestOptions = { 
        headers,
        credentials: 'include' as RequestCredentials,
        // Adding cache control to avoid stale responses
        cache: 'no-cache'
      };
      
      // Check if the requested document is in the hidden list
      if (docPath && isHiddenFile(docPath)) {
        console.log(`Attempted to access hidden document: ${docPath}`);
        // Redirect to main documentation page
        navigate('help');
        return;
      }
      
      // Function to fetch with retries
      const fetchWithRetries = async (url: string, options: RequestInit) => {
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            console.log(`Attempt ${retries + 1} to fetch content from: ${url}`);
            const response = await fetch(url, options);
            
            if (response.ok) {
              return { success: true, response };
            } else {
              console.warn(`Attempt ${retries + 1} failed with status: ${response.status}`);
              // Log response text for debugging
              try {
                const errorText = await response.text();
                console.warn(`Error response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
              } catch (e) {
                console.warn('Could not read error response text');
              }
            }
          } catch (error) {
            console.error(`Fetch error on attempt ${retries + 1}:`, error);
          }
          
          retries++;
          if (retries < maxRetries) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, retries), 5000);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        return { success: false, response: null };
      };
      
      if (!docPath) {
        // Load README.md as default
        try {
          console.log("Loading default README.md");
          const { success, response } = await fetchWithRetries('/api/v1/docs/content?path=README.md', requestOptions);
          
          if (success && response) {
            const content = await response.text();
            console.log("README.md loaded successfully");
            setDocContent({ content, path: 'README.md' });
          } else {
            console.error('Failed to fetch README.md after retries');
          }
        } catch (error) {
          console.error('Error fetching default document:', error);
        }
        return;
      }

      setIsLoading(true);
      try {
        console.log(`Loading document: ${docPath}`);
        const encodedPath = encodeURIComponent(docPath);
        const { success, response } = await fetchWithRetries(
          `/api/v1/docs/content?path=${encodedPath}`, 
          requestOptions
        );
        
        if (success && response) {
          const content = await response.text();
          console.log(`Document ${docPath} loaded successfully, content length: ${content.length}`);
          setDocContent({ content, path: docPath });
        } else {
          console.error(`Failed to fetch document content for ${docPath} after retries`);
          
          // If document fetch fails, try finding by filename without path
          if (docPath.includes('/')) {
            const fileName = docPath.split('/').pop() || '';
            console.log(`Trying to fetch by filename only: ${fileName}`);
            
            const { success: fileSuccess, response: fileResponse } = await fetchWithRetries(
              `/api/v1/docs/content?path=${encodeURIComponent(fileName)}`, 
              requestOptions
            );
            
            if (fileSuccess && fileResponse) {
              const content = await fileResponse.text();
              console.log(`Document found by filename ${fileName}, content length: ${content.length}`);
              setDocContent({ content, path: fileName });
            } else {
              console.error(`Could not find document by filename either: ${fileName}`);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching document content:', error);
      }
      setIsLoading(false);
    };

    fetchDocument();
  }, [docPath, navigate, isHiddenFile]);

  // Handle search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchInTree = (items: DocItem[], results: DocItem[] = []): DocItem[] => {
      items.forEach(item => {
        // Skip hidden files in search results
        if (item.type === 'file' && isHiddenFile(item.path)) {
          return;
        }
        
        if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push(item);
        }
        if (item.children) {
          searchInTree(item.children, results);
        }
      });
      return results;
    };

    setSearchResults(searchInTree(docTree));
  }, [searchTerm, docTree]);

  // Convert document links to work with our router and sanitize content
  const processMarkdown = (content: string): string => {
    // Add debug log to track content processing
    console.log("Processing markdown content of length:", content.length);
    
    // First, sanitize the content to remove any potential unsafe elements
    let processedContent = content;
    
    // Remove any script tags that might be in the content
    processedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove any onclick, onload, and other event handlers
    processedContent = processedContent.replace(/on\w+="[^"]*"/g, '');
    processedContent = processedContent.replace(/on\w+='[^']*'/g, '');
    
    // Remove iframes
    processedContent = processedContent.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Check if the content has been modified during sanitization
    if (processedContent.length !== content.length) {
      console.warn("Content was sanitized - potential security issues detected");
    }
    
    // Convert Markdown links to relative paths
    return processedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (url.startsWith('http')) {
        // External links remain unchanged
        console.log("External link preserved:", url);
        return match;
      }
      
      // Handle relative links
      const currentDir = docPath ? docPath.split('/').slice(0, -1).join('/') : '';
      let newPath = url;
      
      if (url.startsWith('./')) {
        newPath = url.substring(2);
      } else if (!url.startsWith('/')) {
        newPath = currentDir ? `${currentDir}/${url}` : url;
      } else if (url.startsWith('/')) {
        newPath = url.substring(1);
      }
      
      // Remove .md extension if present
      if (newPath.endsWith('.md')) {
        newPath = newPath.substring(0, newPath.length - 3);
      }
      
      // Create absolute path for React Router that works in both local and production environments
      // The absence of leading slash is critical for basename to work correctly in production
      const routePath = `help/${newPath}`;
      console.log(`Converted link: ${url} -> ${routePath}`);
      
      return `[${text}](/${routePath})`;
    });
  };

  // Function to check if a file is a priority file
  const isPriorityFile = (path: string): boolean => {
    return priorityDocs.some(doc => 
      path.toLowerCase().endsWith(doc.toLowerCase())
    );
  };
  
  // Process the tree to filter out priority files and empty directories
  const processTreeForRendering = (items: DocItem[]): DocItem[] => {
    // First, filter out priority files
    const filteredItems = items.filter(item => 
      !(item.type === 'file' && isPriorityFile(item.path))
    );
    
    // Process each remaining item
    return filteredItems.map(item => {
      // If it's a directory with children, process its children
      if (item.type === 'directory' && item.children) {
        const processedChildren = processTreeForRendering(item.children);
        return {
          ...item,
          children: processedChildren
        };
      }
      return item;
    }).filter(item => 
      // Remove empty directories
      !(item.type === 'directory' && item.children && item.children.length === 0)
    );
  };
  
  // Memoize the processed tree to avoid recomputing on each render
  const processedTree = React.useMemo(() => 
    processTreeForRendering(docTree), 
    [docTree]
  );
  
  const renderTree = (items: DocItem[], level = 0) => {
    return (
      <ul className={`pl-${level * 4} space-y-1`}>
        {items.map((item) => (
          <li key={item.path} className="py-1">
            <div className="flex items-center hover:bg-gray-100 rounded px-2 py-1">
              {item.type === 'directory' ? (
                <>
                  <FaFolder className="mr-2 text-blue-500" />
                  <span className="font-medium">{formatTitle(item.name)}</span>
                </>
              ) : (
                <Link 
                  to={`help/${item.path}`} 
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <FaFile className="mr-2 text-gray-500" />
                  <span>{formatTitle(item.name.replace('.md', ''))}</span>
                </Link>
              )}
            </div>
            {item.children && item.children.length > 0 && renderTree(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // Track errors for display
  const [error, setError] = useState<string | null>(null);

  // Error boundary function for document rendering
  const renderDocumentWithErrorHandling = () => {
    if (!docContent) {
      return <div className="text-center text-gray-500 mt-10">Select a document to view</div>;
    }

    try {
      const processedContent = processMarkdown(docContent.content);
      // Remove any script tags from the markdown content as an additional safety measure
      const sanitizedContent = processedContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      
      return (
        <div className="prose max-w-full">
          <ReactMarkdown
            rehypePlugins={[
              rehypeSanitize, // Sanitizes HTML in markdown to prevent XSS
              [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }] // Makes external links safe
            ]}
          >
            {sanitizedContent}
          </ReactMarkdown>
        </div>
      );
    } catch (err) {
      console.error('Error rendering markdown:', err);
      return (
        <div className="text-red-500 p-4 border border-red-200 rounded-md">
          <h3 className="font-bold">Error Rendering Document</h3>
          <p>There was an error rendering this document. Please try a different document or refresh the page.</p>
          <pre className="mt-2 bg-red-50 p-2 rounded text-sm overflow-auto">
            {err instanceof Error ? err.message : 'Unknown error'}
          </pre>
        </div>
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Search Results</h3>
            <ul className="space-y-1">
              {searchResults.map((item) => (
                <li key={item.path} className="py-1">
                  <Link 
                    to={`help/${item.path}`} 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaFile className="mr-2 text-gray-500" />
                    <span>{formatTitle(item.name.replace('.md', ''))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Documentation tree */}
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Documentation</h3>
          <div className="mb-2">
            <Link 
              to="help" 
              className="flex items-center text-gray-700 hover:text-blue-600"
            >
              <FaHome className="mr-2 text-gray-500" />
              <span>Home</span>
            </Link>
          </div>
          
          {/* Priority Documents Section */}
          {!isLoading && docTree.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-600 mb-1 text-sm">Quick Access</h4>
              <ul className="space-y-1 border-l-2 border-blue-100 pl-2">
                {/* Find and display priority documents from anywhere in the tree */}
                {(() => {
                  try {
                    // Flatten the tree to find priority documents
                    const flattenTree = (items: DocItem[], results: DocItem[] = []): DocItem[] => {
                      items.forEach(item => {
                        if (item.type === 'file') {
                          results.push(item);
                        }
                        if (item.children) {
                          flattenTree(item.children, results);
                        }
                      });
                      return results;
                    };
                    
                    const allFiles = flattenTree(docTree);
                    const priorityFiles = priorityDocs.map(doc => {
                      return allFiles.find(file => 
                        file.path.toLowerCase().endsWith(doc.toLowerCase())
                      );
                    }).filter(Boolean) as DocItem[];
                    
                    return priorityFiles.map((item) => (
                      <li key={`priority-${item.path}`} className="py-1">
                        <Link 
                          to={`help/${item.path}`} 
                          className="flex items-center text-gray-700 hover:text-blue-600"
                        >
                          <FaFile className="mr-2 text-blue-500" />
                          <span className="font-medium">{formatTitle(item.name.replace('.md', ''))}</span>
                        </Link>
                      </li>
                    ));
                  } catch (err) {
                    console.error('Error rendering priority files:', err);
                    return <li className="text-red-500">Error loading priority documents</li>;
                  }
                })()}
              </ul>
            </div>
          )}
          
          {/* Full Documentation Tree */}
          <div>
            <h4 className="font-medium text-gray-600 mb-1 text-sm">All Documentation</h4>
            {isLoading ? (
              <div className="text-gray-500">Loading documentation...</div>
            ) : docTree.length === 0 ? (
              <div className="text-amber-600 p-2 bg-amber-50 rounded-md text-sm">
                Unable to load documentation structure. Please try refreshing the page.
              </div>
            ) : (
              renderTree(processedTree)
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p className="font-medium">Error loading documentation</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : renderDocumentWithErrorHandling()}
      </div>
    </div>
  );
};

export default DocumentationBrowser;