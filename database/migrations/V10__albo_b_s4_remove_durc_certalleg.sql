-- Albo B S4: remove DURC attachments and generic CERTIFICATION attachments (no certificationKey)
UPDATE application_sections
SET payload_json = jsonb_set(
    payload_json,
    '{attachments}',
    COALESCE(
        (SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(payload_json->'attachments') elem
         WHERE (elem->>'documentType') <> 'DURC'
           AND NOT ((elem->>'documentType') = 'CERTIFICATION' AND (elem->>'certificationKey') IS NULL)
        ),
        '[]'::jsonb
    )
)
WHERE section_key = 'S4'
  AND payload_json->'attachments' IS NOT NULL
  AND jsonb_typeof(payload_json->'attachments') = 'array';

-- Remove durc and certificatiAllegati from the allegati object
UPDATE application_sections
SET payload_json = payload_json
    #- '{allegati,durc}'
    #- '{allegati,certificatiAllegati}'
WHERE section_key = 'S4'
  AND payload_json IS NOT NULL;
