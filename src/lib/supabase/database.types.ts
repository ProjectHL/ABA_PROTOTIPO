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
            foreignKeyName: "consent_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
        }
        Insert: {
          channel: string
          client_id: string
          created_at?: string
          created_by: string
          effective_at?: string | null
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
        }
        Update: {
          channel?: string
          client_id?: string
          created_at?: string
          created_by?: string
          effective_at?: string | null
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
            foreignKeyName: "program_lifecycle_events_program_version_id_fkey"
            columns: ["program_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      mvp_cleanup_test_run: {
        Args: {
          p_confirm?: string
          p_organization_id: string
          p_test_run_id: string
        }
        Returns: Json
      }
      mvp_finish_session: { Args: { p_session_id: string }; Returns: Json }
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
      mvp_team: { Args: { p_organization_id: string }; Returns: Json }
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
