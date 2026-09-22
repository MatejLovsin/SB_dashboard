// Hand-authored to match supabase/migrations/0001_init.sql.
// Regenerate later with: supabase gen types typescript --linked > lib/db/types.ts
// (kept in sync manually until the project is linked).

export type RoadmapStatus = 'idea' | 'planned' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type AiSection = 'fitness' | 'school' | 'work';

export type GoalSection = 'fitness' | 'school' | 'work' | 'life';
export type GoalStatus = 'active' | 'achieved' | 'archived';
export type GoalSource = 'manual' | 'auto';
export type GoalDirection = 'up' | 'down';

// The binding on an auto goal, stored in `goals.metric`. The authoritative union
// of shapes is `GoalMetric` in lib/queries/goals.ts — this stays loose because
// the column is jsonb and adding a metric kind must not need a migration.
export type GoalMetricJson = { kind: string } & Record<string, unknown>;

// One plan-target change caused by a session, persisted on workout_sessions.plan_updates
// and surfaced as the "Plan updated" banner on a session's detail / compare view.
export type PlanTargetChange = {
  exerciseName: string;
  from: { weight: number | null; reps: number | null };
  to: { weight: number | null; reps: number | null };
};

// One shorthand exercise chip on a weekly-programme day. `emphasis` encodes the
// four main lifts: heavy = near-failure, light = technique/volume, null = accessory.
export type ProgrammeEmphasis = 'heavy' | 'light';
export type ProgrammeItem = { name: string; emphasis: ProgrammeEmphasis | null };

// Snapshot of each exercise's emphasis at the moment a session was started,
// stored on workout_sessions.emphasis. Keyed by exercise_id. Frozen at log time
// so editing a plan later never relabels the sessions you already did.
export type SessionEmphasis = Record<string, ProgrammeEmphasis>;

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
      programme_days: {
        Row: { id: string; user_id: string; weekday: number; label: string | null; plan_id: string | null; items: ProgrammeItem[]; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; weekday: number; label?: string | null; plan_id?: string | null; items?: ProgrammeItem[]; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['programme_days']['Insert']>;
        Relationships: [];
      };
      plan_exercises: {
        Row: { id: string; user_id: string; plan_id: string; exercise_id: string; position: number; emphasis: ProgrammeEmphasis | null } & Timestamps;
        Insert: { id?: string; user_id?: string; plan_id: string; exercise_id: string; position?: number; emphasis?: ProgrammeEmphasis | null; created_at?: string };
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
        Row: { id: string; user_id: string; plan_id: string | null; title: string | null; performed_at: string; notes: string | null; plan_updates: PlanTargetChange[] | null; emphasis: SessionEmphasis } & Timestamps;
        Insert: { id?: string; user_id?: string; plan_id?: string | null; title?: string | null; performed_at?: string; notes?: string | null; plan_updates?: PlanTargetChange[] | null; emphasis?: SessionEmphasis; created_at?: string };
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
        Row: { id: string; user_id: string; subject_id: string; title: string | null; exam_date: string; perceived_difficulty: number | null; grade: number | null; target_study_hours: number | null; retake_of: string | null; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; subject_id: string; title?: string | null; exam_date: string; perceived_difficulty?: number | null; grade?: number | null; target_study_hours?: number | null; retake_of?: string | null; created_at?: string; updated_at?: string };
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
        Row: { id: string; user_id: string; board_id: string; title: string; description: string | null; status: RoadmapStatus; priority: Priority | null; position: number; done_at: string | null; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; board_id: string; title: string; description?: string | null; status?: RoadmapStatus; priority?: Priority | null; position?: number; done_at?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['roadmap_cards']['Insert']>;
        Relationships: [];
      };
      work_boards: {
        Row: { id: string; user_id: string; name: string; position: number; created_at: string };
        Insert: { id?: string; user_id?: string; name: string; position?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['work_boards']['Insert']>;
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
      cardio_sessions: {
        Row: { id: string; user_id: string; performed_at: string; notes: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; performed_at?: string; notes?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['cardio_sessions']['Insert']>;
        Relationships: [];
      };
      cardio_entries: {
        Row: { id: string; user_id: string; session_id: string; activity: string; position: number; duration_minutes: number; intensity: number; distance_km: number | null; notes: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; session_id: string; activity: string; position?: number; duration_minutes: number; intensity: number; distance_km?: number | null; notes?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['cardio_entries']['Insert']>;
        Relationships: [];
      };
      goals: {
        Row: { id: string; user_id: string; section: GoalSection; title: string; description: string | null; unit: string | null; start_value: number | null; target_value: number | null; direction: GoalDirection; source: GoalSource; metric: GoalMetricJson | null; status: GoalStatus; achieved_at: string | null; deadline: string | null; pinned: boolean; position: number; updated_at: string } & Timestamps;
        Insert: { id?: string; user_id?: string; section: GoalSection; title: string; description?: string | null; unit?: string | null; start_value?: number | null; target_value?: number | null; direction?: GoalDirection; source?: GoalSource; metric?: GoalMetricJson | null; status?: GoalStatus; achieved_at?: string | null; deadline?: string | null; pinned?: boolean; position?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database['public']['Tables']['goals']['Insert']>;
        Relationships: [];
      };
      goal_milestones: {
        Row: { id: string; user_id: string; goal_id: string; label: string | null; value: number | null; position: number; completed: boolean; first_hit_at: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; goal_id: string; label?: string | null; value?: number | null; position?: number; completed?: boolean; first_hit_at?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['goal_milestones']['Insert']>;
        Relationships: [];
      };
      goal_checkins: {
        Row: { id: string; user_id: string; goal_id: string; value: number; recorded_at: string; note: string | null } & Timestamps;
        Insert: { id?: string; user_id?: string; goal_id: string; value: number; recorded_at?: string; note?: string | null; created_at?: string };
        Update: Partial<Database['public']['Tables']['goal_checkins']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      roadmap_status: RoadmapStatus;
      priority: Priority;
      ai_section: AiSection;
      goal_section: GoalSection;
      goal_status: GoalStatus;
      goal_source: GoalSource;
      goal_direction: GoalDirection;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases.
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Exercise = Tables<'exercises'>;
export type WorkoutPlan = Tables<'workout_plans'>;
export type ProgrammeDay = Tables<'programme_days'>;
export type PlanExercise = Tables<'plan_exercises'>;
export type PlanSet = Tables<'plan_sets'>;
export type WorkoutSession = Tables<'workout_sessions'>;
export type SessionSet = Tables<'session_sets'>;
export type Subject = Tables<'subjects'>;
export type Exam = Tables<'exams'>;
export type StudySession = Tables<'study_sessions'>;
export type DiscardedStudySession = Tables<'discarded_study_sessions'>;
export type RoadmapCard = Tables<'roadmap_cards'>;
export type WorkBoard = Tables<'work_boards'>;
export type Note = Tables<'notes'>;
export type WorkMetric = Tables<'work_metrics'>;
export type AiSummary = Tables<'ai_summaries'>;
export type BodyMetric = Tables<'body_metrics'>;
export type JournalWeek = Tables<'journal_weeks'>;
export type TodoPin = Tables<'todo_pins'>;
export type Todo = Tables<'todos'>;
export type CardioSession = Tables<'cardio_sessions'>;
export type CardioEntry = Tables<'cardio_entries'>;
export type Goal = Tables<'goals'>;
export type GoalMilestone = Tables<'goal_milestones'>;
export type GoalCheckin = Tables<'goal_checkins'>;
