import "regenerator-runtime/runtime";
import React, {useState, useEffect, Fragment} from "react";
import PropTypes from "prop-types";
import Chess from "chess.js";
import {Button, Typography, Modal} from "@material-ui/core";
import SignIn from "./components/SignIn";
import {makeStyles} from "@material-ui/core/styles";
import Chessground from "react-chessground";
import queen from "./images/wQ.svg";
import rook from "./images/wR.svg";
import bishop from "./images/wB.svg";
import knight from "./images/wN.svg";

// const SUGGESTED_DONATION = '0';
// const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

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
    border: "2px solid #000",
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
  },
}));

const App = ({contract, currentUser, nearConfig, wallet}) => {
  const [chess] = useState(new Chess());
  const [pendingMove, setPendingMove] = useState();
  const [modalOpen, setModalOpen] = useState(false);
  const [fen, setFen] = useState("");
  const [lastMove, setLastMove] = useState();

  const classes = useStyles();

  useEffect(() => {
    // // TODO: don't just fetch once; subscribe!
    // contract.getMessages().then(setMessages);
  }, [contract]);

  // const onSubmit = (e) => {
  //   e.preventDefault();

  //   const { fieldset, message, donation } = e.target.elements;

  //   fieldset.disabled = true;

  //   // TODO: optimistically update page with new message,
  //   // update blockchain data in background
  //   // add uuid to each message, so we know which one is already known
  //   contract.addMessage(
  //     { text: message.value },
  //     BOATLOAD_OF_GAS,
  //     Big(donation.value || '0').times(10 ** 24).toFixed()
  //   ).then(() => {
  //     contract.getMessages().then(messages => {
  //       setMessages(messages);
  //       message.value = '';
  //       donation.value = SUGGESTED_DONATION;
  //       fieldset.disabled = false;
  //       message.focus();
  //     });
  //   });
  // };

  const signIn = () => {
    wallet.requestSignIn(nearConfig.contractName, "NEAR Guest Book");
  };

  const signOut = () => {
    wallet.signOut();
    window.location.replace(window.location.origin + window.location.pathname);
  };

  const onMove = (from, to) => {
    const moves = chess.moves({verbose: true});
    for (let i = 0, len = moves.length; i < len; i++) { /* eslint-disable-line */
      if (moves[i].flags.indexOf("p") !== -1 && moves[i].from === from) {
        setPendingMove([from, to]);
        setModalOpen(true);
        return;
      }
    }
    if (chess.move({from, to, promotion: "x"})) {
      setFen(chess.fen());
      setLastMove([from, to]);
      setTimeout(randomMove, 500);
    }
  };

  const randomMove = () => {
    const moves = chess.moves({verbose: true});
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
    chess.move({from, to, promotion: e});
    setFen(chess.fen());
    setLastMove([from, to]);
    setModalOpen(false);
    setTimeout(randomMove, 500);
  };

  const turnColor = () => {
    return chess.turn() === "w" ? "white" : "black";
  };

  return (
    <Fragment>
      <Typography variant="h2" component="h2" gutterBottom>
        BlockChess
      </Typography>
      {currentUser ? (
        <Button variant="contained" color="secondary" onClick={signOut}>
          Log out
        </Button>
      ) : (
        <Button variant="contained" color="secondary" onClick={signIn}>
          Log in
        </Button>
      )}
      {currentUser ? (
        <Fragment>
          <Chessground
            turnColor={turnColor()}
            lastMove={lastMove}
            fen={fen}
            onMove={onMove}
            style={{margin: "auto"}}
          />
          <Modal
            open={modalOpen}
            className={classes.modal}
            aria-labelledby="simple-modal-title"
            aria-describedby="simple-modal-description"
          >
            <div className={classes.paper}>
              <span role="presentation" onClick={() => promotion("q")}>
                <img src={queen} alt="" style={{width: 50}} />
              </span>
              <span role="presentation" onClick={() => promotion("r")}>
                <img src={rook} alt="" style={{width: 50}} />
              </span>
              <span role="presentation" onClick={() => promotion("b")}>
                <img src={bishop} alt="" style={{width: 50}} />
              </span>
              <span role="presentation" onClick={() => promotion("n")}>
                <img src={knight} alt="" style={{width: 50}} />
              </span>
            </div>
          </Modal>
        </Fragment>
      ) : (
        <SignIn />
      )}
      {/* {!!currentUser && !!messages.length && <Messages messages={messages} />} */}
    </Fragment>
  );
};

App.propTypes = {
  contract: PropTypes.shape({
    addMessage: PropTypes.func.isRequired,
    getMessages: PropTypes.func.isRequired,
  }).isRequired,
  currentUser: PropTypes.shape({
    accountId: PropTypes.string.isRequired,
    balance: PropTypes.string.isRequired,
  }),
  nearConfig: PropTypes.shape({
    contractName: PropTypes.string.isRequired,
  }).isRequired,
  wallet: PropTypes.shape({
    requestSignIn: PropTypes.func.isRequired,
    signOut: PropTypes.func.isRequired,
  }).isRequired,
};

export default App;
