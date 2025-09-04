import React from 'react';
import { View } from 'react-native';
import { AIInsightsDashboard } from '../../components/ai/AIInsightsDashboard';

export default function AIInsightsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <AIInsightsDashboard />
    </View>
  );
}
