import {deepOrange} from "@material-ui/core/colors";
import {createMuiTheme} from "@material-ui/core/styles";

const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#202020",
    },
    secondary: {
      main: "#1de9b6",
    },
    error: {
      main: deepOrange.A400,
    },
  },
});

export default theme;
