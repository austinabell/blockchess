import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { initContract } from "./utils";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";
import theme from "./theme";
import { HashRouter } from "react-router-dom";

window.nearInitPromise = initContract()
  .then(() => {
    ReactDOM.render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <HashRouter>
          <App />
        </HashRouter>
      </ThemeProvider>,
      document.querySelector("#root")
    );
  })
  .catch(console.error);
