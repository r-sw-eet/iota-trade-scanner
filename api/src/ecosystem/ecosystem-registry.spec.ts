import { ALL_PROJECTS, CATEGORIES, SUBCATEGORIES } from './projects';

describe('registry taxonomy', () => {
  it('every project\'s category is one of the 10 canonical CATEGORIES', () => {
    const valid = new Set<string>(CATEGORIES);
    const offenders = ALL_PROJECTS
      .filter((p) => !valid.has(p.category))
      .map((p) => `${p.name}: ${p.category}`);
    expect(offenders).toEqual([]);
  });

  it('every project\'s subcategory (when set) is in SUBCATEGORIES[category]', () => {
    const offenders = ALL_PROJECTS
      .filter((p) => p.subcategory !== undefined)
      .filter((p) => !(SUBCATEGORIES[p.category] as readonly string[]).includes(p.subcategory as string))
      .map((p) => `${p.name}: ${p.category} / ${p.subcategory}`);
    expect(offenders).toEqual([]);
  });

  it('Misc projects have no subcategory', () => {
    const offenders = ALL_PROJECTS
      .filter((p) => p.category === 'Misc' && p.subcategory !== undefined)
      .map((p) => `${p.name}: ${p.subcategory}`);
    expect(offenders).toEqual([]);
  });

  it('each category\'s sub-vocabulary is capped at 10 entries', () => {
    const offenders = CATEGORIES
      .filter((c) => (SUBCATEGORIES[c] as readonly string[]).length > 10)
      .map((c) => `${c}: ${SUBCATEGORIES[c].length}`);
    expect(offenders).toEqual([]);
  });

  it('industries (when set) is a non-empty string array of trimmed strings', () => {
    const offenders = ALL_PROJECTS
      .filter((p) => p.industries !== undefined)
      .filter((p) => !Array.isArray(p.industries)
        || p.industries!.length === 0
        || p.industries!.some((s) => typeof s !== 'string' || s !== s.trim() || s.length === 0))
      .map((p) => `${p.name}: ${JSON.stringify(p.industries)}`);
    expect(offenders).toEqual([]);
  });
});
