import React, { useEffect, useState } from 'react';
import * as E from './game/engine';
import { Home } from './ui/Home';
import { DeckSelect } from './ui/DeckSelect';
import { Battle } from './ui/Battle';
import { DeckBuilder } from './ui/DeckBuilder';
import { Matchmaking } from './ui/Matchmaking';
import { PackOpening } from './ui/PackOpening';
import { installContent } from './game/content';
import { installHouse } from './game/house';
import { installTutorialDecks, TUTORIAL_YOU, TUTORIAL_FOE } from './game/tutorialDecks';
import { loadReminderPref } from './render/cardFace';
import { useDevice } from './ui/device';
import { tuneFlag } from './ui/tuner';
import { RotateGate } from './ui/RotateGate';

// Cards and decks are installed before anything renders.
installHouse();
installContent();
installTutorialDecks();

type Screen = 'home' | 'select' | 'matching' | 'battle' | 'decks' | 'packs';

const SEEN_KEY = 'ad_tutorial_seen';

const markTutorialSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage unavailable — it will offer itself again next time, which is harmless */
  }
};

export default function App() {
  const { portrait } = useDevice();
  const [screen, setScreen] = useState<Screen>('home');
  // Defaults are read off the lineup rather than named, so a renamed deck cannot leave the
  // app pointing at an id that no longer exists.
  const [youDeck, setYouDeck] = useState(() => visible()[0].id);
  const [resolvedFoe, setResolvedFoe] = useState(() => visible()[1].id);
  const [matchKey, setMatchKey] = useState(0);
  /** The guided game runs on its own two decks, with the coach's light over the board. */
  const [coaching, setCoaching] = useState(false);

  // Read before anything draws a card face, since the setting is baked into the pixels.
  useEffect(() => {
    loadReminderPref();
  }, []);

  /*
   * Opened by the tuning page: go straight into the lesson.
   *
   * `tutorial-tuner.html` shows this file twice, side by side at a phone's size and a
   * desktop's, and drives the tutorial through it. Clicking through the title screen and the
   * deck wall in both frames every time the page reloads is not something to ask of anybody,
   * so the flag skips to the thing being tuned.
   */
  useEffect(() => {
    if (tuneFlag() === null) return;
    setCoaching(true);
    setMatchKey((n) => n + 1);
    setScreen('battle');
  }, []);

  const launch = () => {
    // The opponent is drawn, never chosen. You are being matched with somebody, and the
    // one thing a queue never lets you do is pick what you are up against.
    setCoaching(false);
    const ids = visible().map((d) => d.id);
    const pool = ids.filter((id) => id !== youDeck);
    setResolvedFoe(pool[Math.floor(Math.random() * pool.length)]);
    setMatchKey((n) => n + 1);
    setScreen('matching');
  };

  /*
   * The tutorial is a real match, so it goes straight to the board — no queue screen, since
   * there is nobody to be matched with and the first thing a new player should see is the
   * table rather than a spinner.
   */
  const teach = () => {
    setCoaching(true);
    setMatchKey((n) => n + 1);
    setScreen('battle');
  };

  /*
   * The rotate prompt is laid over whatever is already on screen rather than replacing it.
   * Replacing it would unmount the board, and unmounting the board mid-match throws the
   * game away — turning the phone by accident must not cost somebody their game.
   */
  return (
    <>
      {renderScreen()}
      {portrait && <RotateGate />}
    </>
  );

  function renderScreen() {
  if (screen === 'battle') {
    return (
      <Battle
        key={matchKey}
        youDeck={coaching ? TUTORIAL_YOU : youDeck}
        foeDeck={coaching ? TUTORIAL_FOE : resolvedFoe}
        // Leaving a match drops back to deck selection, not to the title: the next thing
        // anyone wants after a game is a different deck.
        onExit={() => setScreen('select')}
        coach={coaching}
        /* The lesson ends on its own closing sequence and then hands you back to the deck
           wall. It used to leave you standing in a half-played tutorial match against a
           rigged deck with the coach gone — which is neither a lesson nor a game. */
        onCoachDone={() => { markTutorialSeen(); setCoaching(false); setScreen('select'); }}
      />
    );
  }

  if (screen === 'matching') {
    const deckOf = (id: string) => visible().find((d) => d.id === id) ?? visible()[0];
    return (
      <Matchmaking
        key={matchKey}
        you={deckOf(youDeck)}
        foe={deckOf(resolvedFoe)}
        onReady={() => setScreen('battle')}
        onCancel={() => setScreen('select')}
      />
    );
  }

  // The builder lives behind the start button, not on the title screen: it edits the thing
  // you are about to take into a match, so it belongs next to the decks.
  if (screen === 'decks') return <DeckBuilder onClose={() => setScreen('select')} />;
  if (screen === 'packs') return <PackOpening onClose={() => setScreen('select')} />;

  if (screen === 'select') {
    return (
      <DeckSelect
        youDeck={youDeck}
        onPickYou={setYouDeck}
        onLaunch={launch}
        onBuild={() => setScreen('decks')}
        onPacks={() => setScreen('packs')}
        onTutorial={teach}
        onBack={() => setScreen('home')}
      />
    );
  }

  /*
   * The start button goes to the decks. Always.
   *
   * It used to drop a first-time player straight into the guided game, which made the
   * lesson the only door into the app — you could leave it, but you could not decline it,
   * and a tutorial you cannot decline is a tutorial you resent. It is offered instead: 教學
   * sits on the deck picker next to 開卡包, in the one place where somebody who wants to be
   * taught would go looking, and it stays there for as long as it is wanted rather than
   * disappearing after a single viewing.
   */
  return <Home onStart={() => setScreen('select')} />;
  }
}

/** Every deck a player may choose. The tutorial's two are registered but never offered. */
function visible() {
  return E.allDecks().filter((d) => !d.id.startsWith('tut_'));
}
