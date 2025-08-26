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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      file_contents: {
        Row: {
          content: string | null
          id: number
          version: number | null
        }
        Insert: {
          content?: string | null
          id: number
          version?: number | null
        }
        Update: {
          content?: string | null
          id?: number
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "file_contents_id_files_id_fk"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          id: number
          mime_type: string | null
          name: string
          parent_id: number | null
          path: string | null
          size: number | null
          type: Database["public"]["Enums"]["file_type"]
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: never
          mime_type?: string | null
          name: string
          parent_id?: number | null
          path?: string | null
          size?: number | null
          type: Database["public"]["Enums"]["file_type"]
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: never
          mime_type?: string | null
          name?: string
          parent_id?: number | null
          path?: string | null
          size?: number | null
          type?: Database["public"]["Enums"]["file_type"]
          updated_at?: string
          user_id?: number
        }
        Relationships: []
      }
      lesson_logs: {
        Row: {
          class_vibe: string | null
          content: string | null
          created_at: string
          end_at: string | null
          id: number
          img_url: string | null
          next_week_plan: string | null
          profile_id: string
          start_at: string | null
          student_reaction: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          class_vibe?: string | null
          content?: string | null
          created_at?: string
          end_at?: string | null
          id?: never
          img_url?: string | null
          next_week_plan?: string | null
          profile_id: string
          start_at?: string | null
          student_reaction?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          class_vibe?: string | null
          content?: string | null
          created_at?: string
          end_at?: string | null
          id?: never
          img_url?: string | null
          next_week_plan?: string | null
          profile_id?: string
          start_at?: string | null
          student_reaction?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      lessons: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          lesson_time: string
          teacher_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: never
          lesson_time: string
          teacher_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: never
          lesson_time?: string
          teacher_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_teacher_id_profiles_profile_id_fk"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "lessons_user_id_profiles_profile_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      message_room_members: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_room_members_user_id_profiles_profile_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: number
          message_room_id: number
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: never
          message_room_id: number
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: never
          message_room_id?: number
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_message_room_id_rooms_id_fk"
            columns: ["message_room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_profile_id_fk"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: number
          product_id: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: never
          product_id?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: never
          product_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_product_id_products_id_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_profiles_profile_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      products: {
        Row: {
          amount: number
          id: number
          lesson_count: number | null
          name: string | null
        }
        Insert: {
          amount: number
          id?: never
          lesson_count?: number | null
          name?: string | null
        }
        Update: {
          amount?: number
          id?: never
          lesson_count?: number | null
          name?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string | null
          birth: string | null
          comment: string | null
          created_at: string
          gender: Database["public"]["Enums"]["gender"] | null
          introduction: string | null
          is_teacher: boolean
          lesson_day: Database["public"]["Enums"]["lesson_day"] | null
          lesson_time: Database["public"]["Enums"]["lesson_time"] | null
          level: Database["public"]["Enums"]["user_level"] | null
          location: string | null
          name: string
          parent_id: string | null
          phone: string | null
          profile_id: string
          room_id: number | null
          updated_at: string
          userId: string | null
          username: string
        }
        Insert: {
          avatar?: string | null
          birth?: string | null
          comment?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          introduction?: string | null
          is_teacher?: boolean
          lesson_day?: Database["public"]["Enums"]["lesson_day"] | null
          lesson_time?: Database["public"]["Enums"]["lesson_time"] | null
          level?: Database["public"]["Enums"]["user_level"] | null
          location?: string | null
          name: string
          parent_id?: string | null
          phone?: string | null
          profile_id: string
          room_id?: number | null
          updated_at?: string
          userId?: string | null
          username: string
        }
        Update: {
          avatar?: string | null
          birth?: string | null
          comment?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          introduction?: string | null
          is_teacher?: boolean
          lesson_day?: Database["public"]["Enums"]["lesson_day"] | null
          lesson_time?: Database["public"]["Enums"]["lesson_time"] | null
          level?: Database["public"]["Enums"]["user_level"] | null
          location?: string | null
          name?: string
          parent_id?: string | null
          phone?: string | null
          profile_id?: string
          room_id?: number | null
          updated_at?: string
          userId?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_room_id_rooms_id_fk"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship: {
        Row: {
          child_id: string | null
          created_at: string
          id: number
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          child_id?: string | null
          created_at?: string
          id?: never
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          child_id?: string | null
          created_at?: string
          id?: never
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_child_id_profiles_profile_id_fk"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "relationship_parent_id_profiles_profile_id_fk"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          id: number
          room_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          room_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          room_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_user_id_profiles_profile_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      file_type: "folder" | "file"
      gender: "male" | "female" | "other"
      lesson_day:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      lesson_time: "18:00-20:00" | "20:00-22:00" | "22:00-24:00"
      user_level:
        | "code-explorer"
        | "code-pioneer"
        | "code-solver"
        | "code-trailblazer"
        | "code-conqueror"
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
    Enums: {
      file_type: ["folder", "file"],
      gender: ["male", "female", "other"],
      lesson_day: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      lesson_time: ["18:00-20:00", "20:00-22:00", "22:00-24:00"],
      user_level: [
        "code-explorer",
        "code-pioneer",
        "code-solver",
        "code-trailblazer",
        "code-conqueror",
      ],
    },
  },
} as const
