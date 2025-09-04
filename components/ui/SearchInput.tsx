import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
} from 'react-native';
import { Theme } from '../../constants/Theme';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  data?: any;
}

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (item: SearchResult) => void;
  renderItem?: (item: SearchResult) => React.ReactNode;
  loading?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  value?: string;
  onChangeText?: (text: string) => void;
  clearOnSelect?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search...',
  onSearch,
  onSelect,
  renderItem,
  loading = false,
  debounceMs = 300,
  minQueryLength = 1,
  maxResults = 10,
  value,
  onChangeText,
  clearOnSelect = true,
}) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const searchTimeout = useRef<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults.slice(0, maxResults));
      setShowResults(searchResults.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, minQueryLength, maxResults]);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
    onChangeText?.(text);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Set new timeout for debounced search
    searchTimeout.current = window.setTimeout(() => {
      handleSearch(text);
    }, debounceMs);
  }, [handleSearch, debounceMs, onChangeText]);

  const handleSelectItem = useCallback((item: SearchResult) => {
    onSelect(item);
    if (clearOnSelect) {
      setQuery('');
      onChangeText?.('');
    }
    setShowResults(false);
    inputRef.current?.blur();
  }, [onSelect, clearOnSelect, onChangeText]);

  const handleClear = useCallback(() => {
    setQuery('');
    onChangeText?.('');
    setResults([]);
    setShowResults(false);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
  }, [onChangeText]);

  const renderSearchResult = useCallback(({ item }: { item: SearchResult }) => {
    if (renderItem) {
      return (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => handleSelectItem(item)}
        >
          {renderItem(item)}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectItem(item)}
      >
        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </View>
          {item.subtitle && (
            <Text style={styles.resultSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
          {item.description && (
            <Text style={styles.resultDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [renderItem, handleSelectItem]);

  return (
    <View style={styles.container}>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
      ]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.textTertiary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding results to allow for item selection
            setTimeout(() => setShowResults(false), 150);
          }}
        />
        
        {(query.length > 0 || isSearching) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {isSearching && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    height: Theme.components.input.height.md,
  },
  
  inputFocused: {
    borderColor: Theme.colors.primary,
    ...Theme.shadows.sm,
  },
  
  input: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    color: Theme.colors.text,
  },
  
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.sm,
  },
  
  clearButtonText: {
    color: Theme.colors.background,
    fontSize: 18,
    fontWeight: Theme.typography.weights.bold,
    lineHeight: 20,
  },
  
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: Theme.borderRadius.md,
    borderBottomRightRadius: Theme.borderRadius.md,
    ...Theme.shadows.lg,
    zIndex: 1001,
  },
  
  resultsList: {
    flex: 1,
  },
  
  resultItem: {
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  
  resultContent: {
    flex: 1,
  },
  
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  
  resultTitle: {
    flex: 1,
    fontSize: Theme.typography.sizes.md,
    fontWeight: Theme.typography.weights.semibold,
    color: Theme.colors.text,
  },
  
  badge: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.sm,
    marginLeft: Theme.spacing.sm,
  },
  
  badgeText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.background,
    fontWeight: Theme.typography.weights.medium,
  },
  
  resultSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  
  resultDescription: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textTertiary,
  },
  
  loadingContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: Theme.borderRadius.md,
    borderBottomRightRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    ...Theme.shadows.md,
  },
  
  loadingText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
  },
});

export default SearchInput;