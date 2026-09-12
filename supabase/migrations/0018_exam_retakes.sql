-- Exam retakes: a failed (or merely disappointing) exam can be sat again, and
-- college only ever counts the better attempt. Model that as a self-link rather
-- than a "doesn't count" flag -- the flag would be bookkeeping you have to keep
-- in sync by hand, and it would throw away the fact that these two rows are the
-- same exam sat twice (so study hours across attempts could never be added up).
--
-- THE RULE, implemented in lib/utils/grades.ts and applied everywhere a grade is
-- aggregated: a chain of attempts contributes exactly ONE grade -- the highest
-- PASSING one. A failing grade never counts, retaken or not, because a failed
-- exam is not in a real transcript average either.

alter table public.exams
  add column retake_of uuid references public.exams (id) on delete set null;

-- An exam cannot be a retake of itself. Longer cycles are prevented by the UI
-- (only earlier attempts are offered) and survived defensively by the chain
-- walker, which is depth-capped.
alter table public.exams
  add constraint exams_retake_not_self check (retake_of is null or retake_of <> id);

create index exams_retake_of_idx on public.exams (retake_of);
