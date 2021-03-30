import { deepOrange } from "@material-ui/core/colors";
import { createMuiTheme } from "@material-ui/core/styles";

const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#E8A0BA",
    },
    secondary: {
      main: "#A0E8B8",
    },
    error: {
      main: deepOrange.A400,
    },
  },
});

export default theme;
