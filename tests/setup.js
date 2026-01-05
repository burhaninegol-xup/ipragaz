import { vi, beforeEach } from 'vitest'

// Supabase mock chain builder - her testte yeniden kullanilabilir
const createSupabaseMock = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Promise-like behavior
    then: vi.fn((cb) => Promise.resolve(cb({ data: [], error: null })))
  })),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
      remove: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  },
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
})

// Global supabase mock
const mockSupabaseClient = createSupabaseMock()
vi.stubGlobal('supabaseClient', mockSupabaseClient)

// handleSupabaseError mock
vi.stubGlobal('handleSupabaseError', vi.fn((err, ctx) => ({
  data: null,
  error: err?.message || 'Bir hata olustu'
})))

// DOM mock'lari (jsdom ile gelir ama eksik kalabilir)
if (typeof document === 'undefined') {
  vi.stubGlobal('document', {
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: vi.fn(() => ({
      innerHTML: '',
      innerText: '',
      textContent: '',
      style: {},
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn(() => false)
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  })
}

// Window mock'lari
if (typeof window !== 'undefined') {
  // Window zaten var (jsdom), sadece eksik metodlari ekle
  window.alert = vi.fn()
  window.confirm = vi.fn(() => true)
  window.prompt = vi.fn(() => '')
  window.scrollTo = vi.fn()
} else {
  vi.stubGlobal('window', {
    location: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      reload: vi.fn(),
      assign: vi.fn()
    },
    localStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    sessionStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    },
    alert: vi.fn(),
    confirm: vi.fn(() => true),
    prompt: vi.fn(() => ''),
    scrollTo: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })
}

// Console mock (gereksiz log'lari engeller)
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Her test oncesi mock'lari temizle
beforeEach(() => {
  vi.clearAllMocks()
})

export { mockSupabaseClient, createSupabaseMock }
