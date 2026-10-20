export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      acquisition_goals: {
        Row: {
          client_id: string
          created_at: string
          id: string
          mastery_criterion: string
          name: string
          position: number
          program_id: string
          skill_area: string
          status: string
          teaching_procedure: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          mastery_criterion: string
          name: string
          position?: number
          program_id: string
          skill_area: string
          status?: string
          teaching_procedure: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          mastery_criterion?: string
          name?: string
          position?: number
          program_id?: string
          skill_area?: string
          status?: string
          teaching_procedure?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_goals_program_client_fkey"
            columns: ["program_id", "client_id"]
            isOneToOne: false
            referencedRelation: "acquisition_programs"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      acquisition_programs: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          appointment_id: string
          client_id: string
          created_at: string
          id: string
          organization_id: string
          payload: Json
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          appointment_id: string
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          payload: Json
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          appointment_id?: string
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_events_v2_organization_id_client_id_appointmen_fkey"
            columns: ["organization_id", "client_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "appointment_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      appointment_participants_v2: {
        Row: {
          appointment_id: string
          archived_at: string | null
          client_id: string
          created_at: string
          family_person_id: string | null
          id: string
          organization_id: string
          participant_kind: string
          professional_user_id: string | null
          test_run_id: string | null
        }
        Insert: {
          appointment_id: string
          archived_at?: string | null
          client_id: string
          created_at?: string
          family_person_id?: string | null
          id?: string
          organization_id: string
          participant_kind: string
          professional_user_id?: string | null
          test_run_id?: string | null
        }
        Update: {
          appointment_id?: string
          archived_at?: string | null
          client_id?: string
          created_at?: string
          family_person_id?: string | null
          id?: string
          organization_id?: string
          participant_kind?: string
          professional_user_id?: string | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_participants_v2_organization_id_client_id_appo_fkey"
            columns: ["organization_id", "client_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "appointment_participants_v2_organization_id_client_id_fami_fkey"
            columns: ["organization_id", "client_id", "family_person_id"]
            isOneToOne: false
            referencedRelation: "client_people_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "appointment_participants_v2_organization_id_professional_u_fkey"
            columns: ["organization_id", "professional_user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "appointment_participants_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      appointment_reminders_v2: {
        Row: {
          appointment_id: string
          archived_at: string | null
          client_id: string
          created_at: string
          due_at: string | null
          id: string
          minutes_before: number
          organization_id: string
          sent_at: string | null
          state: string
          test_run_id: string | null
        }
        Insert: {
          appointment_id: string
          archived_at?: string | null
          client_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          minutes_before: number
          organization_id: string
          sent_at?: string | null
          state?: string
          test_run_id?: string | null
        }
        Update: {
          appointment_id?: string
          archived_at?: string | null
          client_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          minutes_before?: number
          organization_id?: string
          sent_at?: string | null
          state?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_v2_organization_id_client_id_appoint_fkey"
            columns: ["organization_id", "client_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "appointment_reminders_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      appointment_series_v2: {
        Row: {
          cancelled_at: string | null
          client_id: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          status: string
          test_run_id: string | null
          updated_at: string
          version: number
          weekly_rule: Json
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          id: string
          organization_id: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
          weekly_rule: Json
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
          weekly_rule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "appointment_series_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "appointment_series_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_series_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      appointments_v2: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_exception: boolean
          linked_session_id: string | null
          notes: string
          organization_id: string
          original_local_date: string | null
          series_id: string | null
          starts_at: string
          status: string
          test_run_id: string | null
          time_zone: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          ends_at: string
          id: string
          is_exception?: boolean
          linked_session_id?: string | null
          notes?: string
          organization_id: string
          original_local_date?: string | null
          series_id?: string | null
          starts_at: string
          status?: string
          test_run_id?: string | null
          time_zone: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          is_exception?: boolean
          linked_session_id?: string | null
          notes?: string
          organization_id?: string
          original_local_date?: string | null
          series_id?: string | null
          starts_at?: string
          status?: string
          test_run_id?: string | null
          time_zone?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointments_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "appointments_v2_organization_id_client_id_linked_session_i_fkey"
            columns: ["organization_id", "client_id", "linked_session_id"]
            isOneToOne: false
            referencedRelation: "clinical_session_v2_state"
            referencedColumns: ["organization_id", "client_id", "session_id"]
          },
          {
            foreignKeyName: "appointments_v2_organization_id_client_id_series_id_fkey"
            columns: ["organization_id", "client_id", "series_id"]
            isOneToOne: false
            referencedRelation: "appointment_series_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "appointments_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      assessments: {
        Row: {
          client_id: string
          created_at: string
          id: string
          kind: string
          occurred_on: string | null
          payload: Json
          status: string
          test_run_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          kind: string
          occurred_on?: string | null
          payload?: Json
          status?: string
          test_run_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          kind?: string
          occurred_on?: string | null
          payload?: Json
          status?: string
          test_run_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          attachment_id: string
          created_at: string
          id: number
          organization_id: string
          test_run_id: string | null
          version_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          attachment_id: string
          created_at?: string
          id?: number
          organization_id: string
          test_run_id?: string | null
          version_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          attachment_id?: string
          created_at?: string
          id?: number
          organization_id?: string
          test_run_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_events_v2_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_events_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attachment_events_v2_version_id_attachment_id_fkey"
            columns: ["version_id", "attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_versions"
            referencedColumns: ["id", "attachment_id"]
          },
        ]
      }
      attachment_records: {
        Row: {
          archived_at: string | null
          client_id: string | null
          commercial_document_id: string | null
          conversation_id: string | null
          created_at: string
          created_by: string
          current_version_id: string | null
          id: string
          organization_id: string | null
          professional_user_id: string | null
          purpose: string
          resource_kind: string
          state: string
          test_run_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          client_id?: string | null
          commercial_document_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by: string
          current_version_id?: string | null
          id: string
          organization_id?: string | null
          professional_user_id?: string | null
          purpose: string
          resource_kind: string
          state?: string
          test_run_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          client_id?: string | null
          commercial_document_id?: string | null
          conversation_id?: string | null
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          id?: string
          organization_id?: string | null
          professional_user_id?: string | null
          purpose?: string
          resource_kind?: string
          state?: string
          test_run_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "attachment_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_records_commercial_document_fkey"
            columns: ["organization_id", "commercial_document_id"]
            isOneToOne: false
            referencedRelation: "commercial_documents_v2"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attachment_records_current_version_fkey"
            columns: ["current_version_id", "id"]
            isOneToOne: false
            referencedRelation: "attachment_versions"
            referencedColumns: ["id", "attachment_id"]
          },
          {
            foreignKeyName: "attachment_records_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attachment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_records_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      attachment_versions: {
        Row: {
          archived_at: string | null
          attachment_id: string
          bucket_id: string
          byte_length: number
          confirmed_at: string | null
          created_at: string
          created_by: string
          id: string
          mime_type: string
          object_key: string
          original_name: string
          sha256: string
          state: string
          supersedes_version_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          attachment_id: string
          bucket_id: string
          byte_length: number
          confirmed_at?: string | null
          created_at?: string
          created_by: string
          id: string
          mime_type: string
          object_key: string
          original_name: string
          sha256: string
          state: string
          supersedes_version_id?: string | null
          version: number
        }
        Update: {
          archived_at?: string | null
          attachment_id?: string
          bucket_id?: string
          byte_length?: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          mime_type?: string
          object_key?: string
          original_name?: string
          sha256?: string
          state?: string
          supersedes_version_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "attachment_versions_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_versions_supersedes_version_id_attachment_id_fkey"
            columns: ["supersedes_version_id", "attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_versions"
            referencedColumns: ["id", "attachment_id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          organization_id: string
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          organization_id: string
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          organization_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_plans: {
        Row: {
          antecedent_strategy: string | null
          client_id: string
          created_at: string
          hypothesized_function: string | null
          id: string
          measurement_unit: string
          name: string
          operational_definition: string
          replacement_behavior: string | null
          response_strategy: string | null
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          antecedent_strategy?: string | null
          client_id: string
          created_at?: string
          hypothesized_function?: string | null
          id?: string
          measurement_unit: string
          name: string
          operational_definition: string
          replacement_behavior?: string | null
          response_strategy?: string | null
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          antecedent_strategy?: string | null
          client_id?: string
          created_at?: string
          hypothesized_function?: string | null
          id?: string
          measurement_unit?: string
          name?: string
          operational_definition?: string
          replacement_behavior?: string | null
          response_strategy?: string | null
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations_v2: {
        Row: {
          audience: string
          client_id: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          test_run_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          audience: string
          client_id: string
          created_at?: string
          created_by: string
          id: string
          organization_id: string
          test_run_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          audience?: string
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          test_run_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "chat_conversations_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      chat_message_attachments_v2: {
        Row: {
          attachment_id: string
          attachment_version_id: string
          conversation_id: string
          message_id: string
          position: number
        }
        Insert: {
          attachment_id: string
          attachment_version_id: string
          conversation_id: string
          message_id: string
          position: number
        }
        Update: {
          attachment_id?: string
          attachment_version_id?: string
          conversation_id?: string
          message_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_attachments_v2_attachment_version_id_attachme_fkey"
            columns: ["attachment_version_id", "attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_versions"
            referencedColumns: ["id", "attachment_id"]
          },
          {
            foreignKeyName: "chat_message_attachments_v2_conversation_id_message_id_fkey"
            columns: ["conversation_id", "message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages_v2"
            referencedColumns: ["conversation_id", "id"]
          },
        ]
      }
      chat_messages_v2: {
        Row: {
          author_user_id: string
          body: string
          client_id: string
          conversation_id: string
          created_at: string
          id: string
          organization_id: string
          sequence: number
          test_run_id: string | null
        }
        Insert: {
          author_user_id: string
          body: string
          client_id: string
          conversation_id: string
          created_at?: string
          id: string
          organization_id: string
          sequence: number
          test_run_id?: string | null
        }
        Update: {
          author_user_id?: string
          body?: string
          client_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          sequence?: number
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_v2_conversation_id_author_user_id_fkey"
            columns: ["conversation_id", "author_user_id"]
            isOneToOne: false
            referencedRelation: "chat_participants_v2"
            referencedColumns: ["conversation_id", "user_id"]
          },
          {
            foreignKeyName: "chat_messages_v2_organization_id_client_id_conversation_id_fkey"
            columns: ["organization_id", "client_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "chat_messages_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      chat_participants_v2: {
        Row: {
          client_id: string
          conversation_id: string
          joined_at: string
          organization_id: string
          participant_kind: string
          revoked_at: string | null
          status: string
          test_run_id: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          conversation_id: string
          joined_at?: string
          organization_id: string
          participant_kind: string
          revoked_at?: string | null
          status?: string
          test_run_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          conversation_id?: string
          joined_at?: string
          organization_id?: string
          participant_kind?: string
          revoked_at?: string | null
          status?: string
          test_run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_v2_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_v2_organization_id_client_id_conversatio_fkey"
            columns: ["organization_id", "client_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "chat_participants_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      chat_read_states_v2: {
        Row: {
          client_id: string
          conversation_id: string
          organization_id: string
          read_at: string
          test_run_id: string | null
          through_sequence: number
          user_id: string
          version: number
        }
        Insert: {
          client_id: string
          conversation_id: string
          organization_id: string
          read_at?: string
          test_run_id?: string | null
          through_sequence?: number
          user_id: string
          version?: number
        }
        Update: {
          client_id?: string
          conversation_id?: string
          organization_id?: string
          read_at?: string
          test_run_id?: string | null
          through_sequence?: number
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_states_v2_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: true
            referencedRelation: "chat_participants_v2"
            referencedColumns: ["conversation_id", "user_id"]
          },
          {
            foreignKeyName: "chat_read_states_v2_organization_id_client_id_conversation_fkey"
            columns: ["organization_id", "client_id", "conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "chat_read_states_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      client_context_profiles: {
        Row: {
          client_id: string
          created_at: string
          home_adaptations: string | null
          organization_id: string
          school_adaptations: string | null
          schooling: string | null
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          home_adaptations?: string | null
          organization_id: string
          school_adaptations?: string | null
          schooling?: string | null
          test_run_id?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          home_adaptations?: string | null
          organization_id?: string
          school_adaptations?: string | null
          schooling?: string | null
          test_run_id?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_context_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_context_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_people_v2: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          birth_date: string | null
          client_id: string
          created_at: string
          created_by: string
          email: string | null
          full_name: string | null
          id: string
          initials: string | null
          is_primary_contact: boolean
          organization_id: string
          phone: string
          relationship: string
          roles: string[]
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          birth_date?: string | null
          client_id: string
          created_at?: string
          created_by: string
          email?: string | null
          full_name?: string | null
          id: string
          initials?: string | null
          is_primary_contact?: boolean
          organization_id: string
          phone?: string
          relationship?: string
          roles: string[]
          test_run_id?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          birth_date?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string | null
          id?: string
          initials?: string | null
          is_primary_contact?: boolean
          organization_id?: string
          phone?: string
          relationship?: string
          roles?: string[]
          test_run_id?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_people_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_people_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "client_people_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_people_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      client_profiles_v2: {
        Row: {
          client_id: string
          consultation_reason: string
          context_adaptations: string
          context_home: string
          context_school: string
          created_at: string
          created_by: string
          full_name: string | null
          organization_id: string
          photo_attachment_id: string | null
          reported_diagnosis: string
          rut_normalized: string | null
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          client_id: string
          consultation_reason?: string
          context_adaptations?: string
          context_home?: string
          context_school?: string
          created_at?: string
          created_by: string
          full_name?: string | null
          organization_id: string
          photo_attachment_id?: string | null
          reported_diagnosis?: string
          rut_normalized?: string | null
          test_run_id?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          client_id?: string
          consultation_reason?: string
          context_adaptations?: string
          context_home?: string
          context_school?: string
          created_at?: string
          created_by?: string
          full_name?: string | null
          organization_id?: string
          photo_attachment_id?: string | null
          reported_diagnosis?: string
          rut_normalized?: string | null
          test_run_id?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_profiles_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "client_profiles_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_profiles_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "client_profiles_v2_photo_attachment_fkey"
            columns: ["photo_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      client_siblings_v2: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          birth_date: string | null
          client_id: string
          created_at: string
          created_by: string
          full_name: string | null
          id: string
          initials: string | null
          notes: string
          organization_id: string
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          birth_date?: string | null
          client_id: string
          created_at?: string
          created_by: string
          full_name?: string | null
          id: string
          initials?: string | null
          notes?: string
          organization_id: string
          test_run_id?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          birth_date?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          full_name?: string | null
          id?: string
          initials?: string | null
          notes?: string
          organization_id?: string
          test_run_id?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_siblings_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_siblings_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "client_siblings_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_siblings_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string
          clinical_id: string
          created_at: string
          id: string
          initials: string
          living_arrangement: string | null
          organization_id: string
          primary_language: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          birth_date: string
          clinical_id: string
          created_at?: string
          id?: string
          initials: string
          living_arrangement?: string | null
          organization_id: string
          primary_language: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string
          clinical_id?: string
          created_at?: string
          id?: string
          initials?: string
          living_arrangement?: string | null
          organization_id?: string
          primary_language?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_test_batch_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      clinic_admin_events: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          organization_id: string
          subject_user_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          organization_id: string
          subject_user_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_admin_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscription_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          next_version: number
          organization_id: string
          payload: Json
          prior_version: number | null
          reason: string | null
          subscription_id: string
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          next_version: number
          organization_id: string
          payload: Json
          prior_version?: number | null
          reason?: string | null
          subscription_id: string
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          next_version?: number
          organization_id?: string
          payload?: Json
          prior_version?: number | null
          reason?: string | null
          subscription_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscription_events_v2_organization_id_subscription_fkey"
            columns: ["organization_id", "subscription_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscriptions_v2"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinic_subscription_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      clinic_subscriptions_v2: {
        Row: {
          cancelled_at: string | null
          created_by: string
          effective_at: string
          id: string
          occupied_seats: number
          organization_id: string
          plan_version_id: string
          seats: number
          status: string
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          cancelled_at?: string | null
          created_by: string
          effective_at: string
          id: string
          occupied_seats?: number
          organization_id: string
          plan_version_id: string
          seats: number
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          cancelled_at?: string | null
          created_by?: string
          effective_at?: string
          id?: string
          occupied_seats?: number
          organization_id?: string
          plan_version_id?: string
          seats?: number
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_v2_plan_version_id_fkey"
            columns: ["plan_version_id"]
            isOneToOne: false
            referencedRelation: "commercial_plan_versions_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          client_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          organization_id: string
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          client_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          organization_id: string
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          client_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          organization_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_history_entries: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          descriptor: string
          dose: string | null
          ended_on: string | null
          id: string
          kind: string
          occurred_on: string | null
          organization_id: string
          prescriber_descriptor: string | null
          started_on: string | null
          status: string
          supersedes_id: string | null
          test_run_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          descriptor: string
          dose?: string | null
          ended_on?: string | null
          id?: string
          kind: string
          occurred_on?: string | null
          organization_id: string
          prescriber_descriptor?: string | null
          started_on?: string | null
          status?: string
          supersedes_id?: string | null
          test_run_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          descriptor?: string
          dose?: string | null
          ended_on?: string | null
          id?: string
          kind?: string
          occurred_on?: string | null
          organization_id?: string
          prescriber_descriptor?: string | null
          started_on?: string | null
          status?: string
          supersedes_id?: string | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_history_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_entries_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "clinical_history_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_history_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          client_id: string
          created_at: string
          history_id: string
          id: number
          organization_id: string
          test_run_id: string | null
          version_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          client_id: string
          created_at?: string
          history_id: string
          id?: number
          organization_id: string
          test_run_id?: string | null
          version_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          client_id?: string
          created_at?: string
          history_id?: string
          id?: number
          organization_id?: string
          test_run_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_history_events_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_events_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_history_events_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_history_events_v2_version_id_history_id_client_id_fkey"
            columns: [
              "version_id",
              "history_id",
              "client_id",
              "organization_id",
            ]
            isOneToOne: false
            referencedRelation: "clinical_history_versions_v2"
            referencedColumns: [
              "id",
              "history_id",
              "client_id",
              "organization_id",
            ]
          },
        ]
      }
      clinical_history_versions_v2: {
        Row: {
          action: string
          client_id: string
          created_at: string
          created_by: string
          descriptor: string
          dose: string | null
          ended_on: string | null
          frequency: string | null
          history_id: string
          id: string
          kind: string
          notes: string | null
          organization_id: string
          prescriber_descriptor: string | null
          started_on: string | null
          status: string
          supersedes_version_id: string | null
          test_run_id: string | null
          version: number
        }
        Insert: {
          action: string
          client_id: string
          created_at?: string
          created_by: string
          descriptor: string
          dose?: string | null
          ended_on?: string | null
          frequency?: string | null
          history_id: string
          id: string
          kind: string
          notes?: string | null
          organization_id: string
          prescriber_descriptor?: string | null
          started_on?: string | null
          status: string
          supersedes_version_id?: string | null
          test_run_id?: string | null
          version: number
        }
        Update: {
          action?: string
          client_id?: string
          created_at?: string
          created_by?: string
          descriptor?: string
          dose?: string | null
          ended_on?: string | null
          frequency?: string | null
          history_id?: string
          id?: string
          kind?: string
          notes?: string | null
          organization_id?: string
          prescriber_descriptor?: string | null
          started_on?: string | null
          status?: string
          supersedes_version_id?: string | null
          test_run_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_history_versions_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_versions_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_history_versions_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_history_versions_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_history_versions_v2_supersedes_version_id_history_fkey"
            columns: [
              "supersedes_version_id",
              "history_id",
              "client_id",
              "organization_id",
            ]
            isOneToOne: false
            referencedRelation: "clinical_history_versions_v2"
            referencedColumns: [
              "id",
              "history_id",
              "client_id",
              "organization_id",
            ]
          },
        ]
      }
      clinical_record_events: {
        Row: {
          action: string
          actor_user_id: string
          client_id: string
          created_at: string
          entity_id: string
          id: string
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          client_id: string
          created_at?: string
          entity_id: string
          id?: string
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          client_id?: string
          created_at?: string
          entity_id?: string
          id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_record_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_session_v2_events: {
        Row: {
          actor_user_id: string
          client_id: string
          created_at: string
          event_type: string
          id: string
          notes: string
          occurred_at: string
          organization_id: string
          sequence: number
          session_id: string
          test_run_id: string | null
        }
        Insert: {
          actor_user_id: string
          client_id: string
          created_at?: string
          event_type: string
          id: string
          notes?: string
          occurred_at: string
          organization_id: string
          sequence: number
          session_id: string
          test_run_id?: string | null
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          created_at?: string
          event_type?: string
          id?: string
          notes?: string
          occurred_at?: string
          organization_id?: string
          sequence?: number
          session_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_session_v2_events_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_session_v2_events_organization_id_client_id_sessi_fkey"
            columns: ["organization_id", "client_id", "session_id"]
            isOneToOne: false
            referencedRelation: "clinical_session_v2_state"
            referencedColumns: ["organization_id", "client_id", "session_id"]
          },
          {
            foreignKeyName: "clinical_session_v2_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_session_v2_events_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      clinical_session_v2_state: {
        Row: {
          archived_at: string | null
          captured_at: string
          client_id: string
          created_at: string
          created_by: string
          notes: string
          organization_id: string
          schema_version: number
          selected_programs: Json
          session_id: string
          status: string
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          captured_at: string
          client_id: string
          created_at?: string
          created_by: string
          notes?: string
          organization_id: string
          schema_version?: number
          selected_programs?: Json
          session_id: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          captured_at?: string
          client_id?: string
          created_at?: string
          created_by?: string
          notes?: string
          organization_id?: string
          schema_version?: number
          selected_programs?: Json
          session_id?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_session_v2_state_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_session_v2_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_session_v2_state_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "clinical_session_v2_state_session_id_client_id_fkey"
            columns: ["session_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      clinical_sessions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          occurred_on: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_on?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          occurred_on?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_document_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          document_id: string
          id: string
          next_version: number
          organization_id: string
          payload: Json
          prior_version: number | null
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          document_id: string
          id?: string
          next_version: number
          organization_id: string
          payload: Json
          prior_version?: number | null
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          document_id?: string
          id?: string
          next_version?: number
          organization_id?: string
          payload?: Json
          prior_version?: number | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_document_events_v2_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "commercial_documents_v2"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "commercial_document_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      commercial_documents_v2: {
        Row: {
          archived: boolean
          attachment_record_id: string | null
          attachment_version_id: string | null
          created_at: string
          created_by: string
          currency: string
          demonstration: boolean
          id: string
          issued_at: string
          kind: string
          lines: Json
          minor_unit_digits: number
          organization_id: string
          payment_requested: boolean
          predecessor_id: string | null
          subscription_id: string | null
          tax_document: boolean
          test_run_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived?: boolean
          attachment_record_id?: string | null
          attachment_version_id?: string | null
          created_at?: string
          created_by: string
          currency: string
          demonstration?: boolean
          id: string
          issued_at: string
          kind: string
          lines?: Json
          minor_unit_digits: number
          organization_id: string
          payment_requested?: boolean
          predecessor_id?: string | null
          subscription_id?: string | null
          tax_document?: boolean
          test_run_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived?: boolean
          attachment_record_id?: string | null
          attachment_version_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          demonstration?: boolean
          id?: string
          issued_at?: string
          kind?: string
          lines?: Json
          minor_unit_digits?: number
          organization_id?: string
          payment_requested?: boolean
          predecessor_id?: string | null
          subscription_id?: string | null
          tax_document?: boolean
          test_run_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_documents_attachment_scope_fkey"
            columns: ["attachment_record_id", "organization_id", "id"]
            isOneToOne: false
            referencedRelation: "attachment_records"
            referencedColumns: [
              "id",
              "organization_id",
              "commercial_document_id",
            ]
          },
          {
            foreignKeyName: "commercial_documents_v2_attachment_version_id_attachment_r_fkey"
            columns: ["attachment_version_id", "attachment_record_id"]
            isOneToOne: false
            referencedRelation: "attachment_versions"
            referencedColumns: ["id", "attachment_id"]
          },
          {
            foreignKeyName: "commercial_documents_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_documents_v2_organization_id_predecessor_id_fkey"
            columns: ["organization_id", "predecessor_id"]
            isOneToOne: false
            referencedRelation: "commercial_documents_v2"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "commercial_documents_v2_organization_id_subscription_id_fkey"
            columns: ["organization_id", "subscription_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscriptions_v2"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "commercial_documents_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      commercial_plan_versions_v2: {
        Row: {
          active: boolean
          amount_minor: number
          created_at: string
          currency: string
          demonstration: boolean
          description: string
          features: Json
          id: string
          included_seats: number
          maximum_seats: number | null
          minor_unit_digits: number
          name: string
          period: string
          plan_id: string
          version_number: number
        }
        Insert: {
          active?: boolean
          amount_minor: number
          created_at?: string
          currency: string
          demonstration?: boolean
          description?: string
          features?: Json
          id: string
          included_seats: number
          maximum_seats?: number | null
          minor_unit_digits: number
          name: string
          period: string
          plan_id: string
          version_number: number
        }
        Update: {
          active?: boolean
          amount_minor?: number
          created_at?: string
          currency?: string
          demonstration?: boolean
          description?: string
          features?: Json
          id?: string
          included_seats?: number
          maximum_seats?: number | null
          minor_unit_digits?: number
          name?: string
          period?: string
          plan_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_plan_versions_v2_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_plans_v2: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          actor_user_id: string
          client_id: string
          consent_record_id: string
          created_at: string
          event_type: string
          id: string
          organization_id: string
          test_run_id: string | null
        }
        Insert: {
          actor_user_id: string
          client_id: string
          consent_record_id: string
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          test_run_id?: string | null
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          consent_record_id?: string
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_events_consent_record_id_fkey"
            columns: ["consent_record_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_events_org_client_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consent_events_org_test_batch_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consent_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_events_same_record_fkey"
            columns: ["organization_id", "client_id", "consent_record_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
        ]
      }
      consent_records: {
        Row: {
          channel: string
          client_id: string
          created_at: string
          created_by: string
          effective_at: string | null
          evidence_attachment_id: string | null
          evidence_reference: string | null
          expires_at: string | null
          grantor_descriptor: string
          id: string
          notice_version: string
          organization_id: string
          purpose_code: string
          status: string
          supersedes_id: string | null
          test_run_id: string | null
          version: number
        }
        Insert: {
          channel: string
          client_id: string
          created_at?: string
          created_by: string
          effective_at?: string | null
          evidence_attachment_id?: string | null
          evidence_reference?: string | null
          expires_at?: string | null
          grantor_descriptor: string
          id?: string
          notice_version: string
          organization_id: string
          purpose_code: string
          status: string
          supersedes_id?: string | null
          test_run_id?: string | null
          version?: number
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          created_by?: string
          effective_at?: string | null
          evidence_attachment_id?: string | null
          evidence_reference?: string | null
          expires_at?: string | null
          grantor_descriptor?: string
          id?: string
          notice_version?: string
          organization_id?: string
          purpose_code?: string
          status?: string
          supersedes_id?: string | null
          test_run_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_evidence_attachment_fkey"
            columns: ["evidence_attachment_id"]
            isOneToOne: false
            referencedRelation: "attachment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_org_client_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consent_records_org_test_batch_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "consent_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_supersedes_same_student_fkey"
            columns: ["organization_id", "client_id", "supersedes_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
        ]
      }
      family_access_links_v2: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          family_person_id: string
          id: string
          invited_by: string
          message: string
          organization_id: string
          recipient_email: string
          recipient_user_id: string | null
          revoked_at: string | null
          status: string
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          family_person_id: string
          id: string
          invited_by: string
          message?: string
          organization_id: string
          recipient_email: string
          recipient_user_id?: string | null
          revoked_at?: string | null
          status: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          family_person_id?: string
          id?: string
          invited_by?: string
          message?: string
          organization_id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          revoked_at?: string | null
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_access_links_v2_organization_id_client_id_family_pe_fkey"
            columns: ["organization_id", "client_id", "family_person_id"]
            isOneToOne: false
            referencedRelation: "client_people_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "family_access_links_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_access_links_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      family_publication_recipients_v2: {
        Row: {
          client_id: string
          family_person_id: string
          organization_id: string
          publication_id: string
        }
        Insert: {
          client_id: string
          family_person_id: string
          organization_id: string
          publication_id: string
        }
        Update: {
          client_id?: string
          family_person_id?: string
          organization_id?: string
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_publication_recipients_organization_id_client_id_fa_fkey"
            columns: ["organization_id", "client_id", "family_person_id"]
            isOneToOne: false
            referencedRelation: "client_people_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "family_publication_recipients_organization_id_client_id_pu_fkey"
            columns: ["organization_id", "client_id", "publication_id"]
            isOneToOne: false
            referencedRelation: "family_publications_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "family_publication_recipients_v2_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "family_publications_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      family_publication_resources_v2: {
        Row: {
          position: number
          publication_id: string
          resource_id: string
          resource_kind: string
        }
        Insert: {
          position: number
          publication_id: string
          resource_id: string
          resource_kind: string
        }
        Update: {
          position?: number
          publication_id?: string
          resource_id?: string
          resource_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_publication_resources_v2_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "family_publications_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      family_publications_v2: {
        Row: {
          client_id: string
          id: string
          introduction: string
          organization_id: string
          predecessor_id: string | null
          published_at: string
          published_by: string
          superseded_at: string | null
          test_run_id: string | null
          version: number
        }
        Insert: {
          client_id: string
          id: string
          introduction: string
          organization_id: string
          predecessor_id?: string | null
          published_at?: string
          published_by: string
          superseded_at?: string | null
          test_run_id?: string | null
          version: number
        }
        Update: {
          client_id?: string
          id?: string
          introduction?: string
          organization_id?: string
          predecessor_id?: string | null
          published_at?: string
          published_by?: string
          superseded_at?: string | null
          test_run_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_publications_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "family_publications_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_publications_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "family_publications_v2_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "family_publications_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          birth_date: string | null
          client_id: string
          created_at: string
          id: string
          initials: string
          phone: string | null
          position: number
          relationship: string | null
          test_run_id: string | null
        }
        Insert: {
          birth_date?: string | null
          client_id: string
          created_at?: string
          id?: string
          initials: string
          phone?: string | null
          position: number
          relationship?: string | null
          test_run_id?: string | null
        }
        Update: {
          birth_date?: string | null
          client_id?: string
          created_at?: string
          id?: string
          initials?: string
          phone?: string | null
          position?: number
          relationship?: string | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          status: string
          test_run_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role: string
          status?: string
          test_run_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          status?: string
          test_run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      professional_profiles: {
        Row: {
          avatar_object_path: string | null
          avatar_preset: string
          description: string
          name: string
          phone: string
          profession: string
          test_run_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          avatar_object_path?: string | null
          avatar_preset?: string
          description?: string
          name?: string
          phone?: string
          profession?: string
          test_run_id?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          avatar_object_path?: string | null
          avatar_preset?: string
          description?: string
          name?: string
          phone?: string
          profession?: string
          test_run_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      program_lifecycle_events: {
        Row: {
          action: string
          actor_user_id: string
          client_id: string
          created_at: string
          id: string
          next_status: string | null
          organization_id: string
          prior_status: string | null
          program_id: string
          program_version_id: string | null
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          client_id: string
          created_at?: string
          id?: string
          next_status?: string | null
          organization_id: string
          prior_status?: string | null
          program_id: string
          program_version_id?: string | null
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          next_status?: string | null
          organization_id?: string
          prior_status?: string | null
          program_id?: string
          program_version_id?: string | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_lifecycle_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lifecycle_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lifecycle_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lifecycle_events_program_scope_fkey"
            columns: ["organization_id", "client_id", "program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "program_lifecycle_events_program_version_id_fkey"
            columns: ["program_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_lifecycle_events_version_scope_fkey"
            columns: [
              "organization_id",
              "client_id",
              "program_id",
              "program_version_id",
            ]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: [
              "organization_id",
              "client_id",
              "program_id",
              "id",
            ]
          },
        ]
      }
      program_result_goal_revisions_v2: {
        Row: {
          action: string
          actor_user_id: string
          client_id: string
          created_at: string
          goal_id: string
          id: string
          organization_id: string
          prior_value: Json
          program_id: string
          revision: number
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          client_id: string
          created_at?: string
          goal_id: string
          id?: string
          organization_id: string
          prior_value: Json
          program_id: string
          revision: number
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          client_id?: string
          created_at?: string
          goal_id?: string
          id?: string
          organization_id?: string
          prior_value?: Json
          program_id?: string
          revision?: number
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_result_goal_revisions__organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "program_result_goal_revisions_organization_id_client_id_pr_fkey"
            columns: ["organization_id", "client_id", "program_id", "goal_id"]
            isOneToOne: false
            referencedRelation: "program_result_goals_v2"
            referencedColumns: [
              "organization_id",
              "client_id",
              "program_id",
              "id",
            ]
          },
          {
            foreignKeyName: "program_result_goal_revisions_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      program_result_goals_v2: {
        Row: {
          archived_at: string | null
          client_id: string
          comparator: string
          created_at: string
          created_by: string
          dimension: string
          id: string
          label: string
          organization_id: string
          program_id: string
          target_value: number
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          comparator: string
          created_at?: string
          created_by: string
          dimension: string
          id: string
          label: string
          organization_id: string
          program_id: string
          target_value: number
          test_run_id?: string | null
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          comparator?: string
          created_at?: string
          created_by?: string
          dimension?: string
          id?: string
          label?: string
          organization_id?: string
          program_id?: string
          target_value?: number
          test_run_id?: string | null
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_result_goals_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "program_result_goals_v2_organization_id_client_id_program__fkey"
            columns: ["organization_id", "client_id", "program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "program_result_goals_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_result_goals_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      program_versions: {
        Row: {
          activated_at: string | null
          client_id: string
          created_at: string
          created_by: string
          design: Json
          id: string
          organization_id: string
          program_id: string
          program_type: string
          revision: number
          supersedes_version_id: string | null
          test_run_id: string | null
          title: string
          version: number
          version_state: string
        }
        Insert: {
          activated_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          design: Json
          id?: string
          organization_id: string
          program_id: string
          program_type: string
          revision?: number
          supersedes_version_id?: string | null
          test_run_id?: string | null
          title: string
          version: number
          version_state?: string
        }
        Update: {
          activated_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          design?: Json
          id?: string
          organization_id?: string
          program_id?: string
          program_type?: string
          revision?: number
          supersedes_version_id?: string | null
          test_run_id?: string | null
          title?: string
          version?: number
          version_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_versions_organization_client_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "program_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_versions_program_client_type_fkey"
            columns: ["program_id", "client_id", "program_type"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id", "client_id", "program_type"]
          },
          {
            foreignKeyName: "program_versions_supersedes_version_id_fkey"
            columns: ["supersedes_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          current_version_id: string | null
          id: string
          organization_id: string
          program_type: string
          revision: number
          status: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          current_version_id?: string | null
          id?: string
          organization_id: string
          program_type: string
          revision?: number
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          id?: string
          organization_id?: string
          program_type?: string
          revision?: number
          status?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_client_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_acquisition_trials: {
        Row: {
          client_id: string
          correct: number
          created_at: string
          goal_id: string
          incorrect: number
          session_id: string
          test_run_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          correct?: number
          created_at?: string
          goal_id: string
          incorrect?: number
          session_id: string
          test_run_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          correct?: number
          created_at?: string
          goal_id?: string
          incorrect?: number
          session_id?: string
          test_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_acquisition_trials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_acquisition_trials_goal_client_fkey"
            columns: ["goal_id", "client_id"]
            isOneToOne: false
            referencedRelation: "acquisition_goals"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "session_acquisition_trials_session_client_fkey"
            columns: ["session_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      session_behavior_measurements: {
        Row: {
          behavior_plan_id: string
          client_id: string
          created_at: string
          interval_observed: number | null
          interval_total: number | null
          measurement_unit: string | null
          session_id: string
          test_run_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          behavior_plan_id: string
          client_id: string
          created_at?: string
          interval_observed?: number | null
          interval_total?: number | null
          measurement_unit?: string | null
          session_id: string
          test_run_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          behavior_plan_id?: string
          client_id?: string
          created_at?: string
          interval_observed?: number | null
          interval_total?: number | null
          measurement_unit?: string | null
          session_id?: string
          test_run_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_behavior_measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_behavior_measurements_plan_client_fkey"
            columns: ["behavior_plan_id", "client_id"]
            isOneToOne: false
            referencedRelation: "behavior_plans"
            referencedColumns: ["id", "client_id"]
          },
          {
            foreignKeyName: "session_behavior_measurements_session_client_fkey"
            columns: ["session_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id", "client_id"]
          },
        ]
      }
      session_program_record_revisions_v2: {
        Row: {
          actor_user_id: string
          client_id: string
          created_at: string
          id: string
          organization_id: string
          prior_measurement: Json
          reason: string
          record_id: string
          replacement_measurement: Json
          revision: number
          test_run_id: string | null
        }
        Insert: {
          actor_user_id: string
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          prior_measurement: Json
          reason: string
          record_id: string
          replacement_measurement: Json
          revision: number
          test_run_id?: string | null
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          prior_measurement?: Json
          reason?: string
          record_id?: string
          replacement_measurement?: Json
          revision?: number
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_program_record_revisi_organization_id_client_id_re_fkey"
            columns: ["organization_id", "client_id", "record_id"]
            isOneToOne: false
            referencedRelation: "session_program_records_v2"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "session_program_record_revisio_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "session_program_record_revisions_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "session_program_record_revisions_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_program_records: {
        Row: {
          actor_user_id: string
          client_id: string
          created_at: string
          dimension: string
          id: string
          payload: Json
          program_version_id: string
          session_id: string
          submitted: boolean
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          actor_user_id: string
          client_id: string
          created_at?: string
          dimension: string
          id: string
          payload: Json
          program_version_id: string
          session_id: string
          submitted?: boolean
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          created_at?: string
          dimension?: string
          id?: string
          payload?: Json
          program_version_id?: string
          session_id?: string
          submitted?: boolean
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_program_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_program_records_program_version_id_fkey"
            columns: ["program_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_program_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinical_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_program_records_v2: {
        Row: {
          actor_user_id: string
          client_id: string
          created_at: string
          dimension: string
          discarded_at: string | null
          id: string
          measurement: Json
          organization_id: string
          program_id: string
          program_version_id: string
          schema_version: number
          session_id: string
          state: string
          submitted_at: string | null
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          actor_user_id: string
          client_id: string
          created_at?: string
          dimension: string
          discarded_at?: string | null
          id: string
          measurement: Json
          organization_id: string
          program_id: string
          program_version_id: string
          schema_version?: number
          session_id: string
          state: string
          submitted_at?: string | null
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          created_at?: string
          dimension?: string
          discarded_at?: string | null
          id?: string
          measurement?: Json
          organization_id?: string
          program_id?: string
          program_version_id?: string
          schema_version?: number
          session_id?: string
          state?: string
          submitted_at?: string | null
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_program_records_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "session_program_records_v2_organization_id_client_id_prog_fkey1"
            columns: [
              "organization_id",
              "client_id",
              "program_id",
              "program_version_id",
            ]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: [
              "organization_id",
              "client_id",
              "program_id",
              "id",
            ]
          },
          {
            foreignKeyName: "session_program_records_v2_organization_id_client_id_progr_fkey"
            columns: ["organization_id", "client_id", "program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["organization_id", "client_id", "id"]
          },
          {
            foreignKeyName: "session_program_records_v2_organization_id_client_id_sessi_fkey"
            columns: ["organization_id", "client_id", "session_id"]
            isOneToOne: false
            referencedRelation: "clinical_session_v2_state"
            referencedColumns: ["organization_id", "client_id", "session_id"]
          },
          {
            foreignKeyName: "session_program_records_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_program_records_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      siblings: {
        Row: {
          birth_date: string | null
          client_id: string
          created_at: string
          id: string
          initials: string
          position: number
          test_run_id: string | null
        }
        Insert: {
          birth_date?: string | null
          client_id: string
          created_at?: string
          id?: string
          initials: string
          position: number
          test_run_id?: string | null
        }
        Update: {
          birth_date?: string | null
          client_id?: string
          created_at?: string
          id?: string
          initials?: string
          position?: number
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "siblings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      student_access_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          client_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          organization_id: string
          test_run_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          client_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          organization_id: string
          test_run_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          client_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          organization_id?: string
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_access_audit_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assignments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          effective_at: string
          ended_at: string | null
          id: string
          is_primary: boolean
          organization_id: string
          role: string
          status: string
          test_run_id: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          ended_at?: string | null
          id?: string
          is_primary?: boolean
          organization_id: string
          role: string
          status?: string
          test_run_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          effective_at?: string
          ended_at?: string | null
          id?: string
          is_primary?: boolean
          organization_id?: string
          role?: string
          status?: string
          test_run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_authorization_decisions: {
        Row: {
          client_id: string
          created_at: string
          decider_user_id: string
          decision: string
          effective_at: string
          expires_at: string | null
          granted_actions: string[]
          id: string
          organization_id: string
          reason: string
          request_id: string
          supersedes_decision_id: string | null
          test_run_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          decider_user_id: string
          decision: string
          effective_at?: string
          expires_at?: string | null
          granted_actions?: string[]
          id?: string
          organization_id: string
          reason?: string
          request_id: string
          supersedes_decision_id?: string | null
          test_run_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          decider_user_id?: string
          decision?: string
          effective_at?: string
          expires_at?: string | null
          granted_actions?: string[]
          id?: string
          organization_id?: string
          reason?: string
          request_id?: string
          supersedes_decision_id?: string | null
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_authorization_decisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_authorization_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_authorization_decisions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "student_authorization_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_authorization_decisions_supersedes_decision_id_fkey"
            columns: ["supersedes_decision_id"]
            isOneToOne: false
            referencedRelation: "student_authorization_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_authorization_requests: {
        Row: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
          reason: string
          requested_actions: string[]
          requester_user_id: string
          resolved_at: string | null
          resource_type: string
          status: string
          test_run_id: string | null
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          reason: string
          requested_actions: string[]
          requester_user_id: string
          resolved_at?: string | null
          resource_type: string
          status?: string
          test_run_id?: string | null
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string
          requested_actions?: string[]
          requester_user_id?: string
          resolved_at?: string | null
          resource_type?: string
          status?: string
          test_run_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_authorization_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_authorization_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_external_access_v2: {
        Row: {
          access_level: string
          client_id: string
          granted_at: string
          id: string
          invitation_id: string
          organization_id: string
          revoked_at: string | null
          status: string
          test_run_id: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          access_level: string
          client_id: string
          granted_at?: string
          id: string
          invitation_id: string
          organization_id: string
          revoked_at?: string | null
          status: string
          test_run_id?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          access_level?: string
          client_id?: string
          granted_at?: string
          id?: string
          invitation_id?: string
          organization_id?: string
          revoked_at?: string | null
          status?: string
          test_run_id?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_external_access_v2_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: true
            referencedRelation: "student_share_invitations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_external_access_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "student_external_access_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_external_access_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      student_share_events_v2: {
        Row: {
          actor_user_id: string
          client_id: string
          event_type: string
          id: string
          invitation_id: string
          occurred_at: string
          organization_id: string
          reason: string
          sequence: number
          snapshot: Json
          test_run_id: string | null
        }
        Insert: {
          actor_user_id: string
          client_id: string
          event_type: string
          id: string
          invitation_id: string
          occurred_at?: string
          organization_id: string
          reason?: string
          sequence: number
          snapshot: Json
          test_run_id?: string | null
        }
        Update: {
          actor_user_id?: string
          client_id?: string
          event_type?: string
          id?: string
          invitation_id?: string
          occurred_at?: string
          organization_id?: string
          reason?: string
          sequence?: number
          snapshot?: Json
          test_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_share_events_v2_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "student_share_invitations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_share_events_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "student_share_events_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_share_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      student_share_invitations_v2: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          access_level: string
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          invited_by: string
          message: string
          organization_id: string
          recipient_email: string
          recipient_user_id: string | null
          revoked_at: string | null
          status: string
          test_run_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_level: string
          client_id: string
          created_at?: string
          expires_at?: string | null
          id: string
          invited_by: string
          message?: string
          organization_id: string
          recipient_email: string
          recipient_user_id?: string | null
          revoked_at?: string | null
          status: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          access_level?: string
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          message?: string
          organization_id?: string
          recipient_email?: string
          recipient_user_id?: string | null
          revoked_at?: string | null
          status?: string
          test_run_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_share_invitations_v2_organization_id_client_id_fkey"
            columns: ["organization_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "student_share_invitations_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_share_invitations_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      support_ticket_events_v2: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          from_status: string | null
          id: string
          organization_id: string
          payload: Json
          reason: string | null
          test_run_id: string | null
          ticket_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          organization_id: string
          payload?: Json
          reason?: string | null
          test_run_id?: string | null
          ticket_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          organization_id?: string
          payload?: Json
          reason?: string | null
          test_run_id?: string | null
          ticket_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_v2_organization_id_actor_user_id_fkey"
            columns: ["organization_id", "actor_user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "support_ticket_events_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "support_ticket_events_v2_organization_id_ticket_id_fkey"
            columns: ["organization_id", "ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_v2"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      support_ticket_messages_v2: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          organization_id: string
          sequence: number
          test_run_id: string | null
          ticket_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id: string
          organization_id: string
          sequence: number
          test_run_id?: string | null
          ticket_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
          sequence?: number
          test_run_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_v2_organization_id_author_user_id_fkey"
            columns: ["organization_id", "author_user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "support_ticket_messages_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "support_ticket_messages_v2_organization_id_ticket_id_fkey"
            columns: ["organization_id", "ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_v2"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      support_tickets_v2: {
        Row: {
          category: string
          created_at: string
          id: string
          organization_id: string
          requester_user_id: string
          status: string
          test_run_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          organization_id: string
          requester_user_id: string
          status?: string
          test_run_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          organization_id?: string
          requester_user_id?: string
          status?: string
          test_run_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_v2_organization_id_requester_user_id_fkey"
            columns: ["organization_id", "requester_user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "support_tickets_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      test_data_batches: {
        Row: {
          cleaned_at: string | null
          created_by: string | null
          frozen_at: string | null
          id: string
          opened_at: string
          organization_id: string
          source: string
          status: string
        }
        Insert: {
          cleaned_at?: string | null
          created_by?: string | null
          frozen_at?: string | null
          id: string
          opened_at?: string
          organization_id: string
          source?: string
          status?: string
        }
        Update: {
          cleaned_at?: string | null
          created_by?: string | null
          frozen_at?: string | null
          id?: string
          opened_at?: string
          organization_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_data_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_data_cleanup_log: {
        Row: {
          actor_user_id: string
          created_at: string
          deleted_clients: number
          id: string
          organization_id: string
          summary: Json
          test_run_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          deleted_clients: number
          id?: string
          organization_id: string
          summary: Json
          test_run_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          deleted_clients?: number
          id?: string
          organization_id?: string
          summary?: Json
          test_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_data_cleanup_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications_v2: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          organization_id: string
          read_at: string | null
          resource_path: string
          share_event_id: string | null
          test_run_id: string | null
          title: string
          user_id: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          organization_id: string
          read_at?: string | null
          resource_path: string
          share_event_id?: string | null
          test_run_id?: string | null
          title: string
          user_id: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string
          read_at?: string | null
          resource_path?: string
          share_event_id?: string | null
          test_run_id?: string | null
          title?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_v2_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_v2_organization_id_test_run_id_fkey"
            columns: ["organization_id", "test_run_id"]
            isOneToOne: false
            referencedRelation: "test_data_batches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "user_notifications_v2_share_event_id_fkey"
            columns: ["share_event_id"]
            isOneToOne: false
            referencedRelation: "student_share_events_v2"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aba_attachment_archive_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_attachment_confirm_verified_v2: {
        Args: {
          p_actor_user_id: string
          p_confirmation: Json
          p_organization_id: string
          p_reservation: Json
          p_verified_sha256: string
        }
        Returns: Json
      }
      aba_attachment_list_v2: {
        Args: {
          p_include_archived?: boolean
          p_organization_id: string
          p_resource: Json
        }
        Returns: Json
      }
      aba_attachment_mark_verification_failed_v2: {
        Args: {
          p_actor_user_id: string
          p_organization_id: string
          p_reason: string
          p_reservation: Json
        }
        Returns: boolean
      }
      aba_attachment_read_v2: {
        Args: {
          p_organization_id: string
          p_resource: Json
          p_version_id: string
        }
        Returns: Json
      }
      aba_attachment_reserve_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_attachment_resource_authorized_v2: {
        Args: {
          p_capability: string
          p_organization_id: string
          p_resource: Json
        }
        Returns: boolean
      }
      aba_attachment_verification_target_v2: {
        Args: {
          p_confirmation: Json
          p_organization_id: string
          p_reservation: Json
        }
        Returns: Json
      }
      aba_authorized_search_v2: {
        Args: { p_limit?: number; p_organization_id: string; p_query: string }
        Returns: Json
      }
      aba_calendar_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_calendar_linkable_sessions_v2: {
        Args: { p_organization_id: string; p_student_id: string }
        Returns: Json
      }
      aba_calendar_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_chat_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_chat_eligible_participants_v2: {
        Args: { p_client_id: string; p_organization_id: string }
        Returns: Json
      }
      aba_chat_messages_read_v2: {
        Args: {
          p_after_sequence?: number
          p_conversation_id: string
          p_limit?: number
          p_organization_id: string
        }
        Returns: Json
      }
      aba_chat_read_v2: { Args: { p_organization_id: string }; Returns: Json }
      aba_claim_team_invitation_delivery: {
        Args: { p_actor: string; p_delivery: string; p_org: string }
        Returns: Json
      }
      aba_clinical_history_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_commercial_document_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_commercial_inquiry_v2: { Args: { p_inquiry: Json }; Returns: Json }
      aba_commercial_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_consent_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_dashboard_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_due_reminders_dispatch_v2: {
        Args: { p_limit?: number }
        Returns: Json
      }
      aba_family_access_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_family_access_read_v2: {
        Args: { p_client_id?: string; p_organization_id?: string }
        Returns: Json
      }
      aba_family_calendar_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_family_document_read_v2: {
        Args: {
          p_organization_id: string
          p_publication_id: string
          p_version_id: string
        }
        Returns: Json
      }
      aba_family_portal_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_family_publication_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_family_publication_manage_read_v2: {
        Args: { p_client_id: string; p_organization_id: string }
        Returns: Json
      }
      aba_finish_team_invitation_delivery: {
        Args: {
          p_actor: string
          p_claim: string
          p_delivery: string
          p_error?: string
          p_org: string
          p_outcome: string
        }
        Returns: Json
      }
      aba_identity_context: {
        Args: { p_organization_id?: string }
        Returns: Json
      }
      aba_list_students_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_notification_read_state_v2: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_notification_id: string
          p_operation_id: string
          p_read: boolean
        }
        Returns: Json
      }
      aba_notifications_read_v2: { Args: { p_limit?: number }; Returns: Json }
      aba_program_student_scope_v2: {
        Args: { p_clinic_id: string; p_student_id: string }
        Returns: Json
      }
      aba_reserve_team_invitation_delivery: {
        Args: {
          p_invite: string
          p_key: string
          p_operation: string
          p_org: string
        }
        Returns: Json
      }
      aba_resolve_team_invitation_delivery: {
        Args: {
          p_decision: string
          p_delivery: string
          p_evidence_ack: boolean
          p_expected_version: number
          p_org: string
        }
        Returns: Json
      }
      aba_save_professional_profile: {
        Args: {
          p_expected_version: number
          p_idempotency_key: string
          p_operation_id: string
          p_organization_id: string
          p_payload: Json
          p_target_user_id: string
        }
        Returns: Json
      }
      aba_student_access_decision_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_student_access_request_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_student_access_request_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_student_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_student_detail_v2: {
        Args: { p_client_id: string; p_organization_id: string }
        Returns: Json
      }
      aba_student_share_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_student_share_read_v2: {
        Args: { p_organization_id?: string }
        Returns: Json
      }
      aba_subscription_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_support_ticket_command_v2: {
        Args: { p_command: Json; p_organization_id: string }
        Returns: Json
      }
      aba_support_ticket_read_v2: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      aba_team: { Args: { p_organization_id: string }; Returns: Json }
      aba_team_invitation_deliveries: { Args: { p_org: string }; Returns: Json }
      aba_team_invitation_delivery_status: {
        Args: {
          p_invite: string
          p_key: string
          p_operation: string
          p_org: string
        }
        Returns: Json
      }
      append_clinical_history_entries: {
        Args: { p_client_id: string; p_entries: Json; p_test_run_id?: string }
        Returns: {
          client_id: string
          created_at: string
          created_by: string
          descriptor: string
          dose: string | null
          ended_on: string | null
          id: string
          kind: string
          occurred_on: string | null
          organization_id: string
          prescriber_descriptor: string | null
          started_on: string | null
          status: string
          supersedes_id: string | null
          test_run_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clinical_history_entries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      append_clinical_history_entry: {
        Args: {
          p_client_id: string
          p_descriptor: string
          p_dose?: string
          p_ended_on?: string
          p_kind: string
          p_occurred_on?: string
          p_prescriber_descriptor?: string
          p_started_on?: string
          p_supersedes_id?: string
          p_test_run_id?: string
        }
        Returns: {
          client_id: string
          created_at: string
          created_by: string
          descriptor: string
          dose: string | null
          ended_on: string | null
          id: string
          kind: string
          occurred_on: string | null
          organization_id: string
          prescriber_descriptor: string | null
          started_on: string | null
          status: string
          supersedes_id: string | null
          test_run_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clinical_history_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      command_archive_session_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      command_capture_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      command_program_draft_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      command_program_lifecycle_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      command_result_goal_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      command_session_v2: {
        Args: { p_clinic_id: string; p_command: Json }
        Returns: Json
      }
      create_client: {
        Args: {
          p_birth_date: string
          p_clinical_id: string
          p_guardians?: Json
          p_initials: string
          p_living_arrangement?: string
          p_primary_language: string
          p_siblings?: Json
          p_test_run_id?: string
        }
        Returns: {
          birth_date: string
          clinical_id: string
          created_at: string
          id: string
          initials: string
          living_arrangement: string | null
          organization_id: string
          primary_language: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_clinical_session: {
        Args: {
          p_acquisition_trials: Json
          p_behavior_measurements: Json
          p_client_id: string
          p_notes: string
          p_occurred_on: string
          p_test_run_id: string
        }
        Returns: {
          client_id: string
          created_at: string
          id: string
          notes: string | null
          occurred_on: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clinical_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_program_draft: {
        Args: {
          p_client_id: string
          p_design: Json
          p_program_type: string
          p_test_run_id?: string
          p_title: string
        }
        Returns: {
          activated_at: string | null
          client_id: string
          created_at: string
          created_by: string
          design: Json
          id: string
          organization_id: string
          program_id: string
          program_type: string
          revision: number
          supersedes_version_id: string | null
          test_run_id: string | null
          title: string
          version: number
          version_state: string
        }
        SetofOptions: {
          from: "*"
          to: "program_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_program_successor: {
        Args: {
          p_design: Json
          p_test_run_id?: string
          p_title: string
          p_version_id: string
        }
        Returns: {
          activated_at: string | null
          client_id: string
          created_at: string
          created_by: string
          design: Json
          id: string
          organization_id: string
          program_id: string
          program_type: string
          revision: number
          supersedes_version_id: string | null
          test_run_id: string | null
          title: string
          version: number
          version_state: string
        }
        SetofOptions: {
          from: "*"
          to: "program_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_student_authorization: {
        Args: {
          p_decision: string
          p_expires_at?: string
          p_request_id: string
          p_test_run_id?: string
        }
        Returns: {
          client_id: string
          created_at: string
          decider_user_id: string
          decision: string
          effective_at: string
          expires_at: string | null
          granted_actions: string[]
          id: string
          organization_id: string
          reason: string
          request_id: string
          supersedes_decision_id: string | null
          test_run_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_authorization_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_student_capabilities: {
        Args: { p_client_id: string }
        Returns: string[]
      }
      mvp_archive_session: { Args: { p_session_id: string }; Returns: Json }
      mvp_begin_clinic_invitation: {
        Args: {
          p_email: string
          p_operation_id: string
          p_organization_id: string
          p_role: string
        }
        Returns: Json
      }
      mvp_cleanup_test_run: {
        Args: {
          p_confirm?: string
          p_organization_id: string
          p_test_run_id: string
        }
        Returns: Json
      }
      mvp_complete_clinic_invitation: {
        Args: { p_operation_id: string; p_organization_id: string }
        Returns: Json
      }
      mvp_discard_record: {
        Args: { p_expected_version: number; p_id: string }
        Returns: Json
      }
      mvp_finish_session: { Args: { p_session_id: string }; Returns: Json }
      mvp_freeze_test_batch: {
        Args: { p_organization_id: string; p_test_run_id: string }
        Returns: Json
      }
      mvp_open_test_batch: {
        Args: { p_organization_id: string; p_test_run_id?: string }
        Returns: Json
      }
      mvp_save_record: {
        Args: {
          p_client_id: string
          p_dimension: string
          p_expected_version: number
          p_id: string
          p_payload: Json
          p_program_version_id: string
          p_session_id: string
          p_submit: boolean
        }
        Returns: Json
      }
      mvp_save_student: {
        Args: {
          p_client_id: string
          p_expected_updated_at: string
          p_organization_id: string
          p_payload: Json
          p_test_run_id?: string
        }
        Returns: Json
      }
      mvp_set_member: {
        Args: {
          p_organization_id: string
          p_role: string
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      mvp_set_student_status: {
        Args: {
          p_client_id: string
          p_expected_updated_at: string
          p_organization_id: string
          p_status: string
        }
        Returns: {
          birth_date: string
          clinical_id: string
          created_at: string
          id: string
          initials: string
          living_arrangement: string | null
          organization_id: string
          primary_language: string
          status: string
          test_run_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mvp_team: { Args: { p_organization_id: string }; Returns: Json }
      mvp_update_program_draft: {
        Args: {
          p_design: Json
          p_program_id: string
          p_title: string
          p_version_id: string
        }
        Returns: Json
      }
      read_program_session_v2: {
        Args: { p_clinic_id: string; p_student_id: string }
        Returns: Json
      }
      record_consent_reference: {
        Args: {
          p_channel: string
          p_client_id: string
          p_effective_at?: string
          p_evidence_reference?: string
          p_expires_at?: string
          p_grantor_descriptor: string
          p_notice_version: string
          p_purpose_code: string
          p_status: string
          p_supersedes_id?: string
          p_test_run_id?: string
        }
        Returns: {
          channel: string
          client_id: string
          created_at: string
          created_by: string
          effective_at: string | null
          evidence_attachment_id: string | null
          evidence_reference: string | null
          expires_at: string | null
          grantor_descriptor: string
          id: string
          notice_version: string
          organization_id: string
          purpose_code: string
          status: string
          supersedes_id: string | null
          test_run_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "consent_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_student_authorization: {
        Args: {
          p_actions: string[]
          p_client_id: string
          p_reason: string
          p_resource_type: string
          p_test_run_id?: string
        }
        Returns: {
          client_id: string
          created_at: string
          id: string
          organization_id: string
          reason: string
          requested_actions: string[]
          requester_user_id: string
          resolved_at: string | null
          resource_type: string
          status: string
          test_run_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "student_authorization_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_student_authorization: {
        Args: { p_decision_id: string; p_test_run_id?: string }
        Returns: {
          client_id: string
          created_at: string
          decider_user_id: string
          decision: string
          effective_at: string
          expires_at: string | null
          granted_actions: string[]
          id: string
          organization_id: string
          reason: string
          request_id: string
          supersedes_decision_id: string | null
          test_run_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "student_authorization_decisions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_client_context: {
        Args: {
          p_client_id: string
          p_expected_version?: number
          p_home_adaptations?: string
          p_school_adaptations?: string
          p_schooling?: string
          p_test_run_id?: string
        }
        Returns: {
          client_id: string
          created_at: string
          home_adaptations: string | null
          organization_id: string
          school_adaptations: string | null
          schooling: string | null
          test_run_id: string | null
          updated_at: string
          updated_by: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "client_context_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_student_assignment: {
        Args: {
          p_client_id: string
          p_role: string
          p_status?: string
          p_test_run_id?: string
          p_user_id: string
        }
        Returns: {
          client_id: string
          created_at: string
          created_by: string | null
          effective_at: string
          ended_at: string | null
          id: string
          is_primary: boolean
          organization_id: string
          role: string
          status: string
          test_run_id: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "student_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_program: {
        Args: {
          p_next_status: string
          p_program_id: string
          p_test_run_id?: string
          p_version_id: string
        }
        Returns: {
          client_id: string
          created_at: string
          created_by: string
          current_version_id: string | null
          id: string
          organization_id: string
          program_type: string
          revision: number
          status: string
          test_run_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "programs"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
