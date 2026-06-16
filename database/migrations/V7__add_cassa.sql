-- Add cassa field to S1 payloads in application_sections (default empty string = not yet answered)
UPDATE application_sections
SET payload_json = payload_json || '{"cassa": ""}'::jsonb
WHERE section_key = 'S1'
  AND NOT (payload_json ? 'cassa');

-- Add cassa field to supplier_registry_profile_details
UPDATE supplier_registry_profile_details
SET projected_json = projected_json || '{"cassa": ""}'::jsonb
WHERE NOT (projected_json ? 'cassa');
