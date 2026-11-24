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
export type AccessType = 'free_to_read' | 'paid'

export interface PriceOffer {
  source_amount: string
  currency: string
  offer_format: string
  source_url: string
  checked_on: string
  rate_php_per_unit: string | null
  rate_date: string | null
  amount_php_minor: number
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
  access_type?: AccessType
  price?: PriceOffer | null
  is_active?: boolean
  download_filename?: string | null
}
export interface Page<T> { items: T[]; total: number; limit: number; offset: number }
export type BookPage = Page<Book>

export const resourceKinds = ['tutorial', 'course', 'documentation', 'tool'] as const
export type ResourceKind = typeof resourceKinds[number]
export type ListingKind = 'book' | ResourceKind

export interface Listing {
  id: string
  kind: ListingKind
  title: string
  author: string
  category: string
  description: string
  source_url: string
  access_type: AccessType
}
export interface ResourcePage extends Page<Listing> { categories: string[] }
export type SubmissionStatus = 'pending' | 'approved' | 'declined' | 'archived'
export interface Submission extends Listing {
  status: SubmissionStatus
  created_at: string
  decline_reason: string | null
  published_book_id: string | null
}
export interface AdminSubmission extends Submission { proof_url: string }
export interface Category { name: string; count: number }
