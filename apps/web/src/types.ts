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
}
export interface BookPage { items: Book[]; total: number; limit: number; offset: number }
export interface Category { name: string; count: number }
