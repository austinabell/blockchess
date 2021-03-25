import "regenerator-runtime/runtime";
import React from "react";
import App from "../../App";
import { render, screen } from "@testing-library/react";

// Declare stubs for contract, walletConnection, and nearConfig
const contract = {
  account: {
    connection: {},
    accountId: "test.near",
  },
  contractId: "test.near",
  getBoardState: () => new Promise(() => {}),
  createGame: () => "",
  acceptChallenge: () => "",
  makeMove: () => "",
};
const walletConnection = {
  account: () => ({ _state: { amount: "1" + "0".repeat(25) } }),
  requestSignIn: () => null,
  signOut: () => null,
  isSignedIn: () => false,
  getAccountId: () => "test.near",
};
const nearConfig = {
  networkId: "default",
  nodeUrl: "https://rpc.nearprotocol.com",
  contractName: "test.near",
  walletUrl: "https://wallet.nearprotocol.com",
  helperUrl: "https://near-contract-helper.onrender.com",
};

// For UI tests, use pattern from: https://reactjs.org/docs/test-renderer.html
let container;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

it("renders with proper title", () => {
  render(
    <App
      contract={contract}
      wallet={walletConnection}
      nearConfig={nearConfig}
    />
  );

  const linkElement = screen.getByText(/BlockChess/i);
  expect(linkElement).toBeInTheDocument();
});
