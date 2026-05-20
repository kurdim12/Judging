-- Demo seed: 1 event with 4 criteria. IDs hardcoded for idempotency.
INSERT OR IGNORE INTO events (
  id, name_en, name_ar, description_en, description_ar,
  phase, anonymous_judging, show_public_leaderboard, max_team_size
) VALUES (
  'seed-event-2026',
  'IEEE UoP Hackathon 2026',
  'هاكاثون IEEE جامعة البتراء 2026',
  'Annual student hackathon hosted by the IEEE UoP Student Branch.',
  'هاكاثون الطلاب السنوي الذي يستضيفه فرع IEEE جامعة البتراء.',
  'submissions_open',
  1,
  1,
  5
);

INSERT OR IGNORE INTO criteria (id, event_id, name_en, name_ar, description_en, description_ar, weight, max_score, display_order) VALUES
  ('seed-crit-innov',  'seed-event-2026', 'Innovation',   'الابتكار',      'Originality and creativity of the idea.', 'أصالة الفكرة وإبداعها.',        1.0, 10, 1),
  ('seed-crit-tech',   'seed-event-2026', 'Technical',    'التنفيذ التقني','Depth and quality of the implementation.', 'عمق وجودة التنفيذ التقني.',     1.5, 10, 2),
  ('seed-crit-impact', 'seed-event-2026', 'Impact',       'الأثر',         'Real-world impact and feasibility.',       'الأثر الواقعي وقابلية التطبيق.',1.2, 10, 3),
  ('seed-crit-pres',   'seed-event-2026', 'Presentation', 'العرض',         'Clarity of the pitch and demo.',           'وضوح العرض التقديمي والديمو.',  0.8, 10, 4);
