-- Education targeting: stage and curriculum-aware content

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_stage text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS curriculum text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teaching_stages text[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teaching_curricula text[] NOT NULL DEFAULT '{}';

ALTER TABLE courses ADD COLUMN IF NOT EXISTS education_stage text;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS curriculum text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS education_stage text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS curriculum text;

CREATE INDEX IF NOT EXISTS idx_profiles_education_stage ON profiles(education_stage);
CREATE INDEX IF NOT EXISTS idx_profiles_curriculum ON profiles(curriculum);
CREATE INDEX IF NOT EXISTS idx_courses_education_target ON courses(education_stage, curriculum);
CREATE INDEX IF NOT EXISTS idx_videos_education_target ON videos(education_stage, curriculum);

COMMENT ON COLUMN profiles.education_stage IS 'Student current stage, e.g. primary_1';
COMMENT ON COLUMN profiles.curriculum IS 'Student curriculum, e.g. languages';
COMMENT ON COLUMN profiles.teaching_stages IS 'Stages supported by a teacher';
COMMENT ON COLUMN profiles.teaching_curricula IS 'Curricula supported by a teacher';
