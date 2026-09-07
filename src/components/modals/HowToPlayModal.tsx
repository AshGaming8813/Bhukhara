import React from 'react';
import { X, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>BHUKHARA — Official Game Rules</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body rules-body">
          <section className="rule-section">
            <h3>1. The 104 Card Deck (2 Standard Packs)</h3>
            <p>
              Bhukhara uses exactly <strong>104 cards (2 standard 52-card packs combined)</strong> featuring the 4 standard suits:
              Hearts (♥), Diamonds (♦), Clubs (♣), and Spades (♠). Exactly 2 copies of each card exist in the deck.
            </p>
          </section>

          <section className="rule-section">
            <h3>2. Game Modes & Dealing</h3>
            <ul>
              <li>
                <strong>2-Player Mode:</strong> Each player gets 13 cards. 13 cards placed in Bhukhara pile. 64 cards in Close Deck, 1 Open card.
              </li>
              <li>
                <strong>4-Player Mode:</strong> P1 + P3 (Team A), P2 + P4 (Team B). 13 cards per player, 13 cards in Bhukhara. 38 cards in Close Deck, 1 Open card.
              </li>
            </ul>
          </section>

          <section className="rule-section highlight-section">
            <h3>3. CRITICAL: Opening Rule</h3>
            <p>
              Your initial open combination MUST be a <strong>PURE SAME-COLOUR SERIES</strong> (3 to 7 consecutive cards of the same suit <em>without Jokers</em>, e.g., 5♥ 6♥ 7♥).
            </p>
            <div className="alert-box alert-warning">
              <AlertTriangle size={18} /> You CANNOT open with a Triplicate or Joker combination before opening a Pure Same-Colour Series first!
            </div>
          </section>

          <section className="rule-section">
            <h3>4. Series & Triplicate Combinations</h3>
            <ul>
              <li>
                <strong>Series:</strong> 3–7 consecutive cards of the same suit. Allows maximum 1 Joker.
              </li>
              <li>
                <strong>Triplicate:</strong> 3+ cards of the exact same rank (e.g. 8♥ 8♦ 8♣). Allows maximum 1 Joker.
              </li>
              <li>
                <strong>Jokers (Rank 2):</strong> Number 2 cards act as Jokers. Limit: <strong>Max 1 Joker per combination</strong>.
              </li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>5. Card Points & 7-Card Special Scoring</h3>
            <ul>
              <li>
                <strong>Card Values:</strong> 3–7 (0.5 pt), 8–K (1 pt), Ace (1.5 pts), Joker 2 (1 pt).
              </li>
              <li>
                <strong>Pure 7-Card Series:</strong> Awarded <strong>20 points</strong> flat score.
              </li>
              <li>
                <strong>7-Card Series with Same-Colour Joker:</strong> Awarded <strong>20 points</strong>.
              </li>
              <li>
                <strong>7-Card Series with Different-Colour Joker:</strong> Awarded <strong>10 points</strong>.
              </li>
            </ul>
          </section>

          <section className="rule-section foul-rules-section">
            <h3>6. Moda, Bhukhara & FOUL Rule</h3>
            <p>
              Moda is attempted when all playable cards are in open combinations and <strong>EXACTLY 1 card remains in hand</strong>.
            </p>
            <div className="alert-box alert-danger">
              <ShieldAlert size={18} strokeWidth={2.5} />
              <strong>VERY IMPORTANT FOUL RULE:</strong> The remaining Moda card MUST NOT fit into any existing open Series or Triplicate on the table. If it can fit → <strong>INVALID MODA FOUL!</strong> Opponent immediately wins!
            </div>
            <ul>
              <li>
                <strong>First Moda:</strong> Awards the 13-card <strong>Bhukhara pile</strong>! Play Bhukhara cards during turn, then say <strong>HELLO</strong>. (+5 Moda bonus)
              </li>
              <li>
                <strong>Second Moda:</strong> Completes current Bazzi (+5 additional Moda bonus).
              </li>
            </ul>
          </section>

          <section className="rule-section">
            <h3>7. Hand Penalties & 2-Bazzi Lead System</h3>
            <p>
              Cards remaining in hand when a Bazzi ends are calculated and <strong>ADDED to the OPPOSITE team's score</strong>.
              In 2-Bazzi mode, Bazzi 1 score difference carries forward as the <strong>Lead</strong> into Bazzi 2 to determine the ultimate winner!
            </p>
          </section>

          <section className="rule-section">
            <h3>8. Official Rules & Foul Matrix Table</h3>
            <p>
              Strict tournament gameplay rules, compulsory play conditions, and foul consequences:
            </p>
            <div className="rules-matrix-table-wrapper">
              <table className="rules-matrix-table">
                <thead>
                  <tr>
                    <th>Action / Scenario</th>
                    <th>Compulsory Play Requirement</th>
                    <th>Penalty / Rule Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>1. Claiming Bhukhara</strong></td>
                    <td>Must open a new Series/Triplicate OR add at least 1 card to an existing combination on that turn.</td>
                    <td>
                      <span className="badge-revert">BHUKHARA REVERT</span>
                      <br />
                      13 Bhukhara cards close back to pile. Turn ends; try again on a future turn.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>2. Bhukhara Discard ("Say Hello")</strong></td>
                    <td>Must click <strong>Say Hello</strong> button BEFORE discarding after claiming Bhukhara cards.</td>
                    <td>
                      <span className="badge-foul">INSTANT FOUL</span>
                      <br />
                      Discarding without saying Hello forfeits match instantly! Opponent wins.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>3. Open Deck Pickup</strong></td>
                    <td>Must open a new combination OR add at least 1 card to an existing combination on that turn.</td>
                    <td>
                      <span className="badge-foul">INSTANT FOUL</span>
                      <br />
                      Discarding without melding cards forfeits match instantly! Opponent wins.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>4. Moda Discard Validation</strong></td>
                    <td>The final card in hand being discarded for Moda MUST NOT fit into any table combination.</td>
                    <td>
                      <span className="badge-foul">INSTANT FOUL</span>
                      <br />
                      If the discarded card could fit into a table combination, opponent wins!
                    </td>
                  </tr>
                  <tr>
                    <td><strong>5. Initial Open Meld</strong></td>
                    <td>First combination MUST be a Pure Same-Colour Series (3–7 cards, 0 Jokers).</td>
                    <td>
                      <span className="badge-block">ACTION BLOCKED</span>
                      <br />
                      Cannot open with Triplicates or Jokers until Pure Series is opened first.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <CheckCircle size={18} /> Got It! Let's Play
          </button>
        </div>
      </div>
    </div>
  );
};
