-- =============================================
-- DRUG INTERACTION WARNING SYSTEM
-- Comprehensive drug interaction checking for prescription flow
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create drug interaction database table
CREATE TABLE IF NOT EXISTS drug_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Interacting drugs (can be generic names or specific medicine IDs)
    drug1_name TEXT NOT NULL,
    drug2_name TEXT NOT NULL,
    drug1_knowledge_id UUID REFERENCES medicine_knowledge_base(id),
    drug2_knowledge_id UUID REFERENCES medicine_knowledge_base(id),
    
    -- Interaction details
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'major', 'moderate', 'minor', 'contraindicated', 'unknown'
    )),
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 10),
    
    -- Description and management
    description TEXT NOT NULL,
    description_bn TEXT,
    mechanism TEXT,
    mechanism_bn TEXT,
    clinical_effect TEXT,
    clinical_effect_bn TEXT,
    management_strategy TEXT,
    management_strategy_bn TEXT,
    
    -- Risk factors
    onset_time TEXT CHECK (onset_time IN ('rapid', 'delayed', 'unknown')),
    duration TEXT CHECK (duration IN ('short', 'prolonged', 'permanent', 'unknown')),
    evidence_level TEXT CHECK (evidence_level IN ('established', 'probable', 'suspected', 'theoretical')),
    
    -- Metadata
    data_source TEXT DEFAULT 'manual_entry',
    reference_links TEXT[],
    last_reviewed DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for drug interaction table
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug1_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(drug2_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_knowledge1 ON drug_interactions(drug1_knowledge_id) WHERE drug1_knowledge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_knowledge2 ON drug_interactions(drug2_knowledge_id) WHERE drug2_knowledge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(interaction_type, severity_level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_drug_interactions_combo ON drug_interactions(drug1_name, drug2_name) WHERE is_active = true;

-- 3. Create prescription drug interaction checking table
CREATE TABLE IF NOT EXISTS prescription_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Prescription reference
    prescription_id UUID, -- Reference to prescriptions table when available
    pharmacy_id UUID NOT NULL, -- Always track pharmacy
    patient_reference TEXT, -- Patient identifier (name, phone, etc.)
    
    -- Interaction details
    interaction_id UUID REFERENCES drug_interactions(id),
    medicine1_id UUID, -- Reference to medicines table
    medicine2_id UUID, -- Reference to medicines table
    medicine1_name TEXT NOT NULL,
    medicine2_name TEXT NOT NULL,
    
    -- Check results
    severity_level TEXT NOT NULL,
    risk_assessment TEXT,
    recommended_action TEXT,
    pharmacist_notes TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'reviewed', 'override_approved', 'alternative_suggested', 'resolved'
    )),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for prescription interactions
