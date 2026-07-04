# Goal
Implement the "Check Off" feature for the Slip It In game, incorporating a 30-second window for accusations and a voting mechanism to validate them.

## Open Questions

> [!IMPORTANT]
> **Please clarify the exact gameplay loop you want.** Which of these two scenarios correctly describes the rules you are imagining?
> 
> **Scenario A (Accusing means guessing the phrase):**
> 1. Player A clicks their phrase to check it off.
> 2. A 30-second timer starts on everyone's screen. 
> 3. During this 30s, someone can press "ACCUSE" against Player A.
> 4. The 30s timer pauses. The accuser must type what they think Player A's phrase was.
> 5. Everyone votes if the accuser is correct. If the accuser is right, Player A is caught (check-off fails). If the accuser is wrong, the 30s timer resumes.
> 6. If the 30s timer expires with no successful accusations, the phrase is officially checked off.
> 
> **Scenario B (Voting directly on the check-off):**
> 1. Player A clicks their phrase to check it off. The phrase itself is REVEALED to everyone.
> 2. A 30-second timer starts.
> 3. Everyone votes "Yes, they said it naturally" or "No, they didn't / it was too obvious".
> 4. If the majority votes YES before the 30s timer ends, it gets checked off. (Where does "pressing accuse" fit in this scenario?)
> 
> **Scenario C (Something else?):**
> Please explain exactly what happens step-by-step when Player A clicks their phrase, what the Accuser sees and does, and what everyone else votes on.

## Proposed Changes

We will restructure `SlipItInGameState` and the Engine to support:
- `CLAIM_PHRASE` action: Triggers the 30-second window.
- `ACCUSE_CLAIM` action: Pauses the timer and starts the voting process.
- `VOTE` action: Collects votes to validate the accusation.
- Timer resumption and automatic completion logic.

### `shared/src/index.ts`
- Update `SlipItInGameState` to include `activeClaims` (tracking 30s timers, paused state, and active accusations).

### `client/src/engine/games/SlipItIn/index.ts`
- Implement robust state machine for the 30-second window.
- Calculate time remaining accurately when pausing/resuming the timer.
- Tally votes and resolve the accusation (either burning the phrase or allowing the check-off to proceed/resume).

### `client/src/games/SlipItIn/index.tsx`
- Add clickable functionality to the "YOUR SECRET PHRASES" list.
- Build a new UI section that displays active claims and their 30-second countdowns.
- Build the Voting UI for resolving paused claims.

## Verification Plan
1. Test claiming a phrase and watching the 30-second timer expire naturally.
2. Test claiming a phrase, having another player accuse, voting YES, and verifying the claim fails.
3. Test claiming a phrase, having another player accuse, voting NO, and verifying the timer resumes correctly.
