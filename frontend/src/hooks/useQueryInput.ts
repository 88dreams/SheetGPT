import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient'; // Assuming apiClient handles token implicitly or token is fetched separately
import { useNotification } from '../contexts/NotificationContext';

export interface QueryInputState {
    naturalLanguageQuery: string;
    setNaturalLanguageQuery: React.Dispatch<React.SetStateAction<string>>;
    queryName: string;
    setQueryName: React.Dispatch<React.SetStateAction<string>>;
    generatedSql: string | null;
    setGeneratedSql: React.Dispatch<React.SetStateAction<string | null>>;
    isNaturalLanguage: boolean; // Mode for execution (might be less relevant here, more for execution hook)
    setIsNaturalLanguage: React.Dispatch<React.SetStateAction<boolean>>; // If kept here
    validationError: string | null;
    setValidationError: React.Dispatch<React.SetStateAction<string | null>>;
    suggestedSql: string | null;
    setSuggestedSql: React.Dispatch<React.SetStateAction<string | null>>;
    isTranslating: boolean;
    // Handlers
    handleTranslateQuery: () => Promise<void>;
    clearNaturalLanguageQuery: () => void;
    clearGeneratedSql: () => void;
    applySuggestedFix: () => void;
}

export const useQueryInput = (): QueryInputState => {
    const { showNotification } = useNotification();

    const [naturalLanguageQuery, setNaturalLanguageQuery] = useState<string>('');
    const [queryName, setQueryName] = useState<string>('');
    const [generatedSql, setGeneratedSql] = useState<string | null>(null);
    const [isNaturalLanguage, setIsNaturalLanguage] = useState<boolean>(true);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [suggestedSql, setSuggestedSql] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);

    // Load initial state from session storage
    useEffect(() => {
        const query = sessionStorage.getItem('queryText');
        if (query) setNaturalLanguageQuery(query);
        const name = sessionStorage.getItem('queryName');
        if (name) setQueryName(name);
        const isNatural = sessionStorage.getItem('isNaturalLanguage');
        setIsNaturalLanguage(isNatural === 'true');
        const sqlGenerated = sessionStorage.getItem('generatedSql');
        if (sqlGenerated) setGeneratedSql(sqlGenerated);
        // Note: Validation errors/suggestions are typically transient and not persisted
    }, []);

    // Persist state to session storage
    useEffect(() => { sessionStorage.setItem('queryText', naturalLanguageQuery || ''); }, [naturalLanguageQuery]);
    useEffect(() => { sessionStorage.setItem('queryName', queryName || ''); }, [queryName]);
    useEffect(() => { sessionStorage.setItem('isNaturalLanguage', String(isNaturalLanguage)); }, [isNaturalLanguage]);
    useEffect(() => {
         // Only save non-null generated SQL
        if (generatedSql !== null) {
            sessionStorage.setItem('generatedSql', generatedSql);
        } else {
             // Optionally remove if cleared
             // sessionStorage.removeItem('generatedSql');
        }
    }, [generatedSql]);

    // Handler to call translation API endpoint
    const handleTranslateQuery = useCallback(async () => {
        if (!naturalLanguageQuery.trim() || isTranslating) return;

        setIsTranslating(true);
        setGeneratedSql(null); // Clear previous SQL
        setValidationError(null);
        setSuggestedSql(null);

        try {
            // Note: Ensure apiClient handles authentication tokens automatically
            // Or modify to fetch token here if needed (ensureValidToken, getToken)
            const response = await apiClient.post('/db-management/query', {
                query: naturalLanguageQuery,
                natural_language: true,
                translate_only: true
            });

            if (response.data.generated_sql) {
                setGeneratedSql(response.data.generated_sql);
                showNotification('success', 'Translation successful!');
            } else {
                 showNotification('warning', 'Translation did not return SQL.');
            }
        } catch (error: any) {
            console.error('Error translating query:', error);
            // Check for auth error specifically if needed
             if (error.response?.status === 401) {
                 showNotification('error', 'Authentication error during translation. Please log in again.');
             } else {
                showNotification('error', `Translation failed: ${error.message || 'Unknown error'}`);
             }
        } finally {
            setIsTranslating(false);
        }
    }, [naturalLanguageQuery, isTranslating, showNotification]);

    const clearNaturalLanguageQuery = useCallback(() => {
        setNaturalLanguageQuery('');
    }, []);

    const clearGeneratedSql = useCallback(() => {
        setGeneratedSql(null);
        setValidationError(null); // Clear errors when SQL is cleared
        setSuggestedSql(null);
        // Maybe remove from session storage explicitly?
        sessionStorage.removeItem('generatedSql'); 
    }, []);

    const applySuggestedFix = useCallback(() => {
        if (suggestedSql) {
            setGeneratedSql(suggestedSql);
            setSuggestedSql(null);       // Clear suggestion
            setValidationError(null);    // Clear the associated error
        }
    }, [suggestedSql]);

    // When user manually edits the SQL text area, clear validation errors
    // This needs to be handled in the component's onChange for the SQL textarea,
    // maybe by calling a specific handler returned from this hook.
    // Let's add a handler for that.
    const handleSqlChange = useCallback((newSql: string) => {
        setGeneratedSql(newSql);
        if (validationError) {
            setValidationError(null);
            setSuggestedSql(null);
        }
    }, [validationError]);


    return {
        naturalLanguageQuery,
        setNaturalLanguageQuery,
        queryName,
        setQueryName,
        generatedSql,
        setGeneratedSql: handleSqlChange, // Expose the handler for direct changes
        isNaturalLanguage,
        setIsNaturalLanguage,
        validationError,
        setValidationError, // Might be needed by execution hook?
        suggestedSql,
        setSuggestedSql,    // Might be needed by execution hook?
        isTranslating,
        // Handlers
        handleTranslateQuery,
        clearNaturalLanguageQuery,
        clearGeneratedSql,
        applySuggestedFix
    };
}; 