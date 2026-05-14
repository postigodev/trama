import { describe, expect, it } from 'vitest';
import { rankCandidates } from '../../core/src/ranking';
import { getScenarioById, scenarios } from './scenarios';

describe('@trama/demo-fixtures - scenario ranking behavior', () => {
  it('runs rankCandidates() over every scenario', () => {
    for (const scenario of scenarios) {
      const ranked = rankCandidates(
        scenario.candidates,
        scenario.session,
        scenario.config
      );
      expect(ranked.length).toBe(scenario.candidates.length);
    }
  });

  it('late-night ranks continuity higher than disruptive tracks', () => {
    const scenario = getScenarioById('late-night-melodic-session');
    expect(scenario).toBeDefined();

    const ranked = rankCandidates(
      scenario!.candidates,
      scenario!.session,
      scenario!.config
    );

    const lateTrack = ranked.find(item => item.track.id === 'late-2');
    const disruptiveTrack = ranked.find(item => item.track.id === 'break-1');

    expect(lateTrack).toBeDefined();
    expect(disruptiveTrack).toBeDefined();
    expect(lateTrack!.score).toBeGreaterThan(disruptiveTrack!.score);
  });

  it('broken session lowers candidates related to skips', () => {
    const scenario = getScenarioById('broken-session-many-skips');
    expect(scenario).toBeDefined();

    const ranked = rankCandidates(
      scenario!.candidates,
      scenario!.session,
      scenario!.config
    );

    const skipped = ranked.find(item => item.track.id === 'break-2');
    const recovered = ranked.find(item => item.track.id === 'late-1');

    expect(skipped).toBeDefined();
    expect(recovered).toBeDefined();
    expect(skipped!.warnings.some(warning => warning.type === 'skip_risk')).toBe(true);
    expect(skipped!.score).toBeLessThan(recovered!.score);
  });

  it('gym config allows familiar repeat with lower penalty', () => {
    const scenario = getScenarioById('gym-session');
    expect(scenario).toBeDefined();

    const ranked = rankCandidates(
      scenario!.candidates,
      scenario!.session,
      scenario!.config
    );

    const familiar = ranked.find(item => item.track.id === 'gym-1');
    const study = ranked.find(item => item.track.id === 'study-1');

    expect(familiar).toBeDefined();
    expect(study).toBeDefined();
    expect(
      familiar!.scoreBreakdown.components.recentRepeatRisk.contribution
    ).toBeGreaterThanOrEqual(-0.04);
    expect(familiar!.score).toBeGreaterThan(study!.score);
  });

  it('explicit feedback changes ranking outcome', () => {
    const scenario = getScenarioById('study-session');
    expect(scenario).toBeDefined();

    const ranked = rankCandidates(
      scenario!.candidates,
      scenario!.session,
      scenario!.config
    );

    const liked = ranked.find(item => item.track.id === 'study-2');
    const skipped = ranked.find(item => item.track.id === 'break-2');

    expect(liked).toBeDefined();
    expect(skipped).toBeDefined();
    expect(liked!.scoreBreakdown.components.explicitFeedback.raw).toBeGreaterThan(0);
    expect(liked!.score).toBeGreaterThan(skipped!.score);
  });
});
