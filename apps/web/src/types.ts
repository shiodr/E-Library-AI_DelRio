export interface User {
  id: string
  full_name: string
  email: string
  role: string
}
export interface Profile {
  session_type: 'user' | 'guest'
  expires_at: string
  user: User | null
  planned_download_limit: number
  download_limit?: number
  downloads_used?: number
  downloads_remaining?: number
}
export interface AuthResponse extends Profile {
  access_token: string | null
  token_type: 'bearer' | null
}
export interface Book {
  id: string
  title: string
  author: string
  category: string
  description: string
  cover_url: string | null
  source_url: string
  license_type: string
  access_type?: 'free_to_read' | 'paid'
  is_active?: boolean
}
export interface BookPage { items: Book[]; total: number; limit: number; offset: number }
export interface Category { name: string; count: number }
