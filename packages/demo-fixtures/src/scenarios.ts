/**
 * Demo scenarios for different listening contexts
 */

export interface Scenario {
  id: string;
  name: string;
  description: string;
  context: string;
}

export const scenarios: Scenario[] = [
  {
    id: 'late-night',
    name: 'Late Night Melodic',
    description: 'Introspective, atmospheric session',
    context: 'late-night',
  },
  {
    id: 'gym',
    name: 'Gym Session',
    description: 'Energetic, tempo-driven tracks',
    context: 'workout',
  },
  {
    id: 'study',
    name: 'Study Session',
    description: 'Ambient, focus-friendly music',
    context: 'study',
  },
];
