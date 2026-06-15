import { usePostHog } from 'posthog-react-native';

export function useAnalytics() {
  const posthog = usePostHog();

  return {
    track(event: string, props?: Record<string, string | number | boolean>) {
      posthog?.capture(event, props);
    },
    screen(name: string, props?: Record<string, string | number | boolean>) {
      posthog?.screen(name, props);
    },
    identify(userId: string, traits?: Record<string, string | number | boolean>) {
      posthog?.identify(userId, traits);
    },
    reset() {
      posthog?.reset();
    },
  };
}

// Named event constants so screens stay in sync
export const EVENTS = {
  FEATURE_OPENED:       'feature_opened',
  AI_QUERY_SENT:        'ai_query_sent',
  DOCUMENT_UPLOADED:    'document_uploaded',
  SOS_TRIGGERED:        'sos_triggered',
  MESSAGE_SENT:         'chat_message_sent',
  SUBSCRIPTION_VIEWED:  'subscription_viewed',
  SUBSCRIPTION_STARTED: 'subscription_checkout_started',
  TAX_REPORT_EXPORTED:  'tax_report_exported',
  INVOICE_CREATED:      'invoice_created',
  IFTA_ENTRY_ADDED:     'ifta_entry_added',
  TRIP_LOGGED:          'trip_logged',
  FUEL_STOP_LOGGED:     'fuel_stop_logged',
  MAP_REPORT_CREATED:   'map_report_created',
} as const;
