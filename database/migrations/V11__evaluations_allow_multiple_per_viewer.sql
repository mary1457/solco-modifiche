-- Allow multiple evaluations per viewer per supplier (append mode)
ALTER TABLE evaluations DROP CONSTRAINT IF EXISTS uk_evaluation_supplier_evaluator;
