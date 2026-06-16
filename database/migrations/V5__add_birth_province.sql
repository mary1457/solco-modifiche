-- Add birthProvince field to existing Albo A S1 payloads

UPDATE application_sections
SET payload_json = payload_json || '{"birthProvince": ""}'::jsonb
WHERE section_key = 'S1'
  AND payload_json IS NOT NULL
  AND NOT (payload_json ? 'birthProvince');

UPDATE supplier_registry_profile_details
SET projected_json = jsonb_set(
        projected_json,
        '{sections,S1,birthProvince}',
        '""'::jsonb,
        true
    )
WHERE projected_json -> 'sections' -> 'S1' IS NOT NULL
  AND NOT (projected_json -> 'sections' -> 'S1' ? 'birthProvince');
