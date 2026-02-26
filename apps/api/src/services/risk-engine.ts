import { RiskLevel, ScreeningType } from '@nbu/shared';

// ─── PHQ-9 scoring ───

const PHQ9_THRESHOLDS = {
    CRISIS_SCORE: 20,
    HIGH_SCORE: 15,
    MODERATE_SCORE: 10,
    SELF_HARM_ITEM: 8, // 0-indexed: item 9 = index 8
    SELF_HARM_THRESHOLD: 2,
};

const GAD7_THRESHOLDS = {
    HIGH_SCORE: 15,
    MODERATE_SCORE: 10,
};

// ─── Stress Mini scoring ───

const STRESS_THRESHOLDS = {
    HIGH: 9,
    MODERATE: 5,
};

export interface ScoreResult {
    phq9_score: number | null;
    gad7_score: number | null;
    stress_score: number | null;
    risk_level: RiskLevel;
}

/**
 * Calculate risk level from screening answers.
 *
 * answers format:
 *  - phq9_gad7: { phq9: [0-3 x 9], gad7: [0-3 x 7] }
 *  - stress_mini: { stress: [0-3 x N] }
 */
export function calculateRisk(
    type: string,
    answers: Record<string, number[]>
): ScoreResult {
    if (type === ScreeningType.PHQ9_GAD7) {
        return calculatePHQ9GAD7(answers);
    }

    if (type === ScreeningType.STRESS_MINI) {
        return calculateStressMini(answers);
    }

    throw new Error(`Unknown screening type: ${type}`);
}

function calculatePHQ9GAD7(answers: Record<string, number[]>): ScoreResult {
    const phq9Answers = answers['phq9'] || [];
    const gad7Answers = answers['gad7'] || [];

    const phq9Score = phq9Answers.reduce((sum, val) => sum + val, 0);
    const gad7Score = gad7Answers.reduce((sum, val) => sum + val, 0);

    // Check crisis: self-harm item (item 9, index 8) >= 2 OR PHQ-9 total >= 20
    const selfHarmValue = phq9Answers[PHQ9_THRESHOLDS.SELF_HARM_ITEM] ?? 0;
    const isCrisis =
        phq9Score >= PHQ9_THRESHOLDS.CRISIS_SCORE ||
        selfHarmValue >= PHQ9_THRESHOLDS.SELF_HARM_THRESHOLD;

    if (isCrisis) {
        return { phq9_score: phq9Score, gad7_score: gad7Score, stress_score: null, risk_level: RiskLevel.CRISIS };
    }

    // Check HIGH: PHQ-9 15-19 OR GAD-7 >= 15
    if (phq9Score >= PHQ9_THRESHOLDS.HIGH_SCORE || gad7Score >= GAD7_THRESHOLDS.HIGH_SCORE) {
        return { phq9_score: phq9Score, gad7_score: gad7Score, stress_score: null, risk_level: RiskLevel.HIGH };
    }

    // Check MODERATE: PHQ-9 10-14 OR GAD-7 10-14
    if (phq9Score >= PHQ9_THRESHOLDS.MODERATE_SCORE || gad7Score >= GAD7_THRESHOLDS.MODERATE_SCORE) {
        return { phq9_score: phq9Score, gad7_score: gad7Score, stress_score: null, risk_level: RiskLevel.MODERATE };
    }

    return { phq9_score: phq9Score, gad7_score: gad7Score, stress_score: null, risk_level: RiskLevel.LOW };
}

function calculateStressMini(answers: Record<string, number[]>): ScoreResult {
    const stressAnswers = answers['stress'] || [];
    const stressScore = stressAnswers.reduce((sum, val) => sum + val, 0);

    let risk_level: RiskLevel;
    if (stressScore >= STRESS_THRESHOLDS.HIGH) {
        risk_level = RiskLevel.HIGH;
    } else if (stressScore >= STRESS_THRESHOLDS.MODERATE) {
        risk_level = RiskLevel.MODERATE;
    } else {
        risk_level = RiskLevel.LOW;
    }

    return { phq9_score: null, gad7_score: null, stress_score: stressScore, risk_level };
}

/**
 * Get routing suggestion based on risk level and intent.
 */
export function getRoutingSuggestion(riskLevel: RiskLevel, intent: string): string {
    switch (riskLevel) {
        case RiskLevel.CRISIS:
            return 'กรุณาติดต่อสายด่วนสุขภาพจิต 1323 หรือพบนักจิตวิทยาทันที';

        case RiskLevel.HIGH:
            return 'แนะนำพบนักจิตวิทยา (Counselor) เพื่อรับการดูแลเพิ่มเติม';

        case RiskLevel.MODERATE:
            if (intent === 'academic') {
                return 'แนะนำปรึกษาอาจารย์ที่ปรึกษาก่อน หรือพบนักจิตวิทยาก็ได้';
            }
            return 'แนะนำพบนักจิตวิทยา หรือปรึกษาอาจารย์ที่ปรึกษาก็ได้';

        case RiskLevel.LOW:
        default:
            return 'สถานะดี! ลองดูแหล่งช่วยเหลือตนเอง หรือนัดพูดคุยเมื่อต้องการ';
    }
}
