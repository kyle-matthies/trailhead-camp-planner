export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_actions: {
        Row: {
          committed: boolean
          created_at: string
          id: string
          result: Json | null
          tool_calls: Json | null
          trip_id: string | null
          user_id: string
          utterance: string | null
        }
        Insert: {
          committed?: boolean
          created_at?: string
          id?: string
          result?: Json | null
          tool_calls?: Json | null
          trip_id?: string | null
          user_id: string
          utterance?: string | null
        }
        Update: {
          committed?: boolean
          created_at?: string
          id?: string
          result?: Json | null
          tool_calls?: Json | null
          trip_id?: string | null
          user_id?: string
          utterance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_actions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      board_photos: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          metadata: Json
          mime_type: string | null
          original_name: string | null
          post_id: string | null
          size_bytes: number | null
          storage_path: string
          taken_at: string | null
          thumbnail_path: string | null
          trip_id: string
          updated_at: string | null
          uploaded_by: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          original_name?: string | null
          post_id?: string | null
          size_bytes?: number | null
          storage_path: string
          taken_at?: string | null
          thumbnail_path?: string | null
          trip_id: string
          updated_at?: string | null
          uploaded_by: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          original_name?: string | null
          post_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          taken_at?: string | null
          thumbnail_path?: string | null
          trip_id?: string
          updated_at?: string | null
          uploaded_by?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_photos_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_photos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      board_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited: boolean
          id: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited?: boolean
          id?: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited?: boolean
          id?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_posts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      board_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          trip_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          trip_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "board_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_replies_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      campgrounds: {
        Row: {
          address: string | null
          check_in_date: string | null
          check_out_date: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          reservation_ref: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          reservation_ref?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          reservation_ref?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campgrounds_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      campsites: {
        Row: {
          campground_id: string
          created_at: string
          id: string
          max_tents: number | null
          max_vehicles: number | null
          nightly_cost: number | null
          notes: string | null
          site_number: string
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          campground_id: string
          created_at?: string
          id?: string
          max_tents?: number | null
          max_vehicles?: number | null
          nightly_cost?: number | null
          notes?: string | null
          site_number: string
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          campground_id?: string
          created_at?: string
          id?: string
          max_tents?: number | null
          max_vehicles?: number | null
          nightly_cost?: number | null
          notes?: string | null
          site_number?: string
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campsites_campground_fk"
            columns: ["campground_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "campgrounds"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "campsites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_splits: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          expense_id: string | null
          id: string
          member_id: string | null
          party_id: string | null
          shopping_item_id: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          expense_id?: string | null
          id?: string
          member_id?: string | null
          party_id?: string | null
          shopping_item_id?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          expense_id?: string | null
          id?: string
          member_id?: string | null
          party_id?: string | null
          shopping_item_id?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_splits_expense_fk"
            columns: ["expense_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "cost_splits_member_fk"
            columns: ["member_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "cost_splits_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_parties"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "cost_splits_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_party_totals"
            referencedColumns: ["party_id", "trip_id"]
          },
          {
            foreignKeyName: "cost_splits_shopping_fk"
            columns: ["shopping_item_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "shopping_items"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "cost_splits_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          incurred_on: string | null
          paid_by_member_id: string | null
          paid_by_party_id: string | null
          shopping_item_id: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          incurred_on?: string | null
          paid_by_member_id?: string | null
          paid_by_party_id?: string | null
          shopping_item_id?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          incurred_on?: string | null
          paid_by_member_id?: string | null
          paid_by_party_id?: string | null
          shopping_item_id?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_member_fk"
            columns: ["paid_by_member_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "expenses_paid_party_fk"
            columns: ["paid_by_party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_parties"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "expenses_paid_party_fk"
            columns: ["paid_by_party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_party_totals"
            referencedColumns: ["party_id", "trip_id"]
          },
          {
            foreignKeyName: "expenses_shopping_item_id_fkey"
            columns: ["shopping_item_id"]
            isOneToOne: false
            referencedRelation: "shopping_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_items: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
          weight_oz: number | null
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id: string
          weight_oz?: number | null
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          weight_oz?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          paypal_me: string | null
          venmo_handle: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          paypal_me?: string | null
          venmo_handle?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          paypal_me?: string | null
          venmo_handle?: string | null
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          actual_cost: number | null
          category: string | null
          claimed_by: string | null
          created_at: string
          created_by: string
          estimated_cost: number | null
          id: string
          name: string
          paid_by_party_id: string | null
          purchased: boolean
          quantity: number
          source: Database["public"]["Enums"]["item_source"]
          trip_id: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          category?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by: string
          estimated_cost?: number | null
          id?: string
          name: string
          paid_by_party_id?: string | null
          purchased?: boolean
          quantity?: number
          source?: Database["public"]["Enums"]["item_source"]
          trip_id: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string | null
          claimed_by?: string | null
          created_at?: string
          created_by?: string
          estimated_cost?: number | null
          id?: string
          name?: string
          paid_by_party_id?: string | null
          purchased?: boolean
          quantity?: number
          source?: Database["public"]["Enums"]["item_source"]
          trip_id?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_claimed_fk"
            columns: ["claimed_by", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "shopping_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_paid_party_fk"
            columns: ["paid_by_party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_parties"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "shopping_paid_party_fk"
            columns: ["paid_by_party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_party_totals"
            referencedColumns: ["party_id", "trip_id"]
          },
        ]
      }
      site_camper_assignments: {
        Row: {
          campsite_id: string
          created_at: string
          id: string
          member_id: string
          trip_id: string
        }
        Insert: {
          campsite_id: string
          created_at?: string
          id?: string
          member_id: string
          trip_id: string
        }
        Update: {
          campsite_id?: string
          created_at?: string
          id?: string
          member_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sca_campsite_fk"
            columns: ["campsite_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "sca_member_fk"
            columns: ["member_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "site_camper_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      tents: {
        Row: {
          campsite_id: string | null
          capacity: number | null
          created_at: string
          id: string
          label: string
          owned_by: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          campsite_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          label: string
          owned_by?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          campsite_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          label?: string
          owned_by?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tents_campsite_fk"
            columns: ["campsite_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "tents_owner_fk"
            columns: ["owned_by", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "tents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          party_id: string | null
          role: Database["public"]["Enums"]["trip_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
          trip_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          party_id?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          trip_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          party_id?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invites_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_parties"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "trip_invites_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_party_totals"
            referencedColumns: ["party_id", "trip_id"]
          },
          {
            foreignKeyName: "trip_invites_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          display_name: string | null
          id: string
          joined_at: string
          party_id: string | null
          role: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          joined_at?: string
          party_id?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          joined_at?: string
          party_id?: string | null
          role?: Database["public"]["Enums"]["trip_role"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_parties"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "trip_members_party_fk"
            columns: ["party_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_party_totals"
            referencedColumns: ["party_id", "trip_id"]
          },
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_packing_items: {
        Row: {
          category: string
          created_at: string
          gear_item_id: string | null
          id: string
          is_recommendation: boolean
          name: string
          owner_id: string
          packed: boolean
          trip_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          gear_item_id?: string | null
          id?: string
          is_recommendation?: boolean
          name: string
          owner_id: string
          packed?: boolean
          trip_id: string
        }
        Update: {
          category?: string
          created_at?: string
          gear_item_id?: string | null
          id?: string
          is_recommendation?: boolean
          name?: string
          owner_id?: string
          packed?: boolean
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_packing_items_gear_item_id_fkey"
            columns: ["gear_item_id"]
            isOneToOne: false
            referencedRelation: "gear_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_parties: {
        Row: {
          created_at: string
          id: string
          name: string
          paypal_me: string | null
          trip_id: string
          venmo_handle: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          paypal_me?: string | null
          trip_id: string
          venmo_handle?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          paypal_me?: string | null
          trip_id?: string
          venmo_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_parties_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_shared_gear: {
        Row: {
          brought_by: string | null
          category: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          quantity: number
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          brought_by?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          brought_by?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_gear_brought_fk"
            columns: ["brought_by", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "trip_shared_gear_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          camping_type: string
          created_at: string
          destination: string
          end_date: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          owner_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          camping_type?: string
          created_at?: string
          destination?: string
          end_date: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          owner_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          camping_type?: string
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          campsite_id: string | null
          created_at: string
          id: string
          label: string
          license_plate: string | null
          owned_by: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          campsite_id?: string | null
          created_at?: string
          id?: string
          label: string
          license_plate?: string | null
          owned_by?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          campsite_id?: string | null
          created_at?: string
          id?: string
          label?: string
          license_plate?: string | null
          owned_by?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_campsite_fk"
            columns: ["campsite_id", "trip_id"]
            isOneToOne: false
            referencedRelation: "campsites"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "vehicles_owner_fk"
            columns: ["owned_by", "trip_id"]
            isOneToOne: false
            referencedRelation: "trip_members"
            referencedColumns: ["id", "trip_id"]
          },
          {
            foreignKeyName: "vehicles_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trip_party_totals: {
        Row: {
          name: string | null
          paid: number | null
          party_id: string | null
          trip_id: string | null
        }
        Insert: {
          name?: string | null
          paid?: never
          party_id?: string | null
          trip_id?: string | null
        }
        Update: {
          name?: string | null
          paid?: never
          party_id?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_parties_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: {
        Args: { p_token: string }
        Returns: {
          display_name: string | null
          id: string
          joined_at: string
          party_id: string | null
          role: Database["public"]["Enums"]["trip_role"]
          trip_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "trip_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storage_photo_owner_id: { Args: { p_name: string }; Returns: string }
      storage_trip_id: { Args: { p_name: string }; Returns: string }
      trip_settlement: { Args: { p_trip: string }; Returns: Json }
    }
    Enums: {
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      item_source: "manual" | "ai" | "import"
      trip_role: "director" | "counselor" | "cit" | "camper"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invite_status: ["pending", "accepted", "revoked", "expired"],
      item_source: ["manual", "ai", "import"],
      trip_role: ["director", "counselor", "cit", "camper"],
    },
  },
} as const
