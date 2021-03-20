import 'regenerator-runtime/runtime';
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
// import Big from 'big.js';
import { Button, Typography } from '@material-ui/core';
import SignIn from './components/SignIn';

// const SUGGESTED_DONATION = '0';
// const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

const App = ({ contract, currentUser, nearConfig, wallet }) => {
  // const [messages, setMessages] = useState([]);

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
    wallet.requestSignIn(
      nearConfig.contractName,
      'NEAR Guest Book'
    );
  };

  const signOut = () => {
    wallet.signOut();
    window.location.replace(window.location.origin + window.location.pathname);
  };

  return (
    <main>
      <header>
        <Typography variant="h2" component="h2" gutterBottom>BlockChess</Typography>
        {currentUser
          ? <Button variant="contained" color="secondary" onClick={signOut}>Log out</Button>
          : <Button variant="contained" color="secondary" onClick={signIn}>Log in</Button>
        }
      </header>
      {currentUser
        ? <Typography gutterBottom>TODO: User is signed in content</Typography>
        : <SignIn />
      }
      {/* {!!currentUser && !!messages.length && <Messages messages={messages} />} */}
    </main>
  );
};

App.propTypes = {
  contract: PropTypes.shape({
    addMessage: PropTypes.func.isRequired,
    getMessages: PropTypes.func.isRequired
  }).isRequired,
  currentUser: PropTypes.shape({
    accountId: PropTypes.string.isRequired,
    balance: PropTypes.string.isRequired
  }),
  nearConfig: PropTypes.shape({
    contractName: PropTypes.string.isRequired
  }).isRequired,
  wallet: PropTypes.shape({
    requestSignIn: PropTypes.func.isRequired,
    signOut: PropTypes.func.isRequired
  }).isRequired
};

export default App;
