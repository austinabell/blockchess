import "regenerator-runtime/runtime";
import PropTypes from "prop-types";
import React from "react";
import { login, logout } from "./utils";
import { Button, Typography, Modal } from "@material-ui/core";
import { Chess } from "chess.js";
import getConfig from "./config";
import { Switch, Route, useHistory, useParams } from "react-router-dom";
import { useInterval } from "./interval";
import Chessground from "react-chessground";
import { makeStyles } from "@material-ui/core/styles";
import queen from "./assets/wQ.svg";
import rook from "./assets/wR.svg";
import bishop from "./assets/wB.svg";
import knight from "./assets/wN.svg";
import "./global.css";
import "react-chessground/dist/styles/chessground.css";

const { networkId } = getConfig(process.env.NODE_ENV || "development");

const useStyles = makeStyles((theme) => ({
  modal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    textAlign: "center",
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
}));

export default function App() {
  const [pendingReq, setPendingReq] = React.useState(false);

  // after submitting the form, we want to show Notification
  // eslint-disable-next-line no-unused-vars
  const [notificationMsg, setNotificationMsg] = React.useState("");

  const history = useHistory();

  const showNotification = (message) => {
    // show Notification
    setNotificationMsg(message);

    // remove Notification again after css animation completes
    // this allows it to be shown again next time the form is submitted
    setTimeout(() => {
      setNotificationMsg("");
    }, 11000);
  };

  // Calls contract to create game, then routes to the game in the frontend
  function createGame() {
    setPendingReq(true);
    window.contract
      .create_game()
      .then((gameIndex) => {
        console.log("created game: ", gameIndex);

        // Switch route to the game index after creating
        history.push("/" + gameIndex);
        setPendingReq(false);
      })
      .catch((e) => {
        showNotification("Failed to create new game: ", e);
      });
  }

  // if not signed in, return early with sign-in prompt
  if (!window.walletConnection.isSignedIn()) {
    /* eslint-disable */
    return (
      <main>
        <Typography variant="h2" component="h2" gutterBottom>
          BlockChess
        </Typography>
        <p>
          To play a game of blockchess, you need to be signed in with the NEAR hosted wallet.
        </p>
        <p>Go ahead and click the button below to try it out:</p>
        <p style={{ textAlign: "center", marginTop: "2.5em" }}>
          <Button
            variant="contained"
            color="secondary" onClick={login}>Sign in</Button>
        </p>
      </main>
    );
    /* eslint-enable */
  }

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        style={{ float: "right" }}
        onClick={logout}
      >
        Log out
      </Button>
      <main>
        <Switch>
          <Route exact path="/">
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={createGame}
                disabled={pendingReq}
              >
                Create New Game
              </Button>
              {/* TODO: should include ability to lookup games, either by index or referencing logged in user */}
            </div>
          </Route>
          <Route path="/:id">
            <ChessGame />
          </Route>
        </Switch>
      </main>
      {notificationMsg && <Notification message={notificationMsg} />}
    </>
  );
}

// this component gets rendered by App after the form is submitted
function Notification({ message }) {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`;
  return (
    <aside>
      <a
        target="_blank"
        rel="noreferrer"
        href={`${urlPrefix}/${window.accountId}`}
      >
        {window.accountId}
      </a>{" "}
      sent transaction to contract:{" "}
      <a
        target="_blank"
        rel="noreferrer"
        href={`${urlPrefix}/${window.contract.contractId}`}
      >
        {window.contract.contractId}
      </a>
      <footer>
        <div>{message}</div>
      </footer>
    </aside>
  );
}

Notification.propTypes = {
  message: PropTypes.string.isRequired,
};

// this component gets rendered by App after the form is submitted
function ChessGame() {
  const [promoteMove, setPromoteMove] = React.useState();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [fen, setFen] = React.useState("");
  // const [lastMove, setLastMove] = React.useState();

  // Just used to trigger board reload on invalid move
  const [reload, setReload] = React.useState();

  // Default to white for spectators, overrides if signed in account is in game
  const [userColor, setUserColor] = React.useState("");

  const classes = useStyles();

  // react-router-dom parameters from route
  const { id } = useParams();
  const board = parseInt(id);

  const account = window.accountId;

  // * Polls for new data. This would be much better to be subscription based, but this does
  // * not exist yet.
  useInterval(() => {
    window.contract
      .get_board_state({ board })
      .then((boardState) => {
        if (boardState.challenger) {
          // Game has not started
          if (account != boardState.challenger) {
            window.contract.accept_challenge({ board }).catch(console.error);
          } else {
            // Challenger is the currently signed in user
            return;
          }
        }

        // Game has been initialized
        if (boardState.board_fen !== fen) {
          setFen(boardState.board_fen);
        }

        if (boardState.white === account) {
          setUserColor("white");
        } else if (boardState.black === account) {
          setUserColor("black");
        }
        console.debug(boardState);
      })
      .catch(console.error);
  }, 1000);

  const onMove = (from, to) => {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    for (let i = 0, len = moves.length; i < len; i++) {
      if (moves[i].flags.indexOf("p") !== -1 && moves[i].from === from) {
        setPromoteMove([from, to]);
        setModalOpen(true);
        return;
      }
    }

    if (chess.move({ from, to, promotion: "x" })) {
      // Move is valid, send transaction to update state.
      window.contract
        .make_move({ board, m: `${from}${to}` })
        .catch(console.error);
    } else {
      //* Manually triggering board reload on invalid move.
      //* This should probably be handled diff, this is janky lol
      setReload(!reload);
    }
  };

  const promotion = (e) => {
    const chess = new Chess(fen);
    const from = promoteMove[0];
    const to = promoteMove[1];
    chess.move({ from, to, promotion: e });

    window.contract
      .make_move({ board, m: `${from}${to}${e}` })
      .catch(console.error);
    setModalOpen(false);
  };

  const turnColor = () => {
    const chess = new Chess(fen);
    return chess.turn() === "w" ? "white" : "black";
  };

  return (
    <>
      <Chessground
        orientation={userColor || "white"}
        turnColor={turnColor()}
        // TODO have a way to show last move
        lastMove={null}
        fen={fen}
        onMove={onMove}
        style={{ margin: "auto" }}
      />
      <Modal
        open={modalOpen}
        className={classes.modal}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        <div className={classes.paper}>
          <span role="presentation" onClick={() => promotion("q")}>
            <img src={queen} alt="" style={{ width: 50 }} />
          </span>
          <span role="presentation" onClick={() => promotion("r")}>
            <img src={rook} alt="" style={{ width: 50 }} />
          </span>
          <span role="presentation" onClick={() => promotion("b")}>
            <img src={bishop} alt="" style={{ width: 50 }} />
          </span>
          <span role="presentation" onClick={() => promotion("n")}>
            <img src={knight} alt="" style={{ width: 50 }} />
          </span>
        </div>
      </Modal>
    </>
  );
}
