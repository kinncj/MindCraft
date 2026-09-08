import { describe, expect, it } from 'vitest';
import { classifyAll, classifyIntent, intentIsClear, splitClauses } from '../../src/engine/chat/intent';
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

  it('never turns talking, playing, or the weather into a building site', () => {
    for (const text of ['hello there', 'what colour is the sky', 'lets dance', 'can i have a puppy', 'make it night', 'fly the airplane', 'i love you', 'what should we do', 'i had pizza for lunch']) {
      const intent = classifyIntent(text);
      const builds = intent.kind === 'building' || intent.kind === 'earthwork' || intent.kind === 'feature';
      expect(builds && intentIsClear(intent), `${text} -> ${intent.label} ${intent.confidence.toFixed(2)}`).toBe(false);
    }
  });

  it('hears the other things a villager can do', () => {
    const cases: Array<[string, string]> = [
      ['can you come with me', 'follow'],
      ['wait right here until i come back', 'stay'],
      ['lets have a party', 'dance'],
      ['do you have something for me', 'gift'],
      ['i want to see the stars', 'time_night'],
      ['can we have the daytime back', 'time_day'],
      ['can we have a storm', 'weather_rain'],
      ['i want snow to play in', 'weather_snow'],
      ['can i have a puppy', 'pet'],
      ['send me a butterfly', 'creature'],
      ['go fly that airplane', 'ride'],
      ['i want a car of my own', 'vehicle'],
      ['let me fly please', 'fly'],
      ['build a huge pyramid', 'shape'],
    ];
    const wrong = cases.filter(([text, label]) => guess(text) !== label).map(([text, label]) => `${text} -> ${guess(text)} (wanted ${label})`);
    expect(wrong, wrong.join('; ')).toEqual([]);
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

describe('a whole sentence, not one word of it', () => {
  it('splits a sentence into the requests it really contains', () => {
    expect(splitClauses('build a school and dig a big lake')).toEqual(['build a school', 'dig a big lake']);
    expect(classifyAll('build a school and dig a big lake').map((i) => i.label)).toEqual(['school', 'lake']);
    expect(classifyAll('make me a house, a treehouse and a bridge').map((i) => i.label)).toEqual(['house', 'treehouse', 'bridge']);
    expect(classifyAll('build a castle then make it night').map((i) => i.label)).toEqual(['castle', 'time_night']);
  });

  it('keeps a building and the things inside it together', () => {
    const one = classifyAll('build a school with 6 classrooms and a computer room');
    expect(one.map((i) => i.label)).toEqual(['school']);
    expect(classifyAll('a house with a garden and a pool').map((i) => i.label)).toEqual(['house']);
  });
});

describe('the model stays small enough to ship', () => {
  it('costs a player well under 50 KB, and says so in its own header', async () => {
    const { readFileSync } = await import('node:fs');
    const { gzipSync } = await import('node:zlib');
    const source = readFileSync('src/engine/chat/intentWeights.ts', 'utf8');
    const base64 = /weights: '([A-Za-z0-9+/=]+)'/.exec(source)?.[1] ?? '';
    expect(base64.length).toBeGreaterThan(0);
    const kb = gzipSync(Buffer.from(base64)).length / 1024;
    // A page a child loads on a phone: the whole app gzips to under 300 KB, and the
    // model may not quietly eat that budget. Retrain with a higher PRUNE if this trips.
    expect(kb, `the weights gzip to ${kb.toFixed(1)} KB`).toBeLessThan(50);
    // The header is what the docs quote, so it has to match what is actually here.
    const claimed = /Download cost: ([\d.]+) KB gzipped/.exec(source)?.[1];
    expect(claimed, 'the generated header records the download cost').toBeDefined();
    expect(Math.abs(Number(claimed) - kb), `header says ${claimed} KB, measured ${kb.toFixed(1)} KB`).toBeLessThan(0.2);
  });
});

describe('the docs quote the model that actually ships', () => {
  it('agrees with the code on buckets and labels', async () => {
    const { readFileSync } = await import('node:fs');
    const { FEATURE_BUCKETS, INTENT_LABELS } = await import('../../src/engine/chat/intentFeatures');
    const shape = `${FEATURE_BUCKETS} buckets × ${INTENT_LABELS.length} labels`;
    const generated = readFileSync('src/engine/chat/intentWeights.ts', 'utf8');
    expect(generated, 'the generated header').toContain(`${FEATURE_BUCKETS} hashed n-gram buckets → ${INTENT_LABELS.length} labels`);
    // Prose drifts silently; this is the cheapest way to stop it.
    for (const doc of ['docs/architecture/adr-0016-intent-model.md', 'docs/ai/how-we-built-the-little-model.md']) {
      const text = readFileSync(doc, 'utf8').replace(/\s+/g, ' ');
      const quotesShape = text.includes(shape) || text.includes(`${FEATURE_BUCKETS} hashed feature buckets × ${INTENT_LABELS.length} labels`);
      expect(quotesShape, `${doc} does not quote "${shape}"`).toBe(true);
    }
  });
});
