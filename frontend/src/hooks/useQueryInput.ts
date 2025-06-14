import { useState, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { apiClient } from '../utils/apiClient';

export const useQueryInput = () => {
  const { showNotification } = useNotification();

  const [queryName, setQueryName] = useState('');
  const [nlq, setNlq] = useState('');
  const [sql, setSql] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isNaturalLanguage, setIsNaturalLanguage] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [suggestedSql, setSuggestedSql] = useState<string | null>(null);

  const handleTranslateQuery = useCallback(async () => {
    if (!nlq.trim() || isTranslating) return;

    setIsTranslating(true);
    setSql(null);
    setValidationError(null);
    setSuggestedSql(null);

    try {
      const response = await apiClient.post('/db-management/query', {
        query: nlq,
        natural_language: true,
        translate_only: true,
      });

      if (response.data.generated_sql) {
        setSql(response.data.generated_sql);
        showNotification('success', 'Translation successful!');
      } else {
        showNotification('warning', 'Translation did not return SQL.');
      }
    } catch (error: any) {
      console.error('Error translating query:', error);
      showNotification('error', `Translation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsTranslating(false);
    }
  }, [nlq, isTranslating, showNotification]);
  
  const clearNlq = useCallback(() => setNlq(''), []);
  const clearSql = useCallback(() => {
    setSql(null);
    setValidationError(null);
    setSuggestedSql(null);
  }, []);
  
  const applySuggestedFix = useCallback(() => {
    if (suggestedSql) {
      setSql(suggestedSql);
      setSuggestedSql(null);
      setValidationError(null);
    }
  }, [suggestedSql]);

  const clearAll = useCallback(() => {
    setQueryName('');
    setNlq('');
    setSql(null);
    setLimit(100);
    setValidationError(null);
    setSuggestedSql(null);
  }, []);

  return {
    queryName,
    setQueryName,
    nlq,
    setNlq,
    sql,
    setSql,
    limit,
    setLimit,
    isTranslating,
    isNaturalLanguage,
    setIsNaturalLanguage,
    validationError,
    setValidationError,
    suggestedSql,
    setSuggestedSql,
    handleTranslateQuery,
    clearNlq,
    clearSql,
    applySuggestedFix,
    clearAll,
  };
}; 