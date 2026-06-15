-- Add streetNumber field to existing Albo A S1 payloads that do not have it yet

UPDATE application_sections
SET payload_json = payload_json || '{"streetNumber": ""}'::jsonb
WHERE section_key = 'S1'
  AND payload_json IS NOT NULL
  AND NOT (payload_json ? 'streetNumber');

UPDATE supplier_registry_profile_details
SET projected_json = jsonb_set(
    projected_json,
    '{sections,S1,streetNumber}',
    '""'::jsonb,
    true
)
WHERE projected_json -> 'sections' -> 'S1' IS NOT NULL
  AND NOT (projected_json -> 'sections' -> 'S1' ? 'streetNumber');
