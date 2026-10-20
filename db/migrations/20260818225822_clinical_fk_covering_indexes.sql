-- Recovered from ABA_staging migration history; schema only.
-- Cover every composite foreign key used by the clinical workspace.

create index acquisition_goals_program_client_idx
  on public.acquisition_goals (program_id, client_id);

create index session_behavior_measurements_session_client_idx
  on public.session_behavior_measurements (session_id, client_id);
create index session_behavior_measurements_plan_client_idx
  on public.session_behavior_measurements (behavior_plan_id, client_id);

create index session_acquisition_trials_session_client_idx
  on public.session_acquisition_trials (session_id, client_id);
create index session_acquisition_trials_goal_client_idx
  on public.session_acquisition_trials (goal_id, client_id);
