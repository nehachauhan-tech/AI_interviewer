// Auto-generate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID
// For now these are hand-written to match the migration schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ResumeAnalysis = {
  name: string;
  email: string | null;
  phone: string | null;
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  certifications: string[];
  strengths: string[];
  areas_to_explore: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          qualification: string | null;
          contact_number: string | null;
          avatar_url: string | null;
          resume_url: string | null;
          resume_analysis: ResumeAnalysis | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          qualification?: string | null;
          contact_number?: string | null;
          avatar_url?: string | null;
          resume_url?: string | null;
          resume_analysis?: ResumeAnalysis | null;
        };
        Update: {
          full_name?: string | null;
          qualification?: string | null;
          contact_number?: string | null;
          avatar_url?: string | null;
          resume_url?: string | null;
          resume_analysis?: ResumeAnalysis | null;
          updated_at?: string;
        };
      };
      interviewers: {
        Row: {
          id: string;
          name: string;
          title: string;
          company: string | null;
          avatar_url: string | null;
          bio: string | null;
          personality: string | null;
          specialties: string[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interviewers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["interviewers"]["Insert"]>;
      };
      interview_topics: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["interview_topics"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["interview_topics"]["Insert"]>;
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          interviewer_id: string;
          topic_id: string;
          status: "in_progress" | "completed" | "abandoned";
          started_at: string;
          ended_at: string | null;
          duration_secs: number | null;
          gemini_session_id: string | null;
          audio_file_path: string | null;
          audio_file_size: number | null;
          transcript_file_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          interviewer_id: string;
          topic_id: string;
          status?: "in_progress" | "completed" | "abandoned";
          gemini_session_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["interview_sessions"]["Row"]>;
      };
      session_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: "interviewer" | "user" | "system";
          content: string;
          audio_clip_path: string | null;
          sequence_no: number;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          role: "interviewer" | "user" | "system";
          content: string;
          audio_clip_path?: string | null;
          sequence_no: number;
        };
        Update: Partial<Database["public"]["Tables"]["session_messages"]["Row"]>;
      };
      session_analyses: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          overall_score: number | null;
          technical_score: number | null;
          communication_score: number | null;
          confidence_score: number | null;
          problem_solving_score: number | null;
          leadership_score: number | null;
          summary: string | null;
          strengths: string[] | null;
          areas_to_improve: string[] | null;
          action_items: string[] | null;
          detailed_feedback: string | null;
          keywords_mentioned: string[] | null;
          keywords_missed: string[] | null;
          sentiment: string | null;
          engagement_level: string | null;
          filler_word_count: number | null;
          gemini_model_used: string | null;
          analysis_run_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["session_analyses"]["Row"], "id" | "created_at" | "analysis_run_at">;
        Update: Partial<Database["public"]["Tables"]["session_analyses"]["Insert"]>;
      };
    };
    Views: {
      user_dashboard_stats: {
        Row: {
          user_id: string;
          full_name: string | null;
          total_sessions: number;
          completed_sessions: number;
          avg_overall_score: number | null;
          avg_technical_score: number | null;
          avg_communication_score: number | null;
          avg_confidence_score: number | null;
          last_session_at: string | null;
          total_practice_secs: number | null;
        };
      };
    };
  };
};
