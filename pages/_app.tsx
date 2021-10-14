import type { AppProps } from 'next/app'
import { createGlobalStyle, ThemeProvider } from "styled-components";

function MyApp({ Component, pageProps }: AppProps) {
  return <>
    <GlobalTheme />
    <Component {...pageProps} />
  </>
}

const GlobalTheme = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
    font-size: 1.15em;
  }
  html, body, #__next {
  }
`

export default MyApp
