import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
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
        const response = await fetch('/api/v1/docs/structure', { 
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const data: DocItem[] = await response.json();
          console.log("Documentation structure loaded successfully:", data);
          setDocTree(data);
        } else {
          console.error('Failed to fetch documentation structure:', response.status, await response.text());
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
        credentials: 'include' as RequestCredentials
      };
      
      if (!docPath) {
        // Load README.md as default
        try {
          console.log("Loading default README.md");
          const response = await fetch('/api/v1/docs/content?path=README.md', requestOptions);
          if (response.ok) {
            const content = await response.text();
            console.log("README.md loaded successfully");
            setDocContent({ content, path: 'README.md' });
          } else {
            console.error('Failed to fetch README.md:', response.status, await response.text());
          }
        } catch (error) {
          console.error('Error fetching default document:', error);
        }
        return;
      }

      setIsLoading(true);
      try {
        console.log(`Loading document: ${docPath}`);
        const response = await fetch(`/api/v1/docs/content?path=${encodeURIComponent(docPath)}`, requestOptions);
        if (response.ok) {
          const content = await response.text();
          console.log(`Document ${docPath} loaded successfully`);
          setDocContent({ content, path: docPath });
        } else {
          console.error('Failed to fetch document content:', response.status, await response.text());
        }
      } catch (error) {
        console.error('Error fetching document content:', error);
      }
      setIsLoading(false);
    };

    fetchDocument();
  }, [docPath]);

  // Handle search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchInTree = (items: DocItem[], results: DocItem[] = []): DocItem[] => {
      items.forEach(item => {
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
    // Convert Markdown links to relative paths
    return content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (url.startsWith('http')) {
        // External links remain unchanged
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
      
      return `[${text}](#/help/${newPath})`;
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
                  <span className="font-medium">{item.name}</span>
                </>
              ) : (
                <Link 
                  to={`/help/${item.path}`} 
                  className="flex items-center text-gray-700 hover:text-blue-600"
                >
                  <FaFile className="mr-2 text-gray-500" />
                  <span>{item.name.replace('.md', '')}</span>
                </Link>
              )}
            </div>
            {item.children && renderTree(item.children, level + 1)}
          </li>
        ))}
      </ul>
    );
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
                    to={`/help/${item.path}`} 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaFile className="mr-2 text-gray-500" />
                    <span>{item.name.replace('.md', '')}</span>
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
              to="/help" 
              className="flex items-center text-gray-700 hover:text-blue-600"
            >
              <FaHome className="mr-2 text-gray-500" />
              <span>Home</span>
            </Link>
          </div>
          {isLoading ? (
            <div className="text-gray-500">Loading documentation...</div>
          ) : (
            renderTree(docTree)
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : docContent ? (
          <div className="prose max-w-full">
            <ReactMarkdown>{processMarkdown(docContent.content)}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-10">Select a document to view</div>
        )}
      </div>
    </div>
  );
};

export default DocumentationBrowser;