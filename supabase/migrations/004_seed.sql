-- Demo seed: 1 event, 4 criteria. Teams/users get created through the app flow.
do $$
declare
  v_event_id uuid;
begin
  insert into events (name_en, name_ar, description_en, description_ar, phase, anonymous_judging, show_public_leaderboard, max_team_size)
  values (
    'IEEE UoP Hackathon 2026',
    'هاكاثون IEEE جامعة البتراء 2026',
    'Annual student hackathon hosted by the IEEE UoP Student Branch.',
    'هاكاثون الطلاب السنوي الذي يستضيفه فرع IEEE جامعة البتراء.',
    'submissions_open',
    true,
    true,
    5
  )
  returning id into v_event_id;

  insert into criteria (event_id, name_en, name_ar, description_en, description_ar, weight, max_score, display_order) values
    (v_event_id, 'Innovation',    'الابتكار',     'Originality and creativity of the idea.',  'أصالة الفكرة وإبداعها.',                 1.0, 10, 1),
    (v_event_id, 'Technical',     'التنفيذ التقني','Depth and quality of the implementation.', 'عمق وجودة التنفيذ التقني.',              1.5, 10, 2),
    (v_event_id, 'Impact',        'الأثر',         'Real-world impact and feasibility.',       'الأثر الواقعي وقابلية التطبيق.',        1.2, 10, 3),
    (v_event_id, 'Presentation',  'العرض',         'Clarity of the pitch and demo.',           'وضوح العرض التقديمي والديمو.',          0.8, 10, 4);
end $$;
