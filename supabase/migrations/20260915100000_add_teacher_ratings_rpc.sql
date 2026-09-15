-- Aggregate teacher review ratings server-side to avoid pulling every review row
-- to the client (fixes per-page reviews fan-out on the teachers directory).
create or replace function get_teacher_ratings()
returns table (teacher_id uuid, avg_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    reviews.teacher_id,
    round(avg(reviews.rating)::numeric, 2) as avg_rating,
    count(*)::bigint as review_count
  from reviews
  group by reviews.teacher_id;
$$;