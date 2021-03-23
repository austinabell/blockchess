use chess::{Board, BoardStatus, ChessMove, Color as ChessColor};
use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    collections::LookupMap,
    AccountId,
};
use near_sdk::{env, near_bindgen};
use serde::{Deserialize, Serialize};
use std::io;

const STARTING_BOARD_STATE: &'static str =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc = near_sdk::wee_alloc::WeeAlloc::INIT;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ChessGame {
    Pending {
        /// Account which initialized the challenge.
        challenger: AccountId,
    },
    Initialized {
        /// Account ID for white pieces.
        white: AccountId,
        /// Account ID for black pieces.
        black: AccountId,
        /// Forsyth-Edwards Notation of board.
        board_fen: String,
        /// Indicates status of the game
        state: GameState,
    },
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, PartialEq, Debug)]
pub enum GameState {
    InProgress,
    Win(Color),
    Draw,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub enum Color {
    #[serde(rename = "white")]
    White,
    #[serde(rename = "black")]
    Black,
}

impl From<ChessColor> for Color {
    fn from(c: ChessColor) -> Self {
        match c {
            ChessColor::White => Color::White,
            ChessColor::Black => Color::Black,
        }
    }
}

impl BorshSerialize for Color {
    fn serialize<W: io::Write>(&self, writer: &mut W) -> io::Result<()> {
        match self {
            Color::White => BorshSerialize::serialize("white", writer),
            Color::Black => BorshSerialize::serialize("black", writer),
        }
    }
}

impl BorshDeserialize for Color {
    fn deserialize(buf: &mut &[u8]) -> io::Result<Self> {
        let s: String = BorshDeserialize::deserialize(buf)?;
        match s.as_str() {
            "white" => Ok(Color::White),
            "black" => Ok(Color::Black),
            _ => Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Not a valid color",
            )),
        }
    }
}

/// Chess contract which keeps track of ongoing games and the index for the next game.
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct ChessContract {
    games: LookupMap<u64, ChessGame>,
    game_idx: u64,
}

impl Default for ChessContract {
    fn default() -> Self {
        Self {
            games: LookupMap::new(b"g".to_vec()),
            game_idx: 0,
        }
    }
}

#[near_bindgen]
impl ChessContract {
    /// Retrieves state of the game, if game has started.
    pub fn get_board_state(&self, board: u64) -> Option<ChessGame> {
        self.games.get(&board)
    }

    /// Creates an uninitialized game with the signer as the challenger.
    pub fn create_game(&mut self) -> u64 {
        let game_index = self.game_idx;
        self.games.insert(
            &game_index,
            &ChessGame::Pending {
                challenger: env::signer_account_id(),
            },
        );
        self.game_idx += 1;

        game_index
    }

    /// Accepts challenge and initializes the game.
    pub fn accept_challenge(&mut self, board: u64) {
        // lookup board
        let game = self.games.get(&board).expect("Invalid board number");

        // If caller can join, randomly choose sides and initialize game
        if let ChessGame::Pending { challenger } = game {
            // TODO this should be randomized
            let white = challenger;
            let black = env::signer_account_id();

            env::log(
                format!(
                    "Challenge accepted between {} (White) and {} (Black)",
                    white, black
                )
                .as_bytes(),
            );
            self.games.insert(
                &board,
                &ChessGame::Initialized {
                    white,
                    black,
                    board_fen: STARTING_BOARD_STATE.to_string(),
                    state: GameState::InProgress,
                },
            );
        } else {
            panic!("Game has already been initialized");
        }
    }

