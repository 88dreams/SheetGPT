import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import { FaFolder, FaFile, FaChevronRight, FaHome, FaSearch } from 'react-icons/fa';
import '../../styles/markdown.css';
import { api } from '../../utils/api';
import { DocItem, DocContent } from '../../services/docsService';

// List of files that should be hidden (ensure this list is accurate to the state before scroll fix)
const hiddenFiles = [
  'REFACTORING_PLAN.md', 
  'ENTITYLIST_REFACTORING.md', 
  'ENTITYLIST_TESTING.md', 
  'AWS_DEPLOYMENT.md',
  'DIGITAL_OCEAN_SSL_FIX.md',
  'PERFORMANCE_MEASUREMENTS.md',
  'PERFORMANCE_OPTIMIZATION.md',
  'RELATIONSHIP_LOADING.md',
  'SPORT_FIELD_FEATURE.md',
  'SPORTDATAMAPPER_ISSUE.md',
  'NETLIFY_DEPLOYMENT_STEPS.md',
  'PRODUCTION_PREPARATION.md'
];

const isHiddenFile = (path: string): boolean => {
  return hiddenFiles.some(hiddenFile => path.toLowerCase().endsWith(hiddenFile.toLowerCase()));
};

const priorityDocs = [
  'README.md',
  'NEW_AGENT.md',
  'TECHNICAL_DESCRIPTION.md',
  'API_ARCHITECTURE.md',
  'CLAUDE_API_INTEGRATION.md'
];

const formatTitle = (name: string): string => {
  let formattedTitle = name.replace(/_/g, ' ');
  formattedTitle = formattedTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  formattedTitle = formattedTitle.replace(/\bApi\b/g, 'API').replace(/\bCi Cd\b/g, 'CI CD');
  return formattedTitle;
};

