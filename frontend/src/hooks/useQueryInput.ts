import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/apiClient'; // Assuming apiClient handles token implicitly or token is fetched separately
import { useNotification } from '../contexts/NotificationContext';

export interface QueryInputState {
    naturalLanguageQuery: string;
    setNaturalLanguageQuery: React.Dispatch<React.SetStateAction<string>>;
    queryName: string;
    setQueryName: React.Dispatch<React.SetStateAction<string>>;
    generatedSql: string | null;
    setGeneratedSql: (newSql: string | null) => void;
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
    const [generatedSql, setGeneratedSqlState] = useState<string | null>(null);
    const [isNaturalLanguage, setIsNaturalLanguage] = useState<boolean>(true);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [suggestedSql, setSuggestedSql] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState<boolean>(false);

    // Load initial state from session storage
    // useEffect(() => {
    //     const query = sessionStorage.getItem('queryText');
    //     if (query) setNaturalLanguageQuery(query);
    //     const name = sessionStorage.getItem('queryName');
    //     if (name) setQueryName(name);
    //     const isNatural = sessionStorage.getItem('isNaturalLanguage');
    //     setIsNaturalLanguage(isNatural === 'true');
    //     const sqlGenerated = sessionStorage.getItem('generatedSql');
    //     if (sqlGenerated) setGeneratedSqlState(sqlGenerated);
    // }, []);

    // Persist state to session storage
    // useEffect(() => { sessionStorage.setItem('queryText', naturalLanguageQuery || ''); }, [naturalLanguageQuery]);
    // useEffect(() => { sessionStorage.setItem('queryName', queryName || ''); }, [queryName]);
    // useEffect(() => { sessionStorage.setItem('isNaturalLanguage', String(isNaturalLanguage)); }, [isNaturalLanguage]);
    // useEffect(() => {
    //      // Only save non-null generated SQL
    //     if (generatedSql !== null) {
    //         sessionStorage.setItem('generatedSql', generatedSql);
    //     } else {
    //          // Optionally remove if cleared
    //          // sessionStorage.removeItem('generatedSql');
    //     }
    // }, [generatedSql]);

    // Handler to call translation API endpoint
    const handleTranslateQuery = useCallback(async () => {
        if (!naturalLanguageQuery.trim() || isTranslating) return;

        setIsTranslating(true);
        setGeneratedSqlState(null); // Use renamed setter
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
                setGeneratedSqlState(response.data.generated_sql); // Use renamed setter
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
    }, [naturalLanguageQuery, isTranslating, showNotification /*, setGeneratedSqlState, setValidationError, setSuggestedSql */]);

    const clearNaturalLanguageQuery = useCallback(() => {
        setNaturalLanguageQuery('');
    }, [/* setNaturalLanguageQuery */]);

    const clearGeneratedSql = useCallback(() => {
        setGeneratedSqlState(null); // Use renamed setter
        setValidationError(null);
        setSuggestedSql(null);
        // DO NOT interact with sessionStorage here directly
    }, [/* setGeneratedSqlState, setValidationError, setSuggestedSql */]);

    const applySuggestedFix = useCallback(() => {
        if (suggestedSql) {
            setGeneratedSqlState(suggestedSql); // Use renamed setter
            setSuggestedSql(null);       
            setValidationError(null);    
        }
    }, [suggestedSql /*, setGeneratedSqlState, setSuggestedSql, setValidationError */]);

    // When user manually edits the SQL text area, clear validation errors
    // This needs to be handled in the component's onChange for the SQL textarea,
    // maybe by calling a specific handler returned from this hook.
    // Let's add a handler for that.
    const handleSqlChange = useCallback((newSql: string | null) => { // Allow null
        setGeneratedSqlState(newSql); // Use renamed setter
        if (validationError) {
            setValidationError(null);
            setSuggestedSql(null);
        }
    }, [validationError /*, setGeneratedSqlState, setValidationError, setSuggestedSql */]);


    return {
        naturalLanguageQuery,
        setNaturalLanguageQuery,
        queryName,
        setQueryName,
        generatedSql,
        setGeneratedSql: handleSqlChange, 
        isNaturalLanguage,
        setIsNaturalLanguage,
        validationError,
        setValidationError, 
        suggestedSql,
        setSuggestedSql,    
        isTranslating,
        // Handlers
        handleTranslateQuery,
        clearNaturalLanguageQuery,
        clearGeneratedSql,
        applySuggestedFix
    };
}; 