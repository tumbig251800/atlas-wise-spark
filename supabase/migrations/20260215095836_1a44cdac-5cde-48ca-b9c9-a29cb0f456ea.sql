
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('teacher', 'director');

-- Create enum for activity mode
CREATE TYPE public.activity_mode AS ENUM ('active', 'passive', 'constructive');

-- Create enum for major gap
CREATE TYPE public.major_gap AS ENUM ('k-gap', 'p-gap', 'a-gap', 'success');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  teacher_code TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create teaching_logs table
CREATE TABLE public.teaching_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  teaching_date DATE NOT NULL DEFAULT CURRENT_DATE,
  grade_level TEXT NOT NULL,
  classroom TEXT NOT NULL,
  subject TEXT NOT NULL,
  learning_unit TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  mastery_score INTEGER NOT NULL CHECK (mastery_score BETWEEN 1 AND 5),
  activity_mode activity_mode NOT NULL DEFAULT 'active',
  key_issue TEXT DEFAULT '',
  major_gap major_gap NOT NULL DEFAULT 'success',
  classroom_management TEXT DEFAULT 'เรียบร้อยดี',
  health_care_status BOOLEAN NOT NULL DEFAULT false,
  health_care_ids TEXT DEFAULT '',
  remedial_ids TEXT DEFAULT '',
  next_strategy TEXT DEFAULT '',
  reflection TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles RLS: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Directors can view all profiles
CREATE POLICY "Directors can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

-- User roles RLS: users can read their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own role on signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Teaching logs RLS
-- Teachers: CRUD on their own logs
CREATE POLICY "Teachers can view own logs"
  ON public.teaching_logs FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own logs"
  ON public.teaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own logs"
  ON public.teaching_logs FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own logs"
  ON public.teaching_logs FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Directors: can view ALL teaching logs (read-only)
CREATE POLICY "Directors can view all logs"
  ON public.teaching_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'director'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teaching_logs_updated_at
  BEFORE UPDATE ON public.teaching_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
