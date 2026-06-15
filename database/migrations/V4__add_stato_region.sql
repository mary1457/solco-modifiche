-- Add stato and region fields to existing Albo A S1 payloads

UPDATE application_sections
SET payload_json = payload_json
    || CASE WHEN NOT (payload_json ? 'stato')  THEN '{"stato": ""}'::jsonb  ELSE '{}'::jsonb END
    || CASE WHEN NOT (payload_json ? 'region') THEN '{"region": ""}'::jsonb ELSE '{}'::jsonb END
WHERE section_key = 'S1'
  AND payload_json IS NOT NULL;

UPDATE supplier_registry_profile_details
SET projected_json = jsonb_set(
        jsonb_set(
            projected_json,
            '{sections,S1,stato}',
            '""'::jsonb,
            true
        ),
        '{sections,S1,region}',
        '""'::jsonb,
        true
    )
WHERE projected_json -> 'sections' -> 'S1' IS NOT NULL
  AND (
      NOT (projected_json -> 'sections' -> 'S1' ? 'stato')
      OR NOT (projected_json -> 'sections' -> 'S1' ? 'region')
  );
