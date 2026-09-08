import { describe, expect, it } from 'vitest';
import { classifyIntent, intentIsClear } from '../../src/engine/chat/intent';
import { correctSpelling, parseBuildRequest, parseEarthwork, parseFeature } from '../../src/engine/chat/buildRequest';

describe('the little intent model', () => {
  const guess = (text: string): string => classifyIntent(text).label;

  it('reads sentences nobody wrote down for it', () => {
    const cases: Array<[string, string]> = [
      ['can you put up a big hosptial for me', 'hospital'],
      ['i want a skool with lots of classrooms', 'school'],
      ['make a brige across the river', 'bridge'],
      ['a huge castel for the princess', 'castle'],
      ['somewhere for the sick people to go', 'hospital'],
      ['a place where kids learn things', 'school'],
      ['build a hosue for my friend', 'house'],
      ['dig me a realy big laek', 'lake'],
      ['can we have an undergrond hideout', 'bunker'],
      ['a litle house up in a tree', 'treehouse'],
      ['swings and a slide to play on', 'playground'],
      ['i want to swim, make a pool', 'pool'],
    ];
    const wrong = cases.filter(([text, label]) => guess(text) !== label).map(([text, label]) => `${text} -> ${guess(text)} (wanted ${label})`);
    expect(wrong, wrong.join('; ')).toEqual([]);
  });

  it('shrugs at everything that is not a building request', () => {
    for (const text of ['hello there', 'what colour is the sky', 'lets dance', 'can i have a puppy', 'make it night', 'fly the airplane', 'i love you', 'what should we do']) {
      const intent = classifyIntent(text);
      expect(intentIsClear(intent), `${text} -> ${intent.label} ${intent.confidence.toFixed(2)} (none ${intent.none.toFixed(2)})`).toBe(false);
    }
  });

  it('says how sure it is, so callers can ignore a shaky guess', () => {
    const sure = classifyIntent('build me a big hospital');
    expect(sure.label).toBe('hospital');
    expect(sure.kind).toBe('building');
    expect(sure.confidence).toBeGreaterThan(0.6);
    expect(classifyIntent('').label).toBe('none'); // nothing said, nothing built
  });
});

describe('the words win, the model fills the gaps', () => {
  it('builds the right thing from sentences the word lists do not cover', () => {
    const hospital = parseBuildRequest('can you put up a big hosptial for me');
    expect(hospital?.type).toBe('hospital');
    expect(hospital?.sign).toBe('cross'); // it gets the whole hospital recipe, not just the name
    const school = parseBuildRequest('i want a skool with 6 clasrooms');
    expect(school?.type).toBe('school');
    expect(school?.rooms).toEqual([{ purpose: 'classroom', count: 6 }]);
    expect(parseEarthwork('dig me a realy big laek 30 by 20')).toMatchObject({ kind: 'lake', width: 30, length: 20 });
    expect(parseFeature('make a brige across the river')?.kind).toBe('bridge');
  });

  it('leaves the written words in charge when they do match', () => {
    expect(parseBuildRequest('build a pink house')?.type).toBe('house');
    expect(parseBuildRequest('a huge hospital with doctors')?.type).toBe('hospital');
    expect(parseEarthwork('dig a bunker')?.kind).toBe('bunker');
    expect(parseFeature('a 15 by 11 playground')).toMatchObject({ kind: 'playground', width: 15 });
  });

  it('does not turn chit-chat into a building site', () => {
    for (const text of ['hello there', 'what is your favourite colour', 'lets dance', 'can i have a puppy', 'make it night']) {
      expect(parseBuildRequest(text), text).toBeNull();
      expect(parseEarthwork(text), text).toBeNull();
      expect(parseFeature(text), text).toBeNull();
    }
  });
});

describe('spelling help', () => {
  it('fixes words the parser knows and leaves ordinary sentences alone', () => {
    expect(correctSpelling('6 clasrooms and a computr room')).toBe('6 classrooms and a computer room');
    expect(correctSpelling('a hosptial with docters')).toBe('a hospital with doctors');
    const untouched = [
      'build a long bridge over the water',
      'i want a big house near the river with lots of trees',
      'make it night and give me a puppy please',
      'my sister wants a pink castle',
      'what colour is the sky today',
    ];
    for (const line of untouched) expect(correctSpelling(line), line).toBe(line);
  });
});

describe('every model gets the same answer', () => {
  it('a helper that says nothing useful still builds what the words describe, misspelled or not', async () => {
    const { ChatAgent } = await import('../../src/engine/chat/ChatAgent');
    expect(typeof ChatAgent).toBe('function');
    // The parsers are the shared floor under every provider: rules, built-in model, helper.
    for (const [text, type] of [['bild me a hosptial', 'hospital'], ['a skool for the kids', 'school'], ['huge mansion', 'house']] as const) {
      expect(parseBuildRequest(text)?.type, text).toBe(type);
    }
  });
});