CREATE INDEX IF NOT EXISTS idx_prescription_interactions_pharmacy ON prescription_interactions(pharmacy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescription_interactions_status ON prescription_interactions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_prescription_interactions_severity ON prescription_interactions(severity_level);
CREATE INDEX IF NOT EXISTS idx_prescription_interactions_patient ON prescription_interactions(patient_reference) WHERE patient_reference IS NOT NULL;

-- 5. Insert comprehensive drug interaction data
INSERT INTO drug_interactions (
    drug1_name, drug2_name, interaction_type, severity_level,
    description, description_bn, mechanism, clinical_effect, management_strategy,
    evidence_level, onset_time, duration, data_source
) VALUES
-- Major interactions
('Warfarin', 'Aspirin', 'major', 9,
 'Increased risk of bleeding when warfarin is combined with aspirin',
 'ওয়ারফারিন ও অ্যাসপিরিনের সংমিশ্রণে রক্তক্ষরণের ঝুঁকি বৃদ্ধি',
 'Additive anticoagulant and antiplatelet effects',
 'Severe bleeding, hemorrhage',
 'Monitor INR closely, consider alternative analgesic, reduce warfarin dose if necessary',
 'established', 'delayed', 'prolonged', 'clinical_database'),

('Digoxin', 'Furosemide', 'major', 8,
 'Furosemide can increase digoxin toxicity by causing hypokalemia',
 'ফুরোসেমাইড হাইপোক্যালেমিয়ার কারণে ডিগক্সিন বিষাক্ততা বৃদ্ধি করতে পারে',
 'Diuretic-induced electrolyte depletion increases digoxin sensitivity',
 'Digoxin toxicity, cardiac arrhythmias',
 'Monitor serum potassium and digoxin levels, consider potassium supplementation',
 'established', 'delayed', 'prolonged', 'clinical_database'),

('Metformin', 'Contrast Media', 'major', 9,
 'Risk of lactic acidosis when metformin is used with iodinated contrast',
 'আয়োডিনেটেড কনট্রাস্টের সাথে মেটফরমিন ব্যবহারে ল্যাকটিক অ্যাসিডোসিসের ঝুঁকি',
 'Contrast-induced nephrotoxicity may impair metformin elimination',
 'Lactic acidosis, kidney dysfunction',
 'Discontinue metformin 48 hours before contrast, resume after normal kidney function confirmed',
 'established', 'delayed', 'prolonged', 'clinical_database'),

('Phenytoin', 'Carbamazepine', 'moderate', 6,
 'Carbamazepine may reduce phenytoin levels through enzyme induction',
 'কার্বামাজেপিন এনজাইম ইনডাকশনের মাধ্যমে ফেনাইটয়িনের মাত্রা কমাতে পারে',
 'CYP450 enzyme induction increases phenytoin metabolism',
 'Reduced phenytoin efficacy, seizure breakthrough',
 'Monitor phenytoin levels, adjust dose as needed',
 'established', 'delayed', 'prolonged', 'clinical_database'),

-- Moderate interactions
('Atorvastatin', 'Erythromycin', 'moderate', 6,
 'Erythromycin may increase atorvastatin levels and risk of myopathy',
 'এরিথ্রোমাইসিন অ্যাটরভাস্ট্যাটিনের মাত্রা ও মায়োপ্যাথির ঝুঁকি বৃদ্ধি করতে পারে',
 'CYP3A4 inhibition reduces statin metabolism',
 'Muscle pain, rhabdomyolysis risk',
 'Monitor for muscle symptoms, consider statin dose reduction or alternative antibiotic',
 'established', 'delayed', 'short', 'clinical_database'),

('Lisinopril', 'Potassium Supplements', 'moderate', 7,
 'ACE inhibitors with potassium supplements may cause hyperkalemia',
 'এসিই ইনহিবিটরের সাথে পটাসিয়াম সাপ্লিমেন্ট হাইপারক্যালেমিয়া করতে পারে',
 'Reduced potassium excretion combined with potassium intake',
 'Hyperkalemia, cardiac arrhythmias',
 'Monitor serum potassium regularly, adjust potassium supplementation',
 'established', 'delayed', 'prolonged', 'clinical_database'),

('Fluoxetine', 'Tramadol', 'moderate', 7,
 'Increased risk of serotonin syndrome when combining SSRIs with tramadol',
 'এসএসআরআই ও ট্রামাডলের সংমিশ্রণে সেরোটোনিন সিনড্রোমের ঝুঁকি বৃদ্ধি',
 'Excessive serotonergic activity',
 'Agitation, hyperthermia, muscle rigidity',
 'Monitor for serotonin syndrome symptoms, consider alternative analgesic',
 'probable', 'rapid', 'short', 'clinical_database'),

-- Minor interactions
('Omeprazole', 'Iron Supplements', 'minor', 3,
 'Omeprazole may reduce iron absorption due to increased gastric pH',
 'ওমিপ্রাজল গ্যাস্ট্রিক পিএইচ বৃদ্ধির কারণে আয়রন শোষণ কমাতে পারে',
 'Reduced gastric acidity impairs iron solubility',
 'Decreased iron absorption, potential deficiency',
 'Take iron supplements 2 hours before or after omeprazole, monitor iron levels',
 'probable', 'delayed', 'prolonged', 'clinical_database'),

('Calcium Carbonate', 'Tetracycline', 'moderate', 5,
 'Calcium significantly reduces tetracycline absorption',
 'ক্যালসিয়াম টেট্রাসাইক্লিনের শোষণ উল্লেখযোগ্যভাবে কমায়',
 'Chelation reduces antibiotic bioavailability',
 'Reduced antibiotic efficacy',
 'Separate administration by 2-4 hours, avoid concurrent use',
 'established', 'rapid', 'short', 'clinical_database'),

-- Contraindicated combinations
('MAO Inhibitors', 'SSRIs', 'contraindicated', 10,
 'Potentially fatal serotonin syndrome when MAO inhibitors combined with SSRIs',
 'এমএও ইনহিবিটর ও এসএসআরআইর সংমিশ্রণে মারাত্মক সেরোটোনিন সিনড্রোম',
 'Excessive serotonin accumulation',
 'Hyperthermia, rigidity, mental status changes, death',
 'Contraindicated - do not use together. Allow 2-week washout period',
 'established', 'rapid', 'prolonged', 'clinical_database')

ON CONFLICT DO NOTHING;

-- 6. Create comprehensive drug interaction checking function
CREATE OR REPLACE FUNCTION check_prescription_interactions(
    medicine_names TEXT[],
    pharmacy_id_param UUID,
    patient_reference_param TEXT DEFAULT NULL,
    include_minor BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    interaction_list JSON[] := '{}';
    i INTEGER;
    j INTEGER;
    medicine1 TEXT;
    medicine2 TEXT;
    interaction_record RECORD;
    total_interactions INTEGER := 0;
    major_count INTEGER := 0;
    moderate_count INTEGER := 0;
    minor_count INTEGER := 0;
    contraindicated_count INTEGER := 0;
BEGIN
    -- Check all pairs of medicines
    FOR i IN 1..array_length(medicine_names, 1) LOOP
        FOR j IN (i+1)..array_length(medicine_names, 1) LOOP
            medicine1 := medicine_names[i];
            medicine2 := medicine_names[j];
            
            -- Check for interactions (both directions)
            FOR interaction_record IN
                SELECT 
                    di.*,
                    CASE 
                        WHEN di.drug1_name = medicine1 AND di.drug2_name = medicine2 THEN 'forward'
                        WHEN di.drug1_name = medicine2 AND di.drug2_name = medicine1 THEN 'reverse'
                        WHEN di.drug1_name ILIKE '%' || medicine1 || '%' OR medicine1 ILIKE '%' || di.drug1_name || '%' THEN 'partial1'
                        WHEN di.drug2_name ILIKE '%' || medicine2 || '%' OR medicine2 ILIKE '%' || di.drug2_name || '%' THEN 'partial2'
                        ELSE 'unknown'
                    END as match_type
                FROM drug_interactions di
                WHERE di.is_active = true
                AND (
                    -- Exact matches
                    (LOWER(di.drug1_name) = LOWER(medicine1) AND LOWER(di.drug2_name) = LOWER(medicine2)) OR
                    (LOWER(di.drug1_name) = LOWER(medicine2) AND LOWER(di.drug2_name) = LOWER(medicine1)) OR
                    -- Partial matches for generic/brand names
                    (di.drug1_name ILIKE '%' || medicine1 || '%' AND di.drug2_name ILIKE '%' || medicine2 || '%') OR
                    (di.drug1_name ILIKE '%' || medicine2 || '%' AND di.drug2_name ILIKE '%' || medicine1 || '%') OR
                    (medicine1 ILIKE '%' || di.drug1_name || '%' AND medicine2 ILIKE '%' || di.drug2_name || '%') OR
                    (medicine2 ILIKE '%' || di.drug1_name || '%' AND medicine1 ILIKE '%' || di.drug2_name || '%')
                )
                AND (include_minor = true OR di.interaction_type != 'minor')
            LOOP
                total_interactions := total_interactions + 1;
                
                -- Count by severity
                CASE interaction_record.interaction_type
                    WHEN 'major' THEN major_count := major_count + 1;
                    WHEN 'moderate' THEN moderate_count := moderate_count + 1;
                    WHEN 'minor' THEN minor_count := minor_count + 1;
                    WHEN 'contraindicated' THEN contraindicated_count := contraindicated_count + 1;
                END CASE;
                
                -- Add to interaction list
                interaction_list := interaction_list || json_build_object(
                    'id', interaction_record.id,
                    'medicine1', medicine1,
                    'medicine2', medicine2,
                    'drug1_name', interaction_record.drug1_name,
                    'drug2_name', interaction_record.drug2_name,
                    'interaction_type', interaction_record.interaction_type,
                    'severity_level', interaction_record.severity_level,
                    'description', interaction_record.description,
                    'description_bn', interaction_record.description_bn,
                    'clinical_effect', interaction_record.clinical_effect,
                    'clinical_effect_bn', interaction_record.clinical_effect_bn,
                    'management_strategy', interaction_record.management_strategy,
                    'management_strategy_bn', interaction_record.management_strategy_bn,
                    'onset_time', interaction_record.onset_time,
                    'duration', interaction_record.duration,
                    'evidence_level', interaction_record.evidence_level,
                    'match_type', interaction_record.match_type,
                    'severity_color', CASE interaction_record.interaction_type
                        WHEN 'contraindicated' THEN '#000000'
                        WHEN 'major' THEN '#FF0000'
                        WHEN 'moderate' THEN '#FFA500'
                        WHEN 'minor' THEN '#FFFF00'
                        ELSE '#808080'
                    END,
                    'action_required', CASE interaction_record.interaction_type
                        WHEN 'contraindicated' THEN 'STOP - Do not use together'
                        WHEN 'major' THEN 'CAUTION - Monitor closely'
                        WHEN 'moderate' THEN 'WARNING - Consider alternatives'
                        WHEN 'minor' THEN 'NOTICE - Be aware'
                        ELSE 'REVIEW'
                    END
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    -- Build result
    SELECT json_build_object(
        'has_interactions', total_interactions > 0,
        'total_interactions', total_interactions,
        'severity_summary', json_build_object(
            'contraindicated', contraindicated_count,
            'major', major_count,
            'moderate', moderate_count,
            'minor', minor_count
        ),
        'risk_level', CASE 
            WHEN contraindicated_count > 0 THEN 'CONTRAINDICATED'
            WHEN major_count > 0 THEN 'HIGH'
            WHEN moderate_count > 0 THEN 'MEDIUM'
            WHEN minor_count > 0 THEN 'LOW'
            ELSE 'NONE'
        END,
        'interactions', array_to_json(interaction_list),
        'medicines_checked', medicine_names,
        'recommendations', CASE 
            WHEN contraindicated_count > 0 THEN json_build_array(
                'Do not dispense - contraindicated combination detected',
                'Consult prescriber immediately',
                'Consider alternative medications'
            )
            WHEN major_count > 0 THEN json_build_array(
                'High risk interaction - proceed with extreme caution',
                'Patient counseling required',
                'Consider dose adjustments or monitoring'
            )
            WHEN moderate_count > 0 THEN json_build_array(
                'Monitor patient for interaction effects',
                'Provide patient counseling',
                'Consider spacing doses if possible'
            )
            WHEN minor_count > 0 THEN json_build_array(
                'Minor interaction noted',
                'Inform patient of potential effects'
            )
            ELSE json_build_array('No significant interactions detected')
        END,
        'checked_at', NOW(),
        'pharmacy_id', pharmacy_id_param,
        'patient_reference', patient_reference_param
    ) INTO result;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'has_interactions', false,
            'error', SQLERRM,
            'medicines_checked', medicine_names
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to log prescription interaction checks
CREATE OR REPLACE FUNCTION log_prescription_interaction_check(
    interaction_check_result JSON,
    prescription_id_param UUID DEFAULT NULL,
    pharmacy_id_param UUID DEFAULT NULL,
    patient_ref TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    log_id UUID;
    interaction JSON;
    interaction_record RECORD;
BEGIN
    -- Extract data from the check result
    FOR interaction IN SELECT * FROM json_array_elements(interaction_check_result->'interactions')
    LOOP
        -- Insert each interaction into the log
        INSERT INTO prescription_interactions (
            prescription_id,
            pharmacy_id,
            patient_reference,
            medicine1_name,
            medicine2_name,
            severity_level,
            risk_assessment,
            recommended_action,
            status
        ) VALUES (
            prescription_id_param,
            pharmacy_id_param,
            patient_ref,
            interaction->>'medicine1',
            interaction->>'medicine2',
            interaction->>'interaction_type',
            interaction->>'description',
            interaction->>'action_required',
            'pending'
        ) RETURNING id INTO log_id;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'logged_interactions', json_array_length(interaction_check_result->'interactions'),
        'message', 'Interaction check logged successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to get interaction statistics
CREATE OR REPLACE FUNCTION get_interaction_statistics(
    pharmacy_id_param UUID DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_checks', stats.total_checks,
        'interactions_found', stats.interactions_found,
        'by_severity', json_build_object(
            'contraindicated', stats.contraindicated_count,
            'major', stats.major_count,
            'moderate', stats.moderate_count,
            'minor', stats.minor_count
        ),
        'resolution_status', json_build_object(
            'pending', stats.pending_count,
            'reviewed', stats.reviewed_count,
            'resolved', stats.resolved_count
        ),
        'top_interactions', stats.top_interactions,
        'period_days', days_back
    ) INTO result
    FROM (
        SELECT 
            COUNT(DISTINCT DATE(created_at)) as total_checks,
            COUNT(*) as interactions_found,
            COUNT(CASE WHEN severity_level = 'contraindicated' THEN 1 END) as contraindicated_count,
            COUNT(CASE WHEN severity_level = 'major' THEN 1 END) as major_count,
            COUNT(CASE WHEN severity_level = 'moderate' THEN 1 END) as moderate_count,
            COUNT(CASE WHEN severity_level = 'minor' THEN 1 END) as minor_count,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_count,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
            (
                SELECT json_agg(interaction_summary)
                FROM (
                    SELECT 
                        medicine1_name || ' + ' || medicine2_name as combination,
                        severity_level,
                        COUNT(*) as occurrence_count
                    FROM prescription_interactions pi2
                    WHERE pi2.created_at >= NOW() - INTERVAL '1 day' * days_back
                    AND (pharmacy_id_param IS NULL OR pi2.pharmacy_id = pharmacy_id_param)
                    GROUP BY medicine1_name, medicine2_name, severity_level
                    ORDER BY COUNT(*) DESC
                    LIMIT 10
                ) interaction_summary
            ) as top_interactions
        FROM prescription_interactions pi
        WHERE pi.created_at >= NOW() - INTERVAL '1 day' * days_back
        AND (pharmacy_id_param IS NULL OR pi.pharmacy_id = pharmacy_id_param)
    ) stats;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to update interaction status
CREATE OR REPLACE FUNCTION update_interaction_status(
    interaction_id_param UUID,
    new_status TEXT,
    pharmacist_notes_param TEXT DEFAULT NULL,
    reviewed_by_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    UPDATE prescription_interactions
    SET 
        status = new_status,
        pharmacist_notes = COALESCE(pharmacist_notes_param, pharmacist_notes),
        reviewed_by = COALESCE(reviewed_by_param, reviewed_by),
        reviewed_at = CASE WHEN new_status IN ('reviewed', 'override_approved', 'resolved') THEN NOW() ELSE reviewed_at END,
        updated_at = NOW()
    WHERE id = interaction_id_param;
    
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Interaction status updated successfully'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Interaction record not found'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION check_prescription_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION log_prescription_interaction_check TO authenticated;
GRANT EXECUTE ON FUNCTION get_interaction_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION update_interaction_status TO authenticated;

-- 11. Create views for easy access
CREATE OR REPLACE VIEW active_drug_interactions AS
SELECT 
    di.*,
    CASE di.interaction_type
        WHEN 'contraindicated' THEN 10
        WHEN 'major' THEN 8
        WHEN 'moderate' THEN 5
        WHEN 'minor' THEN 2
        ELSE 1
    END as priority_score
FROM drug_interactions di
WHERE di.is_active = true
ORDER BY priority_score DESC, di.severity_level DESC;

CREATE OR REPLACE VIEW pending_interaction_reviews AS
SELECT 
    pi.*,
    di.description as interaction_description,
    di.management_strategy,
    EXTRACT(EPOCH FROM (NOW() - pi.created_at))/3600 as hours_pending
FROM prescription_interactions pi
LEFT JOIN drug_interactions di ON pi.interaction_id = di.id
WHERE pi.status = 'pending'
ORDER BY 
    CASE pi.severity_level
        WHEN 'contraindicated' THEN 1
        WHEN 'major' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'minor' THEN 4
        ELSE 5
    END,
    pi.created_at;

GRANT SELECT ON active_drug_interactions TO authenticated;
GRANT SELECT ON pending_interaction_reviews TO authenticated;

-- Success message
SELECT 'Drug Interaction Warning System setup completed successfully!' as status;