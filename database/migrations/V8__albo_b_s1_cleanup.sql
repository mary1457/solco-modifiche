-- Albo B S1: migrate legalAddress.stato -> legalAddress.country, remove stato/region/cciaaProvince/legalRepresentative.taxCode
-- and ensure legalAddress.streetNumber exists

UPDATE application_sections
SET payload_json = jsonb_set(
    payload_json,
    '{legalAddress,country}',
    COALESCE(payload_json->'legalAddress'->'stato', payload_json->'legalAddress'->'country', '""'::jsonb)
)
WHERE section_key = 'S1'
  AND payload_json->'legalAddress' IS NOT NULL
  AND NOT (payload_json->'legalAddress' ? 'country');

UPDATE application_sections
SET payload_json = payload_json
    #- '{legalAddress,stato}'
    #- '{legalAddress,region}'
    #- '{cciaaProvince}'
    #- '{legalRepresentative,taxCode}'
WHERE section_key = 'S1';

UPDATE application_sections
SET payload_json = jsonb_set(
    payload_json,
    '{legalAddress,streetNumber}',
    '""'::jsonb
)
WHERE section_key = 'S1'
  AND payload_json->'legalAddress' IS NOT NULL
  AND NOT (payload_json->'legalAddress' ? 'streetNumber');
