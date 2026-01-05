-- Backoffice Admins Table
-- Backoffice yönetici kullanıcıları için

CREATE TABLE IF NOT EXISTS backoffice_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE backoffice_admins ENABLE ROW LEVEL SECURITY;

-- Tüm işlemler için izin (backoffice kullanıcıları için)
CREATE POLICY "Allow all for backoffice_admins" ON backoffice_admins
    FOR ALL USING (true) WITH CHECK (true);

-- Varsayılan admin kullanıcısı (admin / admin123)
INSERT INTO backoffice_admins (username, password_hash, name, email, role)
VALUES ('admin', 'admin123', 'Sistem Yöneticisi', 'admin@ipragaz.com', 'super_admin')
ON CONFLICT (username) DO NOTHING;
