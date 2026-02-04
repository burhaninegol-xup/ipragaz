-- Project Access Table
-- Proje erişim kontrolü için kullanıcı tablosu
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

CREATE TABLE project_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan kullanıcı: admin / admin123
-- SHA-256 hash of "admin123" = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT INTO project_access (username, password_hash, is_active)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', true);

-- Row Level Security (RLS) aktif et
ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;

-- Herkese SELECT izni (anon key ile sorgulama için)
CREATE POLICY "Allow public select" ON project_access
    FOR SELECT USING (true);

-- Herkese UPDATE izni (last_login güncellemesi için)
CREATE POLICY "Allow public update" ON project_access
    FOR UPDATE USING (true);
