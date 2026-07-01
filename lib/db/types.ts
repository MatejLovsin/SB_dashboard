// Hand-authored to match supabase/migrations/0001_init.sql.
// Regenerate later with: supabase gen types typescript --linked > lib/db/types.ts
// (kept in sync manually until the project is linked).

export type RoadmapStatus = 'idea' | 'planned' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type AiSection = 'fitness' | 'school' | 'work';

// One plan-target change caused by a session, persisted on workout_sessions.plan_updates
// and surfaced as the "Plan updated" banner on a session's detail / compare view.
export type PlanTargetChange = {
  exerciseName: string;
  from: { weight: number | null; reps: number | null };
  to: { weight: number | null; reps: number | null };
};

type Timestamps = { created_at: string };

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: { id: string; user_id: string; name: string; category: string | null; notes: string | null; pinned: boolean } & Timestamps;
        Insert: { id?: string; user_id?: string; name: string; category?: string | null; notes?: string | null; pinned?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>;
        Relationships: [];
      };
      workout_plans: {
        Row: { id: string; user_id: string; name: string; category: string | null; notes: string | null; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; name: string; category?: string | null; notes?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['workout_plans']['Insert']>;
        Relationships: [];
      };
      plan_exercises: {
        Row: { id: string; user_id: string; plan_id: string; exercise_id: string; position: number } & Timestamps;
        Insert: { id?: string; user_id?: string; plan_id: string; exercise_id: string; position?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['plan_exercises']['Insert']>;
        Relationships: [];
      };
      plan_sets: {
        Row: { id: string; user_id: string; plan_exercise_id: string; position: number; target_reps: number | null; target_weight: number | null; base_reps: number | null; base_weight: number | null } & Timestamps;
        Insert: { id?: string; user_id?: string; plan_exercise_id: string; position?: number; target_reps?: number | null; target_weight?: number | null; base_reps?: number | null; base_weight?: number | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['plan_sets']['Insert']>;
        Relationships: [];
      };
      workout_sessions: {
        Row: { id: string; user_id: string; plan_id: string | null; title: string | null; performed_at: string; notes: string | null; plan_updates: PlanTargetChange[] | null } & Timestamps;
        Insert: { id?: string; user_id?: string; plan_id?: string | null; title?: string | null; performed_at?: string; notes?: string | null; plan_updates?: PlanTargetChange[] | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['workout_sessions']['Insert']>;
        Relationships: [];
      };
      session_sets: {
        Row: { id: string; user_id: string; session_id: string; exercise_id: string; plan_set_id: string | null; set_number: number; position: number; reps: number | null; weight: number | null; completed: boolean } & Timestamps;
        Insert: { id?: string; user_id?: string; session_id: string; exercise_id: string; plan_set_id?: string | null; set_number: number; position?: number; reps?: number | null; weight?: number | null; completed?: boolean; created_at?: string };
        Update: Partial<Database['public']['Tables']['session_sets']['Insert']>;
        Relationships: [];
      };
      subjects: {
        Row: { id: string; user_id: string; name: string; color: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; name: string; color?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
        Relationships: [];
      };
      exams: {
        Row: { id: string; user_id: string; subject_id: string; title: string | null; exam_date: string; perceived_difficulty: number | null; grade: number | null; target_study_hours: number | null; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; subject_id: string; title?: string | null; exam_date: string; perceived_difficulty?: number | null; grade?: number | null; target_study_hours?: number | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['exams']['Insert']>;
        Relationships: [];
      };
      study_sessions: {
        Row: { id: string; user_id: string; subject_id: string; exam_id: string | null; started_at: string; ended_at: string | null; duration_seconds: number; note: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; subject_id: string; exam_id?: string | null; started_at: string; ended_at?: string | null; duration_seconds: number; note?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['study_sessions']['Insert']>;
        Relationships: [];
      };
      discarded_study_sessions: {
        Row: { id: string; user_id: string; subject_id: string; exam_id: string | null; started_at: string; duration_seconds: number; note: string | null; discarded_at: string; created_at: string };
        Insert: { id?: string; user_id?: string; subject_id: string; exam_id?: string | null; started_at: string; duration_seconds: number; note?: string | null; discarded_at?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['discarded_study_sessions']['Insert']>;
        Relationships: [];
      };
      roadmap_cards: {
        Row: { id: string; user_id: string; title: string; description: string | null; status: RoadmapStatus; priority: Priority | null; position: number; done_at: string | null; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; title: string; description?: string | null; status?: RoadmapStatus; priority?: Priority | null; position?: number; done_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['roadmap_cards']['Insert']>;
        Relationships: [];
      };
      notes: {
        Row: { id: string; user_id: string; title: string; body: string | null; entry_date: string; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; title: string; body?: string | null; entry_date?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
        Relationships: [];
      };
      work_metrics: {
        Row: { id: string; user_id: string; date: string; value: number; label: string; created_at: string };
        Insert: { id?: string; user_id?: string; date: string; value: number; label?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['work_metrics']['Insert']>;
        Relationships: [];
      };
      ai_summaries: {
        Row: { id: string; user_id: string; section: AiSection; content: string; model: string; generated_at: string };
        Insert: { id?: string; user_id?: string; section: AiSection; content: string; model: string; generated_at?: string };
        Update: Partial<Database['public']['Tables']['ai_summaries']['Insert']>;
        Relationships: [];
      };
      body_metrics: {
        Row: { id: string; user_id: string; recorded_at: string; weight_kg: number; bodyfat_pct: number | null; created_at: string };
        Insert: { id?: string; user_id?: string; recorded_at?: string; weight_kg: number; bodyfat_pct?: number | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['body_metrics']['Insert']>;
        Relationships: [];
      };
      journal_weeks: {
        Row: { id: string; user_id: string; week_start: string; content: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id?: string; week_start: string; content: string; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['journal_weeks']['Insert']>;
        Relationships: [];
      };
      todo_pins: {
        Row: { id: string; user_id: string; title: string; position: number; created_at: string };
        Insert: { id?: string; user_id?: string; title: string; position?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['todo_pins']['Insert']>;
        Relationships: [];
      };
      todos: {
        Row: { id: string; user_id: string; title: string; due_date: string; position: number; completed: boolean; completed_at: string | null; pin_id: string | null; created_at: string };
        Insert: { id?: string; user_id?: string; title: string; due_date: string; position?: number; completed?: boolean; completed_at?: string | null; pin_id?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['todos']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      roadmap_status: RoadmapStatus;
      priority: Priority;
      ai_section: AiSection;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases.
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Exercise = Tables<'exercises'>;
export type WorkoutPlan = Tables<'workout_plans'>;
export type PlanExercise = Tables<'plan_exercises'>;
export type PlanSet = Tables<'plan_sets'>;
export type WorkoutSession = Tables<'workout_sessions'>;
export type SessionSet = Tables<'session_sets'>;
export type Subject = Tables<'subjects'>;
export type Exam = Tables<'exams'>;
export type StudySession = Tables<'study_sessions'>;
export type DiscardedStudySession = Tables<'discarded_study_sessions'>;
export type RoadmapCard = Tables<'roadmap_cards'>;
export type Note = Tables<'notes'>;
export type WorkMetric = Tables<'work_metrics'>;
export type AiSummary = Tables<'ai_summaries'>;
export type BodyMetric = Tables<'body_metrics'>;
export type JournalWeek = Tables<'journal_weeks'>;
export type TodoPin = Tables<'todo_pins'>;
export type Todo = Tables<'todos'>;
