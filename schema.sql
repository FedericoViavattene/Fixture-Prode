-- ============================================
-- PRODE MUNDIAL 2026 - ESQUEMA DE BASE DE DATOS
-- ============================================

-- 1. Eliminar triggers existentes en el esquema auth para evitar conflictos de cascada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Limpiar completamente el esquema public (esto borra todas las tablas y funciones en public)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- 3. Restaurar permisos básicos en el esquema public para los roles de Supabase
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 4. Crear la tabla de Perfiles (profiles)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear la tabla de Predicciones de Fase de Grupos
CREATE TABLE public.predictions (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL,
    home_score INTEGER NOT NULL CHECK (home_score >= 0),
    away_score INTEGER NOT NULL CHECK (away_score >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, match_id)
);

-- 6. Crear la tabla de Predicciones de Eliminación Directa (Knockout)
CREATE TABLE public.knockout_predictions (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    match_id TEXT NOT NULL,
    home_score INTEGER NOT NULL CHECK (home_score >= 0),
    away_score INTEGER NOT NULL CHECK (away_score >= 0),
    winner TEXT CHECK (winner IN ('home', 'away')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, match_id)
);

-- 7. Crear la tabla de Premios (prizes)
CREATE TABLE public.prizes (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Crear la tabla de Conexiones/Amigos (connections)
CREATE TABLE public.connections (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, competitor_id)
);

-- 9. Habilitar Seguridad a Nivel de Fila (RLS) en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- 10. Crear Políticas de Seguridad RLS

-- Políticas para 'profiles'
CREATE POLICY "Permitir lectura pública de perfiles" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de perfil propio" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Permitir actualización de perfil propio" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para 'predictions'
CREATE POLICY "Permitir lectura pública de predicciones" ON public.predictions
    FOR SELECT USING (true);
CREATE POLICY "Permitir inserción/actualización de predicciones propias" ON public.predictions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'knockout_predictions'
CREATE POLICY "Permitir lectura pública de predicciones de eliminación directa" ON public.knockout_predictions
    FOR SELECT USING (true);
CREATE POLICY "Permitir inserción/actualización de predicciones de eliminación propias" ON public.knockout_predictions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'prizes'
CREATE POLICY "Permitir lectura pública de premios" ON public.prizes
    FOR SELECT USING (true);
CREATE POLICY "Permitir modificación de premio propio" ON public.prizes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'connections'
CREATE POLICY "Permitir lectura de conexiones propias y de otros" ON public.connections
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestionar conexiones propias" ON public.connections
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. Función y Trigger robusto para sincronizar nuevos usuarios registrados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, updated_at)
    VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'avatar_url', null),
        now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Fall-safe: Evitamos que cualquier error en la creación del perfil bloquee el login del usuario
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
