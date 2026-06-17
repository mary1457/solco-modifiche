-- Albo B S4: remove accreditamenti fields from payload_json
UPDATE application_sections
SET payload_json = payload_json
    #- '{accreditamentoFormazione}'
    #- '{accreditamentoRegioni}'
    #- '{accreditamentoTipoFormazione}'
    #- '{accreditamentoServiziLavoro}'
    #- '{accreditationSummary}'
    #- '{accreditationTraining}'
    #- '{employmentServicesAccreditation}'
WHERE section_key = 'S4'
  AND payload_json IS NOT NULL;