const DocumentationBrowser: React.FC = () => {
  const { '*': docPath } = useParams<{ '*': string }>();
  console.log(`[DEBUG] DocumentationBrowser: Rendering. docPath: "${docPath}"`); // Kept one basic render log

  const navigate = useNavigate();
  const [docTree, setDocTree] = useState<DocItem[]>([]);
  const [docContent, setDocContent] = useState<DocContent | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(true); // For tree loading
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false); // For content loading
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DocItem[]>([]);
  const [error, setError] = useState<string | null>(null); // General error, or can be split too

  // Define fetchDocument using useCallback so it can be called from event handlers
  const fetchDocumentContent = useCallback(async (pathToFetch?: string | null) => {
    const currentPath = pathToFetch === undefined ? docPath : pathToFetch; // Use docPath if no arg, else explicit path

    if (currentPath && isHiddenFile(currentPath)) {
      navigate(''); // Navigate to home/default if trying to access a hidden file directly
      return;
    }

    setDocContent(null);
    setIsLoadingContent(true);
    setError(null);

    if (!currentPath) { // Handles empty string for default README or null if explicit
      try {
        const content = await api.docs.getContent('README.md');
        setDocContent({ content, path: 'README.md' });
      } catch (err) {
        console.error('Error fetching README.md content:', err);
        setError("Failed to load README.md. Please try again later.");
      } finally {
        setIsLoadingContent(false);
      }
      return;
    }

    try {
      const content = await api.docs.getContent(currentPath);
      setDocContent({ content, path: currentPath });
    } catch (err) {
      console.error(`Error loading document ${currentPath}:`, err);
      setError(`Failed to load document: ${currentPath}`);
      if (currentPath.includes('/')) {
        const fileName = currentPath.split('/').pop() || '';
        try {
          const fallbackContent = await api.docs.getContent(fileName);
          setDocContent({ content: fallbackContent, path: fileName });
          setError(null);
        } catch (fallbackError) {
          console.error(`Error loading fallback document ${fileName}:`, fallbackError);
        }
      }
    } finally {
      setIsLoadingContent(false);
    }
  }, [docPath, navigate]);

  // Fetch documentation structure
  useEffect(() => {
    const fetchDocTree = async () => {
      setIsLoadingTree(true); 
      try {
        const data = await api.docs.getStructure();
        const filterHiddenFiles = (items: DocItem[]): DocItem[] => {
          return items
            .filter(item => {
              if (item.type === 'file') { return !isHiddenFile(item.path); }
              return true;
            })
            .map(item => {
              if (item.type === 'directory' && item.children) {
                return { ...item, children: filterHiddenFiles(item.children) };
              }
              return item;
            })
            .filter(item => !(item.type === 'directory' && item.children && item.children.length === 0));
        };
        const filteredData = filterHiddenFiles(data || []);

        const getPriorityIndex = (path: string): number => {
          const fileName = path.split('/').pop() || '';
          const index = priorityDocs.findIndex(doc => doc.toLowerCase() === fileName.toLowerCase());
          return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };
        const customSort = (a: DocItem, b: DocItem): number => {
          if (a.type === 'file' && b.type === 'file') {
            const priorityA = getPriorityIndex(a.path);
            const priorityB = getPriorityIndex(b.path);
            if (priorityA < Number.MAX_SAFE_INTEGER && priorityB < Number.MAX_SAFE_INTEGER) {
              return priorityA - priorityB;
            }
            if (priorityA < Number.MAX_SAFE_INTEGER) return -1;
            if (priorityB < Number.MAX_SAFE_INTEGER) return 1;
          }
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        };
        const sortTree = (items: DocItem[]): DocItem[] => {
          const sortedItems = [...items].sort(customSort);
          return sortedItems.map(item => {
            if (item.type === 'directory' && item.children) {
              return { ...item, children: sortTree(item.children) };
            }
            return item;
          });
        };
        const sortedData = sortTree(filteredData);
        setDocTree(sortedData);
        setError(null); 
      } catch (err) {
        console.error('Failed to fetch documentation structure:', err);
        setError("Failed to load documentation structure. Please try again later.");
      } finally {
        setIsLoadingTree(false); 
      }
    };
    fetchDocTree();
  }, []); 

  // useEffect for fetching document content when docPath changes
  useEffect(() => {
    if (docPath !== undefined) { // Check if docPath has been initialized by useParams
      fetchDocumentContent(); // Call the memoized function
    }
  }, [docPath, fetchDocumentContent]); // Depend on docPath and the memoized fetch function

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

  // Convert document links to work with our router
  const processMarkdown = (content: string): string => {
    console.log("Processing markdown links, content length:", content.length);    
    // Convert Markdown links to relative paths for react-router
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (url.startsWith('http')) {
        return match; // External links remain unchanged
      }
      const currentDir = docPath ? docPath.split('/').slice(0, -1).join('/') : '';
      let newPath = url;
      if (url.startsWith('./')) {
        newPath = url.substring(2);
      } else if (!url.startsWith('/')) {
        newPath = currentDir ? `${currentDir}/${url}` : url;
      } else if (url.startsWith('/')) {
        newPath = url.substring(1);
      }
      if (newPath.endsWith('.md')) {
        newPath = newPath.substring(0, newPath.length - 3);
      }
      const routePath = newPath;
      // console.log(`Converted link: ${url} -> /${routePath}`); // Debug for links
      return `[${text}](/${routePath})`; // Ensure links are suitable for react-router
    });
  };

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
                  to={`${item.path}`}
                  className="flex items-center text-gray-700 hover:text-blue-600"
                  onClick={() => {
                    // Optionally, can also save scroll position here if preferred, 
                    // but useEffect on docPath is generally better for post-navigation effects.
                  }}
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

  // Error boundary function for document rendering
  const renderDocumentWithErrorHandling = () => {
    if (!docContent) {
      return <div className="text-center text-gray-500 mt-10">Select a document to view</div>;
    }
    try {
      const processedContentWithLinks = processMarkdown(docContent.content);
      console.log("[DEBUG] Content for ReactMarkdown (type, first 200 chars):", typeof processedContentWithLinks, processedContentWithLinks.substring(0, 200));
      
      const sanitizeConfig = {
        allowedTags: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'ul', 'ol', 'li', 'blockquote',
          'strong', 'em', 'code', 'pre', 'hr',
          'br', 'a', 'table', 'thead', 'tbody',
          'tr', 'th', 'td'
        ],
        allowedAttributes: {
          a: ['href', 'title'],
          code: ['className'], // For syntax highlighting like language-js
          th: ['scope', 'align'],
          td: ['align']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedClasses: {
          code: [/^language-.*$/]
        },
        // Add other rehype-sanitize options if needed, e.g., to handle specific protocols or attributes.
      };
      
      return (
        <div className="prose max-w-full">
          <ReactMarkdown
            rehypePlugins={[
              [rehypeSanitize, sanitizeConfig],
              [rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] }]
            ]}
          >
            {processedContentWithLinks}
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
                    to={`${item.path}`} 
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
              to="" 
              className="flex items-center text-gray-700 hover:text-blue-600"
            >
              <FaHome className="mr-2 text-gray-500" />
              <span>Home</span>
            </Link>
          </div>
          
          {/* Priority Documents Section */}
          {!isLoadingTree && docTree.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-600 mb-1 text-sm">Quick Access</h4>
              <ul className="space-y-1 border-l-2 border-blue-100 pl-2">
                {(() => {
                  try {
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
                          to={`${item.path}`} 
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
            {(() => {
              if (isLoadingTree) { // Use isLoadingTree for the tree loader
                return <div className="text-gray-500">Loading documentation...</div>;
              }
              if (docTree.length === 0 && !error) { 
                return <div className="text-amber-600 p-2 bg-amber-50 rounded-md text-sm">Unable to load documentation structure.</div>;
              }
              if (error && docTree.length === 0) { // Error specific to tree loading
                return <div className="text-red-500 p-2 bg-red-50 rounded-md text-sm">Error loading structure.</div>;
              }
              return renderTree(docTree);
            })()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {error && !isLoadingContent && !docContent && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p className="font-medium">Error Loading Document</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              className="mt-2 text-xs text-gray-700 hover:underline"
              onClick={() => {
                setError(null); 
                fetchDocumentContent(docPath || undefined); // Refetch current or default if docPath is empty
              }}
            >
              Try Again
            </button>
            <button 
              className="mt-2 ml-2 text-xs text-gray-700 hover:underline"
              onClick={() => {
                setError(null); 
                navigate('/help'); // This will trigger fetchDocument for default via docPath change
              }}
            >
              Go to Docs Home
            </button>
          </div>
        )}
        
        {isLoadingContent ? ( 
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : docContent ? (
          renderDocumentWithErrorHandling() 
        ) : !error && !isLoadingContent ? ( // If not loading, no docContent, and no error yet
          <div className="text-center text-gray-500 mt-10">Select a document to view.</div>
        ) : null }
      </div>
    </div>
  );
};

export default DocumentationBrowser;