import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createThemedStyles } from '../../constants/Theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

interface ErrorFallbackProps {
  error?: Error;
  onReset: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const styles = createThemedStyles((theme) => ({
    container: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background,
    },
    iconContainer: {
      marginBottom: theme.spacing.lg,
    },
    icon: {
      fontSize: 64,
      textAlign: 'center' as const,
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold as any,
      color: theme.colors.text,
      textAlign: 'center' as const,
      marginBottom: theme.spacing.md,
    },
    message: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textSecondary,
      textAlign: 'center' as const,
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    errorDetails: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textTertiary,
      textAlign: 'center' as const,
      marginBottom: theme.spacing.xl,
      fontFamily: 'monospace',
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    buttonText: {
      color: theme.colors.background,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semibold as any,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>⚕️</Text>
      </View>
      
      <Text style={styles.title}>Something went wrong</Text>
      
      <Text style={styles.message}>
        We apologize for the inconvenience. The MediStock app encountered an unexpected error.
        {'\n\n'}
        Your data is safe, and you can try refreshing the app.
      </Text>
      
      {__DEV__ && error && (
        <Text style={styles.errorDetails}>
          {error.name}: {error.message}
        </Text>
      )}
      
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you would send this to your error reporting service
    // Example: Sentry, Bugsnag, etc.
    // errorReportingService.captureException(error, {
    //   extra: errorInfo,
    //   tags: {
    //     component: 'ErrorBoundary',
    //     pharmacy_app: 'MediStock'
    //   }
    // });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          onReset={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for functional components to trigger error boundary
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: string) => {
    if (__DEV__) {
      console.error('Error caught by useErrorHandler:', error, errorInfo);
    }
    
    // This will trigger the nearest error boundary
    throw error;
  }, []);
}

export default ErrorBoundary;