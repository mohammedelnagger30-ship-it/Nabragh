-- Add guardian_email to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_email text;

-- RPC: Send guardian email about quiz result
CREATE OR REPLACE FUNCTION notify_guardian_quiz_result(p_student_id uuid, p_quiz_id uuid, p_score integer, p_passed boolean, p_certificate_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_name text;
  v_quiz_title text;
  v_course_title text;
  v_guardian_email text;
  v_subject text;
  v_html text;
  v_pass_text text;
BEGIN
  SELECT full_name, guardian_email INTO v_student_name, v_guardian_email
  FROM profiles WHERE id = p_student_id;

  SELECT q.title, c.title INTO v_quiz_title, v_course_title
  FROM quizzes q JOIN courses c ON c.id = q.course_id
  WHERE q.id = p_quiz_id;

  IF v_guardian_email IS NULL OR v_guardian_email = '' THEN
    RETURN;
  END IF;

  IF p_passed THEN
    v_pass_text := 'ورقة النجاح ✅';
    v_subject := 'ابنك/ابنتك ' || v_student_name || ' نجح في امتحان ' || COALESCE(v_quiz_title, 'الدورة');
  ELSE
    v_pass_text := 'لم ينجح ❌';
    v_subject := 'نتيجة امتحان ' || v_student_name || ' - ' || COALESCE(v_quiz_title, 'الدورة');
  END IF;

  v_html := '
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb, #06b6d4); border-radius: 16px; padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">تقرير نتيجة الامتحان</h1>
    </div>
    <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; color: #334155;">مرحباً ولي أمر الطالب/ة <strong>' || COALESCE(v_student_name, 'الطالب') || '</strong>,</p>
      <p style="font-size: 14px; color: #64748b;">نتعلمكم بنتيجة الامتحان التالي:</p>
      
      <div style="background: white; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">الدورة</td><td style="padding: 8px 0; font-weight: bold; color: #1e293b;">' || COALESCE(v_course_title, '—') || '</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">الامتحان</td><td style="padding: 8px 0; font-weight: bold; color: #1e293b;">' || COALESCE(v_quiz_title, '—') || '</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">النتيجة</td><td style="padding: 8px 0; font-weight: bold; font-size: 20px; color: ' || CASE WHEN p_passed THEN '#16a34a' ELSE '#dc2626' END || ';">' || p_score || '%</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">الحالة</td><td style="padding: 8px 0; font-weight: bold;">' || v_pass_text || '</td></tr>' ||
          CASE WHEN p_certificate_number IS NOT NULL THEN
            '<tr><td style="padding: 8px 0; color: #64748b;">رقم الشهادة</td><td style="padding: 8px 0; font-weight: bold; color: #d97706;">' || p_certificate_number || '</td></tr>'
          ELSE '' END ||
        '</table>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
        منصة العلم التعليمية | nabragh.com
      </p>
    </div>
  </div>';

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-guardian-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.anon_key')
    ),
    body := jsonb_build_object(
      'student_id', p_student_id,
      'subject', v_subject,
      'html_body', v_html
    )
  );
END;
$$;

