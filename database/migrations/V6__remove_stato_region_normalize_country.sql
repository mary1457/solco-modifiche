-- Remove stato and region from S1 payloads in application_sections
UPDATE application_sections
SET payload_json = payload_json
    - 'stato'
    - 'region'
WHERE section_key = 'S1'
  AND (payload_json ? 'stato' OR payload_json ? 'region');

-- Remove stato and region from S1 payloads in supplier_registry_profile_details
UPDATE supplier_registry_profile_details
SET projected_json = projected_json
    - 'stato'
    - 'region'
WHERE projected_json ? 'stato' OR projected_json ? 'region';

-- Normalize country "Italia" -> "IT" in application_sections S1
UPDATE application_sections
SET payload_json = jsonb_set(payload_json, '{country}', '"IT"')
WHERE section_key = 'S1'
  AND payload_json ->> 'country' = 'Italia';

-- Normalize country "Italia" -> "IT" in supplier_registry_profile_details
UPDATE supplier_registry_profile_details
SET projected_json = jsonb_set(projected_json, '{country}', '"IT"')
WHERE projected_json ->> 'country' = 'Italia';
