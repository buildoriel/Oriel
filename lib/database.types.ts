// Generated from the live Supabase schema (supabase gen types typescript). Regenerate with `npm run db:types`.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abuse_reports: {
        Row: {
          category: string
          created_at: string
          details: string
          hostname: string
          id: number
          ip_hash: string
          project_id: string | null
          reporter_email: string | null
          reporter_user_id: string | null
          resolved_at: string | null
          status: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          details?: string
          hostname: string
          id?: number
          ip_hash: string
          project_id?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          status?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          details?: string
          hostname?: string
          id?: number
          ip_hash?: string
          project_id?: string | null
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          status?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "abuse_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abuse_reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          finished_at: string | null
          id: number
          project_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          finished_at?: string | null
          id?: number
          project_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          finished_at?: string | null
          id?: number
          project_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          action_kind: string
          cache_read_tokens: number
          cache_write_tokens: number
          cost_usd: number
          created_at: string
          credits: number
          funded_by: string
          id: number
          input_tokens: number
          model: string
          output_tokens: number
          project_id: string | null
          user_id: string
        }
        Insert: {
          action_kind: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_usd: number
          created_at?: string
          credits: number
          funded_by?: string
          id?: number
          input_tokens?: number
          model: string
          output_tokens?: number
          project_id?: string | null
          user_id: string
        }
        Update: {
          action_kind?: string
          cache_read_tokens?: number
          cache_write_tokens?: number
          cost_usd?: number
          created_at?: string
          credits?: number
          funded_by?: string
          id?: number
          input_tokens?: number
          model?: string
          output_tokens?: number
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buybacks: {
        Row: {
          executed_at: string | null
          id: number
          period: string
          status: string
          tx_hash: string | null
          usd_amount: number
        }
        Insert: {
          executed_at?: string | null
          id?: number
          period: string
          status?: string
          tx_hash?: string | null
          usd_amount: number
        }
        Update: {
          executed_at?: string | null
          id?: number
          period?: string
          status?: string
          tx_hash?: string | null
          usd_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "buybacks_period_fkey"
            columns: ["period"]
            isOneToOne: false
            referencedRelation: "monthly_economics"
            referencedColumns: ["period"]
          },
        ]
      }
      connectors: {
        Row: {
          access_token_enc: string
          account_label: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token_enc: string | null
          scopes: string | null
          user_id: string
        }
        Insert: {
          access_token_enc: string
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token_enc?: string | null
          scopes?: string | null
          user_id: string
        }
        Update: {
          access_token_enc?: string
          account_label?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token_enc?: string | null
          scopes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connectors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payouts: {
        Row: {
          amount_usd: number
          created_at: string
          creator_id: string
          id: number
          period: string | null
          status: string
          tx_hash: string | null
          wallet: string | null
        }
        Insert: {
          amount_usd: number
          created_at?: string
          creator_id: string
          id?: number
          period?: string | null
          status?: string
          tx_hash?: string | null
          wallet?: string | null
        }
        Update: {
          amount_usd?: number
          created_at?: string
          creator_id?: string
          id?: number
          period?: string | null
          status?: string
          tx_hash?: string | null
          wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          monthly: number
          topup: number
          updated_at: string
          user_id: string
        }
        Insert: {
          monthly?: number
          topup?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          monthly?: number
          topup?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          bucket: string
          created_at: string
          delta: number
          id: number
          meta: Json
          reason: Database["public"]["Enums"]["credit_reason"]
          ref_id: string | null
          user_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          delta: number
          id?: number
          meta?: Json
          reason: Database["public"]["Enums"]["credit_reason"]
          ref_id?: string | null
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          delta?: number
          id?: number
          meta?: Json
          reason?: Database["public"]["Enums"]["credit_reason"]
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          last_error: string | null
          owner_id: string
          project_id: string
          status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          last_error?: string | null
          owner_id: string
          project_id: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          last_error?: string | null
          owner_id?: string
          project_id?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          action_kind: string | null
          content: string
          created_at: string
          credits: number | null
          id: number
          model: string | null
          project_id: string
          role: string
        }
        Insert: {
          action_kind?: string | null
          content: string
          created_at?: string
          credits?: number | null
          id?: number
          model?: string | null
          project_id: string
          role: string
        }
        Update: {
          action_kind?: string | null
          content?: string
          created_at?: string
          credits?: number | null
          id?: number
          model?: string | null
          project_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_economics: {
        Row: {
          ai_cost_usd: number
          buyback_usd: number
          created_at: string
          margin_usd: number
          merkle_root: string | null
          ops_usd: number
          period: string
          revenue_usd: number
          revshare_usd: number
          staker_budget_usd: number
          staker_demand_usd: number
          staker_scale: number
          staker_used_usd: number
        }
        Insert: {
          ai_cost_usd: number
          buyback_usd: number
          created_at?: string
          margin_usd: number
          merkle_root?: string | null
          ops_usd: number
          period: string
          revenue_usd: number
          revshare_usd: number
          staker_budget_usd: number
          staker_demand_usd: number
          staker_scale: number
          staker_used_usd: number
        }
        Update: {
          ai_cost_usd?: number
          buyback_usd?: number
          created_at?: string
          margin_usd?: number
          merkle_root?: string | null
          ops_usd?: number
          period?: string
          revenue_usd?: number
          revshare_usd?: number
          staker_budget_usd?: number
          staker_demand_usd?: number
          staker_scale?: number
          staker_used_usd?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: number
          kind: string
          read: boolean
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: number
          kind: string
          read?: boolean
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: number
          kind?: string
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_raw: number
          chain_id: number
          created_at: string
          credits: number
          id: string
          kind: string
          product: string
          status: string
          token: string
          tx_hash: string
          usd_value: number
          user_id: string
        }
        Insert: {
          amount_raw: number
          chain_id: number
          created_at?: string
          credits?: number
          id?: string
          kind: string
          product: string
          status?: string
          token: string
          tx_hash: string
          usd_value: number
          user_id: string
        }
        Update: {
          amount_raw?: number
          chain_id?: number
          created_at?: string
          credits?: number
          id?: string
          kind?: string
          product?: string
          status?: string
          token?: string
          tx_hash?: string
          usd_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_samples: {
        Row: {
          block_number: number | null
          id: number
          price_usd: number
          sampled_at: string
        }
        Insert: {
          block_number?: number | null
          id?: number
          price_usd: number
          sampled_at?: string
        }
        Update: {
          block_number?: number | null
          id?: number
          price_usd?: number
          sampled_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          free_credits_claimed_at: string | null
          grace_until: string | null
          handle: string | null
          id: string
          premium_builds_used: number
          purchased_tier: string | null
          purchased_tier_until: string | null
          referral_code: string
          referred_by: string | null
          staked_tier: string
          wallet_address: string | null
          wallet_verified_at: string | null
        }
        Insert: {
          created_at?: string
          free_credits_claimed_at?: string | null
          grace_until?: string | null
          handle?: string | null
          id: string
          premium_builds_used?: number
          purchased_tier?: string | null
          purchased_tier_until?: string | null
          referral_code?: string
          referred_by?: string | null
          staked_tier?: string
          wallet_address?: string | null
          wallet_verified_at?: string | null
        }
        Update: {
          created_at?: string
          free_credits_claimed_at?: string | null
          grace_until?: string | null
          handle?: string | null
          id?: string
          premium_builds_used?: number
          purchased_tier?: string | null
          purchased_tier_until?: string | null
          referral_code?: string
          referred_by?: string | null
          staked_tier?: string
          wallet_address?: string | null
          wallet_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_purchased_tier_fkey"
            columns: ["purchased_tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_staked_tier_fkey"
            columns: ["staked_tier"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          content: string
          path: string
          project_id: string
          updated_at: string
        }
        Insert: {
          content: string
          path: string
          project_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          path?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          bytes: number
          created_at: string
          file_count: number
          id: number
          project_id: string
          version: number
        }
        Insert: {
          bytes: number
          created_at?: string
          file_count: number
          id?: number
          project_id: string
          version: number
        }
        Update: {
          bytes?: number
          created_at?: string
          file_count?: number
          id?: number
          project_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          featured_at: string | null
          github_autocommit: boolean
          github_repo: string | null
          id: string
          kind: string
          name: string
          netlify_site_id: string | null
          owner_id: string
          published_version: number | null
          showcase_opt_in: boolean
          slug: string
          supabase_anon_key: string | null
          supabase_ref: string | null
          supabase_url: string | null
          suspended_at: string | null
          suspended_reason: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          featured_at?: string | null
          github_autocommit?: boolean
          github_repo?: string | null
          id?: string
          kind?: string
          name: string
          netlify_site_id?: string | null
          owner_id: string
          published_version?: number | null
          showcase_opt_in?: boolean
          slug: string
          supabase_anon_key?: string | null
          supabase_ref?: string | null
          supabase_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          featured_at?: string | null
          github_autocommit?: boolean
          github_repo?: string | null
          id?: string
          kind?: string
          name?: string
          netlify_site_id?: string | null
          owner_id?: string
          published_version?: number | null
          showcase_opt_in?: boolean
          slug?: string
          supabase_anon_key?: string | null
          supabase_ref?: string | null
          supabase_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_template_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: number
          referred_id: string
          referrer_id: string
          reward_credits: number | null
          rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: number
          referred_id: string
          referrer_id: string
          reward_credits?: number | null
          rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: number
          referred_id?: string
          referrer_id?: string
          reward_credits?: number | null
          rewarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_slugs: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      revshare_allocations: {
        Row: {
          amount_raw: number
          period: string
          proof: Json | null
          user_id: string
          wallet: string
        }
        Insert: {
          amount_raw: number
          period: string
          proof?: Json | null
          user_id: string
          wallet: string
        }
        Update: {
          amount_raw?: number
          period?: string
          proof?: Json | null
          user_id?: string
          wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "revshare_allocations_period_fkey"
            columns: ["period"]
            isOneToOne: false
            referencedRelation: "monthly_economics"
            referencedColumns: ["period"]
          },
          {
            foreignKeyName: "revshare_allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_uses: {
        Row: {
          created_at: string
          credits: number
          id: number
          payout_id: number | null
          project_id: string
          royalty_usd: number
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: number
          payout_id?: number | null
          project_id: string
          royalty_usd: number
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: number
          payout_id?: number | null
          project_id?: string
          royalty_usd?: number
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_uses_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "creator_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category: string
          created_at: string
          creator_id: string
          description: string
          id: string
          price_credits: number
          published: boolean
          source_project_id: string
          source_version: number
          title: string
          uses: number
        }
        Insert: {
          category?: string
          created_at?: string
          creator_id: string
          description?: string
          id?: string
          price_credits: number
          published?: boolean
          source_project_id: string
          source_version: number
          title: string
          uses?: number
        }
        Update: {
          category?: string
          created_at?: string
          creator_id?: string
          description?: string
          id?: string
          price_credits?: number
          published?: boolean
          source_project_id?: string
          source_version?: number
          title?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_evaluations: {
        Row: {
          created_at: string
          grace_until: string | null
          id: number
          new_tier: string
          period: string
          prev_tier: string
          stake_value_usd: number
          staked_raw: number
          twap_usd: number
          user_id: string
        }
        Insert: {
          created_at?: string
          grace_until?: string | null
          id?: number
          new_tier: string
          period: string
          prev_tier: string
          stake_value_usd: number
          staked_raw: number
          twap_usd: number
          user_id: string
        }
        Update: {
          created_at?: string
          grace_until?: string | null
          id?: number
          new_tier?: string
          period?: string
          prev_tier?: string
          stake_value_usd?: number
          staked_raw?: number
          twap_usd?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          connectors: string[]
          free_domain_per_year: boolean
          id: string
          max_custom_domains: number
          max_projects: number | null
          model_build: string
          model_edit: string
          model_large: string
          monthly_credits: number
          premium_build_quota: number
          price_usd: number
          rank: number
          revshare_weight: number
          stake_usd: number | null
        }
        Insert: {
          connectors?: string[]
          free_domain_per_year?: boolean
          id: string
          max_custom_domains?: number
          max_projects?: number | null
          model_build: string
          model_edit: string
          model_large: string
          monthly_credits: number
          premium_build_quota?: number
          price_usd: number
          rank: number
          revshare_weight?: number
          stake_usd?: number | null
        }
        Update: {
          connectors?: string[]
          free_domain_per_year?: boolean
          id?: string
          max_custom_domains?: number
          max_projects?: number | null
          model_build?: string
          model_edit?: string
          model_large?: string
          monthly_credits?: number
          premium_build_quota?: number
          price_usd?: number
          rank?: number
          revshare_weight?: number
          stake_usd?: number | null
        }
        Relationships: []
      }
      wallet_nonces: {
        Row: {
          expires_at: string
          nonce: string
          user_id: string
        }
        Insert: {
          expires_at: string
          nonce: string
          user_id: string
        }
        Update: {
          expires_at?: string
          nonce?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_nonces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      my_connectors: {
        Row: {
          account_label: string | null
          created_at: string | null
          id: string | null
          provider: string | null
          scopes: string | null
          user_id: string | null
        }
        Insert: {
          account_label?: string | null
          created_at?: string | null
          id?: string | null
          provider?: string | null
          scopes?: string | null
          user_id?: string | null
        }
        Update: {
          account_label?: string | null
          created_at?: string | null
          id?: string | null
          provider?: string | null
          scopes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connectors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      begin_agent_run: {
        Args: { p_project: string; p_user: string }
        Returns: number
      }
      claim_free_credits: {
        Args: { p_amount: number; p_user: string }
        Returns: boolean
      }
      effective_tier: { Args: { p_user: string }; Returns: string }
      grant_credits: {
        Args: {
          p_amount: number
          p_bucket: string
          p_meta?: Json
          p_reason: Database["public"]["Enums"]["credit_reason"]
          p_ref?: string
          p_user: string
        }
        Returns: number
      }
      increment_template_uses: {
        Args: { p_template: string }
        Returns: undefined
      }
      reset_monthly_credits: {
        Args: { p_amount: number; p_period: string; p_user: string }
        Returns: undefined
      }
      spend_credits: {
        Args: {
          p_amount: number
          p_meta?: Json
          p_reason: Database["public"]["Enums"]["credit_reason"]
          p_ref?: string
          p_user: string
        }
        Returns: number
      }
    }
    Enums: {
      credit_reason:
        | "monthly_refill"
        | "topup"
        | "free_grant"
        | "ai_usage"
        | "template_use"
        | "referral_reward"
        | "refund"
        | "admin_adjust"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]
export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"]
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      credit_reason: [
        "monthly_refill",
        "topup",
        "free_grant",
        "ai_usage",
        "template_use",
        "referral_reward",
        "refund",
        "admin_adjust",
      ],
    },
  },
} as const