-- RPC: Send guardian weekly progress report
CREATE OR REPLACE FUNCTION send_guardian_weekly_report(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_name text;
  v_guardian_email text;
  v_courses_enrolled integer;
  v_courses_completed integer;
  v_avg_progress numeric;
  v_exams_taken integer;
  v_exams_passed integer;
  v_avg_score numeric;
  v_subject text;
  v_html text;
  v_course_list text := '';
  v_rec record;
BEGIN
  SELECT full_name, guardian_email INTO v_student_name, v_guardian_email
  FROM profiles WHERE id = p_student_id;

  IF v_guardian_email IS NULL OR v_guardian_email = '' THEN
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'completed'),
    COALESCE(avg(progress_percent), 0)
  INTO v_courses_enrolled, v_courses_completed, v_avg_progress
  FROM course_enrollments WHERE student_id = p_student_id;

  SELECT
    count(*),
    count(*) FILTER (WHERE passed),
    COALESCE(avg(score), 0)
  INTO v_exams_taken, v_exams_passed, v_avg_score
  FROM quiz_attempts WHERE student_id = p_student_id;

  FOR v_rec IN
    SELECT c.title, ce.progress_percent, ce.status
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE ce.student_id = p_student_id
    ORDER BY ce.enrolled_at DESC
    LIMIT 5
  LOOP
    v_course_list := v_course_list ||
      '<tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">' || COALESCE(v_rec.title, '—') || '</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">' || COALESCE(v_rec.progress_percent, 0) || '%</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; ' ||
          CASE WHEN v_rec.status = 'completed' THEN 'background: #dcfce7; color: #16a34a;' ELSE 'background: #dbeafe; color: #2563eb;' END ||
          '">' || CASE WHEN v_rec.status = 'completed' THEN 'مكتمل' ELSE 'نشط' END || '</span>
        </td>
      </tr>';
  END LOOP;

  v_subject := 'تقرير أسبوعي عن تقدم ' || v_student_name || ' في التعلم';

  v_html := '
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb, #06b6d4); border-radius: 16px; padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">التقرير الأسبوعي</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">تقرير التقدم الدراسي الأسبوعي</p>
    </div>
    <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; color: #334155;">مرحباً ولي أمر الطالب/ة <strong>' || COALESCE(v_student_name, 'الطالب') || '</strong>,</p>
      <p style="font-size: 14px; color: #64748b;">إليك ملخص التقدم الأسبوعي:</p>
      
      <div style="display: flex; gap: 12px; margin: 16px 0;">
        <div style="flex: 1; background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 28px; font-weight: bold; color: #2563eb;">' || v_courses_enrolled || '</div>
          <div style="font-size: 12px; color: #64748b;">دورة مسجّلة</div>
        </div>
        <div style="flex: 1; background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 28px; font-weight: bold; color: #16a34a;">' || v_courses_completed || '</div>
          <div style="font-size: 12px; color: #64748b;">مكتملة</div>
        </div>
        <div style="flex: 1; background: white; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
          <div style="font-size: 28px; font-weight: bold; color: #d97706;">' || ROUND(v_avg_progress) || '%</div>
          <div style="font-size: 12px; color: #64748b;">متوسط التقدم</div>
        </div>
      </div>

      <div style="background: white; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">الدورات</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f1f5f9;">
            <th style="padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;">الدورة</th>
            <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #64748b;">التقدم</th>
            <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #64748b;">الحالة</th>
          </tr>
          ' || COALESCE(v_course_list, '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #94a3b8;">لا توجد دورات مسجّلة</td></tr>') || '
        </table>
      </div>

      <div style="background: white; border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 12px; font-size: 16px; color: #1e293b;">الامتحانات</h3>
        <div style="display: flex; gap: 12px;">
          <div style="flex: 1; text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">' || v_exams_taken || '</div>
            <div style="font-size: 11px; color: #64748b;">محاولات</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">' || v_exams_passed || '</div>
            <div style="font-size: 11px; color: #64748b;">ناجح</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #d97706;">' || ROUND(v_avg_score) || '%</div>
            <div style="font-size: 11px; color: #64748b;">متوسط النتيجة</div>
          </div>
        </div>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
        منصة العلم التعليمية | nabragh.com
      </p>
    </div>
  </div>';

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-guardian-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.anon_key')
    ),
    body := jsonb_build_object(
      'student_id', p_student_id,
      'subject', v_subject,
      'html_body', v_html
    )
  );
END;
$$;

-- RPC: Batch send weekly reports to all guardians
CREATE OR REPLACE FUNCTION send_all_guardian_weekly_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_rec record;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ce.student_id
    FROM course_enrollments ce
    JOIN profiles p ON p.id = ce.student_id
    WHERE p.guardian_email IS NOT NULL AND p.guardian_email != ''
  LOOP
    PERFORM send_guardian_weekly_report(v_rec.student_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- RPC: Send guardian notification about new enrollment
CREATE OR REPLACE FUNCTION notify_guardian_enrollment(p_student_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_name text;
  v_guardian_email text;
  v_course_title text;
  v_teacher_name text;
  v_html text;
BEGIN
  SELECT full_name, guardian_email INTO v_student_name, v_guardian_email
  FROM profiles WHERE id = p_student_id;

  SELECT c.title, t.full_name INTO v_course_title, v_teacher_name
  FROM courses c JOIN profiles t ON t.id = c.teacher_id
  WHERE c.id = p_course_id;

  IF v_guardian_email IS NULL OR v_guardian_email = '' THEN RETURN; END IF;

  v_html := '
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2563eb, #06b6d4); border-radius: 16px; padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 24px;">تسجيل جديد في دورة</h1>
    </div>
    <div style="padding: 20px; background: #f8fafc; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; color: #334155;">مرحباً ولي أمر الطالب/ة <strong>' || COALESCE(v_student_name, 'الطالب') || '</strong>,</p>
      <p style="font-size: 14px; color: #64748b;">قام ابنك/ابنتك بالتسجيل في دورة جديدة:</p>
      
      <div style="background: white; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e293b;">' || COALESCE(v_course_title, 'دورة جديدة') || '</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">المدرس: ' || COALESCE(v_teacher_name, '—') || '</p>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
        منصة العلم التعليمية | nabragh.com
      </p>
    </div>
  </div>';

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-guardian-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json',
      'apikey', current_setting('app.settings.anon_key')
    ),
    body := jsonb_build_object(
      'student_id', p_student_id,
      'subject', 'تسجيل ' || v_student_name || ' في دورة جديدة',
      'html_body', v_html
    )
  );
END;
$$;

-- Trigger: Auto-notify guardian when student enrolls in a course
CREATE OR REPLACE FUNCTION trigger_guardian_enrollment_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM notify_guardian_enrollment(NEW.student_id, NEW.course_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_enrollment_notify_guardian ON course_enrollments;
CREATE TRIGGER on_enrollment_notify_guardian
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_guardian_enrollment_notify();
