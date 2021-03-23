use near_sdk::{
    borsh::{self, BorshDeserialize, BorshSerialize},
    collections::LookupMap,
    AccountId,
};
use near_sdk::{env, near_bindgen};
use std::io;

#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc = near_sdk::wee_alloc::WeeAlloc::INIT;

#[derive(BorshDeserialize, BorshSerialize)]
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
        /// Indicates winner for the game.
        winner: Option<Color>,
    },
}

pub enum Color {
    White,
    Black,
}

impl BorshSerialize for Color {
    fn serialize<W: io::Write>(&self, writer: &mut W) -> io::Result<()> {
        match self {
            Color::White => "white".serialize(writer),
            Color::Black => "black".serialize(writer),
        }
    }
}

impl BorshDeserialize for Color {
    fn deserialize(buf: &mut &[u8]) -> io::Result<Self> {
        let s = String::deserialize(buf)?;
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

// add the following attributes to prepare your code for serialization and invocation on the blockchain
// More built-in Rust attributes here: https://doc.rust-lang.org/reference/attributes.html#built-in-attributes-index
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
    pub fn get_board_state(&self, board: u64) -> Option<(Color, String)> {
        let caller = env::signer_account_id();
        let state = self.games.get(&board)?;
        if let ChessGame::Initialized {
            board_fen,
            white,
            black,
            ..
        } = state
        {
            if caller == white {
                return Some((Color::White, board_fen));
            } else if caller == black {
                return Some((Color::Black, board_fen));
            }
        }

        // The game does not exist, or the caller is not a participant
        None
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
            self.games.insert(
                &board,
                &ChessGame::Initialized {
                    white: challenger,
                    black: env::signer_account_id(),
                    board_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        .to_string(),
                    winner: None,
                },
            );
        } else {
            panic!("Game has already been initialized");
        }
    }

    /// Performs move on initialized board.
    pub fn make_move(&mut self, _board: u64, _m: String) {
        // Convert input to move

        // Try to apply move if caller's turn

        // Check board state for finished game
    }
}

// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{test_utils::VMContextBuilder, MockedBlockchain};
    use near_sdk::{testing_env, VMContext};

    fn get_context(name: impl ToString, is_view: bool) -> VMContext {
        VMContextBuilder::new()
            .predecessor_account_id(name.to_string())
            .is_view(is_view)
            .build()
    }

    #[test]
    fn basic_initialize() {
        let context = get_context("bob", false);
        testing_env!(context);
        let contract = ChessContract::default();
        assert!(contract.get_board_state(0).is_none());
    }
}
