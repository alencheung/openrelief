export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [_ in never]: never
    } & {
      emergency_types: {
        Row: {
          id: number
          slug: string
          name: string
          description: string | null
          icon: string | null
          color: string
          default_radius: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          slug: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string
          default_radius?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          slug?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string
          default_radius?: number
          is_active?: boolean
          created_at?: string
        }
      }
      emergency_events: {
        Row: {
          id: string
          type_id: number
          reporter_id: string
          title: string
          description: string | null
          location: string
          radius_meters: number
          severity: number
          status: 'pending' | 'active' | 'resolved' | 'expired'
          trust_weight: number
          confirmation_count: number
          dispute_count: number
          metadata: Json
          created_at: string
          updated_at: string
          expires_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          type_id: number
          reporter_id: string
          title: string
          description?: string | null
          location: string
          radius_meters?: number
          severity: number
          status?: 'pending' | 'active' | 'resolved' | 'expired'
          trust_weight?: number
          confirmation_count?: number
          dispute_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
          expires_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          type_id?: number
          reporter_id?: string
          title?: string
          description?: string | null
          location?: string
          radius_meters?: number
          severity?: number
          status?: 'pending' | 'active' | 'resolved' | 'expired'
          trust_weight?: number
          confirmation_count?: number
          dispute_count?: number
          metadata?: Json
          created_at?: string
          updated_at?: string
          expires_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
      event_confirmations: {
        Row: {
          id: string
          event_id: string
          user_id: string
          confirmation_type: 'confirm' | 'dispute'
          trust_weight: number
          location: string | null
          distance_from_event: number | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          confirmation_type: 'confirm' | 'dispute'
          trust_weight?: number
          location?: string | null
          distance_from_event?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          confirmation_type?: 'confirm' | 'dispute'
          trust_weight?: number
          location?: string | null
          distance_from_event?: number | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          user_id: string
          trust_score: number
          last_known_location: string | null
          active_session_start: string | null
          notification_preferences: Json
          privacy_settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          trust_score?: number
          last_known_location?: string | null
          active_session_start?: string | null
          notification_preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          trust_score?: number
          last_known_location?: string | null
          active_session_start?: string | null
          notification_preferences?: Json
          privacy_settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          user_id: string
          topic_id: number
          is_active: boolean
          notification_radius: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          topic_id: number
          is_active?: boolean
          notification_radius?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          topic_id?: number
          is_active?: boolean
          notification_radius?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_notification_settings: {
        Row: {
          user_id: string
          topic_id: number
          min_severity: number
          max_distance: number
          is_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          topic_id: number
          min_severity?: number
          max_distance?: number
          is_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          topic_id?: number
          min_severity?: number
          max_distance?: number
          is_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_trust_history: {
        Row: {
          id: string
          user_id: string
          event_id: string
          action_type: 'report' | 'confirm' | 'dispute'
          trust_change: number
          previous_score: number
          new_score: number
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          action_type: 'report' | 'confirm' | 'dispute'
          trust_change: number
          previous_score: number
          new_score: number
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          action_type?: 'report' | 'confirm' | 'dispute'
          trust_change?: number
          previous_score?: number
          new_score?: number
          reason?: string | null
          created_at?: string
        }
      }
      notification_queue: {
        Row: {
          id: string
          user_id: string
          event_id: string
          notification_type: 'new_event' | 'update' | 'resolution'
          title: string
          message: string
          data: Json
          status: 'pending' | 'sent' | 'failed' | 'cancelled'
          attempts: number
          max_attempts: number
          scheduled_at: string
          sent_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          notification_type: 'new_event' | 'update' | 'resolution'
          title: string
          message: string
          data?: Json
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          attempts?: number
          max_attempts?: number
          scheduled_at?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          notification_type?: 'new_event' | 'update' | 'resolution'
          title?: string
          message?: string
          data?: Json
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          attempts?: number
          max_attempts?: number
          scheduled_at?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_value: number
          tags: Json
          created_at: string
        }
        Insert: {
          id?: string
          metric_name: string
          metric_value: number
          tags?: Json
          created_at?: string
        }
        Update: {
          id?: string
          metric_name?: string
          metric_value?: number
          tags?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    } & {
      active_emergency_events: {
        Row: {
          id: string
          type_id: number
          reporter_id: string
          title: string
          description: string | null
          location: string
          radius_meters: number
          severity: number
          status: 'pending' | 'active' | 'resolved' | 'expired'
          trust_weight: number
          confirmation_count: number
          dispute_count: number
          metadata: Json
          created_at: string
          updated_at: string
          expires_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: never
        Update: never
      }
      user_trust_scores: {
        Row: {
          user_id: string
          trust_score: number
          last_activity: string
        }
        Insert: never
        Update: never
      }
    }
    Functions: {
      [_ in never]: never
    } & {
      calculate_trust_score: {
        Args: {
          p_user_id: string
          p_event_type?: string
        }
        Returns: number
      }
      calculate_event_consensus: {
        Args: {
          p_event_id: string
        }
        Returns: void
      }
      get_users_for_alert_dispatch: {
        Args: {
          p_event_id: string
          p_max_distance?: number
        }
        Returns: {
          user_id: string
          fcm_token: string | null
          email: string | null
          distance: number
          relevance_score: number
        }[]
      }
      get_nearby_emergency_events: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_meters: number
          p_status?: Database['public']['Enums']['emergency_events_status'][] | null
          p_min_severity?: number | null
        }
        Returns: {
          id: string
          type_id: number
          reporter_id: string
          title: string
          description: string | null
          location: string
          radius_meters: number
          severity: number
          status: Database['public']['Enums']['emergency_events_status']
          trust_weight: number
          confirmation_count: number
          dispute_count: number
          created_at: string
          updated_at: string
          distance: number
        }[]
      }
      get_user_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_reports: number
          confirmed_reports: number
          disputed_reports: number
          confirmations_given: number
          disputes_given: number
          trust_score: number
        }
      }
      get_nearby_users: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_meters: number
          p_limit: number
        }
        Returns: {
          user_id: string
          trust_score: number
          distance: number
          last_known_location: string
        }[]
      }
      get_user_expertise: {
        Args: {
          p_user_id: string
        }
        Returns: {
          emergency_type_id: number
          emergency_type_name: string
          reports_count: number
          confirmed_count: number
          accuracy_rate: number
        }[]
      }
    }
    Enums: {
      emergency_events_status: 'pending' | 'active' | 'resolved' | 'expired'
      event_confirmations_confirmation_type: 'confirm' | 'dispute'
      notification_queue_status: 'pending' | 'sent' | 'failed' | 'cancelled'
      notification_queue_notification_type: 'new_event' | 'update' | 'resolution'
      user_trust_history_action_type: 'report' | 'confirm' | 'dispute'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}