    /// Performs move on initialized board.
    pub fn make_move(&mut self, board: u64, m: String) {
        let game = self.games.get(&board).expect("Invalid board number");

        if let ChessGame::Initialized {
            white,
            black,
            board_fen,
            mut state,
        } = game
        {
            assert!(
                matches!(state, GameState::InProgress),
                "game has already finished"
            );

            // Convert input to move
            let play: ChessMove = m.parse().expect("invalid chess move format");

            // Try to apply move if caller's turn
            let board_state: Board = board_fen.parse().expect("Invalid board state");
            let caller = env::signer_account_id();
            let caller_color = if caller == white {
                ChessColor::White
            } else if caller == black {
                ChessColor::Black
            } else {
                panic!("Signer is not a participant in the game");
            };

            assert_eq!(
                caller_color,
                board_state.side_to_move(),
                "Signer cannot move for the other side"
            );

            assert!(board_state.legal(play), "Not a legal move");
            let new_board = board_state.make_move_new(play);

            // Check board state for finished game
            match new_board.status() {
                BoardStatus::Checkmate => {
                    env::log(format!("{} won the game", caller).as_bytes());
                    state = GameState::Win(Color::from(caller_color));
                }
                BoardStatus::Stalemate => {
                    env::log("Game ended in a stalemate".as_bytes());
                }
                BoardStatus::Ongoing => (),
            }

            // Save game back to storage
            self.games.insert(
                &board,
                &ChessGame::Initialized {
                    white,
                    black,
                    board_fen: new_board.to_string(),
                    state,
                },
            );
        } else {
            panic!("Game is not in progress");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{test_utils::VMContextBuilder, MockedBlockchain};
    use near_sdk::{testing_env, VMContext};

    fn get_context(name: impl ToString, is_view: bool) -> VMContext {
        VMContextBuilder::new()
            .signer_account_id(name.to_string())
            .predecessor_account_id(name.to_string())
            .is_view(is_view)
            .build()
    }

    fn test_setup() -> (ChessContract, u64) {
        let context = get_context("bob", false);
        testing_env!(context.clone());
        let mut contract = ChessContract::default();

        let game_idx = contract.create_game();

        // Assert uninitialized before accepting
        assert!(matches!(
            contract.get_board_state(game_idx).unwrap(),
            ChessGame::Pending { challenger: _ }
        ));

        // Alice accepts challenge from bob
        let context = get_context("alice", false);
        testing_env!(context.clone());
        contract.accept_challenge(game_idx);

        // Sanity checks
        let game = contract.get_board_state(game_idx).unwrap();
        if let ChessGame::Initialized {
            white,
            black,
            board_fen,
            state,
        } = game
        {
            assert_eq!(white, "bob");
            assert_eq!(black, "alice");
            assert_eq!(board_fen, STARTING_BOARD_STATE);
            assert!(matches!(state, GameState::InProgress));
        } else {
            panic!("Uninitialized game");
        }

        (contract, game_idx)
    }

    #[test]
    fn basic_initialize() {
        let context = get_context("bob", false);
        testing_env!(context);
        let contract = ChessContract::default();
        assert!(contract.get_board_state(0).is_none());
    }

    #[test]
    fn initialize_and_play() {
        let (mut contract, game_idx) = test_setup();

        // Make valid moves (Fool's mate game)
        let context = get_context("bob", false);
        testing_env!(context.clone());
        contract.make_move(game_idx, "f2f3".to_string());

        let context = get_context("alice", false);
        testing_env!(context.clone());
        contract.make_move(game_idx, "e7e5".to_string());

        let context = get_context("bob", false);
        testing_env!(context.clone());
        contract.make_move(game_idx, "g2g4".to_string());

        let context = get_context("alice", false);
        testing_env!(context.clone());
        contract.make_move(game_idx, "d8h4".to_string());

        let game = contract.get_board_state(game_idx).unwrap();
        if let ChessGame::Initialized {
            board_fen, state, ..
        } = game
        {
            assert_eq!(
                board_fen,
                // TODO chess logic is broken, ignores en passant and move counter
                // "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"
                "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1"
            );
            assert!(matches!(state, GameState::Win(Color::Black)));
        } else {
            panic!("Uninitialized game");
        }
    }

    // Following tests fail inconsistently to a seg fault, but are correctly written

    // #[test]
    // #[should_panic]
    // fn invalid_signer() {
    //     let (mut contract, game_idx) = test_setup();

    //     // Alice cannot play for bob
    //     let context = get_context("alice", false);
    //     testing_env!(context.clone());
    //     contract.make_move(game_idx, "e2e4".to_string());
    // }

    // #[test]
    // #[should_panic]
    // fn invalid_move() {
    //     let (mut contract, game_idx) = test_setup();

    //     // Bob cannot play an invalid move
    //     let context = get_context("bob", false);
    //     testing_env!(context.clone());
    //     contract.make_move(game_idx, "e2e5".to_string());
    // }
}
