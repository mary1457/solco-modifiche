-- Merge firstName + lastName → fullName for Albo A (S1) in application_sections
UPDATE application_sections
SET payload_json = (payload_json - 'firstName' - 'lastName')
    || jsonb_build_object(
         'fullName',
         TRIM(
           COALESCE(payload_json->>'firstName', '') ||
           CASE
             WHEN COALESCE(payload_json->>'firstName','') <> ''
              AND COALESCE(payload_json->>'lastName','') <> ''
             THEN ' ' ELSE ''
           END ||
           COALESCE(payload_json->>'lastName', '')
         )
       )
WHERE section_key = 'S1'
  AND (payload_json ? 'firstName' OR payload_json ? 'lastName');

-- Merge firstName + lastName → fullName inside projected_json.sections.S1
UPDATE supplier_registry_profile_details
SET projected_json = jsonb_set(
      (projected_json #- '{sections,S1,firstName}') #- '{sections,S1,lastName}',
      '{sections,S1,fullName}',
      to_jsonb(TRIM(
        COALESCE(projected_json->'sections'->'S1'->>'firstName', '') ||
        CASE
          WHEN COALESCE(projected_json->'sections'->'S1'->>'firstName','') <> ''
           AND COALESCE(projected_json->'sections'->'S1'->>'lastName','') <> ''
          THEN ' ' ELSE ''
        END ||
        COALESCE(projected_json->'sections'->'S1'->>'lastName', '')
      ))
    )
WHERE projected_json->'sections'->'S1' ? 'firstName'
   OR projected_json->'sections'->'S1' ? 'lastName';
