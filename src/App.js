import "regenerator-runtime/runtime";
import React from "react";
import { login, logout } from "./utils";
import { Button, Typography, Modal } from "@material-ui/core";
import { Chess } from "chess.js";
import getConfig from "./config";
import { Switch, Route } from "react-router-dom";
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
  const [chess] = React.useState(new Chess());
  const [pendingMove, setPendingMove] = React.useState();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [fen, setFen] = React.useState("");
  const [lastMove, setLastMove] = React.useState();

  // after submitting the form, we want to show Notification
  // eslint-disable-next-line no-unused-vars
  const [showNotification, setShowNotification] = React.useState(false);

  const classes = useStyles();

  // The useEffect hook can be used to fire side-effects during render
  // Learn more: https://reactjs.org/docs/hooks-intro.html
  React.useEffect(
    () => {
      if (window.walletConnection.isSignedIn()) {
        // window.contract
        //   .getBoardState({ account_id: window.accountId })
        //   .then((greetingFromContract) => {
        //     set_greeting(greetingFromContract);
        //   });
      }
    },

    // The second argument to useEffect tells React when to re-run the effect
    // Use an empty array to specify "only run on first render"
    // This works because signing into NEAR Wallet reloads the page
    []
  );

  const onMove = (from, to) => {
    const moves = chess.moves({ verbose: true });
    for (let i = 0, len = moves.length; i < len; i++) { /* eslint-disable-line */
      if (moves[i].flags.indexOf("p") !== -1 && moves[i].from === from) {
        setPendingMove([from, to]);
        setModalOpen(true);
        return;
      }
    }
    if (chess.move({ from, to, promotion: "x" })) {
      setFen(chess.fen());
      setLastMove([from, to]);
      setTimeout(randomMove, 500);
    }
  };

  const randomMove = () => {
    const moves = chess.moves({ verbose: true });
    const move = moves[Math.floor(Math.random() * moves.length)];
    if (moves.length > 0) {
      chess.move(move.san);
      setFen(chess.fen());
      setLastMove([move.from, move.to]);
    }
  };

  const promotion = (e) => {
    const from = pendingMove[0];
    const to = pendingMove[1];
    chess.move({ from, to, promotion: e });
    setFen(chess.fen());
    setLastMove([from, to]);
    setModalOpen(false);
    setTimeout(randomMove, 500);
  };

  const turnColor = () => {
    return chess.turn() === "w" ? "white" : "black";
  };

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

  const account = window.accountId;
  console.log(account);

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
            TODO: create game homepage
          </Route>
          <Route path="/:id">
            <>
              <Chessground
                turnColor={turnColor()}
                lastMove={lastMove}
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
          </Route>
        </Switch>
      </main>
      {showNotification && <Notification />}
    </>
  );
}

// this component gets rendered by App after the form is submitted
function Notification() {
  const urlPrefix = `https://explorer.${networkId}.near.org/accounts`;
  return (
    <aside>
      <a
        target="_blank"
        rel="noreferrer"
        href={`${urlPrefix}/${window.accountId}`}
      >
        {window.accountId}
      </a>
      {
        " " /* React trims whitespace around tags; insert literal space character when needed */
      }
      called method: &apos;set_greeting&apos; in contract:{" "}
      <a
        target="_blank"
        rel="noreferrer"
        href={`${urlPrefix}/${window.contract.contractId}`}
      >
        {window.contract.contractId}
      </a>
      <footer>
        <div>✔ Succeeded</div>
        <div>Just now</div>
      </footer>
    </aside>
  );
}
