export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      battle_submissions: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          room_id: string
          solve_time_seconds: number | null
          submission_timestamp: string | null
          user_id: string
          verdict: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          room_id: string
          solve_time_seconds?: number | null
          submission_timestamp?: string | null
          user_id: string
          verdict?: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          room_id?: string
          solve_time_seconds?: number | null
          submission_timestamp?: string | null
          user_id?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_submissions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          id: number
          contest_id: number
          name: string
          type: string | null
          phase: string
          duration_seconds: number
          start_time_seconds: number | null
          synced_at: string | null
          participant_count: number | null
        }
        Insert: {
          id?: number
          contest_id: number
          name: string
          type?: string | null
          phase: string
          duration_seconds?: number
          start_time_seconds?: number | null
          synced_at?: string | null
          participant_count?: number | null
        }
        Update: {
          id?: number
          contest_id?: number
          name?: string
          type?: string | null
          phase?: string
          duration_seconds?: number
          start_time_seconds?: number | null
          synced_at?: string | null
          participant_count?: number | null
        }
        Relationships: []
      }
      problems: {
        Row: {
          id: number
          contest_id: number
          problem_index: string
          name: string
          difficulty: number | null
          link: string | null
          created_at: string
        }
        Insert: {
          id?: number
          contest_id: number
          problem_index: string
          name: string
          difficulty?: number | null
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          contest_id?: number
          problem_index?: string
          name?: string
          difficulty?: number | null
          link?: string | null
          created_at?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          id: string
          room_id: string
          requester_user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          requester_user_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          requester_user_id?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_problems: {
        Row: {
          id: string
          room_id: string
          problem_label: string
          contest_id: number
          problem_index: string
          title: string
          rating: number | null
          url: string
          problem_key: string
          sort_order: number
        }
        Insert: {
          id?: string
          room_id: string
          problem_label: string
          contest_id: number
          problem_index: string
          title: string
          rating?: number | null
          url: string
          problem_key: string
          sort_order?: number
        }
        Update: {
          id?: string
          room_id?: string
          problem_label?: string
          contest_id?: number
          problem_index?: string
          title?: string
          rating?: number | null
          url?: string
          problem_key?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_problems_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_requests: {
        Row: {
          id: string
          room_id: string
          requester_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          requester_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          requester_id?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          sender_id: string | null
          room_id: string | null
          type: string
          message: string
          is_read: boolean
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sender_id?: string | null
          room_id?: string | null
          type: string
          message: string
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sender_id?: string | null
          room_id?: string | null
          type?: string
          message?: string
          is_read?: boolean
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          cf_handle: string
          id: string
          losses: number
          total_battles: number
          total_points: number
          updated_at: string
          user_id: string
          wins: number
          rank: number | null
        }
        Insert: {
          cf_handle: string
          id?: string
          losses?: number
          total_battles?: number
          total_points?: number
          updated_at?: string
          user_id: string
          wins?: number
          rank?: number | null
        }
        Update: {
          cf_handle?: string
          id?: string
          losses?: number
          total_battles?: number
          total_points?: number
          updated_at?: string
          user_id?: string
          wins?: number
          rank?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cf_handle: string | null
          created_at: string
          id: string
          rating_color: string
          total_points: number
          updated_at: string
          win_loss_ratio: number
          first_name: string | null
          last_name: string | null
          gender: string | null
          age: number | null
          phone: string | null
          avatar_url: string | null
          display_email: string | null
          deleted_at: string | null
        }
        Insert: {
          cf_handle?: string | null
          created_at?: string
          id: string
          rating_color?: string
          total_points?: number
          updated_at?: string
          win_loss_ratio?: number
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          age?: number | null
          phone?: string | null
          avatar_url?: string | null
          display_email?: string | null
          deleted_at?: string | null
        }
        Update: {
          cf_handle?: string | null
          created_at?: string
          id?: string
          rating_color?: string
          total_points?: number
          updated_at?: string
          win_loss_ratio?: number
          first_name?: string | null
          last_name?: string | null
          gender?: string | null
          age?: number | null
          phone?: string | null
          avatar_url?: string | null
          display_email?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          cf_handle: string
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          cf_handle: string
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          cf_handle?: string
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          creator_id: string
          duration_minutes: number
          id: string
          problem_ids: Json
          room_code: string
          started_at: string | null
          status: string
          display_name?: string | null
          visibility?: string
          approved_participants?: string[] | null
          problem_set?: Json
        }
        Insert: {
          created_at?: string
          creator_id: string
          duration_minutes?: number
          id?: string
          problem_ids?: Json
          room_code: string
          started_at?: string | null
          status?: string
          display_name?: string | null
          visibility?: string
          approved_participants?: string[] | null
          problem_set?: Json
        }
        Update: {
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          id?: string
          problem_ids?: Json
          room_code?: string
          started_at?: string | null
          status?: string
          display_name?: string | null
          visibility?: string
          approved_participants?: string[] | null
          problem_set?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_room_with_difficulties: {
        Args: {
          p_display_name: string
          p_visibility: string
          p_duration_minutes: number
          p_difficulties: number[]
        }
        Returns: Record<string, unknown>
      }
      request_join_room: {
        Args: { p_room_code: string }
        Returns: Record<string, unknown>
      }
      request_join_room_by_room_id: {
        Args: { p_room_id: string }
        Returns: Record<string, unknown>
      }
      handle_room_request: {
        Args: { p_request_id: string; p_approve: boolean }
        Returns: Record<string, unknown>
      }
      start_battle: {
        Args: { p_room_id: string }
        Returns: Record<string, unknown>
      }
      finalize_battle_points: {
        Args: { p_room_id: string; p_points: Json }
        Returns: null
      }
      delete_my_account: {
        Args: Record<PropertyKey, never>
        Returns: null
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
