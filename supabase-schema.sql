-- Supabase Schema für AI Stock Photos
-- Erstellt: 2026-04-22

-- Bilder-Tabelle
CREATE TABLE images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    category TEXT NOT NULL,
    tags TEXT[],
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    price DECIMAL(10,2) NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    format TEXT DEFAULT 'jpg',
    is_upscaled BOOLEAN DEFAULT FALSE,
    upscale_price DECIMAL(10,2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0
);

-- Benutzer-Tabelle (erweitert)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    credits DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Downloads-Tabelle
CREATE TABLE downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    price_paid DECIMAL(10,2) NOT NULL,
    is_upscaled BOOLEAN DEFAULT FALSE,
    download_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, image_id)
);

-- Favoriten/Merkliste
CREATE TABLE favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, image_id)
);

-- Einkaufswagen
CREATE TABLE cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    is_upscaled BOOLEAN DEFAULT FALSE,
    price_at_time DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, image_id)
);

-- Bestellungen
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bestellpositionen
CREATE TABLE order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    price_paid DECIMAL(10,2) NOT NULL,
    is_upscaled BOOLEAN DEFAULT FALSE
);

-- Preis-Historie (für dynamische Preise)
CREATE TABLE price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kategorien
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Views für Statistiken
CREATE VIEW image_stats AS
SELECT 
    i.id,
    i.title,
    i.score,
    i.price,
    i.download_count,
    i.view_count,
    COUNT(DISTINCT f.user_id) as favorite_count,
    COUNT(DISTINCT d.user_id) as unique_downloads
FROM images i
LEFT JOIN favorites f ON i.id = f.image_id
LEFT JOIN downloads d ON i.id = d.image_id
GROUP BY i.id;

-- Funktion: Preis basierend auf Score berechnen
CREATE OR REPLACE FUNCTION calculate_price(score DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF score <= 50 THEN RETURN 0.39;
    ELSIF score <= 70 THEN RETURN 0.59;
    ELSIF score <= 85 THEN RETURN 0.79;
    ELSIF score <= 95 THEN RETURN 0.99;
    ELSE RETURN 1.99;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Preis automatisch setzen
CREATE OR REPLACE FUNCTION set_image_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.price := calculate_price(NEW.score);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_price
    BEFORE INSERT OR UPDATE OF score ON images
    FOR EACH ROW
    EXECUTE FUNCTION set_image_price();

-- RLS Policies (Row Level Security)
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Images are viewable by everyone" ON images
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);

-- Indizes für Performance
CREATE INDEX idx_images_category ON images(category);
CREATE INDEX idx_images_score ON images(score DESC);
CREATE INDEX idx_images_price ON images(price);
CREATE INDEX idx_images_created ON images(created_at DESC);
CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);

-- Beispieldaten: Kategorien
INSERT INTO categories (name, slug, description, icon) VALUES
('Natur', 'natur', 'Landschaften, Pflanzen, Tiere', '🌿'),
('Architektur', 'architektur', 'Gebäude, Städte, Interieur', '🏢'),
('Business', 'business', 'Arbeitsplatz, Meetings, Technologie', '💼'),
('Technologie', 'technologie', 'Gadgets, Code, Innovation', '💻'),
('Kreativ', 'kreativ', 'Kunst, Design, Abstrakt', '🎨'),
('Menschen', 'menschen', 'Porträts, Emotionen, Lifestyle', '👥'),
('Essen', 'essen', 'Gerichte, Zutaten, Küche', '🍽️'),
('Reisen', 'reisen', 'Orte, Kulturen, Abenteuer', '✈️');

-- Beispieldaten: Bilder (24 Stück)
INSERT INTO images (title, description, url, category, tags, score, width, height) VALUES
('Nebliger Waldweg', 'Mystische Morgenstimmung im Wald', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800', 'natur', '{"wald", "nebel", "morgen", "natur"}', 94.50, 1920, 1080),
('Moderne Skyline', 'Futuristische Stadt bei Nacht', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800', 'architektur', '{"stadt", "nacht", "skyline", "lichter"}', 92.30, 1920, 1080),
('Kreatives Brainstorming', 'Team arbeitet an innovativen Ideen', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800', 'business', '{"team", "meeting", "kreativ", "arbeit"}', 88.70, 1920, 1280),
('Coding Workspace', 'Entwickler-Setup mit mehreren Monitoren', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800', 'technologie', '{"code", "programmierung", "laptop", "tech"}', 85.40, 1920, 1280),
('Abstrakte Farbexplosion', 'Lebendige Farben in dynamischer Komposition', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800', 'kreativ', '{"abstrakt", "farbe", "kunst", "design"}', 91.20, 1920, 1080),
('Porträt im Gegenlicht', 'Dramatisches Lichtspiel im Portrait', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 'menschen', '{"porträt", "licht", "person", "emotion"}', 89.60, 1280, 1920);

-- Weitere Bilder würden hier folgen...
