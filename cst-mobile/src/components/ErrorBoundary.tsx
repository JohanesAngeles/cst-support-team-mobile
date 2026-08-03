import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';

interface State {
  hasError: boolean;
  errorMessage: string;
}

interface Props {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleRetry = () => this.setState({ hasError: false, errorMessage: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.container}>
        <Ionicons name="warning-outline" size={56} color="#E74C3C" />
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.message}>The app ran into an unexpected error. Please try again.</Text>
        <TouchableOpacity style={s.button} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={s.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B18',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#8FA0B3',
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#021B3A',
    borderRadius: 28,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#C8D2DC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
